from passlib.hash import pbkdf2_sha256
import sqlite3

def test():
    conn = sqlite3.connect('backend/zerain.db')
    c = conn.cursor()
    c.execute("SELECT password_hash FROM driver_credentials WHERE dni = '16284835F'")
    row = c.fetchone()
    conn.close()
    
    if not row:
        print("❌ DNI not found in DB")
        return
        
    stored_hash = row[0]
    print(f"Stored Hash: {stored_hash}")
    
    password_to_test = "16284835"
    is_valid = pbkdf2_sha256.verify(password_to_test, stored_hash)
    
    if is_valid:
        print(f"✅ Password '{password_to_test}' is VALID for 16284835F")
    else:
        print(f"❌ Password '{password_to_test}' is INVALID for 16284835F")

if __name__ == "__main__":
    test()
