import os
import sys
from dotenv import load_dotenv

# Add backend to path to import odoo_client
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from services.odoo_service import odoo_client

def test_odoo_sync():
    print("🚀 Testing Odoo Sale Order (Presupuestos) Integration...")
    
    # 1. Connect
    if not odoo_client.connect():
        print("❌ Failed to connect to Odoo")
        return

    # 2. Find a test customer (Partner)
    customers = odoo_client.get_customers(limit=1)
    if not customers:
        print("❌ No customers found in Odoo to test with.")
        return
    
    customer_id = customers[0]['id']
    customer_name = customers[0]['name']
    print(f"✅ Using customer: {customer_name} (ID: {customer_id})")

    # 3. Create a Test Sale Order
    transport_data = {
        'origin': 'Vitoria-Gasteiz',
        'dest': 'Bilbao Port',
        'plate': '1234-BBB',
        'driver': 'Manolo (Test)',
        'load': '5 Palets / 1000kg',
        'notes': 'Porte Urgente - Cita a las 08:30h',
        'date': '2026-02-25 08:30:00'
    }
    
    print("📦 Creating Sale Order...")
    so_id = odoo_client.create_sale_order(customer_id, transport_data)
    
    if so_id:
        print(f"✅ Sale Order created in Odoo! ID: {so_id}")
        
        # 4. Verify lines
        order = odoo_client.execute('sale.order', 'read', [so_id], fields=['name', 'order_line'])
        if not order:
            print("❌ Failed to read back the created order.")
            return

        print(f"📄 Odoo Order Name: {order[0]['name']}")
        
        line_ids = order[0].get('order_line', [])
        if not line_ids:
            print("❌ No lines found in the created order.")
            return

        lines = odoo_client.execute('sale.order.line', 'read', line_ids, fields=['display_type', 'name'])
        
        print("\n🔍 Verifying lines (Sections/Notes):")
        for l in lines:
            dtype = l.get('display_type', 'product')
            print(f"   - [{dtype}] {l['name']}")
            
        # 5. Test Update
        print("\n🔄 Testing Update (Changing Destination)...")
        transport_data['dest'] = 'Madrid (New Destination)'
        success = odoo_client.update_sale_order_lines(so_id, transport_data)
        if success:
            print("✅ Lines updated successfully.")
            # Verify again
            order = odoo_client.execute('sale.order', 'read', [so_id], fields=['order_line'])
            lines = odoo_client.execute('sale.order.line', 'read', order[0]['order_line'], fields=['name'])
            for l in lines:
                if "Destino:" in l['name']:
                    print(f"   ✨ Verified: {l['name']}")
        
        # 6. Test Cancel
        # print("\n🗑️ Testing Cancellation...")
        # if odoo_client.cancel_sale_order(so_id):
        #     print("✅ Sale Order cancelled successfully.")
        
    else:
        print("❌ Failed to create Sale Order")

if __name__ == "__main__":
    load_dotenv('backend/.env')
    test_odoo_sync()
