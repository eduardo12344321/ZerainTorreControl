from services.odoo_service import odoo_client
order_id = 14
order = odoo_client.execute('sale.order', 'read', [order_id], fields=['order_line'])
if order:
    line_ids = order[0].get('order_line', [])
    lines = odoo_client.execute('sale.order.line', 'read', line_ids, fields=['name', 'display_type'])
    for l in lines:
        print(f"Line: {l.get('name')} | Type: {l.get('display_type')}")
