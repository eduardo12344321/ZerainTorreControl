import sqlite3
conn = sqlite3.connect('zerain.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in c.fetchall()]
print(f"Tables: {tables}")
for table in tables:
    c.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in c.fetchall()]
    print(f"  {table}: {columns}")
conn.close()
