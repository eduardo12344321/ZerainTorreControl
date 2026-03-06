import pandas as pd

def generate():
    data = [
        {'ID': 't1', 'MATRICULA': '9216-FTR', 'ALIAS': 'Iveco Trakker + JIB (La Joya)', 'CATEGORIA': 'GRUA_PESADA', 'EJES': 4, 'PESO': 10500, 'GRUA': 1, 'PLUMA': 1, 'CAJA': 0, 'LARGO': 6.20},
        {'ID': 't2', 'MATRICULA': '9177-FTR', 'ALIAS': 'Renault Lander (4x4)', 'CATEGORIA': 'GRUA_PESADA', 'EJES': 3, 'PESO': 11000, 'GRUA': 1, 'PLUMA': 0, 'CAJA': 0, 'LARGO': 6.40},
        {'ID': 't3', 'MATRICULA': '6314-KGS', 'ALIAS': 'Renault C380 (Eje Elevable)', 'CATEGORIA': 'GRUA_PESADA', 'EJES': 3, 'PESO': 12500, 'GRUA': 1, 'PLUMA': 1, 'CAJA': 0, 'LARGO': 6.50},
        {'ID': 't4', 'MATRICULA': '2187-MRK', 'ALIAS': 'Renault C430 (Potencia)', 'CATEGORIA': 'GRUA_PESADA', 'EJES': 3, 'PESO': 13000, 'GRUA': 1, 'PLUMA': 0, 'CAJA': 0, 'LARGO': 6.60},
        {'ID': 't5', 'MATRICULA': '4055-JMY', 'ALIAS': 'Renault C380 (Grúa 21)', 'CATEGORIA': 'GRUA_PESADA', 'EJES': 3, 'PESO': 13500, 'GRUA': 1, 'PLUMA': 1, 'CAJA': 0, 'LARGO': 6.50},
        {'ID': 't6', 'MATRICULA': '8292-LWM', 'ALIAS': 'Renault C280 (Urbano)', 'CATEGORIA': 'GRUA_LIGERA', 'EJES': 2, 'PESO': 8000, 'GRUA': 1, 'PLUMA': 0, 'CAJA': 0, 'LARGO': 5.50},
        {'ID': 't7', 'MATRICULA': '9168-FHJ', 'ALIAS': 'Renault Midlum (Compacto)', 'CATEGORIA': 'GRUA_LIGERA', 'EJES': 2, 'PESO': 7500, 'GRUA': 1, 'PLUMA': 0, 'CAJA': 0, 'LARGO': 5.20},
        {'ID': 't8', 'MATRICULA': '8859-MRW', 'ALIAS': 'Renault C320 (Rápido)', 'CATEGORIA': 'GRUA_LIGERA', 'EJES': 2, 'PESO': 8500, 'GRUA': 1, 'PLUMA': 0, 'CAJA': 0, 'LARGO': 5.50},
        {'ID': 't9', 'MATRICULA': '2059-HGD', 'ALIAS': 'Volvo FL (Paquetería)', 'CATEGORIA': 'RIGIDO', 'EJES': 2, 'PESO': 9500, 'GRUA': 0, 'PLUMA': 0, 'CAJA': 1, 'LARGO': 7.50},
        {'ID': 't10', 'MATRICULA': '5721-CWD', 'ALIAS': 'Renault Premium (Materiales)', 'CATEGORIA': 'RIGIDO', 'EJES': 2, 'PESO': 10000, 'GRUA': 0, 'PLUMA': 0, 'CAJA': 0, 'LARGO': 8.00},
        {'ID': 't11', 'MATRICULA': '4742-HMX', 'ALIAS': 'Renault Master (Express)', 'CATEGORIA': 'FURGONETA', 'EJES': 2, 'PESO': 1200, 'GRUA': 0, 'PLUMA': 0, 'CAJA': 1, 'LARGO': 3.50}
    ]
    
    df = pd.DataFrame(data)
    df.to_excel("VEHICULOS_ZERAIN_V1.xlsx", index=False)
    print("Excel generado: VEHICULOS_ZERAIN_V1.xlsx")

if __name__ == "__main__":
    generate()
