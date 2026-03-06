import os
import sys
import logging

# Config logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current dir to sys.path
sys.path.append(os.getcwd())

def test_connection():
    try:
        from services.odoo_service import odoo_client
        print(f"Env ODOO_URL: {os.getenv('ODOO_URL')}")
        print(f"Env ODOO_DB: {os.getenv('ODOO_DB')}")
        print(f"Env ODOO_EMAIL: {os.getenv('ODOO_EMAIL')}")
        
        print("\nAttempting connection...")
        if odoo_client.connect():
            print("✅ SUCCESS: Connected to Odoo!")
            print(f"UID: {odoo_client.uid}")
            
            # Test vehicles
            vehicles = odoo_client.get_vehicles()
            print(f"✅ Found {len(vehicles)} vehicles in Odoo")
            
            # Test customers
            customers = odoo_client.get_customers(limit=5)
            print(f"✅ Successfully fetched first {len(customers)} customers")
        else:
            print("❌ FAILED: Could not connect to Odoo. Check logs above.")
            
    except Exception as e:
        print(f"❌ ERROR in test script: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
