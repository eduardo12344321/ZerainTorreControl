
import os
import sys

# Add backend to path to import services
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
from services.odoo_service import OdooClient

load_dotenv('backend/.env')

def hard_delete_customers():
    client = OdooClient()
    print("Conectando a Odoo para ELIMINACIÓN PERMANENTE de clientes...")
    
    # Buscamos todos los clientes activos e inactivos (para borrar TODO)
    # Filtramos por los que son clientes (customer_rank > 0)
    partner_ids = client.execute('res.partner', 'search', [
        ('customer_rank', '>', 0),
        '|', ('active', '=', True), ('active', '=', False)
    ])
    
    print(f"Encontrados {len(partner_ids)} clientes para eliminar físicamente.")
    
    if not partner_ids:
        print("No hay clientes que eliminar.")
        return

    confirm = input("¿Estás SEGURO de que quieres BORRAR PERMANENTEMENTE estos clientes? (Escribe 'BORRAR'): ")
    if confirm != 'BORRAR':
        print("Eliminación cancelada.")
        return

    # Odoo usa el método 'unlink' para borrado físico (permanente)
    try:
        # Nota: unlink puede fallar si el cliente tiene facturas o pedidos vinculados por integridad referencial
        res = client.execute('res.partner', 'unlink', partner_ids)
        if res:
            print(f"✅ Se han eliminado físicamente {len(partner_ids)} clientes.")
        else:
            print("No se pudo completar la eliminación.")
    except Exception as e:
        print(f"❌ Error durante la eliminación: {e}")
        print("Nota: Si los clientes tienen facturas o pedidos en Odoo, el sistema no permite borrarlos físicamente por seguridad.")

if __name__ == "__main__":
    hard_delete_customers()
