import sys
import os
import pandas as pd
import logging
import time

# Add backend directory to sys.path to import services
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.odoo_service import odoo_client

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

EXCEL_PATH = r"c:/Users/Saruman/Desktop/Antigravity_proyects/TorreControlZerain/clientes/clientes_reducido.xlsx"

def import_customers():
    if not odoo_client.connect():
        logger.error("Could not connect to Odoo")
        return

    logger.info(f"Reading Excel: {EXCEL_PATH}")
    try:
        df = pd.read_excel(EXCEL_PATH)
    except Exception as e:
        logger.error(f"Failed to read Excel: {e}")
        return

    # Map column names (from user's excel) to Odoo fields
    # User's columns: ['Cuenta: Cód.', 'Cuenta: Nombre', 'Dirección 1', 'C.P.', 'Ciudad', 'Cuenta: E-mail', 'Cuenta: teléfono']
    
    success_count = 0
    error_count = 0

    for index, row in df.iterrows():
        try:
            name = str(row.get('Cuenta: Nombre', 'Unknown')).strip()
            if not name or name == 'nan': continue

            # Construct Odoo data dict
            odoo_data = {
                'name': name,
                'street': str(row.get('Dirección 1', '')) if pd.notna(row.get('Dirección 1')) else '',
                'city': str(row.get('Ciudad', '')) if pd.notna(row.get('Ciudad')) else '',
                'zip': str(row.get('C.P.', '')) if pd.notna(row.get('C.P.')) else '',
                'email': str(row.get('Cuenta: E-mail', '')) if pd.notna(row.get('Cuenta: E-mail')) else '',
                'phone': str(row.get('Cuenta: teléfono', '')) if pd.notna(row.get('Cuenta: teléfono')) else '',
                'comment': f"Código: {row.get('Cuenta: Cód.')}",
                'customer_rank': 1 # Mark as customer
            }

            # Optional: Check if already exists to avoid duplicates?
            # For now, we trust Odoo might handle it or we create duplicates (careful!)
            # Ideally verify by Reference/Code if possible.
            # Using 'Cuenta: Cód.' as 'ref'
            odoo_data['ref'] = str(row.get('Cuenta: Cód.', ''))

            # --- AI ENRICHMENT (Placeholder) ---
            # if row.get('Página Web'):
            #     odoo_data['website'] = row.get('Página Web')
            #     # call_ai_agent_to_summarize(row.get('Página Web'))
            
            new_id = odoo_client.create_customer(odoo_data)
            logger.info(f"Created Customer: {name} (ID: {new_id})")
            success_count += 1
            
            # Rate limit slightly to be nice to Odoo if needed
            # time.sleep(0.1)

        except Exception as e:
            logger.error(f"Error creating customer {name}: {e}")
            error_count += 1

    logger.info(f"Import Finished. Success: {success_count}, Errors: {error_count}")

if __name__ == "__main__":
    import_customers()
