# Guía de Secretos para Google Cloud (GCP)

Para desplegar la Torre de Control en producción de forma segura, debes configurar las siguientes Variables de Entorno en el servicio (Cloud Run / App Engine):

## 🚨 CRÍTICAS (La App no arranca o es insegura sin estas)

| Variable | Descripción | Valor Ejemplo / Notas |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | **OBLIGATORIO**. El Client ID de tu proyecto GCP para Auth. | `710345...apps.googleusercontent.com` |
| `SECRET_KEY` | Llave maestra para firmar los Tokens JWT de sesión. | Generar nueva cadena larga: `openssl rand -hex 32` |
| `DB_ENCRYPTION_KEY` | Clave para desencriptar la base de datos SQLCipher. | **NO PERDER NUNCA** o se perderán los datos. |
| `ADMIN_PASSWORD` | Contraseña maestra para el usuario 'admin' inicial. | Algo complejo y único. |

## 🌍 Configuración de Entorno

| Variable | Descripción | Valor |
| :--- | :--- | :--- |
| `GCP_PROJECT_ID` | ID del proyecto en Google Cloud. | `torre-control-zerain` |
| `GCP_LOCATION` | Región de los servicios. | `europe-west1` |
| `ALLOWED_ORIGINS` | Dominios permitidos (CORS). | `https://tu-dominio.com,http://localhost:5173` |

## 🗺️ APIs Externas

| Variable | Descripción |
| :--- | :--- |
| `GOOGLE_MAPS_API_KEY` | Para cálculo de rutas y visualización de mapas. |

> **Nota**: No subas el archivo `.env` al repositorio ni a la imagen Docker. Configura estas variables directamente en la consola de Google Cloud Run -> "Edit & Deploy New Revision" -> "Variables & Secrets".
