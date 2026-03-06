
from services.odoo_service import OdooClient
import json

client = OdooClient()

def check_orders():
    # Fetch recent orders with creation info
    fields = ['name', 'partner_id', 'create_date', 'amount_total', 'state', 'display_name']
    domain = [('state', '!=', 'cancel')]
    orders = client.execute('sale.order', 'search_read', domain, fields=fields, order='id desc', limit=20)
    
    print(f"RECENT ORDERS IN ODOO:")
    for o in orders:
        print(f"ID: {o['id']} | Name: {o['name']} | Partner: {o['partner_id']} | Date: {o['create_date']} | Total: {o['amount_total']} | State: {o['state']}")

if __name__ == "__main__":
    check_orders()
