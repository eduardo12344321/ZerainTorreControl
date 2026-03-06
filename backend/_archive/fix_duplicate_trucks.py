import sqlite3
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to path to import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.odoo_service import OdooClient
from database import DatabaseManager
from config import DB_ENCRYPTION_KEY, DB_PATH

def cleanup():
    print("🧹 Iniciando limpieza de duplicados...")
    
    # Init DB and Odoo
    db = DatabaseManager(DB_PATH, DB_ENCRYPTION_KEY)
    odoo = OdooClient()
    
    if not odoo.connect():
        print("❌ No se pudo conectar a Odoo. Abortando para evitar pérdida de datos.")
        return

    # 1. Get Odoo Trucks (The Source of Truth)
    odoo_trucks = odoo.get_vehicles()
    if not odoo_trucks:
        print("❌ No se encontraron vehículos en Odoo. Abortando.")
        return
        
    odoo_ids = set([str(t['id']) for t in odoo_trucks])
    # Map Normalized Plate -> Odoo ID
    odoo_map = {t['plate'].replace("-", "").replace(" ", "").strip().upper(): str(t['id']) for t in odoo_trucks}
    
    print(f"✅ Odoo tiene {len(odoo_trucks)} vehículos válidos.")

    with db.get_cursor() as c:
        # 2. Analysis
        c.execute("SELECT id, plate FROM trucks")
        all_trucks = c.fetchall()
        
        print(f"📊 La Base de Datos Local tiene {len(all_trucks)} camiones.")
        
        deleted_count = 0
        migrated_orders = 0
        cleared_count = 0
        
        for t in all_trucks:
            tid = str(t['id'])
            plate = t['plate']
            norm_plate = plate.replace("-", "").replace(" ", "").strip().upper()
            
            # If this truck is NOT in Odoo list, it's a duplicate/legacy
            if tid not in odoo_ids:
                print(f"⚠️  Duplicado detectado: {plate} (ID: {tid})")
                
                # Check for replacement
                if norm_plate in odoo_map:
                    new_id = odoo_map[norm_plate]
                    print(f"   -> Migrando pedidos al ID correcto: {new_id}")
                    # Migrate orders to the new ID
                    c.execute("UPDATE orders SET truck_id = ? WHERE truck_id = ?", (new_id, tid))
                    migrated_orders += c.rowcount
                else:
                    print(f"   -> No se encontró vehículo equivalente en Odoo. Los pedidos quedarán sin asignar (NULL).")
                    c.execute("UPDATE orders SET truck_id = NULL WHERE truck_id = ?", (tid,))
                
                # Delete the old truck
                c.execute("DELETE FROM trucks WHERE id = ?", (tid,))
                deleted_count += 1
            else:
                # Valid truck - User requested to clear ITV data
                # "borra lo de la ITV y el taller... limpiamos todo eso"
                # print(f"   -> Vehículo válido {plate}. Limpiando datos de ITV/Taller.")
                c.execute("UPDATE trucks SET itv_expiration = NULL, next_maintenance = NULL WHERE id = ?", (tid,))
                cleared_count += 1

        print(f"✅ Limpieza Completada.")
        print(f"   - Se eliminaron {deleted_count} vehiculos duplicados/viejos.")
        print(f"   - Se migraron los pedidos de estos vehículos.")
        print(f"   - Se limpiaron datos de ITV/Taller en {cleared_count} vehículos válidos.")

if __name__ == "__main__":
    cleanup()
