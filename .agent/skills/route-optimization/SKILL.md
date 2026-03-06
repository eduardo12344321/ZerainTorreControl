---
name: route-optimization
description: Route planning, distance calculation, multi-stop optimization, and fuel cost minimization for transport logistics
---

# Route Optimization

## Core Principles

Route optimization balances **delivery speed**, **fuel efficiency**, and **operational constraints**. Key principles:

1. **Time Windows First**: Prioritize urgent deliveries
2. **Geographic Clustering**: Group nearby stops
3. **Legal Compliance**: Respect driver hour limits
4. **Fuel Efficiency**: Minimize total distance
5. **Practical Solutions**: Simple routes > complex optimization

---

## Distance Calculation

### Google Maps Distance Matrix API
**Best for**: Real-world driving distances with traffic

```python
import googlemaps

gmaps = googlemaps.Client(key='YOUR_API_KEY')

def get_distance(origin, destination):
    result = gmaps.distance_matrix(
        origins=[origin],
        destinations=[destination],
        mode='driving',
        units='metric'
    )
    
    element = result['rows'][0]['elements'][0]
    
    if element['status'] == 'OK':
        return {
            'distance_km': element['distance']['value'] / 1000,
            'duration_minutes': element['duration']['value'] / 60,
            'distance_text': element['distance']['text'],
            'duration_text': element['duration']['text']
        }
    else:
        return None
```

**Cost Consideration**: Google charges per request. Cache results for common routes.

### Haversine Formula (Straight-Line Distance)
**Best for**: Quick estimates, offline calculation

```python
from math import radians, sin, cos, sqrt, atan2

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

# Multiply by 1.3 for road distance estimate
road_distance = haversine_distance(lat1, lon1, lat2, lon2) * 1.3
```

---

## Multi-Stop Routing

### Small Routes (2-4 stops)
**Approach**: Calculate all permutations

```python
from itertools import permutations

def optimize_small_route(origin, stops, destination):
    """Find best order for 2-4 stops"""
    best_route = None
    best_distance = float('inf')
    
    for perm in permutations(stops):
        # Calculate total distance for this permutation
        route = [origin] + list(perm) + [destination]
        total_dist = 0
        
        for i in range(len(route) - 1):
            dist = get_distance(route[i], route[i+1])
            total_dist += dist['distance_km']
        
        if total_dist < best_distance:
            best_distance = total_dist
            best_route = route
    
    return best_route, best_distance
```

**Complexity**: O(n!) - Only practical for n ≤ 5

### Medium Routes (5-10 stops)
**Approach**: Nearest Neighbor Heuristic

```python
def nearest_neighbor_route(origin, stops, destination):
    """Greedy algorithm: always go to nearest unvisited stop"""
    route = [origin]
    remaining = stops.copy()
    current = origin
    
    while remaining:
        # Find nearest stop
        nearest = min(remaining, key=lambda s: get_distance(current, s)['distance_km'])
        route.append(nearest)
        remaining.remove(nearest)
        current = nearest
    
    route.append(destination)
    return route
```

**Quality**: Typically 10-25% longer than optimal, but fast to compute

### Large Routes (10+ stops)
**Approach**: Use specialized API (Google Routes Optimization, OR-Tools)

```python
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def optimize_large_route(locations, distance_matrix):
    """Use Google OR-Tools for complex routing"""
    manager = pywrapcp.RoutingIndexManager(len(locations), 1, 0)
    routing = pywrapcp.RoutingModel(manager)
    
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]
    
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
    
    solution = routing.SolveWithParameters(search_parameters)
    
    # Extract route from solution
    route = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        route.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    
    return route
```

---

## Time Window Constraints

### Hard Time Windows
**Definition**: Delivery MUST occur within window

```python
def validate_time_windows(route, time_windows):
    """Check if route respects all time windows"""
    current_time = datetime.now()
    
    for i, stop in enumerate(route):
        # Add travel time to current time
        if i > 0:
            travel_time = get_distance(route[i-1], stop)['duration_minutes']
            current_time += timedelta(minutes=travel_time)
        
        # Add service time (loading/unloading)
        service_time = time_windows[stop].get('service_minutes', 30)
        
        # Check if within window
        window_start = time_windows[stop]['earliest']
        window_end = time_windows[stop]['latest']
        
        if current_time < window_start:
            # Wait until window opens
            current_time = window_start
        elif current_time > window_end:
            return False, f"Cannot reach {stop} in time"
        
        current_time += timedelta(minutes=service_time)
    
    return True, "All time windows respected"
```

