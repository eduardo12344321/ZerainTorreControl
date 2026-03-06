import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import db

# Precise data from user table
truck_data = [
    # plate, alias, category, axles, weight, length, crane, jib, box
    ('9216-FTR', 'Iveco Trakker 310 - Especial Altura & JIB', 'Grúa Pesada', 2, 10800, 6.5, True, True, False),
    ('9177-FTR', 'Renault Lander 310 - Todoterreno Obra', 'Grúa Pesada', 2, 11500, 6.5, True, False, False),
    ('2187-MRK', 'Renault C430 - Ruta y Potencia', 'Grúa Pesada', 2, 13100, 7.0, True, False, False),
    ('6314-KGS', 'Renault C380 - Carga Estructural', 'Grúa Pesada', 2, 12000, 7.5, True, False, False),
    ('4055-JMY', 'Renault C380 - Polivalente', 'Grúa Pesada', 2, 13500, 7.5, True, False, False),
    ('8292-LWM', 'Renault C280 - Reparto Ágil', 'Grúa Media', 1, 8600, 6.0, True, False, False),
    ('8859-MRW', 'Renault C320 - Potencia Compacta', 'Grúa Media', 1, 9000, 6.0, True, False, False),
    ('9168-FHJ', 'Renault Midlum 240 - Acceso Urbano', 'Grúa Ligera', 1, 7500, 5.5, True, False, False),
    ('2059-HGD', 'Volvo FL / Renault FLH - Logística', 'Transporte / Lona', 1, 9500, 7.5, False, False, True),
    ('5721-CWD', 'Renault Premium 270 - Carga General', 'Transporte / Lona', 1, 10000, 7.5, False, False, True),
    ('4742-HMX', 'Renault Master - Última Milla', 'Ligero / Furgón', 1, 1500, 4.0, False, False, True),
]

# Mapping by plate (normalized)
plate_to_id = {
    '2059-HGD': '4',
    '2187-MRK': '10',
    '4055-JMY': '11',
    '4742-HMX': '7',
    '5721-CWD': '5',
    '6314-KGS': '14',
    '8292-LWM': '1',
    '8859-MRW': '3',
    '9168-FHJ': '2',
    '9177-FTR': '13',
    '9216-FTR': '12'
}

def populate_trucks():
    print("🚚 Poblando base de datos local de camiones...")
    try:
        with db.get_cursor() as c:
            for plate, alias, category, axles, weight, length, crane, jib, box in truck_data:
                truck_id = plate_to_id.get(plate)
                if not truck_id:
                    print(f"⚠️ No se encontró ID de Odoo para la matrícula {plate}")
                    continue
                
                c.execute("""
                    INSERT OR REPLACE INTO trucks 
                    (id, plate, alias, category, axles, max_weight, color, 
                     has_crane, has_jib, is_box_body, max_length, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    truck_id,
                    plate,
                    alias,
                    category,
                    axles,
                    weight,
                    '#3b82f6', # Default corporate color from table
                    crane,
                    jib,
                    box,
                    length,
                    'AVAILABLE'
                ))
                print(f"✅ Camión {plate} actualizado (ID: {truck_id}).")
        print("✨ Proceso completado.")
    except Exception as e:
        print(f"🚨 Error poblando camiones: {e}")

if __name__ == "__main__":
    populate_trucks()
