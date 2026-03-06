import sqlite3
import os
from passlib.hash import pbkdf2_sha256

# Configuration
DB_PATH = "zerain.db"
PASSWORD = "Zerain2026!"
EMAILS = ["eduardo.marquinez@gmail.com", "transporteszerain@gmail.com"]

def fix_hashes():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database {DB_PATH} not found.")
        return

    # Generate a VALID hash using passlib
    new_hash = pbkdf2_sha256.hash(PASSWORD)
    print(f"Generated new hash for {PASSWORD}: {new_hash}")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        for email in EMAILS:
            # Check if exists
            cursor.execute("SELECT id FROM admins WHERE LOWER(username) = LOWER(?)", (email,))
            exists = cursor.fetchone()

            if exists:
                print(f"Updating existing admin: {email}")
                cursor.execute(
                    "UPDATE admins SET password_hash = ? WHERE id = ?",
                    (new_hash, exists[0])
                )
            else:
                print(f"Creating new admin: {email}")
                cursor.execute(
                    "INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)",
                    (email, new_hash, 'ADMIN')
                )

        # Also fix the default 'gerencia' user just in case
        cursor.execute("UPDATE admins SET password_hash = ? WHERE username = 'gerencia'", (new_hash,))

        conn.commit()
        print("Success: Admin hashes updated correctly.")
        
    except Exception as e:
        print(f"Database Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_hashes()
