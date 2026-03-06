# Deploy Zerain to Google Cloud
# Usage: .\deploy_gcp.ps1

$ProjectId = "zerain-web-2026"
$Region = "europe-west1"
$BucketName = "$ProjectId-data"

Write-Host "Iniciando Despliegue a Google Cloud..." -ForegroundColor Cyan

# 1. Check Gcloud Login
try {
    $currentProject = gcloud config get-value project 2>$null
    if ($currentProject -ne $ProjectId) {
        Write-Host "Cambiando al proyecto $ProjectId..." -ForegroundColor Yellow
        gcloud config set project $ProjectId
    }
}
catch {
    Write-Host "ERROR: gcloud no esta instalado o no esta en el PATH." -ForegroundColor Red
    exit 1
}

# 2. Ensure Data Bucket Exists
Write-Host "Verificando Bucket de Datos..." -ForegroundColor Cyan
$bucketExists = gsutil ls | Select-String -Pattern "gs://$BucketName"
if (-not $bucketExists) {
    Write-Host "Creando bucket gs://$BucketName..."
    gsutil mb -l $Region gs://$BucketName
}
else {
    Write-Host "Bucket gs://$BucketName ya existe." -ForegroundColor Green
}

# 3. Submit Build
Write-Host "Construyendo y Desplegando Contenedor (esto tardara unos minutos)..." -ForegroundColor Cyan
$Timestamp = Get-Date -Format "yyyyMMddHHmmss"
$ImageTag = "gcr.io/$ProjectId/zerain-backend:$Timestamp"

# Build with unique tag using cloudbuild.yaml
# We pass all necessary substitutions here
gcloud builds submit --config cloudbuild.yaml `
    --substitutions="_IMAGE_TAG=$ImageTag,_VITE_GOOGLE_MAPS_API_KEY=AIzaSyBnVOBDb30ykbf_Jy-di2YKIZJFAf6K6bk,_VITE_GOOGLE_CLIENT_ID=241497426212-hgcajq2ep4vi97h0lid9gh81icf5ahrf.apps.googleusercontent.com,_VITE_API_BASE_URL=/api,_REGION=$Region,_GEMINI_API_KEY=AIzaSyAid96mNT86KVza-KUO9QEk1qPaLj7zULY,_SECRET_KEY=zerain_super_secret_key_change_in_production,_DB_ENCRYPTION_KEY=5ee29d6f9cdff9ad8f05728129355b99d" .

if ($LASTEXITCODE -eq 0) {
    Write-Host "Despliegue Completado con Exito!" -ForegroundColor Green
    Write-Host "Tu API deberia estar online. Verifica la URL en la consola de Cloud Run."
}
else {
    Write-Host "Error en el despliegue. Revisa los logs de arriba." -ForegroundColor Red
    exit $LASTEXITCODE
}
