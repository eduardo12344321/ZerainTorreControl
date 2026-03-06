
import os
import sys

# Add parent directory to path to import local modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def cleanup_customers():
    if not odoo_client.connect():
        print("Failed to connect to Odoo.")
        return

    # Search for customers created during testing/import
    # We'll look for "Zerain Client" in the name
    patterns = ["Zerain Client"]
    
    total_archived = 0
    
    for pattern in patterns:
        print(f"Searching for customers matching '{pattern}'...")
        ids = odoo_client.execute('res.partner', 'search', [
            ['name', 'ilike', pattern]
        ])
        
        if not ids:
            print(f"No customers found matching '{pattern}'.")
            continue
            
        print(f"Found {len(ids)} customers. Archiving...")
        
        for customer_id in ids:
            try:
                # Odoo standard "delete" is archiving
                odoo_client.execute('res.partner', 'write', [customer_id], {'active': False})
                print(f"Archived customer ID: {customer_id}")
                total_archived += 1
            except Exception as e:
                print(f"Failed to archive customer {customer_id}: {e}")

    print(f"\nCleanup finished. Total archived: {total_archived}")

if __name__ == "__main__":
    cleanup_customers()
