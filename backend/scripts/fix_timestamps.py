import sqlite3
import logging

def fix_malformed_timestamps():
    logging.basicConfig(level=logging.INFO)
    conn = sqlite3.connect('zerain.db')
    c = conn.cursor()
    
    # Fix the 20226 year bug
    c.execute("UPDATE attendance_log SET timestamp = REPLACE(timestamp, '20226-', '2026-') WHERE timestamp LIKE '20226-%'")
    count = c.rowcount
    
    conn.commit()
    logging.info(f"Fixed {count} malformed timestamps.")
    
    # Final check: Show activity for profile 3 (Edu Marki)
    c.execute("SELECT * FROM attendance_log WHERE driver_id = '3' ORDER BY timestamp DESC LIMIT 5")
    rows = c.fetchall()
    logging.info(f"Latest activity for Edu Marki (ID 3): {rows}")
    
    conn.close()

if __name__ == "__main__":
    fix_malformed_timestamps()
