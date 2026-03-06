import sqlite3
import os

def fix():
    db_paths = ['zerain.db', 'backend/zerain.db']
    
    for path in db_paths:
        if not os.path.exists(path):
            continue
            
        print(f"🔧 Repairing {path}...")
        conn = sqlite3.connect(path)
        c = conn.cursor()
        
        # 1. Create attendance_log
        c.execute("""
            CREATE TABLE IF NOT EXISTS attendance_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                driver_id TEXT NOT NULL,
                type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                approved INTEGER DEFAULT 0,
                admin_modified INTEGER DEFAULT 0
            )
        """)
        
        # 2. Create leaves (sometimes referenced as leaves, sometimes driver_leaves)
        # main.py uses 'leaves' at line 615
        c.execute("""
            CREATE TABLE IF NOT EXISTS leaves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                driver_id TEXT NOT NULL,
                type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                approved INTEGER DEFAULT 0,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. Ensure attendance_overrides has the right schema
        c.execute("""
            CREATE TABLE IF NOT EXISTS attendance_overrides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                driver_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                regular_hours REAL,
                overtime_hours REAL,
                diet_count INTEGER,
                status INTEGER DEFAULT 0,
                admin_comment TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(driver_id, date)
            )
        """)

        conn.commit()
        conn.close()
        print(f"✅ {path} repaired.")

if __name__ == "__main__":
    fix()
