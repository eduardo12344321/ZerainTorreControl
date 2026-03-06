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

    # Add missing columns to trucks table
    print("Migrating trucks table...")
    try:
        c.execute("ALTER TABLE trucks ADD COLUMN next_maintenance TEXT")
        print("Added next_maintenance column")
    except Exception as e:
        print(f"next_maintenance column already exists or error: {e}")

    try:
        c.execute("ALTER TABLE trucks ADD COLUMN itv_expiration TEXT")
        print("Added itv_expiration column")
    except Exception as e:
        print(f"itv_expiration column already exists or error: {e}")

    conn.commit()
    conn.close()
    print("✅ Migration complete.")

if __name__ == "__main__":
    migrate()
