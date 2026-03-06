import sqlite3
import os
import math
from datetime import datetime

# Adjust path for server
DB_PATH = "/home/transporteszerain/zerain-infra/torre/data/strada_cache.db"
if not os.path.exists(DB_PATH):
    DB_PATH = os.path.join(os.path.dirname(__file__), "data", "strada_cache.db")

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def verify():
    if not os.path.exists(DB_PATH):
        print(f"❌ DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    target_date = "2026-02-17"
    print(f"--- Accuracy Report for {target_date} ---")
    print(f"{'Plate':<10} | {'Points':<6} | {'KM':<10} | {'Drive(h)':<8} | {'Crane(h)':<8}")
    print("-" * 55)

    cursor.execute("SELECT plate FROM vehicles")
    trucks = [row['plate'] for row in cursor.fetchall()]

    for plate in trucks:
        # Distance
        cursor.execute("SELECT latitude, longitude, timestamp FROM positions WHERE plate = ? AND timestamp LIKE ? ORDER BY timestamp ASC", (plate, target_date + "%"))
        pos = cursor.fetchall()
        total_km = 0
        for i in range(1, len(pos)):
            total_km += haversine(pos[i-1]['latitude'], pos[i-1]['longitude'], pos[i]['latitude'], pos[i]['longitude'])
        
        # Drive time
        cursor.execute("SELECT begin, end FROM activities WHERE plate = ? AND type = 'Drive' AND begin LIKE ?", (plate, target_date + "%"))
        acts = cursor.fetchall()
        drive_mins = 0
        for a in acts:
            if a['begin'] and a['end']:
                try:
                    dur = (datetime.fromisoformat(a['end']) - datetime.fromisoformat(a['begin'])).total_seconds() / 60
                    drive_mins += max(0, dur)
                except: pass
        
        # Crane time
        cursor.execute("SELECT begin, end FROM crane_events WHERE plate = ? AND begin LIKE ?", (plate, target_date + "%"))
        crane = cursor.fetchall()
        crane_mins = 0
        for c in crane:
            if c['begin'] and c['end']:
                try:
                    dur = (datetime.fromisoformat(c['end']) - datetime.fromisoformat(c['begin'])).total_seconds() / 60
                    crane_mins += max(0, dur)
                except: pass

        print(f"{plate:<10} | {len(pos):<6} | {total_km:10.2f} | {drive_mins/60:8.2f} | {crane_mins/60:8.2f}")

    conn.close()

if __name__ == "__main__":
    verify()
