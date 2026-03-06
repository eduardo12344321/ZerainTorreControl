from services.odoo_service import odoo_client
import json

try:
    # Solo pedimos 1 para no saturar y verificamos los campos x_ de Zerain
    fields_to_read = [
        'name', 'license_plate', 'x_category_zerain', 
        'x_axles', 'x_max_weight', 'x_has_crane', 
        'x_has_jib', 'x_is_box_body', 'x_max_length'
    ]
    vehicles = odoo_client.execute('fleet.vehicle', 'search_read', [['active', '=', True]], fields=fields_to_read, limit=5)
    
    with open('vehicle_sample.json', 'w') as f:
        json.dump(vehicles, f, indent=2)
    print(f"Sample data for {len(vehicles)} vehicles saved to vehicle_sample.json")
except Exception as e:
    print(f"Error: {e}")
