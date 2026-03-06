import xmlrpc.client
import os
import logging

logger = logging.getLogger(__name__)

class OdooClient:
    def __init__(self):
        self.url = os.getenv("ODOO_URL")
        self.db = os.getenv("ODOO_DB")
        self.username = os.getenv("ODOO_EMAIL") or os.getenv("ODOO_USER")
        self.password = os.getenv("ODOO_API_KEY") or os.getenv("ODOO_PASSWORD")
        self.uid = None

    def connect(self):
        """Authenticate with Odoo and store UID."""
        # Refresh env if missing
        if not self.url or not self.username:
            from config import env_path
            from dotenv import load_dotenv
            load_dotenv(env_path, override=True)
            self.url = os.getenv("ODOO_URL")
            self.db = os.getenv("ODOO_DB")
            self.username = os.getenv("ODOO_EMAIL") or os.getenv("ODOO_USER")
            
        apiKey = os.getenv("ODOO_API_KEY")
        password = os.getenv("ODOO_PASSWORD")
            
        if not self.url or not self.username or (not apiKey and not password):
             logger.error(f"Odoo credentials incomplete")
             return False

        try:
            common = xmlrpc.client.ServerProxy(f'{self.url}/xmlrpc/2/common')
            
            # Try with API Key first
            if apiKey:
                logger.info(f"Connecting to Odoo with API Key...")
                self.uid = common.authenticate(self.db, self.username, apiKey, {})
                if self.uid:
                    self.password = apiKey # The "password" for execute_kw
                    logger.info(f"Connected with API Key (ID: {self.uid})")
                    return True
            
            # Fallback to Password
            if password:
                logger.info(f"Connecting to Odoo with Password...")
                self.uid = common.authenticate(self.db, self.username, password, {})
                if self.uid:
                    self.password = password # The "password" for execute_kw
                    logger.info(f"Connected with Password (ID: {self.uid})")
                    return True
            
            logger.error("Odoo authentication failed (both API Key and Password failed or were missing)")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to Odoo: {str(e)}")
            return False

    def execute(self, model, method, *args, **kwargs):
        """Execute a method on an Odoo model."""
        if not self.uid:
            if not self.connect():
                # raise ConnectionError("Not connected to Odoo")
                return [] # Fail gracefully

        # --- NIF/VAT Normalization for Spain ---
        # If we are writing/creating a partner and there is a 'vat' field, ensure it has 'ES' prefix if it's a Spanish NIF
        if model == 'res.partner' and method in ['create', 'write']:
            # args[0] is usually the ID list for write, or data list for create
            # kwargs might contain the data for create/write
            
            def fix_vat(vals):
                if isinstance(vals, dict) and 'vat' in vals and vals['vat']:
                    vat = str(vals['vat']).strip().upper()
                    # If it looks like a Spanish NIF (8 digits + letter or letter + 8 digits) and no prefix
                    import re
                    # Standard Spanish NIF/CIF pattern: 8 digits + 1 letter OR 1 letter + 8 digits/letters
                    if re.match(r'^[0-9A-Z]{9}$', vat) and not vat.startswith('ES'):
                         vals['vat'] = f"ES{vat}"
                         logger.info(f"OdooService: Normalized VAT to {vals['vat']}")
                return vals

            if method == 'create' and args:
                if isinstance(args[0], list):
                    for i in range(len(args[0])):
                        args[0][i] = fix_vat(args[0][i])
                elif isinstance(args[0], dict):
                    args = (fix_vat(args[0]),) + args[1:]
            
            if method == 'write' and len(args) >= 2:
                # args[0] is IDs, args[1] is vals
                args = (args[0], fix_vat(args[1])) + args[2:]

        # Extract raise_exception if present
        raise_exception = kwargs.pop('raise_exception', False)

        try:
            models = xmlrpc.client.ServerProxy(f'{self.url}/xmlrpc/2/object', allow_none=True)
            return models.execute_kw(
                self.db, 
                self.uid, 
                self.password, 
                model, 
                method, 
                args,  # args is already a tuple
                kwargs
            )
        except Exception as e:
            if "sale.order doesn't exist" not in str(e):
                logger.error(f"Odoo Execution Error ({model}.{method}): {str(e)}")
            if raise_exception:
                raise e
            return []

    # --- Specific Domain Methods ---

    _cache_customers = None
    _cache_customers_time = 0

    def get_customers(self, limit=None, customer_id=None):
        """Fetch partners that are specifically customers and companies."""
        import time
        if self._cache_customers and not customer_id and time.time() - self._cache_customers_time < 300:
            return self._cache_customers

        # Excluding ID 1 (Company) and potentially ID 3 (Administrator) if they have rank
        # Standard filter for actual customers in Odoo
        domain = [
            ['customer_rank', '>', 0], 
            ['active', '=', True],
            # ['is_company', '=', True], # Removed is_company to get all contacts if needed
            ['id', '!=', 1] # Hide the main company record
        ]
        if customer_id:
            domain.append(['id', '=', int(customer_id)])
        fields = [
            'name', 'phone', 'email', 'vat', 'street', 'city', 'zip', 'comment', 
            'website', 'image_128', 'category_id',
            'x_studio_categoria', 'x_studio_facturacion_estimada', 'x_studio_num_empleados',
            'x_studio_fiabilidad', 'x_studio_explicacion', 'x_studio_estado_empresa'
        ]
        partners = self.execute('res.partner', 'search_read', domain, fields=fields, limit=limit)
        
        # Resolve Tags (category_id is M2M, returns list of IDs)
        if partners:
            all_tag_ids = set()
            for p in partners:
                if p.get('category_id'):
                    all_tag_ids.update(p['category_id'])
            
            tag_map = {}
            if all_tag_ids:
                tags = self.execute('res.partner.category', 'read', list(all_tag_ids), ['name', 'color'])
                tag_map = {t['id']: {'name': t['name'], 'color': t.get('color')} for t in tags}
            
            for p in partners:
                p['id'] = str(p['id'])
                p['nif'] = p.get('vat') or ""
                p['billing_address'] = p.get('street') or ""
                p['postal_code'] = p.get('zip') or ""
                p['notes'] = p.get('comment') or ""
                
                # IA Mapping
                p['ai_category'] = p.get('x_studio_categoria') or ""
                p['ai_revenue'] = p.get('x_studio_facturacion_estimada') or ""
                p['ai_employees'] = p.get('x_studio_num_empleados') or ""
                p['ai_reliability'] = p.get('x_studio_fiabilidad') or ""
                p['ai_explanation'] = p.get('x_studio_explicacion') or ""
                p['ai_company_status'] = p.get('x_studio_estado_empresa') or ""

                p['tags'] = []
                for tid in p.get('category_id', []):
                    if tid in tag_map:
                        p['tags'].append(tag_map[tid])
        
        if not customer_id:
            import time
            self._cache_customers = partners
            self._cache_customers_time = time.time()
            
        return partners

    _cache_vehicles = None
    _cache_vehicles_time = 0

    def get_vehicles(self):
        """Fetch vehicles using custom Studio fields for technical data."""
        import time
        if self._cache_vehicles and time.time() - self._cache_vehicles_time < 300:
             return self._cache_vehicles
             
        fields = [
            'license_plate', 'model_id', 'driver_id', 'state_id',
            'category_id', 'description', 'color', 'odometer',
            'x_studio_longitud_maxima_m', 'x_studio_peso_maximo_kg',
            'x_studio_grua', 'x_studio_jib', 'x_studio_caja_cerrada',
            'x_studio_itv', 'x_studio_mantenimiento_inicio', 'x_studio_mantenimiento_final',
            'x_studio_n_ejes', 'x_studio_color', 'x_studio_posicion',
            'x_studio_fec_camb_aceite', 'x_studio_km_ult_camb_aceite',
            'x_studio_fech_camb_ruedas', 'x_studio_km_ult_cam_ruedas'
        ]
        domain = [['active', '=', True]]
        results = self.execute('fleet.vehicle', 'search_read', domain, fields=fields)
        
        mapped_vehicles = []
        for v in results:
            cat_name = (v.get('category_id')[1] if v.get('category_id') else "").lower()
            
            # --- Field-to-Field Mapping (Studio Fields) ---
            weight = v.get('x_studio_peso_maximo_kg')
            length = v.get('x_studio_longitud_maxima_m')
            has_crane = v.get('x_studio_grua') or False
            has_jib = v.get('x_studio_jib') or False
            is_box_body = v.get('x_studio_caja_cerrada') or False
            itv_date = v.get('x_studio_itv') or None
            maint_start = v.get('x_studio_mantenimiento_inicio') or None
            maint_end = v.get('x_studio_mantenimiento_final') or None

            # Backward compatibility: Parse description if fields are empty
            notes_raw = str(v.get('description') or "")
            if not(weight or length or has_crane or has_jib or is_box_body):
                 import re, html
                 notes = html.unescape(re.sub(r'<[^>]+>', '', notes_raw)) if '<' in notes_raw else notes_raw
                 weight_match = re.search(r'CARGA:\s*(\d+)', notes, re.I)
                 length_match = re.search(r'LARGO:\s*([\d\.]+)', notes, re.I)
                 if weight_match: weight = int(weight_match.group(1))
                 if length_match: length = float(length_match.group(1))
                 if 'grua' in notes.lower(): has_crane = True
                 if 'jib' in notes.lower(): has_jib = True
                 if 'caja' in notes.lower(): is_box_body = True

            # Color extraction: Use Studio field if available, fallback to palette, then default
            color_val = v.get('x_studio_color')
            if not color_val:
                odoo_color_idx = v.get('color')
                palette = {
                    1: '#f28b82', 10: '#ccff90', 2: '#fbbc04', 3: '#fff475',
                    4: '#cbf0f8', 5: '#aecbfa', 6: '#d7aefb', 7: '#fdcfe8',
                    8: '#e6c9a8', 9: '#e8eaed', 11: '#abb8c3'
                }
                color_val = palette.get(odoo_color_idx, '#3b82f6')
            
            # Position/Order
            pos = v.get('x_studio_posicion') or 0
            try:
                pos = int(pos)
            except:
                pos = 0

            # Axle extraction from Studio field (Total axles)
            ejes_val = str(v.get('x_studio_n_ejes') or "")
            if '3' in ejes_val: axles = 3
            elif '4' in ejes_val: axles = 4
            else: axles = 2 # Default to 2

            
            mapped_vehicles.append({
                'id': str(v.get('id')),
                'plate': v.get('license_plate'),
                'alias': (v.get('model_id') and v.get('model_id')[1]) or "Vehículo",
                'category': cat_name or 'Sin Categoría',
                'display_order': pos,
                'status': 'AVAILABLE',
                'axles': axles,
                'has_crane': has_crane,
                'has_jib': has_jib,
                'is_box_body': is_box_body,
                'max_weight': weight,
                'max_length': length,
                'itv_expiration': itv_date,
                'maint_start': maint_start,
                'maint_end': maint_end,
                'last_oil_change': v.get('x_studio_fec_camb_aceite') or None,
                'last_oil_change_km': v.get('x_studio_km_ult_camb_aceite') or 0,
                'last_tire_change': v.get('x_studio_fech_camb_ruedas') or None,
                'last_tire_change_km': v.get('x_studio_km_ult_cam_ruedas') or 0,
                'notes': notes_raw,
                'color': color_val,
                'default_driver_id': str(v.get('driver_id')[0]) if v.get('driver_id') else None,
                'odometer': v.get('odometer') or 0
            })

        import time
        self._cache_vehicles = mapped_vehicles
        self._cache_vehicles_time = time.time()
        return mapped_vehicles

    def update_vehicle(self, vehicle_id_str, data):
        """Update a vehicle in Odoo using custom Studio fields."""
        try:
            vehicle_id = int(vehicle_id_str)
            
            def normalize_dt(val):
                if not val: return False
                # Convert ISO (2024-03-15T10:00:00Z) to Odoo (2024-03-15 10:00:00)
                return str(val).replace('T', ' ').split('.')[0].replace('Z', '')

            # Map frontend fields to Odoo Studio fields
            write_vals = {
                'x_studio_peso_maximo_kg': data.get('max_weight'),
                'x_studio_longitud_maxima_m': data.get('max_length'),
                'x_studio_grua': data.get('has_crane'),
                'x_studio_jib': data.get('has_jib'),
                'x_studio_caja_cerrada': data.get('is_box_body'),
                'x_studio_itv': data.get('itv_expiration')[:10] if data.get('itv_expiration') else False,
                'x_studio_mantenimiento_inicio': normalize_dt(data.get('maint_start')),
                'x_studio_mantenimiento_final': normalize_dt(data.get('maint_end')),
                'x_studio_n_ejes': f"{data.get('axles', 2)} Ejes",
                'x_studio_color': data.get('color'),
                'x_studio_posicion': str(data.get('display_order', 0)),
                'x_studio_fec_camb_aceite': data.get('last_oil_change')[:10] if data.get('last_oil_change') else False,
                'x_studio_km_ult_camb_aceite': int(data.get('last_oil_change_km', 0)),
                'x_studio_fech_camb_ruedas': data.get('last_tire_change')[:10] if data.get('last_tire_change') else False,
                'x_studio_km_ult_cam_ruedas': int(data.get('last_tire_change_km', 0))
            }

            # Optional: handle category update if flags changed
            has_crane = data.get('has_crane')
            has_jib = data.get('has_jib')
            is_box_body = data.get('is_box_body')
            axles = data.get('axles', 2)

            def get_or_create_cat(name):
                ids = self.execute('fleet.vehicle.model.category', 'search', [['name', '=', name]])
                return ids[0] if ids else self.execute('fleet.vehicle.model.category', 'create', {'name': name})

            axle_str = f"{axles}ejes"

            cat_parts = [axle_str]
            if has_crane: cat_parts.append("grua")
            if has_jib: cat_parts.append("jib")
            if is_box_body: cat_parts.append("caja")
            
            new_cat_name = "_".join(cat_parts)
            new_cat_id = get_or_create_cat(new_cat_name)
            write_vals['category_id'] = new_cat_id

            # Remove None values to avoid Odoo errors
            write_vals = {k: v for k, v in write_vals.items() if v is not None}

            return self.execute('fleet.vehicle', 'write', [vehicle_id], write_vals)
        except Exception as e:
            logger.error(f"Error updating Odoo vehicle: {e}")
            return False

    _cache_employees = None
    _cache_employees_time = 0

    def get_employees(self):
        """Fetch employees (hr.employee)."""
        import time
        if self._cache_employees and time.time() - self._cache_employees_time < 300:
             return self._cache_employees

        fields = ['name', 'identification_id', 'mobile_phone', 'work_phone', 'work_email', 'active']
        domain = [['active', '=', True]]
        res = self.execute('hr.employee', 'search_read', domain, fields=fields)
        self._cache_employees = res
        self._cache_employees_time = time.time()
        return res

    def create_customer(self, data):
        """Create a partner (res.partner)."""
        # Map simple dictionary to Odoo fields
        # data: {'name': '...', 'email': '...', 'phone': '...', ...}
        # Force customer_rank for Odoo < 13 or similar logic if needed
        if 'customer_rank' not in data:
            data['customer_rank'] = 1
        return self.execute('res.partner', 'create', [data])

    def update_customer(self, customer_id, data):
        """Update a partner (res.partner)."""
        try:
            return self.execute('res.partner', 'write', [int(customer_id)], data)
        except ValueError:
            # Handle non-integer IDs if they exist
            return self.execute('res.partner', 'write', [customer_id], data)

    def delete_customer(self, customer_id):
        """Archive a partner in Odoo (set active=False)."""
        try:
            return self.execute('res.partner', 'write', [int(customer_id)], {'active': False})
        except ValueError:
            return self.execute('res.partner', 'write', [customer_id], {'active': False})

    def create_vehicle(self, data):
        """Create a vehicle (fleet.vehicle)."""
        # data: {'license_plate': '...', 'model_id': int, ...}
        return self.execute('fleet.vehicle', 'create', [data])

    def search_model(self, model_name):
        """Search for a fleet.vehicle.model by name"""
        domain = [['name', 'ilike', model_name]]
        ids = self.execute('fleet.vehicle.model', 'search', domain)
        return ids[0] if ids else None

    def search_brand(self, brand_name):
        """Search for fleet.vehicle.model.brand"""
        domain = [['name', 'ilike', brand_name]]
        ids = self.execute('fleet.vehicle.model.brand', 'search', domain)
        return ids[0] if ids else None

    def log_attendance(self, employee_id, action_type, timestamp_str):
        """
        Sync attendance with Odoo (hr.attendance).
        Mappings:
        - IN: Create record (check_in)
        - MEAL_IN: Find open record, update check_out
        - MEAL_OUT: Create NEW record (check_in)
        - OUT: Find open record, update check_out
        """
        try:
            employee_id = int(employee_id)
            if action_type in ['IN', 'MEAL_OUT']:
                # Create NEW record
                vals = {
                    'employee_id': employee_id,
                    'check_in': timestamp_str
                }
                return self.execute('hr.attendance', 'create', [vals])
            
            elif action_type in ['OUT', 'MEAL_IN']:
                # Find OPEN record (no check_out) for this employee
                domain = [
                    ['employee_id', '=', employee_id],
                    ['check_out', '=', False]
                ]
                open_ids = self.execute('hr.attendance', 'search', domain, order='check_in desc', limit=1)
                
                if open_ids:
                    return self.execute('hr.attendance', 'write', [open_ids[0]], {'check_out': timestamp_str})
                else:
                    # Fallback: if no open record, create one with check_in=check_out (edge case)
                    vals = {
                        'employee_id': employee_id,
                        'check_in': timestamp_str,
                        'check_out': timestamp_str
                    }
                    return self.execute('hr.attendance', 'create', [vals])
        except Exception as e:
            logger.error(f"Error syncing attendance to Odoo: {e}")
            return None

    def get_products(self, limit=100):
        """Fetch products (product.product) excluding generic 1€ items."""
        fields = ['name', 'list_price', 'type', 'default_code', 'description_sale']
        # Filter: Active products with price > 1 (skipping Odoo generic/expense items)
        domain = [
            ['active', '=', True],
            ['list_price', '>', 1.0]
        ]
        products = self.execute('product.product', 'search_read', domain, fields=fields, limit=limit, order='name asc')
        return products

    def get_sale_orders(self, limit=100):
        """Fetch sale orders (sale.order) and their lines, including status fields."""
        try:
            # 1. Fetch Orders
            fields = [
                'name', 'partner_id', 'state', 'date_order', 'amount_total', 
                'amount_untaxed', 'amount_tax', 'order_line', 'invoice_status',
                'user_id', 'payment_term_id', 'validity_date', 'client_order_ref', 'note'
            ]
            domain = [['state', 'in', ['draft', 'sent', 'sale', 'done']]]
            orders = self.execute('sale.order', 'search_read', domain, fields=fields, limit=limit, order='date_order desc')
            
            if not orders:
                return []

            # 2. Batch Fetch Lines
            all_line_ids = []
            partner_ids = set()
            for o in orders:
                all_line_ids.extend(o.get('order_line', []))
                if o.get('partner_id'):
                    partner_ids.add(o['partner_id'][0])
            
            # --- Fetch Partner Tags ---
            partner_tags_map = {}
            if partner_ids:
                partners = self.execute('res.partner', 'search_read', [['id', 'in', list(partner_ids)]], fields=['category_id'])
                all_tag_ids = set()
                p_cat_map = {}
                
                for p in partners:
                    cats = p.get('category_id', [])
                    p_cat_map[p['id']] = cats
                    all_tag_ids.update(cats)
                
                if all_tag_ids:
                    tags = self.execute('res.partner.category', 'read', list(all_tag_ids), ['name', 'color'])
                    tag_details_map = {t['id']: {'name': t['name'], 'color': t.get('color')} for t in tags}
                    
                    for pid, cat_ids in p_cat_map.items():
                        partner_tags_map[pid] = [tag_details_map[tid] for tid in cat_ids if tid in tag_details_map]

            lines_map = {}
            if all_line_ids:
                # Fetch lines in one go
                # Chunking might be needed if > 1000 lines, but for now simple batch
                line_fields = ['order_id', 'name', 'display_type', 'product_uom_qty', 'price_unit', 'product_id']
                lines_data = self.execute('sale.order.line', 'read', all_line_ids, fields=line_fields)
                
                # Group by order_id
                for line in lines_data:
                    oid = line['order_id'][0]
                    if oid not in lines_map: lines_map[oid] = []
                    lines_map[oid].append(line)

            # 3. Attach lines to orders and Parse
            for o in orders:
                o['lines_data'] = lines_map.get(o['id'], [])
                o['parsed_data'] = self._parse_order_lines(o['lines_data'])
                if o.get('partner_id'):
                    o['client_tags'] = partner_tags_map.get(o['partner_id'][0], [])
                else:
                    o['client_tags'] = []

            return orders
        except Exception as e:
            if "sale.order doesn't exist" not in str(e):
                logger.error(f"Error fetching sale orders: {e}")
            return []

    def _parse_order_lines(self, lines):
        """Parse order lines to extract transport data stored in notes."""
        data = {
            'origin': '', 'dest': '', 'plate': '', 'driver': '', 
            'load': '', 'notes': '', 'date': '', 'items': [],
            'vehicle_type': 'TRANSPORT', 'requires_crane': False,
            'crane_height': '', 'accessories': [],
            'prep_time': 0, 'driving_time': 0, 'work_time': 60,
            'estimated_duration': 60, # Default: work_time
            'km': 0, 'km_to_origin': 0,
            'previous_location': '',
            'fecha_part': '', 'hora_part': ''
        }

        
        for l in lines:
            name = str(l.get('name') or '')
            dtype = l.get('display_type')
            
            # 1. Sections
            if dtype == 'line_section':
                data['items'].append({
                    'name': name,
                    'qty': 0,
                    'price': 0,
                    'type': 'section'
                })
                continue

            # 2. Notes
            if dtype == 'line_note':
                # Add to items as note
                data['items'].append({
                    'name': name,
                    'qty': 0,
                    'price': 0,
                    'type': 'note'
                })

                # Try to parse anyway to populate header fields (Header is still useful if available)
                # Try to parse anyway to populate header fields (Header is still useful if available)
                if name.startswith("FECHA:"): data['fecha_part'] = name.split("FECHA:")[1].strip()
                elif name.startswith("HORA:"): data['hora_part'] = name.split("HORA:")[1].strip()
                elif name.startswith("ORIGEN:"): data['origin'] = name.split("ORIGEN:")[1].strip()
                elif name.startswith("DESTINO:"): data['dest'] = name.split("DESTINO:")[1].strip()
                elif name.startswith("CAMION (Matricula):"): data['plate'] = name.split("CAMION (Matricula):")[1].strip()
                elif name.startswith("CONDUCTOR:"): data['driver'] = name.split("CONDUCTOR:")[1].strip()
                elif name.startswith("CARGA:"): data['load'] = name.split("CARGA:")[1].strip()
                elif name.startswith("TIPO VEHICULO:"): data['vehicle_type'] = name.split("TIPO VEHICULO:")[1].strip()
                elif name.startswith("NECESITA GRUA:"): 
                    val = name.split("NECESITA GRUA:")[1].strip().upper()
                    data['requires_crane'] = val in ['SI', 'SÍ', 'YES', 'TRUE']
                elif name.startswith("ALTURA GRUA:"): data['crane_height'] = name.split("ALTURA GRUA:")[1].strip()
                elif name.startswith("ACCESORIOS:"): 
                    acc_str = name.split("ACCESORIOS:")[1].strip()
                    if acc_str and acc_str != '-':
                        data['accessories'] = [x.strip() for x in acc_str.split(',')]
                elif name.startswith("KM HASTA ORIGEN:"):
                    try: data['km_to_origin'] = float(name.split("KM HASTA ORIGEN:")[1].strip().split(' ')[0])
                    except: pass
                elif name.startswith("KM CONDUCCION (A-B):"):
                    try: data['km'] = float(name.split("KM CONDUCCION (A-B):")[1].strip().split(' ')[0])
                    except: pass
                elif name.startswith("DISTANCIA:"): 
                    try: data['km'] = float(name.split("DISTANCIA:")[1].strip().split(' ')[0])
                    except: pass
                elif name.startswith("TIEMPO PREP:"):
                    try: data['prep_time'] = int(name.split("TIEMPO PREP:")[1].strip().split(' ')[0])
                    except: pass
                elif name.startswith("TIEMPO VIAJE:"):
                    try: data['driving_time'] = int(name.split("TIEMPO VIAJE:")[1].strip().split(' ')[0])
                    except: pass
                elif name.startswith("TIEMPO TRABAJO:"):
                    try: data['work_time'] = int(name.split("TIEMPO TRABAJO:")[1].strip().split(' ')[0])
                    except: pass
                elif name.startswith("PREVIO (Desde):"):
                    data['previous_location'] = name.split("PREVIO (Desde):")[1].strip()
                
                continue

            # 3. Products
            # Skip the generic "Servicio: ..." line if possible, or include it
            if "Servicio:" in name: continue
            
            data['items'].append({
                'name': name,
                'qty': l.get('product_uom_qty', 0),
                'price': l.get('price_unit', 0),
                'type': 'product'
            })
        
        # 4. Final calculation
        data['estimated_duration'] = data['prep_time'] + data['driving_time'] + data['work_time']
        
        # Combine date and time
        if data['fecha_part'] and data['fecha_part'] != '-':
            hora = data['hora_part'] if data['hora_part'] and data['hora_part'] != '-' else '08:00'
            # Format: 2024-03-15T08:00:00Z
            data['date'] = f"{data['fecha_part']}T{hora}:00Z"
        
        return data

    def create_sale_order(self, customer_id, transport_data):
        """
        Create a Sale Order (Presupuesto) in Odoo.
        transport_data: {
            'origin': '...', 'dest': '...', 'plate': '...', 
            'driver': '...', 'load': '...', 'notes': '...',
            'date': 'ISO_STRING',
            'description': '...'
        }
        """
        try:
            # 1. Resolve Partner ID
            real_partner_id = False
            if str(customer_id).lower() == 'internal':
                p_ids = self.execute('res.partner', 'search', [['name', '=', 'Uso Interno']])
                if p_ids: real_partner_id = p_ids[0]
                else:
                    real_partner_id = self.execute('res.partner', 'create', {
                        'name': 'Uso Interno',
                        'customer_rank': 0,
                        'comment': 'Cliente para pedidos internos'
                    })
            else:
                try: real_partner_id = int(customer_id)
                except: pass
            
            if not real_partner_id:
                logger.error(f"Could not resolve a valid partner_id for: {customer_id}")
                return None

            # 2. Get product "Pedido" for the line
            product_ids = self.execute('product.product', 'search', [['name', '=', 'Pedido']])
            product_id = product_ids[0] if product_ids else 1 # Fallback
            
            # 3. Split Date and Time
            dt_str = transport_data.get('date', '')
            date_val = "-"
            time_val = "-"
            if dt_str and 'T' in dt_str:
                parts = dt_str.split('T')
                date_val = parts[0]
                time_val = parts[1][:5]
            elif dt_str:
                date_val = dt_str

            # 4. Generate Structured Lines
            lines = [
                # Section: CONCEPTO
                (0, 0, {'display_type': 'line_section', 'name': 'CONCEPTO DEL PEDIDO'}),
                (0, 0, {'display_type': 'line_note', 'name': transport_data.get('description', '-')}),

                # Section: OPERATIVO
                (0, 0, {'display_type': 'line_section', 'name': 'DATOS OPERATIVOS'}),
                (0, 0, {'display_type': 'line_note', 'name': f"FECHA: {date_val}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"HORA: {time_val}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"ORIGEN: {transport_data.get('origin', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"DESTINO: {transport_data.get('dest', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"CAMION (Matricula): {transport_data.get('plate', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"CONDUCTOR: {transport_data.get('driver', '-')}"}),
                
                # Section: DISTANCIAS
                (0, 0, {'display_type': 'line_section', 'name': 'DISTANCIAS'}),
                (0, 0, {'display_type': 'line_note', 'name': f"KM HASTA ORIGEN: {transport_data.get('km_to_origin', 0)} KM"}),
                (0, 0, {'display_type': 'line_note', 'name': f"KM CONDUCCION (A-B): {transport_data.get('km', 0)} KM"}),

                # Section: DETALLES CARGA
                (0, 0, {'display_type': 'line_section', 'name': 'DETALLES DE CARGA'}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIPO VEHICULO: {transport_data.get('vehicle_type', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"NECESITA GRUA: {transport_data.get('requires_crane', 'NO')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"ALTURA GRUA: {transport_data.get('crane_height', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"CARGA: {transport_data.get('load', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"ACCESORIOS: {transport_data.get('accessories', '-')}"}),
                
                # Section: TIEMPOS ESTIMADOS
                (0, 0, {'display_type': 'line_section', 'name': 'TIEMPOS ESTIMADOS'}),
                (0, 0, {'display_type': 'line_note', 'name': f"PREVIO (Desde): {transport_data.get('previous_location', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIEMPO PREP: {transport_data.get('prep_time', 0)} min"}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIEMPO VIAJE: {transport_data.get('driving_time', 0)} min"}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIEMPO TRABAJO: {transport_data.get('work_time', 0)} min"}),

                # Product Line
                (0, 0, {
                    'product_id': product_id,
                    'product_uom_qty': 1.0,
                    'price_unit': 1.0,
                    'name': 'Transporte'
                })
            ]

            # 5. Create Sale Order
            vals = {
                'partner_id': real_partner_id,
                'client_order_ref': transport_data.get('description', '')[:64],
                'order_line': lines
            }
            
            order_id = self.execute('sale.order', 'create', vals)
            logger.info(f"Created Odoo Sale Order {order_id} with structured lines")
            return order_id

        except Exception as e:
            logger.error(f"Failed to create sale order: {e}")
            return None

    def update_sale_order_lines(self, order_id, transport_data):
        """Re-writes lines for an existing Sale Order."""
        try:
            # This is complex in Odoo (usually you unlink lines and recreate them)
            # Find current lines
            order = self.execute('sale.order', 'read', [int(order_id)], fields=['order_line'])
            if not order: return False
            
            line_ids = order[0].get('order_line', [])
            
            # Unlink existing lines
            commands = [(2, lid, 0) for lid in line_ids]
            
            # Add new lines (same logic as create)
            product_ids = self.execute('product.product', 'search', [['name', '=', 'Pedido']])
            product_id = product_ids[0] if product_ids else 1 # Fallback
            
            # Split Date and Time
            dt_str = transport_data.get('date', '')
            date_val = "-"
            time_val = "-"
            if dt_str and 'T' in dt_str:
                parts = dt_str.split('T')
                date_val = parts[0]
                time_val = parts[1][:5]
            elif dt_str:
                date_val = dt_str

            new_lines = [
                # Section: CONCEPTO
                (0, 0, {'display_type': 'line_section', 'name': 'CONCEPTO DEL PEDIDO'}),
                (0, 0, {'display_type': 'line_note', 'name': transport_data.get('description', '-')}),

                # Section: OPERATIVO
                (0, 0, {'display_type': 'line_section', 'name': 'DATOS OPERATIVOS'}),
                (0, 0, {'display_type': 'line_note', 'name': f"FECHA: {date_val}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"HORA: {time_val}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"ORIGEN: {transport_data.get('origin', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"DESTINO: {transport_data.get('dest', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"CAMION (Matricula): {transport_data.get('plate', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"CONDUCTOR: {transport_data.get('driver', '-')}"}),
                
                # Section: DISTANCIAS
                (0, 0, {'display_type': 'line_section', 'name': 'DISTANCIAS'}),
                (0, 0, {'display_type': 'line_note', 'name': f"KM HASTA ORIGEN: {transport_data.get('km_to_origin', 0)} KM"}),
                (0, 0, {'display_type': 'line_note', 'name': f"KM CONDUCCION (A-B): {transport_data.get('km', 0)} KM"}),

                # Section: DETALLES CARGA
                (0, 0, {'display_type': 'line_section', 'name': 'DETALLES DE CARGA'}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIPO VEHICULO: {transport_data.get('vehicle_type', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"NECESITA GRUA: {transport_data.get('requires_crane', 'NO')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"ALTURA GRUA: {transport_data.get('crane_height', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"CARGA: {transport_data.get('load', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"ACCESORIOS: {transport_data.get('accessories', '-')}"}),
                
                # Section: TIEMPOS ESTIMADOS
                (0, 0, {'display_type': 'line_section', 'name': 'TIEMPOS ESTIMADOS'}),
                (0, 0, {'display_type': 'line_note', 'name': f"PREVIO (Desde): {transport_data.get('previous_location', '-')}"}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIEMPO PREP: {transport_data.get('prep_time', 0)} min"}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIEMPO VIAJE: {transport_data.get('driving_time', 0)} min"}),
                (0, 0, {'display_type': 'line_note', 'name': f"TIEMPO TRABAJO: {transport_data.get('work_time', 0)} min"}),

                # Product Line
                (0, 0, {
                    'product_id': product_id,
                    'product_uom_qty': 1.0,
                    'price_unit': 1.0,
                    'name': 'Transporte'
                })
            ]
            
            commands.extend(new_lines)
            return self.execute('sale.order', 'write', [int(order_id)], {
                'order_line': commands,
                'client_order_ref': transport_data.get('description', '')[:64]
            })
        except Exception as e:
            logger.error(f"Error updating Odoo Sale Order lines: {e}")
            return False

    def cancel_sale_order(self, order_id):
        """Cancel a sale order in Odoo."""
        try:
            return self.execute('sale.order', 'action_cancel', [int(order_id)])
        except Exception as e:
            logger.error(f"Error cancelling Odoo Sale Order: {e}")
            return False


# Singleton instance
odoo_client = OdooClient()
