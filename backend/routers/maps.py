from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
from database import db
from dependencies import get_current_admin

try:
    from services.maps_service import maps_service, geocode_address
except Exception as e:
    print(f"⚠️ Warning: Maps Service unavailable: {e}")
    class DummyMapsService:
        def get_distance_and_time(self, *args, **kwargs): return {}
    maps_service = DummyMapsService()
    def geocode_address(address): return None

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            return lambda x: x
    limiter = DummyLimiter()


router = APIRouter(prefix="/api/v1/maps", tags=["Maps"])


@router.get("/calculate-route")
async def calculate_route(origin: str, destination: str):
    """
    Calculates distance and time between origin and destination.
    """
    try:
        data = maps_service.get_distance_and_time(origin, destination)
        if not data or "error" in data:
            detail = data.get("error", "No se pudo calcular la ruta.") if data else "No se pudo calcular la ruta."
            raise HTTPException(status_code=400, detail=detail)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calculate-order-times")
async def calculate_order_times(origin: str, destination: str, truck_id: Optional[str] = None, date: Optional[str] = None, start_location: Optional[str] = None):
    """
    Calculates:
    1. Prep Time (Tramo C): Base/Truck/PreviousDest -> Origin
    2. Driving Time (Tramo A): Origin -> Destination
    """
    try:
        from config import DEFAULT_BASE_LOCATION
        
        # 1. Determine Starting point for Prep
        start_point = start_location or DEFAULT_BASE_LOCATION
        
        if not start_location and truck_id:
            if date:
                try:
                    with db.get_cursor() as c:
                        query = """
                            SELECT destination_address 
                            FROM orders 
                            WHERE truck_id = ? 
                            AND status NOT IN ('CANCELLED', 'DRAFT')
                            AND scheduled_start LIKE ?
                            ORDER BY scheduled_start DESC 
                            LIMIT 1
                        """
                        c.execute(query, (truck_id, f"{date}%"))
                        row = c.fetchone()
                        if row and row['destination_address']:
                            start_point = row['destination_address']
                        else:
                            c.execute("SELECT current_location FROM trucks WHERE id = ?", (truck_id,))
                            t_row = c.fetchone()
                            if t_row and t_row['current_location']:
                                start_point = t_row['current_location']
                except Exception as ex:
                    print(f"Error fetching last order: {ex}")
                    with db.get_cursor() as c:
                        c.execute("SELECT current_location FROM trucks WHERE id = ?", (truck_id,))
                        row = c.fetchone()
                        if row and row['current_location']:
                            start_point = row['current_location']
            else:
                with db.get_cursor() as c:
                    c.execute("SELECT current_location FROM trucks WHERE id = ?", (truck_id,))
                    row = c.fetchone()
                    if row and row['current_location']:
                        start_point = row['current_location']
        
        # 2. Calculate Prep Time (Start -> Origin)
        prep_data = maps_service.get_distance_and_time(start_point, origin)
        prep_mins = prep_data.get("duration_mins", 0) if prep_data else 15
        
        # 3. Calculate Driving Time (Origin -> Destination)
        driving_data = maps_service.get_distance_and_time(origin, destination)
        driving_mins = driving_data.get("duration_mins", 0) if driving_data else 30
        distance_km = driving_data.get("distance_km", 0) if driving_data else 0
        km_to_origin = prep_data.get("distance_km", 0) if prep_data else 0
        
        return {
            "prep_mins": prep_mins,
            "driving_mins": driving_mins,
            "distance_km": distance_km,
            "km_to_origin": km_to_origin,
            "start_point_used": start_point
        }
    except Exception as e:
        print(f"ROUTE CALC ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/log-usage")
@limiter.limit("10/minute")
async def log_maps_usage(request: Request, service_type: str):
    """
    Used by frontend to log autocomplete sessions.
    service_type: should be 'MAPS_SUGGEST'
    """
    try:
        with db.get_cursor() as c:
            c.execute("INSERT INTO gcp_usage (service, request_type, cost_est) VALUES (?, ?, ?)", 
                     (service_type, 'Autocomplete Session', 0.017))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.get("/geocode")
async def geocode_address_endpoint(address: str):
    """
    Geocodes a single string address.
    """
    try:
        canonical = geocode_address(address)
        if canonical:
            return {"formatted_address": canonical}
        else:
            raise HTTPException(status_code=404, detail="No se pudo validar la dirección")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
