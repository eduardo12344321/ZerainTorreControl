
import os
import sqlite3
import json
from dotenv import load_dotenv

# Replicate config.py logic
backend_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

db_path = os.getenv("DATABASE_PATH", "zerain.db")
print(f"Loaded DB_PATH from .env: {db_path}")

try:
    if not os.path.exists(db_path):
        print(f"❌ DB file does not exist at: {db_path}")
    else:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Replicate main.py logic (optimized)
        c.execute("SELECT id, display_id, name, nif, phone, email, billing_address, postal_code, city, notes, reliability, locations FROM customers")
        rows = c.fetchall()
        
        res = []
        for r in rows:
            d = dict(r)
            d['locations'] = json.loads(d['locations']) if d.get('locations') else []
            res.append(d)
        
        print(f"✅ Total customers retrieved: {len(res)}")
        if len(res) > 0:
            print(f"Sample customer: {res[0]['name']}")
            
        conn.close()
except Exception as e:
    print(f"❌ Error during simulation: {e}")
