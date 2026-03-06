from services.odoo_service import odoo_client
orders = odoo_client.get_sale_orders(limit=30)
for o in orders:
    print(f"ID: {o['id']} | Name: {o['name']} | State: {o['state']}")
