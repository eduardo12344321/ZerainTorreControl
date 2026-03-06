from services.odoo_service import odoo_client
try:
    orders = odoo_client.execute('sale.order', 'search_read', [['id', '>', 5]], fields=['name', 'create_date', 'partner_id'])
    for o in orders:
        print(f"ID: {o['id']} | Name: {o['name']} | Date: {o['create_date']} | Partner: {o['partner_id']}")
except Exception as e:
    print(f"ERROR: {e}")
