import sqlite3
import os
import sys

# Force correct DB path logic without config
if True:
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'zerain.db')
    # Check if exists
    if not os.path.exists(DB_PATH):
        # Maybe we are deeper?
        DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'zerain.db')

def migrate():
    print(f"🔌 Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        # Check if column exists
        c.execute("PRAGMA table_info(orders)")
        columns = [col[1] for col in c.fetchall()]
        
        if 'previous_location' not in columns:
            print("🚀 Adding 'previous_location' column to orders table...")
            c.execute("ALTER TABLE orders ADD COLUMN previous_location TEXT")
            conn.commit()
            print("✅ Column added successfully.")
        else:
            print("ℹ️ Column 'previous_location' already exists.")
            
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
