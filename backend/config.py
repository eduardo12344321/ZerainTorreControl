import os
from dotenv import load_dotenv
from utils.secrets import get_secret

# Carga el archivo .env ubicado en la misma carpeta que este archivo (backend/.env)
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path, override=True)

# Database Configuration
# Use absolute path to ensure we always hit the same DB regardless of where the server is started
backend_dir = os.path.dirname(__file__)
DB_PATH = os.getenv("DATABASE_PATH", os.path.join(backend_dir, "zerain.db"))

# GCP Projects
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "torre-control-zerain")
GCP_LOCATION = os.getenv("GCP_LOCATION", "europe-west1")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") # CRITICAL: Set this in Prod to prevent Confused Deputy Attack

# Security
SECRET_KEY = get_secret("SECRET_KEY", os.getenv("SECRET_KEY", "dev_secret_key_only_for_local_testing"))
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 30))
ADMIN_PASSWORD = get_secret("ADMIN_PASSWORD", os.getenv("ADMIN_PASSWORD", "Zerain2026!"))
GOOGLE_MAPS_API_KEY = get_secret("GOOGLE_MAPS_API_KEY", os.getenv("GOOGLE_MAPS_API_KEY"))
DB_ENCRYPTION_KEY = get_secret("DB_ENCRYPTION_KEY", os.getenv("DB_ENCRYPTION_KEY", "dev_encryption_key_default"))

# Logistics Defaults
DEFAULT_BASE_LOCATION = os.getenv("DEFAULT_BASE_LOCATION", "Polígono Industrial de Jundiz, Vitoria-Gasteiz, Álava, España")
