import requests
from requests.auth import HTTPDigestAuth
import time
import threading
import traceback
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from database_strada import get_db_conn, init_db

STRADA_URL = "http://api.stradatracking.com/v1"
STRADA_USER = "api_zerain_Integra"
STRADA_PASSWORD = "UXnxRaNnJHtU"

class StradaMiner:
    def __init__(self):
        self.auth = HTTPDigestAuth(STRADA_USER, STRADA_PASSWORD)
        self.fleet_map = {} # Plate -> Key
        self.running = False
        self.thread = None
        self.last_heartbeat = None
        self.watcher_thread = None
        self._lock = threading.Lock()

    def start(self):
        if self.running:
            return
        
        self.running = True
        self.last_heartbeat = datetime.now()
        
        # Start the main miner thread
        self.thread = threading.Thread(target=self.run_forever, name="StradaMinerMain", daemon=True)
        self.thread.start()
        
        # Start a watcher thread to ensure auto-restart functionality
        if not self.watcher_thread or not self.watcher_thread.is_alive():
            self.watcher_thread = threading.Thread(target=self.watchdog, name="StradaMinerWatcher", daemon=True)
            self.watcher_thread.start()
            
        print("[StradaMiner] Servicio y Watcher iniciados.")

    def watchdog(self):
        """Monitors the miner thread and restarts it if it hangs or dies."""
        while self.running:
            time.sleep(60) # check every minute
            
            now = datetime.now()
            # If thread is dead or heartbeat is older than 15 minutes, restart
            is_alive = self.thread and self.thread.is_alive()
            is_stale = self.last_heartbeat and (now - self.last_heartbeat).total_seconds() > 900 # 15 mins
            
            if not is_alive or is_stale:
                reason = "hilo muerto" if not is_alive else "corazón detenido (stale)"
                print(f"[StradaMinerWatcher] ⚠️ REINICIANDO MINER. Razón: {reason}")
                
                # Try to restart
                try:
                    self.thread = threading.Thread(target=self.run_forever, name="StradaMinerMain", daemon=True)
                    self.thread.start()
                    self.last_heartbeat = datetime.now()
                except Exception as e:
                    print(f"[StradaMinerWatcher] Error al intentar reiniciar: {e}")

    def run_forever(self):
        """Main loop that executes continuously."""
        try:
            init_db()
        except Exception as e:
            print(f"[StradaMiner] Error en init_db: {e}")

        while self.running:
            try:
                self.last_heartbeat = datetime.now()
                self.load_fleet_mapping()
                
                # Check latest date to see if we need catch-up
                last_date = self.get_latest_date()
                print(f"[StradaMiner] Ciclo de actualización: {self.last_heartbeat}. Último dato en DB: {last_date}")

                print(f"[StradaMiner] Cycle start - {datetime.now()}")
                self.mine_all_parallel()
                self.last_heartbeat = datetime.now()
                print(f"[StradaMiner] Cycle finished - sleeping 30s")
                time.sleep(30) 
            except Exception as e:
                print(f"[StradaMiner] Error en bucle principal: {e}")
                traceback.print_exc()
                time.sleep(60)

    def get_latest_date(self):
        try:
            conn = get_db_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT MAX(timestamp) FROM positions")
            res = cursor.fetchone()
            conn.close()
            if res and res[0]:
                return datetime.fromisoformat(res[0])
        except Exception as e:
            print(f"[StradaMiner] Error get_latest_date: {e}")
        return None

    def load_fleet_mapping(self):
        try:
            r = requests.get(f"{STRADA_URL}/api/public/entities/id", auth=self.auth, timeout=30)
            if r.status_code == 200:
                with self._lock:
                    for ent in r.json():
                        name = ent.get('Name', '').replace(" ", "").upper()
                        key = ent.get('Key')
                        if "EX" in name:
                            clean_name = name.replace("EX", "")
                            if clean_name not in self.fleet_map:
                                self.fleet_map[clean_name] = key
                        else:
                            self.fleet_map[name] = key
        except Exception as e:
            print(f"[StradaMiner] Error mapeando flota: {e}")

    def mine_all_parallel(self):
        """Fetches data for all vehicles in parallel to avoid long blocking cycles.
        This focuses STRICTLY on the real-time window (last 5 minutes) every 30 seconds
        and occasionally triggers a historic gap check.
        """
        try:
            conn = get_db_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT plate FROM vehicles")
            target_plates = [row[0] for row in cursor.fetchall()]
            conn.close()
            
            # The API rejects timestamps, and wants whole YYYY-MM-DD strings. 
            now = datetime.now()
            # Fetch the current day (Strada only allows daily ranges or full days)
            start_str = now.strftime("%Y-%m-%d")
            # End string needs to be tomorrow to cover up to 23:59 today
            end_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = []
                for plate in target_plates:
                    key = self.fleet_map.get(plate)
                    if key:
                        futures.append(executor.submit(self.fetch_vehicle_data, plate, key, start_str, end_str))
                
                for future in futures:
                    try:
                        future.result() # Wait and catch exceptions
                    except Exception as e:
                        print(f"[StradaMiner] Error procesando vehículo: {e}")
                        
            # Trigger background gap filler (non-blocking) if we haven't done it recently
            if not hasattr(self, 'last_gap_check') or (now - self.last_gap_check).total_seconds() > 3600:
                self.last_gap_check = now
                threading.Thread(target=self.fill_historic_gaps, args=(target_plates,), daemon=True).start()
                
        except Exception as e:
            print(f"[StradaMiner] Error in mine_all_parallel: {e}")
            
    def fill_historic_gaps(self, plates):
        """Silently sweeps backwards up to 5 years scanning for missing days in the DB"""
        print("[StradaMiner GapFiller] Iniciando revisión de huecos históricos de 5 años...")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=5*365) # 5 years
        
        conn = get_db_conn()
        cursor = conn.cursor()
        
        # We sweep by days backwards to prioritize recent gaps.
        current_date = end_date
        while current_date > start_date:
            date_str = current_date.strftime("%Y-%m-%d")
            # Progress logging for debugging
            with open("miner_progress.txt", "w") as f:
                f.write(f"Checking {date_str} at {datetime.now()}")
            
            # Check if we have decent amount of positions for this day across all plates
            # A completely missing day will have 0 positions.
            cursor.execute("SELECT count(*) FROM positions WHERE timestamp LIKE ?", (f"{date_str}%",))
            count = cursor.fetchone()[0]
            
            if count < 100: # Arbitrary small number meaning "we missed this day"
                print(f"[StradaMiner GapFiller] Detectado hueco el {date_str}. Recuperando...")
                for plate in plates:
                    key = self.fleet_map.get(plate)
                    if key:
                        self.fetch_vehicle_data(plate, key, date_str, date_str)
                        time.sleep(1) # Be gentle with Strada API on historic
            
            current_date -= timedelta(days=1)
            time.sleep(0.1)
            
        conn.close()
        print("[StradaMiner GapFiller] Verificación de huecos completada.")

    def fetch_vehicle_data(self, plate, key, start, end):
        """Worker function for parallel execution."""
        # Use a new connection per thread to avoid SQLite issues
        conn = get_db_conn()
        cursor = conn.cursor()
        
        try:
            # 1. Activities
            self._fetch_api(f"{STRADA_URL}/api/public/entities/id/{key}/activities/{start}/{end}", plate, "activities", cursor)
            # 2. Sensors
            self._fetch_api(f"{STRADA_URL}/api/public/entities/id/{key}/inputs/digital/{start}/{end}", plate, "sensors", cursor)
            # 3. Positions
            self._fetch_api(f"{STRADA_URL}/api/public/entities/id/{key}/positions/{start}/{end}", plate, "positions", cursor)
            
            conn.commit()
        finally:
            conn.close()

    def _fetch_api(self, url, plate, type, cursor):
        try:
            timeout = 30 if type == "positions" else 15
            r = requests.get(url, auth=self.auth, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                from database_strada import IS_POSTGRES
                placeholder = "%s" if IS_POSTGRES else "?"
                
                if type == "activities":
                    for a in data:
                        if IS_POSTGRES:
                            sql = """INSERT INTO activities (plate, type, begin, "end", odometer) VALUES (%s, %s, %s, %s, %s)
                                     ON CONFLICT (plate, begin, type) DO NOTHING"""
                        else:
                            sql = "INSERT OR IGNORE INTO activities (plate, type, begin, end, odometer) VALUES (?, ?, ?, ?, ?)"
                        cursor.execute(sql, (plate, a.get('Type'), a.get('Begin'), a.get('End'), a.get('Odometer')))
                
                elif type == "sensors":
                    for inp in data:
                        for ev in inp.get('Events', []):
                            if IS_POSTGRES:
                                sql = """INSERT INTO crane_events (plate, begin, "end") VALUES (%s, %s, %s)
                                         ON CONFLICT (plate, begin) DO NOTHING"""
                            else:
                                sql = "INSERT OR IGNORE INTO crane_events (plate, begin, end) VALUES (?, ?, ?)"
                            cursor.execute(sql, (plate, ev.get('Begin'), ev.get('End')))
                
                elif type == "positions":
                    count = 0
                    for p in data:
                        if IS_POSTGRES:
                            sql = """INSERT INTO positions (plate, timestamp, latitude, longitude, speed, course) VALUES (%s, %s, %s, %s, %s, %s)
                                     ON CONFLICT (plate, timestamp) DO NOTHING"""
                        else:
                            sql = "INSERT OR IGNORE INTO positions (plate, timestamp, latitude, longitude, speed, course) VALUES (?, ?, ?, ?, ?, ?)"
                        cursor.execute(sql, (plate, p.get('Begin'), p.get('Y'), p.get('X'), p.get('Speed', 0), p.get('Course', 0)))
                        count += 1
                    if count > 0:
                        print(f"[StradaMiner] Saved {count} positions for {plate}")

        except requests.exceptions.RequestException as e:
            # Silent or minimal log for common network hiccups
            pass
        except Exception as e:
            print(f"[StradaMiner] Error fetch {type} for {plate}: {e}")

# Singleton instance
strada_miner = StradaMiner()
