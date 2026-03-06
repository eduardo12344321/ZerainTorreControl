
import sqlite3
import os

db_path = '../data/strada_cache.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    print("--- Distribution per Day (Earliest) ---")
    c.execute("SELECT substr(timestamp, 1, 10), count(*) FROM positions GROUP BY 1 ORDER BY 1 ASC LIMIT 20")
    for r in c.fetchall():
        print(r)
    
    print("\n--- Distribution per Day (Latest) ---")
    c.execute("SELECT substr(timestamp, 1, 10), count(*) FROM positions GROUP BY 1 ORDER BY 1 DESC LIMIT 20")
    for r in c.fetchall():
        print(r)
        
    conn.close()
