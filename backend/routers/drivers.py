from fastapi import APIRouter, HTTPException, Depends, Request
from database import db
from dependencies import get_current_admin
from services.odoo_service import odoo_client
from utils.stats import calculate_zerain_stats
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/api/v1/drivers", tags=["Drivers"])

@router.get("")
async def get_all_drivers(current_admin: dict = Depends(get_current_admin)):
    """
    Fetch all active employees from Odoo and return as Drivers for the Control Tower, 
    complete with attendance statistics and daily records.
    """
    try:
        # 1. Fetch active employees from Odoo
        if not odoo_client.uid and not odoo_client.connect():
             print("Warning: Could not connect to Odoo for Drivers")
        
        odoo_emps = odoo_client.get_employees()
        
        # 2. Fetch local attendance data for records and stats
        # We'll fetch the last 30 days of records for each driver
        limit_date = (datetime.now() - timedelta(days=31)).strftime("%Y-%m-%d")
        
        attendance_by_driver = {}
        overrides_by_driver = {}
        
        try:
            with db.get_cursor() as c:
                # Get attendance logs
                c.execute("SELECT * FROM attendance_log WHERE timestamp >= ?", (limit_date,))
                logs = c.fetchall()
                for log in logs:
                    d_id = str(log['driver_id'])
                    if d_id not in attendance_by_driver: attendance_by_driver[d_id] = []
                    attendance_by_driver[d_id].append(dict(log))
                
                # Get overrides
                c.execute("SELECT * FROM attendance_overrides WHERE date >= ?", (limit_date,))
                overrides = c.fetchall()
                for ov in overrides:
                    d_id = str(ov['driver_id'])
                    if d_id not in overrides_by_driver: overrides_by_driver[d_id] = {}
                    overrides_by_driver[d_id][ov['date']] = dict(ov)
        except Exception as db_err:
            print(f"Database Error fetching driver stats: {db_err}")

        # 3. Map to frontend Driver format
        drivers = []
        for emp in odoo_emps:
            e_id = str(emp.get('id'))
            
            # Process daily records for the last 30 days
            daily_records = []
            total_extra = 0
            total_diets = 0
            
            # Group logs by date for this driver
            driver_logs = attendance_by_driver.get(e_id, [])
            logs_by_date = {}
            for l in driver_logs:
                d = l['timestamp'].split(' ')[0]
                if d not in logs_by_date: logs_by_date[d] = []
                logs_by_date[d].append(l)
            
            # Get overrides for this driver
            driver_ovs = overrides_by_driver.get(e_id, {})
            
            # Calculate stats for the last 30 days
            for i in range(32):
                date_dt = datetime.now() - timedelta(days=i)
                date_str = date_dt.strftime("%Y-%m-%d")
                
                day_logs = logs_by_date.get(date_str, [])
                ov = driver_ovs.get(date_str)
                
                if not day_logs and not ov: continue
                
                # Prepare record structure for calculate_zerain_stats
                rec = {'date': date_str}
                for l in day_logs:
                    if l['type'] == 'IN': rec['in'] = l['timestamp']
                    elif l['type'] == 'OUT': rec['out'] = l['timestamp']
                    elif l['type'] == 'MEAL_IN': rec['meal_in'] = l['timestamp']
                    elif l['type'] == 'MEAL_OUT': rec['meal_out'] = l['timestamp']
                
                # If override exists, it usually takes precedence for hours but logs are still kept for history
                reg, extra, meal, diets, modified = calculate_zerain_stats(rec)
                
                if ov:
                    # Override values
                    reg = ov.get('regular_hours', reg)
                    extra = ov.get('overtime_hours', extra)
                    diets = ov.get('diet_count', diets)
                    modified = True
                
                daily_records.append({
                    "date": date_str,
                    "check_in": rec.get('in'),
                    "check_out": rec.get('out'),
                    "meal_in": rec.get('meal_in'),
                    "meal_out": rec.get('meal_out'),
                    "regular_hours": reg,
                    "overtime_hours": extra,
                    "diet_count": diets,
                    "status": "APPROVED" if not modified else "MODIFIED" # Simple logic
                })
                
                # Only sum up for current month for the header stats if needed, 
                # but frontend usually expects total in stats object
                if date_dt.month == datetime.now().month:
                    total_extra += extra
                    total_diets += diets

            drivers.append({
                "id": e_id,
                "name": emp.get('name'),
                "dni": emp.get('identification_id'),
                "phone": emp.get('mobile_phone') or emp.get('work_phone'),
                "email": emp.get('work_email'),
                "status": "WORKING" if emp.get('active') else "RESTING", 
                "daily_records": daily_records,
                "stats": {
                    "extra_hours_month": round(total_extra, 2),
                    "diets_month": int(total_diets)
                }
            })
        
        # Sort by name
        drivers.sort(key=lambda x: x['name'])
        return drivers
    except Exception as e:
        print(f"Error fetching drivers: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{driver_id}/attendance")
async def get_driver_attendance_by_id(driver_id: str, current_admin: dict = Depends(get_current_admin)):
    """Fetch attendance records for a specific driver (Compatible with Frontend)"""
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM attendance_log WHERE driver_id = ? ORDER BY timestamp DESC LIMIT 100", (driver_id,))
            rows = c.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{driver_id}/overtime/validate")
async def validate_overtime_driver(driver_id: str, data: dict, current_admin: dict = Depends(get_current_admin)):
    """Update all attendance records for a driver on a specific day"""
    try:
        date_str = data.get('date')
        status_label = data.get('status') # APPROVED, REJECTED, PENDING
        
        status_map = {'APPROVED': 1, 'REJECTED': -1, 'PENDING': 0, 'MODIFIED': 2}
        status_val = status_map.get(status_label, 0)
        
        with db.get_cursor() as c:
            c.execute("""
                UPDATE attendance_log 
                SET approved = ? 
                WHERE driver_id = ? AND date(timestamp) = ?
            """, (status_val, driver_id, date_str))
        
        return {"status": "success", "driver_id": driver_id, "date": date_str, "validation": status_label}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_driver(request: Request, driver: dict, current_admin: dict = Depends(get_current_admin)):
    return {"status": "success", "message": "Creation in Odoo not implemented via API"}

@router.delete("/{driver_id}")
async def delete_driver(request: Request, driver_id: str, current_admin: dict = Depends(get_current_admin)):
    return {"status": "success", "message": "Deletion should be handled in Odoo"}
