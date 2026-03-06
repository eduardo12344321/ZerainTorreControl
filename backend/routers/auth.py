from fastapi import APIRouter, HTTPException, Depends, status, Request
from datetime import timedelta
from typing import Optional
from database import db
from config import ACCESS_TOKEN_EXPIRE_MINUTES, GOOGLE_CLIENT_ID
from services.odoo_service import odoo_client
from utils.google_auth import verify_google_token
from dependencies import (
    Token, DriverLogin, AdminLogin, GoogleLogin, DoubleLogin,
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_admin, limiter
)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@router.post("/driver/login", response_model=Token)
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
                # Fallback to default if not yet set
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
        
        # access log_audit if needed or just use logger
        from utils.logging import log_audit
        log_audit(user['dni'], 'DRIVER_LOGIN', 'drivers', str(user['id']), "Driver logged in (Sync from Odoo)", request.client.host if request.client else "Unknown")
        
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

@router.get("/drivers-list")
async def get_drivers_list_public():
    """
    Public endpoint for login screen to show driver grid.
    Returns minimal info: name, id, dni.
    """
    try:
        if not odoo_client.uid: odoo_client.connect()
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
        
        drivers_simple.sort(key=lambda x: x['name'])
        return drivers_simple
    except Exception as e:
        print(f"Error fetching public drivers list: {e}")
        return []

@router.get("/driver/profile")
async def get_driver_profile(current_user: dict = Depends(get_current_user)):
    """ Returns the profile of the currently logged-in driver """
    return current_user

@router.post("/admin/login", response_model=Token)
@limiter.limit("5/minute")
async def login_admin(request: Request, data: AdminLogin):
    try:
        user = None
        with db.get_cursor() as c:
            query = "SELECT * FROM admins WHERE LOWER(username) = LOWER(%s)" if db.is_postgres else "SELECT * FROM admins WHERE LOWER(username) = LOWER(?)"
            c.execute(query, (data.username,))
            row = c.fetchone()
            if row:
                user = dict(row)

        if not user or not verify_password(data.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        from main import log_audit
        log_audit(user['username'], 'ADMIN_LOGIN', 'admins', str(user['id']), "Administrator logged in", request.client.host if request.client else "Unknown")
        access_token = create_access_token(
            data={"sub": user['username'], "role": user['role'], "id": user['id']},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer", "user_data": user}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/google", response_model=Token)
async def login_google(request: Request, data: GoogleLogin):
    try:
        try:
            google_user = verify_google_token(data.token, client_id=GOOGLE_CLIENT_ID)
        except ValueError as e:
            raise HTTPException(status_code=401, detail=f"Token de Google inválido: {str(e)}")
            
        email = google_user.get('email')
        if not email:
             raise HTTPException(status_code=400, detail="El token no contiene email")
             
        user = None
        with db.get_cursor() as c:
            query = "SELECT * FROM admins WHERE LOWER(username) = LOWER(%s)" if db.is_postgres else "SELECT * FROM admins WHERE LOWER(username) = LOWER(?)"
            c.execute(query, (email,))
            row = c.fetchone()
            if row:
                 user = dict(row)
        
        if not user:
             raise HTTPException(status_code=401, detail=f"El email {email} no tiene acceso autorizado. Contacta con soporte.")

        access_token = create_access_token(
            data={"sub": user['username'], "role": user['role'], "id": user['id']},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer", "user_data": user}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/double-login", response_model=Token)
async def login_admin_double(request: Request, data: DoubleLogin):
    try:
        google_user = verify_google_token(data.google_token, client_id=GOOGLE_CLIENT_ID)
        email = google_user.get('email')
        
        if not email:
            raise HTTPException(status_code=401, detail="Token de Google inválido")

        user = None
        with db.get_cursor() as c:
            query = "SELECT * FROM admins WHERE LOWER(username) = LOWER(%s)" if db.is_postgres else "SELECT * FROM admins WHERE LOWER(username) = LOWER(?)"
            c.execute(query, (email,))
            row = c.fetchone()
            if row:
                user = dict(row)
        
        if not user:
            raise HTTPException(status_code=401, detail=f"El email {email} no está autorizado.")

        if not verify_password(data.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Contraseña de administrador incorrecta")

        from main import log_audit
        log_audit(user['username'], 'DOUBLE_AUTH_LOGIN', 'admins', str(user['id']), "Double authentication successful", request.client.host if request.client else "Unknown")
        access_token = create_access_token(
            data={"sub": user['username'], "role": user['role'], "id": user['id']},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer", "user_data": user}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/drivers/set-password")
async def set_driver_password(data: dict, current_admin: dict = Depends(get_current_admin)):
    dni = data.get('dni')
    new_password = data.get('password')
    if not dni or not new_password:
        raise HTTPException(status_code=400, detail="Faltan datos (dni, password)")
    
    pwd_hash = get_password_hash(new_password)
    try:
        with db.get_cursor() as c:
            query = """
                INSERT INTO driver_credentials (dni, password_hash) VALUES (%s, %s)
                ON CONFLICT(dni) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = CURRENT_TIMESTAMP
            """ if db.is_postgres else """
                INSERT INTO driver_credentials (dni, password_hash) VALUES (?, ?)
                ON CONFLICT(dni) DO UPDATE SET password_hash = excluded.password_hash, updated_at = CURRENT_TIMESTAMP
            """
            c.execute(query, (dni.upper(), pwd_hash))
        
        from main import log_audit
        log_audit(current_admin['username'], 'SET_DRIVER_PWD', 'driver_credentials', dni, "Updated driver password", "Local")
        return {"status": "success", "message": f"Contraseña actualizada para {dni}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
