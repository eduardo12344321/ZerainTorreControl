"""
Agrega las tablas faltantes a zerain_fresh.db (que ya tiene clientes)
"""
import sys
sys.path.insert(0, 'backend')

from config import DB_ENCRYPTION_KEY

try:
    import sqlcipher3 as sqlite3
    ENCRYPTED = True
except ImportError:
    import sqlite3
    ENCRYPTED = False

DB_FILE = "zerain_fresh.db"

def add_missing_tables():
    print(f"🔌 Abriendo {DB_FILE}...")
    conn = sqlite3.connect(DB_FILE)
    
    if ENCRYPTED:
        conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
        print("🔐 Desencriptando...")
    
    c = conn.cursor()
    
    # Verificar que tiene clientes
    c.execute("SELECT COUNT(*) FROM customers")
    count = c.fetchone()[0]
    print(f"✅ DB abierta. Clientes existentes: {count}\n")
    
    print("🔨 Creando tablas faltantes...")
    
    # Trucks
    c.execute("""
        CREATE TABLE IF NOT EXISTS trucks (
            id TEXT PRIMARY KEY,
            plate TEXT UNIQUE NOT NULL,
            model TEXT,
            capacity INTEGER,
            status TEXT DEFAULT 'active',
            current_location TEXT,
            last_updated TEXT
        )
    """)
    
    # Drivers
    c.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            telegram_id TEXT UNIQUE,
            status TEXT DEFAULT 'available',
            truck_id TEXT
        )
    """)
    
    # Orders
    c.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            display_id INTEGER,
            status TEXT DEFAULT 'DRAFT',
            type TEXT DEFAULT 'TRANSPORT',
            client_id TEXT,
            client_name TEXT,
            description TEXT,
            origin_address TEXT,
            destination_address TEXT,
            scheduled_start TEXT,
            estimated_duration INTEGER,
            truck_id TEXT,
            driver_id TEXT,
            created_at TEXT,
            polyline TEXT
        )
    """)
    
    # Admins
    c.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin'
        )
    """)
    
    # Expenses
    c.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            driver_id TEXT,
            amount REAL,
            description TEXT,
            receipt_url TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT
        )
    """)
    
    # Delivery Notes
    c.execute("""
        CREATE TABLE IF NOT EXISTS delivery_notes (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            delivery_date TEXT,
            signature_url TEXT,
            notes TEXT
        )
    """)
    
    # Attendance
    c.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            driver_id TEXT,
            clock_in TEXT,
            clock_out TEXT,
            status TEXT,
            validation_status TEXT DEFAULT 'pending',
            created_at TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    
    print("✅ Todas las tablas creadas")
    print(f"\n📤 Ahora sube a Cloud:")
    print(f"   gsutil cp {DB_FILE} gs://torre-control-zerain-data/zerain.db")

if __name__ == "__main__":
    add_missing_tables()
