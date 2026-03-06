import sqlite3
import logging
from datetime import datetime, timedelta

def realign_timestamps():
    logging.basicConfig(level=logging.INFO)
    conn = sqlite3.connect('zerain.db')
    c = conn.cursor()
    
    # Target: Records dated 2026-02-02 that likely belong to the 2026-02-01 shift
    # Specifically those before 04:00 AM if they were logged manually or by bot
    
    # First, let's see which records we are talking about
    c.execute("""
        SELECT id, driver_id, type, timestamp 
        FROM attendance_log 
        WHERE timestamp LIKE '2026-02-02 %'
    """)
    rows = c.fetchall()
    
    updates = 0
    for row_id, driver_id, att_type, ts in rows:
        # If the log is for early morning Feb 2nd, it likely belongs to Feb 1st
        # Wait, the user said "activity of today is empty" for Edu Marki (ID 3).
        # But fix_timestamps.py SHOWED activity for Feb 2nd:
        # (53, '3', 'OUT', '2026-02-02 22:55', 0) -> This is definitely a future log or a timezone error
        # (57, '3', 'OUT', '2026-02-02 20:45', 0)
        
        # If the year is correct but day is Feb 2nd and it's currently Feb 2nd 00:51,
        # then "2026-02-02 22:55" is in the FUTURE. 
        # These are likely mock data or test data that should have been Feb 1st.
        
        new_ts = ts.replace('2026-02-02', '2026-02-01')
        c.execute("UPDATE attendance_log SET timestamp = ? WHERE id = ?", (new_ts, row_id))
        updates += 1
        logging.info(f"Realigned record {row_id} for driver {driver_id}: {ts} -> {new_ts}")

    conn.commit()
    logging.info(f"Realigned {updates} records to 2026-02-01.")
    conn.close()

if __name__ == "__main__":
    realign_timestamps()
