import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def find_broken_view():
    print("🔍 Buscando vistas rotas en Odoo...")
    try:
        # Search for views of model 'res.partner' that contain the bad field name
        # We need to search in 'arch_db'
        domain = [
            ('model', '=', 'res.partner'),
            ('arch_db', 'ilike', 'aeat_sending_enabled')
        ]
        
        views = odoo_client.execute('ir.ui.view', 'search_read', domain, ['id', 'name', 'xml_id', 'arch_db', 'active'])
        
        if not views:
            print("❌ No se encontraron vistas que contengan 'aeat_sending_enabled'.")
            return
            
        print(f"✅ Encontradas {len(views)} vistas problemáticas:")
        for v in views:
            print(f"   ID: {v['id']} | Nombre: {v['name']} | XML ID: {v.get('xml_id')} | Activo: {v['active']}")
            # print(f"   Contenido: {v['arch_db'][:100]}...")

        # Offer to fix
        if views:
            print("\n💡 Opciones de arreglo:")
            print("1. Desactivar vista(s)")
            print("2. Intentar parchear (quitar el campo)")
            
            # For now, let's just list them. We can act in a second step or ask user.
            
    except Exception as e:
        print(f"🚨 Error buscando vistas: {e}")

if __name__ == "__main__":
    find_broken_view()
