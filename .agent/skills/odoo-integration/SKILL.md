---
name: odoo-integration
description: Odoo ERP XML-RPC patterns, fleet module, sale orders, and best practices for integration
---

# Odoo Integration

## Core Principles

Odoo integration requires understanding **Odoo's ORM**, **XML-RPC protocol**, and **module architecture**. Key principles:

1. **Use API, Not Direct DB**: Always use XML-RPC for writes
2. **Batch Operations**: Minimize API calls for performance
3. **Follow Odoo Conventions**: Use standard fields when possible
4. **Cache Wisely**: Cache read-only data, sync transactional data
5. **Handle Errors Gracefully**: Odoo errors can be cryptic

---

## XML-RPC Authentication

### Basic Connection
```python
import xmlrpc.client

class OdooClient:
    def __init__(self, url, db, username, password):
        self.url = url
        self.db = db
        self.username = username
        self.password = password
        
        # Connect to common endpoint
        self.common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
        
        # Authenticate
        self.uid = self.common.authenticate(db, username, password, {})
        
        if not self.uid:
            raise Exception("Authentication failed")
        
        # Connect to object endpoint
        self.models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
    
    def execute(self, model, method, *args, **kwargs):
        """Execute Odoo method"""
        return self.models.execute_kw(
            self.db, self.uid, self.password,
            model, method, args, kwargs
        )
```

### Error Handling
```python
def safe_execute(self, model, method, *args, **kwargs):
    """Execute with error handling"""
    try:
        return self.execute(model, method, *args, **kwargs)
    except xmlrpc.client.Fault as e:
        # Odoo returns faults for business logic errors
        logger.error(f"Odoo Fault: {e.faultString}")
        return None
    except Exception as e:
        logger.error(f"Connection error: {e}")
        return None
```

---

## Common Operations

### Search
```python
# Find all active customers
customer_ids = client.execute('res.partner', 'search', [
    ['customer_rank', '>', 0],
    ['active', '=', True]
])

# Find vehicles with crane
vehicle_ids = client.execute('fleet.vehicle', 'search', [
    ['category_id.name', 'ilike', 'grua']
])
```

### Read
```python
# Read specific fields
customers = client.execute('res.partner', 'read', customer_ids, {
    'fields': ['name', 'email', 'phone']
})

# Search and read in one call (more efficient)
customers = client.execute('res.partner', 'search_read', [
    [['customer_rank', '>', 0]]
], {
    'fields': ['name', 'email', 'phone'],
    'limit': 100
})
```

### Create
```python
# Create new partner
partner_id = client.execute('res.partner', 'create', {
    'name': 'Transportes Ejemplo S.L.',
    'customer_rank': 1,
    'email': 'info@ejemplo.com',
    'phone': '+34 945 123 456'
})
```

### Update
```python
# Update single record
client.execute('res.partner', 'write', [partner_id], {
    'phone': '+34 945 999 888'
})

# Batch update
client.execute('res.partner', 'write', [id1, id2, id3], {
    'active': False
})
```

### Delete
```python
# Soft delete (set active=False) - PREFERRED
client.execute('res.partner', 'write', [partner_id], {'active': False})

# Hard delete - USE WITH CAUTION
client.execute('res.partner', 'unlink', [partner_id])
```

---

## Odoo Fleet Module

### Vehicle Management
```python
# Get all vehicles
vehicles = client.execute('fleet.vehicle', 'search_read', [[]], {
    'fields': ['license_plate', 'model_id', 'driver_id', 'state_id', 
               'category_id', 'description', 'color']
})

# Create vehicle
vehicle_id = client.execute('fleet.vehicle', 'create', {
    'license_plate': '1234-ABC',
    'model_id': model_id,  # Must exist
    'category_id': category_id,  # Must exist
    'driver_id': driver_id,  # Optional
    'description': 'ITV: 2026-12-31 | MANT: 2026-06-30'
})

# Update vehicle description (for technical data)
client.execute('fleet.vehicle', 'write', [vehicle_id], {
    'description': 'ITV: 2026-12-31 | MANT: 2026-06-30 | CARGA: 12000 | LARGO: 7.5'
})
```

