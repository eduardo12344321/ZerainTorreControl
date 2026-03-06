#!/bin/bash
set -e

echo "[REMOTE] Setting up files"
sudo mv /home/transporteszerain/SystemStatus.tsx /home/transporteszerain/zerain-infra/frontend/src/components/strada/SystemStatus.tsx || true
sudo mv /home/transporteszerain/strada.py /home/transporteszerain/zerain-infra/backend/routers/strada.py || true

cd /home/transporteszerain/zerain-infra
echo "[REMOTE] Loading config"
# We could export env vars directly if needed but let's build using docker-compose
echo "[REMOTE] Building new image"
sudo docker compose build torre

echo "[REMOTE] Stopping and restarting"
sudo docker stop zerain_torre || true
sudo docker rm zerain_torre || true
sudo docker compose up -d
