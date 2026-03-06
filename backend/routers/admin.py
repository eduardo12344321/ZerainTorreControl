from fastapi import APIRouter, HTTPException, Depends
from database import db
from dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])

@router.get("/gcp-usage")
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

@router.get("/route-cache")
async def get_route_cache(current_admin: dict = Depends(get_current_admin)):
    """ Returns all cached routes """
    try:
        with db.get_cursor() as c:
            c.execute("SELECT * FROM route_cache ORDER BY last_updated DESC")
            routes = [dict(row) for row in c.fetchall()]
            return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_system_config(current_admin: dict = Depends(get_current_admin)):
    """ Returns system configuration """
    try:
        with db.get_cursor() as c:
            c.execute("SELECT key, value FROM system_config")
            rows = c.fetchall()
            return {row['key']: row['value'] for row in rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config")
async def update_system_config(data: dict, current_admin: dict = Depends(get_current_admin)):
    """ Updates system configuration """
    try:
        with db.get_cursor() as c:
            for key, value in data.items():
                c.execute("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (key, str(value)))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

