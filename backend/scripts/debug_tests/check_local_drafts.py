
import sqlite3
import os
from config import DB_PATH

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, odoo_id, client_name, status, description FROM orders WHERE status = 'DRAFT'")
    rows = cursor.fetchall()
    print(f"Total Draft Orders: {len(rows)}")
    for row in rows:
        print(f"LocalID: {row[0]} | OdooID: {row[1]} | Client: {row[2]} | Status: {row[3]} | Desc: {row[4][:30] if row[4] else ''}")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
