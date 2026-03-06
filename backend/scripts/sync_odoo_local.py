import os
import sys
import json
import logging
from datetime import datetime

# Add backend to path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from services.odoo_service import odoo_client
from database import db
from dependencies import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SyncService")

def sync_vehicles():
    logger.info("🔄 Syncing Vehicles from Odoo...")
    if not odoo_client.connect():
        logger.error("Failed to connect to Odoo")
        return
    
    odoo_vehicles = odoo_client.get_vehicles()
    logger.info(f"Fetched {len(odoo_vehicles)} vehicles from Odoo.")
    
    with db.get_cursor() as c:
        for v in odoo_vehicles:
            # Map fields for local 'trucks' table
            # Note: odoo_client.get_vehicles() already returns a mapped dict
            c.execute("""
                INSERT INTO trucks (
                    id, plate, alias, category, status, axles, max_weight, color, 
                    has_crane, has_jib, is_box_body, max_length, default_driver_id, 
                    itv_expiration, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                    plate=excluded.plate, 
                    alias=excluded.alias, 
                    category=excluded.category,
                    axles=excluded.axles,
                    max_weight=excluded.max_weight,
                    color=excluded.color,
                    has_crane=excluded.has_crane,
                    has_jib=excluded.has_jib,
                    is_box_body=excluded.is_box_body,
                    max_length=excluded.max_length,
                    default_driver_id=excluded.default_driver_id,
                    itv_expiration=excluded.itv_expiration,
                    display_order=excluded.display_order
            """, (
                v['id'], v['plate'], v['alias'], v['category'], v['status'], 
                v.get('axles'), v.get('max_weight'), v.get('color'),
                v.get('has_crane'), v.get('has_jib'), v.get('is_box_body'), v.get('max_length'),
                v.get('default_driver_id'), v.get('itv_expiration'), v.get('display_order', 0)
            ))
    logger.info("✅ Vehicles sync complete.")

def sync_customers():
    logger.info("🔄 Syncing Customers from Odoo...")
    if not odoo_client.connect(): return
    
    # We fetch with a high limit
    customers = odoo_client.get_customers(limit=5000)
    logger.info(f"Fetched {len(customers)} customers from Odoo.")
    
    with db.get_cursor() as c:
        for p in customers:
            # Map fields
            # Odoo fields: name, phone, email, vat, street, city, zip, comment, website, image_128, category_id
            addr = f"{p.get('street') or ''}, {p.get('city') or ''}".strip(', ')
            
            c.execute("""
                INSERT INTO customers (
                    id, name, nif, phone, email, billing_address, postal_code, city, notes, image_128
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                    name=excluded.name, 
                    nif=excluded.nif, 
                    phone=excluded.phone,
                    email=excluded.email,
                    billing_address=excluded.billing_address,
                    postal_code=excluded.postal_code,
                    city=excluded.city,
                    notes=excluded.notes,
                    image_128=excluded.image_128
            """, (
                str(p['id']), p['name'], p.get('vat'), p.get('phone'), p.get('email'),
                addr, p.get('zip'), p.get('city'), p.get('comment'), p.get('image_128')
            ))
    logger.info("✅ Customers sync complete.")

def sync_employees():
    logger.info("🔄 Syncing Employees (Drivers) from Odoo...")
    if not odoo_client.connect(): return
    
    employees = odoo_client.get_employees()
    logger.info(f"Fetched {len(employees)} employees from Odoo.")
    
    default_hash = get_password_hash("1234")
    
    with db.get_cursor() as c:
        for e in employees:
            dni = str(e.get('identification_id') or '').upper().strip()
            if not dni: continue
            
            # Check if exists in credentials
            c.execute("SELECT dni FROM driver_credentials WHERE dni = ?", (dni,))
            if not c.fetchone():
                logger.info(f"Adding new driver credential for DNI: {dni}")
                c.execute("INSERT INTO driver_credentials (dni, password_hash) VALUES (?, ?)", (dni, default_hash))
                
    logger.info("✅ Employees sync complete.")

def sync_all():
    logger.info("🚀 STARTING GLOBAL ODOO SYNC 🚀")
    sync_vehicles()
    sync_employees()
    sync_customers()
    logger.info("🏁 GLOBAL SYNC FINISHED 🏁")

if __name__ == "__main__":
    sync_all()
