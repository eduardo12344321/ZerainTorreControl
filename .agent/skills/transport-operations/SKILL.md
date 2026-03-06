---
name: transport-operations
description: Load planning, crane operations, delivery workflows, and time estimation for transport services
---

# Transport Operations

## Core Principles

Transport operations require balancing **safety**, **efficiency**, and **customer satisfaction**. Key principles:

1. **Safety First**: Never compromise on load security or crane safety
2. **Accurate Estimation**: Realistic time/cost estimates build trust
3. **Clear Communication**: Document requirements and constraints
4. **Regulatory Compliance**: Follow weight limits, road restrictions
5. **Practical Solutions**: Simple, proven methods > complex optimization

---

## Load Planning

### Weight Distribution
**Goal**: Ensure safe transport and compliance with legal limits

```python
def validate_load(vehicle, load_weight, load_length):
    """Check if load is safe and legal"""
    issues = []
    
    # Check weight capacity
    if load_weight > vehicle['max_weight']:
        issues.append(f"Overweight: {load_weight}kg > {vehicle['max_weight']}kg capacity")
    
    # Check length
    if load_length > vehicle['max_length']:
        issues.append(f"Too long: {load_length}m > {vehicle['max_length']}m capacity")
    
    # Weight distribution warning (rule of thumb: 60% on rear axles)
    if load_weight > vehicle['max_weight'] * 0.8:
        issues.append("WARNING: Near capacity, ensure proper weight distribution")
    
    return issues if issues else ["Load is safe and legal"]
```

### Load Securing
**Requirements by Load Type:**

| Load Type | Securing Method | Accessories |
|-----------|----------------|-------------|
| Palletized goods | Straps + corner protectors | 4-6 straps, protectors |
| Long materials (beams, pipes) | Chains + chocks | 2-4 chains, wooden chocks |
| Machinery | Chains + wheel chocks | Heavy chains, chocks, tarps |
| Loose materials | Tarp + net | Tarp, cargo net, bungees |

**Checklist:**
- [ ] Load centered on platform
- [ ] Weight distributed evenly
- [ ] Straps/chains tight (no slack)
- [ ] Sharp edges protected
- [ ] Load doesn't exceed vehicle dimensions
- [ ] Tarp secured if required

---

## Crane Operations

### Crane Capacity
**Understanding Crane Ratings:**

```
Crane capacity decreases with reach:
- At 2m reach: 12 tons
- At 4m reach: 6 tons
- At 6m reach: 4 tons
- At 8m reach: 3 tons (with jib)
```

**Safety Margin**: Always use 80% of rated capacity

```python
def check_crane_capacity(crane_rating, reach_meters, load_weight):
    """Verify crane can safely lift load at given reach"""
    # Simplified capacity curve (real curves are more complex)
    capacity_at_reach = crane_rating / (1 + (reach_meters / 2))
    safe_capacity = capacity_at_reach * 0.8  # 80% safety margin
    
    if load_weight > safe_capacity:
        return False, f"Unsafe: {load_weight}kg > {safe_capacity}kg safe capacity at {reach_meters}m"
    else:
        return True, f"Safe: {load_weight}kg < {safe_capacity}kg safe capacity"
```

### Crane Safety Requirements
**Pre-Operation Checklist:**
- [ ] Certified operator present
- [ ] Ground is level and stable
- [ ] Outriggers fully extended
- [ ] Load weight known and within capacity
- [ ] Rigging inspected (slings, hooks)
- [ ] Area clear of people and obstacles
- [ ] Weather conditions acceptable (wind < 40 km/h)

**Prohibited Actions:**
- ❌ Lifting people
- ❌ Dragging loads
- ❌ Swinging loads over people
- ❌ Operating in high winds
- ❌ Exceeding rated capacity

---

## Time Estimation

### Delivery Time Components
```python
def estimate_delivery_time(order, vehicle):
    """Calculate realistic delivery time"""
    
    # 1. Preparation time (loading at origin)
    prep_time = 30  # Base: 30 minutes
    if order['requires_crane']:
        prep_time += 45  # Crane setup + operation
    if order['load_weight'] > 5000:
        prep_time += 15  # Heavy loads take longer
    
    # 2. Driving time (use Google Maps API)
    driving_time = get_driving_time(order['origin'], order['destination'])
    
    # 3. Work time (unloading at destination)
    work_time = 30  # Base: 30 minutes
    if order['requires_crane']:
        work_time += 45  # Crane operation
    if order['accessories']:
        work_time += 15  # Extra time for accessories
    
    # 4. Buffer (10% for unexpected delays)
    total = prep_time + driving_time + work_time
    buffer = total * 0.1
    
    return {
        'prep_minutes': prep_time,
        'driving_minutes': driving_time,
        'work_minutes': work_time,
        'buffer_minutes': int(buffer),
        'total_minutes': int(total + buffer),
        'estimated_hours': round((total + buffer) / 60, 1)
    }
```

