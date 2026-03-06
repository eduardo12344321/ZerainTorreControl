param(
    [Parameter(Mandatory = $True)]
    [string]$InstanceName,
    
    [string]$Zone = "europe-southwest1-c"
)

$targetUser = "transporteszerain"
$remoteDbPath = "/home/$targetUser/zerain-infra/torre/data/zerain.db"
$localDbPath = "backend/zerain.db"

Write-Host "🔄 Iniciando sincronización de Base de Datos DESDE la WEB..." -ForegroundColor Cyan

# 1. Crear backup local por seguridad
if (Test-Path $localDbPath) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "backend/zerain_local_backup_$timestamp.db"
    Copy-Item $localDbPath $backupPath
    Write-Host "📦 Backup local creado en: $backupPath" -ForegroundColor Gray
}

# 2. Descargar la base de datos del servidor
Write-Host "📡 Descargando base de datos desde el servidor..."
gcloud compute scp "${InstanceName}:${remoteDbPath}" $localDbPath --zone=$Zone --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ ÉXITO: Tu base de datos local ahora está sincronizada con la WEB." -ForegroundColor Green
    Write-Host "Ahora puedes trabajar en local con los datos reales de la torre."
}
else {
    Write-Host "`n❌ ERROR: No se pudo descargar la base de datos." -ForegroundColor Red
}