### Vehicle Categories
```python
# Get or create category
def get_or_create_category(client, name):
    cat_ids = client.execute('fleet.vehicle.model.category', 'search', [
        ['name', '=', name]
    ])
    
    if cat_ids:
        return cat_ids[0]
    else:
        return client.execute('fleet.vehicle.model.category', 'create', {
            'name': name
        })

# Example: 2ejes_grua
category_id = get_or_create_category(client, '2ejes_grua')
```

---

## Sale Order Management

### Creating Transport Orders
```python
# 1. Get or create transport product
product_ids = client.execute('product.product', 'search', [
    ['name', '=', 'Servicio de Transporte']
])

if not product_ids:
    product_id = client.execute('product.product', 'create', {
        'name': 'Servicio de Transporte',
        'type': 'service',
        'list_price': 100.0,
        'standard_price': 50.0
    })
else:
    product_id = product_ids[0]

# 2. Create sale order
order_vals = {
    'partner_id': customer_id,
    'client_order_ref': 'Transport Request #123',
    'order_line': [
        # Product line
        (0, 0, {
            'product_id': product_id,
            'name': 'Transport: Vitoria → Bilbao',
            'product_uom_qty': 1,
            'price_unit': 150.0
        }),
        # Transport details as note
        (0, 0, {
            'display_type': 'line_note',
            'name': f'''FECHA: {date}
ORIGEN: {origin}
DESTINO: {destination}
CAMION (Matricula): {plate}
CONDUCTOR: {driver}
CARGA: {weight}kg
KM HASTA ORIGEN: {km_to_origin}
KM CONDUCCION (A-B): {km}'''
        })
    ],
    'note': f'Additional notes: {notes}'
}

order_id = client.execute('sale.order', 'create', order_vals)
```

### Parsing Transport Data from Orders
```python
def parse_transport_notes(order_lines):
    """Extract transport data from order line notes"""
    data = {
        'origin': '', 'dest': '', 'plate': '', 'driver': '',
        'load': '', 'date': '', 'km': 0, 'km_to_origin': 0
    }
    
    for line in order_lines:
        if line.get('display_type') == 'line_note':
            name = line.get('name', '')
            
            if 'FECHA:' in name:
                data['date'] = name.split('FECHA:')[1].split('\n')[0].strip()
            if 'ORIGEN:' in name:
                data['origin'] = name.split('ORIGEN:')[1].split('\n')[0].strip()
            if 'DESTINO:' in name:
                data['dest'] = name.split('DESTINO:')[1].split('\n')[0].strip()
            if 'CAMION (Matricula):' in name:
                data['plate'] = name.split('CAMION (Matricula):')[1].split('\n')[0].strip()
            if 'CONDUCTOR:' in name:
                data['driver'] = name.split('CONDUCTOR:')[1].split('\n')[0].strip()
            if 'CARGA:' in name:
                data['load'] = name.split('CARGA:')[1].split('\n')[0].strip()
            if 'KM HASTA ORIGEN:' in name:
                try:
                    data['km_to_origin'] = float(name.split('KM HASTA ORIGEN:')[1].split()[0])
                except:
                    pass
            if 'KM CONDUCCION (A-B):' in name:
                try:
                    data['km'] = float(name.split('KM CONDUCCION (A-B):')[1].split()[0])
                except:
                    pass
    
    return data
```

---

## Partner Management

### Customer Tagging
```python
# Get or create tag
def get_or_create_tag(client, tag_name, color=0):
    tag_ids = client.execute('res.partner.category', 'search', [
        ['name', '=', tag_name]
    ])
    
    if tag_ids:
        return tag_ids[0]
    else:
        return client.execute('res.partner.category', 'create', {
            'name': tag_name,
            'color': color  # 0-11 for Odoo color palette
        })

# Add tag to partner
vip_tag_id = get_or_create_tag(client, 'VIP', color=1)
client.execute('res.partner', 'write', [partner_id], {
    'category_id': [(4, vip_tag_id, 0)]  # (4, id, 0) = add to many2many
})

# Remove tag
client.execute('res.partner', 'write', [partner_id], {
    'category_id': [(3, vip_tag_id, 0)]  # (3, id, 0) = remove from many2many
})
```

---

## Performance Optimization

### Batch Operations
```python
# BAD: N+1 queries
for vehicle_id in vehicle_ids:
    vehicle = client.execute('fleet.vehicle', 'read', [vehicle_id], {'fields': ['license_plate']})
    print(vehicle[0]['license_plate'])

# GOOD: Single batch read
vehicles = client.execute('fleet.vehicle', 'read', vehicle_ids, {'fields': ['license_plate']})
for vehicle in vehicles:
    print(vehicle['license_plate'])
```

