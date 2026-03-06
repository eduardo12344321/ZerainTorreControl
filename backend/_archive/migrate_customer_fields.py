"""
Migración: Añadir campos de ubicación y descripción a customers
"""
import sys
sys.path.insert(0, '.')

from database import db

def migrate():
    print("🔧 Añadiendo campos a tabla customers...")
    
    with db.get_cursor() as c:
        # Añadir columna de ubicación de Google Maps
        try:
            c.execute("ALTER TABLE customers ADD COLUMN map_location TEXT")
            print("✅ Añadida columna 'map_location'")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  'map_location' ya existe")
            else:
                raise
        
        # Añadir columna de descripción de la empresa
        try:
            c.execute("ALTER TABLE customers ADD COLUMN company_description TEXT")
            print("✅ Añadida columna 'company_description'")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  'company_description' ya existe")
            else:
                raise
    
    print("✅ Migración completada")

if __name__ == "__main__":
    migrate()
