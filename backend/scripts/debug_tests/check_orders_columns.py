import sqlite3
conn = sqlite3.connect('zerain.db')
c = conn.cursor()
c.execute("PRAGMA table_info(orders)")
for row in c.fetchall():
    print(row[1])
conn.close()
