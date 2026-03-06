import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def cleanup_last_actions():
    action_ids = [665, 650, 661, 660, 664]
    print(f"🔍 Buscando menús para las últimas 5 acciones {action_ids}...")
    try:
        all_menus = odoo_client.execute('ir.ui.menu', 'search_read', [], ['id', 'name', 'action'])
        menus_to_deactivate = []
        for m in all_menus:
            action_val = m.get('action') or ""
            if any(f",{aid}" in str(action_val) for aid in action_ids):
                menus_to_deactivate.append(m['id'])
                print(f"🗑️ Menú detectado: {m['name']} (ID: {m['id']})")

        if menus_to_deactivate:
            print(f"🔧 Desactivando {len(menus_to_deactivate)} menús...")
            odoo_client.execute('ir.ui.menu', 'write', menus_to_deactivate, {'active': False})
            print("✅ Hecho.")
        else:
            print("✨ No se encontraron menús para esas acciones.")

    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    cleanup_last_actions()
