
import os
import sys

# Add parent directory to path to import local modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

data_text = """
CL-276
Zerain Client 205 SL
contacto_205@empresa1.es
ZE
CL-277
Zerain Client 206 SL
contacto_206@empresa2.es
ZE
CL-278
Zerain Client 207 SL
contacto_207@empresa3.es
ZE
CL-279
Zerain Client 208 SL
contacto_208@empresa4.es
ZE
CL-280
Zerain Client 209 SL
contacto_209@empresa5.es
ZE
CL-281
Zerain Client 210 SL
contacto_210@empresa6.es
ZE
CL-282
Zerain Client 211 SL
contacto_211@empresa7.es
ZE
CL-283
Zerain Client 212 SL
contacto_212@empresa8.es
ZE
CL-284
Zerain Client 213 SL
contacto_213@empresa9.es
ZE
CL-285
Zerain Client 214 SL
contacto_214@empresa10.es
ZE
CL-286
Zerain Client 215 SL
contacto_215@empresa11.es
"""

def import_customers():
    lines = [line.strip() for line in data_text.strip().split('\n') if line.strip()]
    
    # Flexible parsing: blocks of 4 or remaining lines for the last one
    customers = []
    current_cust = {}
    for i, line in enumerate(lines):
        mod = i % 4
        if mod == 0: current_cust['ref'] = line
        elif mod == 1: current_cust['name'] = line
        elif mod == 2: current_cust['email'] = line
        elif mod == 3: 
            current_cust['internal_notes'] = line
            customers.append(current_cust)
            current_cust = {}
    
    # Add last if incomplete but has name
    if current_cust and 'name' in current_cust:
        if 'internal_notes' not in current_cust: current_cust['internal_notes'] = "ZE"
        customers.append(current_cust)

    print(f"Parsed {len(customers)} customers from text.")
    
    if not odoo_client.connect():
        print("Failed to connect to Odoo.")
        return

    success_count = 0
    for cust in customers:
        try:
            # Check if exists
            existing = odoo_client.execute('res.partner', 'search', [
                ['name', '=', cust['name']]
            ])
            
            odoo_data = {
                'name': cust['name'],
                'email': cust['email'],
                'ref': cust['ref'],
                'comment': f"Zone: {cust['internal_notes']}",
                'is_company': True,
                'customer_rank': 1
            }
            
            if existing:
                partner_id = existing[0]
                odoo_client.execute('res.partner', 'write', [partner_id], odoo_data)
                print(f"Updated: {cust['name']} (ID: {partner_id})")
            else:
                partner_id = odoo_client.create_customer(odoo_data)
                print(f"Created: {cust['name']} (ID: {partner_id})")
            
            success_count += 1
        except Exception as e:
            print(f"Error importing {cust['name']}: {e}")

    print(f"\nFinished. Successfully processed {success_count}/{len(customers)} customers.")

if __name__ == "__main__":
    import_customers()
