import sqlite3
conn = sqlite3.connect('zerain.db')
c = conn.cursor()
c.execute("UPDATE orders SET status = 'CANCELLED' WHERE odoo_id IN ('15', '16')")
conn.commit()
print(f"Updated {c.rowcount} orders to CANCELLED locally.")
conn.close()
