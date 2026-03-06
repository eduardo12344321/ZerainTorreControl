
import os
import sys

# Add backend to path to import services
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
from services.odoo_service import OdooClient

load_dotenv('backend/.env')

def wipe_all_notes():
    client = OdooClient()
    print("WARNING: BORRANDO TODAS LAS NOTAS DE CLIENTES EN ODOO...")
    
    # 1. Buscar todos los partners que sean clientes
    partner_ids = client.execute('res.partner', 'search', [('customer_rank', '>', 0)])
    print(f"Encontrados {len(partner_ids)} clientes.")
    
    if not partner_ids:
        return

    # 2. Borrar directamente (set comment to False)
    # Lo hacemos en lotes para no saturar si son muchos, aunque 200 es poco
    client.execute('res.partner', 'write', partner_ids, {'comment': False})
            
    print(f"✅ Se han BORRADO las notas de {len(partner_ids)} clientes.")

if __name__ == "__main__":
    wipe_all_notes()
