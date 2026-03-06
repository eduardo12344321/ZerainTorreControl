import os
import sqlite3
from config import DB_PATH, DB_ENCRYPTION_KEY

# Determine if we should use SQLCipher based on env var
USE_SQLCIPHER = os.getenv("USE_SQLCIPHER", "false").lower() == "true"

def migrate():
    print(f"🔌 Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    
    if USE_SQLCIPHER:
        print(f"🔑 Applying encryption key...")
        conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
    
    c = conn.cursor()

    # Add display_order column to trucks table
    print("Migrating trucks table for display_order...")
    try:
        c.execute("ALTER TABLE trucks ADD COLUMN display_order INTEGER DEFAULT 0")
        print("Added display_order column")
    except Exception as e:
        print(f"display_order column already exists or error: {e}")

    conn.commit()
    conn.close()
    print("✅ Migration complete.")

if __name__ == "__main__":
    migrate()
