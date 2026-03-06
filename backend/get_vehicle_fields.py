from services.odoo_service import odoo_client
import json

try:
    fields = odoo_client.execute('fleet.vehicle', 'fields_get', [])
    with open('vehicle_fields.json', 'w') as f:
        json.dump(list(fields.keys()), f, indent=2)
    print("Fields saved to vehicle_fields.json")
except Exception as e:
    print(f"Error: {e}")
