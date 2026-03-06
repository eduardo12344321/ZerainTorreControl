from passlib.hash import pbkdf2_sha256
import sqlite3

def run_all():
    pwd = "Zerain2026!"
    h = pbkdf2_sha256.hash(pwd)
    print(f"Generated hash: {h}")
    print(f"Immediate verify: {pbkdf2_sha256.verify(pwd, h)}")
    
    conn = sqlite3.connect('backend/zerain.db')
    c = conn.cursor()
    c.execute("UPDATE drivers SET password_hash = ? WHERE dni = '72749672M'", (h,))
    conn.commit()
    
    c.execute("SELECT password_hash FROM drivers WHERE dni = '72749672M'")
    stored_h = c.fetchone()[0]
    conn.close()
    
    print(f"Stored hash: {stored_h}")
    print(f"Verify stored: {pbkdf2_sha256.verify(pwd, stored_h)}")

if __name__ == "__main__":
    run_all()
