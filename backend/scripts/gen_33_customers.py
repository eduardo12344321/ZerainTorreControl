import pandas as pd
import random
import os

def generate_customers():
    data = []
    for i in range(1, 34):
        # Generate some realistic-looking Spanish data
        nif = f"{random.randint(10000000, 99999999)}{random.choice('TRWAGMYFPDXBNJZSQVHLCKE')}"
        phone = f"6{random.randint(10000000, 99999999)}"
        email = f"contacto_{204 + i}@empresa{i}.es"
        name = f"Zerain Client {204 + i} SL"
        
        data.append({
            'Nombre': name,
            'NIF': nif,
            'Teléfono': phone,
            'Email': email,
            'Dirección': f"Polígono Industrial Zerain, Parcela {i}, Guipúzcoa",
            'Notas': f"Cliente importado en lote 2. Prioridad {random.choice(['Alta', 'Media', 'Baja'])}"
        })

    df = pd.DataFrame(data)
    filename = 'clientes_nuevos_33.xlsx'
    df.to_excel(filename, index=False)
    print(f"Generated {filename}")
    return os.path.abspath(filename)

if __name__ == "__main__":
    generate_customers()
