from passlib.hash import pbkdf2_sha256
import sqlite3

def verify_admin_login(username, password):
    conn = sqlite3.connect('backend/zerain.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM admins WHERE username = ?", (username,))
    user = c.fetchone()
    conn.close()
    
    if not user:
        print(f"❌ Admin with username {username} not found.")
        return
    
    hashed = user['password_hash']
    print(f"Found admin: {user['username']} (Role: {user['role']})")
    
    try:
        if pbkdf2_sha256.verify(password, hashed):
            print(f"✅ Password '{password}' VERIFIED successfully for admin!")
        else:
            print(f"❌ Password '{password}' verification FAILED.")
    except Exception as e:
        print(f"❌ Error during verification: {e}")

if __name__ == "__main__":
    import sys
    user = sys.argv[1] if len(sys.argv) > 1 else 'GerenciaEdu'
    pwd = sys.argv[2] if len(sys.argv) > 2 else 'TorreControl2026'
    
    print(f"Testing admin login for {user}...")
    verify_admin_login(user, pwd)
