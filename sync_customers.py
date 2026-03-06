import os
import pandas as pd
import xmlrpc.client
import time

# Config
ODOO_URL = 'http://odoo:8069'
ODOO_DB = 'zerain_2026'
ODOO_USER = 'transporteszerain@gmail.com'
ODOO_PASS = 'TorreControl2026!'

def sync_customers():
    try:
        print(f"Connecting to {ODOO_URL}...")
        common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASS, {})
        if not uid:
            print("FAILED_AUTH")
            return

        print(f"CONNECTED: ID {uid}")
        models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

        # Read Excel
        file_path = '/app/clientes.xlsx'
        df = pd.read_excel(file_path)
        print(f"READ_EXCEL: Found {len(df)} rows")

        # Map columns
        # ['Cuenta: Cód.', 'Cuenta: Nombre', 'Dirección 1', 'C.P.', 'Ciudad']
        
        batch_size = 100
        count = 0
        total = len(df)
        
        # Prepare list for creation
        to_create = []
        
        for _, row in df.iterrows():
            name = str(row.get('Cuenta: Nombre', '')).strip()
            if not name or name == 'nan':
                continue
                
            code = str(row.get('Cuenta: Cód.', '')).strip()
            street = str(row.get('Dirección 1', '')).strip()
            zip_code = str(row.get('C.P.', '')).strip()
            city = str(row.get('Ciudad', '')).strip()
            
            # Check for NaN
            if street == 'nan': street = ''
            if zip_code == 'nan': zip_code = ''
            if city == 'nan': city = ''
            if code == 'nan': code = ''

            # Standard Odoo customer fields
            vals = {
                'name': name,
                'street': street,
                'zip': zip_code,
                'city': city,
                'ref': code,
                'customer_rank': 1,
                'is_company': True
            }
            
            # In Odoo XML-RPC, 'create' usually takes a single dict
            # We can try to check if it exists by ref first to avoid duplicates
            # But with 3000 rows, searching one by one is slow.
            # If it's a new DB, we can just push.
            
            to_create.append(vals)
            
            if len(to_create) >= batch_size:
                # Odoo 16 supports batch create if we pass a list of dicts to 'create'? 
                # Actually standard 'create' takes ONE dict.
                # 'create' can take a list of dicts in some versions, but safest is loop or use 'load'
                
                for v in to_create:
                    try:
                        models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'res.partner', 'create', [v])
                        count += 1
                    except Exception as e:
                        print(f"Error creating {v['name']}: {e}")
                
                to_create = []
                print(f"Progress: {count}/{total}")

        # Final batch
        for v in to_create:
            try:
                models.execute_kw(ODOO_DB, uid, ODOO_PASS, 'res.partner', 'create', [v])
                count += 1
            except Exception as e:
                print(f"Error creating {v['name']}: {e}")
        
        print(f"SYNC_CUSTOMERS_SUCCESS: Total {count} imported")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    sync_customers()
