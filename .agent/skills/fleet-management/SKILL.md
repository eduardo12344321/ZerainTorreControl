---
name: fleet-management
description: Fleet operations, vehicle lifecycle, maintenance scheduling, and compliance tracking for transport logistics
---

# Fleet Management

## Core Principles

Fleet management balances **operational efficiency**, **safety compliance**, and **cost optimization**. Key principles:

1. **Preventive > Reactive**: Schedule maintenance before breakdowns
2. **Compliance First**: Never compromise on safety (ITV, insurance, permits)
3. **Utilization Balance**: Spread work across fleet to avoid overuse/underuse
4. **Data-Driven**: Track metrics (fuel, maintenance costs, utilization)
5. **Lifecycle Planning**: Plan for acquisition, operation, and retirement

---

## Vehicle Lifecycle

### 1. Acquisition
**Decision Factors:**
- Fleet composition gaps (need more cranes? box bodies?)
- Utilization rates (are existing vehicles maxed out?)
- Cost analysis (purchase vs lease vs rent)
- Regulatory requirements (emissions standards)

**Process:**
1. Identify need based on demand patterns
2. Evaluate options (new, used, lease)
3. Configure vehicle (axles, crane, body type)
4. Register in fleet system (Odoo, local DB)
5. Assign initial maintenance schedule

### 2. Operation
**Daily Management:**
- Assign to orders based on capacity and equipment
- Track location and availability
- Monitor fuel consumption
- Log driver assignments
- Record usage metrics (km, hours, loads)

**Optimization:**
- Balance utilization across fleet
- Minimize empty return trips
- Group deliveries by geographic area
- Match vehicle size to load requirements

### 3. Maintenance
**Types:**
- **Preventive**: Scheduled based on time/km (oil changes, inspections)
- **Predictive**: Based on condition monitoring (tire wear, brake pads)
- **Corrective**: Repairs after breakdowns
- **Compliance**: Mandatory inspections (ITV, emissions)

**Scheduling Strategy:**
```
Priority = (Days Until Due / Warning Threshold) * Criticality Factor

Criticality Factors:
- ITV/Safety: 10 (highest)
- Scheduled Maintenance: 5
- Routine Service: 2
- Cosmetic: 1

Warning Thresholds:
- ITV: 30 days
- Maintenance: 15 days
- Service: 7 days
```

### 4. Retirement
**Triggers:**
- Age threshold (e.g., 15 years for heavy trucks)
- Maintenance cost > 50% of replacement cost
- Regulatory changes (emissions standards)
- Excessive downtime (>30% of year)

**Process:**
1. Evaluate replacement options
2. Plan transition period (overlap with new vehicle)
3. Sell, trade-in, or scrap
4. Archive records for compliance

---

## Vehicle Categorization

### By Axles (Load Capacity)
- **1 Eje** (2 total axles): Light trucks, ~7,500 kg capacity
- **2 Ejes** (3 total axles): Medium trucks, ~12,000 kg capacity  
- **3 Ejes** (4+ total axles): Heavy trucks, ~18,000+ kg capacity

> **Note**: Spanish "Ejes" refers to rear axles. Total axles = Ejes + 1 (front)

### By Equipment
- **Grúa** (Crane): Lifting capacity (e.g., 12T, 20T)
- **Jib**: Crane extension for extra reach
- **Caja** (Box Body): Enclosed cargo area
- **Plataforma** (Flatbed): Open platform

### Combined Categories
Examples: `2ejes_grua`, `1eje_grua_jib`, `3ejes_caja`

---

## Compliance Tracking

### ITV (Inspección Técnica de Vehículos)
**Spain's mandatory vehicle inspection**

**Frequency:**
- New vehicles: First ITV at 4 years
- 4-10 years old: Every 2 years
- 10+ years old: Annually
- Commercial vehicles: More frequent (varies by type)

**Tracking:**
```python
def get_itv_status(expiration_date, warning_days=30):
    days_until = (expiration_date - today).days
    
    if days_until < 0:
        return "EXPIRED - VEHICLE GROUNDED"
    elif days_until < 15:
        return "CRITICAL - Schedule immediately"
    elif days_until < warning_days:
        return f"WARNING - {days_until} days remaining"
    else:
        return f"OK - Valid until {expiration_date}"
```

### Maintenance Windows
**Scheduled Maintenance:**
- Oil change: Every 10,000-15,000 km or 6 months
- Tire rotation: Every 10,000 km
- Brake inspection: Every 20,000 km
- Major service: Annually or 50,000 km