### Time Estimation Rules of Thumb
- **Simple delivery** (no crane): 1-2 hours
- **Crane delivery**: 2-4 hours
- **Multi-stop route**: Add 45 min per stop
- **Heavy/oversized loads**: Add 25% buffer
- **Urban areas**: Add 15 min for traffic/parking

---

## Delivery Notes (Albaranes)

### Required Information
**Delivery Note Must Include:**
1. **Order Details**
   - Order number
   - Date and time
   - Customer name and address

2. **Transport Details**
   - Origin and destination
   - Vehicle plate
   - Driver name

3. **Load Details**
   - Description of goods
   - Quantity/weight
   - Special requirements (crane, accessories)

4. **Signatures**
   - Driver signature (pickup)
   - Customer signature (delivery)
   - Timestamp

### Proof of Delivery
**Acceptable Proof:**
- Signed delivery note (physical or digital)
- Photo of delivered goods
- GPS timestamp at delivery location
- Customer email confirmation

**Digital Workflow:**
```python
def create_delivery_note(order):
    """Generate delivery note data"""
    return {
        'note_number': f"ALB-{order['id']}",
        'date': datetime.now().isoformat(),
        'customer': order['client_name'],
        'origin': order['origin_address'],
        'destination': order['destination_address'],
        'vehicle': order['truck_plate'],
        'driver': order['driver_name'],
        'goods_description': order['description'],
        'weight': order['load_weight'],
        'requires_crane': order['requires_crane'],
        'status': 'PENDING',  # PENDING → IN_TRANSIT → DELIVERED
        'signature_driver': None,
        'signature_customer': None,
        'delivery_timestamp': None
    }
```

---

## Accessory Management

### Common Accessories
| Accessory | Purpose | Typical Quantity |
|-----------|---------|------------------|
| Straps (5m) | Securing loads | 4-8 per truck |
| Chains (3m) | Heavy loads | 2-4 per truck |
| Corner protectors | Protect straps | 8-12 per truck |
| Tarps (6x8m) | Weather protection | 2 per truck |
| Wooden chocks | Prevent rolling | 4-6 per truck |
| Cargo net | Loose materials | 1 per truck |

### Tracking Accessories
```python
class AccessoryInventory:
    def __init__(self):
        self.inventory = {
            'straps_5m': 8,
            'chains_3m': 4,
            'corner_protectors': 12,
            'tarps_6x8m': 2,
            'wooden_chocks': 6,
            'cargo_net': 1
        }
    
    def check_availability(self, required_accessories):
        """Check if required accessories are available"""
        missing = []
        for item, qty in required_accessories.items():
            if self.inventory.get(item, 0) < qty:
                missing.append(f"{item}: need {qty}, have {self.inventory.get(item, 0)}")
        
        return missing if missing else ["All accessories available"]
    
    def reserve(self, accessories):
        """Reserve accessories for delivery"""
        for item, qty in accessories.items():
            self.inventory[item] -= qty
    
    def return_items(self, accessories):
        """Return accessories after delivery"""
        for item, qty in accessories.items():
            self.inventory[item] += qty
```

---

## Cost Calculation

### Pricing Components
```python
def calculate_delivery_cost(order, vehicle):
    """Estimate delivery cost"""
    
    # 1. Base rate (by vehicle type)
    base_rates = {
        '1eje': 80,   # €/hour
        '2ejes': 100,
        '3ejes': 120
    }
    base_rate = base_rates.get(vehicle['category'], 100)
    
    # 2. Time cost
    time_estimate = estimate_delivery_time(order, vehicle)
    time_cost = (time_estimate['total_minutes'] / 60) * base_rate
    
    # 3. Distance cost (fuel)
    fuel_cost = calculate_fuel_cost(order['km'] + order['km_to_origin'], vehicle['category'])
    
    # 4. Crane surcharge
    crane_cost = 50 if order['requires_crane'] else 0
    
    # 5. Accessory costs
    accessory_cost = len(order.get('accessories', [])) * 5  # €5 per accessory
    
    # 6. Total
    subtotal = time_cost + fuel_cost + crane_cost + accessory_cost
    
    # 7. Margin (20%)
    margin = subtotal * 0.2
    
    total = subtotal + margin
    
    return {
        'time_cost': round(time_cost, 2),
        'fuel_cost': round(fuel_cost, 2),
        'crane_cost': crane_cost,
        'accessory_cost': accessory_cost,
        'subtotal': round(subtotal, 2),
        'margin': round(margin, 2),
        'total': round(total, 2)
    }
```

