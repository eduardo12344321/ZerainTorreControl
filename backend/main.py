import os
import json
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Request, BackgroundTasks
# import sqlite3 # Removed
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256
from datetime import datetime, timedelta
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from services.vision_service import vision_service
except Exception as e:
    print(f"⚠️ Warning: Vision Service unavailable: {e}")
    class DummyVisionService:
        def process_receipt(self, *args, **kwargs): return {"error": "Service Unavailable"}
    vision_service = DummyVisionService()

try:
    from services.maps_service import maps_service
except Exception as e:
    print(f"⚠️ Warning: Maps Service unavailable: {e}")
    class DummyMapsService:
        def get_distance_and_time(self, *args, **kwargs): return {}
    maps_service = DummyMapsService()

try:
    from services.excel_service import excel_service
except Exception as e:
    print(f"⚠️ Warning: Excel Service unavailable: {e}")
    excel_service = None
from config import DB_PATH, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, ADMIN_PASSWORD
from services.odoo_service import odoo_client
from routers import ai_router
from import_service import parse_customers_excel, parse_vehicles_excel
from database import db
from utils.google_auth import verify_google_token
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False

app = FastAPI(title="Zerain Tower Control API")

# Configure Rate Limiting
if SLOWAPI_AVAILABLE:
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
else:
    # Dummy limiter for local dev without library
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            return lambda x: x
    limiter = DummyLimiter()

from utils.logging import log_audit

