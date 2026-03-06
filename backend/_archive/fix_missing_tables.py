import sqlite3
import os
from config import DB_PATH, DB_ENCRYPTION_KEY

# Determine if we should use SQLCipher base on env var
USE_SQLCIPHER = os.getenv("USE_SQLCIPHER", "false").lower() == "true"

def fix_tables():
    print(f"🔌 Connecting to {DB_PATH} to fix missing tables...")
    try:
        if USE_SQLCIPHER:
            import sqlcipher3 as sqlite3
            conn = sqlite3.connect(DB_PATH)
            conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
        else:
            import sqlite3
            conn = sqlite3.connect(DB_PATH)
        
        c = conn.cursor()
        
        print("🛠️ Creating delivery_notes table if it doesn't exist...")
        c.execute("""
            CREATE TABLE IF NOT EXISTS delivery_notes (
                id TEXT PRIMARY KEY,
                albaran_number TEXT UNIQUE,
                order_id TEXT,
                date TEXT NOT NULL,
                driver_name TEXT,
                vehicle_plate TEXT,
                
                client_name TEXT,
                client_code TEXT,
                client_address TEXT,
                
                shipper_name TEXT,
                shipper_address TEXT,
                loading_date TEXT,
                
                consignee_name TEXT,
                consignee_address TEXT,
                unloading_date TEXT,
                
                service_concept TEXT,
                merchandise TEXT,
                weight_kg REAL,
                length_m REAL,
                
                vehicle_type TEXT,
                complements TEXT, -- JSON Array
                crane_height TEXT,
                load_capacity TEXT,
                
                start_time TEXT,
                arrival_time TEXT,
                departure_time TEXT,
                end_time TEXT,
                total_hours REAL,
                
                observations TEXT,
                billing_items TEXT, -- JSON Array
                
                status TEXT DEFAULT 'draft',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        print("✅ Tables fixed successfully.")
    except Exception as e:
        print(f"❌ Error fixing tables: {e}")

if __name__ == "__main__":
    fix_tables()
