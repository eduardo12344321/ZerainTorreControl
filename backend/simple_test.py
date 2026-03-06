import xmlrpc.client
try:
    url = 'http://odoo:8069/xmlrpc/2/common'
    db = 'zerain_2026'
    user = 'transporteszerain@gmail.com'
    pwd = 'TorreControl2026!'
    print(f"Testing {url} for DB {db} with user {user}...")
    common = xmlrpc.client.ServerProxy(url)
    uid = common.authenticate(db, user, pwd, {})
    print(f"RESULT: UID={uid}")
    
    if uid:
        # Search for vehicles matching odoo_service.py fields
        fields = [
            'license_plate', 'model_id', 'driver_id', 'state_id',
            'category_id', 'description', 'color'
        ]
        models = xmlrpc.client.ServerProxy(f'http://odoo:8069/xmlrpc/2/object')
        print(f"Searching for fleet.vehicle with fields: {fields}")
        vehicles = models.execute_kw(db, uid, pwd, 'fleet.vehicle', 'search_read', [[['active', '=', True]]], {'fields': fields})
        print(f"Found {len(vehicles)} vehicles")
        for v in vehicles:
            cat = v.get('category_id')
            print(f" - ID: {v.get('id')} | Plate: {v.get('license_plate')} | Cat: {cat}")
except Exception as e:
    print(f"ERROR: {e}")