### Chunking Large Operations
```python
def batch_update(client, model, ids, vals, chunk_size=100):
    """Update records in chunks to avoid timeouts"""
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i+chunk_size]
        client.execute(model, 'write', chunk, vals)
        print(f"Updated {len(chunk)} records")
```

### Caching Read-Only Data
```python
import functools
from datetime import datetime, timedelta

@functools.lru_cache(maxsize=128)
def get_product_by_name(client, name):
    """Cache product lookups (products rarely change)"""
    product_ids = client.execute('product.product', 'search', [['name', '=', name]])
    return product_ids[0] if product_ids else None

# Clear cache when needed
get_product_by_name.cache_clear()
```

---

## Decision Framework

### When to Use Custom Fields vs Notes
**Question**: Should I add a custom field or use `description`/`note`?

**Use Custom Fields when:**
- Need to query/filter by this data
- Want automatic UI generation
- Data is structured (dates, numbers, selections)
- Building reports or analytics

**Use Notes when:**
- Unstructured text data
- Display-only information
- Quick implementation (no module needed)
- Data format may change frequently

### Sync Strategy
**Question**: How should I sync data between Odoo and external system?

**Real-Time Sync (API calls):**
- Transactional data (orders, invoices)
- User-initiated actions
- Small data volumes

**Batch Sync (scheduled jobs):**
- Large datasets (all customers, all products)
- Analytics/reporting data
- Non-critical updates

**Hybrid:**
- Real-time for creates/updates
- Batch for initial load and reconciliation

---

## Anti-Patterns

### ❌ Direct Database Access for Writes
**Don't**: `UPDATE fleet_vehicle SET state='active' WHERE id=123`
**Do**: Use XML-RPC API to maintain integrity

### ❌ Ignoring Odoo Domains
**Don't**: Fetch all records and filter in Python
**Do**: Use Odoo domain filters to reduce data transfer

### ❌ Storing Odoo IDs as Strings
**Don't**: `vehicle_id = "123"` (inconsistent types)
**Do**: `vehicle_id = 123` (integer) or convert consistently

### ❌ Not Handling Deleted Records
**Don't**: Assume record exists without checking
**Do**: Check `active` field or handle empty results

---

## Common Odoo Models Reference

| Model | Description | Key Fields |
|-------|-------------|------------|
| `res.partner` | Customers, suppliers | `name`, `email`, `phone`, `customer_rank` |
| `sale.order` | Sales orders | `partner_id`, `state`, `amount_total`, `order_line` |
| `sale.order.line` | Order lines | `product_id`, `name`, `product_uom_qty`, `price_unit` |
| `product.product` | Products | `name`, `type`, `list_price`, `standard_price` |
| `fleet.vehicle` | Vehicles | `license_plate`, `model_id`, `driver_id`, `category_id` |
| `fleet.vehicle.model` | Vehicle models | `name`, `brand_id` |
| `fleet.vehicle.model.category` | Vehicle categories | `name` |
| `hr.employee` | Employees/Drivers | `name`, `identification_id`, `mobile_phone` |
| `account.move` | Invoices | `partner_id`, `state`, `amount_total` |

---

## Example: Complete Integration Flow

```python
# 1. Initialize client
client = OdooClient(
    url='https://your-odoo.com',
    db='your-database',
    username='admin',
    password='password'
)

# 2. Fetch vehicles
vehicles = client.execute('fleet.vehicle', 'search_read', [[]], {
    'fields': ['license_plate', 'category_id', 'description']
})

# 3. Parse technical data from description
for vehicle in vehicles:
    notes = vehicle.get('description', '')
    
    # Extract ITV date
    import re
    itv_match = re.search(r'ITV:\s*([^\|]+)', notes)
    if itv_match:
        vehicle['itv_expiration'] = itv_match.group(1).strip()

# 4. Create sale order
order_id = client.execute('sale.order', 'create', {
    'partner_id': customer_id,
    'order_line': [(0, 0, {
        'product_id': product_id,
        'name': 'Transport Service',
        'product_uom_qty': 1,
        'price_unit': 150.0
    })]
})

# 5. Confirm order
client.execute('sale.order', 'action_confirm', [order_id])
```
