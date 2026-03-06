import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def clear_all_vehicle_notes():
    print("🧹 Iniciando limpieza de notas de vehículos en Odoo...")
    try:
        # 1. Fetch all vehicle IDs
        vehicle_ids = odoo_client.execute('fleet.vehicle', 'search', [])
        print(f"Encontrados {len(vehicle_ids)} vehículos.")

        # 2. Update each vehicle to clear description
        for vid in vehicle_ids:
            try:
                # Clear description field in Odoo
                odoo_client.execute('fleet.vehicle', 'write', [vid], {'description': False})
                print(f"✅ Notas limpiadas para vehículo ID: {vid}")
            except Exception as e:
                print(f"❌ Error limpiando vehículo {vid}: {e}")

        print("✨ Limpieza completada.")
    except Exception as e:
        print(f"🚨 Error general: {e}")

if __name__ == "__main__":
    clear_all_vehicle_notes()
