import sqlite3
import os

DB_PATH = "/home/transporteszerain/zerain-infra/torre/data/strada_cache.db"

def get_stats():
    if not os.path.exists(DB_PATH):
        print(f"File not found: {DB_PATH}")
        return

    size_bytes = os.path.getsize(DB_PATH)
    size_mb = size_bytes / (1024 * 1024)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT count(*) FROM positions")
    pos_count = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM activities")
    act_count = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM crane_events")
    crane_count = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM vehicles")
    veh_count = cursor.fetchone()[0]

    print(f"DATABASE_SIZE: {size_mb:.2f} MB")
    print(f"VEHICLES: {veh_count}")
    print(f"POSITIONS: {pos_count}")
    print(f"ACTIVITIES: {act_count}")
    print(f"CRANE_EVENTS: {crane_count}")

    conn.close()

if __name__ == "__main__":
    get_stats()
