import sqlite3
conn = sqlite3.connect('zerain.db')
c = conn.cursor()
c.execute("DELETE FROM orders WHERE odoo_id IN ('15', '16')")
conn.commit()
print(f"Deleted {c.rowcount} orders locally.")
conn.close()
