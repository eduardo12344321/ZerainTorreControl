
import sqlite3
import os

db_path = 'zerain.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
else:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("PRAGMA table_info(trucks)")
    cols = [dict(r)['name'] for r in c.fetchall()]
    print(f"Table 'trucks' columns: {cols}")
    conn.close()
