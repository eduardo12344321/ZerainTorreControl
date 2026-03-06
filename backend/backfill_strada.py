import requests
from requests.auth import HTTPDigestAuth
import time
from datetime import datetime, timedelta
import sqlite3
import os
from concurrent.futures import ThreadPoolExecutor

# Configuration from StradaMiner
STRADA_URL = "http://api.stradatracking.com/v1"
STRADA_USER = "api_zerain_Integra"
STRADA_PASSWORD = "UXnxRaNnJHtU"

from database_strada import get_db_conn

class Backfiller:
    def __init__(self):
        self.auth = HTTPDigestAuth(STRADA_USER, STRADA_PASSWORD)
        self.fleet_map = {}

    def load_fleet_mapping(self):
        print("Mapeando flota...")
        r = requests.get(f"{STRADA_URL}/api/public/entities/id", auth=self.auth, timeout=30)
        if r.status_code == 200:
            for ent in r.json():
                name = ent.get('Name', '').replace(" ", "").upper()
                key = ent.get('Key')
                if "EX" in name:
                    clean_name = name.replace("EX", "")
                    self.fleet_map[clean_name] = key
                else:
                    self.fleet_map[name] = key
        print(f"Flota mapeada: {len(self.fleet_map)} entidades.")

    def backfill(self, start_date_str):
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.now()
        
        # Step of 3 days (balanced for Strada API stability)
        delta = timedelta(days=3)
        
        conn = get_db_conn()
        cursor = conn.cursor()
        
        # Get active plates in our DB
        cursor.execute("SELECT plate FROM vehicles")
        plates = [row[0] for row in cursor.fetchall()]
        
        current_start = start_date
        while current_start < end_date:
            current_end = current_start + delta
            if current_end > end_date:
                current_end = end_date
            
            s_str = current_start.strftime("%Y-%m-%d")
            e_str = current_end.strftime("%Y-%m-%d")
            
            print(f"\n🚀 Procesando rango: {s_str} -> {e_str}")
            
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = []
                for plate in plates:
                    key = self.fleet_map.get(plate)
                    if key:
                        futures.append(executor.submit(self.fetch_and_store_standalone, plate, key, s_str, e_str))
                
                for f in futures:
                    f.result() # Wait and re-throw
            
            current_start = current_end
        
        print("\n✅ Finalizado backfill histórico.")

    def fetch_and_store_standalone(self, plate, key, s_str, e_str):
        """Helper for parallel execution with its own DB connection"""
        conn = get_db_conn()
        cursor = conn.cursor()
        try:
            print(f"  📥 Descargando {plate}...")
            # Positions
            self._fetch_and_store(f"{STRADA_URL}/api/public/entities/id/{key}/positions/{s_str}/{e_str}", plate, "positions", cursor)
            # Activities
            self._fetch_and_store(f"{STRADA_URL}/api/public/entities/id/{key}/activities/{s_str}/{e_str}", plate, "activities", cursor)
            # Sensors (Crane)
            self._fetch_and_store(f"{STRADA_URL}/api/public/entities/id/{key}/inputs/digital/{s_str}/{e_str}", plate, "sensors", cursor)
            
            conn.commit()
        except Exception as e:
            print(f"    ❌ Error {plate}: {e}")
        finally:
            conn.close()

    def _fetch_and_store(self, url, plate, type, cursor):
        try:
            r = requests.get(url, auth=self.auth, timeout=60)
            r.raise_for_status()
            if r.status_code == 200:
                data = r.json()
                if not data: return
                
                if type == "activities":
                    for a in data:
                        cursor.execute("INSERT OR IGNORE INTO activities (plate, type, begin, end, odometer) VALUES (?, ?, ?, ?, ?)",
                                     (plate, a.get('Type'), a.get('Begin'), a.get('End'), a.get('Odometer')))
                elif type == "sensors":
                    for inp in data:
                        for ev in inp.get('Events', []):
                            cursor.execute("INSERT OR IGNORE INTO crane_events (plate, begin, end) VALUES (?, ?, ?)",
                                         (plate, ev.get('Begin'), ev.get('End')))
                elif type == "positions":
                    for p in data:
                        cursor.execute("INSERT OR IGNORE INTO positions (plate, timestamp, latitude, longitude, speed, course) VALUES (?, ?, ?, ?, ?, ?)",
                                     (plate, p.get('Begin'), p.get('Y'), p.get('X'), p.get('Speed', 0), p.get('Course', 0)))
        except Exception as e:
            print(f"    ❌ Error en {type} para {plate}: {e}")

if __name__ == "__main__":
    bf = Backfiller()
    bf.load_fleet_mapping()
    # User requested 5 years back from today (2026) -> 2021-01-01
    bf.backfill("2021-01-01")
