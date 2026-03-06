import json
from fastapi import APIRouter, HTTPException, Depends, Request
from database import db
from dependencies import get_current_admin
from services.odoo_service import odoo_client

router = APIRouter(prefix="/api/v1", tags=["Resources"])

def log_audit(admin_username, action, resource_type, resource_id=None, details=None, ip_address=None):
    pass # Implementation assumed elsewhere, keeping simple stub here or import from utils

@router.get("/trucks")
async def get_all_trucks():
    try:
        if not odoo_client.uid and not odoo_client.connect():
             print("Warning: Could not connect to Odoo for Trucks")
        
        # 1. Fetch real-time data from Odoo
        odoo_trucks = odoo_client.get_vehicles()
        
        # 2. Fetch local metadata (sorting, etc.)
        local_metadata = {}
        try:
            with db.get_cursor() as c:
                c.execute("SELECT id, display_order FROM trucks")
                rows = c.fetchall()
                local_metadata = {row['id']: dict(row) for row in rows}
        except: pass

        # 3. Merge
        merged_trucks = []
        for ot in odoo_trucks:
            oid = ot.get('id')
            meta = local_metadata.get(oid, {})
            # Use Odoo display_order if available, fallback to local SQL
            ot['display_order'] = ot.get('display_order', 0) or meta.get('display_order', 0)
            merged_trucks.append(ot)

        # 4. Sort
        merged_trucks.sort(key=lambda x: (x.get('display_order', 0), x.get('plate') or ""))
        return merged_trucks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trucks")
async def create_truck(request: Request, truck: dict, current_admin: dict = Depends(get_current_admin)):
    return {"status": "success", "message": "Creation logic should be handled in Odoo"}

@router.put("/trucks/{truck_id}")
async def update_truck(request: Request, truck_id: str, truck: dict, current_admin: dict = Depends(get_current_admin)):
    try:
        try:
            with db.get_cursor() as c:
                c.execute("""
                    INSERT OR REPLACE INTO trucks 
                    (id, plate, alias, category, status, axles, max_weight, color, 
                     has_crane, has_jib, is_box_body, max_length, display_order, 
                     itv_expiration, next_maintenance,
                     last_oil_change, last_oil_change_km, last_tire_change, last_tire_change_km)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    truck_id, truck.get('plate'), truck.get('alias'), truck.get('category'), 
                    truck.get('status', 'AVAILABLE'), truck.get('axles'), truck.get('max_weight'), 
                    truck.get('color'), truck.get('has_crane'), truck.get('has_jib'), 
                    truck.get('is_box_body'), truck.get('max_length'), truck.get('display_order', 0), 
                    truck.get('itv_expiration'), truck.get('next_maintenance'),
                    truck.get('last_oil_change'), truck.get('last_oil_change_km', 0),
                    truck.get('last_tire_change'), truck.get('last_tire_change_km', 0)
                ))
        except Exception as sqlite_err: print(f"Error updating local truck: {sqlite_err}")

        if truck_id.isdigit(): 
            try: odoo_client.update_vehicle(truck_id, truck)
            except Exception as odoo_err: print(f"Error syncing to Odoo: {odoo_err}")
                
        return {"status": "success"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.delete("/trucks/{truck_id}")
async def delete_truck(request: Request, truck_id: str, current_admin: dict = Depends(get_current_admin)):
    return {"status": "success", "message": "Deletion should be handled in Odoo"}

@router.get("/customers")
async def get_all_customers():
    try:
        # 1. Try Odoo first
        odoo_customers = []
        try:
            if not odoo_client.uid and not odoo_client.connect():
                 print("Warning: Could not connect to Odoo for Customers")
            odoo_customers = odoo_client.get_customers()
        except: pass

        # 2. Fetch local metadata (locations, manual notes, etc.)
        local_metadata = {}
        try:
            with db.get_cursor() as c:
                c.execute("SELECT * FROM customers")
                rows = c.fetchall()
                local_metadata = {row['id']: dict(row) for row in rows}
        except: pass

        # 3. Merge
        res = []
        # Priority to Odoo results if available
        ids_from_odoo = set()
        for oc in odoo_customers:
            oid = oc.get('id')
            meta = local_metadata.get(oid, {})
            ids_from_odoo.add(oid)
            
            # Combine
            oc['locations'] = json.loads(meta['locations']) if meta.get('locations') else []
            oc['display_id'] = meta.get('display_id') or oid[-4:] # Fallback
            res.append(oc)
        
        # Add local ones that are not in Odoo response (e.g. historical or manual)
        for lid, l_data in local_metadata.items():
            if lid not in ids_from_odoo:
                d = dict(l_data)
                d['locations'] = json.loads(d['locations']) if d.get('locations') else []
                res.append(d)

        return res
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
