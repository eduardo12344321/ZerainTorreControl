import sqlite3
import os

db_path = "zerain.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("PRAGMA table_info(orders)")
    columns = [row[1] for row in c.fetchall()]
    print(f"Columns in 'orders' table: {columns}")
    
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in c.fetchall()]
    print(f"Tables in DB: {tables}")
    conn.close()
else:
    print(f"Database {db_path} not found.")
