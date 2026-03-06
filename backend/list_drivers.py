import sqlite3

def list_drivers():
    conn = sqlite3.connect(r'backend\zerain.db')
    c = conn.cursor()
    c.execute("SELECT id, name, dni, phone FROM drivers")
    drivers = c.fetchall()
    conn.close()
    
    print("\n📦 LISTADO DE CONDUCTORES:")
    print("-" * 60)
    print(f"{'ID':<5} {'NOMBRE':<20} {'DNI (Usuario)':<15} {'TELÉFONO'}")
    print("-" * 60)
    for d in drivers:
        print(f"{d[0]:<5} {d[1]:<20} {d[2]:<15} {d[3]}")
    print("-" * 60)
    print("\n🔑 CONTRASEÑA POR DEFECTO: Zerain2026!")

if __name__ == "__main__":
    list_drivers()
