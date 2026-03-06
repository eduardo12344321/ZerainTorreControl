import sqlite3
import os

def migrate_usage():
    """Adds gcp_usage table to track API costs/requests"""
    db_file = 'zerain.db' if os.path.exists('zerain.db') else 'backend/zerain.db'
    conn = sqlite3.connect(db_file)
    c = conn.cursor()
    
    try:
        # Create gcp_usage table
        c.execute('''
            CREATE TABLE IF NOT EXISTS gcp_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL, -- 'MAPS_SUGGEST', 'MAPS_DISTANCE', 'VERTEX_OCR'
                request_type TEXT,    -- More details if needed
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                cost_est REAL DEFAULT 0.0
            )
        ''')
        print("✅ Created gcp_usage table")
        
        conn.commit()
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_usage()
