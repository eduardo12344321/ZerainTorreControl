import os
import sys
import json
from dotenv import load_dotenv

# Setup path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
os.environ["DATABASE_PATH"] = os.path.join(os.getcwd(), 'backend', 'zerain.db')

from backend.database import db

def fix_locations():
    print("Sincronizando billing_address geocodificada con el array de locations...")
    
    with db.get_cursor() as c:
        # Get all customers with geocoded addresses (Ending in España)
        c.execute("SELECT id, billing_address, locations FROM customers WHERE billing_address LIKE '%, España'")
        customers = c.fetchall()
        
        fixed_count = 0
        for cust in customers:
            cust_id = cust['id']
            addr = cust['billing_address']
            
            try:
                locs = json.loads(cust['locations']) if cust['locations'] else []
            except:
                locs = []
            
            # If the geocoded address is not in locations, add it
            if addr not in locs:
                locs.append(addr)
                c.execute("UPDATE customers SET locations = ? WHERE id = ?", (json.dumps(locs), cust_id))
                fixed_count += 1
    
    print(f"Sincronización completada. {fixed_count} clientes actualizados con sus ubicaciones.")

if __name__ == "__main__":
    fix_locations()
