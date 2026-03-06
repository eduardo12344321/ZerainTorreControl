import sqlite3
conn = sqlite3.connect('zerain.db')
c = conn.cursor()
c.execute("PRAGMA table_info(trucks)")
print([row[1] for row in c.fetchall()])
conn.close()
