import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def disable_view():
    view_id = 1817
    print(f"🔧 Desactivando vista ID {view_id} (l10n_es_aeat.view_partner_form)...")
    try:
        # Check if it exists and is active
        view = odoo_client.execute('ir.ui.view', 'read', [view_id], ['active', 'name'])
        if not view:
            print("❌ No se encontró la vista.")
            return

        validation = view[0]
        print(f"   Vista actual: {validation['name']} | Activa: {validation['active']}")
        
        if not validation['active']:
            print("⚠️ La vista ya está desactivada.")
            return

        # Deactivate
        odoo_client.execute('ir.ui.view', 'write', [view_id], {'active': False})
        print("✅ Vista desactivada correctamente.")
        print("🚀 Prueba ahora a abrir la pestaña de Clientes.")

    except Exception as e:
        print(f"🚨 Error desactivando vista: {e}")

if __name__ == "__main__":
    disable_view()