**Tracking:**
- Store next maintenance date in vehicle record
- Alert when approaching (15 days before)
- Block assignments if overdue (critical items)

### Insurance & Permits
- Commercial vehicle insurance (mandatory)
- Transport permits (for oversized/overweight loads)
- Driver licenses (match vehicle requirements)
- ADR certification (for hazardous materials)

---

## Driver Assignment

### Skill Matching
**Requirements by Vehicle:**
- **Crane operation**: Special certification required
- **Heavy vehicles** (>7,500 kg): C license
- **Articulated trucks**: C+E license
- **Hazardous materials**: ADR certification

**Process:**
1. Check driver license type
2. Verify certifications (crane, ADR)
3. Check availability (working hours, rest periods)
4. Consider experience level (new drivers → simpler routes)

### Working Hour Limits (EU Regulation)
- **Daily driving**: Max 9 hours (can extend to 10h twice/week)
- **Weekly driving**: Max 56 hours
- **Bi-weekly driving**: Max 90 hours
- **Daily rest**: Min 11 hours (can reduce to 9h three times/week)
- **Weekly rest**: Min 45 hours

**Tracking:**
```python
def can_assign_route(driver, route_hours):
    hours_today = driver.get_hours_today()
    hours_this_week = driver.get_hours_this_week()
    
    if hours_today + route_hours > 9:
        return False, "Exceeds daily limit"
    if hours_this_week + route_hours > 56:
        return False, "Exceeds weekly limit"
    
    return True, "OK"
```

---

## Cost Tracking

### Fuel Consumption
**Estimation:**
```python
def estimate_fuel_cost(distance_km, vehicle_type):
    # Average consumption (liters/100km)
    consumption_rates = {
        '1eje': 12,      # Light truck
        '2ejes': 18,     # Medium truck
        '3ejes': 25      # Heavy truck
    }
    
    fuel_price_per_liter = 1.45  # €/L (diesel)
    consumption = consumption_rates.get(vehicle_type, 18)
    
    liters = (distance_km / 100) * consumption
    cost = liters * fuel_price_per_liter
    
    return {
        'liters': round(liters, 1),
        'cost': round(cost, 2)
    }
```

### Maintenance Costs
**Track by Category:**
- **Preventive**: Scheduled services (predictable)
- **Corrective**: Repairs (variable)
- **Compliance**: ITV, inspections (fixed)
- **Tires**: Replacement (semi-predictable)

**Metrics:**
- Cost per km
- Cost per month
- Cost as % of vehicle value
- Trend analysis (increasing costs → retirement signal)

---

## Decision Framework

### When to Schedule Maintenance
**Question**: Should I take this vehicle offline for maintenance?

**Factors:**
1. **Urgency**: ITV expired? Safety issue? → Immediate
2. **Upcoming Orders**: Any assignments in next 3 days? → Delay or reassign
3. **Fleet Availability**: Other vehicles available? → Proceed
4. **Cost**: Batch multiple items? → Combine services

**Decision Tree:**
```
Is it safety-critical (ITV, brakes)?
├─ YES → Schedule immediately, reassign orders
└─ NO → Is it overdue?
    ├─ YES → Schedule within 48h
    └─ NO → Can it wait until low-demand period?
        ├─ YES → Schedule for weekend/off-peak
        └─ NO → Schedule within 1 week
```

### Vehicle Selection for Order
**Question**: Which vehicle should handle this delivery?

**Hard Constraints (must match):**
1. Load weight ≤ vehicle capacity
2. Load length ≤ vehicle max length
3. Crane required → vehicle has crane
4. Special equipment (jib, box) → vehicle has it
5. Vehicle is available (not in maintenance, not assigned)
6. Compliance OK (ITV valid, insurance current)

