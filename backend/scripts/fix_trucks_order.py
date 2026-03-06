import sqlite3
import json
import sys
import os

sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

def fix_order():
    conn = sqlite3.connect('backend/zerain.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM trucks")
    trucks = [dict(r) for r in c.fetchall()]

    # Category Priority
    cat_priority = {
        'TRAILER': 50,
        'GRUA_PESADA': 40,
        'RIGIDO': 30,
        'GRUA_LIGERA': 20,
        'FURGONETA': 10,
    }

    def get_score(t):
        score = cat_priority.get(t['category'], 0) * 1000
        score += (t['max_weight'] or 0)
        score += (t['axles'] or 0) * 100
        if t['has_crane']: score += 500
        if t['has_jib']: score += 200
        return score

    # Sort DESC (most powerful first)
    sorted_trucks = sorted(trucks, key=get_score, reverse=True)

    from services.odoo_service import odoo_client
    if not odoo_client.uid: odoo_client.connect()

    print("Calculated Order:")
    for i, t in enumerate(sorted_trucks):
        order_val = (i + 1) * 10
        print(f"{order_val}: {t['plate']} - {t['alias']} ({t['category']}) - Score: {get_score(t)}")
        c.execute("UPDATE trucks SET display_order = ? WHERE id = ?", (order_val, t['id']))
        
        # Sync to Odoo
        if t['id'].isdigit():
            truck_data = dict(t)
            truck_data['display_order'] = order_val
            odoo_client.update_vehicle(t['id'], truck_data)
    
    conn.commit()
    conn.close()
    print("\n✅ Truck order updated in local database and synced to Odoo.")

if __name__ == "__main__":
    fix_order()
