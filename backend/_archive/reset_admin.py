import sqlite3
from passlib.hash import pbkdf2_sha256

DB_PATH = 'zerain.db'
PASS = 'TorreControl2026'

def reset_admin():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Generate new hash
    new_hash = pbkdf2_sha256.hash(PASS)
    print(f"New Hash: {new_hash}")
    
    # Update
    c.execute("UPDATE admins SET password_hash = ? WHERE username = 'gerencia'", (new_hash,))
    conn.commit()
    
    # Verify
    c.execute("SELECT * FROM admins WHERE username = 'gerencia'")
    user = c.fetchone()
    print("User updated:", user)
    conn.close()

if __name__ == "__main__":
    reset_admin()