---

## Decision Framework

### Crane Requirement
**Question**: Does this delivery need a crane?

**Requires Crane if:**
- Load weight > 500 kg AND no forklift at destination
- Load is machinery or equipment
- Unloading height > 1.5m
- Customer specifically requests crane

**No Crane if:**
- Palletized goods with forklift available
- Light loads (< 500 kg) that can be hand-unloaded
- Delivery to warehouse with loading dock

### Accessory Selection
**Question**: What accessories are needed?

**Decision Tree:**
```
Load Type?
├─ Palletized → Straps (4-6) + Corner protectors (8)
├─ Long materials → Chains (2-4) + Chocks (4)
├─ Machinery → Chains (4) + Chocks (6) + Tarp
└─ Loose materials → Tarp + Cargo net

Weather?
├─ Rain/Snow → Add tarp
└─ Dry → Tarp optional

Load Value?
├─ High value → Add extra protection (tarp, padding)
└─ Standard → Standard accessories
```

---

## Anti-Patterns

### ❌ Underestimating Time
**Don't**: Promise 2-hour delivery for complex crane operation
**Do**: Add realistic buffers for crane setup, traffic, delays

### ❌ Overloading Vehicles
**Don't**: "It's only 200kg over, it'll be fine"
**Do**: Respect weight limits strictly (safety + legal)

### ❌ Skipping Load Securing
**Don't**: "It's a short trip, we don't need straps"
**Do**: Always secure loads properly, regardless of distance

### ❌ Poor Communication
**Don't**: Arrive at delivery site without confirming crane access
**Do**: Call ahead to verify access, unloading equipment, contact person

---

## Integration Points

### With Fleet Management
- Vehicle capacity → load validation
- Crane availability → assignment decisions
- Accessory inventory → delivery planning

### With Route Optimization
- Time estimates → route feasibility
- Crane operations → time window constraints
- Multi-stop deliveries → accessory allocation

### With Odoo
- Delivery notes → sale order documentation
- Proof of delivery → invoice triggers
- Accessory usage → inventory tracking

---

## Example Scenarios

### Scenario 1: Machinery Delivery
**Order**: 8-ton CNC machine, Vitoria → Bilbao factory

**Analysis:**
```
Load Requirements:
- Weight: 8,000 kg ✓ (within 12T truck capacity)
- Dimensions: 3m x 2m x 2m ✓ (fits on platform)
- Crane: Required (heavy machinery)

Vehicle Selection:
- Truck: 2ejes_grua (12T capacity, crane available)
- Crane capacity at 4m reach: 6T (insufficient for 8T)
- Solution: Use 3ejes_grua (20T crane, 10T at 4m reach)

Time Estimate:
- Prep: 30 min (loading) + 60 min (crane setup/operation) = 90 min
- Driving: 50 min (Vitoria → Bilbao)
- Work: 30 min (unloading) + 60 min (crane operation) = 90 min
- Buffer: 23 min (10%)
- Total: 253 min ≈ 4.2 hours

Accessories:
- Heavy chains (4)
- Wooden chocks (6)
- Tarp (weather protection)

Cost Estimate:
- Time: 4.2 hours × €120/hour = €504
- Fuel: 65 km × €0.35/km = €23
- Crane: €50
- Accessories: €15
- Subtotal: €592
- Margin (20%): €118
- Total: €710
```

### Scenario 2: Palletized Goods
**Order**: 12 pallets (4,000 kg total), Vitoria → Pamplona warehouse

**Analysis:**
```
Load Requirements:
- Weight: 4,000 kg ✓ (within 12T capacity)
- Format: Palletized (forklift available at destination)
- Crane: NOT required

Vehicle Selection:
- Truck: 2ejes (12T capacity, no crane needed)

Time Estimate:
- Prep: 45 min (loading 12 pallets)
- Driving: 70 min (Vitoria → Pamplona)
- Work: 30 min (forklift unloading)
- Buffer: 15 min
- Total: 160 min ≈ 2.7 hours

Accessories:
- Straps (6)
- Corner protectors (12)

Cost Estimate:
- Time: 2.7 hours × €100/hour = €270
- Fuel: 90 km × €0.26/km = €23
- Accessories: €10
- Subtotal: €303
- Margin (20%): €61
- Total: €364
```
