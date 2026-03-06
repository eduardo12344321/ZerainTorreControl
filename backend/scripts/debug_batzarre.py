import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import odoo_client

odoo_client.connect()
p = odoo_client.execute('res.partner', 'read', [3449], ['name', 'comment'])[0]
print(f"CLIENTE: {p['name']}")
print("-" * 40)
print("COMMENT:")
print(p['comment'])
print("-" * 40)
marker = "--- [INVESTIGACION AI] ---"
print(f"Repeticiones del marcador: {p['comment'].count(marker) if p['comment'] else 0}")
