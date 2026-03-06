import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def disable_all_broken_tbai_views():
    # IDs found that reference tbai_enabled
    view_ids = [1831, 1830, 1788, 1833, 1841, 1832] 
    
    print(f"🧹 Limpiando {len(view_ids)} vistas adicionales de TicketBAI que podrían fallar...")
    
    for view_id in view_ids:
        print(f"🔧 Desactivando vista ID {view_id}...")
        try:
            # Check if it exists and is active
            view = odoo_client.execute('ir.ui.view', 'read', [view_id], ['active', 'name', 'xml_id'])
            if not view:
                print(f"❌ No se encontró la vista {view_id}.")
                continue

            validation = view[0]
            if not validation['active']:
                print(f"   Vista {view_id} ya estaba desactivada.")
                continue

            # Deactivate
            odoo_client.execute('ir.ui.view', 'write', [view_id], {'active': False})
            print(f"✅ Vista {view_id} ({validation.get('xml_id')}) desactivada.")

        except Exception as e:
            print(f"🚨 Error desactivando vista {view_id}: {e}")
    
    print("✨ Limpieza completada. Odoo debería ser más estable ahora.")

if __name__ == "__main__":
    disable_all_broken_tbai_views()
