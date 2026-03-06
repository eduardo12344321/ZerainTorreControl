from services.odoo_service import odoo_client
import os
from dotenv import load_dotenv

load_dotenv()

def delete_all_customers():
    print("Connecting to Odoo...")
    if not odoo_client.connect():
        print("Failed to connect to Odoo.")
        return

    print("Fetching all customer IDs...")
    # Get all customers (customer_rank > 0)
    # We include both active and inactive to be thorough
    domain = [('customer_rank', '>', 0)]
    customer_ids = odoo_client.execute('res.partner', 'search', domain)
    
    if not customer_ids:
        print("No customers found to delete.")
        return

    print(f"Found {len(customer_ids)} customers. Attempting permanent deletion...")
    
    try:
        # unlink is the Odoo method for permanent deletion
        # This will fail if there are dependencies (invoices, orders, etc.)
        success = odoo_client.execute('res.partner', 'unlink', customer_ids)
        if success:
            print(f"Successfully deleted {len(customer_ids)} customers.")
        else:
            print("Delete operation returned False.")
    except Exception as e:
        print(f"Error during deletion: {e}")
        print("\nNote: Odoo prevents deletion if a customer has linked documents (invoices, orders).")

if __name__ == "__main__":
    delete_all_customers()
