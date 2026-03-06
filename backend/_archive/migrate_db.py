import sqlite3
from datetime import datetime

def migrate_database():
    """Add approval tracking and expenses table"""
    conn = sqlite3.connect('zerain.db')
    c = conn.cursor()
    
    try:
        # Check if approved column exists in attendance_log
        c.execute("PRAGMA table_info(attendance_log)")
        columns = [col[1] for col in c.fetchall()]
        
        if 'approved' not in columns:
            c.execute('ALTER TABLE attendance_log ADD COLUMN approved INTEGER DEFAULT 0')
            print("✅ Added 'approved' column to attendance_log")
        
        # Check if approved column exists in leaves
        c.execute("PRAGMA table_info(leaves)")
        columns = [col[1] for col in c.fetchall()]
        
        if 'approved' not in columns:
            c.execute('ALTER TABLE leaves ADD COLUMN approved INTEGER DEFAULT 0')
            print("✅ Added 'approved' column to leaves")
        
        # Create expenses table if it doesn't exist
        c.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                driver_id TEXT NOT NULL,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                ticket_url TEXT,
                approved INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("✅ Created/verified expenses table")
        
        conn.commit()
        print("\n🎉 Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
