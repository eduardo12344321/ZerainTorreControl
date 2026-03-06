import os
from google.cloud import secretmanager
from dotenv import load_dotenv

load_dotenv()

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "zerain-web-2026")
GCP_JSON_PATH = os.getenv("PATH_TO_GCP_JSON")

if GCP_JSON_PATH:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GCP_JSON_PATH

def create_or_update_secret(secret_id, payload):
    client = secretmanager.SecretManagerServiceClient()
    parent = f"projects/{GCP_PROJECT_ID}"
    
    try:
        # Check if secret exists
        client.get_secret(request={"name": f"{parent}/secrets/{secret_id}"})
    except:
        # Create secret
        print(f"Creando secreto: {secret_id}...")
        client.create_secret(
            request={
                "parent": parent,
                "secret_id": secret_id,
                "secret": {"replication": {"automatic": {}}},
            }
        )

    # Add version
    print(f"Subiendo versión para: {secret_id}...")
    client.add_secret_version(
        request={"parent": f"{parent}/secrets/{secret_id}", "payload": {"data": payload.encode("UTF-8")}}
    )

def sync():
    secrets_to_sync = [
        "GOOGLE_MAPS_API_KEY",
        "SECRET_KEY",
        "ADMIN_PASSWORD",
        "DB_ENCRYPTION_KEY"
    ]
    
    for sid in secrets_to_sync:
        val = os.getenv(sid)
        if val:
            try:
                create_or_update_secret(sid, val)
            except Exception as e:
                print(f"Error con {sid}: {e}")
        else:
            print(f"Saltando {sid} (no encontrado en .env)")

if __name__ == "__main__":
    confirm = input("¿Estás seguro de que quieres subir tus secretos locales a GCP Secret Manager? (s/n): ")
    if confirm.lower() == 's':
        sync()
        print("\n✅ Sincronización completada.")
    else:
        print("Sincronización cancelada.")
