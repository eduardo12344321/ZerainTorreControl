import sqlite3
import os

# Try both potential locations
paths = ['backend/zerain.db', 'zerain.db', 'backend/local.db']

for path in paths:
    if os.path.exists(path):
        print(f"\nScanning DB: {path}")
        try:
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            
            # Check for orders table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'")
            if cursor.fetchone():
                cursor.execute("SELECT id, client_name, status, scheduled_start, truck_id FROM orders")
                rows = cursor.fetchall()
                print(f"Found {len(rows)} orders:")
                for r in rows:
                    print(f"  ID: {r[0]} | Client: {r[1]} | Status: {r[2]} | Start: {r[3]} | Truck: {r[4]}")
            else:
                print("  'orders' table not found.")
            conn.close()
        except Exception as e:
            print(f"  Error: {e}")
    else:
        print(f"Path not found: {path}")
