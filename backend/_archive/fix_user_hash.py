import sqlite3
from passlib.hash import pbkdf2_sha256

def fix_user():
    conn = sqlite3.connect('backend/zerain.db')
    c = conn.cursor()
    
    pwd_hash = pbkdf2_sha256.hash('Zerain2026!')
    print(f"New hash: {pwd_hash}")
    
    c.execute("UPDATE drivers SET password_hash = ? WHERE dni = '72749672M'", (pwd_hash,))
    conn.commit()
    print("User 72749672M updated with proper hash.")
    conn.close()

if __name__ == "__main__":
    fix_user()