### Soft Time Windows
**Definition**: Prefer delivery within window, but allow violations with penalty

```python
def calculate_route_cost(route, time_windows, penalty_per_hour=50):
    """Calculate cost including time window penalties"""
    distance_cost = calculate_distance_cost(route)
    time_penalty = 0
    
    current_time = datetime.now()
    
    for stop in route:
        # ... calculate arrival time ...
        
        window_end = time_windows[stop]['latest']
        if current_time > window_end:
            delay_hours = (current_time - window_end).total_seconds() / 3600
            time_penalty += delay_hours * penalty_per_hour
    
    return distance_cost + time_penalty
```

---

## Driver Hour Constraints

### EU Driving Time Regulations
```python
class DriverHourTracker:
    def __init__(self, driver_id):
        self.driver_id = driver_id
        self.hours_today = self.get_hours_today()
        self.hours_this_week = self.get_hours_this_week()
    
    def can_drive(self, additional_hours):
        """Check if driver can drive additional hours"""
        # Daily limit: 9 hours (can extend to 10h twice/week)
        if self.hours_today + additional_hours > 9:
            return False, "Exceeds daily 9-hour limit"
        
        # Weekly limit: 56 hours
        if self.hours_this_week + additional_hours > 56:
            return False, "Exceeds weekly 56-hour limit"
        
        return True, "Within legal limits"
    
    def required_rest(self):
        """Calculate required rest period"""
        if self.hours_today >= 9:
            return 11  # 11-hour daily rest required
        return 0
```

---

## Fuel Cost Optimization

### Cost Calculation
```python
def calculate_route_fuel_cost(route, vehicle_type):
    """Estimate fuel cost for entire route"""
    consumption_rates = {
        '1eje': 12,   # L/100km
        '2ejes': 18,
        '3ejes': 25
    }
    
    fuel_price = 1.45  # €/L
    consumption = consumption_rates.get(vehicle_type, 18)
    
    total_distance = 0
    for i in range(len(route) - 1):
        dist = get_distance(route[i], route[i+1])['distance_km']
        total_distance += dist
    
    liters = (total_distance / 100) * consumption
    cost = liters * fuel_price
    
    return {
        'distance_km': round(total_distance, 1),
        'liters': round(liters, 1),
        'cost_eur': round(cost, 2)
    }
```

### Route Comparison
```python
def compare_routes(route_a, route_b, vehicle_type):
    """Compare two routes by cost"""
    cost_a = calculate_route_fuel_cost(route_a, vehicle_type)
    cost_b = calculate_route_fuel_cost(route_b, vehicle_type)
    
    savings = cost_a['cost_eur'] - cost_b['cost_eur']
    
    return {
        'route_a': cost_a,
        'route_b': cost_b,
        'savings_eur': round(savings, 2),
        'better_route': 'A' if savings > 0 else 'B'
    }
```

---

## Load Consolidation

### When to Combine Orders
**Criteria:**
1. **Geographic proximity**: Stops within 20km of each other
2. **Time compatibility**: Time windows don't conflict
3. **Vehicle capacity**: Combined load ≤ vehicle capacity
4. **Equipment match**: All orders compatible with vehicle

```python
def can_consolidate(order1, order2, vehicle):
    """Check if two orders can be combined"""
    # Check capacity
    total_weight = order1['weight'] + order2['weight']
    if total_weight > vehicle['max_weight']:
        return False, "Exceeds vehicle capacity"
    
    # Check equipment
    if order1['requires_crane'] or order2['requires_crane']:
        if not vehicle['has_crane']:
            return False, "Vehicle lacks required crane"
    
    # Check geographic proximity
    dist = get_distance(order1['destination'], order2['origin'])['distance_km']
    if dist > 20:
        return False, "Stops too far apart"
    
    # Check time windows
    if order1['latest_delivery'] < order2['earliest_pickup']:
        return False, "Time windows incompatible"
    
    return True, "Orders can be consolidated"
```

