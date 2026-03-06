import sqlite3
import os
from datetime import datetime

# Adjust path if needed
DB_PATH = 'backend/zerain.db'

print(f"Connecting to database at: {DB_PATH}")

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT id, client_name, status, scheduled_start, truck_id FROM orders")
    rows = cursor.fetchall()

    print(f"\n--- ALL ORDERS ({len(rows)}) ---")
    print(f"{'ID':<15} | {'CLIENT':<20} | {'STATUS':<12} | {'START':<20} | {'TRUCK':<10}")
    print("-" * 90)

    for row in rows:
        order_id, client, status, start, truck = row
        # Clean up date format for readability
        try:
            date_obj = datetime.fromisoformat(start.replace('Z', '+00:00'))
            start_fmt = date_obj.strftime("%Y-%m-%d %H:%M")
        except:
            start_fmt = str(start)[:16]
            
        print(f"{str(order_id)[:15]:<15} | {str(client)[:20]:<20} | {str(status):<12} | {start_fmt:<20} | {str(truck):<10}")

    conn.close()

except Exception as e:
    print(f"Error accessing database: {e}")
