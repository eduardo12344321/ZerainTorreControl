import sqlite3

conn = sqlite3.connect('zerain.db')
c = conn.cursor()

# Check customers with notes
c.execute("SELECT COUNT(*) FROM customers WHERE notes IS NOT NULL AND notes != ''")
with_notes = c.fetchone()[0]

# Check total customers
c.execute("SELECT COUNT(*) FROM customers")
total = c.fetchone()[0]

print(f'Clientes con notas: {with_notes}')
print(f'Total clientes: {total}')
print(f'Sin notas: {total - with_notes}')

conn.close()
