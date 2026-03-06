from dotenv import load_dotenv
import os
from services.odoo_service import OdooClient

def debug_products():
    load_dotenv('backend/.env')
    client = OdooClient()
    if not client.connect():
        print("❌ Failed to connect to Odoo")
        return

    print("🔍 Fetching ALL products (product.product) from Odoo...")
    products = client.execute('product.product', 'search_read', [], fields=['name', 'sale_ok', 'type', 'active', 'list_price'])
    
    print(f"✅ Found {len(products)} products in product.product.")
    for p in products:
        print(f" - [{p['id']}] {p['name']} | Sale OK: {p['sale_ok']} | Type: {p['type']} | Price: {p['list_price']} | Active: {p['active']}")

    print("\n🔍 Fetching ALL templates (product.template) from Odoo...")
    templates = client.execute('product.template', 'search_read', [], fields=['name', 'sale_ok', 'type', 'active', 'list_price'])
    
    print(f"✅ Found {len(templates)} templates in product.template.")
    for t in templates:
        print(f" - [{t['id']}] {t['name']} | Sale OK: {t['sale_ok']} | Type: {t['type']} | Price: {t['list_price']} | Active: {t['active']}")

if __name__ == "__main__":
    debug_products()
