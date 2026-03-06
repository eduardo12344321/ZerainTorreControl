import sqlite3
import os
from config import DB_PATH, DB_ENCRYPTION_KEY

# Determine if we should use SQLCipher
USE_SQLCIPHER = os.getenv("USE_SQLCIPHER", "false").lower() == "true"

if USE_SQLCIPHER:
    try:
        import sqlcipher3 as sqlite3
        print("🔐 Using SQLCipher for migration")
    except ImportError:
        import sqlite3
        print("⚠️ SQLCipher requested but not found, falling back to SQLite")
else:
    import sqlite3

def migrate():
    print(f"🔌 Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    
    if USE_SQLCIPHER:
        conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
    
    c = conn.cursor()

    # Helper to add column if not exists
    def add_column(table, column, definition):
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            print(f"✅ Added {column} to {table}")
        except sqlite3.OperationalError:
            print(f"ℹ️ Column {column} already exists in {table}")

    print("🚀 Starting migration...")
    
    # Update trucks
    add_column("trucks", "current_location", "TEXT")
    add_column("trucks", "default_driver_id", "TEXT")
    
    # Update route_cache
    add_column("route_cache", "polyline", "TEXT")
    
    # Update orders (ensure columns from setup_database are there)
    # The setup_database.py already had these, but some databases might be older.
    add_column("orders", "route_polyline", "TEXT")
    add_column("orders", "odoo_id", "TEXT")

    conn.commit()
    conn.close()
    print("🏁 Migration finished!")

if __name__ == "__main__":
    migrate()
