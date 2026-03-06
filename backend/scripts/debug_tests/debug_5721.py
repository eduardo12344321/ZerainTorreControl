import sqlite3
import os
from datetime import datetime

DB_PATH = "/home/transporteszerain/zerain-infra/torre/data/strada_cache.db"
if not os.path.exists(DB_PATH):
    DB_PATH = os.path.join(os.path.dirname(__file__), "data", "strada_cache.db")

def debug_5721():
    plate = "5721CWD"
    today = datetime.now().strftime("%Y-%m-%d")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print(f"--- Debugging {plate} for {today} ---")
    
    # Get recent positions to see speed
    cursor.execute("""
        SELECT timestamp, speed, crane_active 
        FROM positions 
        WHERE plate = ? AND timestamp LIKE ? 
        ORDER BY timestamp DESC LIMIT 10
    """, (plate, today + "%"))
    
    positions = cursor.fetchall()
    print("\n[Recent Positions]")
    for p in positions:
        print(f"  Time: {p['timestamp']}, Speed: {p['speed']}, CraneInPos: {p['crane_active']}")
        
    # Get recent crane events
    cursor.execute("""
        SELECT begin, end 
        FROM crane_events 
        WHERE plate = ? AND begin LIKE ? 
        ORDER BY begin DESC LIMIT 5
    """, (plate, today + "%"))
    
    events = cursor.fetchall()
    print("\n[Recent Crane Events]")
    for e in events:
        print(f"  Event: {e['begin']} -> {e['end']}")

    conn.close()

if __name__ == "__main__":
    debug_5721()
