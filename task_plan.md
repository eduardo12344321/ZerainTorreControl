# 🏗️ Plan de Ejecución: Torre de Control Zerain

Este documento define la hoja de ruta técnica para construir el MVP de la Torre de Control.
Estado Global: `[x] Planificación` `[/] Desarrollo` `[ ] Pruebas` `[ ] Completado`

---

## 📅 Fase 1: Cimientos (Foundation) (COMPLETADA ✅)
**Objetivo:** Tener la infraestructura desplegada, base de datos operativa y "Hola Mundo" en Frontend y Backend.

### 1.1. Arquitectura y Repo
- [x] Inicializar repositorio Git con estructura Monorepo (backend/frontend).
- [x] Configurar `.gitignore` para Python, Node, y archivos de entorno.
- [x] Crear documentación técnica inicial (`README.md`, `ARCHITECTURE.md`).
- [x] Crear PLAN DE INTEGRACIÓN (`INTEGRATION_PLAN.md`).
- [x] Definir variables de entorno requeridas (.env.example).

### 1.2. Base de Datos (SQLite Local)
- [x] Migrar a SQLite local (`zerain.db`) para mayor control y velocidad.
- [x] **SQL Script:** Crear tabla `trucks` con tipos enum.
- [x] **SQL Script:** Crear tabla `drivers` con horarios flexibles.
- [x] **SQL Script:** Crear tabla `clients` (Caché).
- [x] **SQL Script:** Crear tabla `orders` (Core) con soporte para incidencias.
- [x] **SQL Script:** Crear tabla `expenses`.
- [x] **SQL Script:** Crear tabla `time_logs`.
- [x] **SQL Script:** Tabla `attendance_overrides` para auditoría.
- [x] Configurar **Seguridad**:
    - [x] Admin: Acceso total.
    - [x] Control de acceso basado en DNI para conductores.
- [x] Crear usuarios semilla (Seed Data) para pruebas.

### 1.3. Backend (Python/FastAPI)
- [x] Inicializar proyecto FastAPI.
- [x] Implementar Modelos Pydantic (basados en Schema).
- [x] Crear endpoint `GET /health` para Healthcheck.
- [x] Endpoints CRUD para Pedidos, Camiones y Conductores.
- [x] Soporte para incidencias y albaranes en `/orders`.
- [x] Middleware de CORS y Logueo.

### 1.4. Frontend (React + Vite)
- [x] Inicializar proyecto Vite + React + TypeScript.
- [x] Instalar y configurar **Tailwind CSS**.
- [x] Configurar Router (React Router).
- [x] Crear Layout Base (Shell de la aplicación).
- [x] Implementar Contexto Global (GlobalContext).
- [x] Página `Dashboard` con Timeline reactivo.

### 1.5. Autenticación y Seguridad (Auth)
- [x] Login de Conductor basado en DNI.
- [x] Login de Administrador (DNI/Username).
- [x] Persistencia de sesión en `localStorage`.

---

## 📺 Fase 2: El Núcleo Visual (La TV de la Oficina) (COMPLETADA ✅)
**Objetivo:** Que el Gerente pueda ver y organizar el día. El "Tetris".

### ✅ Fase 2: Validaciones y Restricciones
- [x] **Feature: Importación Excel (Clientes)**
- [x] Motor de Validación: Implementado en frontend (TruckRow/TimelineGrid).
- [x] Validación: Restricciones de grúa (crane-required).
- [x] Validación: Restricciones de peso y dimensiones (Smart Drag).
- [x] UI: Alertas visuales en drag & drop inválido (Grayscale effect).
- [x] Validación: Conflicto de conductores (Visual markers y Grid).

### 2.1. Componentes UI Base
- [x] Diseño Profesional (Aesthetics Pro Max).
- [x] Componente `OrderCard` dinámico con indicadores de estado.
- [x] Visualización de conductor asignado en tarjetas.

### 2.2. Lógica de Calendario (Timeline)
- [x] Grid X (6:00 - 22:00) y eje Y (Camiones/Recursos).
- [x] Renderizado en tiempo real de pedidos y tramos de viaje.
- [x] Líneas de guía para inicio y fin de jornada (07:00 / 18:00).

