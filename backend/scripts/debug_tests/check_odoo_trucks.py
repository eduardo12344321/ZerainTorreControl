
import os
from dotenv import load_dotenv
from services.odoo_service import odoo_client

load_dotenv()

print("Connecting to Odoo...")
if odoo_client.connect():
    print("Connected successfully!")
    print(f"UID: {odoo_client.uid}")
    
    # Fix S00025
    print("Fixing S00025 visibility...")
    try:
        # Update parsed data in Odoo note to set time to 08:00
        # We need to construct the note carefully, but odoo_client.update_sale_order_lines does this.
        # Let's try to use the Odoo Client's update method if available in the script context (it is imported).
        
        target_id = 25 # S00025
        
        # 1. Fetch current data to preserve other fields
        current = odoo_client.get_sale_orders(limit=100) # simpler than filtered search for now
        target = next((o for o in current if str(o['id']) == str(target_id)), None)
        
        if target:
            print(f"Found target: {target['name']}")
            parsed = target.get('parsed_data', {})
            # Force 8am
            parsed['date'] = '2026-02-14 08:00:00'
            parsed['prep_time'] = parsed.get('prep_time') or 15
            
            # Update
            print(f"Updating {target['name']} to 08:00...")
            odoo_client.update_sale_order_lines(str(target_id), parsed)
            print("Update sent!")
        else:
            print("Target S00025 not found in recent orders.")

    except Exception as e:
        print(f"Error fixing order: {e}")
