import sqlite3
import os

def migrate_route_cache():
    """Adds route_cache table to store calculated distances and times"""
    db_file = 'zerain.db' if os.path.exists('zerain.db') else 'backend/zerain.db'
    conn = sqlite3.connect(db_file)
    c = conn.cursor()
    
    try:
        # Create route_cache table
        # We store both A->B and B->A as the same to save costs
        # We'll normalize origin/destination by sorting them alphabetically for the key
        c.execute('''
            CREATE TABLE IF NOT EXISTS route_cache (
                route_key TEXT PRIMARY KEY, -- "address1|address2" sorted alphabetically
                origin_full TEXT,
                dest_full TEXT,
                distance_km REAL,
                duration_mins REAL,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("✅ Created route_cache table")
        
        conn.commit()
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_route_cache()
