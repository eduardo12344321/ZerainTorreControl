import sqlcipher3 as sqlite3
from config import DB_PATH, DB_ENCRYPTION_KEY

def migrate():
    print(f"Migrating database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
    c = conn.cursor()

    print("Creating delivery_notes table...")
    # Condensed query
    q = "CREATE TABLE IF NOT EXISTS delivery_notes (id TEXT PRIMARY KEY, albaran_number TEXT UNIQUE, order_id TEXT, date TEXT NOT NULL, driver_name TEXT, vehicle_plate TEXT, client_name TEXT, client_code TEXT, client_address TEXT, shipper_name TEXT, shipper_address TEXT, loading_date TEXT, consignee_name TEXT, consignee_address TEXT, unloading_date TEXT, service_concept TEXT, merchandise TEXT, weight_kg REAL, length_m REAL, vehicle_type TEXT, complements TEXT, crane_height TEXT, load_capacity TEXT, start_time TEXT, arrival_time TEXT, departure_time TEXT, end_time TEXT, total_hours REAL, observations TEXT, billing_items TEXT, status TEXT DEFAULT 'draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    c.execute(q)
    
    conn.commit()
    conn.close()
    print("✅ Migration complete: delivery_notes table created.")

if __name__ == "__main__":
    migrate()
