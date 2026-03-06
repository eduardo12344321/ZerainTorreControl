## 🔍 Debug: Script de Migración bloqueado

### 1. Síntoma
El proceso `migrate_trucks_to_odoo.py` lleva >40min ejecutándose sin terminar.

### 2. Información Recopilada
- **Script:** `backend/scripts/migrate_trucks_to_odoo.py`
- **Estado:** Ejecución en segundo plano persistente.
- **Código analizado:** Hace llamadas a Odoo (`search_model`, `search_brand`, `create`) **dentro** del bucle `for truck in local_trucks`.

### 3. Hipótesis
1. ❓ **Latencia de Red (Alta Probabilidad):** Al estar Odoo en Cloud (34.175...), hacer 3-4 llamadas XML-RPC por CADA camión es lentísimo. Si tienes 50 camiones, son 200 llamadas. Si cada una tarda 0.5s, son minutos. Si alguna se queda colgada sin timeout...
2. ❓ **Bucle Infinito (Media):** No parece haber bucle infinito lógico, pero sí "infinito" por lentitud.
3. ❓ **Bloqueo de Odoo:** Que Odoo esté rechazando conexiones o tardando en responder.

### 4. Solución (Fix)
Voy a optimizar el script para:
1. **Cachear IDs:** Buscar el Modelo y Marca "Zerain" **una sola vez** antes del bucle.
2. **Logs de Progreso:** Imprimir `Migrando camión X de Y...` para que veas que avanza.
3. **Timeouts:** Aunque es difícil ponerlo en el script sin tocar la librería, la optimización debería bastar.

### 5. Acción Requerida
**Mata la terminal** donde está corriendo ese script (Ctrl+C o cierra la ventana). Luego ejecuta el script optimizado que voy a crear.
