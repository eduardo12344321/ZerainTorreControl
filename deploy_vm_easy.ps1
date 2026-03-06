# Deploy Prod Script - Zerain Infrastructure
# Version: 2.0 (Robust)
# Date: 2026-02-19

param(
    [string]$InstanceName = "maquina-virtual-zerain",
    [string]$Zone = "europe-southwest1-c",
    [string]$Project = "zerain-web-2026"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n➤ $Message" -ForegroundColor Cyan
}

function Check-Command {
    param([string]$Command)
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Error "Command '$Command' not found. Please install it."
    }
}

try {
    Write-Step "Initializing Deployment Protocol v2.2 (Ultra-Robust)"
    Check-Command "gcloud"
    Check-Command "robocopy"

    $deployDir = "deploy_staging"
    $zipFile = "release_candidate.zip"

    # 1. Validation
    Write-Step "Validating Local Environment..."
    if (-not (Test-Path "data\strada_cache.db")) { throw "Missing Strada DB in data\strada_cache.db" }

    # 2. Preparation
    Write-Step "Preparing Artifacts..."
    if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
    New-Item -ItemType Directory -Path "$deployDir" | Out-Null
    
    # Copy source code (exclude junk)
    robocopy "backend" "$deployDir\backend" /E /XD __pycache__ .venv .git /R:0 /W:0 /NJH /NJS /NDL | Out-Null
    robocopy "frontend" "$deployDir\frontend" /E /XD node_modules dist .git /R:0 /W:0 /NJH /NJS /NDL | Out-Null
    robocopy "data" "$deployDir\data" /E /R:3 /W:1 /NJH /NJS /NDL | Out-Null
    
    # CRITICAL CHECK
    if (-not (Test-Path "$deployDir\data\strada_cache.db")) {
        Write-Error "Deployment ABORTED: strada_cache.db failed to copy. It might be locked by another process."
        exit 1
    }

    # Remove local .env from zip to prevent overwriting container env
    if (Test-Path "$deployDir\backend\.env") { Remove-Item "$deployDir\backend\.env" -Force }

    Copy-Item "Dockerfile" "$deployDir\"
    Copy-Item "Dockerfile.odoo" "$deployDir\"
    
    # Create Zip
    if (Test-Path $zipFile) { Remove-Item $zipFile }
    Write-Step "Creating Zip (this might take a minute)..."
    Compress-Archive -Path "$deployDir\*" -DestinationPath $zipFile

    # 3. Upload
    Write-Step "Uploading to GCP ($InstanceName)..."
    gcloud compute scp $zipFile "${InstanceName}:/tmp/$zipFile" --zone=$Zone --quiet
    gcloud compute scp backend/.env "${InstanceName}:/tmp/.env.backend" --zone=$Zone --quiet

    # 4. Remote Execution
    Write-Step "Executing Remote Deployment via uploaded script (Unix-Fix)..."
    
    $remoteScriptTemplate = @'
set -e
TARGET_DIR=/home/transporteszerain/zerain-infra
TEMP_BACKEND_ENV=/tmp/.env.backend
PROJECT_ID="__PROJECT_ID__"

echo "[REMOTE] Syncing Configuration..."
sudo cp $TEMP_BACKEND_ENV $TARGET_DIR/.env

echo "[REMOTE] Extracting new version..."
sudo rm -rf $TARGET_DIR/app-source
sudo mkdir -p $TARGET_DIR/app-source
sudo unzip -o /tmp/release_candidate.zip -d $TARGET_DIR/app-source

echo "[REMOTE] Syncing Strada Database..."
sudo mkdir -p $TARGET_DIR/torre_data
# Look for the DB file
DB_FILE=$(find $TARGET_DIR/app-source -name "strada_cache.db" | head -n 1)
if [ -n "$DB_FILE" ]; then
    echo "Found database at $DB_FILE. Copying to volume..."
    sudo cp "$DB_FILE" $TARGET_DIR/torre_data/strada_cache.db
    sudo chmod 666 $TARGET_DIR/torre_data/strada_cache.db
    echo "✅ Strada DB updated."
else
    echo "⚠️ Warning: strada_cache.db NOT found in zip!"
fi

echo "[REMOTE] Patching docker-compose.yml..."
# Remove DATABASE_URL to force SQLite (like in local)
sudo sed -i '/DATABASE_URL=/d' $TARGET_DIR/docker-compose.yml

echo "[REMOTE] Fixing Permissions..."
sudo chown -R 1000:1000 $TARGET_DIR/torre_data || true

echo "[REMOTE] Building & Restarting..."
cd $TARGET_DIR/app-source
sudo docker build --no-cache -t gcr.io/$PROJECT_ID/torre-app:latest -f Dockerfile .
sudo docker build --no-cache -t gcr.io/$PROJECT_ID/torre-odoo:latest -f Dockerfile.odoo .

cd $TARGET_DIR
sudo docker compose down --remove-orphans || true
sudo docker compose up -d

echo "[REMOTE] Final Health Check..."
sleep 15
sudo docker ps
sudo docker logs zerain_torre --tail 30
'@

    $remoteScriptContent = $remoteScriptTemplate -replace "__PROJECT_ID__", $Project
    # CRITICAL: Force LF line endings for Linux
    $remoteScriptContent = $remoteScriptContent -replace "\r\n", "`n"

    $remoteScriptFile = "deploy_remote.sh"
    # Write as UTF-8 without BOM, forcing LF
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) $remoteScriptFile), $remoteScriptContent, (New-Object System.Text.UTF8Encoding($false)))

    # Upload script
    gcloud compute scp $remoteScriptFile "${InstanceName}:/tmp/$remoteScriptFile" --zone=$Zone --quiet

    # Run script
    gcloud compute ssh $InstanceName --zone=$Zone --command "bash /tmp/$remoteScriptFile" --quiet

    Write-Step "Deployment Successful! 🚀"
    Write-Host "URL: https://torrecontrolz.duckdns.org" -ForegroundColor Green

}
catch {
    Write-Error "Deployment Failed: $_"
    exit 1
}
finally {
    # Cleanup local
    if ($null -ne $zipFile -and (Test-Path $zipFile)) { Remove-Item $zipFile -ErrorAction SilentlyContinue }
    if (Test-Path "deploy_remote.sh") { Remove-Item "deploy_remote.sh" -ErrorAction SilentlyContinue }
}
