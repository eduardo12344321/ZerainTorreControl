from database import db
from passlib.hash import pbkdf2_sha256
import os

def reset_admin():
    username = "GerenciaEdu"
    password = "zerain2026" # Contraseña temporal
    hashed = pbkdf2_sha256.hash(password)
    
    print(f"Reseteando usuario local: {username}...")
    
    with db.get_cursor() as c:
        # Primero borramos si existe para evitar conflictos
        c.execute("DELETE FROM admins WHERE username = ?", (username,))
        # Insertamos el nuevo
        c.execute("""
            INSERT INTO admins (username, password_hash, role) 
            VALUES (?, ?, 'SUPER_ADMIN')
        """, (username, hashed))
        
    print("\n✅ ¡HECHO!")
    print(f"Usuario: {username}")
    print(f"Contraseña temporal: {password}")
    print("\nYa puedes intentar loguearte en la web.")

if __name__ == "__main__":
    reset_admin()
