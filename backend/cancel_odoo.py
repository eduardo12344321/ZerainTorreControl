from services.odoo_service import odoo_client
import sys

# Try to cancel order 16 and 15
for oid in [16, 15]:
    print(f"Cancelling Odoo SO ID: {oid}")
    res = odoo_client.cancel_sale_order(oid)
    print(f"Result: {res}")
