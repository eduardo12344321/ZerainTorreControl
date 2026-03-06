# 📋 PROYECTO TORRE DE CONTROL: ESPECIFICACIÓN FUNCIONAL COMPLETA

**Cliente:** Transportes Zerain | **Versión:** 1.0 Definitiva

## 1. Visión General: El Semáforo Operativo

El sistema se basa en un código visual de colores universal. El objetivo es que el Gerente pueda entender el estado de toda su empresa (7 camiones y docenas de pedidos) en **3 segundos** mirando la pantalla de la TV, sin leer textos pequeños.

---

## 2. El Ciclo de Vida del Pedido (Estados y Colores)

Cada pedido es una "Tarjeta" en el sistema que cambia de color según avanza el día.

| Estado | Color Visual | Significado Operativo | Acción que lo activa |
| --- | --- | --- | --- |
| **Borrador** | 🔵 **Azul Claro** | Pedido entrante (Voz/Mail). Faltan datos o validar. | IA detecta llamada o email. |
| **Planificado** | 🟦 **Azul Oscuro** | Aprobado y asignado a un camión/hora específica. | Gerente arrastra la tarjeta al calendario (Tetris). |
| **En Curso** | 🟧 **Naranja** | El camión está ejecutando este trabajo ahora mismo. | Chofer pulsa `[▶️ Empezar]` en su App Móvil. |
| **Finalizado** | 🟢 **Verde** | Trabajo terminado y albarán firmado. Listo para facturar. | Chofer pulsa `[🏁 Finalizar]` en su App Móvil. |
| **Incidencia** | 🔴 **Rojo** | **¡ATENCIÓN!** Pedido cancelado, carga rechazada o avería. | Gerente o Chofer reportan problema. |

> **Nota Importante:** Los pedidos **Verdes (Finalizados)** NO desaparecen del calendario. Se quedan ahí para tener el histórico visual del día, pero se "atenúan" para no molestar.

---

## 3. Experiencia del Conductor (WebApp Móvil)

El conductor no necesita instalar nada. Accede a través de una **URL corporativa** protegida por contraseña que funciona como una App nativa en su móvil.

### Pantalla: "Mi Hoja de Ruta Hoy"

Lista cronológica de sus trabajos.

* **08:00 AM - Cargar en Michelin** (Estado: Pendiente)
* *Botón:* `[▶️ EMPEZAR]`
* *Acción:* Al pulsar, la tarjeta en la oficina cambia a **Naranja**. El sistema registra la hora de inicio.


* **...Durante el viaje...**
* El conductor llega, carga, el cliente firma el albarán físico/digital.
* *Botón:* `[🏁 FINALIZAR]`
* *Acción:* La tarjeta en la oficina cambia a **Verde**. El camión pasa a estado "Disponible/Retorno".


* **Botón de Pánico (Incidencias):**
* `[⚠️ REPORTAR PROBLEMA]` -> Menú rápido: "Avería", "Mercancía no cabe", "Cliente no está".
* *Acción:* La tarjeta en la oficina se pone **Roja** y parpadea. Alerta sonora en la Torre de Control.

---

## 4. La Pantalla Principal ("Torre de Control")

Diseñada para verse en una Smart TV de 50" en la oficina. Dividida en 3 zonas.

### Zona A: El "Tetris" (Calendario de Recursos)

* **Eje Vertical:** Los 7 Camiones (Agrupados por: Grúas Pesadas, Grúas Ligeras, Tráilers).
* **Eje Horizontal:** Las horas del día.
* **Interacción:** Arrastrar y soltar pedidos azules en los huecos vacíos.
* **Visualización:** Se ven las barras de colores (Azul, Naranja, Verde) llenando el día.

### Zona B: El Mapa Táctico en Tiempo Real (Integración Movertis)

No es un mapa normal. Es un mapa de **Toma de Decisiones**.

* **Los Iconos:** Cada camión se ve en el mapa con su **Matrícula** (ej. `9216-FTR`).
* **Código de Colores del Camión (El Círculo alrededor del icono):**
* 🟣 **Morado:** En Base (Camión aparcado en la nave).
* 🟡 **Amarillo:** Trabajando (Motor encendido pero velocidad 0, o PTO de grúa activada). Significa "Ocupado".
* 🟢 **Verde:** Disponible / En Ruta de Retorno. (Significa: "Puedes llamarle para que recoja algo de paso").
* 🔴 **Rojo:** Taller / Fuera de Servicio.


* **La "Etiqueta Inteligente" (Cuenta Atrás):**
* Junto a la matrícula, el sistema calcula cuánto le falta para terminar según el pedido asignado.
* *Ejemplo Visual:* 🚛 `9216-FTR (📍 Durango) - [Libre en: 1h 30m]`
* **¿Cómo se calcula?** (Tiempo estimado del pedido - Tiempo transcurrido desde que dio a "Empezar").
* **Utilidad:** Si llama un cliente de Durango, miras el mapa, ves al 9216 cerca y ves que le queda 1h. Le dices al cliente: *"En hora y media tengo un camión ahí"*.

### Zona C: Buzón de Entrada y Alertas

* Lista lateral con los pedidos nuevos (escuchados por la IA) pendientes de asignar.
* Alertas de mantenimiento (ITV caduca en 15 días).

---

---

## 6. Equipo de Agentes Virtuales (Vertex AI)

Para lograr autonomía, el sistema "contratará" a 5 empleados virtuales.

### 1. 🎧 Agente Telefonista ("Dispatcher Voice")
- **Misión:** Escucha vía Asterisk, transcribe en tiempo real y estructura pedidos en `orders`.
- **Skill Especial:** "Inyección de Contexto" (Recuerda últimos pedidos del cliente).

### 2. 📧 Agente Administrativo ("Document Parser")
- **Misión:** Lee PDFs (facturas/pedidos) de la bandeja de entrada usando OCR Inteligente (Gemini 1.5).
- **Skill Especial:** Clasificación automática (Factura vs spam vs pedido).

### 3. ⚖️ Agente Auditor ("Finance Guardian")
- **Misión:** Valida datos extraídos por el Agente 2. Compara precios históricos y detecta anomalías.
- **Skill Especial:** Detección de Anomalías (ej. subida de precio > 15%).

### 4. 🚚 Agente de Campo ("Driver Copilot")
- **Misión:** Reside en la WebApp del conductor. Valida tickets de gastos (Visión por Computador) y fichajes.
- **Skill Especial:** Validación visual de tickets arrugados.

### 5. 🧠 Agente Orquestador ("The Brain")
- **Misión:** Backend Core en Cloud Run. Coordina a los otros agentes y valida logística (tiempos y distancias).
- **Skill Especial:** Validación Logística (Calcula viabilidad de rutas en milisegundos).

---

## 7. Resumen Tecnológico para Desarrollo

Si el cliente aprueba esto, estas son las instrucciones técnicas para el equipo (o para el Agente Magnus):

1. **Frontend:** React (Dashboard) + WebApp Móvil (Conductores).
2. **Mapas:** Google Maps API + **Movertis API** (para coordenadas GPS y estado de motor).
3. **Backend:** Python/FastAPI en Google Cloud Run.
4. **Base de Datos:** Supabase (PostgreSQL) con tablas de `orders`, `truck_status`, `drivers`.
5. **Cálculos:** Script en Python que actualiza cada minuto el `estimated_completion_time` restando el tiempo actual al tiempo previsto, para mostrarlo en el mapa.
