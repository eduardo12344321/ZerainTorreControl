from passlib.hash import pbkdf2_sha256
import sqlite3

def check():
    conn = sqlite3.connect('backend/zerain.db')
    c = conn.cursor()
    c.execute("SELECT name, dni, password_hash FROM drivers WHERE dni = '72749672M'")
    row = c.fetchone()
    conn.close()
    
    if not row:
        print("User not found")
        return
        
    name, dni, h = row
    print(f"User: {name}, DNI: {dni}")
    print(f"Hash: {h}")
    
    pwd = "Zerain2026!"
    match = pbkdf2_sha256.verify(pwd, h)
    print(f"Does '{pwd}' match? {match}")

if __name__ == "__main__":
    check()
