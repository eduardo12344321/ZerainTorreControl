from fastapi import APIRouter, HTTPException, Depends
from database import db
from dependencies import get_current_admin


router = APIRouter(prefix="/api/v1/audit", tags=["Audit"])


@router.get("/suspicious")
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


@router.get("/history/{table_name}/{record_id}")
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
