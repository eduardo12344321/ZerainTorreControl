from dotenv import load_dotenv
import os
from services.odoo_service import OdooClient

def verify_fix():
    load_dotenv('backend/.env')
    client = OdooClient()
    if not client.connect():
        print("❌ Connection failed")
        return

    print("🔍 Fetching products with NEW RELAXED LOGIC...")
    products = client.get_products(limit=50)
    print(f"✅ Found {len(products)} products.")
    for p in products:
        print(f" - {p['name']} (Type: {p['type']}, Sale OK: {p['sale_ok']})")

if __name__ == "__main__":
    verify_fix()
