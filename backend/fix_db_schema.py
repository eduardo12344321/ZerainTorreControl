import sqlite3
import os

db_path = 'zerain.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    # Drop existing tables to allow setup_database.py to recreation with correct schema
    c.execute("DROP TABLE IF EXISTS trucks")
    c.execute("DROP TABLE IF EXISTS meals") # Just in case
    conn.commit()
    conn.close()
    print("Dropped trucks and meals tables.")
else:
    print("DB not found.")
