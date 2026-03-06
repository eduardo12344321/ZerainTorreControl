import sys
import os
from dotenv import load_dotenv

# Ensure we are loading the correct env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

try:
    from main import app, SECRET_KEY, DEBUG_MODE
except ImportError:
    # Try importing directly if inside backend
    sys.path.append(os.path.dirname(__file__))
    try:
        from main import app, SECRET_KEY
        print("Successfully imported app and SECRET_KEY")
    except ImportError as e:
        print(f"Failed to import: {e}")
        from config import SECRET_KEY as CONF_KEY
        print(f"Config KEY: {CONF_KEY}")

print("Configuration Verification:")
from config import SECRET_KEY, ADMIN_PASSWORD
print(f"SECRET_KEY loaded: {SECRET_KEY[:5]}... (length {len(SECRET_KEY)})")
print(f"ADMIN_PASSWORD loaded: {len(ADMIN_PASSWORD) > 0}")

if SECRET_KEY == "zerain_super_secret_key_change_in_production":
    print("WARNING: Using default development secret key")
else:
    print("SUCCESS: Using custom secret key")
