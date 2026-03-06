import sqlite3
import os

db_path = "zerain.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Check current columns
    c.execute("PRAGMA table_info(orders)")
    columns = [row[1] for row in c.fetchall()]
    
    # Add route_polyline if missing
    if "route_polyline" not in columns:
        print("adding route_polyline column...")
        c.execute("ALTER TABLE orders ADD COLUMN route_polyline TEXT")
    
    # Add odoo_id if missing
    if "odoo_id" not in columns:
        print("adding odoo_id column...")
        c.execute("ALTER TABLE orders ADD COLUMN odoo_id TEXT")
        
    conn.commit()
    conn.close()
    print("✅ Migration complete.")
else:
    print(f"❌ Database {db_path} not found.")
