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

def check_fields():
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
    models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

    fields = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD, 'sale.order', 'fields_get', [], {'attributes': ['string', 'type']})
    print("--- SALE ORDER FIELDS ---")
    if 'active' in fields:
        print("Field 'active' EXISTS")
    else:
        print("Field 'active' DOES NOT EXIST")
        # Search for anything similar
        for f in fields:
            if 'active' in f or 'archive' in f:
                print(f"Found similar field: {f}")

if __name__ == "__main__":
    check_fields()
