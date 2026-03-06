import xmlrpc.client
import json

import os
from dotenv import load_dotenv

load_dotenv()

# Config
ODOO_URL = os.getenv('ODOO_URL')
ODOO_DB = os.getenv('ODOO_DB')
ODOO_USER = os.getenv('ODOO_EMAIL')
ODOO_PASS = os.getenv('ODOO_API_KEY')
ODOO_PASS_ALT = os.getenv('ODOO_PASSWORD')

drivers = [
    {"name": "ANGEL MARÍA, SORIA GARCÍA", "identification_id": "16284835F"},
    {"name": "IVAN GONZÁLEZ NIÑO", "identification_id": "16813048W"},
    {"name": "IÑAKI IRAETA SEMPERENA", "identification_id": "72458838Y"},
    {"name": "JESÚS ECHEVARRÍA SASIGAÍN", "identification_id": "16263747X"},
    {"name": "MICHEL AMELIO MENDOZA FRANCISCO", "identification_id": "X9001009M"},
    {"name": "OSCAR OLANO MARQUÍNEZ", "identification_id": "18598689S"},
    {"name": "PABLO ELEJALDE GIL", "identification_id": "16299991Y"},
    {"name": "Manolo García", "identification_id": "12345678A"},
    {"name": "Edu Marki", "identification_id": "87654321B"}
]

try:
    print(f"Connecting to {ODOO_URL} DB {ODOO_DB}...")
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS, {})
    
    if not uid and ODOO_PASS_ALT:
        print("API Key failed, trying ODOO_PASSWORD...")
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS_ALT, {})
        if uid:
            ODOO_PASS = ODOO_PASS_ALT

    if not uid:
        print("FAILED_AUTH: Check ODOO_EMAIL and API Key / Password in .env")
        exit(1)

    print(f'CONNECTED: as {ODOO_USER} (ID: {uid})')
    models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

    for d in drivers:
        name = d['name']
        ident = d['identification_id']
        
        # Search if exists
        ids = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'hr.employee', 'search', [[['name', '=', name]]])
        if ids:
            print(f'EXISTS: {name}')
        else:
            e_id = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'hr.employee', 'create', [{
                'name': name,
                'identification_id': ident,
            }])
            print(f'CREATED: {name} (ID: {e_id})')

    print('SYNC_EMPLOYEES_SUCCESS')
except Exception as e:
    print(f'ERROR: {str(e)}')
