# Esquema de Base de Datos - Proyecto Torre de Control Zerain
# Motor: PostgreSQL (Supabase)

Este documento define la estructura de tablas para la gestión operativa.
Los agentes deben usar ESTOS nombres exactos de tablas y columnas al generar consultas SQL.

## 1. Tablas Maestras (Recursos)

### `trucks` (Flota de Camiones)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key (Default: uuid_generate_v4()) |
| `plate` | text | Matrícula (Ej: "9216-FTR"). Unique. |
| `alias` | text | Nombre corto (Ej: "Grúa Volvo Grande") |
| `category` | text | 'GRUA_PESADA', 'GRUA_LIGERA', 'TRAILER' |
| `status` | text | Estado actual: 'AVAILABLE' (Verde), 'BUSY' (Amarillo), 'MAINTENANCE' (Rojo) |
| `itv_due_date` | date | Fecha caducidad ITV (Para alertas) |
| `last_location` | jsonb | Coordenadas GPS {lat: float, lng: float} (Sync con Movertis) |

### `drivers` (Conductores)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `name` | text | Nombre del chofer (Ej: "Manolo") |
| `is_active` | boolean | Si sigue trabajando en la empresa |

### `clients` (Caché Operativa)
*Nota: Sincronizado periódicamente desde Synergy/Dimoni, pero vive aquí para rapidez.*
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `synergy_ref` | text | ID del cliente en el ERP antiguo |
| `name` | text | Nombre comercial |
| `phone_numbers` | text[] | Array de teléfonos conocidos (Para identificar llamadas) |
| `preferences` | text | Notas de la IA: "Pide siempre por la mañana", "Necesita grúa larga" |

---

## 2. El Corazón Operativo

### `orders` (Pedidos / Servicios)
Esta es la tabla principal que alimenta el "Tetris".

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `display_id` | serial | ID corto humano (Ej: #1024) para hablar por radio |
| `status` | text | **Estados del Semáforo:**<br>- `DRAFT` (Azul Claro - Recién creado por IA/Voz)<br>- `PLANNED` (Azul Oscuro - Asignado en Calendario)<br>- `IN_PROGRESS` (Naranja - Chofer ha dado Start)<br>- `COMPLETED` (Verde - Albarán firmado)<br>- `INCIDENT` (Rojo - Problema/Cancelado) |
| `client_id` | uuid | FK -> clients.id |
| `description` | text | Resumen del trabajo (Ej: "Llevar casetas a obra Arasur") |
| `origin_address` | text | Dirección de recogida |
| `destination_address` | text | Dirección de entrega |
| `scheduled_start` | timestamptz | Fecha/Hora planificada (Inicio de la barra en el Tetris) |
| `estimated_duration` | interval | Duración estimada (Largo de la barra en el Tetris) |
| `truck_id` | uuid | FK -> trucks.id (Nullable: Puede estar sin asignar) |
| `driver_id` | uuid | FK -> drivers.id (Nullable) |
| `notes_internal` | text | Notas del jefe (No las ve el cliente) |
| `transcript_original` | text | Transcripción literal de la llamada que originó el pedido |

---

## 3. Datos de Campo (App Conductor & Movertis)

### `expenses` (Tickets y Gastos)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | PK |
| `driver_id` | uuid | Quién subió el gasto |
| `order_id` | uuid | (Opcional) A qué viaje pertenece |
| `amount` | decimal | Importe detectado por la IA |
| `concept` | text | 'COMBUSTIBLE', 'DIETA', 'PEAJE', 'MATERIAL' |
| `image_url` | text | Link a la foto del ticket en Storage |
| `ocr_raw_data` | jsonb | Datos crudos leídos del ticket por Gemini |
| `approved` | boolean | Si el jefe le ha dado el OK |

### `time_logs` (Fichaje Horario)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | PK |
| `driver_id` | uuid | FK |
| `event_type` | text | 'CLOCK_IN' (Entrada), 'CLOCK_OUT' (Salida) |
| `timestamp` | timestamptz | Hora exacta |
| `location` | jsonb | GPS donde fichó (Para verificar que estaba en base/camión) |

---

## SQL Scripts de Utilidad (Para el Agente)

### Crear pedido rápido desde IA
```sql
INSERT INTO orders (status, client_id, description, origin_address, notes_internal)
VALUES ('DRAFT', 'uuid-cliente', 'Transporte urgente máquina', 'Polígono Jundiz', 'Detectado por Voz');
```
