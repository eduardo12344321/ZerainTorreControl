import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def disable_views_tbai_partner():
    # IDs found that reference tbai_enabled in res.partner or related
    view_ids = [1834] 
    
    for view_id in view_ids:
        print(f"🔧 Desactivando vista ID {view_id}...")
        try:
            # Check if it exists and is active
            view = odoo_client.execute('ir.ui.view', 'read', [view_id], ['active', 'name', 'xml_id'])
            if not view:
                print(f"❌ No se encontró la vista {view_id}.")
                continue

            validation = view[0]
            print(f"   Vista: {validation['name']} ({validation.get('xml_id')}) | Activa: {validation['active']}")
            
            if not validation['active']:
                print("⚠️ La vista ya está desactivada.")
                continue

            # Deactivate
            odoo_client.execute('ir.ui.view', 'write', [view_id], {'active': False})
            print(f"✅ Vista {view_id} desactivada correctamente.")

        except Exception as e:
            print(f"🚨 Error desactivando vista {view_id}: {e}")
    
    print("🚀 Prueba ahora a abrir Clientes.")

if __name__ == "__main__":
    disable_views_tbai_partner()
