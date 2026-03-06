from services.odoo_service import odoo_client
ids_to_delete = [11, 12, 13, 14]
for oid in ids_to_delete:
    print(f"Processing ID: {oid}")
    try:
        # Check if it exists first
        exists = odoo_client.execute('sale.order', 'search', [['id', '=', oid]])
        if exists:
            print(f"Attempting to delete ID: {oid}")
            # Cancel first (optional but safer)
            odoo_client.execute('sale.order', 'action_cancel', [oid])
            # Unlink
            res = odoo_client.execute('sale.order', 'unlink', [oid])
            print(f"Delete result for {oid}: {res}")
        else:
            print(f"ID {oid} does not exist.")
    except Exception as e:
        print(f"Error with ID {oid}: {e}")
