import sqlite3

conn = sqlite3.connect('zerain.db')
c = conn.cursor()

# Count customers with notes
c.execute("SELECT COUNT(*) FROM customers WHERE notes IS NOT NULL AND notes != ''")
count = c.fetchone()[0]
print(f'Hay {count} clientes con notas de IA')

# Clear all notes
c.execute("UPDATE customers SET notes = NULL")
conn.commit()
print(f'✅ Limpiadas {c.rowcount} notas de clientes')

conn.close()
