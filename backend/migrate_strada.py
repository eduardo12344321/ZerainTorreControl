import sqlite3
import os

# Check several possible paths (local dev, production VM, docker)
PATHS_TO_CHECK = [
    os.path.join(os.path.dirname(__file__), "data", "strada_cache.db"),
    "/home/transporteszerain/zerain-infra/torre/data/strada_cache.db",
    "/app/data/strada_cache.db"
]

DB_PATH = None
for p in PATHS_TO_CHECK:
    if os.path.exists(p):
        DB_PATH = p
        break

def migrate():
    if not DB_PATH:
        print(f"❌ DB no encontrada en ninguna de las rutas: {PATHS_TO_CHECK}")
        return

    print(f"🚀 Iniciando migración y limpieza de {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. POSITIONS
        print("清理 positions...")
        cursor.execute("CREATE TABLE positions_new (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT, timestamp DATETIME, latitude REAL, longitude REAL, speed REAL, course REAL, fms_data TEXT, crane_active BOOLEAN DEFAULT 0, FOREIGN KEY (plate) REFERENCES vehicles(plate), UNIQUE(plate, timestamp))")
        cursor.execute("INSERT OR IGNORE INTO positions_new (plate, timestamp, latitude, longitude, speed, course, fms_data, crane_active) SELECT plate, timestamp, latitude, longitude, speed, course, fms_data, crane_active FROM positions")
        cursor.execute("DROP TABLE positions")
        cursor.execute("ALTER TABLE positions_new RENAME TO positions")
        cursor.execute("CREATE INDEX idx_positions_plate_time ON positions(plate, timestamp)")
        cursor.execute("CREATE INDEX idx_positions_time ON positions(timestamp)")

        # 2. ACTIVITIES
        print("清理 activities...")
        cursor.execute("CREATE TABLE activities_new (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT, type TEXT, begin DATETIME, end DATETIME, duration REAL, odometer REAL, FOREIGN KEY (plate) REFERENCES vehicles(plate), UNIQUE(plate, begin, type))")
        cursor.execute("INSERT OR IGNORE INTO activities_new (plate, type, begin, end, duration, odometer) SELECT plate, type, begin, end, duration, odometer FROM activities")
        cursor.execute("DROP TABLE activities")
        cursor.execute("ALTER TABLE activities_new RENAME TO activities")
        cursor.execute("CREATE INDEX idx_activities_plate_time ON activities(plate, begin)")

        # 3. CRANE EVENTS
        print("清理 crane_events...")
        cursor.execute("CREATE TABLE crane_events_new (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT, begin DATETIME, end DATETIME, FOREIGN KEY (plate) REFERENCES vehicles(plate), UNIQUE(plate, begin))")
        cursor.execute("INSERT OR IGNORE INTO crane_events_new (plate, begin, end) SELECT plate, begin, end FROM crane_events")
        cursor.execute("DROP TABLE crane_events")
        cursor.execute("ALTER TABLE crane_events_new RENAME TO crane_events")
        cursor.execute("CREATE INDEX idx_crane_plate_time ON crane_events(plate, begin)")

        conn.commit()
        print("✅ Migración y de-duplicación completada con éxito.")
        
        # Opcional: VACUUM para reducir tamaño
        print("📦 Optimizando base de datos (VACUUM)...")
        conn.execute("VACUUM")
        print("✨ ¡Listo!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error durante la migración: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
