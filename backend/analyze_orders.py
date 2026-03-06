import sqlite3
import os

path = 'zerain.db'
if os.path.exists(path):
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, client_name, status, scheduled_start, estimated_duration, truck_id FROM orders")
    rows = cursor.fetchall()
    print(f"Found {len(rows)} orders:")
    for r in rows:
        print(f"  ID: {r[0]}")
        print(f"  Client: {r[1]}")
        print(f"  Status: {r[2]}")
        print(f"  Start: {r[3]}")
        print(f"  Duration: {r[4]}")
        print(f"  Truck: {r[5]}")
        print("-" * 20)
    conn.close()
