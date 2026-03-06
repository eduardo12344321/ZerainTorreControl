import sys
import os
import time
sys.path.append(os.path.dirname(__file__))

from services.strada_miner import strada_miner
from database_strada import get_db_conn

print("Iniciando miner...")
strada_miner.start()
print("Miner iniciado. Esperando 15 segundos para recopilar datos...")
time.sleep(15)

print("\n--- Resultados ---")
conn = get_db_conn()
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM vehicles")
val = cursor.fetchone()
print(f"Vehicles: {val['count'] if type(val) is dict else (val[0] if val else 0)}")

cursor.execute("SELECT COUNT(*) FROM positions")
val = cursor.fetchone()
print(f"Positions: {val['count'] if type(val) is dict else (val[0] if val else 0)}")

cursor.execute("SELECT COUNT(*) FROM activities")
val = cursor.fetchone()
print(f"Activities: {val['count'] if type(val) is dict else (val[0] if val else 0)}")

cursor.execute("SELECT COUNT(*) FROM crane_events")
val = cursor.fetchone()
print(f"Crane events: {val['count'] if type(val) is dict else (val[0] if val else 0)}")

conn.close()
print("Terminado.")