### 2.3. Funcionalidad Drag & Drop
- [x] Arrastrar pedidos entre camiones y horas.
- [x] **Lógica de Drop:**
    - [x] Recálculo automático de tiempos de viaje.
    - [x] Persistencia inmediata en base de datos.
    - [x] Manejo de colisiones y desplazamientos manuales.

---

## 👂 Fase 3: El Oído Digital (Ingesta) (COMPLETADA ✅)
**Objetivo:** Que los pedidos entren solos al sistema a través de voz/texto.

### 3.1. Agente de IA (Parser)
- [x] Implementar `RegexParser` para comandos de voz rápidos.
- [x] Extracción de: Cliente, Origen, Destino y Tipo de Vehículo.
- [x] Lógica de búsqueda de clientes por nombre parcial.

### 3.2. Integración en Flujo
- [x] Panel lateral "Inbox" para pedidos en borrador (DRAFT).
- [x] Funcionalidad "Aprobar/Planificar": Arrastrar de Inbox a Timeline.
- [x] Creación manual rápida con entrada por voz simulada.

---

## 📱 Fase 4: App de Conductores y Recursos (COMPLETADA ✅)
**Objetivo:** Flujo completo de trabajo y gestión de flota.

### 4.1. App Móvil (Driver App)
- [x] Interfaz simplificada para uso en conducción.
- [x] Vista de "Mi Hoja de Ruta" con órdenes asignadas.
- [x] **Flujo de Trabajo:**
    - [x] Botón "Iniciar Trabajo" (Update status -> IN_PROGRESS).
    - [x] Botón "Finalizar Trabajo" (Abre modal de incidencias).
    - [x] Registro de Incidencias y subida de Albarán (Foto).

### 4.2. Gestión de Recursos (Admin Panel)
- [x] **Vehículos:** CRUD completo + Gestión de ITV.
- [x] **Conductores:** CRUD completo + Horarios flexibles.
- [x] **Asignación Fija:** Vincular conductor predeterminado a cada camión.
- [x] **Smart Drag:** Oscurecer camiones incompatibles durante la planificación.

---

## 🌐 Fase 5: Integraciones Avanzadas
**Objetivo:** Inteligencia geográfica y tiempos reales.

### 5.1. Conector Movertis
- [ ] Investigar API Movertis (Auth, Endpoints).
- [ ] Servicio Backend Cron/Worker: Polling cada 60s (o Webhook si disponible).
- [ ] Actualizar tabla `trucks` con `last_location` y `status` (motor encendido/apagado).

### 5.2. Mapa Táctico
- [ ] Integrar Google Maps / Leaflet en Zona B del Dashboard.
- [ ] Renderizar Marcadores de Camiones.
- [ ] **Anillos de Estado:**
    - [ ] SVG Custom Marker con borde de color según estado del camión.
    - [ ] Tooltip con datos del chofer/pedido actual.

### 5.3. Algoritmo de Cuenta Atrás
- [ ] Lógica Backend/Frontend:
    - [ ] `Time_Remaining = (Scheduled_Start + Estimated_Duration) - Current_Time`.
    - [ ] Ajuste dinámico si ya empezó (usar `actual_start` en vez de `scheduled`).
- [ ] Mostrar etiqueta en el Mapa: "Libre en 45m".

---

## 🧾 Fase 6: Analizador de Facturas y Correos (Proyecto Anexo)
**Objetivo:** Automatizar la ingesta, lectura, validación y registro de facturas/correos (ej. Iberdrola) en Odoo mediante IA (Vertex AI/Gemini).

### 6.1. Frontend UI (Drag & Drop)
- [ ] Crear interfaz JS/HTML/CSS para soltar lotes de PDFs/EMLs (hasta 20).
- [ ] Panel de visualización de estado en tiempo real para cada archivo (Pendiente, Procesando, Validando, Éxito, Requiere Revisión).
- [ ] UI de revisión manual para aprobar facturas que la IA haya marcado como anómalas.

### 6.2. Backend IA (Python / FastAPI)
- [ ] API para recepción de archivos y consulta de estados.
- [ ] **Agente 1 (Extracción):** Vertex AI/Gemini para clasificar y extraer todos los campos relevantes de las facturas.
- [ ] **Agente 2 (Validación):** Comparar datos extraídos con el histórico para descubrir anomalías (aumentos bruscos, cambios de conceptos).
- [ ] **Agente 3 (Integración):** Enviar datos validados a Odoo vía XML-RPC para su registro definitivo.
