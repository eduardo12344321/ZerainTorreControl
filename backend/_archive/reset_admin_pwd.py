from database import db
from passlib.hash import pbkdf2_sha256

username = "GerenciaEdu"
password = "zerain2026"
new_hash = pbkdf2_sha256.hash(password)

try:
    with db.get_cursor() as c:
        c.execute("UPDATE admins SET password_hash = ? WHERE LOWER(username) = LOWER(?)", (new_hash, username))
        print(f"Password updated for {username}")
        
        # Verify
        c.execute("SELECT username, password_hash FROM admins WHERE LOWER(username) = LOWER(?)", (username,))
        row = c.fetchone()
        if row:
            print(f"Verified user: {row[0]}")
            if pbkdf2_sha256.verify(password, row[1]):
                print("Verification successful!")
            else:
                print("Verification FAILED!")
        else:
            print("User not found after update!")
except Exception as e:
    print(f"Error: {e}")
