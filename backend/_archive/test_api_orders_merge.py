import requests
import json

def test_orders_api_merge():
    print("🔍 Checking if Odoo Sale Orders are merging into the local API...")
    try:
        r = requests.get("http://localhost:7000/api/v1/orders")
        if r.status_code == 200:
            data = r.json()
            print(f"✅ Received {len(data)} total orders.")
            
            odoo_orders = [o for o in data if str(o.get('id', '')).startswith('odoo-')]
            print(f"📦 Found {len(odoo_orders)} virtual orders from Odoo.")
            
            if odoo_orders:
                print("\nSample Odoo Order (First one):")
                # Print key fields to verify parsing
                sample = odoo_orders[0]
                print(f"   - Display ID: {sample.get('display_id')}")
                print(f"   - Status: {sample.get('status')}")
                print(f"   - Client: {sample.get('client_name')}")
                print(f"   - Origin: {sample.get('origin_address')}")
                print(f"   - Dest: {sample.get('destination_address')}")
                print(f"   - Date: {sample.get('scheduled_start')}")
            else:
                print("⚠️ No Odoo budgets (draft/sent/sale) were found. Create one in Odoo UI to verify.")
        else:
            print(f"❌ Error API: {r.status_code}")
            print(r.text)
    except Exception as e:
        print(f"🔥 Error connection: {e}")

if __name__ == "__main__":
    test_orders_api_merge()
