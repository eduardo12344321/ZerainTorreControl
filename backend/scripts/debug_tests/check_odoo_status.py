import sys
import os
sys.path.append(os.getcwd())

from services.odoo_service import OdooService
from config import ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD

client = OdooService(ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD)

def check_odoo():
    fields = ['name', 'state', 'partner_id']
    # Odoo search by default only returns active=True
    orders = client.execute('sale.order', 'search_read', [['state', 'in', ['draft', 'sent', 'sale', 'done', 'cancel']]], fields=fields, limit=50, order='id desc')
    print(f"--- ACTIVE ODOO ORDERS ---")
    for o in orders:
        print(f"ID: {o['id']} | Name: {o['name']} | State: {o['state']} | Partner: {o['partner_id'][1] if o['partner_id'] else '-'}")

    # Check specifically inactive (trash)
    archived = client.execute('sale.order', 'search_read', [['active', '=', False]], fields=fields, limit=50)
    print(f"\n--- ARCHIVED ODOO ORDERS (Papelera) ---")
    for o in archived:
        print(f"ID: {o['id']} | Name: {o['name']} | State: {o['state']} | Partner: {o['partner_id'][1] if o['partner_id'] else '-'}")

if __name__ == "__main__":
    check_odoo()
