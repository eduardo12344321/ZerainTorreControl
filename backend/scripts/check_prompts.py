import sqlite3

conn = sqlite3.connect('zerain.db')
c = conn.cursor()

c.execute('SELECT * FROM ai_prompts')
rows = c.fetchall()

print(f'Total prompts en DB: {len(rows)}')
for row in rows:
    print(row)

conn.close()
