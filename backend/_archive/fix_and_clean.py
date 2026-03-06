import sqlite3
import os
from passlib.hash import pbkdf2_sha256

def get_password_hash(password):
    return pbkdf2_sha256.hash(password)

def fix_and_clean():
    db_file = 'backend/zerain.db'
    if not os.path.exists(db_file):
        db_file = 'zerain.db'
    
    conn = sqlite3.connect(db_file)
    c = conn.cursor()
    
    # 1. Borrar conductores de prueba (Manolo y Edu)
    print("🧹 Borrando conductores de prueba (Manolo y Edu)...")
    c.execute("DELETE FROM drivers WHERE name IN ('Manolo García', 'Edu Marki')")
    
    # 2. Borrar pedidos de prueba
    print("🧹 Borrando pedidos de prueba...")
    c.execute("DELETE FROM orders WHERE id LIKE 'o%'")
    
    # 3. Asegurar que los conductores restantes tengan contraseña funcional
    # Si algún conductor no tiene DNI o contraseña, el sistema falla.
    print("🔄 Asegurando contraseñas para el resto de trabajadores...")
    c.execute("SELECT id, name, dni, password_hash FROM drivers")
    drivers = c.fetchall()
    
    default_pass_hash = get_password_hash("Zerain2026!")
    
    for d_id, name, dni, pass_hash in drivers:
        if not pass_hash or not pass_hash.startswith('$pbkdf2'):
            print(f"   - Reparando acceso para {name} (ID {d_id})...")
            c.execute("UPDATE drivers SET password_hash = ? WHERE id = ?", (default_pass_hash, d_id))
        
        if not dni:
            # Generar un DNI ficticio basado en el ID si falta
            new_dni = f"D{d_id}000000"
            print(f"   - Asignando DNI temporal {new_dni} a {name}...")
            c.execute("UPDATE drivers SET dni = ? WHERE id = ?", (new_dni, d_id))

    conn.commit()
    
    # Listar resultado final
    print("\n✅ LIMPIEZA COMPLETADA.")
    c.execute("SELECT id, name, dni FROM drivers")
    final_drivers = c.fetchall()
    
    if not final_drivers:
        print("⚠️ No quedan trabajadores en la lista. Puedes crearlos desde el panel de control.")
    else:
        print(f"📦 Quedan {len(final_drivers)} trabajadores en total.")
        for d in final_drivers:
            print(f"   [{d[0]}] {d[1]} - Usuario: {d[2]}")
            
    conn.close()

if __name__ == "__main__":
    fix_and_clean()
