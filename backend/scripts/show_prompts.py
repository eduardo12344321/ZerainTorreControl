import sqlite3

conn = sqlite3.connect('zerain.db')
c = conn.cursor()

c.execute('SELECT id, name, prompt FROM ai_prompts')
rows = c.fetchall()

for row in rows:
    print(f"\n{'='*80}")
    print(f"ID: {row[0]}")
    print(f"NOMBRE: {row[1]}")
    print(f"{'='*80}")
    print(row[2])
    print(f"{'='*80}\n")

conn.close()
