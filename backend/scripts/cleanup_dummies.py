import sqlite3
import os

db_path = 'backend/zerain.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Delete trucks with ID starting with 't' (dummies)
cur.execute("DELETE FROM trucks WHERE id LIKE 't%'")
print(f"Deleted {cur.rowcount} dummy trucks.")

# Delete customers with ID starting with 'c' (dummies)
cur.execute("DELETE FROM customers WHERE id LIKE 'c%'")
print(f"Deleted {cur.rowcount} dummy customers.")

conn.commit()
conn.close()
print("Cleanup complete.")
