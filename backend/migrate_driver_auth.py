import sqlite3
import os

DB_PATH = 'zerain.db'

def migrate():
    print(f"🔌 Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("🛠️ Creating driver_credentials table...")
    c.execute("""
        CREATE TABLE IF NOT EXISTS driver_credentials (
            dni TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Optional: Pre-populate with a default password for any existing workers in Odoo
    # This is safer than a hard logout for everyone, but we'll let admins set them.

    conn.commit()
    conn.close()
    print("✅ Migration finished: driver_credentials table is ready.")

if __name__ == "__main__":
    migrate()
