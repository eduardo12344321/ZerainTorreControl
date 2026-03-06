import os
import json
from passlib.hash import pbkdf2_sha256

# Try to get key from env or use default for setup
from config import DB_PATH, DB_ENCRYPTION_KEY

# Determine if we should use SQLCipher based on env var
USE_SQLCIPHER = os.getenv("USE_SQLCIPHER", "false").lower() == "true"

if USE_SQLCIPHER:
    try:
        import sqlcipher3 as sqlite3
        print("🔐 Using SQLCipher for setup")
    except ImportError:
        import sqlite3
        print("⚠️ SQLCipher requested but not found, falling back to SQLite")
        USE_SQLCIPHER = False
else:
    import sqlite3
    print("📂 Using standard SQLite for setup")

def get_password_hash(password):
    return pbkdf2_sha256.hash(password)

def setup():
    # Detect PostgreSQL
    pg_url = os.getenv("DATABASE_URL")
    is_postgres = pg_url is not None and pg_url.startswith("postgres")
    
    if is_postgres:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        print(f"🔌 Connecting to PostgreSQL for setup...")
        conn = psycopg2.connect(pg_url)
        placeholder = "%s"
        pk_type = "SERIAL PRIMARY KEY"
    else:
        # Use DB_PATH from config (which defaults to /app/data/zerain.db in Cloud Run)
        print(f"🔌 Connecting to SQLite: {DB_PATH}")
        conn = sqlite3.connect(DB_PATH)
        if USE_SQLCIPHER:
            print(f"🔑 Applying encryption key...")
            conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
        placeholder = "?"
        pk_type = "INTEGER PRIMARY KEY AUTOINCREMENT"
    
    c = conn.cursor()
    
    # helper for timestamp
    ts_type = "TIMESTAMP" if is_postgres else "DATETIME"

    # 1. Trucks Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS trucks (
            id TEXT PRIMARY KEY,
            plate TEXT NOT NULL,
            alias TEXT,
            category TEXT NOT NULL,
            status TEXT DEFAULT 'AVAILABLE',
            axles INTEGER,
            max_weight REAL,
            color TEXT,
            has_crane BOOLEAN,
            has_jib BOOLEAN,
            is_box_body BOOLEAN,
            max_length REAL,
            current_location TEXT,
            default_driver_id TEXT,
            itv_expiration TEXT,
            next_maintenance TEXT,
            last_oil_change TEXT,
            last_oil_change_km INTEGER,
            last_tire_change TEXT,
            last_tire_change_km INTEGER,
            display_order INTEGER DEFAULT 0
        )
    """)

    # 2.5 Admins Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS admins (
            id {pk_type},
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'ADMIN',
            created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 3. Customers Table
    c.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            display_id INTEGER,
            name TEXT NOT NULL,
            nif TEXT,
            phone TEXT,
            email TEXT,
            billing_address TEXT,
            postal_code TEXT,
            city TEXT,
            province TEXT,
            country TEXT,
            payment_method TEXT,
            locations TEXT, -- JSON string of list
            notes TEXT,
            reliability INTEGER,
            image_128 TEXT,
            map_location TEXT,
            company_description TEXT,
            ai_category TEXT,
            ai_revenue TEXT,
            ai_employees TEXT,
            ai_reliability TEXT,
            ai_explanation TEXT,
            ai_company_status TEXT
        )
    """)

    # 4. Orders Table (Local overrides)
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            scheduled_start TEXT,
            truck_id TEXT,
            driver_id TEXT,
            status TEXT DEFAULT 'PLANNED',
            prep_duration_minutes INTEGER,
            driving_duration_minutes INTEGER,
            work_duration_minutes INTEGER,
            estimated_duration INTEGER,
            created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. Route Cache Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS route_cache (
            route_key TEXT PRIMARY KEY,
            origin_full TEXT,
            dest_full TEXT,
            distance_km REAL,
            duration_mins REAL,
            polyline TEXT,
            last_updated {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 8. Meals Table (Local)
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS meals (
            id TEXT PRIMARY KEY,
            truck_id TEXT,
            driver_id TEXT,
            scheduled_start TEXT,
            estimated_duration INTEGER,
            status TEXT DEFAULT 'PLANNED',
            description TEXT,
            type TEXT DEFAULT 'MEAL',
            client_id TEXT DEFAULT 'internal',
            client_name TEXT DEFAULT 'COMIDA',
            origin_address TEXT DEFAULT 'Base',
            destination_address TEXT DEFAULT 'Base',
            created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 8.5. Maintenance Orders Table (Local)
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS maintenance_orders (
            id TEXT PRIMARY KEY,
            truck_id TEXT NOT NULL,
            scheduled_start TEXT NOT NULL,
            scheduled_end TEXT,
            estimated_duration INTEGER,
            status TEXT DEFAULT 'MAINTENANCE',
            description TEXT,
            type TEXT DEFAULT 'MAINTENANCE',
            client_id TEXT DEFAULT 'internal',
            client_name TEXT DEFAULT 'MANTENIMIENTO',
            created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 9. AI Prompts Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS ai_prompts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            prompt TEXT NOT NULL,
            description TEXT,
            updated_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 10. Driver Leaves Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS driver_leaves (
            id {pk_type},
            driver_id TEXT,
            type TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'PENDING',
            admin_comment TEXT,
            created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 10. Delivery Notes Table
    c.execute(f"""
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
            created_at {ts_type} DEFAULT CURRENT_TIMESTAMP,
            updated_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 11. System Config Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 12. Attendance Log Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS attendance_log (
            id {pk_type},
            driver_id TEXT NOT NULL,
            type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            approved INTEGER DEFAULT 0,
            admin_modified INTEGER DEFAULT 0
        )
    """)

    # 13. Attendance Overrides Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS attendance_overrides (
            id {pk_type},
            driver_id TEXT NOT NULL,
            date TEXT NOT NULL,
            regular_hours REAL,
            overtime_hours REAL,
            diet_count INTEGER,
            status INTEGER DEFAULT 0,
            admin_comment TEXT,
            updated_at {ts_type} DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(driver_id, date)
        )
    """)

    # 14. Expenses Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS expenses (
            id {pk_type},
            driver_id TEXT NOT NULL,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            ticket_url TEXT,
            approved INTEGER DEFAULT 0,
            timestamp {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 15. Leaves Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS leaves (
            id {pk_type},
            driver_id TEXT NOT NULL,
            type TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            approved INTEGER DEFAULT 0,
            timestamp {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 16. Audit Logs Table
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id {pk_type},
            admin_username TEXT,
            action TEXT,
            table_name TEXT,
            record_id TEXT,
            details TEXT,
            ip_address TEXT,
            timestamp {ts_type} DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Helper for Upsert
    def universal_upsert(table, data, pks):
        if not data: return
        cols = list(data[0].keys())
        p_str = ",".join([placeholder] * len(cols))
        col_str = ",".join(cols)
        
        if is_postgres:
            update_cols = [col for col in cols if col not in pks]
            update_str = ",".join([f"{col}=EXCLUDED.{col}" for col in update_cols])
            conflict_target = ",".join(pks)
            sql = f'INSERT INTO {table} ({col_str}) VALUES ({p_str}) ON CONFLICT ({conflict_target}) DO UPDATE SET {update_str}'
        else:
            sql = f'INSERT OR REPLACE INTO {table} ({col_str}) VALUES ({p_str})'
        
        rows = [tuple(d[col] for col in cols) for d in data]
        c.executemany(sql, rows)

    # --- POPULATE DATA ---
    
    # 1. AI Prompts
    prompts = [
        {'id': 'enrich_company_deep', 'name': 'Investigación de Clientes (Deep)', 'prompt': 'Actúa como un experto...', 'description': 'Prompt para la investigación profunda...'},
        {'id': 'vision_receipt', 'name': 'OCR de Tickets de Gasto', 'prompt': 'Analyze this receipt...', 'description': 'Extracción de datos de tickets...'},
        {'id': 'vision_delivery_note', 'name': 'OCR de Albaranes', 'prompt': 'Eres un experto...', 'description': 'Extracción de datos de albaranes...'},
        {'id': 'voice_order', 'name': 'Asistente de Voz / Dictado', 'prompt': 'Eres un experto...', 'description': 'Procesamiento de dictados de voz...'}
    ]
    universal_upsert('ai_prompts', prompts, ['id'])

    # 2. Trucks
    trucks = [
        {'id': 't1', 'plate': '9216-FTR', 'alias': 'Iveco Trakker + JIB (La Joya)', 'category': 'GRUA_PESADA', 'status': 'AVAILABLE', 'axles': 4, 'max_weight': 10500, 'color': '#dc2626', 'has_crane': True, 'has_jib': True, 'is_box_body': False, 'max_length': 6.20, 'display_order': 1},
        {'id': 't2', 'plate': '9177-FTR', 'alias': 'Renault Lander (4x4)', 'category': 'GRUA_PESADA', 'status': 'AVAILABLE', 'axles': 3, 'max_weight': 11000, 'color': '#ea580c', 'has_crane': True, 'has_jib': False, 'is_box_body': False, 'max_length': 6.40, 'display_order': 2},
        {'id': 't3', 'plate': '6314-KGS', 'alias': 'Renault C380 (Eje Elevable)', 'category': 'GRUA_PESADA', 'status': 'AVAILABLE', 'axles': 3, 'max_weight': 12500, 'color': '#ca8a04', 'has_crane': True, 'has_jib': True, 'is_box_body': False, 'max_length': 6.50, 'display_order': 3},
        {'id': 't4', 'plate': '2187-MRK', 'alias': 'Renault C430 (Potencia)', 'category': 'GRUA_PESADA', 'status': 'AVAILABLE', 'axles': 3, 'max_weight': 13000, 'color': '#16a34a', 'has_crane': True, 'has_jib': False, 'is_box_body': False, 'max_length': 6.60, 'display_order': 4},
        {'id': 't5', 'plate': '4055-JMY', 'alias': 'Renault C380 (Grúa 21)', 'category': 'GRUA_PESADA', 'status': 'AVAILABLE', 'axles': 3, 'max_weight': 13500, 'color': '#0891b2', 'has_crane': True, 'has_jib': True, 'is_box_body': False, 'max_length': 6.50, 'display_order': 5},
        {'id': 't6', 'plate': '8292-LWM', 'alias': 'Renault C280 (Urbano)', 'category': 'GRUA_LIGERA', 'status': 'AVAILABLE', 'axles': 2, 'max_weight': 8000, 'color': '#2563eb', 'has_crane': True, 'has_jib': False, 'is_box_body': False, 'max_length': 5.50, 'display_order': 6},
        {'id': 't7', 'plate': '9168-FHJ', 'alias': 'Renault Midlum (Compacto)', 'category': 'GRUA_LIGERA', 'status': 'AVAILABLE', 'axles': 2, 'max_weight': 7500, 'color': '#7c3aed', 'has_crane': True, 'has_jib': False, 'is_box_body': False, 'max_length': 5.20, 'display_order': 7},
        {'id': 't8', 'plate': '8859-MRW', 'alias': 'Renault C320 (Rápido)', 'category': 'GRUA_LIGERA', 'status': 'AVAILABLE', 'axles': 2, 'max_weight': 8500, 'color': '#db2777', 'has_crane': True, 'has_jib': False, 'is_box_body': False, 'max_length': 5.50, 'display_order': 8},
        {'id': 't9', 'plate': '2059-HGD', 'alias': 'Volvo FL (Paquetería)', 'category': 'RIGIDO', 'status': 'AVAILABLE', 'axles': 2, 'max_weight': 9500, 'color': '#be123c', 'has_crane': False, 'has_jib': False, 'is_box_body': True, 'max_length': 7.50, 'display_order': 9},
        {'id': 't10', 'plate': '5721-CWD', 'alias': 'Renault Premium (Materiales)', 'category': 'RIGIDO', 'status': 'AVAILABLE', 'axles': 2, 'max_weight': 10000, 'color': '#0f766e', 'has_crane': False, 'has_jib': False, 'is_box_body': False, 'max_length': 8.00, 'display_order': 10},
        {'id': 't11', 'plate': '4742-HMX', 'alias': 'Renault Master (Express)', 'category': 'FURGONETA', 'status': 'AVAILABLE', 'axles': 2, 'max_weight': 1200, 'color': '#b45309', 'has_crane': False, 'has_jib': False, 'is_box_body': True, 'max_length': 3.50, 'display_order': 11}
    ]
    universal_upsert('trucks', trucks, ['id'])

    # 3. Admins
    admin_pass = get_password_hash("TorreControl2026")
    admins = [
        {'username': 'eduardo.marquinez@gmail.com', 'password_hash': admin_pass, 'role': 'SUPER_ADMIN'},
        {'username': 'transporteszerain@gmail.com', 'password_hash': admin_pass, 'role': 'SUPER_ADMIN'},
        {'username': 'gerencia', 'password_hash': admin_pass, 'role': 'SUPER_ADMIN'},
        {'username': 'trafico', 'password_hash': admin_pass, 'role': 'DISPATCHER'}
    ]
    universal_upsert('admins', admins, ['username'])

    # 4. Customers
    customers = [
        {'id': 'c1', 'display_id': 1, 'name': 'Construcciones Norte SL', 'nif': 'B95000001', 'phone': '944 123 456', 'email': 'obra@norte.com', 'billing_address': 'Calle Mayor 1, Bilbao', 'postal_code': '48001', 'city': 'Bilbao', 'province': 'Bizkaia', 'country': 'España', 'payment_method': 'Transferencia 30 días', 'locations': json.dumps(['Obra Abandoibarra', 'Cantera Gorbea', 'Taller Amorebieta']), 'notes': 'Cliente preferencial', 'reliability': 9, 'image_128': None, 'map_location': '', 'company_description': ''},
        {'id': 'c2', 'display_id': 2, 'name': 'Andamiajes Bilbao', 'nif': 'B95000002', 'phone': '944 999 000', 'email': 'logistica@andamiajes.es', 'billing_address': 'Indautxu 4, Bilbao', 'postal_code': '48002', 'city': 'Bilbao', 'province': 'Bizkaia', 'country': 'España', 'payment_method': 'Giro 60 días', 'locations': json.dumps(['Puerto Bilbao', 'Almacén Basauri']), 'notes': '', 'reliability': None, 'image_128': None, 'map_location': '', 'company_description': ''}
    ]
    universal_upsert('customers', customers, ['id'])

    # 4. System Config
    config = [
        {'key': 'maintenance_oil_km', 'value': '30000'},
        {'key': 'maintenance_tire_km', 'value': '80000'},
        {'key': 'maintenance_warning_pct', 'value': '90'}
    ]
    universal_upsert('system_config', config, ['key'])

    conn.commit()
    conn.close()
    print("✅ Database setup complete.")

if __name__ == "__main__":
    setup()
