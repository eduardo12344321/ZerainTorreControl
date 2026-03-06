from services.odoo_service import odoo_client
import os
from dotenv import load_dotenv

load_dotenv()

def deep_clean_odoo_partners():
    print("Connecting to Odoo...")
    if not odoo_client.connect():
        print("Failed to connect.")
        return

    # Get protected IDs
    # 1. Main Company
    # 2. Current User's Partner
    user_data = odoo_client.execute('res.users', 'read', [odoo_client.uid], ['partner_id'])
    my_partner_id = user_data[0]['partner_id'][0] if user_data else None
    
    protected_ids = [1, my_partner_id]
    print(f"Protected IDs: {protected_ids}")

    # Search for ALL partners (even inactive ones)
    all_partners = odoo_client.execute('res.partner', 'search', [('id', 'not in', protected_ids)])
    
    if not all_partners:
        print("No partners to delete.")
        return

    print(f"Found {len(all_partners)} partners to PERMANENTLY delete.")
    
    try:
        # Divide into batches if too many, but 200 is fine
        success = odoo_client.execute('res.partner', 'unlink', all_partners)
        if success:
            print(f"Successfully deleted {len(all_partners)} records.")
        else:
            print("Operation returned False.")
    except Exception as e:
        print(f"Error: {e}")
        print("Some records might have dependencies (orders, invoices) and cannot be deleted.")

if __name__ == "__main__":
    deep_clean_odoo_partners()
