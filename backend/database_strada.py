import os
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Determine if we should use PostgreSQL
PG_URL = os.getenv("DATABASE_URL")
IS_POSTGRES = PG_URL is not None and PG_URL.startswith("postgres")

# Default path for SQLite fallback
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "strada_cache.db")

@contextmanager
def get_cursor(conn):
    if IS_POSTGRES:
        from psycopg2.extras import RealDictCursor
        cur = conn.cursor(cursor_factory=RealDictCursor)
    else:
        cur = conn.cursor()
    try:
        yield cur
    finally:
        cur.close()

def get_db_conn():
    if IS_POSTGRES:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(PG_URL)
        # We don't set cursor_factory on connection level here to avoid breaking 
        # scripts that expect standard cursor, but we'll provide a helper.
        return conn
    else:
        import sqlite3
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_db_conn()
    cursor = conn.cursor()
    
    pk_type = "SERIAL PRIMARY KEY" if IS_POSTGRES else "INTEGER PRIMARY KEY AUTOINCREMENT"
    timestamp_type = "TIMESTAMP" if IS_POSTGRES else "DATETIME"
    
    # 1. Vehicles table
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS vehicles (
        plate TEXT PRIMARY KEY,
        model TEXT,
        crane_model TEXT,
        has_crane BOOLEAN,
        last_sync {timestamp_type},
        sensor_usage_today TEXT,
        kms_today_report TEXT
    )
    ''')
    
    # 2. Positions table
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS positions (
        id {pk_type},
        plate TEXT,
        timestamp {timestamp_type},
        latitude REAL,
        longitude REAL,
        speed REAL,
        course REAL,
        fms_data TEXT, 
        crane_active BOOLEAN DEFAULT { 'FALSE' if IS_POSTGRES else '0' },
        FOREIGN KEY (plate) REFERENCES vehicles(plate),
        UNIQUE(plate, timestamp)
    )
    ''')
    
    # Indices
    if IS_POSTGRES:
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_positions_plate_time ON positions(plate, timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_positions_time ON positions(timestamp)')
    else:
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_positions_plate_time ON positions(plate, timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_positions_time ON positions(timestamp)')

    # 3. Activities table
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS activities (
        id {pk_type},
        plate TEXT,
        type TEXT,
        begin {timestamp_type},
        "end" {timestamp_type},
        duration REAL,
        odometer REAL,
        FOREIGN KEY (plate) REFERENCES vehicles(plate),
        UNIQUE(plate, begin, type)
    )
    ''')

    # 4. Crane events table
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS crane_events (
        id {pk_type},
        plate TEXT,
        begin {timestamp_type},
        "end" {timestamp_type},
        FOREIGN KEY (plate) REFERENCES vehicles(plate),
        UNIQUE(plate, begin)
    )
    ''')

    # 5. Infractions table
    cursor.execute(f'''
    CREATE TABLE IF NOT EXISTS infractions (
        id {pk_type},
        plate TEXT,
        type TEXT, 
        timestamp {timestamp_type},
        value REAL,
        description TEXT,
        FOREIGN KEY (plate) REFERENCES vehicles(plate)
    )
    ''')
    
    # Data population
    fleet = [
        ('9216FTR', 'Iveco Trakker 310', 'PK 36002 + JIB', True),
        ('9177FTR', 'Renault Lander/T 310', 'PK 36001', True),
        ('2187MRK', 'Renault C430', 'PK 26002', True),
        ('6314KGS', 'Renault C380', 'PK 29002', True),
        ('4055JMY', 'Renault C380', 'PK 21000', True),
        ('8292LWN', 'Renault C280', 'PK 18002', True),
        ('8859MRW', 'Renault C320', 'PK 14002', True),
        ('9168FHJ', 'Renault Midlum 240', 'PK 16502', True),
        ('2059HGD', 'Volvo FL', None, False),
        ('5721CWD', 'Renault 270', None, False),
        ('4742HMX', 'Renault Master', None, False)
    ]
    
    placeholder = "%s" if IS_POSTGRES else "?"
    if IS_POSTGRES:
        sql = '''
        INSERT INTO vehicles (plate, model, crane_model, has_crane)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (plate) DO UPDATE SET 
            model = EXCLUDED.model, 
            crane_model = EXCLUDED.crane_model, 
            has_crane = EXCLUDED.has_crane
        '''
    else:
        sql = 'INSERT OR REPLACE INTO vehicles (plate, model, crane_model, has_crane) VALUES (?, ?, ?, ?)'
    
    try:
        cursor.executemany(sql, fleet)
        conn.commit()
        print(f"Base de datos Strada inicializada (Postgres: {IS_POSTGRES})")
    except Exception as e:
        print(f"Error populating fleet: {e}")
        conn.rollback()
    finally:
        conn.close()
