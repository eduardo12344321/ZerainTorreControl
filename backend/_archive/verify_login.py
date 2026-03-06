from passlib.hash import pbkdf2_sha256
import sqlite3

def verify_driver_login(dni, password):
    conn = sqlite3.connect('backend/zerain.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM drivers WHERE dni = ?", (dni.upper(),))
    user = c.fetchone()
    conn.close()
    
    if not user:
        print(f"❌ User with DNI {dni} not found.")
        return
    
    hashed = user['password_hash']
    print(f"Found user: {user['name']} (DNI: {user['dni']})")
    print(f"Stored hash: {hashed[:20]}...")
    
    try:
        if pbkdf2_sha256.verify(password, hashed):
            print("✅ Password VERIFIED successfully in Backend logic!")
        else:
            print("❌ Password verification FAILED.")
    except Exception as e:
        print(f"❌ Error during verification: {e}")

if __name__ == "__main__":
    import sys
    dni = sys.argv[1] if len(sys.argv) > 1 else '72749672M'
    pwd = sys.argv[2] if len(sys.argv) > 2 else 'Zerain2026!'
    
    print(f"Testing login for {dni}...")
    verify_driver_login(dni, pwd)