**Soft Constraints (optimize):**
1. Minimize distance to pickup (fuel cost)
2. Prefer underutilized vehicles (balance fleet)
3. Match vehicle size to load (don't use heavy truck for light load)
4. Consider upcoming maintenance (avoid vehicles due soon)

**Algorithm:**
```python
def select_vehicle(order, fleet):
    # Filter by hard constraints
    candidates = [v for v in fleet if meets_requirements(v, order)]
    
    if not candidates:
        return None, "No suitable vehicle available"
    
    # Score by soft constraints
    scored = []
    for vehicle in candidates:
        score = 0
        score += proximity_score(vehicle.location, order.origin)
        score += utilization_score(vehicle.usage_rate)
        score += efficiency_score(vehicle.capacity, order.load)
        score -= maintenance_penalty(vehicle.next_maintenance)
        
        scored.append((vehicle, score))
    
    # Return highest scoring vehicle
    best = max(scored, key=lambda x: x[1])
    return best[0], "Selected based on proximity and efficiency"
```

---

## Anti-Patterns

### ❌ Reactive Maintenance Only
**Don't**: Wait for breakdowns to perform maintenance
**Do**: Schedule preventive maintenance based on time/km

### ❌ Ignoring Compliance Deadlines
**Don't**: Let ITV expire ("we'll do it next week")
**Do**: Set alerts 30 days before expiration, schedule immediately

### ❌ Unbalanced Utilization
**Don't**: Always use the same "favorite" vehicles
**Do**: Rotate assignments to balance wear across fleet

### ❌ Poor Record Keeping
**Don't**: Rely on memory for maintenance history
**Do**: Log every service, repair, and inspection in system

### ❌ Oversized Vehicles for Small Loads
**Don't**: Use heavy truck (25 L/100km) for light delivery
**Do**: Match vehicle size to load requirements

---

## Integration Points

### With Odoo
- **Fleet Module**: Vehicle records, driver assignments
- **Maintenance Module**: Service schedules, work orders
- **HR Module**: Driver certifications, working hours
- **Accounting**: Fuel costs, maintenance expenses

### With Route Optimization
- Vehicle location → starting point for route calculation
- Vehicle availability → constraint for assignment
- Fuel consumption rates → cost optimization input

### With Compliance Systems
- ITV expiration → calendar alerts
- Driver hours → legal limit enforcement
- Insurance validity → assignment blocking

---

## Metrics to Track

### Operational
- **Utilization Rate**: % of time vehicle is assigned vs available
- **Empty Miles**: % of km driven without load
- **On-Time Delivery**: % of deliveries completed on schedule
- **Breakdowns**: Number per vehicle per year

### Financial
- **Cost per km**: Total costs / total km driven
- **Fuel efficiency**: Actual vs expected consumption
- **Maintenance cost trend**: Increasing? → Retirement signal
- **Revenue per vehicle**: Income generated per asset

### Compliance
- **ITV compliance rate**: % of fleet with valid ITV
- **Maintenance on-time**: % of services completed on schedule
- **Driver hour violations**: Number of legal limit breaches
- **Insurance coverage**: % of fleet properly insured

---

## Example Scenarios

### Scenario 1: Maintenance Scheduling
**Context**: Vehicle 6314-KGS has ITV expiring in 20 days, scheduled maintenance overdue by 5 days, and 3 orders assigned in next week.

**Analysis:**
- ITV: 20 days → WARNING status (not critical yet)
- Maintenance: Overdue → HIGH priority
- Orders: 3 assigned → Need reassignment

**Recommendation:**
```
Schedule maintenance for this weekend (2 days):
1. Combine ITV inspection + scheduled maintenance (save time)
2. Reassign next week's orders to:
   - Order 1 → Vehicle 1234-ABC (similar capacity, available)
   - Order 2 → Vehicle 5678-DEF (has crane, nearby)
   - Order 3 → Delay 2 days or use external carrier
3. Estimated downtime: 2 days
4. Estimated cost: €450 (maintenance) + €120 (ITV)
```

### Scenario 2: Vehicle Selection
**Context**: Order requires 8-ton load, crane, pickup in Vitoria, delivery in Bilbao.

**Available Vehicles:**
- 6314-KGS: 2ejes_grua, 12T capacity, in Vitoria, ITV OK
- 1234-ABC: 3ejes_grua, 18T capacity, in Pamplona (80km away), ITV OK
- 5678-DEF: 2ejes, 12T capacity, in Vitoria, NO CRANE

**Analysis:**
```
Hard Constraints:
✓ 6314-KGS: Capacity OK, Crane OK, Available
✗ 1234-ABC: Capacity OK, Crane OK, but 80km away (extra fuel cost)
✗ 5678-DEF: Capacity OK, but NO CRANE (fails requirement)

Soft Constraints (6314-KGS):
✓ Location: In Vitoria (0km to pickup)
✓ Size match: 12T capacity for 8T load (efficient)
✓ Utilization: 65% this month (balanced)
✓ Maintenance: Next service in 45 days (safe)

Recommendation: 6314-KGS
- Perfect match for requirements
- Minimal fuel cost (already in Vitoria)
- Appropriate size (not oversized)
```
