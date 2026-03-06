# Guía de Inicio: Torre de Control Zerain

Para arrancar el proyecto completo, puedes usar el script automatizado o seguir los pasos manuales.

## 🚀 Método Rápido (Recomendado)

En la raíz del proyecto, haz doble clic en:
`run_zerain.bat`

Esto abrirá 2 terminales automáticas para:
1.  **Backend API** (Puerto 7000)
2.  **Frontend Dashboard** (Puerto 7500)

---

## 🛠️ Método Manual (Paso a Paso)

Si prefieres lanzarlo manualmente desde VS Code o PowerShell:

### 1. Backend (API)
Asegúrate de estar en la carpeta raíz y abre una terminal:

**Terminal A (API)**
```powershell
    cd backend
    python -m uvicorn main:app --reload --port 7000
    ```

### 2. Frontend (Panel Web)
Abre una tercera terminal:

**Terminal B (Vite)**
    ```powershell
    cd frontend
    npm run dev -- --port 7500
    ```

---

## 📋 Requisitos Previos
Si es la primera vez que lo ejecutas en un ordenador nuevo:

1.  **Backend:** `cd backend && pip install -r requirements.txt`
2.  **Frontend:** `cd frontend && npm install`
3.  **Base de Datos:** Crea el archivo `zerain.db` ejecutando `python migrate_db.py` dentro de `backend/`.

---

## 🔗 Enlaces Útiles
- **Panel de Control:** [http://localhost:7500](http://localhost:7500)
- **Documentación API:** [http://127.0.0.1:7000/docs](http://127.0.0.1:7000/docs)
