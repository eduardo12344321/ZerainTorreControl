from dotenv import load_dotenv
import os
from services.odoo_service import OdooClient

def debug_products():
    load_dotenv('backend/.env')
    client = OdooClient()
    if not client.connect():
        print("❌ Failed to connect to Odoo")
        return

    print("🔍 Fetching ALL products from Odoo (no filters)...")
    products = client.execute('product.product', 'search_read', [], fields=['name', 'sale_ok', 'type', 'active', 'list_price'])
    
    print(f"✅ Found {len(products)} total products.")
    for p in products:
        print(f" - [{p['id']}] {p['name']} | Sale OK: {p['sale_ok']} | Type: {p['type']} | Price: {p['list_price']}")

if __name__ == "__main__":
    debug_products()
