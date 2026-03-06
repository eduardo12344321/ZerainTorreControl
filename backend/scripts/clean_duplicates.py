import sqlite3

conn = sqlite3.connect('zerain.db')
c = conn.cursor()

# Get all customers with notes
c.execute("SELECT id, name, notes FROM customers WHERE notes IS NOT NULL AND notes != ''")
customers = c.fetchall()

cleaned_count = 0
marker = "--- [INVESTIGACION AI] ---"

for customer in customers:
    customer_id = customer[0]
    customer_name = customer[1]
    notes = customer[2]
    
    # Check if marker appears more than once
    if notes.count(marker) > 1:
        # Find the position of the second occurrence
        first_pos = notes.find(marker)
        second_pos = notes.find(marker, first_pos + len(marker))
        
        # Keep only everything before the second occurrence
        cleaned_notes = notes[:second_pos].rstrip()
        
        print(f"Limpiando: {customer_name}")
        print(f"  Antes: {notes.count(marker)} investigaciones")
        print(f"  Después: {cleaned_notes.count(marker)} investigación")
        
        # Update the customer
        c.execute("UPDATE customers SET notes = ? WHERE id = ?", (cleaned_notes, customer_id))
        cleaned_count += 1

conn.commit()
print(f"\n✅ Limpiadas {cleaned_count} notas duplicadas")
conn.close()
