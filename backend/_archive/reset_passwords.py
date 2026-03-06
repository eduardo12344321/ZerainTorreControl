import sqlite3
from passlib.hash import pbkdf2_sha256

def reset():
    conn = sqlite3.connect('backend/zerain.db')
    c = conn.cursor()
    
    admin_hash = pbkdf2_sha256.hash('TorreControl2026')
    driver_hash = pbkdf2_sha256.hash('Zerain2026!')
    
    # Update all admins to the same default password
    c.execute("UPDATE admins SET password_hash = ?", (admin_hash,))
    
    # Update all drivers to the same default password
    c.execute("UPDATE drivers SET password_hash = ?", (driver_hash,))
    
    conn.commit()
    print("✅ Todas las contraseñas de ADMIN se han reseteado a: TorreControl2026")
    print("✅ Todas las contraseñas de CONDUCTOR se han reseteado a: Zerain2026!")
    conn.close()

if __name__ == "__main__":
    reset()
