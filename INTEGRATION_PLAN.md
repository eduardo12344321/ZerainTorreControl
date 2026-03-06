# Plan de Integración: Zerain ↔ Synergy (Connect)

Este documento detalla la estrategia técnica para conectar la Torre de Control Zerain con el ERP Synergy (Exact) y el software contable Dimoni, eliminando la duplicidad de datos.

## 1. Arquitectura de Conexión

Al tratarse de una instalación **On-Premise (SQL Server Local)**, la integración se realizará mediante una conexión directa a la base de datos o a través de los Web Services de Exact si están expuestos en la red local.

**Esquema Propuesto:**
`[Zerain Frontend]` ↔ `[Zerain Backend (Node.js)]` ↔ `[SQL Server (Synergy/Dimoni)]`

*   **Zerain Backend**: Actuará como el "agente de sincronización". Debe estar desplegado en un servidor que tenga visibilidad de red (VPN o LAN) contra el SQL Server de la empresa.

## 2. Flujos de Datos

### A. Sincronización de Clientes (Maestros)
*   **Origen**: Synergy/Dimoni (Tabla `cicmpy` o similar).
*   **Destino**: Zerain (Tabla `customers`).
*   **Frecuencia**:
    *   **Inicial**: Carga masiva (Bulk Import).
    *   **Incremental**: Cada 15-30 minutos, o bajo demanda al buscar un cliente en Zerain.
*   **Lógica**:
    1.  Zerain consulta SQL: `SELECT cmp_wwn, cmp_name, ... FROM cicmpy WHERE cmp_type = 'C'`.
    2.  Si el cliente no existe en Zerain -> `INSERT`.
    3.  Si existe pero ha cambiado (teléfono, dirección) -> `UPDATE`.
    4.  El `display_id` en Zerain será el Código de Cliente de Synergy para mantener la referencia.

### B. Creación de Pedidos (Operativa)
*   **Origen**: Zerain (Nuevo Pedido en el "Tetris").
*   **Destino**: Synergy (Proyectos/Flujos) y Dimoni (Albaranes/Pedidos).
*   **Disparador**: Al pulsar "Guardar" o "Validar" en Zerain.
*   **Lógica**:
    1.  Usuario crea pedido en Zerain.
    2.  Zerain guarda en su DB local (Supabase/Postgres) como "Pendiente de Sincronización".
    3.  Zerain Backend conecta con SQL Server e inserta el registro en las tablas de entrada de Synergy (`gbkmut` o tablas de *Requests*).
    4.  Si la inserción es correcta, Zerain marca el pedido como "Sincronizado (✅)".
    5.  Si hay error, muestra alerta al dispatcher para revisión manual.

## 3. Requisitos Técnicos Previos

Para ejecutar esta integración, necesitamos:

1.  **Acceso a la Base de Datos**:
    *   IP/Hostname del servidor SQL.
    *   Puerto (por defecto 1433).
    *   Usuario/Contraseña de SQL con permisos de **Lectura** (en `cicmpy`, `items`, etc.) y **Escritura** (en tablas de pedidos/requests).
2.  **Documentación del Esquema (Mapeo)**:
    *   Identificar tabla de Clientes (`cicmpy` en Exact Globe/Synergy suele ser estándar).
    *   Identificar tabla de Artículos/Servicios (Tipos de camión).
    *   Identificar tabla de Pedidos/Proyectos.
3.  **Entorno de Pruebas**:
    *   Una copia de la DB o una empresa "Demo" para no escribir datos basura en la empresa real durante el desarrollo.

## 4. Estrategia de Desarrollo (Fases)

### Fase 1: Lectura (Solo lectura)
*   Conectar Zerain para que *lea* los clientes directamente de Synergy.
*   Ventaja: El usuario busca un cliente y sale el real de facturación. No hay riesgo de romper nada.

### Fase 2: Escritura (Pedidos)
*   Desarrollar el insertado de pedidos en la empresa de pruebas.
*   Validar que Dimoni/Synergy reconocen el pedido correctamente.

### Fase 3: Despliegue
*   Instalar el "Agente Zerain" en el servidor del cliente.
*   Configurar como servicio de Windows (pm2 / nssm) para que arranque solo.

---

**Nota:** Hasta disponer del acceso, Zerain funcionará en "Modo Aislado", permitiendo importar/exportar datos vía Excel para mantener la operatividad.
