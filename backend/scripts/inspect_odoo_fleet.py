import sys
import os
import logging
# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from services.odoo_service import odoo_client

def inspect_trucks():
    if not odoo_client.connect():
        print("Failed to connect.")
        return

    print("Fetching vehicles from Odoo...")
    print("Fetching vehicles from Odoo...")
    # Try simple search first
    ids = odoo_client.execute('fleet.vehicle', 'search', [], {'limit': 5})
    if not ids:
        print("No vehicles found.")
        return
        
    print(f"Found IDs: {ids}")
    vehicles = odoo_client.execute('fleet.vehicle', 'read', ids)

    for v in vehicles:
        print(f"--- TRUCK: {v.get('license_plate')} ---")
        print(f"  Model: {v.get('model_id')}")
        print(f"  [x] Axles: {v.get('x_axles')}")
        print(f"  [x] Crane: {v.get('x_has_crane')}")
        print(f"  [x] Category: {v.get('x_category_zerain')}")
        print(f"  [x] Max Weight: {v.get('x_max_weight')}")
        print("-" * 30)

if __name__ == "__main__":
    inspect_trucks()
