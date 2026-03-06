import sqlite3
import os
import sys
from passlib.hash import pbkdf2_sha256

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.odoo_service import odoo_client
from config import DB_PATH

def get_password_hash(password):
    return pbkdf2_sha256.hash(password)

def reset_passwords():
    print(f"🔌 Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Ensure Table Exists
    print("🛠️ Creating driver_credentials table if missing...")
    c.execute("""
        CREATE TABLE IF NOT EXISTS driver_credentials (
            dni TEXT PRIMARY KEY,
            password_hash TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Fetch Odoo Employees
    print("📦 Fetching employees from Odoo...")
    if not odoo_client.uid:
        if not odoo_client.connect():
            print("❌ Failed to connect to Odoo")
            return

    employees = odoo_client.get_employees()
    print(f"📥 Fetched {len(employees)} employees.")

    # 3. Insert/Update with password "1234"
    pwd_hash = get_password_hash("1234")
    count = 0
    
    for emp in employees:
        dni = (emp.get('identification_id') or '').upper().strip()
        name = emp.get('name', 'Unknown')
        
        if not dni:
            print(f"⚠️ Skipping {name}: No identification_id (DNI)")
            continue
            
        try:
            c.execute("""
                INSERT INTO driver_credentials (dni, password_hash) 
                VALUES (?, ?)
                ON CONFLICT(dni) DO UPDATE SET 
                    password_hash = excluded.password_hash,
                    updated_at = CURRENT_TIMESTAMP
            """, (dni, pwd_hash))
            count += 1
            # print(f"✅ Set 1234 for {name} ({dni})")
        except Exception as e:
            print(f"❌ Error updating {name}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Successfully set password '1234' for {count} drivers.")

if __name__ == "__main__":
    reset_passwords()
