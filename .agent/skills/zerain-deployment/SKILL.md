---
name: zerain-deployment
description: Robust deployment procedures for Torre Control Zerain infrastructure on GCP.
---

# Zerain Deployment Skill

This skill handles the safe and robust deployment of the Torre Control Zerain application to the Google Cloud Platform (GCP) Compute Engine instance.

## Infrastructure Overview

- **Host**: GCP VM (`instance-20260206-232504` in `europe-southwest1-c`)
- **OS**: Debian GNU/Linux 12 (bookworm)
- **Container Runtime**: Docker + Docker Compose
- **Proxy**: Nginx Proxy Manager (Port 80/443 -> Services)
- **Database**:
  - `zerain_postgres_shared`: PostgreSQL 15 (Shared DB)
  - `zerain_db_wp`: MariaDB (WordPress)
- **Apps**:
  - `zerain_torre`: Python/FastAPI + React (Main App)
  - `zerain_odoo`: Odoo 16 (ERP)
  - `zerain_wordpress`: WordPress (Landing)

## Critical Deployment Rules

1.  **Always Verify Local State**: Ensure `.env`, `docker-compose.yml`, and `frontend/dist` are ready before uploading.
2.  **No-Build in Production**: Build Docker images locally or in CI/CD, then push/load. Do not run `docker build` on the production server if possible (or use the script's strict build mode).
3.  **Force Recreate**: Use `docker compose up -d --force-recreate` to ensure configuration changes (env vars) are picked up.
4.  **Database Auth**:
    - The `zerain_postgres_shared` container is sensitive to `POSTGRES_PASSWORD` changes.
    - If auth fails (`fe_sendauth: no password supplied`), checking `.env` is not enough. You may need to `ALTER USER` inside the database.
5.  **File Integrity**: explicitly copy `docker-compose.yml` and `docker-compose.override.yml` (if used).

## Usage

Run the robust deployment script located in `scripts/deploy_prod.ps1`.

```powershell
.agent/skills/zerain-deployment/scripts/deploy_prod.ps1
```

## Troubleshooting

- **"No password supplied"**: Database user password mismatch. Run `scripts/fix_db_auth.sh` (if created) or manually reset password.

- **"502 Bad Gateway"**: Check Nginx Proxy Manager logs and ensure the target container is running and on the `zerain-net` network.

## Safe Deployment Practices (Updated 2026-02-19)

- **Persistence**: Usage of named Docker volumes (`odoo_web_data`) for Odoo is MANDATORY to prevent data loss.
- **Non-Destructive Updates**: Use `docker compose up -d` instead of `down` + `up` to preserve running containers and volumes.
- **Permissions**: The deployment script automatically fixes ownership (`chown 101:101`) for Odoo directories.
