import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def find_broken_view_tbai():
    print("🔍 Buscando vistas rotas para 'tbai_enabled'...")
    try:
        # Search for views using tbai_enabled in their arch
        # The error is in res.config.settings but sometimes inherited views attach there
        domain = [
            # ('model', '=', 'res.config.settings'), # Search globally just in case
            ('arch_db', 'ilike', 'tbai_enabled')
        ]
        
        views = odoo_client.execute('ir.ui.view', 'search_read', domain, ['id', 'name', 'model', 'xml_id', 'active'])
        
        if not views:
            print("❌ No se encontraron vistas.")
            return
            
        print(f"✅ Encontradas {len(views)} vistas problemáticas:")
        for v in views:
            print("-" * 50)
            print(f"ID: {v['id']}")
            print(f"Modelo: {v['model']}")
            print(f"Nombre: {v['name']}")
            print(f"XML ID: {v.get('xml_id')}")
            print(f"Activo: {v['active']}")

    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    find_broken_view_tbai()
