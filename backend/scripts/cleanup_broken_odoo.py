import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def cleanup_broken_odoo_structure():
    print("🧹 Iniciando limpieza profunda de estructuras rotas en Odoo...")
    try:
        # 1. Find all actions pointing to missing models
        missing_prefixes = ['dms.', 'tbai.', 'l10n_es_aeat.']
        broken_action_ids = []
        for prefix in missing_prefixes:
            ids = odoo_client.execute('ir.actions.act_window', 'search', [('res_model', 'ilike', prefix)])
            broken_action_ids.extend(ids)
        
        # Add the specific one from error if not caught
        if 609 not in broken_action_ids:
            broken_action_ids.append(609)
            
        print(f"✅ Encontradas {len(broken_action_ids)} acciones rotas.")

        # 2. Find all menus
        all_menus = odoo_client.execute('ir.ui.menu', 'search_read', [], ['id', 'name', 'action'])
        
        menus_to_deactivate = []
        for m in all_menus:
            action_val = m.get('action') or ""
            # action field in ir.ui.menu is usually 'ir.actions.act_window,ID'
            if any(f",{aid}" in str(action_val) for aid in broken_action_ids):
                menus_to_deactivate.append(m['id'])
                print(f"🗑️ Menú detectado por acción rota: {m['name']} (ID: {m['id']})")
            
            # Fallback for name-based detection
            elif any(p.upper() in (m.get('name') or "").upper() for p in ['DMS', 'TICKETBAI', 'TBAI', 'DOCUMENTOS']):
                if m['id'] not in menus_to_deactivate:
                    menus_to_deactivate.append(m['id'])
                    print(f"🗑️ Menú detectado por nombre: {m['name']} (ID: {m['id']})")

        if menus_to_deactivate:
            print(f"🔧 Desactivando {len(menus_to_deactivate)} menús...")
            odoo_client.execute('ir.ui.menu', 'write', menus_to_deactivate, {'active': False})
            print("✅ Menús desactivados.")
            
        # 3. Special: Clean up the "Documents" or "DMS" root menus if they exist
        # Sometimes child menus are deactivated but the parent still tries to load something
        
        print("🚀 Limpieza terminada. Odoo debería dejar de intentar cargar modelos inexistentes.")

    except Exception as e:
        print(f"🚨 Error durante la limpieza: {e}")

if __name__ == "__main__":
    cleanup_broken_odoo_structure()
