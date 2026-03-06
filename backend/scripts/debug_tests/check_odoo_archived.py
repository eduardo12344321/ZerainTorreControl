import xmlrpc.client
import os

def get_env_var(name):
    with open('c:/Users/Saruman/Desktop/Antigravity_proyects/TorreControlZerain/backend/.env', 'r') as f:
        for line in f:
            if line.startswith(f"{name}="):
                return line.split('=', 1)[1].strip().strip('"')
    return None

ODOO_URL = get_env_var('ODOO_URL')
ODOO_DB = get_env_var('ODOO_DB')
ODOO_USER = get_env_var('ODOO_EMAIL')
ODOO_PASSWORD = get_env_var('ODOO_API_KEY')

def check_odoo_all():
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
    models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

    fields = ['name', 'state', 'partner_id', 'active']
    
    # Bypass active=True filter
    orders = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, 'sale.order', 'search_read', 
        [[['active', '=', False]]], 
        {'fields': fields, 'limit': 100})
    
    print(f"--- ARCHIVED ORDERS ({len(orders)}) ---")
    for o in orders:
        print(f"ID: {o['id']} | Name: {o['name']} | State: {o['state']} | Active: {o['active']} | Partner: {o['partner_id'][1] if o['partner_id'] else '-'}")

if __name__ == "__main__":
    check_odoo_all()
