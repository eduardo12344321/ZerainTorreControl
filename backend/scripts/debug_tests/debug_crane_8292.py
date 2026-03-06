import sqlite3
import os
from datetime import datetime

DB_PATH = "/home/transporteszerain/zerain-infra/torre/data/strada_cache.db"
if not os.path.exists(DB_PATH):
    DB_PATH = os.path.join(os.path.dirname(__file__), "data", "strada_cache.db")

def debug_truck():
    plate = "8292LWN"
    today = "2026-02-19" # User said "today"
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print(f"--- Debugging {plate} for {today} ---")
    
    # 1. Activities (Drive)
    cursor.execute("SELECT begin, end, type FROM activities WHERE plate = ? AND begin LIKE ? ORDER BY begin ASC", (plate, today + "%"))
    drive_events = cursor.fetchall()
    print(f"\n[Activities - Drive]")
    for e in drive_events:
        print(f"  {e['type']}: {e['begin']} -> {e['end']}")
        
    # 2. Crane Events
    cursor.execute("SELECT begin, end FROM crane_events WHERE plate = ? AND begin LIKE ? ORDER BY begin ASC", (plate, today + "%"))
    crane_events = cursor.fetchall()
    print(f"\n[Crane Events]")
    total_crane_mins = 0
    for e in crane_events:
        if e['begin'] and e['end']:
            dur = (datetime.fromisoformat(e['end']) - datetime.fromisoformat(e['begin'])).total_seconds() / 60
            total_crane_mins += dur
            print(f"  Crane: {e['begin']} -> {e['end']} ({dur:.1f} min)")
        else:
            print(f"  Crane: {e['begin']} -> {e['end']} (OPEN END)")
            
    print(f"\nTotal Crane Minutes Calculated from DB: {total_crane_mins:.1f} ({total_crane_mins/60:.2f}h)")
    
    conn.close()

if __name__ == "__main__":
    debug_truck()
