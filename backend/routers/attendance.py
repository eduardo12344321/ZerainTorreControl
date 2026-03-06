import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from database import db
from dependencies import get_current_admin, get_current_user, AttendanceOverride, ExpenseSubmission
from services.odoo_service import odoo_client

router = APIRouter(prefix="/api/v1", tags=["Attendance & Expenses"])

from utils.stats import calculate_zerain_stats

@router.get("/attendance")
async def get_all_attendance(current_admin: dict = Depends(get_current_admin)):
    """Get all attendance records for Torre de Control"""
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM attendance_log ORDER BY timestamp DESC")
            return [{"id": r['id'], "driver_id": r['driver_id'], "type": r['type'], "timestamp": r['timestamp'], "approved": bool(r['approved'])} for r in c.fetchall()]
    except Exception:
        return []

@router.get("/attendance/{driver_id}")
async def get_driver_attendance(driver_id: str):
    """Get attendance records for a specific driver"""
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM attendance_log WHERE driver_id = ? ORDER BY timestamp DESC", (str(driver_id),))
            return [{"id": r['id'], "driver_id": r['driver_id'], "type": r['type'], "timestamp": r['timestamp'], "approved": bool(r['approved'])} for r in c.fetchall()]
    except Exception:
        return []

@router.post("/attendance/override")
async def save_attendance_override(data: AttendanceOverride, request: Request, current_admin: dict = Depends(get_current_admin)):
    if current_admin['role'] == 'INSPECTOR': raise HTTPException(status_code=403, detail="Inspectors have READ-ONLY access.")
    try:
        status_val = {'APPROVED': 1, 'REJECTED': -1, 'PENDING': 0, 'MODIFIED': 2}.get(data.status, 2)
        with db.get_cursor() as c:
            c.execute("SELECT * FROM attendance_overrides WHERE driver_id = ? AND date = ?", (data.driver_id, data.date))
            existing = c.fetchone()
            if existing:
                details_json = json.dumps({"change_reason": data.admin_comment or "Manual Override", "old_data": dict(existing), "new_data": data.dict()})
                c.execute("INSERT INTO audit_logs (admin_username, action, table_name, record_id, details, ip_address) VALUES (?, 'UPDATE_OVERRIDE', 'attendance_overrides', ?, ?, ?)", (current_admin['username'], f"{data.driver_id}|{data.date}", details_json, request.client.host))
            c.execute("INSERT OR REPLACE INTO attendance_overrides (driver_id, date, regular_hours, overtime_hours, diet_count, status, admin_comment, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", (data.driver_id, data.date, data.regular_hours, data.overtime_hours, data.diet_count, status_val, data.admin_comment))
        return {"status": "success", "message": "Override saved with audit trail"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving override: {str(e)}")

@router.get("/expenses")
async def get_all_expenses():
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM expenses ORDER BY timestamp DESC")
            return [{"id": r['id'], "driver_id": r['driver_id'], "date": r['date'], "amount": r['amount'], "type": r['type'], "description": r.get('description'), "approved": bool(r['approved']), "timestamp": r['timestamp'], "ticket_url": r.get('ticket_url')} for r in c.fetchall()]
    except Exception:
        return []

@router.post("/expenses")
async def submit_expense(expense: ExpenseSubmission, current_user: dict = Depends(get_current_user)):
    try:
        expense_id = None
        with db.get_cursor() as c:
            c.execute("PRAGMA table_info(expenses)")
            cols = [col[1] for col in c.fetchall()]
            if 'ticket_url' in cols and 'description' in cols:
                c.execute("INSERT INTO expenses (driver_id, date, amount, type, description, ticket_url, approved) VALUES (?, ?, ?, ?, ?, ?, 0)", (expense.driver_id, expense.date, expense.amount, expense.type, expense.description, expense.ticket_url))
            elif 'description' in cols:
                c.execute("INSERT INTO expenses (driver_id, date, amount, type, description, approved) VALUES (?, ?, ?, ?, ?, 0)", (expense.driver_id, expense.date, expense.amount, expense.type, expense.description))
            else:
                c.execute("INSERT INTO expenses (driver_id, date, amount, type, approved) VALUES (?, ?, ?, ?, 0)", (expense.driver_id, expense.date, expense.amount, expense.type))
            expense_id = c.lastrowid
        try:
            odoo_id = odoo_client.log_expense(employee_id=expense.driver_id, amount=expense.amount, date_str=expense.date, category=expense.type, description=expense.description, photo_base64=expense.ticket_url)
        except Exception as odoo_err:
            print(f"Warning: Odoo Sync Failed: {odoo_err}")
        return {"status": "success", "expense_id": expense_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting expense: {str(e)}")

@router.post("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: int, current_admin: dict = Depends(get_current_admin)):
    try:
        with db.get_cursor() as c: c.execute("UPDATE expenses SET approved = 1 WHERE id = ?", (expense_id,))
        return {"status": "approved", "expense_id": expense_id}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.post("/expenses/{expense_id}/reject")
async def reject_expense(expense_id: int, current_admin: dict = Depends(get_current_admin)):
    try:
        with db.get_cursor() as c: c.execute("UPDATE expenses SET approved = -1 WHERE id = ?", (expense_id,))
        return {"status": "rejected", "expense_id": expense_id}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/leaves")
async def get_all_leaves():
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM leaves ORDER BY timestamp DESC")
            return [{"id": r['id'], "driver_id": r['driver_id'], "type": r['type'], "start_date": r['start_date'], "end_date": r['end_date'], "approved": bool(r['approved']), "timestamp": r['timestamp']} for r in c.fetchall()]
    except Exception:
        return []

@router.post("/leaves/{record_id}/approve")
async def approve_leave(record_id: int, current_admin: dict = Depends(get_current_admin)):
    try:
        with db.get_cursor() as c: c.execute("UPDATE leaves SET approved = 1 WHERE id = ?", (record_id,))
        return {"status": "approved", "record_id": record_id}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