# Configure CORS
origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:7500,http://127.0.0.1:7500")
origins = [o.strip() for o in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_privacy_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    return response

app.include_router(ai_router.router, prefix="/api/v1")
from routers import odoo_router
app.include_router(odoo_router.router)

from routers import strada
from services.strada_miner import strada_miner
app.include_router(strada.router)

from routers import maps, audit, attendance, resources, ai, drivers
app.include_router(maps.router)
app.include_router(audit.router)
app.include_router(attendance.router)
app.include_router(resources.router)
app.include_router(ai.router)
app.include_router(drivers.router)
from routers import orders
app.include_router(orders.router)


@app.on_event("startup")
async def startup_event():
    # Initialize Strada DB first
    from database_strada import init_db as init_strada_db
    try:
        init_strada_db()
        print("Strada DB initialized successfully on startup.")
    except Exception as e:
        print(f"Failed to initialize Strada DB: {e}")

    # Start Strada Miner in background
    strada_miner.start()



# SERVE UPLOADS (For seeing receipts in chat)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/health")
def health_check():
    return {"status": "ok", "system": "Zerain Tower Control"}


# --- AUTH SYSTEM ---
# Config loaded from config.py

# --- AUTH SYSTEM ---
# Config loaded from config.py
from dependencies import (
    Token, DriverLogin, AdminLogin, GoogleLogin, DoubleLogin, 
    AttendanceOverride, ExpenseSubmission, DriverLeave,
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_admin, oauth2_scheme
)





@app.get("/api/v1/admin/gcp-usage")
async def get_gcp_usage(current_admin: dict = Depends(get_current_admin)):
    """ Returns summarized stats of GCP usage """
    try:
        with db.get_cursor() as c:
            c.execute("""
                SELECT service, COUNT(*) as count, SUM(cost_est) as total_cost
                FROM gcp_usage 
                GROUP BY service
            """)
            summary = [dict(row) for row in c.fetchall()]
            
            c.execute("SELECT * FROM gcp_usage ORDER BY timestamp DESC LIMIT 50")
            history = [dict(row) for row in c.fetchall()]
            
            return {"summary": summary, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/admin/route-cache")
async def get_route_cache(current_admin: dict = Depends(get_current_admin)):
    """ Returns all cached routes """
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM route_cache ORDER BY last_updated DESC")
            routes = [dict(row) for row in c.fetchall()]
            return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/driver/login", response_model=Token)
@limiter.limit("5/minute")
async def login_driver(request: Request, data: DriverLogin):
    try:
        user = None
        # Authenticating against Odoo employees for base data, but using local passwords
        if not odoo_client.uid: odoo_client.connect()
        
        odoo_emps = odoo_client.execute('hr.employee', 'search_read', 
                                      [['identification_id', '=', data.dni.upper()]], 
                                      ['id', 'name', 'mobile_phone', 'work_phone', 'work_email'])
        
        if not odoo_emps:
             raise HTTPException(status_code=404, detail="Empleado no encontrado en Odoo")

        emp = odoo_emps[0]
        phone = emp.get('mobile_phone') or emp.get('work_phone') or ""
        
        # Check local credentials
        stored_hash = None
        with db.get_cursor() as c:
            c.execute("SELECT password_hash FROM driver_credentials WHERE dni = ?", (data.dni.upper(),))
            row = c.fetchone()
            if row:
                stored_hash = row['password_hash']
            else:
                # Fallback to default if not yet set (requested for migration/ease of use initially)
                stored_hash = get_password_hash("1234") 
        
        user = {
            "id": str(emp['id']),
            "name": emp['name'],
            "dni": data.dni.upper(),
            "phone": phone,
            "email": emp.get('work_email'),
            "is_active": 1
        }

        if not verify_password(data.password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="DNI o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        log_audit(user['dni'], 'DRIVER_LOGIN', 'drivers', str(user['id']), "Driver logged in (Sync from Odoo)", request.client.host)
        
        # Long-lived token for drivers (30 days) to handle offline periods without logout
        access_token = create_access_token(
            data={"sub": user['dni'], "role": "driver", "id": user['id']},
            expires_delta=timedelta(days=30) 
        )
        return {"access_token": access_token, "token_type": "bearer", "user_data": user}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"DRIVER LOGIN ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/auth/drivers-list")
async def get_drivers_list_public():
    """
    Public endpoint for login screen to show driver grid.
    Returns minimal info: name, id, dni.
    """
    try:
        if not odoo_client.uid: odoo_client.connect()
        # Fetch minimal fields
        emps = odoo_client.execute('hr.employee', 'search_read', 
                                  [['identification_id', '!=', False]], 
                                  ['id', 'name', 'identification_id'])
        
        drivers_simple = []
        for e in emps:
            drivers_simple.append({
                "id": str(e['id']),
                "name": e['name'],
                "dni": str(e['identification_id']).upper().strip() if e['identification_id'] else ""
            })
        
        # Sort alphabetically
        drivers_simple.sort(key=lambda x: x['name'])
        return drivers_simple
    except Exception as e:
        print(f"Error fetching public drivers list: {e}")
        return []

@app.get("/api/v1/driver/profile")
async def get_driver_profile(current_user: dict = Depends(get_current_user)):
    """ Returns the profile of the currently logged-in driver """
    return current_user

@app.post("/api/v1/auth/admin/login", response_model=Token)
@limiter.limit("5/minute")
async def login_admin(request: Request, data: AdminLogin):
    print(f"DEBUG: Login attempt for user: {data.username}")
    try:
        user = None
        with db.get_cursor() as c:
            # Try finding exact match
            query = "SELECT * FROM admins WHERE LOWER(username) = LOWER(%s)" if db.is_postgres else "SELECT * FROM admins WHERE LOWER(username) = LOWER(?)"
            c.execute(query, (data.username,))
            row = c.fetchone()
            if row:
                user = dict(row)

        if not user or not verify_password(data.password, user['password_hash']):
            print(f"DEBUG: Failed login for {data.username} - Invalid Credentials")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"DEBUG: Successful login for {data.username}")
        log_audit(user['username'], 'ADMIN_LOGIN', 'admins', str(user['id']), "Administrator logged in", request.client.host if request.client else "Unknown")
        access_token = create_access_token(
            data={"sub": user['username'], "role": user['role'], "id": user['id']},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer", "user_data": user}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ADMIN LOGIN ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/google", response_model=Token)
async def login_google(request: Request, data: GoogleLogin):
    try:
        # 1. Verify Google Token
        try:
            from config import GOOGLE_CLIENT_ID
            print(f"DEBUG: Verifying Google Token for client: {GOOGLE_CLIENT_ID}")
            google_user = verify_google_token(data.token, client_id=GOOGLE_CLIENT_ID)
        except ValueError as e:
            print(f"DEBUG: Google Token Verification Failed: {e}")
            raise HTTPException(status_code=401, detail=f"Token de Google inválido: {str(e)}")
            
        email = google_user.get('email')
        print(f"DEBUG: Google Login Attempt - Email: {email}")
        if not email:
             raise HTTPException(status_code=400, detail="El token no contiene email")
             
        # 2. Check if email exists in ADMINS table
        # The user asked to enforce specific account login.
        # We check if this email is registered as an admin.
        user = None
        with db.get_cursor() as c:
            # Assuming 'username' for admins might be email or just name. 
            # We should probably check if we have an 'email' column in admins or match username?
            # Existing schema: admins(username, password_hash, role, id).
            # If username IS the email, we are good.
            # If not, we might need to add email column or fallback to username match.
            # Let's check if username matches email.
            # Check if user exists as admin
            query = "SELECT * FROM admins WHERE LOWER(username) = LOWER(%s)" if db.is_postgres else "SELECT * FROM admins WHERE LOWER(username) = LOWER(?)"
            c.execute(query, (email,))
            row = c.fetchone()
            if row:
                 user = dict(row)
        
        if not user:
             # AUTO-REGISTRATION GUARD:
             # Unless we want to auto-register, we reject.
             # "se can añadir que tengas que estar logeado con una cuenta de google concreta?"
             # This implies whitelist.
             # Ideally we check against a whitelist or just fail.
             raise HTTPException(status_code=401, detail=f"El email {email} no tiene acceso autorizado. Contacta con soporte.")

        # 3. Generate JWT
        access_token = create_access_token(
            data={"sub": user['username'], "role": user['role'], "id": user['id']},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer", "user_data": user}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"GOOGLE LOGIN ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/admin/drivers/set-password")
async def set_driver_password(data: dict, current_admin: dict = Depends(get_current_admin)):
    """Set a driver's password manually (Admin only). Input: {dni, password}"""
    dni = data.get('dni')
    new_password = data.get('password')
    if not dni or not new_password:
        raise HTTPException(status_code=400, detail="Faltan datos (dni, password)")
    
    pwd_hash = get_password_hash(new_password)
    try:
        with db.get_cursor() as c:
            c.execute("""
                INSERT INTO driver_credentials (dni, password_hash) VALUES (?, ?)
                ON CONFLICT(dni) DO UPDATE SET password_hash = excluded.password_hash, updated_at = CURRENT_TIMESTAMP
            """, (dni.upper(), pwd_hash))
        
        log_audit(current_admin['username'], 'SET_DRIVER_PWD', 'driver_credentials', dni, "Updated driver password", "Local")
        return {"status": "success", "message": f"Contraseña actualizada para {dni}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/admin/double-login", response_model=Token)
async def login_admin_double(request: Request, data: DoubleLogin):
    """
    Step 1: Verify Google Token -> Get Email
    Step 2: Check if Email is in Admins
    Step 3: Verify Password
    """
    try:
        # 1. Verify Google
        from config import GOOGLE_CLIENT_ID
        google_user = verify_google_token(data.google_token, client_id=GOOGLE_CLIENT_ID)
        email = google_user.get('email')
        
        if not email:
            raise HTTPException(status_code=401, detail="Token de Google inválido")

        # 2. Find User
        user = None
        with db.get_cursor() as c:
            query = "SELECT * FROM admins WHERE LOWER(username) = LOWER(%s)" if db.is_postgres else "SELECT * FROM admins WHERE LOWER(username) = LOWER(?)"
            c.execute(query, (email,))
            row = c.fetchone()
            if row:
                user = dict(row)
        
        if not user:
            raise HTTPException(status_code=401, detail=f"El email {email} no está autorizado.")

        # 3. Verify Password
        if not verify_password(data.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Contraseña de administrador incorrecta")

        # 4. Success
        log_audit(user['username'], 'DOUBLE_AUTH_LOGIN', 'admins', str(user['id']), "Double authentication successful", request.client.host)
        access_token = create_access_token(
            data={"sub": user['username'], "role": user['role'], "id": user['id']},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer", "user_data": user}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"DOUBLE LOGIN ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
def calculate_zerain_stats(day_records):
    """
    Apply Zerain specific business rules to calculate hours and diets.
    Rules:
    - Mon-Thu: 08:00-13:00, 15:00-18:00 (8h)
    - Fri: 08:00-13:00, 15:00-16:45 (6h 45m)
    - If lunch break < 1.5h AND worker logged MEAL_IN/OUT: +1h Overtime + 1 Diet.
    """
    date_str = day_records.get('date')
    if not date_str: return 0, 0, 0, 0
    
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    is_friday = dt.weekday() == 4
    
    # Standard limits
    MORNING_START = 8.0 # 08:00
    MORNING_END = 13.0   # 13:00
    AFTERNOON_START = 15.0 # 15:00
    AFTERNOON_END = 16.75 if is_friday else 18.0 # 16:45 or 18:00
    
    regular_hours = 0
    overtime_hours = 0
    meal_duration = 0
    diet_count = 0
    
    def time_to_float(ts):
        if not ts: return None
        try:
            # ts is YYYY-MM-DD HH:MM
            t_part = ts.split(' ')[1]
            parts = t_part.split(':')
            h, m = int(parts[0]), int(parts[1])
            return h + m/60.0
        except: return None

    t_in = time_to_float(day_records.get('in'))
    t_out = time_to_float(day_records.get('out'))
    t_meal_in = time_to_float(day_records.get('meal_in'))
    t_meal_out = time_to_float(day_records.get('meal_out'))

    if t_in is not None and t_out is not None:
        # 1. Regular Hours Morning
        m_in = max(t_in, MORNING_START)
        m_out = min(t_meal_in if t_meal_in else t_out, MORNING_END)
        if m_out > m_in:
            regular_hours += (m_out - m_in)
        
        # 2. Regular Hours Afternoon
        a_in = max(t_meal_out if t_meal_out else t_in, AFTERNOON_START)
        a_out = min(t_out, AFTERNOON_END)
        if a_out > a_in:
            regular_hours += (a_out - a_in)
            
        # 3. Overtime: Before 08:00
        if t_in < MORNING_START:
            overtime_hours += (MORNING_START - t_in)
            
        # 4. Overtime: After standard end
        if t_out > AFTERNOON_END:
            overtime_hours += (t_out - AFTERNOON_END)
            
        # 5. Diet & Meal Overtime
        if t_meal_in is not None and t_meal_out is not None:
            meal_duration = t_meal_out - t_meal_in
            if meal_duration < 1.5:
                # Zerain rule: if meal break is short, they get 1h overtime extra and 1 diet
                overtime_hours += 1.0
                diet_count = 1
                
    return round(regular_hours, 2), round(overtime_hours, 2), round(meal_duration, 2), diet_count, bool(day_records.get('modified'))


@app.get("/api/v1/audit/suspicious")
async def get_suspicious_activity(current_admin: dict = Depends(get_current_admin)):
    """Get all suspicious audit log entries (changes after approval)"""
    try:
        rows = []
        with db.get_cursor() as c:
            c.execute("""
                SELECT * FROM audit_log 
                WHERE suspicious = 1 
                ORDER BY timestamp DESC
            """)
            rows = c.fetchall()
        
        activities = []
        for row in rows:
            activities.append({
                "id": row['id'],
                "table_name": row['table_name'],
                "record_id": row['record_id'],
                "action": row['action'],
                "old_values": row['old_values'],
                "new_values": row['new_values'],
                "user_id": row['user_id'],
                "timestamp": row['timestamp']
            })
        
        return activities
    except Exception as e:
        print(f"Audit Error: {e}")
        return []

@app.get("/api/v1/audit/history/{table_name}/{record_id}")
async def get_record_history(table_name: str, record_id: int):
    """Get full change history for a specific record"""
    try:
        rows = []
        with db.get_cursor() as c:
            c.execute("""
                SELECT * FROM audit_log 
                WHERE table_name = ? AND record_id = ?
                ORDER BY timestamp DESC
            """, (table_name, record_id))
            rows = c.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row['id'],
                "action": row['action'],
                "old_values": row['old_values'],
                "new_values": row['new_values'],
                "user_id": row['user_id'],
                "timestamp": row['timestamp'],
                "suspicious": bool(row['suspicious'])
            })
        
        return history
    except Exception as e:
        print(f"History Error: {e}")
        return []

@app.get("/api/v1/attendance")
async def get_all_attendance(current_admin: dict = Depends(get_current_admin)):
    """Get all attendance records for Torre de Control"""
    try:
        rows = []
        with db.get_cursor() as c:
            c.execute("""
                SELECT * FROM attendance_log 
                ORDER BY timestamp DESC
            """)
            rows = c.fetchall()
        
        records = []
        for row in rows:
            records.append({
                "id": row['id'],
                "driver_id": row['driver_id'],
                "type": row['type'],
                "timestamp": row['timestamp'],
                "approved": bool(row['approved'])
            })
        
        return records
    except Exception as e:
        print(f"Attendance Error: {e}")
        return []

@app.get("/api/v1/attendance/{driver_id}")
async def get_driver_attendance(driver_id: str):
    """Get attendance records for a specific driver"""
    try:
        rows = []
        with db.get_cursor() as c:
            c.execute("""
                SELECT * FROM attendance_log 
                WHERE driver_id = ?
                ORDER BY timestamp DESC
            """, (str(driver_id),))
            rows = c.fetchall()
        
        records = []
        for row in rows:
            records.append({
                "id": row['id'],
                "driver_id": row['driver_id'],
                "type": row['type'],
                "timestamp": row['timestamp'],
                "approved": bool(row['approved'])
            })
        
        return records
    except Exception as e:
        print(f"Attendance Error: {e}")
        return []

@app.get("/api/v1/leaves")
async def get_all_leaves():
    """Get all leave requests"""
    try:
        rows = []
        with db.get_cursor() as c:
            c.execute("""
                SELECT * FROM leaves 
                ORDER BY timestamp DESC
            """)
            rows = c.fetchall()
        
        leaves = []
        for row in rows:
            leaves.append({
                "id": row['id'],
                "driver_id": row['driver_id'],
                "type": row['type'],
                "start_date": row['start_date'],
                "end_date": row['end_date'],
                "approved": bool(row['approved']),
                "timestamp": row['timestamp']
            })
        
        return leaves
    except Exception as e:
        print(f"Leaves Error: {e}")
        return []

@app.get("/api/v1/expenses")
async def get_all_expenses():
    """Get all expense records"""
    try:
        rows = []
        with db.get_cursor() as c:
            c.execute("""
                SELECT * FROM expenses 
                ORDER BY timestamp DESC
            """)
            rows = c.fetchall()
        
        expenses = []
        for row in rows:
            expense_dict = {
                "id": row['id'],
                "driver_id": row['driver_id'],
                "date": row['date'],
                "amount": row['amount'],
                "type": row['type'],
                "description": row.get('description'),
                "approved": bool(row['approved']),
                "timestamp": row['timestamp']
            }
            # Add ticket_url if column exists
            try:
                expense_dict["ticket_url"] = row.get('ticket_url')
            except:
                pass
            expenses.append(expense_dict)
        
        return expenses
    except Exception as e:
        print(f"Expenses Error: {e}")
        return []

@app.post("/api/v1/expenses")
async def submit_expense(expense: ExpenseSubmission, current_user: dict = Depends(get_current_user)):
    """Submit a new expense and sync with Odoo in real-time"""
    try:
        expense_id = None
        # 1. Save Locally for Control Tower UI
        with db.get_cursor() as c:
            c.execute("PRAGMA table_info(expenses)")
            columns = [col[1] for col in c.fetchall()]
            has_description = 'description' in columns
            has_ticket_url = 'ticket_url' in columns
            
            if has_ticket_url and has_description:
                c.execute("""
                    INSERT INTO expenses (driver_id, date, amount, type, description, ticket_url, approved)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                """, (expense.driver_id, expense.date, expense.amount, expense.type, expense.description, expense.ticket_url))
            elif has_description:
                c.execute("""
                    INSERT INTO expenses (driver_id, date, amount, type, description, approved)
                    VALUES (?, ?, ?, ?, ?, 0)
                """, (expense.driver_id, expense.date, expense.amount, expense.type, expense.description))
            else:
                c.execute("""
                    INSERT INTO expenses (driver_id, date, amount, type, approved)
                    VALUES (?, ?, ?, ?, 0)
                """, (expense.driver_id, expense.date, expense.amount, expense.type))
            
            expense_id = c.lastrowid

        # 2. SYNC WITH ODOO REAL-TIME
        try:
            # Sync to Odoo
            odoo_id = odoo_client.log_expense(
                employee_id=expense.driver_id,
                amount=expense.amount,
                date_str=expense.date,
                category=expense.type,
                description=expense.description,
                photo_base64=expense.ticket_url
            )
            print(f"Expense synced to Odoo with ID: {odoo_id}")
        except Exception as odoo_err:
            print(f"Warning: Odoo Sync Failed: {odoo_err}")

        return {"status": "success", "expense_id": expense_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting expense: {str(e)}")

@app.post("/api/v1/expenses/{expense_id}/approve")
async def approve_expense(expense_id: int, current_admin: dict = Depends(get_current_admin)):
    """Approve an expense"""
    try:
        with db.get_cursor() as c:
            c.execute("""
                UPDATE expenses 
                SET approved = 1 
                WHERE id = ?
            """, (expense_id,))
        
        return {"status": "approved", "expense_id": expense_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error approving expense: {str(e)}")

@app.post("/api/v1/expenses/{expense_id}/reject")
async def reject_expense(expense_id: int, current_admin: dict = Depends(get_current_admin)):
    """Reject an expense"""
    try:
        with db.get_cursor() as c:
            c.execute("""
                UPDATE expenses 
                SET approved = -1 
                WHERE id = ?
            """, (expense_id,))
        
        return {"status": "rejected", "expense_id": expense_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rejecting expense: {str(e)}")


@app.post("/api/v1/attendance/{record_id}/reject")
async def reject_attendance(record_id: int, current_admin: dict = Depends(get_current_admin)):
    """Reject an attendance record"""
    try:
        with db.get_cursor() as c:
            c.execute("""
                UPDATE attendance_log 
                SET approved = -1 
                WHERE id = ?
            """, (record_id,))
        
        return {"status": "rejected", "record_id": record_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rejecting: {str(e)}")

@app.post("/api/v1/attendance/{record_id}/approve")
async def approve_attendance(record_id: int, current_admin: dict = Depends(get_current_admin)):
    """Approve an attendance record"""
    try:
        with db.get_cursor() as c:
            c.execute("""
                UPDATE attendance_log 
                SET approved = 1 
                WHERE id = ?
            """, (record_id,))
        
        return {"status": "approved", "record_id": record_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error approving: {str(e)}")

@app.post("/api/v1/leaves/{record_id}/approve")
async def approve_leave(record_id: int, current_admin: dict = Depends(get_current_admin)):
    """Approve a leave request"""
    try:
        with db.get_cursor() as c:
            c.execute("""
                UPDATE leaves 
                SET approved = 1 
                WHERE id = ?
            """, (record_id,))
        
        return {"status": "approved", "record_id": record_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error approving: {str(e)}")
@app.post("/api/v1/attendance/override")
async def save_attendance_override(data: AttendanceOverride, request: Request, current_admin: dict = Depends(get_current_admin)):
    """
    Save or update an admin override for a specific day.
    CRITICAL: Implements Audit Trail. If a record exists, we log the change before overwriting.
    """
    if current_admin['role'] == 'INSPECTOR':
        raise HTTPException(status_code=403, detail="Inspectors have READ-ONLY access.")

    try:
        status_map = {
            'APPROVED': 1,
            'REJECTED': -1,
            'PENDING': 0,
            'MODIFIED': 2
        }
        status_val = status_map.get(data.status, 2)
        
        with db.get_cursor() as c:
            # 1. AUDIT CHECK: Does a record already exist?
            c.execute("SELECT * FROM attendance_overrides WHERE driver_id = ? AND date = ?", (data.driver_id, data.date))
            existing = c.fetchone()
            
            if existing:
                # 2. LOG THE CHANGE (Audit Trail)
                # We save the OLD state before overwriting it.
                old_state = dict(existing)
                new_state = data.dict()
                
                details_json = json.dumps({
                    "change_reason": data.admin_comment or "Manual Override",
                    "old_data": old_state,
                    "new_data": new_state
                })
                
                c.execute("""
                    INSERT INTO audit_logs (admin_username, action, table_name, record_id, details, ip_address)
                    VALUES (?, 'UPDATE_OVERRIDE', 'attendance_overrides', ?, ?, ?)
                """, (current_admin['username'], f"{data.driver_id}|{data.date}", details_json, request.client.host))

            # 3. PERFORM THE UPDATE (Upsert)
            c.execute("""
                INSERT OR REPLACE INTO attendance_overrides 
                (driver_id, date, regular_hours, overtime_hours, diet_count, status, admin_comment, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (data.driver_id, data.date, data.regular_hours, data.overtime_hours, data.diet_count, status_val, data.admin_comment))
        
        return {"status": "success", "message": "Override saved with audit trail"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving override: {str(e)}")

# --- COMPLIANCE & INSPECTOR ENDPOINTS ---



import secrets

# Add these endpoints to main.py after the existing endpoints

# --- TRUCKS, CUSTOMERS & ORDERS ---

@app.get("/api/v1/trucks")
async def get_all_trucks():
    try:
        # 1. Fetch from Odoo (for current plates/ids/categories)
        if not odoo_client.uid and not odoo_client.connect():
             print("Warning: Could not connect to Odoo for Trucks")
        
        odoo_trucks = odoo_client.get_vehicles()
        
        # 2. Fetch from Local DB (for technical fields)
        try:
            with db.get_cursor() as c:
                c.execute("SELECT * FROM trucks")
                rows = c.fetchall()
                local_trucks = {row['id']: dict(row) for row in rows}
                # Also map by plate for robustness
                local_by_plate = {row['plate']: dict(row) for row in rows}
        except Exception as e:
            print(f"Error fetching local trucks: {e}")
            local_trucks = {}
            local_by_plate = {}

        # 3. Merge
        merged_trucks = []
        for ot in odoo_trucks:
            plate = ot.get('plate')
            oid = ot.get('id')
            
            # Find local data
            lt = local_trucks.get(oid) or local_by_plate.get(plate)
            
            if lt:
                # Merge fields from local (Overwrite Odoo empty notes)
                ot.update({
                    'display_order': lt.get('display_order', 0),
                    'max_weight': lt.get('max_weight'),
                    'max_length': lt.get('max_length'),
                    'itv_expiration': lt.get('itv_expiration'),
                    'next_maintenance': lt.get('next_maintenance'),
                    'color': lt.get('color') or ot.get('color'),
                    'axles': lt.get('axles') if lt.get('axles') is not None else ot.get('axles'),
                })
            merged_trucks.append(ot)

        # Sort by display_order then plate
        merged_trucks.sort(key=lambda x: (x.get('display_order', 0), x.get('plate') or ""))
        return merged_trucks
    except Exception as e:
        print(f"Error fetching trucks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/trucks")
async def create_truck(request: Request, truck: dict, current_admin: dict = Depends(get_current_admin)):
    try:
        # Create in Odoo first (not implemented yet? normally vehicles are in Odoo)
        # For now, if it's already an Odoo ID, we don't 'create' in Odoo via this API,
        # but the user might be adding a new one via the web UI.
        # If we need to create in Odoo:
        # res = odoo_client.create_vehicle(truck)
        # return {"status": "success", "id": res}
        return {"status": "success", "message": "Creation logic should be handled in Odoo"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/trucks/{truck_id}")
async def update_truck(request: Request, truck_id: str, truck: dict, current_admin: dict = Depends(get_current_admin)):
    try:
        # 1. Update Local DB (Primary Source for technical data)
        try:
            with db.get_cursor() as c:
                c.execute("""
                    INSERT OR REPLACE INTO trucks 
                    (id, plate, alias, category, status, axles, max_weight, color, 
                     has_crane, has_jib, is_box_body, max_length, display_order, 
                     itv_expiration, next_maintenance)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    truck_id,
                    truck.get('plate'),
                    truck.get('alias'),
                    truck.get('category'),
                    truck.get('status', 'AVAILABLE'),
                    truck.get('axles'),
                    truck.get('max_weight'),
                    truck.get('color'),
                    truck.get('has_crane'),
                    truck.get('has_jib'),
                    truck.get('is_box_body'),
                    truck.get('max_length'),
                    truck.get('display_order', 0),
                    truck.get('itv_expiration'),
                    truck.get('next_maintenance')
                ))
        except Exception as sqlite_err:
            print(f"Error updating local truck: {sqlite_err}")

        # 2. Update Odoo (Only for category and basic info, NO more notes sync)
        if truck_id.isdigit(): 
            try:
                odoo_client.update_vehicle(truck_id, truck)
            except Exception as odoo_err:
                print(f"Error syncing to Odoo: {odoo_err}")
                
        return {"status": "success"}
    except Exception as e:
        print(f"Error in overall truck update: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/trucks/{truck_id}")
async def delete_truck(request: Request, truck_id: str, current_admin: dict = Depends(get_current_admin)):
    try:
        log_audit(current_admin['username'], 'DELETE_TRUCK', 'trucks', truck_id, "Attempted truck delete (not synced to Odoo)", request.client.host)
        return {"status": "success", "message": "Deletion should be handled in Odoo"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/customers")
async def get_all_customers():
    try:
        rows = []
        with db.get_cursor() as c:
            # Optimize: Do NOT fetch image_128 as it's too large for the main list
            c.execute("SELECT id, display_id, name, nif, phone, email, billing_address, postal_code, city, notes, reliability, locations, ai_category, ai_revenue, ai_employees, ai_reliability, ai_explanation, ai_company_status FROM customers")
            rows = c.fetchall()
        
        res = []
        for r in rows:
            d = dict(r)
            d['locations'] = json.loads(d['locations']) if d.get('locations') else []
            res.append(d)
        return res
    except Exception as e:
        print(f"Error fetching customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/customers/sync")
async def sync_customers(current_admin: dict = Depends(get_current_admin)):
    """Fetch all customers from Odoo and update local cache."""
    try:
        if not odoo_client.uid and not odoo_client.connect():
             raise HTTPException(status_code=530, detail="Could not connect to Odoo")

        print("🔄 SYNC: Fetching customers from Odoo...")
        # We fetch all customers to build a complete local cache
        odoo_customers = odoo_client.get_customers(limit=10000)
        
        if odoo_customers:
            with db.get_cursor() as c:
                for cust in odoo_customers:
                    def clean(v): return v if v is not False and v is not None else ""
                    
                    notes_raw = clean(cust.get('comment'))
                    import re
                    notes_clean = re.sub(r'<[^>]+>', '', str(notes_raw)) if '<' in str(notes_raw) else notes_raw
                    
                    address = f"{clean(cust.get('street'))}, {clean(cust.get('city'))}".strip(', ')
                    
                    reliability = None
                    if "FIABILIDAD:" in str(notes_clean):
                        try: reliability = int(str(notes_clean).split("FIABILIDAD:")[1].split("/10")[0].strip())
                        except: pass

                    c.execute("""
                        INSERT INTO customers (
                            id, display_id, name, nif, phone, email, billing_address, 
                            postal_code, city, notes, reliability, locations, image_128,
                            ai_category, ai_revenue, ai_employees, ai_reliability, ai_explanation, ai_company_status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            display_id=excluded.display_id,
                            name=excluded.name,
                            nif=excluded.nif,
                            phone=excluded.phone,
                            email=excluded.email,
                            billing_address=excluded.billing_address,
                            postal_code=excluded.postal_code,
                            city=excluded.city,
                            notes=excluded.notes,
                            reliability=excluded.reliability,
                            locations=excluded.locations,
                            image_128=excluded.image_128,
                            ai_category=excluded.ai_category,
                            ai_revenue=excluded.ai_revenue,
                            ai_employees=excluded.ai_employees,
                            ai_reliability=excluded.ai_reliability,
                            ai_explanation=excluded.ai_explanation,
                            ai_company_status=excluded.ai_company_status
                    """, (
                        str(cust['id']), 
                        cust['id'],
                        clean(cust.get('name')),
                        clean(cust.get('vat')),
                        clean(cust.get('phone')),
                        clean(cust.get('email')),
                        address,
                        clean(cust.get('zip')),
                        clean(cust.get('city')),
                        notes_clean,
                        reliability,
                        json.dumps([address] if address else []),
                        clean(cust.get('image_128')),
                        clean(cust.get('x_studio_categoria')),
                        clean(cust.get('x_studio_facturacion_estimada')),
                        clean(cust.get('x_studio_num_empleados')),
                        clean(cust.get('x_studio_fiabilidad')),
                        clean(cust.get('x_studio_explicacion')),
                        clean(cust.get('x_studio_estado_empresa'))
                    ))
            return {"status": "success", "count": len(odoo_customers)}
        return {"status": "success", "count": 0}
    except Exception as e:
        print(f"Error syncing customers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/customers/{customer_id}/sync")
async def sync_single_customer(customer_id: str, current_admin: dict = Depends(get_current_admin)):
    """Fetch a single customer from Odoo and update local cache. Refreshes the display dynamically."""
    try:
        if not odoo_client.uid and not odoo_client.connect():
             raise HTTPException(status_code=530, detail="Could not connect to Odoo")

        print(f"🔄 SYNC: Fetching single customer {customer_id} from Odoo...")
        odoo_customers = odoo_client.get_customers(customer_id=customer_id)
        
        if odoo_customers and len(odoo_customers) > 0:
            cust = odoo_customers[0]
            with db.get_cursor() as c:
                def clean(v): return v if v is not False and v is not None else ""
                
                notes_raw = clean(cust.get('comment'))
                import re
                notes_clean = re.sub(r'<[^>]+>', '', str(notes_raw)) if '<' in str(notes_raw) else notes_raw
                address = f"{clean(cust.get('street'))}, {clean(cust.get('city'))}".strip(', ')
                
                reliability = None
                if "FIABILIDAD:" in str(notes_clean):
                    try: reliability = int(str(notes_clean).split("FIABILIDAD:")[1].split("/10")[0].strip())
                    except: pass

                c.execute("""
                    INSERT INTO customers (
                        id, display_id, name, nif, phone, email, billing_address, 
                        postal_code, city, notes, reliability, locations, image_128,
                        ai_category, ai_revenue, ai_employees, ai_reliability, ai_explanation, ai_company_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        display_id=excluded.display_id,
                        name=excluded.name,
                        nif=excluded.nif,
                        phone=excluded.phone,
                        email=excluded.email,
                        billing_address=excluded.billing_address,
                        postal_code=excluded.postal_code,
                        city=excluded.city,
                        notes=excluded.notes,
                        reliability=excluded.reliability,
                        locations=excluded.locations,
                        image_128=excluded.image_128,
                        ai_category=excluded.ai_category,
                        ai_revenue=excluded.ai_revenue,
                        ai_employees=excluded.ai_employees,
                        ai_reliability=excluded.ai_reliability,
                        ai_explanation=excluded.ai_explanation,
                        ai_company_status=excluded.ai_company_status
                """, (
                    str(cust['id']), 
                    cust['id'],
                    clean(cust.get('name')),
                    clean(cust.get('vat')),
                    clean(cust.get('phone')),
                    clean(cust.get('email')),
                    address,
                    clean(cust.get('zip')),
                    clean(cust.get('city')),
                    notes_clean,
                    reliability,
                    json.dumps([address] if address else []),
                    clean(cust.get('image_128')),
                    clean(cust.get('ai_category')),
                    clean(cust.get('ai_revenue')),
                    clean(cust.get('ai_employees')),
                    clean(cust.get('ai_reliability')),
                    clean(cust.get('ai_explanation')),
                    clean(cust.get('ai_company_status'))
                ))
            
            # Format return to match the frontend state expectations
            cust['locations'] = [address] if address else []
            cust['notes'] = notes_clean
            cust['reliability'] = reliability
            return {"status": "success", "customer": cust}
        return {"status": "not_found"}
    except Exception as e:
        print(f"Error syncing single customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/customers")
async def create_customer(request: Request, customer: dict, current_admin: dict = Depends(get_current_admin)):
    try:
        # 1. Create in Odoo
        odoo_data = {
            'name': customer.get('name'),
            'phone': customer.get('phone'),
            'email': customer.get('email'),
            'vat': customer.get('nif'),
            'street': customer.get('billing_address'),
            'zip': customer.get('postal_code'),
            'comment': customer.get('notes'),
            'customer_rank': 1,
            'is_company': True
        }
        
        odoo_id = odoo_client.create_customer(odoo_data)
        
        # 2. Sync to local
        with db.get_cursor() as c:
            locations_json = json.dumps(customer.get('locations', []))
            c.execute("""
                INSERT OR REPLACE INTO customers (id, display_id, name, nif, phone, email, billing_address, postal_code, city, notes, locations)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (str(odoo_id), odoo_id, customer['name'], customer.get('nif'), customer.get('phone'), 
                  customer.get('email'), customer.get('billing_address'), customer.get('postal_code'), 
                  customer.get('city'), customer.get('notes'), locations_json))
        
        log_audit(current_admin['username'], 'CREATE_CUSTOMER_ODOO', 'customers', str(odoo_id), f"Created customer {customer['name']} in Odoo", request.client.host)
        return {"status": "success", "id": str(odoo_id)}
    except Exception as e:
        print(f"ERROR CREATE CUSTOMER ODOO: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/customers/{customer_id}")
async def update_customer(request: Request, customer_id: str, customer: dict, current_admin: dict = Depends(get_current_admin)):
    try:
        # 1. Update in Odoo
        odoo_data = {
            'name': customer.get('name'),
            'phone': customer.get('phone'),
            'email': customer.get('email'),
            'vat': customer.get('nif'),
            'street': customer.get('billing_address'),
            'zip': customer.get('postal_code'),
            'comment': customer.get('notes'),
            'is_company': True
        }
        
        odoo_client.update_customer(customer_id, odoo_data)

        # 2. Sync to local
        with db.get_cursor() as c:
            positions_json = json.dumps(customer.get('locations', []))
            c.execute("""
                UPDATE customers SET name=?, phone=?, email=?, billing_address=?, locations=?, notes=?
                WHERE id=?
            """, (customer['name'], customer.get('phone'), customer.get('email'), 
                  customer.get('billing_address'), positions_json, customer.get('notes'), customer_id))
        
        log_audit(current_admin['username'], 'UPDATE_CUSTOMER_ODOO', 'customers', customer_id, f"Updated customer {customer['name']} in Odoo", request.client.host)
        return {"status": "success"}
    except Exception as e:
        print(f"ERROR UPDATE CUSTOMER ODOO: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/customers/{customer_id}")
async def delete_customer(request: Request, customer_id: str, current_admin: dict = Depends(get_current_admin)):
    try:
        # 1. Archive in Odoo
        odoo_client.delete_customer(customer_id)

        # 2. Delete local
        with db.get_cursor() as c:
            c.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
        
        log_audit(current_admin['username'], 'DELETE_CUSTOMER_ODOO', 'customers', customer_id, "Customer archived in Odoo and deleted locally", request.client.host)
        return {"status": "success"}
    except Exception as e:
        print(f"ERROR DELETE CUSTOMER ODOO: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/customers/{customer_id}/geocode")
@limiter.limit("5/minute")
async def geocode_customer_on_demand(request: Request, customer_id: str, current_admin: dict = Depends(get_current_admin)):
    """
    Geocodes a single customer's billing address and updates locations.
    """
    try:
        from services.maps_service import geocode_address
        
        with db.get_cursor() as c:
            c.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
            row = c.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Customer not found")
            
            cust = dict(row)
            addr = cust['billing_address']
            
            # Skip if already geocoded
            if addr and ", España" in addr:
                return cust
            
            new_addr = geocode_address(addr)
            if new_addr:
                try:
                    locs = json.loads(cust['locations'] or "[]")
                except:
                    locs = []
                
                if new_addr not in locs:
                    locs.append(new_addr)
                
                c.execute("UPDATE customers SET billing_address = ?, locations = ? WHERE id = ?", 
                          (new_addr, json.dumps(locs), customer_id))
                
                # Log usage
                c.execute("INSERT INTO gcp_usage (service, request_type, cost_est) VALUES (?, ?, ?)", 
                          ('MAPS_GEOCODE', f'On-demand: {cust["name"]}', 0.005))
                
                cust['billing_address'] = new_addr
                cust['locations'] = locs

                return cust
            else:
                return cust # Return as is if geo fails
    except Exception as e:
        print(f"Error geocoding customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/odoo/products")
async def get_odoo_products(current_admin: dict = Depends(get_current_admin)):
    """Fetch Odoo products for billing visualization."""
    try:
        print(f"DEBUG: Fetching products for admin {current_admin.get('username')}")
        products = odoo_client.get_products(limit=200)
        print(f"DEBUG: Found {len(products)} products in Odoo")
        return products
    except Exception as e:
        print(f"DEBUG ERROR: {e}")
        logger.error(f"Error fetching products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/ai/prompts")
async def get_ai_prompts(current_admin: dict = Depends(get_current_admin)):
    """Fetch all AI prompts for management."""
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM ai_prompts ORDER BY name ASC")
            rows = c.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"Error fetching prompts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/ai/prompts/{prompt_id}")
async def update_ai_prompt(prompt_id: str, data: dict, current_admin: dict = Depends(get_current_admin)):
    """Update a specific AI prompt."""
    try:
        new_prompt = data.get('prompt')
        new_name = data.get('name')
        new_desc = data.get('description')
        
        if not new_prompt:
            raise HTTPException(status_code=400, detail="Prompt content is required")
            
        with db.get_cursor() as c:
            c.execute("""
                UPDATE ai_prompts 
                SET prompt = ?, name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_prompt, new_name, new_desc, prompt_id))
        return {"status": "success"}
    except Exception as e:
        print(f"Error updating prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/customers/clear-notes")
async def clear_all_customer_notes(current_admin: dict = Depends(get_current_admin)):
    """Remove duplicate AI investigation notes from both Odoo and Local DB."""
    try:
        marker = "--- [INVESTIGACION AI] ---"
        cleaned_count = 0
        
        # 1. CLEAN ODOO
        print("🔌 Connecting to Odoo for cleanup...")
        if odoo_client.connect():
            partner_ids = odoo_client.execute('res.partner', 'search', [['comment', 'like', f'%{marker}%']])
            if partner_ids:
                # Read comment field for these partners
                partners = odoo_client.execute('res.partner', 'read', partner_ids, ['id', 'comment'])
                for p in partners:
                    comment = p.get('comment') or ''
                    if comment.count(marker) > 1:
                        first_pos = comment.find(marker)
                        second_pos = comment.find(marker, first_pos + len(marker))
                        cleaned_comment = comment[:second_pos].rstrip()
                        
                        # Update Odoo
                        odoo_client.execute('res.partner', 'write', [p['id']], {'comment': cleaned_comment})
                        cleaned_count += 1
        
        # 2. CLEAN LOCAL DB
        with db.get_cursor() as c:
            c.execute("SELECT id, notes FROM customers WHERE notes LIKE ?", (f"%{marker}%",))
            customers = c.fetchall()
            
            for customer in customers:
                customer_id = customer['id']
                notes = customer['notes'] or ''
                
                if notes.count(marker) > 1:
                    first_pos = notes.find(marker)
                    second_pos = notes.find(marker, first_pos + len(marker))
                    cleaned_notes = notes[:second_pos].rstrip()
                    
                    c.execute("UPDATE customers SET notes = ? WHERE id = ?", (cleaned_notes, customer_id))
                    # We don't double count if already cleaned in Odoo, but local-only notes might exist
            
        return {
            "status": "success",
            "cleaned": cleaned_count,
            "message": f"Limpiadas {cleaned_count} notas duplicadas en Odoo y base de datos local."
        }
    except Exception as e:
        print(f"Error clearing duplicate customer notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/odoo/budgets")
async def get_odoo_budgets(current_admin: dict = Depends(get_current_admin)):
    """Fetch Odoo budgets and map them to control tower phases."""
    try:
        print(f"DEBUG: Fetching budgets for admin {current_admin.get('username')}")
        # Fetching sale orders with essential fields
        odoo_so = odoo_client.get_sale_orders(limit=100)
        print(f"DEBUG: Found {len(odoo_so)} sale orders in Odoo")
        res = []
        
        for so in odoo_so:
            try:
                # --- FILTER OUT INTERNAL TASKS ---
                partner_id = so.get('partner_id', [None, ''])[0]
                partner_name = so.get('partner_id', [None, ''])[1] if (so.get('partner_id') and len(so['partner_id']) > 1) else ""
                
                # Skip if no partner or internal partner
                if not partner_id or not partner_name:
                    continue
                    
                # Skip internal tasks (meals, maintenance)
                internal_keywords = ['COMIDA', 'MEAL', 'INTERNAL', 'MANTENIMIENTO', 'MAINTENANCE', 'TALLER']
                if any(keyword in partner_name.upper() for keyword in internal_keywords):
                    continue

                # Also filter by order name and note (catches old meal orders with real partners)
                order_name = so.get('name', '')
                order_note = so.get('note', '') or ''
                meal_keywords = ['comida', 'descanso', 'meal', 'pausa']
                if any(k in order_name.lower() for k in meal_keywords) or any(k in order_note.lower() for k in meal_keywords):
                    continue
                
                # Filter out cancelled budgets
                if so.get('state') == 'cancel':
                    continue
                
                # Filter out already invoiced sale orders (Invoices)
                if so.get('invoice_status') == 'invoiced':
                    continue
                
                # Check parsed data for internal task markers
                transport_data = so.get('parsed_data', {})
                order_type = transport_data.get('type', '').upper()
                if order_type in ['MEAL', 'MAINTENANCE', 'INTERNAL']:
                    continue
                
                # --- PROCESS VALID BUDGET ---
                so_id_str = str(so['id'])
                
                # Use the already parsed data from Odoo Service
                if not transport_data:
                    transport_data = {
                        'origin': '-', 'dest': '-', 'plate': '-', 'driver': '-', 
                        'load': '-', 'notes': '', 'date': '', 'km': 0, 'km_to_origin': 0
                    }
                
                # The service separates items from transport notes
                items = transport_data.get('items', [])

                # Determine Phase based on Odoo state
                state = so.get('state', 'draft')
                phase = 'BORRADOR'
                
                if state in ['draft', 'sent']:
                    phase = 'BORRADOR'
                elif state == 'sale':
                    if so.get('invoice_status') == 'invoiced':
                        phase = 'FINALIZADO'
                    else:
                        phase = 'APROBADO'
                elif state == 'done':
                    phase = 'FINALIZADO'
                elif state == 'cancel':
                    phase = 'CANCELADO'

                res.append({
                    'id': so_id_str,
                    'odoo_name': so.get('name', 'S/N'),
                    'client_name': partner_name,
                    'amount_total': float(so.get('amount_total', 0.0)),
                    'date_order': str(so.get('date_order') or ''),
                    'phase': phase,
                    'details': transport_data,
                    'items': items,
                    # Add raw distances for frontend ease
                    'km': transport_data.get('km', 0),
                    'km_to_origin': transport_data.get('km_to_origin', 0),
                    'client_tags': so.get('client_tags', [])
                })
            except Exception as inner_e:
                print(f"DEBUG: Skipping SO due to error: {inner_e}")
                continue
            
        print(f"DEBUG: Returning {len(res)} budgets to frontend")
        return res
    except Exception as e:
        print(f"DEBUG ERROR BUDGETS: {e}")
        logger.error(f"Error fetching budgets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/orders")
async def get_all_orders():
    """
    Fetch all sale orders from Odoo and parse them into frontend Orders.
    Now uses Odoo as the SINGLE SOURCE OF TRUTH (no local SQL for orders).
    """
    try:
        # 1. Fetch auxiliary data for ID mapping (Trucks) from Odoo
        trucks_map = {}
        drivers_map = {} 
        
        # Build map from Odoo vehicles
        odoo_vehicles = odoo_client.get_vehicles()
        for v in odoo_vehicles:
            v_id = v.get('id')
            plate = v.get('plate')
            alias = v.get('alias')
            if plate: trucks_map[str(plate).upper().strip()] = v_id
            if alias: trucks_map[str(alias).upper().strip()] = v_id
            if v_id: trucks_map[str(v_id)] = v_id # Ensure we can find by ID too

        # Build map from Odoo employees
        odoo_emps = odoo_client.get_employees()
        if odoo_emps:
            for e in odoo_emps:
                e_id = e.get('id')
                e_name = e.get('name')
                if e_name: drivers_map[str(e_name).upper().strip()] = str(e_id)
                if e_id: drivers_map[str(e_id)] = str(e_id)

        # 2. Get sale orders from Odoo (with lines parsed)
        odoo_orders = odoo_client.get_sale_orders(limit=2000)
        print(f"📦 Fetched {len(odoo_orders)} sale orders from Odoo")
        
        res = []
        for so in odoo_orders:
            try:
                # Basic Odoo Data
                so_id = str(so.get('id'))
                so_name = so.get('name', 'S/N') # The "ID de la tarea" (e.g., S00023)
                
                # Extracted Data from Notes (parsed in odoo_service)
                data = so.get('parsed_data', {})
                
                # Determine Client
                partner_id = so.get('partner_id', [None, ''])[0]
                partner_name = so.get('partner_id', [None, ''])[1] if (so.get('partner_id') and len(so['partner_id']) > 1) else ""

                # --- FILTER ---
                if not partner_id or not partner_name:
                    continue
                
                # Filter out cancelled orders
                if so.get('state') == 'cancel':
                    continue
                
                # We WANT to see Maintenance tasks in the frontend now
                internal_keywords = ['COMIDA', 'MEAL', 'INTERNAL'] # Removed MAINTENANCE, TALLER
                if any(k in partner_name.upper() for k in internal_keywords):
                    continue
                if data.get('vehicle_type', '').upper() in ['MEAL', 'INTERNAL']: # Removed MAINTENANCE
                    continue
                
                # Map Status
                state = so.get('state', 'draft')
                status = 'DRAFT' # Changed from PENDING to match frontend types
                if state in ['sale', 'done']: status = 'COMPLETED'
                elif state == 'cancel': status = 'CANCELLED'
                # If parsed data implies it's "Planned" (has driver/truck/date), we could infer PLANNED status
                # But for now, let's trust the Odoo state or simple logic
                if data.get('driver') or data.get('plate'):
                    status = 'PLANNED' if status == 'PENDING' else status

                # Map IDs
                truck_id = trucks_map.get(str(data.get('plate', '')).upper().strip()) or data.get('plate') or ''
                driver_id = drivers_map.get(str(data.get('driver', '')).upper().strip()) or data.get('driver') or ''

                # Description: specific user request to show Odoo ID
                # We combine S-Number + Description
                raw_desc = so.get('client_order_ref') or so.get('name') or ''
                
                # Clean accessories if they are redundant in the ref
                if "ACCESORIOS:" in raw_desc:
                    raw_desc = raw_desc.split("ACCESORIOS:")[0].strip()

                final_desc = raw_desc
                if so_name not in raw_desc:
                    final_desc = f"[{so_name}] {raw_desc}"

                order = {
                    'id': so_id,
                    'client_id': str(partner_id) if partner_id else 'unknown',
                    'client_name': partner_name,
                    'description': final_desc,
                    'type': data.get('vehicle_type', 'TRANSPORT'),
                    'origin_address': data.get('origin', ''),
                    'destination_address': data.get('dest', ''),
                    'scheduled_start': data.get('date', '') if data.get('date') else so.get('date_order', ''),
                    'status': status,
                    'amount_total': so.get('amount_total', 0),
                    'truck_id': truck_id,
                    'driver_id': driver_id,
                    'load_weight': float(data.get('load') or 0) if str(data.get('load')).replace('.','',1).isdigit() else 0, # Simple parse attempt
                    'prep_duration_minutes': data.get('prep_time', 0),
                    'driving_duration_minutes': data.get('driving_time', 0),
                    'work_duration_minutes': data.get('work_time', 60),
                    'estimated_duration': data.get('estimated_duration', 60),

                    'requires_crane': data.get('requires_crane', False),
                    'km': data.get('km', 0),
                    'km_to_origin': data.get('km_to_origin', 0),
                    'previous_location': data.get('previous_location', ''), # New field
                    'accessories': data.get('accessories', []),
                    'items': data.get('items', []),
                    'odoo_name': so_name, # Explicit field for UI if needed
                    'client_tags': so.get('client_tags', [])
                }
                res.append(order)
            except Exception as inner:
                print(f"Error parsing SO {so.get('id')}: {inner}")
                continue

        # Local planning merge removed - Torre Control zero-cache architecture

        # --- MERGE LOCAL ORDERS (MEALS) ---
        try:
            # Only fetch meals from the last 7 days and future
            lookup_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            with db.get_cursor() as c:
                c.execute("SELECT * FROM meals WHERE scheduled_start >= ? AND status != 'CANCELLED'", (lookup_date,))
                rows = c.fetchall()
                for row in rows:
                    meal = dict(row)
                    # Ensure fields match Order interface expected by frontend
                    meal['display_id'] = 0
                    meal['odoo_id'] = 0
                    meal['name'] = 'Comida'
                    meal['odoo_name'] = 'Comida'
                    res.append(meal)
        except Exception as e:
            print(f"Error fetching local meals: {e}")

        return res
    except Exception as e:
        print(f"❌ Error fetching Odoo orders: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/maintenance")
async def get_maintenance_orders():
    """
    Fetch all maintenance orders from local DB.
    These are merged with regular orders in the frontend.
    """
    try:
        with db.get_cursor() as c:
            c.execute("""
                SELECT id, truck_id, scheduled_start, scheduled_end, 
                       estimated_duration, status, description, created_at,
                       type, client_id, client_name
                FROM maintenance_orders
                ORDER BY scheduled_start DESC
            """)
            rows = c.fetchall()
            
            # Convert to dict format matching Order type
            maintenance_orders = []
            for row in rows:
                maintenance_orders.append({
                    'id': row['id'],
                    'display_id': 0,
                    'type': row['type'] or 'MAINTENANCE',
                    'status': row['status'] or 'MAINTENANCE',
                    'client_id': row['client_id'] or 'internal',
                    'client_name': row['client_name'] or 'MANTENIMIENTO',
                    'truck_id': row['truck_id'],
                    'scheduled_start': row['scheduled_start'],
                    'estimated_duration': row['estimated_duration'],
                    'description': row['description'],
                    'origin_address': 'Taller Zerain',
                    'destination_address': 'Taller Zerain',
                    'items': []
                })
            
            logger.info(f"Fetched {len(maintenance_orders)} maintenance orders")
            return maintenance_orders
    except Exception as e:
        logger.error(f"Error fetching maintenance orders: {e}")
        return []


@app.post("/api/v1/orders")
async def create_order(request: Request, order: dict, background_tasks: BackgroundTasks, current_admin: dict = Depends(get_current_admin)):
    try:
        # --- LOCAL MEAL CREATION ---
        if order.get('type') == 'MEAL':
            try:
                with db.get_cursor() as c:
                    meal_id = order.get('id') or f"meal-{order.get('truck_id')}-{order.get('scheduled_start', '')[:10]}"
                    c.execute("""
                        INSERT OR REPLACE INTO meals (id, truck_id, driver_id, scheduled_start, estimated_duration, status, description, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """, (
                        meal_id,
                        order.get('truck_id'),
                        order.get('driver_id'),
                        order.get('scheduled_start'),
                        order.get('estimated_duration', 120),
                        order.get('status', 'PLANNED'),
                        order.get('description', 'Descanso Comida')
                    ))
                    # Return the meal object as if it was created
                    return {
                        'id': meal_id,
                        'display_id': 0,
                        'type': 'MEAL',
                        'status': 'PLANNED',
                        'client_name': 'COMIDA',
                        'scheduled_start': order.get('scheduled_start'),
                        'estimated_duration': order.get('estimated_duration', 120),
                        'truck_id': order.get('truck_id'),
                        'driver_id': order.get('driver_id'),
                        'description': order.get('description', 'Descanso Comida')
                    }
            except Exception as e:
                print(f"Error creating local meal: {e}")
                # Important: Even if local creation fails, we do NOT want to create it in Odoo
                raise HTTPException(status_code=500, detail=str(e))
        
        # --- STRICT GUARD: Block MEAL from proceeding to Odoo ---
        if order.get('type') == 'MEAL':
             # Should have returned above, but if logic flow changes, ensure we stop here
             print("Warning: MEAL order fell through local creation block")
             raise HTTPException(status_code=400, detail="Meal orders must be local only")

        # --- LOCAL MAINTENANCE CREATION ---
        if order.get('type') == 'MAINTENANCE' or order.get('status') == 'MAINTENANCE':
            try:
                import time
                with db.get_cursor() as c:
                    maint_id = order.get('id') or f"maint-{order.get('truck_id')}-{int(time.time())}"
                    
                    # Calculate scheduled_end from start + duration
                    scheduled_start = order.get('scheduled_start')
                    estimated_duration = order.get('estimated_duration', 60)
                    scheduled_end = None
                    
                    if scheduled_start and estimated_duration:
                        from datetime import datetime, timedelta
                        try:
                            start_dt = datetime.fromisoformat(scheduled_start.replace('Z', '+00:00'))
                            end_dt = start_dt + timedelta(minutes=estimated_duration)
                            scheduled_end = end_dt.isoformat()
                        except:
                            pass
                    
                    c.execute("""
                        INSERT OR REPLACE INTO maintenance_orders 
                        (id, truck_id, scheduled_start, scheduled_end, estimated_duration, status, description, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """, (
                        maint_id,
                        order.get('truck_id'),
                        scheduled_start,
                        scheduled_end,
                        estimated_duration,
                        'MAINTENANCE',
                        order.get('description', 'Mantenimiento Programado')
                    ))
                    
                    logger.info(f"Created maintenance order {maint_id} for truck {order.get('truck_id')}")
                    
                    return {
                        'id': maint_id,
                        'display_id': 0,
                        'type': 'MAINTENANCE',
                        'status': 'MAINTENANCE',
                        'client_name': 'MANTENIMIENTO',
                        'client_id': 'internal',
                        'truck_id': order.get('truck_id'),
                        'scheduled_start': scheduled_start,
                        'estimated_duration': estimated_duration,
                        'description': order.get('description', 'Mantenimiento Programado'),
                        'origin_address': 'Taller Zerain',
                        'destination_address': 'Taller Zerain'
                    }
            except Exception as e:
                logger.error(f"Error creating maintenance order: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Initialize variables to avoid UnboundLocalError
        driver_name = "-"
        truck_plate = "-"

        # Resolve Driver Name and Truck Plate for Odoo Notes
        with db.get_cursor() as c:
            # Resolve Driver Name from Odoo (Local table removed)
            if order.get('driver_id'):
                try:
                    # If it's a numeric Odoo ID, fetch the name
                    if str(order['driver_id']).isdigit():
                        emp_data = odoo_client.execute('hr.employee', 'read', [int(order['driver_id'])], ['name'])
                        if emp_data: driver_name = emp_data[0].get('name', str(order['driver_id']))
                        else: driver_name = str(order['driver_id'])
                    else:
                        driver_name = str(order['driver_id'])
                except:
                    driver_name = str(order['driver_id'])
            elif order.get('driver_name'): # Fallback if frontend sends it
                driver_name = order['driver_name']
            
            if order.get('truck_id'):
                # Try finding by ID first
                c.execute("SELECT plate FROM trucks WHERE id = ?", (str(order['truck_id']),))
                t_row = c.fetchone()
                if t_row: 
                    truck_plate = t_row['plate']
                else:
                    # Fallback: maybe the ID passed IS the plate?
                    truck_plate = order['truck_id'] if len(str(order['truck_id'])) < 15 else "-"

        # Prepare Transport Data for Odoo (Odoo Client handles formatting)
        import re
        def clean_text(t):
            if not t: return "-"
            # Remove emojis/non-ASCII
            return t.encode('ascii', 'ignore').decode('ascii').strip()

        raw_desc = order.get('description', '')
        accessories_list = order.get('accessories', [])
        
        # If accessories are embedded in description (common for manual entries), split them
        if "ACCESORIOS:" in raw_desc:
            parts = raw_desc.split("ACCESORIOS:")
            main_task = parts[0].strip()
            # If there's more after ACCESORIOS:, it might be the accessory list itself
            if len(parts) > 1:
                embedded_acc = parts[1].split('\n')[0].strip()
                if embedded_acc and embedded_acc not in accessories_list:
                    accessories_list.append(embedded_acc)
                # Remove the accessories line from description for the Concept section
                main_task = "\n".join([line for line in raw_desc.split('\n') if "ACCESORIOS:" not in line]).strip()
            raw_desc = main_task

        # Prepare distances with proactive fallback if zero
        km_val = order.get('km', order.get('distance_km', 0))
        km_to_origin_val = order.get('km_to_origin', 0)
        
        if (not km_val or not km_to_origin_val) and order.get('origin_address') and order.get('destination_address'):
            try:
                from config import DEFAULT_BASE_LOCATION
                start_p = DEFAULT_BASE_LOCATION
                # Normalize Base addresses
                if str(start_p).strip().lower() == 'base': start_p = DEFAULT_BASE_LOCATION
                if str(order.get('origin_address')).strip().lower() == 'base': order['origin_address'] = DEFAULT_BASE_LOCATION
                if str(order.get('destination_address')).strip().lower() == 'base': order['destination_address'] = DEFAULT_BASE_LOCATION
                if order.get('truck_id'):
                    with db.get_cursor() as c:
                        c.execute("SELECT current_location FROM trucks WHERE id = ?", (str(order['truck_id']),))
                        row = c.fetchone()
                        if row and row['current_location']: start_p = row['current_location']
                
                if not km_to_origin_val:
                    p_data = maps_service.get_distance_and_time(start_p, order.get('origin_address'))
                    if p_data: km_to_origin_val = p_data.get('distance_km', 0)
                
                if not km_val:
                    d_data = maps_service.get_distance_and_time(order.get('origin_address'), order.get('destination_address'))
                    if d_data: km_val = d_data.get('distance_km', 0)
            except: pass

        transport_data = {
            'origin': order.get('origin_address', '-'),
            'dest': order.get('destination_address', '-'),
            'plate': truck_plate,
            'driver': driver_name,
            'load': f"{order.get('load_weight', 0)}",
            'description': clean_text(raw_desc),
            'date': order.get('scheduled_start', ''),
            'vehicle_type': order.get('type', 'TRANSPORT'),
            'requires_crane': 'SÍ' if order.get('requires_crane') else 'NO',
            'requires_jib': 'SÍ' if order.get('requires_jib') else 'NO',
            'requires_box_body': 'SÍ' if order.get('requires_box_body') else 'NO',
            'crane_height': str(order.get('load_length', '-')),
            'accessories': ", ".join(accessories_list) if accessories_list else "-",
            'prep_time': order.get('prep_duration_minutes', 0),
            'driving_time': order.get('driving_duration_minutes', 0),
            'work_time': order.get('work_duration_minutes', 60),
            'km': km_val,
            'km_to_origin': km_to_origin_val
        }
        
        logger.info(f"Final transport_data for Odoo Create: {transport_data}")
        
        # Create directly in Odoo
        partner_id = order.get('client_id')
        # If partner_id is not numeric (e.g. 'unknown' or uuid), we might fail. 
        # But CreateOrderModal usually enforces valid client.
        if not str(partner_id).isdigit():
             # Try to find a default generic client or error?
             # For now, let's assume valid ID.
             pass

        odoo_so_id = odoo_client.create_sale_order(partner_id, transport_data)
        
        if not odoo_so_id:
            raise Exception("Failed to create Sale Order in Odoo")
            
        # Get the real Odoo name (e.g. S00123)
        so_data = odoo_client.execute('sale.order', 'read', [odoo_so_id], ['name'])
        odoo_name = so_data[0].get('name', 'S/N') if so_data else 'S/N'

        log_audit(current_admin['username'], 'CREATE_ORDER_ODOO', 'sale.order', str(odoo_so_id), f"Created SO for {order.get('client_name')}", request.client.host)
        
        # Local database save removed - Zero cache architecture

        # Enrich the original order object and return it
        order['id'] = str(odoo_so_id)
        order['odoo_name'] = odoo_name
        order['status'] = order.get('status') or 'ANALYZING'
        
        return order
        
    except Exception as e:
        logger.error(f"Order creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/orders/{order_id}")
async def update_order(request: Request, order_id: str, order: dict, background_tasks: BackgroundTasks, current_admin: dict = Depends(get_current_admin)):
    try:
        # --- LOCAL MEAL UPDATE ---
        if str(order_id).startswith('meal-'):
            try:
                with db.get_cursor() as c:
                    fields = []
                    values = []
                    for k in ['scheduled_start', 'estimated_duration', 'truck_id', 'driver_id', 'status', 'description']:
                        if k in order:
                            fields.append(f"{k} = ?")
                            values.append(order[k])
                    
                    if fields:
                        values.append(order_id)
                        c.execute(f"UPDATE meals SET {', '.join(fields)} WHERE id = ?", values)
                    
                    # Ensure we return the full merged object for the frontend
                    return {**order, "id": order_id, "type": "MEAL", "client_name": "COMIDA"}
            except Exception as e:
                print(f"Error updating local meal: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # --- LOCAL MAINTENANCE UPDATE ---
        if str(order_id).startswith('maint-'):
            try:
                with db.get_cursor() as c:
                    fields = []
                    values = []
                    for k in ['scheduled_start', 'estimated_duration', 'truck_id', 'status', 'description']:
                        if k in order:
                            fields.append(f"{k} = ?")
                            values.append(order[k])
                    
                    if fields:
                        values.append(order_id)
                        c.execute(f"UPDATE maintenance_orders SET {', '.join(fields)} WHERE id = ?", values)
                    
                    return {**order, "id": order_id, "type": "MAINTENANCE", "client_name": "MANTENIMIENTO"}
            except Exception as e:
                print(f"Error updating local maintenance: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Resolve Driver Name and Truck Plate for Odoo Notes
        driver_name = "-"
        truck_plate = "-"
        with db.get_cursor() as c:
            # Resolve Driver Name from Odoo (Local table removed)
            if order.get('driver_id'):
                try:
                    if str(order['driver_id']).isdigit():
                        emp_data = odoo_client.execute('hr.employee', 'read', [int(order['driver_id'])], ['name'])
                        if emp_data: driver_name = emp_data[0].get('name', str(order['driver_id']))
                    else:
                        driver_name = str(order['driver_id'])
                except:
                    driver_name = str(order['driver_id'])
            elif order.get('driver_name'):
                driver_name = order['driver_name']
            
            if order.get('truck_id'):
                c.execute("SELECT plate FROM trucks WHERE id = ?", (str(order['truck_id']),))
                t_row = c.fetchone()
                if t_row: truck_plate = t_row['plate']
                else: truck_plate = order['truck_id'] if len(str(order['truck_id'])) < 15 else "-"

        # Data for Odoo
        import re
        def clean_text(t):
            if not t: return "-"
            return t.encode('ascii', 'ignore').decode('ascii').strip()

        raw_desc = order.get('description') or ''
        accessories_list = order.get('accessories')
        if not isinstance(accessories_list, list):
            accessories_list = []
        
        # Split embedded accessories
        if raw_desc and "ACCESORIOS:" in raw_desc:
            parts = raw_desc.split("ACCESORIOS:")
            main_task = parts[0].strip()
            if len(parts) > 1:
                embedded_acc = parts[1].split('\n')[0].strip()
                if embedded_acc and embedded_acc not in accessories_list:
                    accessories_list.append(embedded_acc)
                main_task = "\n".join([line for line in raw_desc.split('\n') if "ACCESORIOS:" not in line]).strip()
            raw_desc = main_task

        # Prepare for distances and times
        km_val = order.get('km') or order.get('distance_km') or order.get('driving_distance_km') or 0
        km_to_origin_val = order.get('km_to_origin') or order.get('prep_distance_km') or 0
        prep_time_val = order.get('prep_duration_minutes') or 0
        driving_time_val = order.get('driving_duration_minutes', 0)

        # Optimization: Recalculate if missing or if explicitly requested (e.g. by sending 0)
        # and we have valid addresses.
        if (not km_val or not km_to_origin_val or not prep_time_val) and order.get('origin_address') and order.get('destination_address'):
            try:
                from config import DEFAULT_BASE_LOCATION
                start_p = DEFAULT_BASE_LOCATION
                
                # Normalize tags like "BASE"
                origin_addr = str(order.get('origin_address', '')).strip()
                dest_addr = str(order.get('destination_address', '')).strip()
                if origin_addr.lower() == 'base': 
                    origin_addr = DEFAULT_BASE_LOCATION
                    order['origin_address'] = DEFAULT_BASE_LOCATION
                if dest_addr.lower() == 'base': 
                    dest_addr = DEFAULT_BASE_LOCATION
                    order['destination_address'] = DEFAULT_BASE_LOCATION

                if order.get('truck_id'):
                    # Search for the predecessor in the plan for TODAY
                    order_date = order.get('scheduled_start', '')[:10]
                    with db.get_cursor() as c:
                        c.execute("""
                            SELECT destination_address 
                            FROM orders 
                            WHERE truck_id = ? 
                            AND status NOT IN ('CANCELLED', 'DRAFT')
                            AND scheduled_start LIKE ?
                            AND id != ?
                            AND scheduled_start < ?
                            ORDER BY scheduled_start DESC 
                            LIMIT 1
                        """, (str(order['truck_id']), f"{order_date}%", str(order_id), order.get('scheduled_start', '')))
                        row = c.fetchone()
                        if row and row['destination_address']:
                            start_p = row['destination_address']
                        else:
                            # If no preceding order, check truck current_location as second fallback
                            c.execute("SELECT current_location FROM trucks WHERE id = ?", (str(order['truck_id']),))
                            t_row = c.fetchone()
                            if t_row and t_row['current_location']:
                                start_p = t_row['current_location']
                
                # Calculate Llegada (Tramo C)
                if not km_to_origin_val or not prep_time_val:
                    p_data = maps_service.get_distance_and_time(start_p, origin_addr)
                    if p_data:
                        if not km_to_origin_val: km_to_origin_val = p_data.get('distance_km', 0)
                        if not prep_time_val: prep_time_val = p_data.get('duration_mins', 0)
                
                # Calculate Viaje (Tramo A)
                if not km_val or not driving_time_val:
                    d_data = maps_service.get_distance_and_time(origin_addr, dest_addr)
                    if d_data:
                        if not km_val: km_val = d_data.get('distance_km', 0)
                        if not driving_time_val: driving_time_val = d_data.get('duration_mins', 0)
            except Exception as e:
                print(f"Update Order Route Recalc Error: {e}")

        # Fix Date Time: If only date is provided (YYYY-MM-DD), append 08:00
        start_date = order.get('scheduled_start', '')
        if start_date and len(start_date) == 10:
             start_date = f"{start_date} 08:00:00"
        
        transport_data = {
            'origin': order.get('origin_address', '-'),
            'dest': order.get('destination_address', '-'),
            'plate': truck_plate,
            'driver': driver_name,
            'load': f"{order.get('load_weight', 0)}",
            'description': clean_text(raw_desc),
            'date': start_date,
            'vehicle_type': order.get('type', 'TRANSPORT'),
            'requires_crane': 'SÍ' if order.get('requires_crane') else 'NO',
            'requires_jib': 'SÍ' if order.get('requires_jib') else 'NO',
            'requires_box_body': 'SÍ' if order.get('requires_box_body') else 'NO',
            'crane_height': str(order.get('load_length', '-')),
            'accessories': ", ".join(accessories_list) if accessories_list else "-",
            'previous_location': order.get('previous_location', '-'), # New field
            'prep_time': order.get('prep_duration_minutes', 0),
            'driving_time': order.get('driving_duration_minutes', 0),
            'work_time': order.get('work_duration_minutes', 60),
            'km': km_val,
            'km_to_origin': km_to_origin_val
        }
        
        # --- ODOO UPDATE (True Source of Truth) ---
        if order_id.isdigit():
            # If status became CANCELLED, sync that to Odoo state
            if order.get('status') == 'CANCELLED':
                try:
                    odoo_client.cancel_sale_order(order_id)
                except Exception as cancel_err:
                    print(f"Warning: Failed to cancel Odoo SO {order_id}: {cancel_err}")
            
            logger.info(f"Syncing order {order_id} to Odoo directly")
            odoo_client.update_sale_order_lines(order_id, transport_data)
        else:
             logger.warning(f"Skipping Odoo update for non-numeric ID: {order_id}")

        # Return the merged order object so the frontend has full data immediately
        return order
    except Exception as e:
        logger.error(f"Order update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/orders/{order_id}")
async def delete_order(order_id: str, background_tasks: BackgroundTasks, current_admin: dict = Depends(get_current_admin)):
    try:
        # --- LOCAL MEAL DELETE ---
        if str(order_id).startswith('meal-'):
            try:
                with db.get_cursor() as c:
                    c.execute("DELETE FROM meals WHERE id = ?", (order_id,))
                    return {"status": "success", "id": order_id, "message": "Meal deleted locally"}
            except Exception as e:
                print(f"Error deleting local meal: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # --- LOCAL MAINTENANCE DELETE ---
        if str(order_id).startswith('maint-'):
            try:
                with db.get_cursor() as c:
                    c.execute("DELETE FROM maintenance_orders WHERE id = ?", (order_id,))
                    logger.info(f"Deleted maintenance order {order_id}")
                    return {"status": "success", "id": order_id, "message": "Maintenance deleted locally"}
            except Exception as e:
                logger.error(f"Error deleting maintenance: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Check if user has permission
        # --- LOCAL ORDER DELETE ---
        try:
            with db.get_cursor() as c:
                c.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        except Exception as e:
            logger.error(f"Failed to delete local planning record: {e}")

        # Cancel in Odoo if numeric
        if order_id.isdigit():
            odoo_client.cancel_sale_order(order_id)
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/driver/orders/{driver_id}")
async def get_driver_orders(driver_id: str, date: str = None):
    """Get assigned orders for a driver for a specific date (defaults to today)"""
    try:
        query_date = date if date else datetime.now().strftime("%Y-%m-%d")
        rows = []
        with db.get_cursor() as c:
            c.execute("""
                SELECT o.*, t.plate as truck_plate, t.alias as truck_alias 
                FROM orders o
                LEFT JOIN trucks t ON o.truck_id = t.id
                WHERE o.driver_id = ? 
                AND o.scheduled_start LIKE ?
                AND (o.client_name NOT LIKE '%COMIDA%' AND o.description NOT LIKE '%Comida%' AND o.description NOT LIKE '%Descanso%')
            """, (driver_id, f"{query_date}%"))
            rows = c.fetchall()
        res = []
        for r in rows:
            d = dict(r)
            if d.get('items'):
                try: d['items'] = json.loads(d['items'])
                except: d['items'] = []
            res.append(d)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/orders/{order_id}/status")
async def update_order_status(request: Request, order_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    try:
        new_status = data.get('status')
        if not new_status:
            raise HTTPException(status_code=400, detail="Missing status")
            
        with db.get_cursor() as c:
            # If COMPLETED, we might want to capture incidents and photo
            incidents = data.get('incidents')
            note_url = data.get('delivery_note_url')
            
            update_fields = ["status = ?"]
            values = [new_status]
            
            if incidents is not None:
                update_fields.append("incidents = ?")
                values.append(incidents)
            if note_url is not None:
                update_fields.append("delivery_note_url = ?")
                values.append(note_url)
                
            values.append(order_id)
            query = f"UPDATE orders SET {', '.join(update_fields)} WHERE id = ?"
            c.execute(query, tuple(values))
            
            # --- SIDE EFFECTS ---
            if new_status == 'IN_PROGRESS':
                # Log actual start if not already there?
                pass 
            elif new_status == 'COMPLETED':
                # Logic to release truck or other cleanup if needed
                pass
        
        log_audit(current_user['username'], 'UPDATE_ORDER_STATUS', 'orders', order_id, f"Changed to {new_status}", request.client.host)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/driver/leave")
async def create_driver_leave(leave: DriverLeave, current_user: dict = Depends(get_current_user)):
    try:
        with db.get_cursor() as c:
            c.execute("""
                INSERT INTO driver_leaves (driver_id, type, start_date, end_date, reason)
                VALUES (?, ?, ?, ?, ?)
            """, (leave.driver_id, leave.type, leave.start_date, leave.end_date, leave.reason))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/driver/leaves")
async def get_driver_leaves(driver_id: int, current_user: dict = Depends(get_current_user)):
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM driver_leaves WHERE driver_id = ? ORDER BY created_at DESC", (driver_id,))
            rows = c.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- SERVING FRONTEND ---
from fastapi.responses import FileResponse


# --- FRONTEND SERVING MOVED TO END ---


# --- DELIVERY NOTES ENDPOINTS ---

from services.delivery_note_service import delivery_note_service

class DeliveryNoteCreate(BaseModel):
    albaran_number: str
    order_id: Optional[str]
    date: str
    driver_name: Optional[str]
    vehicle_plate: Optional[str]
    client_name: Optional[str]
    client_code: Optional[str]
    client_address: Optional[str]
    shipper_name: Optional[str]
    shipper_address: Optional[str]
    loading_date: Optional[str]
    consignee_name: Optional[str]
    consignee_address: Optional[str]
    unloading_date: Optional[str]
    service_concept: Optional[str]
    merchandise: Optional[str]
    weight_kg: Optional[float]
    length_m: Optional[float]
    vehicle_type: Optional[str]
    complements: Optional[list]
    crane_height: Optional[str]
    load_capacity: Optional[str]
    start_time: Optional[str]
    arrival_time: Optional[str]
    departure_time: Optional[str]
    end_time: Optional[str]
    total_hours: Optional[float]
    observations: Optional[str]
    billing_items: Optional[list]
    status: Optional[str]

@app.get("/api/v1/delivery-notes")
async def get_delivery_notes():
    return delivery_note_service.get_all_notes()

@app.post("/api/v1/delivery-notes")
async def create_delivery_note(note: DeliveryNoteCreate):
    try:
        return delivery_note_service.create_note(note.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/delivery-notes/{note_id}")
async def get_delivery_note(note_id: str):
    note = delivery_note_service.get_note_by_id(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Delivery Note not found")
    return note

@app.put("/api/v1/delivery-notes/{note_id}")
async def update_delivery_note(note_id: str, note: dict):
    try:
        updated = delivery_note_service.update_note(note_id, note)
        if not updated:
            raise HTTPException(status_code=404, detail="Delivery Note not found or update failed")
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- EXCEL IMPORT ENDPOINTS ---

@app.post("/api/v1/import/customers")
async def import_customers(file: UploadFile = File(...), current_user: dict = Depends(get_current_admin)):
    try:
        contents = await file.read()
        customers = parse_customers_excel(contents)
        
        with db.get_cursor() as c:
            count = 0
            updated = 0
            for cust in customers:
                # Check if exists by display_id or email
                exists = False
                if cust.get('display_id'):
                    c.execute("SELECT 1 FROM customers WHERE display_id = ?", (cust['display_id'],))
                    if c.fetchone(): exists = True
                
                if not exists and cust.get('email'):
                     c.execute("SELECT 1 FROM customers WHERE email = ?", (cust['email'],))
                     if c.fetchone(): exists = True

                if exists:
                    if cust.get('display_id'):
                         c.execute("""
                            UPDATE customers SET name=?, phone=?, email=?, billing_address=?, locations=?
                            WHERE display_id=?
                         """, (cust['name'], cust['phone'], cust['email'], cust['billing_address'], cust['locations'], cust['display_id']))
                         updated += 1
                else:
                    c.execute("""
                        INSERT INTO customers (id, display_id, name, phone, email, billing_address, locations, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        cust['id'], cust['display_id'], cust['name'], cust['phone'], cust['email'], 
                        cust['billing_address'], cust['locations'], cust['notes']
                    ))
                    count += 1
            
        print(f"Import finished. Inserted: {count}, Updated: {updated}")
        return {"message": f"Importación completada. Insertados: {count}, Actualizados: {updated}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error en importación: {str(e)}")

# NEW: Bulk JSON import (bypasses FormData/Excel issues)
@app.post("/api/v1/customers/bulk")
async def bulk_import_customers(data: dict):
    """
    Import customers from JSON (bypasses Excel processing issues)
    Expected format: {"customers": [{customer_data}, ...]}
    """
    try:
        customers_data = data.get("customers", [])
        if not customers_data:
            raise HTTPException(status_code=400, detail="No customers data provided")
        
        with db.get_cursor() as c:
            count = 0
            updated = 0
            
            for cust in customers_data:
                # Generate ID if not present
                if 'id' not in cust:
                    import uuid
                    cust['id'] = str(uuid.uuid4())
                
                # Check if exists
                exists = False
                if cust.get('display_id'):
                    c.execute("SELECT 1 FROM customers WHERE display_id = ?", (cust['display_id'],))
                    if c.fetchone(): 
                        exists = True
                
                if not exists and cust.get('email'):
                    c.execute("SELECT 1 FROM customers WHERE email = ?", (cust['email'],))
                    if c.fetchone(): 
                        exists = True
                
                # Update or Insert
                if exists:
                    if cust.get('display_id'):
                        c.execute("""
                            UPDATE customers SET name=?, phone=?, email=?, billing_address=?, locations=?
                            WHERE display_id=?
                        """, (
                            cust.get('name'), cust.get('phone'), cust.get('email'),
                            cust.get('billing_address'), cust.get('locations'),
                            cust['display_id']
                        ))
                        updated += 1
                else:
                    c.execute("""
                        INSERT INTO customers (id, display_id, name, phone, email, billing_address, locations, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        cust['id'], cust.get('display_id'), cust.get('name'),
                        cust.get('phone'), cust.get('email'), cust.get('billing_address'),
                        cust.get('locations'), cust.get('notes', '')
                    ))
                    count += 1
        
        return {"message": f"Importación completada. Insertados: {count}, Actualizados: {updated}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")

@app.get("/api/v1/version")
def get_version():
    """Verify which version is running in Cloud Run"""
    return {"version": "v1.5.0-EXCEL_FIXED", "routes": ["POST /api/v1/import/customers"]}

@app.get("/api/v1/debug/routes")
def list_all_routes():
    """List all registered routes to diagnose deployment issues"""
    return {
        "routes": [
            {"path": route.path, "name": route.name, "methods": list(route.methods) if hasattr(route, 'methods') else []}
            for route in app.routes
        ]
    }



# --- SERVE FRONTEND (SPA Catch-all) ---
FRONTEND_PATH = os.path.join(os.path.dirname(__file__), "static/frontend")

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # 1. Protect API and Uploads
    if full_path.startswith("api/") or full_path.startswith("uploads/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    # 2. Try to serve physical file (JS, CSS, Images)
    file_path = os.path.join(FRONTEND_PATH, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # 3. Handle root path or React Router paths
    index_file = os.path.join(FRONTEND_PATH, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    # 4. Fallback if frontend is not built
    return {"message": "Zerain Tower API is running. Welcome!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=7500, reload=True)
