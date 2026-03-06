from services.odoo_service import odoo_client
print("Deleting Odoo SO ID: 16")
res = odoo_client.execute('sale.order', 'unlink', [16])
print(f"Result 16: {res}")
res = odoo_client.execute('sale.order', 'unlink', [15])
print(f"Result 15: {res}")
