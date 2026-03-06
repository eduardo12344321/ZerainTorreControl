import sqlite3
import os

db_path = 'zerain.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    # Delete meals that match the description of "Descanso/Comida"
    c.execute("DELETE FROM meals WHERE description LIKE '%Descanso%' OR description LIKE '%Comida%'")
    deleted = c.rowcount
    conn.commit()
    conn.close()
    print(f"Borrados {deleted} descansos/comidas de la base de datos local.")
else:
    print(f"Base de datos {db_path} no encontrada.")
