
import sqlite3
import os

db_path = 'backend/zerain.db' 
if not os.path.exists(db_path):
    # Try other common names if zerain.db doesn't exist
    for f in ['backend/database.db', 'backend/local.db']:
        if os.path.exists(f):
            db_path = f
            break

print(f"Using database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
    if not cursor.fetchone():
        print("❌ Table 'customers' does NOT exist.")
    else:
        cursor.execute("SELECT count(*) as total FROM customers")
        count = cursor.fetchone()['total']
        print(f"✅ Total customers in DB: {count}")
        
        if count > 0:
            print("\nFirst 5 customers:")
            cursor.execute("SELECT id, name FROM customers LIMIT 5")
            for row in cursor.fetchall():
                print(f"  - [{row['id']}] {row['name']}")
    
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
