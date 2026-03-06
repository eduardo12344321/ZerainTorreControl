import os
import sys
from datetime import datetime, timedelta

# Mocking the backend environment
sys.path.append('c:/Users/Saruman/Desktop/Antigravity_proyects/TorreControlZerain/backend')
from services.odoo_service import OdooService
from database import db
from config import ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD

client = OdooService(ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD)

def mock_get_all_orders():
    # 1. Fetch auxiliary data
    trucks_map = {}
    odoo_vehicles = client.get_vehicles()
    for v in odoo_vehicles:
        v_id = v.get('id')
        plate = v.get('plate')
        if plate: trucks_map[str(plate).upper().strip()] = v_id

    # 2. Get sale orders from Odoo
    odoo_orders = client.get_sale_orders(limit=100)
    print(f"Fetched {len(odoo_orders)} orders from Odoo")
    
    res = []
    for so in odoo_orders:
        try:
            partner_name = so.get('partner_id', [None, ''])[1] if so.get('partner_id') else ""
            if not partner_name: continue
            
            internal_keywords = ['COMIDA', 'MEAL', 'INTERNAL']
            if any(k in partner_name.upper() for k in internal_keywords): continue
            
            data = so.get('parsed_data', {})
            state = so.get('state', 'draft')
            status = 'DRAFT'
            if state in ['sale', 'done']: status = 'COMPLETED'
            elif state == 'cancel': status = 'CANCELLED'
            
            # This is the line in main.py:
            # status = 'PLANNED' if status == 'PENDING' else status
            # Since status is DRAFT/COMPLETED/CANCELLED, it never becomes PLANNED here!
            
            truck_id = trucks_map.get(str(data.get('plate', '')).upper().strip()) or data.get('plate') or ''
            
            res.append({
                'id': so.get('id'),
                'name': so.get('name'),
                'status': status,
                'truck_id': truck_id,
                'partner': partner_name
            })
        except: continue

    # 3. Merge Meals
    lookup_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    with db.get_cursor() as c:
        c.execute("SELECT id, status, truck_id FROM meals WHERE scheduled_start >= ? AND status != 'CANCELLED'", (lookup_date,))
        for row in c.fetchall():
            res.append({
                'id': row['id'],
                'name': 'Meal',
                'status': row['status'],
                'truck_id': row['truck_id'],
                'partner': 'COMIDA'
            })

    return res

if __name__ == "__main__":
    orders = mock_get_all_orders()
    print("\n--- ORDERS THAT WOULD SHOW IN INBOX ---")
    inbox_count = 0
    for o in orders:
        # Frontend filter: ['DRAFT', 'ANALYZING'].includes(o.status) || (o.status === 'PLANNED' && !o.truck_id)
        is_inbox = o['status'] in ['DRAFT', 'ANALYZING'] or (o['status'] == 'PLANNED' and not o['truck_id'])
        if is_inbox:
            inbox_count += 1
            print(f"ID: {o['id']} | Name: {o['name']} | Status: {o['status']} | Truck: {o['truck_id']} | Partner: {o['partner']}")
    
    print(f"\nTotal in Inbox: {inbox_count}")
