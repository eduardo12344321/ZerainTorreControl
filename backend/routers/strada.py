from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import math

# Max plausible distance between two consecutive GPS points (km)
# Trucks can't teleport more than ~150 km between readings
_MAX_GPS_JUMP_KM = 150.0
import os
import logging
from database_strada import DB_PATH as REAL_DB_PATH, get_db_conn, get_cursor

logger = logging.getLogger(__name__)

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km between two GPS points."""
    if lat1 == 0 and lon1 == 0 or lat2 == 0 and lon2 == 0:
        return 0.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return 6371 * 2 * math.asin(math.sqrt(max(0, a)))

def _sum_km(positions) -> float:
    """Sum Haversine distances, skipping GPS jumps > _MAX_GPS_JUMP_KM."""
    total = 0.0
    for i in range(1, len(positions)):
        d = _haversine_km(
            positions[i-1]['latitude'], positions[i-1]['longitude'],
            positions[i]['latitude'], positions[i]['longitude']
        )
        if d < _MAX_GPS_JUMP_KM:
            total += d
    return total

def _clean_plate(plate: str) -> str:
    return plate.replace('-', '').replace(' ', '').upper()

router = APIRouter(
    prefix="/api/strada",
    tags=["strada"]
)

@router.get("/vehicle/{plate}/odometer-at-date")
def get_vehicle_odometer_at_date(plate: str, date: str):
    """Returns the recorded odometer value for a vehicle at the start of a specific date."""
    db_plate = _clean_plate(plate)
    conn = get_db_conn()
    with get_cursor(conn) as cursor:
        from database_strada import IS_POSTGRES
        placeholder = "%s" if IS_POSTGRES else "?"
        
        # Look for activity closest to the date (prefer end of day for that date)
        search_ts = f"{date} 23:59:59"
        
        # We need WHERE odometer > 0/IS NOT NULL because some records lack data
        cursor.execute(f'''
            SELECT odometer, begin FROM activities
            WHERE plate = {placeholder} AND begin <= {placeholder} 
            AND odometer IS NOT NULL AND odometer > 0
            ORDER BY begin DESC LIMIT 1
        ''', (db_plate, search_ts))
        
        row = cursor.fetchone()
        if not row:
            # Maybe there is no data BEFORE the date, try getting CURRENT (latest) or first ever
            cursor.execute(f'''
                SELECT odometer, begin FROM activities
                WHERE plate = {placeholder} AND odometer IS NOT NULL AND odometer > 0
                ORDER BY begin ASC LIMIT 1
            ''', (db_plate,))
            row = cursor.fetchone()
            
        km = 0
        found_at = None
        if row:
            try:
                if IS_POSTGRES:
                    km = row.get('odometer', 0)
                    found_at = row.get('begin')
                else:
                    # SQLite Row allows dict-like access too
                    km = row['odometer']
                    found_at = row['begin']
            except:
                # Fallback to index if Row object behaves weirdly
                km = row[0]
                found_at = row[1]
                
    conn.close()
    return {"plate": plate, "target_date": date, "odometer": km, "found_at": str(found_at)}

@router.get("/fleet/status")
def get_fleet_status(date: Optional[str] = None):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
        
    conn = get_db_conn()
    with get_cursor(conn) as cursor:
        from services.odoo_service import odoo_client
        vehicles = odoo_client.get_vehicles()
        
        fleet_status = []
        date_start = date
        date_end = (datetime.fromisoformat(date) + timedelta(days=1)).strftime("%Y-%m-%d")

        from database_strada import IS_POSTGRES
        placeholder = "%s" if IS_POSTGRES else "?"
        
        for v in vehicles:
            plate = v['plate']
            db_plate = _clean_plate(plate)
            
            # Última posición
            cursor.execute(f'''
                SELECT latitude, longitude, speed, timestamp, course
                FROM positions 
                WHERE plate = {placeholder} 
                ORDER BY timestamp DESC LIMIT 1
            ''', (db_plate,))
            pos = cursor.fetchone()
            
            # Última actividad
            cursor.execute(f'''
                SELECT type, begin, "end" 
                FROM activities 
                WHERE plate = {placeholder} 
                ORDER BY begin DESC LIMIT 1
            ''', (db_plate,))
            act = cursor.fetchone()

            # Alertas del día
            if IS_POSTGRES:
                cursor.execute("SELECT count(*) FROM infractions WHERE plate = %s AND timestamp >= %s AND timestamp < %s", (db_plate, date_start, date_end))
            else:
                cursor.execute("SELECT count(*) FROM infractions WHERE plate = ? AND timestamp >= ? AND timestamp < ?", (db_plate, date_start, date_end))
            alerts_count = cursor.fetchone().get('count') if IS_POSTGRES else cursor.fetchone()[0]
            
            # KM del día — Haversine real con filtro de saltos GPS
            if IS_POSTGRES:
                cursor.execute('''
                    SELECT latitude, longitude FROM positions
                    WHERE plate = %s AND timestamp >= %s AND timestamp < %s
                    ORDER BY timestamp ASC
                ''', (db_plate, date_start, date_end))
            else:
                cursor.execute('''
                    SELECT latitude, longitude FROM positions
                    WHERE plate = ? AND timestamp >= ? AND timestamp < ?
                    ORDER BY timestamp ASC
                ''', (db_plate, date_start, date_end))
            day_positions = cursor.fetchall()
            daily_km = round(_sum_km(day_positions), 1)

            # Uso de grúa hoy (horas)
            if IS_POSTGRES:
                cursor.execute("SELECT begin, \"end\" FROM crane_events WHERE plate = %s AND begin >= %s AND begin < %s", (db_plate, date_start, date_end))
            else:
                cursor.execute("SELECT begin, \"end\" FROM crane_events WHERE plate = ? AND begin >= ? AND begin < ?", (db_plate, date_start, date_end))
            
            crane_evs = cursor.fetchall()
            crane_min = 0.0
            for cev in crane_evs:
                b_str, e_str = cev['begin'], cev['end']
                if not b_str or not e_str: continue
                try:
                    b = b_str if isinstance(b_str, datetime) else datetime.fromisoformat(b_str.replace(' ', 'T'))
                    e = e_str if isinstance(e_str, datetime) else datetime.fromisoformat(e_str.replace(' ', 'T'))
                    crane_min += (e - b).total_seconds() / 60
                except: pass
            
            crane_h = round(crane_min / 60, 2)

            fleet_status.append({
                "plate": plate,
                "model": v['alias'],
                "has_crane": v['has_crane'],
                "last_pos": pos if pos else None,
                "status": act['type'] if act else "Unknown",
                "alerts_today": alerts_count,
                "daily_km": daily_km,
                "crane_hours": crane_h
            })

    conn.close()
    return fleet_status

@router.get("/vehicle/{plate}/trail")
def get_vehicle_trail(plate: str, date: Optional[str] = None):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
        
    conn = get_db_conn()
    with get_cursor(conn) as cursor:
        from database_strada import IS_POSTGRES
        db_plate = _clean_plate(plate)
        date_end = (datetime.fromisoformat(date) + timedelta(days=1)).strftime("%Y-%m-%d")
        
        if IS_POSTGRES:
            cursor.execute('''
                SELECT latitude, longitude, timestamp 
                FROM positions 
                WHERE plate = %s AND timestamp >= %s AND timestamp < %s 
                ORDER BY timestamp ASC
            ''', (db_plate, date, date_end))
        else:
            cursor.execute('''
                SELECT latitude, longitude, timestamp 
                FROM positions 
                WHERE plate = ? AND timestamp >= ? AND timestamp < ? 
                ORDER BY timestamp ASC
            ''', (db_plate, date, date_end))
        
        results = cursor.fetchall()
        trail = [[row['latitude'], row['longitude']] for row in results]
    conn.close()
    return trail

@router.get("/vehicle/{plate}/details")
def get_vehicle_details(plate: str, date: Optional[str] = None):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db_conn()
    with get_cursor(conn) as cursor:
        from database_strada import IS_POSTGRES
        db_plate = _clean_plate(plate)
        date_end = (datetime.fromisoformat(date) + timedelta(days=1)).strftime("%Y-%m-%d")
        
        if IS_POSTGRES:
            # Ruta del día
            cursor.execute("SELECT latitude, longitude, speed, timestamp FROM positions WHERE plate = %s AND timestamp >= %s AND timestamp < %s ORDER BY timestamp ASC", (db_plate, date, date_end))
            route = cursor.fetchall()

            # Cronograma de actividades
            cursor.execute("SELECT type, begin, \"end\", odometer FROM activities WHERE plate = %s AND begin >= %s AND begin < %s ORDER BY begin ASC", (db_plate, date, date_end))
            activities = cursor.fetchall()

            # Uso de grúa
            cursor.execute("SELECT begin, \"end\" FROM crane_events WHERE plate = %s AND begin >= %s AND begin < %s ORDER BY begin ASC", (db_plate, date, date_end))
            crane = cursor.fetchall()

            # Infracciones
            cursor.execute("SELECT * FROM infractions WHERE plate = %s AND timestamp >= %s AND timestamp < %s ORDER BY timestamp DESC", (db_plate, date, date_end))
            infractions = cursor.fetchall()
        else:
            # Ruta del día
            cursor.execute("SELECT latitude, longitude, speed, timestamp FROM positions WHERE plate = ? AND timestamp >= ? AND timestamp < ? ORDER BY timestamp ASC", (db_plate, date, date_end))
            route = [dict(row) for row in cursor.fetchall()]

            # Cronograma de actividades
            cursor.execute("SELECT type, begin, end, odometer FROM activities WHERE plate = ? AND begin >= ? AND begin < ? ORDER BY begin ASC", (db_plate, date, date_end))
            activities = [dict(row) for row in cursor.fetchall()]

            # Uso de grúa
            cursor.execute("SELECT begin, end FROM crane_events WHERE plate = ? AND begin >= ? AND begin < ? ORDER BY begin ASC", (db_plate, date, date_end))
            crane = [dict(row) for row in cursor.fetchall()]

            # Infracciones
            cursor.execute("SELECT * FROM infractions WHERE plate = ? AND timestamp >= ? AND timestamp < ? ORDER BY timestamp DESC", (db_plate, date, date_end))
            infractions = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "plate": plate,
        "route": route,
        "activities": activities,
        "crane_events": crane,
        "infractions": infractions
    }

@router.get("/vehicle/{plate}/stats")
def get_vehicle_stats(plate: str, range: str = 'day', start_date: str = None):
    conn = get_db_conn()
    with get_cursor(conn) as cursor:
        from database_strada import IS_POSTGRES
        placeholder = "%s" if IS_POSTGRES else "?"
        
        today = datetime.now()
        
        # Use exact alignment logic shared with get_fleet_stats
        if start_date:
            base = datetime.fromisoformat(start_date)
            if range == 'week':
                base = base - timedelta(days=base.weekday())
            elif range == 'month':
                base = base.replace(day=1)
            elif range == 'year':
                base = base.replace(month=1, day=1)
        else:
            if range == 'week':
                base = today - timedelta(days=today.weekday())
            elif range == 'month':
                base = today.replace(day=1)
            elif range == 'year':
                base = today.replace(month=1, day=1)
            else:
                base = today

        start_date_str = base.strftime("%Y-%m-%d")

        if range == 'day':
            end_date_str = (base + timedelta(days=1)).strftime("%Y-%m-%d")
        elif range == 'week':
            end_date_str = (base + timedelta(days=7)).strftime("%Y-%m-%d")
        elif range == 'month':
            if base.month == 12:
                end_date_str = f"{base.year+1}-01-01"
            else:
                end_date_str = f"{base.year}-{base.month+1:02d}-01"
        elif range == 'year':
            end_date_str = f"{base.year+1}-01-01"
        else:
            end_date_str = (base + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Velocidad promedio por día
        db_plate = _clean_plate(plate)
        if IS_POSTGRES:
            cursor.execute(f'''
                SELECT timestamp::date as day, AVG(speed) as avg_speed, MAX(speed) as max_speed
                FROM positions
                WHERE plate = %s AND timestamp >= %s AND timestamp < %s
                GROUP BY timestamp::date
                ORDER BY day ASC
            ''', (db_plate, start_date_str, end_date_str))
        else:
            cursor.execute(f'''
                SELECT DATE(timestamp) as day, AVG(speed) as avg_speed, MAX(speed) as max_speed
                FROM positions
                WHERE plate = ? AND timestamp >= ? AND timestamp < ?
                GROUP BY DATE(timestamp)
                ORDER BY day ASC
            ''', (db_plate, start_date_str, end_date_str))
        speed_stats = cursor.fetchall()
        if not IS_POSTGRES:
            speed_stats = [dict(row) for row in speed_stats]
        
        # KM por día (real)
        cursor.execute(f'''
            SELECT latitude, longitude, timestamp FROM positions
            WHERE plate = {placeholder} AND timestamp >= {placeholder} AND timestamp < {placeholder}
            ORDER BY timestamp ASC
        ''', (db_plate, start_date_str, end_date_str))
        all_positions = cursor.fetchall()
        
        # Group by day and sum
        day_stats = {}
        for i in range(1, len(all_positions)):
            d1 = str(all_positions[i-1]['timestamp'])[:10]
            d2 = str(all_positions[i]['timestamp'])[:10]
            if d1 != d2: continue
            
            dist = _haversine_km(
                all_positions[i-1]['latitude'], all_positions[i-1]['longitude'],
                all_positions[i]['latitude'], all_positions[i]['longitude']
            )
            if dist < _MAX_GPS_JUMP_KM:
                day_stats[d1] = day_stats.get(d1, 0) + dist
                
        km_stats = [{"day": d, "km": round(k, 1)} for d, k in sorted(day_stats.items())]
    
    conn.close()
    return {
        "speed": speed_stats,
        "mileage": km_stats
    }

@router.get("/vehicle/{plate}/odometer-timeline")
def get_odometer_timeline(plate: str, date: Optional[str] = None):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db_conn()
    with get_cursor(conn) as cursor:
        from database_strada import IS_POSTGRES
        db_plate = _clean_plate(plate)
        date_end = (datetime.fromisoformat(date) + timedelta(days=1)).strftime("%Y-%m-%d")
        
        if IS_POSTGRES:
            cursor.execute('''
                SELECT latitude, longitude, timestamp 
                FROM positions 
                WHERE plate = %s AND timestamp >= %s AND timestamp < %s
                ORDER BY timestamp ASC
            ''', (db_plate, date, date_end))
        else:
            cursor.execute('''
                SELECT latitude, longitude, timestamp 
                FROM positions 
                WHERE plate = ? AND timestamp >= ? AND timestamp < ?
                ORDER BY timestamp ASC
            ''', (db_plate, date, date_end))
        
        positions = cursor.fetchall()
    conn.close()
    
    if len(positions) < 2:
        return []
    
    timeline = []
    accumulated_km = 0.0
    prev_pos = positions[0]
    
    # Add initial point
    try:
        ts_val = prev_pos['timestamp']
        if not isinstance(ts_val, str): ts_val = ts_val.isoformat()
        start_t = ts_val[11:16]
    except:
        start_t = "00:00"

    timeline.append({
        "time": start_t,
        "km": 0.0
    })
    
    for i in range(1, len(positions)):
        curr_pos = positions[i]
        
        # Haversine approximation
        lat1, lon1 = prev_pos['latitude'], prev_pos['longitude']
        lat2, lon2 = curr_pos['latitude'], curr_pos['longitude']
        
        distance_km = _haversine_km(lat1, lon1, lat2, lon2)
        if distance_km < _MAX_GPS_JUMP_KM:
            accumulated_km += distance_km
        
        if i % 10 == 0 or distance_km > 5:
            ts_val = curr_pos['timestamp']
            if not isinstance(ts_val, str): ts_val = ts_val.isoformat()
            t_str = ts_val[11:16]

            timeline.append({
                "time": t_str,
                "km": round(accumulated_km, 1)
            })
        
        prev_pos = curr_pos
    
    return timeline

@router.get("/fleet/stats")
def get_fleet_stats(range: str = 'day', start_date: str = None):
    conn = get_db_conn()
    with get_cursor(conn) as cursor:
        from database_strada import IS_POSTGRES
        placeholder = "%s" if IS_POSTGRES else "?"

        today = datetime.now()
        
        if start_date:
            base = datetime.fromisoformat(start_date)
            # Find the first day of the period if start_date is given but we are on a larger range
            if range == 'month':
                base = base.replace(day=1)
            elif range == 'year':
                base = base.replace(month=1, day=1)
        else:
            if range == 'week':
                base = today - timedelta(days=today.weekday()) # Start of week (Monday)
            elif range == 'month':
                base = today.replace(day=1)
            elif range == 'year':
                base = today.replace(month=1, day=1)
            else:
                base = today

        start_date_str = base.strftime("%Y-%m-%d")

        if range == 'day':
            end_date_str = (base + timedelta(days=1)).strftime("%Y-%m-%d")
        elif range == 'week':
            end_date_str = (base + timedelta(days=7)).strftime("%Y-%m-%d")
        elif range == 'month':
            if base.month == 12:
                end_date_str = f"{base.year+1}-01-01"
            else:
                end_date_str = f"{base.year}-{base.month+1:02d}-01"
        elif range == 'year':
            end_date_str = f"{base.year+1}-01-01"
        else:
            end_date_str = (base + timedelta(days=1)).strftime("%Y-%m-%d")

        from services.odoo_service import odoo_client
        vehicles = odoo_client.get_vehicles()

        result = []
        for v in vehicles:
            plate = v['plate']
            db_plate = _clean_plate(plate)

            cursor.execute(f'''
                SELECT latitude, longitude FROM positions
                WHERE plate = {placeholder} AND timestamp >= {placeholder} AND timestamp < {placeholder}
                ORDER BY timestamp ASC
            ''', (db_plate, start_date_str, end_date_str))
            positions = cursor.fetchall()
            km = _sum_km(positions)

            # Actividades (Conducción y Descanso)
            cursor.execute(f'''
                SELECT type, begin, "end" FROM activities
                WHERE plate = {placeholder} AND begin >= {placeholder} AND begin < {placeholder}
            ''', (db_plate, start_date_str, end_date_str))
            activities = cursor.fetchall()
            drive_min = 0.0
            rest_min = 0.0
            for act in activities:
                b_str, e_str = act['begin'], act['end']
                if not b_str or not e_str: continue
                try:
                    # Robust parsing for SQLite strings vs Postgres datetime
                    b = b_str if isinstance(b_str, datetime) else datetime.fromisoformat(b_str.replace(' ', 'T'))
                    e = e_str if isinstance(e_str, datetime) else datetime.fromisoformat(e_str.replace(' ', 'T'))
                    dur = max(0, (e - b).total_seconds() / 60)
                    
                    if act['type'] == 'Drive':
                        drive_min += dur
                    else:
                        rest_min += dur
                except Exception as ex:
                    print(f"Error parsing activity for {plate}: {ex}")

            # Grúa
            if IS_POSTGRES:
                cursor.execute("SELECT begin, \"end\" FROM crane_events WHERE plate = %s AND begin >= %s AND begin < %s", (db_plate, start_date_str, end_date_str))
            else:
                cursor.execute("SELECT begin, \"end\" FROM crane_events WHERE plate = ? AND begin >= ? AND begin < ?", (db_plate, start_date_str, end_date_str))
            crane_evs = cursor.fetchall()
            crane_min = 0.0
            for cev in crane_evs:
                b_str, e_str = cev['begin'], cev['end']
                if not b_str or not e_str: continue
                try:
                    b = b_str if isinstance(b_str, datetime) else datetime.fromisoformat(b_str.replace(' ', 'T'))
                    e = e_str if isinstance(e_str, datetime) else datetime.fromisoformat(e_str.replace(' ', 'T'))
                    crane_min += (e - b).total_seconds() / 60
                except Exception as ex:
                    print(f"Error parsing crane event for {plate}: {ex}")

            # Alertas
            if IS_POSTGRES:
                cursor.execute("SELECT COUNT(*) FROM infractions WHERE plate = %s AND timestamp >= %s AND timestamp < %s", (db_plate, start_date_str, end_date_str))
            else:
                cursor.execute("SELECT COUNT(*) FROM infractions WHERE plate = ? AND timestamp >= ? AND timestamp < ?", (db_plate, start_date_str, end_date_str))
            alerts = cursor.fetchone().get('count') if IS_POSTGRES else cursor.fetchone()[0]

            result.append({
                "plate": plate,
                "model": v['alias'],
                "has_crane": v['has_crane'],
                "km": round(km, 1),
                "drive_hours": round(drive_min / 60, 2),
                "crane_hours": round(crane_min / 60, 2),
                "rest_hours": round(rest_min / 60, 2),
                "alerts": alerts,
            })

    conn.close()
    return result

@router.get("/system/health")
def get_system_health():
    try:
        from services.strada_miner import strada_miner
        conn = get_db_conn()
        with get_cursor(conn) as cursor:
            from database_strada import IS_POSTGRES
            
            from services.odoo_service import odoo_client
            try:
                total_vehicles = len(odoo_client.get_vehicles())
            except:
                total_vehicles = 0
            
            
            cursor.execute("SELECT MAX(timestamp) FROM positions")
            last_sync = cursor.fetchone().get('max') if IS_POSTGRES else cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM positions")
            total_positions = cursor.fetchone().get('count') if IS_POSTGRES else cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM activities")
            total_activities = cursor.fetchone().get('count') if IS_POSTGRES else cursor.fetchone()[0]

            cursor.execute("SELECT MIN(timestamp) FROM positions")
            first_record = cursor.fetchone().get('min') if IS_POSTGRES else cursor.fetchone()[0]
            
            db_size_mb = 0
            if IS_POSTGRES:
                try:
                    cursor.execute("SELECT pg_database_size(current_database()) / 1048576.0 as size")
                    db_size_mb = round(cursor.fetchone().get('size'), 2)
                except:
                    pass
            else:
                # SQLite: Get file size from disk
                try:
                    # Resolve full path to be sure
                    full_path = os.path.abspath(REAL_DB_PATH)
                    print(f"DEBUG: Health check checking path: {full_path}")
                    if os.path.exists(full_path):
                        db_size_mb = round(os.path.getsize(full_path) / (1024 * 1024), 2)
                        print(f"DEBUG: Found DB, size: {db_size_mb} MB")
                    else:
                        print(f"DEBUG: DB Path NOT found: {full_path}")
                except Exception as e:
                    print(f"DEBUG: Error checking file size: {e}")

        conn.close()
        return {
            "total_vehicles": total_vehicles,
            "total_positions": total_positions,
            "total_activities": total_activities,
            "first_record": first_record.isoformat() if hasattr(first_record, 'isoformat') else first_record,
            "last_sync": last_sync.isoformat() if hasattr(last_sync, 'isoformat') else last_sync,
            "db_size_mb": db_size_mb,
            "last_miner_run": strada_miner.last_heartbeat.isoformat() if hasattr(strada_miner, 'last_heartbeat') and hasattr(strada_miner.last_heartbeat, 'isoformat') else None,
            "db_path_checked": REAL_DB_PATH,
            "status": "ok"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


