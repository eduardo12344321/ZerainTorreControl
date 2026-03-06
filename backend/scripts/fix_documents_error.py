import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def fix_documents_error():
    field_name = 'documents_binary_max_size'
    print(f"🔍 Buscando vistas rotas para '{field_name}'...")
    try:
        # Search for views
        domain = [('arch_db', 'ilike', field_name)]
        views = odoo_client.execute('ir.ui.view', 'search_read', domain, ['id', 'name', 'model', 'xml_id', 'active'])
        
        if not views:
            print(f"❌ No se encontraron vistas con '{field_name}'.")
            return
            
        print(f"✅ Encontradas {len(views)} vistas:")
        for v in views:
            print("-" * 50)
            print(f"ID: {v['id']}")
            print(f"Modelo: {v['model']}")
            print(f"Nombre: {v['name']}")
            print(f"XML ID: {v.get('xml_id')}")
            print(f"Activo: {v['active']}")
            
            if v['active']:
                print(f"🔧 Desactivando vista {v['id']}...")
                odoo_client.execute('ir.ui.view', 'write', [v['id']], {'active': False})
                print(f"✅ Vista {v['id']} desactivada.")
            else:
                print(f"⚠️ La vista {v['id']} ya estaba desactivada.")

        print("\n🚀 Proceso completado. Intenta abrir los Ajustes en Odoo.")

    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    fix_documents_error()
