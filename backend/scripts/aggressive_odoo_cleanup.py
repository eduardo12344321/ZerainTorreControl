import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def aggressive_cleanup():
    print("🧨 Iniciando limpieza AGRESIVA de restos de DMS y TicketBAI...")
    try:
        # 1. Deactivate Actions directly
        # Sometimes even if menus are gone, Odoo loads them via favorites or home actions
        action_ids_to_kill = [609]
        
        # Search for all actions pointing to missing models
        broken_models = ['dms.file', 'dms.directory', 'tbai.info', 'l10n_es_aeat.report']
        for model in broken_models:
            ids = odoo_client.execute('ir.actions.act_window', 'search', [('res_model', '=', model)])
            action_ids_to_kill.extend(ids)
            
        action_ids_to_kill = list(set(action_ids_to_kill))
        
        if action_ids_to_kill:
            print(f"🔧 Desactivando {len(action_ids_to_kill)} acciones de ventana...")
            # We can't actually 'write' active=False to all actions easily if they are system-protected,
            # but we can try to change their model to something safe or just delete/deactivate if allowed.
            # In XML-RPC, 'write' on ir.actions.act_window often works.
            odoo_client.execute('ir.actions.act_window', 'write', action_ids_to_kill, {'active': False})
            print(f"✅ Acciones {action_ids_to_kill} desactivadas.")

        # 2. Check for User Home Actions (HOME PAGE)
        # This is a common cause of crash on login
        users_with_broken_home = odoo_client.execute('res.users', 'search', [('action_id', 'in', action_ids_to_kill)])
        if users_with_broken_home:
            print(f"⚠️ Encontrados {len(users_with_broken_home)} usuarios con página de inicio rota. Reseteando a 'Bandeja de entrada'...")
            odoo_client.execute('res.users', 'write', users_with_broken_home, {'action_id': False})
            print("✅ Páginas de inicio reseteadas.")

        # 3. Final Menu sweep
        # Make sure no menus are left pointing to these
        menus = odoo_client.execute('ir.ui.menu', 'search', [('action', 'ilike', 'ir.actions.act_window,')])
        broken_menus = []
        for m_id in menus:
            m = odoo_client.execute('ir.ui.menu', 'read', [m_id], ['action'])[0]
            act_str = m.get('action') or ""
            if any(f",{aid}" in act_str for aid in action_ids_to_kill):
                broken_menus.append(m_id)
        
        if broken_menus:
            print(f"🔧 Desactivando {len(broken_menus)} menús residuales...")
            odoo_client.execute('ir.ui.menu', 'write', broken_menus, {'active': False})
            print("✅ Menús desactivados.")

        print("🚀 Limpieza agresiva completada. Por favor, refresca Odoo por completo (F5).")

    except Exception as e:
        print(f"🚨 Error durante limpieza agresiva: {e}")

if __name__ == "__main__":
    aggressive_cleanup()
