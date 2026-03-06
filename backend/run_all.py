import subprocess
import time
import os
import sys

def run():
    print("🚀 Arrancando motores de Zerain en Google Cloud...")
    db_path = os.getenv('DATABASE_PATH', 'zerain.db')
    print(f"📂 RUTA DB: {db_path}")
    
    # ALWAYS run setup (migration/init pattern). 
    # It uses IF NOT EXISTS, so it's safe.
    # It also handles encryption keys correctly via config.py
    try:
        def bg_setup():
            try:
                print("🛠️ Verificando esquema de base de datos (segundo plano)...")
                from setup_database import setup
                setup()
                
                try:
                    from database_strada import init_db
                    print("🛠️ Inicializando base de datos Strada...")
                    init_db()
                except Exception as ex:
                    print(f"⚠️ Warning initializing Strada DB: {ex}")
                    
                print("✅ Base de datos verificada/inicializada correctamente.")
            except Exception as e:
                print(f"❌ ERROR initializing database in background: {e}")

        import threading
        setup_thread = threading.Thread(target=bg_setup, daemon=True)
        setup_thread.start()
        print("⏳ Setup lanzado en segundo plano para no bloquear arranque...")

    except Exception as e:
        print(f"❌ CRITICAL ERROR launching setup thread: {e}")
        # Crash the container so Cloud Run restarts and logs the error clearly
        sys.exit(1)
    
    # GCP_PROJECT_ID
    project_id = os.getenv("GCP_PROJECT_ID", "torre-control-zerain")
    print(f"🔑 PROYECTO: {project_id}")
    
    # API Port
    port = os.getenv("PORT", "8080")
    print(f"🔌 Bindeando API al puerto: {port}")
    
    # Start API
    api_process = subprocess.Popen(["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port])
    print("✅ API lanzada. Monitoreando...")

    # Keep alive
    try:
        while True:
            if api_process.poll() is not None:
                print("❌ API caida. Reiniciando...")
                api_process = subprocess.Popen(["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port])
            time.sleep(10)
    except KeyboardInterrupt:
        print("🛑 Deteniendo procesos...")
        api_process.terminate()
        print("🛑 Sistema detenido.")

if __name__ == "__main__":
    run()
