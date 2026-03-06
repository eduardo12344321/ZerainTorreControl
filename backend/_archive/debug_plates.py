from services.odoo_service import odoo_client
import json

try:
    print("🔍 Buscando todos los vehículos en Odoo para ver las matrículas exactas...")
    vehicles = odoo_client.execute('fleet.vehicle', 'search_read', [], ['license_plate', 'name'])
    
    with open('odoo_plates_debug.json', 'w') as f:
        json.dump(vehicles, f, indent=2)
    
    print("\nLista de matrículas encontradas en Odoo:")
    for v in vehicles:
        print(f" - Matrícula: '{v.get('license_plate')}' | Nombre: {v.get('name')}")
        
except Exception as e:
    print(f"❌ Error: {e}")
