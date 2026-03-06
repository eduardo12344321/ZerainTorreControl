import sqlite3
import os
import sys
from datetime import datetime

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.odoo_service import odoo_client
from config import DB_PATH

def populate_orders():
    print(f"🔌 Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("📦 Fetching orders from Odoo...")
    if not odoo_client.uid:
        if not odoo_client.connect():
            print("❌ Failed to connect to Odoo")
            return

    orders = odoo_client.get_sale_orders(limit=1000)
    print(f"📥 Fetched {len(orders)} orders.")

    count = 0
    for so in orders:
        try:
            # Parse data
            data = so.get('parsed_data', {})
            order_id = str(so['id'])
            
            # Extract fields
            client_name = so.get('partner_id', [None, 'Unknown'])[1]
            odoo_name = so.get('name', 'S/N')
            
            # Check if exists to preserve local overrides if any?
            # Actually, we just want to fill the missing text fields.
            # We should be careful not to overwrite 'scheduled_start' if it was modified locally.
            # But here we are primarily interested in filling client_name for optimization visibility.
            
            c.execute("SELECT id, client_name FROM orders WHERE id = ?", (order_id,))
            row = c.fetchone()
            
            if row:
                # Update info fields
                c.execute("""
                    UPDATE orders 
                    SET client_name = ?, odoo_name = ?
                    WHERE id = ?
                """, (client_name, odoo_name, order_id))
            else:
                # Insert if missing (though optimization only sees what is in DB)
                # We'll skip inserting full records to avoid messing with 'status' logic if complex
                # But actually, if it's not in DB, optimization won't see it anyway.
                # Let's simple-update existing ones.
                pass
            
            count += 1
            if count % 50 == 0:
                print(f"   Processed {count}...")
                
        except Exception as e:
            print(f"Error processing {so.get('id')}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Updated {count} orders with Client Name and Odoo Name.")

if __name__ == "__main__":
    populate_orders()
