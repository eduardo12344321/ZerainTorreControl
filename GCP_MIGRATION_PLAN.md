# Plan de Migración de Zerain a GCP

## Descripción del Objetivo
Desplegar la Torre de Control Zerain en Google Cloud (Proyecto: `zerain-web-2026`) para solucionar el problema de acceso "localhost" para los conductores y proporcionar un entorno profesional y fiable.

## Fase 1: Contenerización (Backend)
1.  **Crear `backend/Dockerfile`**: Imagen Python basada en Alpine para mayor eficiencia.
2.  **Exponer Puerto 8080**: Estándar para Cloud Run.
3.  **Persistencia de Datos**: Para el despliegue inicial, utilizaremos un [Mount de Volumen de Cloud Run](https://cloud.google.com/run/docs/configuring/services/volumes) para mantener la base de datos SQLite `zerain.db` entre reinicios.

## Fase 2: Configuración de Frontend en la Nube
1.  **Variables de Entorno**: Actualizar `VITE_API_URL` para que apunte a la nueva URL de Cloud Run.
2.  **Configuración de Firebase**: Inicializar el proyecto Firebase para el alojamiento (Hosting).


## Lista de Verificación de Despliegue
1.  [ ] Construir y subir la imagen Docker a Artifact Registry.
2.  [ ] Desplegar el Backend en Cloud Run.
3.  [ ] Obtener la URL del Backend.
4.  [ ] Construir el Frontend con la URL del Backend.
5.  [ ] Desplegar el Frontend en Firebase Hosting.

