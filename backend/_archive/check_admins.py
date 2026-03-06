import sqlite3
from passlib.hash import pbkdf2_sha256

def check_admins():
    conn = sqlite3.connect('backend/zerain.db')
    c = conn.cursor()
    c.execute("SELECT username, password_hash FROM admins")
    rows = c.fetchall()
    conn.close()
    
    pwd = "TorreControl2026"
    print(f"Checking admins against password: {pwd}")
    for username, h in rows:
        match = pbkdf2_sha256.verify(pwd, h)
        print(f"User: {username}, Match: {match}")

if __name__ == "__main__":
    check_admins()
