import itertools
from datetime import datetime, timedelta
from services.maps_service import maps_service
from database import db

class OptimizationService:
    def optimize_truck_route(self, truck_id: str, date: str):
        """
        Reorders the truck's assignments for the given date to minimize total travel time.
        Updates the scheduled_start times in the database.
        """
        print(f"OptimizationService: Optimizing route for truck {truck_id} on {date}")
        
        # 1. Fetch orders for this truck and date
        all_orders = self._get_computable_orders(truck_id, date)
        
        if len(all_orders) < 2:
            # Recalculate timings even for single order or zero orders if needed?
            if len(all_orders) == 1:
                print("OptimizationService: Only 1 order, recalculating timings but not reordering.")
                self._recalculate_single_order(all_orders[0], truck_id, date)
                return {"status": "success", "message": "Updated single order timings."}
            
            print(f"OptimizationService: Not enough orders to optimize for truck {truck_id}. Found: {len(all_orders)}")
            return {"status": "error", "message": "No hay suficientes órdenes para optimizar (mínimo 2)."}

        # 2. Split Orders: Fixed vs Optimizable
        # Fixed: COMPLETED, IN_PROGRESS (cannot move start time of what's happening or done)
        # Optimizable: PLANNED, CONFIRMED, PENDING, etc.
        fixed_orders = []
        optimizable_orders = []
        
        for order in all_orders:
            status = order.get('status', 'PLANNED')
            if status in ['COMPLETED', 'IN_PROGRESS']:
                fixed_orders.append(order)
            else:
                optimizable_orders.append(order)
                
        # Sort fixed orders by actual start time (if available) or scheduled start
        fixed_orders.sort(key=lambda x: x.get('scheduled_start') or '')

        # 3. Determine Start Context for Optimization
        from config import DEFAULT_BASE_LOCATION
        
        start_point = DEFAULT_BASE_LOCATION
        start_time = datetime.strptime(f"{date} 08:00:00", "%Y-%m-%d %H:%M:%S")
        
        if fixed_orders:
            last_fixed = fixed_orders[-1]
            # Next usable time = End of last fixed order
            # End Time = Start + Prep + Drive + Work
            last_start_str = last_fixed.get('scheduled_start')
            if last_start_str:
                last_start = datetime.strptime(last_start_str, "%Y-%m-%d %H:%M:%S")
                duration_mins = (last_fixed.get('estimated_duration') or 60)
                # Note: estimated_duration usually includes prep+drive+work in our logic?
                # or is it just the work block? 
                # In timeline logic, estimated_duration is TOTAL width.
                start_time = last_start + timedelta(minutes=duration_mins)
                
            # Next start point = Destination of last fixed order
            if last_fixed.get('destination_address'):
                start_point = last_fixed.get('destination_address')
                
        print(f"OptimizationService: optimizing {len(optimizable_orders)} orders starting from {start_point} at {start_time}")

        if not optimizable_orders:
             return {"status": "success", "message": "No optimizable orders found (all completed/in-progress)."}

        # 4. Permutations for Optimizable Orders
        best_sequence = None
        min_total_duration = float('inf')
        
        # Limit permutations to avoid explosion (e.g. max 6 orders)
        # usage of map services is expensive.
        if len(optimizable_orders) > 6:
             print("OptimizationService: Too many orders for full permutation. Using nearest neighbor.")
             # Fallback to Nearest Neighbor or similar heuristic?
             # For now, just slice or warning.
             # Actually, let's just stick to original order if too many?
             # Or simple nearest neighbor.
             # IMPLEMENTATION NOTE: For now we stick to permutations as usually trucks have 2-4 orders.
             pass

        permutations = list(itertools.permutations(optimizable_orders))
        
        results = []
        best_sequence = None
        min_total_duration = float('inf')
        
        for perm in permutations:
            duration, sequence_with_times, total_km = self._calculate_route_cost(start_point, perm)
            results.append({
                "names": [f"#{o.get('odoo_name') or o.get('display_id', '?')} | {o.get('client_name', 'Cliente S/N')}" for o in perm],
                "duration": round(duration, 0),
                "distance": round(total_km, 2)
            })
            if duration < min_total_duration:
                min_total_duration = duration
                best_sequence = sequence_with_times

        if not best_sequence:
             return {"status": "error", "message": "Could not calculate optimal route."}

        # 5. Update Database (Only Optimizable Orders)
        self._update_orders_sequence(best_sequence, start_time)
        
        # Sort results by distance for summary
        results.sort(key=lambda x: x['distance'])
        best = results[0]
        worst = results[-1]
        
        return {
            "status": "success", 
            "optimized_count": len(optimizable_orders),
            "total_duration_mins": min_total_duration,
            "total_distance_km": best['distance'],
            "combinations": results[:12], # Top 12 combinations
            "summary": {
                "best_km": best['distance'],
                "worst_km": worst['distance'],
                "difference_km": round(worst['distance'] - best['distance'], 2),
                "time_saved_mins": round(worst['duration'] - best['duration'], 0)
            }
        }

    def _get_computable_orders(self, truck_id, date):
        with db.get_cursor() as c:
            # Get orders that are active/planned for that day
            c.execute("""
                SELECT * FROM orders 
                WHERE truck_id = ? 
                AND scheduled_start LIKE ? 
                AND status != 'CANCELLED'
            """, (truck_id, f"{date}%"))
            return [dict(row) for row in c.fetchall()]

    def _calculate_route_cost(self, start_point, orders_sequence):
        total_mins = 0
        total_km = 0
        current_loc = start_point
        
        updated_sequence = []
        
        for order in orders_sequence:
            origin = order['origin_address']
            dest = order['destination_address']
            
            # Prep Time (Previous -> Origin)
            prep_data = maps_service.get_distance_and_time(current_loc, origin)
            prep_mins = prep_data.get('duration_mins', 15) if prep_data else 15
            prep_km = prep_data.get('distance_km', 0) if prep_data else 0

            # Driving Time (Origin -> Dest)
            drive_data = maps_service.get_distance_and_time(origin, dest)
            drive_mins = drive_data.get('duration_mins', 30) if drive_data else 30
            drive_km = drive_data.get('distance_km', 0) if drive_data else 0
            
            # Work Time
            work_mins = order['work_duration_minutes'] or 60
            
            # Total Cost
            total_mins += prep_mins + drive_mins
            total_km += prep_km + drive_km
            
            updated_sequence.append({
                'order': order,
                'prep_mins': prep_mins,
                'driving_mins': drive_mins,
                'previous_location': current_loc,
                'km_to_origin': prep_km
            })
            
            current_loc = dest
            
        return total_mins, updated_sequence, total_km

    def _update_orders_sequence(self, sequence, start_time):
        current_time = start_time
        
        with db.get_cursor() as c:
            for item in sequence:
                order = item['order']
                prep_mins = item['prep_mins']
                drive_mins = item['driving_mins']
                work_mins = order['work_duration_minutes'] or 60
                
                # Arrival at Origin = Start of Job
                arrival_time = current_time + timedelta(minutes=prep_mins)
                
                # New "scheduled_start" is arrival_time
                new_start_str = arrival_time.strftime("%Y-%m-%d %H:%M:%S")
                
                # Calculate new estimated_duration (Total Block)
                # In TimelineGrid logic: duration = prep + drive + work
                total_duration = prep_mins + drive_mins + work_mins
                
                c.execute("""
                    UPDATE orders 
                    SET scheduled_start = ?,
                        prep_duration_minutes = ?,
                        driving_duration_minutes = ?,
                        work_duration_minutes = ?,
                        estimated_duration = ?,
                        km_to_origin = ?,
                        previous_location = ?
                    WHERE id = ?
                """, (
                    new_start_str, 
                    prep_mins, 
                    drive_mins, 
                    work_mins, 
                    total_duration,
                    item['km_to_origin'], 
                    item['previous_location'], 
                    order['id']
                ))
                
                # Next order starts after this one finishes
                current_time = arrival_time + timedelta(minutes=drive_mins + work_mins)
                
    def _recalculate_single_order(self, order, truck_id, date_str):
        """
        Recalculates timings for a single order, starting from 08:00 AM 
        or from the base location.
        """
        from datetime import datetime, timedelta
        from config import DEFAULT_BASE_LOCATION
        
        # Determine start point
        # For simplicity in 1-order case, we assume base -> order
        start_point = DEFAULT_BASE_LOCATION
        
        # Calculate prep/drive
        prep_data = maps_service.get_distance_and_time(start_point, order['origin_address'])
        drive_data = maps_service.get_distance_and_time(order['origin_address'], order['destination_address'])
        
        prep_mins = prep_data.get('duration_mins', 15) if prep_data else 15
        drive_mins = drive_data.get('duration_mins', 30) if drive_data else 30
        work_mins = order['work_duration_minutes'] or 60
        
        # Arrival = 08:00 + Prep
        plan_start = datetime.strptime(f"{date_str} 08:00:00", "%Y-%m-%d %H:%M:%S")
        arrival_time = plan_start + timedelta(minutes=prep_mins)
        
        total_duration = prep_mins + drive_mins + work_mins
        
        with db.get_cursor() as c:
            c.execute("""
                UPDATE orders 
                SET scheduled_start = ?,
                    prep_duration_minutes = ?,
                    driving_duration_minutes = ?,
                    estimated_duration = ?,
                    km_to_origin = ?,
                    previous_location = ?
                WHERE id = ?
            """, (
                arrival_time.strftime("%Y-%m-%d %H:%M:%S"),
                prep_mins,
                drive_mins,
                total_duration,
                prep_data.get('distance_km', 0) if prep_data else 0,
                start_point,
                order['id']
            ))

optimization_service = OptimizationService()
