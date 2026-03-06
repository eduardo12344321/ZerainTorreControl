import os
try:
    from google.cloud import secretmanager
except ImportError:
    secretmanager = None
from dotenv import load_dotenv

# Load .env to get GCP_PROJECT_ID and PATH_TO_GCP_JSON if running locally
load_dotenv()

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "torre-control-zerain")
GCP_JSON_PATH = os.getenv("PATH_TO_GCP_JSON")

if GCP_JSON_PATH and os.path.exists(GCP_JSON_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GCP_JSON_PATH

def get_secret(secret_id, default=None):
    """
    Retrieves a secret from Google Cloud Secret Manager.
    If it fails (e.g. secret doesn't exist or no perms), returns the default.
    """
    try:
        if secretmanager is None:
            raise Exception("Secret Manager library not installed")
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{GCP_PROJECT_ID}/secrets/{secret_id}/versions/latest"
        print(f"🔐 Attempting to fetch secret: {secret_id} from {name}")
        response = client.access_secret_version(request={"name": name})
        print(f"✅ Secret {secret_id} fetched successfully")
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        # Fallback to default or env var
        return os.getenv(secret_id, default)
