# Deploy Prod Script - Zerain Infrastructure
# Version: 2.0 (Robust)
# Date: 2026-02-19

param(
    [string]$InstanceName = "instance-20260206-232504",
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
    Write-Step "Initializing Deployment Protocol v2.0"
    Check-Command "gcloud"
    Check-Command "gcloud"
    # Check-Command "docker" # Not needed locally if building remote
    Check-Command "robocopy"
    Check-Command "robocopy"

    $deployDir = "deploy_staging"
    $zipFile = "release_candidate.zip"

    # 1. Validation
    Write-Step "Validating Local Environment..."
    if (-not (Test-Path "frontend\.env")) { throw "Missing frontend\.env" }
    if (-not (Test-Path "backend\.env")) { throw "Missing backend\.env" }
    if (-not (Test-Path "docker-compose.yml")) { throw "Missing docker-compose.yml" }

    # 2. Preparation
    Write-Step "Preparing Artifacts..."
    if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
    New-Item -ItemType Directory -Path "$deployDir" | Out-Null
    
    # Copy source code (exclude junk)
    New-Item -ItemType Directory -Path "$deployDir\backend" | Out-Null
    New-Item -ItemType Directory -Path "$deployDir\frontend" | Out-Null
    
    robocopy "backend" "$deployDir\backend" /E /XD __pycache__ .venv .git /R:0 /W:0 /NJH /NJS /NDL | Out-Null
    robocopy "frontend" "$deployDir\frontend" /E /XD node_modules dist .git /R:0 /W:0 /NJH /NJS /NDL | Out-Null
    
    Copy-Item "frontend\.env" "$deployDir\frontend\.env" -Force
    Copy-Item "Dockerfile" "$deployDir\"
    Copy-Item "docker-compose.yml" "$deployDir\"
    Copy-Item "docker-compose.torre.yml" "$deployDir\"
    Copy-Item "docker-compose.proxy.yml" "$deployDir\"

    # Create Zip
    if (Test-Path $zipFile) { Remove-Item $zipFile }
    Compress-Archive -Path "$deployDir\*" -DestinationPath $zipFile

    # 3. Upload
    Write-Step "Uploading Artifacts to GCP ($InstanceName)..."
    gcloud compute scp $zipFile "${InstanceName}:/tmp/$zipFile" --zone=$Zone --quiet
    gcloud compute scp backend/.env "${InstanceName}:/tmp/.env.backend" --zone=$Zone --quiet

    # 4. Remote Execution
    Write-Step "Executing Remote Deployment..."
    
    $remoteScript = @"
set -e
TARGET_DIR=/home/transporteszerain/zerain-infra

echo "[REMOTE] Backing up previous configuration..."
sudo cp \$TARGET_DIR/.env \$TARGET_DIR/.env.bak || true

echo "[REMOTE] Extracting new version..."
# Overwrite existing files with new version
sudo unzip -o /tmp/release_candidate.zip -d \$TARGET_DIR/app-source

echo "[REMOTE] Fixing Permissions..."
# Ensure Odoo user (101) can read config and addons (bind mounts)
# We do this recursively for the odoo directory to be safe
sudo chown -R 101:101 \$TARGET_DIR/app-source/odoo || true

# Update Docker configuration files
sudo cp \$TARGET_DIR/app-source/docker-compose.yml \$TARGET_DIR/
sudo cp \$TARGET_DIR/app-source/docker-compose.torre.yml \$TARGET_DIR/
sudo cp \$TARGET_DIR/app-source/docker-compose.proxy.yml \$TARGET_DIR/

echo "[REMOTE] Building Docker Image..."
cd \$TARGET_DIR/app-source
# Load keys for build args (if any)
export `$(grep -v '^#' ../.env | xargs)
sudo docker build -t gcr.io/$Project/torre-app:latest .

echo "[REMOTE] Updating & Restarting Stack..."
cd \$TARGET_DIR
# Use 'up -d' to recreate containers only if config changed or image is new
# --remove-orphans cleans up old containers if we removed them from compose
sudo docker compose up -d --remove-orphans

echo "[REMOTE] Health Check..."
sleep 5
# Check both Torre App and Odoo
if sudo docker ps | grep zerain_torre > /dev/null && sudo docker ps | grep zerain_odoo > /dev/null; then
    echo "✅ All Systems Operational (Torre + Odoo)"
else
    echo "⚠️ Partial System Failure - Checking Logs..."
    sudo docker logs zerain_odoo --tail 20
    sudo docker logs zerain_torre --tail 20
    exit 1
fi

echo "[REMOTE] Pruning old images..."
sudo docker image prune -f
"@

    gcloud compute ssh $InstanceName --zone=$Zone --command "$($remoteScript.Replace("`r`n", "`n"))" --quiet

    Write-Step "Deployment Successful! 🚀"
    Write-Host "URL: https://torrecontrolz.duckdns.org/strada" -ForegroundColor Green

}
catch {
    Write-Error "Deployment Failed: $_"
    exit 1
}
finally {
    # Cleanup local
    if ($null -ne $deployDir -and (Test-Path $deployDir)) { Remove-Item -Recurse -Force $deployDir -ErrorAction SilentlyContinue }
    if ($null -ne $zipFile -and (Test-Path $zipFile)) { Remove-Item $zipFile -ErrorAction SilentlyContinue }
}