---

## Decision Framework

### Route Planning Strategy
**Question**: How should I plan this route?

**Decision Tree:**
```
Number of stops?
├─ 1 stop → Direct route (origin → destination)
├─ 2-4 stops → Calculate all permutations, choose shortest
├─ 5-10 stops → Use nearest neighbor heuristic
└─ 10+ stops → Use OR-Tools or external API

Are there time windows?
├─ YES → Validate route respects windows
│   └─ If violations → Reorder or split route
└─ NO → Optimize purely for distance

Are there driver hour limits?
├─ YES → Check total driving time
│   └─ If exceeds → Split into multiple days or drivers
└─ NO → Proceed with optimized route
```

### Optimization vs Simplicity
**Question**: Should I optimize this route or keep it simple?

**Optimize when:**
- 5+ stops (significant savings potential)
- High fuel costs (long distances, heavy vehicle)
- Recurring route (optimization pays off over time)

**Keep simple when:**
- 1-2 stops (optimization overhead not worth it)
- Urgent delivery (speed > efficiency)
- One-time route (optimization effort wasted)

---

## Anti-Patterns

### ❌ Over-Optimization
**Don't**: Spend 30 minutes optimizing a 50km route to save 2km
**Do**: Focus on high-impact routes (100+ km, multiple stops)

### ❌ Ignoring Real-World Constraints
**Don't**: Create "optimal" route that violates time windows or driver limits
**Do**: Validate all constraints before finalizing route

### ❌ Stale Distance Data
**Don't**: Use cached distances from months ago (roads change)
**Do**: Refresh distance calculations periodically or use real-time APIs

### ❌ Neglecting Return Trip
**Don't**: Optimize outbound route but ignore empty return
**Do**: Consider round-trip efficiency, look for backhaul opportunities

---

## Integration Points

### With Fleet Management
- Vehicle location → route starting point
- Vehicle fuel consumption → cost calculation
- Driver availability → hour limit constraints

### With Odoo
- Sale orders → delivery addresses
- Partner locations → geocoding for distance calculation
- Order priorities → time window constraints

### With Google Maps
- Distance Matrix API → accurate travel times
- Directions API → turn-by-turn navigation
- Geocoding API → convert addresses to coordinates

---

## Example Scenarios

### Scenario 1: Simple 2-Stop Route
**Orders:**
- Order A: Vitoria → Bilbao (urgent, by 14:00)
- Order B: Vitoria → Donostia (flexible)

**Analysis:**
```
Option 1: A first, then B
- Vitoria → Bilbao: 65 km, 50 min
- Bilbao → Donostia: 100 km, 75 min
- Total: 165 km, 125 min

Option 2: B first, then A
- Vitoria → Donostia: 105 km, 80 min
- Donostia → Bilbao: 100 km, 75 min
- Total: 205 km, 155 min

Recommendation: Option 1
- 40 km shorter
- Respects urgent deadline for Order A
```

### Scenario 2: Multi-Stop with Time Windows
**Orders:**
- A: Vitoria → Bilbao (by 12:00)
- B: Vitoria → Pamplona (by 15:00)
- C: Vitoria → Logroño (by 17:00)

**Current time**: 08:00

**Analysis:**
```
Nearest Neighbor Route:
1. Vitoria → Logroño (120 km, 90 min) → Arrive 09:30 ✓
2. Logroño → Pamplona (90 km, 70 min) → Arrive 11:10 ✓
3. Pamplona → Bilbao (160 km, 120 min) → Arrive 13:40 ✗ (misses 12:00 deadline)

Time-Optimized Route:
1. Vitoria → Bilbao (65 km, 50 min) → Arrive 09:20 ✓
2. Bilbao → Pamplona (160 km, 120 min) → Arrive 12:10 ✓
3. Pamplona → Logroño (90 km, 70 min) → Arrive 14:50 ✓

Recommendation: Time-Optimized Route
- All deadlines met
- Total: 315 km vs 370 km (nearest neighbor)
```
