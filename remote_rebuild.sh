#!/bin/bash
set -e

echo "[REMOTE] Setting up files"
sudo mv /home/transporteszerain/FleetStats.tsx /home/transporteszerain/zerain-infra/app-source/frontend/src/components/strada/FleetStats.tsx || true
sudo mv /home/transporteszerain/AnalyticsPanel.tsx /home/transporteszerain/zerain-infra/app-source/frontend/src/components/strada/AnalyticsPanel.tsx || true

cd /home/transporteszerain/zerain-infra/app-source
export $(grep -v '^#' ../.env | xargs)
echo "[REMOTE] Building new image"
sudo docker build -t gcr.io/zerain-web-2026/torre-app:latest -f Dockerfile .

echo "[REMOTE] Stopping and restarting"
cd /home/transporteszerain/zerain-infra
sudo docker stop zerain_torre || true
sudo docker rm zerain_torre || true
sudo docker compose up -d
