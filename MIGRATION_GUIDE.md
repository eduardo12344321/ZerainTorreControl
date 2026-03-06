# GUÍA DE MIGRACIÓN Y DESPLIEGUE: TORRE DE CONTROL & WEB ZERAIN

Esta guía detalla paso a paso cómo mover todo tu ecosistema a una única instancia de Google Cloud Platform (GCP) usando Docker Compose.

## 1. Preparación del Servidor en Google Cloud (VM)

> **ESTADO**: Estás creando la máquina ahora. Asegúrate de seguir estos pasos DENTRO de la consola de GCP antes de finalizar la creación o editando después.

### 1.1. Reserva de IP Estática (CRÍTICO para Staging)
Para que la estrategia `nip.io` funcione y no tengas que cambiar DNS cada vez que reinicias la máquina:
1. Ve a **VPC Network** > **IP addresses** en la consola de Google Cloud.
2. Clic en **RESERVE EXTERNAL STATIC IP ADDRESS**.
3. Ponle un nombre (ej: `zerain-production-ip`), Tier `Standard` o `Premium` (Premium es recomendado para web global).
4. Region: La misma que tu VM (ej: `europe-west1`).
5. **Attach to**: Selecciona tu instancia VM (si ya está creada) o déjala suelta y asígnala al crear la VM.

### 1.2. Configuración de la Instancia (e2-medium)
- **OS**: Ubuntu 22.04 LTS (Minimal es mejor).
- **Firewall**: Marca "Allow HTTP traffic" y "Allow HTTPS traffic".
- **Disco**: Al menos 20GB SSD (Balanced Persistent Disk).

### 1.3. Conexión e Instalación de Docker
Conéctate por SSH a tu instancia y ejecuta:

```bash
# Actualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Dar permisos a tu usuario actual (para no usar sudo en docker)
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker --version
docker compose version
```

## 2. Migración de WordPress (Local -> Nube)

Tienes tu web en `C:\Users\Saruman\Local Sites\zerainweb2026`.

### 2.1. Exportar la Base de Datos
Desde "Local WP":
1. Ve a la pestaña **Database**.
2. Abre **Adminer** (o Open Adminer).
3. Clic en **Export**.
4. Formato: `SQL`.
5. Output: `save`.
6. Clic en **Export**.
7. Guarda el archivo como `backup_wp.sql`.

### 2.2. Preparar los Archivos ("wp-content")
Solo necesitamos la carpeta `wp-content` de tu instalación local, ya que Docker pondrá el núcleo de WordPress nuevo.
1. Localiza la carpeta: `C:\Users\Saruman\Local Sites\zerainweb2026\app\public\wp-content`.
2. Comprime esa carpeta `wp-content` en un zip (`wp-content.zip`).

### 2.3. Subir Archivos al Servidor
Vas a necesitar subir:
- `backup_wp.sql`
- `wp-content.zip`

Puedes usar `scp` desde tu terminal local (PowerShell) o subirlo a un Cloud Storage y bajarlo en la VM. Ejemplo `scp`:

```powershell
# Estando en la carpeta donde tienes los archivos
scp -i RUTA_TU_KEY_SSH .\backup_wp.sql usuario_gcp@TU_IP_EXTERNA:~/
scp -i RUTA_TU_KEY_SSH .\wp-content.zip usuario_gcp@TU_IP_EXTERNA:~/
```

## 3. Despliegue Inicial (Modo Staging)

### 3.1. Clonar Repositorio
En la VM:
```bash
git clone https://github.com/TU_USUARIO/TorreControlZerain.git
cd TorreControlZerain
```

### 3.2. Configurar Entorno (.env)
Crea el archivo `.env` basado en el ejemplo:
```bash
cp .env.example .env
nano .env
```
**CONFIGURACIÓN STAGING (IMPORTANTE):**
Usa tu IP estática de GCP para crear dominios falsos con `nip.io`.
Supongamos que tu IP es `34.123.45.67`:

- `WP_PROTOCOL=http` (Al principio, luego cambiamos a https)
- `DOMAIN_WEB=web.34.123.45.67.nip.io`
- `DOMAIN_APP=torre.34.123.45.67.nip.io`

Rellena el resto de contraseñas.

### 3.3. Colocar Credenciales de Google
Sube tu JSON de credenciales GCP al servidor y colócalo en la raíz del proyecto con el nombre `gcp_credentials.json` (o edita el docker-compose si prefieres otra ruta).

### 3.4. Restaurar Datos de WordPress
Antes de levantar todo, preparamos las carpetas.

```bash
# Crear carpetas si no las crea docker
mkdir -p wp-content

# Descomprimir wp-content (asegúrate de que quede dentro de la carpeta mapeada en docker-compose)
# NOTA: En el compose hemos puesto volume: wp-content.
# La primera vez, arranca WP limpio para que cree la estructura y luego sobreescribimos.
```

1. **Arrancar solo Database y WP**:
   ```bash
   docker compose up -d wordpress-db wordpress
   ```
2. **Importar SQL**:
   ```bash
   # Copia el sql al contenedor
   docker cp ../backup_wp.sql wordpress-db:/tmp/backup.sql
   # Importar
   docker compose exec -T wordpress-db mariadb -u root -p"TU_CONTRASEÑA_ROOT" wordpress < ../backup_wp.sql
   ```
3. **Restaurar wp-content**:
   Esto es más fácil hacerlo montando un volumen local `mount` bind en lugar de volumen nombrado para la migración, O usar `docker cp`.
   ```bash
   # Copiar tu carpeta wp-content local dentro del contenedor
   # Primero descomprime el zip en la VM
   unzip wp-content.zip
   # Copiar al contenedor
   docker cp wp-content/. wordpress:/var/www/html/wp-content/
   # Ajustar permisos
   docker compose exec wordpress chown -R www-data:www-data /var/www/html/wp-content
   ```

### 3.5. Desplegar Todo
```bash
docker compose up -d --build
```

Ahora entra a `http://web.TU_IP.nip.io` y deberías ver tu WordPress.
Entra a `http://web.TU_IP.nip.io:81` para configurar el Nginx Proxy Manager (Usuario: `admin@example.com`, Pass: `changeme`).

## 4. Configurar SSL y Proxy Manager

1. Entra a Nginx Proxy Manager (puerto 81).
2. Crea un **Proxy Host**:
   - Domain Names: `web.TU_IP.nip.io`
   - Scheme: `http`
   - Forward Hostname / IP: `wordpress`
   - Forward Port: `80`
   - Block Common Exploits: ON
   - **SSL Tab**: Request a new SSL Certificate (Let's Encrypt). Force SSL: ON.
3. Repite para `torre-app`:
   - Domain: `torre.TU_IP.nip.io`
   - Forward Hostname: `torre-app`
   - Port: `8080`

## 5. Pasar a Producción (Dominio Real)

Cuando todo funcione en `nip.io`:

1. Apunta los registros DNS A de `miempresa.com` a la IP Estática de GCP.
2. Edita el `.env` en el servidor:
   - `WP_PROTOCOL=https`
   - `DOMAIN_WEB=miempresa.com`
   - `DOMAIN_APP=app.miempresa.com`
3. Reinicia contenedores:
   ```bash
   docker compose up -d
   ```
4. En Nginx Proxy Manager, edita los hosts para cambiar el dominio de `nip.io` al real, y pide certificados SSL nuevos.
