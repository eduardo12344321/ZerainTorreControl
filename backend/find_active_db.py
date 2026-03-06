import sqlite3
import os
import glob

def check_db(path):
    print(f"\nChecking: {path}")
    if not os.path.exists(path):
        print("  File not found.")
        return

    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [r[0] for r in cursor.fetchall()]
        print(f"  Tables: {', '.join(tables)}")
        
        if 'orders' in tables:
            cursor.execute("SELECT count(*) FROM orders")
            count = cursor.fetchone()[0]
            print(f"  Orders Count: {count}")
        
            cursor.execute("SELECT id, client_name, status, scheduled_start, truck_id FROM orders")
            rows = cursor.fetchall()[:5]
            if rows:
                print("  Sample Data:")
                for r in rows:
                    print(f"    - {r}")
        
        conn.close()
    except Exception as e:
        print(f"  Error: {e}")

# Find all .db files
db_files = glob.glob('**/*.db', recursive=True)
for db in db_files:
    check_db(db)
