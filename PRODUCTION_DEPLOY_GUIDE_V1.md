# 🚀 Guía de Despliegue a Producción: Torre Control Zerain

Esta guía contiene los pasos y comandos necesarios para lanzar la plataforma completa a la nube de **Google Cloud Platform (GCP)**.

## 📦 1. Despliegue del Backend (Cloud Run)

El backend corre en un contenedor Docker y utiliza un volumen persistente (GCS Fuse) para la base de datos `zerain.db`.

### Comandos de Despliegue
Ejecuta esto desde la raíz del proyecto para subir la API:

```powershell
# Definir variables básicas
$ProjectId = "torre-control-zerain"
$Region = "europe-west1"
$BucketName = "$ProjectId-data"

# 1. Crear el bucket si no existe (para la base de datos persistente)
gsutil mb -l $Region gs://$BucketName

# 2. Desplegar a Cloud Run
# IMPORTANTE: Nota el PUNTO (.) al final de --source .
gcloud run deploy zerain-backend `
    --source . `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --set-env-vars "DATABASE_PATH=/app/data/zerain.db,GCP_PROJECT_ID=$ProjectId,GOOGLE_CLIENT_ID=241497426212-hgcajq2ep4vi97h0lid9gh81icf5ahrf.apps.googleusercontent.com,USE_SQLCIPHER=false" `
    --add-volume "name=zerain-data,type=cloud-storage,bucket=$BucketName" `
    --add-volume-mount "volume=zerain-data,mount-path=/app/data"
```

## 🌐 2. Despliegue del Frontend (Web App / PWA)

Para el frontend, lo más rápido es usar **Firebase Hosting** o el propio **GCP Storage** como sitio estático.

### Pasos Generales:
1.  **Construir el proyecto**:
    ```bash
    cd frontend
    npm run build
    ```
2.  **Subir la carpeta `dist`**:
    *   Si usas Firebase: `firebase deploy`
    *   Si usas GCP: `gsutil cp -r dist/* gs://tu-dominio-frontend/`

## 🔑 3. Variables de Entorno Críticas

Asegúrate de que estas variables estén en la configuración de **Cloud Run** (Consola de GCP > Cloud Run > Editar Nueva Revisión):

| Variable | Descripción |
| :--- | :--- |
| `DATABASE_PATH` | `/app/data/zerain.db` (Importante para persistencia) |
| `GCP_PROJECT_ID` | `torre-control-zerain` (Para que Gemini funcione) |
| `GOOGLE_MAPS_API_KEY` | Tu API Key con permisos para Distance Matrix y Geocoding |
| `VITE_API_BASE_URL` | La URL que te dé Cloud Run al terminar (ej: `https://zerain-backend...run.app`) |

## 🛠️ 4. Sincronización de Base de Datos
Si deseas subir tus datos locales actuales a producción:
```bash
gsutil cp backend/zerain.db gs://torre-control-zerain-data/zerain.db
```

---
> [!TIP]
> Una vez desplegado, abre la URL en tu móvil y selecciona **"Añadir a la pantalla de inicio"** para disfrutar de la experiencia PWA completa (Admin Lite y App de Conductor).
