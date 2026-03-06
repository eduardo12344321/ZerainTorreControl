import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def cleanup_broken_actions():
    print("🔍 Buscando acciones y menús rotos...")
    try:
        # 1. Inspect the specific action from the error
        target_action_id = 609
        print(f"--- Inspeccionando Acción {target_action_id} ---")
        action = odoo_client.execute('ir.actions.act_window', 'read', [target_action_id], ['name', 'res_model', 'xml_id'])
        if action:
            print(f"✅ Acción encontrada: {action[0]['name']} | Modelo: {action[0]['res_model']} | XML: {action[0].get('xml_id')}")
        else:
            print(f"❌ No se encontró la acción {target_action_id} en ir.actions.act_window.")

        # 2. Find all actions pointing to missing models (DMS, TicketBAI)
        # We'll look for res_model starting with 'dms.' or 'tbai.'
        missing_prefixes = ['dms.', 'tbai.']
        broken_actions = []
        for prefix in missing_prefixes:
            ids = odoo_client.execute('ir.actions.act_window', 'search', [('res_model', 'ilike', prefix)])
            broken_actions.extend(ids)
        
        if broken_actions:
            print(f"✅ Encontradas {len(broken_actions)} acciones apuntando a modelos posiblemente inexistentes.")
            # For safety, let's just deactivate them first
            # odoo_client.execute('ir.actions.act_window', 'write', broken_actions, {'binding_model_id': False}) 
            # Actually, deactivating the menu items is often more effective to stop users from clicking them
        
        # 3. Find menu items pointing to these actions
        menu_domain = [('action', 'ilike', 'ir.actions.act_window,')] # This is tricky to filter by action id via XML-RPC sometimes
        # Let's search by name or xml_id if possible, or just look at all menus and filter in python
        all_menus = odoo_client.execute('ir.ui.menu', 'search_read', [], ['id', 'name', 'action', 'parent_id', 'xmlid'])
        
        menus_to_deactivate = []
        for m in all_menus:
            action_str = m.get('action') or ""
            if any(f",{aid}" in action_str for aid in broken_actions) or str(target_action_id) in action_str:
                menus_to_deactivate.append(m['id'])
                print(f"🗑️ Menú marcado: {m['name']} (ID: {m['id']}) -> Acción: {action_str}")
            
            # Also check for DMS/TicketBAI in name as a fallback
            if any(p.upper() in (m.get('name') or "").upper() for p in ['DMS', 'TICKETBAI', 'TBAI']):
                if m['id'] not in menus_to_deactivate:
                    menus_to_deactivate.append(m['id'])
                    print(f"🗑️ Menú marcado (por nombre): {m['name']} (ID: {m['id']})")

        if menus_to_deactivate:
            print(f"🔧 Desactivando {len(menus_to_deactivate)} menús...")
            odoo_client.execute('ir.ui.menu', 'write', menus_to_deactivate, {'active': False})
            print("✅ Menús desactivados.")

    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    cleanup_broken_actions()
