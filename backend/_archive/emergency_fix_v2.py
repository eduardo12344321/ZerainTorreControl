import sqlite3
import os
import time
from config import DB_PATH, DB_ENCRYPTION_KEY

# Determine if we should use SQLCipher
USE_SQLCIPHER = os.getenv("USE_SQLCIPHER", "false").lower() == "true"

def get_connection():
    # Retry logic for locked database
    max_retries = 5
    for i in range(max_retries):
        try:
            if USE_SQLCIPHER:
                import sqlcipher3 as sqlite3
                conn = sqlite3.connect(DB_PATH, timeout=10) # 10s timeout
                conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
            else:
                import sqlite3
                conn = sqlite3.connect(DB_PATH, timeout=10) # 10s timeout
            return conn
        except Exception as e:
            print(f"⚠️ Initial connect failed ({e}), retrying {i+1}/{max_retries}...")
            time.sleep(1)
            if i == max_retries - 1:
                raise e

def emergency_fix():
    abs_db_path = os.path.abspath(DB_PATH)
    print(f"🚑 Starting Emergency Database Fix on: {abs_db_path}")
    conn = get_connection()
    c = conn.cursor()

    # 1. Create MISSING Tables (delivery_notes)
    print("1️⃣ Checking missing tables...")
    c.execute("""
        CREATE TABLE IF NOT EXISTS delivery_notes (
            id TEXT PRIMARY KEY,
            albaran_number TEXT UNIQUE,
            order_id TEXT,
            date TEXT,
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
            complements TEXT, -- JSON
            crane_height TEXT,
            load_capacity TEXT,
            start_time TEXT,
            arrival_time TEXT,
            departure_time TEXT,
            end_time TEXT,
            total_hours REAL,
            observations TEXT,
            billing_items TEXT, -- JSON
            status TEXT DEFAULT 'DRAFT',
            pdf_url TEXT,
            signature_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✅ Checked 'delivery_notes' table")
    
    # 1.1 Create Attendance and Leaves Tables
    print("1.1️⃣ Checking attendance/leaves tables...")
    c.execute("""
        CREATE TABLE IF NOT EXISTS attendance_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id TEXT,
            type TEXT,
            timestamp TEXT,
            approved INTEGER DEFAULT 0,
            odoo_id INTEGER
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS leaves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id TEXT,
            type TEXT,
            start_date TEXT,
            end_date TEXT,
            timestamp TEXT,
            approved INTEGER DEFAULT 0
        )
    """)
    print("✅ Checked 'attendance_log' and 'leaves' tables")

    # 2. Add MISSING Columns
    print("2️⃣ Checking missing columns...")
    
    def add_column(table, column, definition):
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            print(f"   ✅ Added {column} to {table}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"   ℹ️ Column {column} already exists in {table}")
            else:
                print(f"   ⚠️ Error adding {column}: {e}")

    # Trucks
    add_column("trucks", "current_location", "TEXT")
    add_column("trucks", "default_driver_id", "TEXT")
    
    # Route Cache
    add_column("route_cache", "polyline", "TEXT")
    
    # Orders
    add_column("orders", "route_polyline", "TEXT")
    add_column("orders", "odoo_id", "TEXT")
    add_column("orders", "prep_duration_minutes", "INTEGER DEFAULT 0")
    add_column("orders", "driving_duration_minutes", "INTEGER DEFAULT 0")
    add_column("orders", "work_duration_minutes", "INTEGER DEFAULT 60")


    # 3. Commit
    conn.commit()
    conn.close()
    print("🏁 Emergency Fix Completed Successfully!")

if __name__ == "__main__":
    try:
        emergency_fix()
    except Exception as e:
        print(f"❌ FATAL ERROR: {e}")
