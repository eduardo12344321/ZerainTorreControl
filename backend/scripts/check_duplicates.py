import sqlite3

conn = sqlite3.connect('zerain.db')
c = conn.cursor()

# Get customers with duplicate investigations
c.execute("SELECT id, name, notes FROM customers WHERE notes LIKE '%--- [INVESTIGACION AI] ---%'")
customers = c.fetchall()

marker = "--- [INVESTIGACION AI] ---"
duplicates = []

for customer in customers:
    customer_id, name, notes = customer
    count = notes.count(marker)
    if count > 1:
        duplicates.append((customer_id, name, count))

print(f"Total clientes con investigación: {len(customers)}")
print(f"Clientes con investigaciones duplicadas: {len(duplicates)}")

if duplicates:
    print("\nPrimeros 10 clientes con duplicados:")
    for cid, name, count in duplicates[:10]:
        print(f"  - {name}: {count} investigaciones")

conn.close()
