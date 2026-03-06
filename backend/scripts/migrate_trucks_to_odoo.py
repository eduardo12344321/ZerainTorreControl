import sys
import os
import sqlite3
import logging

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.odoo_service import odoo_client
from config import DB_PATH

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_trucks():
    if not odoo_client.connect():
        logger.error("Could not connect to Odoo")
        return

    # 1. Read Local Trucks
    logger.info(f"Reading local DB: {DB_PATH}")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM trucks")
        local_trucks = c.fetchall()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to read local DB: {e}")
        return

    logger.info(f"Found {len(local_trucks)} trucks in local DB.")

    # --- OPTIMIZATION: PRE-FETCH MODEL IDs ---
    logger.info("Pre-fetching/Creating Odoo Configurations (Models/Brands)...")
    brand_id = odoo_client.search_brand("Zerain")
    if not brand_id:
        brand_id = odoo_client.execute('fleet.vehicle.model.brand', 'create', [{'name': 'Zerain'}])
    
    migrated_model_id = odoo_client.search_model("Migrated Truck")
    if not migrated_model_id:
        migrated_model_id = odoo_client.execute('fleet.vehicle.model', 'create', [{'name': 'Migrated Truck', 'brand_id': brand_id}])
    
    logger.info(f"Using Model ID: {migrated_model_id} for migration.")

    # 2. Iterate and Push to Odoo
    success_count = 0
    total = len(local_trucks)
    
    for idx, truck in enumerate(local_trucks):
        try:
            plate = truck['plate']
            if not plate: continue
            
            logger.info(f"[{idx+1}/{total}] Processing {plate}...")

            # Basic mapping
            odoo_data = {
                'license_plate': plate,
                'color': truck['color'] or '',
                # Custom Fields
                'x_axles': truck['axles'] or 0,
                'x_max_weight': truck['max_weight'] or 0.0,
                'x_max_length': truck['max_length'] or 0.0,
                'x_has_crane': bool(truck['has_crane']),
                'x_has_jib': bool(truck['has_jib']),
                'x_is_box_body': bool(truck['is_box_body']),
                'x_category_zerain': truck['category'] or 'GRUA_PESADA',
                'model_id': migrated_model_id # Use cached model ID
            }

            # Check if exists
            existing_ids = odoo_client.execute('fleet.vehicle', 'search', [['license_plate', '=', plate]])
            
            if existing_ids:
                logger.info(f"   -> Updating existing truck...")
                odoo_client.execute('fleet.vehicle', 'write', existing_ids, odoo_data)
                success_count += 1
                continue
            
            # Create
            new_id = odoo_client.create_vehicle(odoo_data)
            logger.info(f"   -> Created New Vehicle (ID: {new_id})")
            success_count += 1

        except Exception as e:
            logger.error(f"Error migrating truck {truck['plate']}: {e}")

    logger.info(f"Truck Migration Finished. Success: {success_count}/{total}")

if __name__ == "__main__":
    migrate_trucks()
