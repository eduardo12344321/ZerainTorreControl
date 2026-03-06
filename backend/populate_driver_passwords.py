import re
import sqlite3
from passlib.hash import pbkdf2_sha256
from services.odoo_service import odoo_client
from database import db

def get_numeric_dni(dni):
    if not dni: return ""
    # Remove any non-numeric characters
    return re.sub(r'\D', '', dni)

def get_password_hash(password):
    return pbkdf2_sha256.hash(password)

def populate():
    print("📡 Conectando a Odoo para recuperar lista de conductores...")
    if not odoo_client.uid: odoo_client.connect()
    
    # Fetch all employees from Odoo
    # We filter by job_id or just take all and check identification_id? 
    # Usually hr.employee identification_id is where DNI sits.
    employees = odoo_client.execute('hr.employee', 'search_read', 
                                  [['identification_id', '!=', False]], 
                                  ['id', 'name', 'identification_id'])
    
    print(f"📦 Se han encontrado {len(employees)} empleados con DNI.")
    print("-" * 60)
    print(f"{'NOMBRE':<25} {'DNI':<15} {'CONTRASEÑA MUESTRA'}")
    print("-" * 60)

    count = 0
    for emp in employees:
        dni = emp['identification_id'].upper().strip()
        name = emp['name']
        numeric_pwd = get_numeric_dni(dni)
        
        if not numeric_pwd:
            print(f"⚠️ Saltando {name} (DNI: {dni}): No se pudo extraer parte numérica.")
            continue
            
        pwd_hash = get_password_hash(numeric_pwd)
        
        try:
            with db.get_cursor() as c:
                c.execute("""
                    INSERT INTO driver_credentials (dni, password_hash) VALUES (?, ?)
                    ON CONFLICT(dni) DO UPDATE SET password_hash = excluded.password_hash, updated_at = CURRENT_TIMESTAMP
                """, (dni, pwd_hash))
            count += 1
            print(f"✅ {name:<25} {dni:<15} {numeric_pwd}")
        except Exception as e:
            print(f"❌ Error insertando {name}: {e}")

    print("-" * 60)
    print(f"🚀 Proceso completado. {count} conductores actualizados en la base de datos local.")
    
    # Export to JSON for easy reading
    import json
    with open('backend/drivers_credentials_list.json', 'w', encoding='utf-8') as f:
        json.dump(employees, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    populate()
