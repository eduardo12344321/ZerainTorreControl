import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def cleanup_meals():
    print("🧹 Iniciando limpieza de 'Comidas' en Odoo...")
    try:
        # Search for Sale Orders that look like meals
        # Criteria: Partner 'Uso Interno' AND Description contains 'Comida' or 'Descanso'
        # OR internal_notes contains matching keywords
        
        # 1. Find 'Uso Interno' partner if possible, or just search by text
        domain = [
            '|', '|',
            ('name', 'ilike', 'Comida'),
            ('client_order_ref', 'ilike', 'Comida'),
            ('note', 'ilike', 'Comida')
        ]
        
        # Also check for 'Descanso'
        domain = ['|'] + domain + [('name', 'ilike', 'Descanso')]
        
        # Be careful not to delete legitimate orders!
        # Let's inspect first.
        orders = odoo_client.execute('sale.order', 'search_read', domain, ['id', 'name', 'partner_id', 'state', 'client_order_ref'])
        
        print(f"Encontrados {len(orders)} posibles pedidos de comida.")
        
        to_delete = []
        for o in orders:
            name = o.get('name', '')
            ref = o.get('client_order_ref', '')
            partner = o.get('partner_id', [0, ''])[1]
            
            # Strict filtering to avoid accidents
            if 'Comida' in name or 'Comida' in ref or 'Descanso' in name or 'Descanso' in ref:
                print(f"🗑️ Marcado para borrar: {o['id']} - {name} ({partner})")
                to_delete.append(o['id'])
                
        if not to_delete:
            print("✨ No se encontraron pedidos para borrar.")
            return

        confirm = input(f"¿Estás seguro de borrar {len(to_delete)} pedidos? (s/n): ")
        if confirm.lower() == 's':
            odoo_client.execute('sale.order', 'unlink', to_delete)
            print("✅ Pedidos eliminados.")
        else:
            print("❌ Operación cancelada.")

    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    cleanup_meals()
