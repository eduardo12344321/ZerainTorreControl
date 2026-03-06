import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import odoo_client

odoo_client.connect()
p = odoo_client.execute('res.partner', 'read', [3449], ['name', 'comment'])[0]
with open('debug_comment.txt', 'w', encoding='utf-8') as f:
    f.write(p['comment'] if p['comment'] else 'EMPTY')
print("Wrote comment to debug_comment.txt")
