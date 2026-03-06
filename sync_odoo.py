import os
import pandas as pd
import xmlrpc.client
import logging

# Config
ODOO_URL = 'http://odoo:8069'
ODOO_DB = 'zerain_2026'
ODOO_USER = 'admin' # Safe default
ODOO_USER_1 = 'transporteszerain@gmail.com'
ODOO_USER_2 = 'admin'
ODOO_PASS = 'TorreControl2026!'

try:
    print(f"Connecting to {ODOO_URL} DB {ODOO_DB}...")
    common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
    
    print(f"Trying {ODOO_USER_1}...")
    uid = common.authenticate(ODOO_DB, ODOO_USER_1, ODOO_PASS, {})
    if uid:
        ODOO_USER = ODOO_USER_1
    else:
        print(f"Trying {ODOO_USER_2}...")
        uid = common.authenticate(ODOO_DB, ODOO_USER_2, ODOO_PASS, {})
        if uid:
            ODOO_USER = ODOO_USER_2
        else:
            print("FAILED: No auth found with provided password for any user")
            exit(1)

    print(f'CONNECTED: as {ODOO_USER} (ID: {uid})')

    print(f'CONNECTED: as {ODOO_USER} (ID: {uid})')
    models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

    # Read Excel
    df = pd.read_excel('/app/VEHICULOS_ZERAIN_V1.xlsx')
    print(f'READ_EXCEL: Found {len(df)} vehicles')

    for _, row in df.iterrows():
        plate = str(row['MATRICULA']).strip()
        alias = str(row['ALIAS']) if 'ALIAS' in row else ''
        
        # Search if exists
        ids = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'fleet.vehicle', 'search', [[['license_plate', '=', plate]]])
        if ids:
            print(f'EXISTS: {plate}')
        else:
            # Create
            # Need a model_id first.
            m_ids = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'fleet.vehicle.model', 'search', [[], 0, 1])
            if not m_ids:
                brand_id = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'fleet.vehicle.model.brand', 'create', [{'name': 'Genérico'}])
                m_id = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'fleet.vehicle.model', 'create', [{'name': 'Genérico', 'brand_id': brand_id}])
            else:
                m_id = m_ids[0]

            v_id = models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'fleet.vehicle', 'create', [{
                'license_plate': plate,
                'model_id': m_id,
            }])
            print(f'CREATED: {plate} (ID: {v_id})')

    print('SYNC_SUCCESS')
except Exception as e:
    print(f'ERROR: {str(e)}')
