from config import GOOGLE_CLIENT_ID
import os

print(f"LOADED GOOGLE_CLIENT_ID: {GOOGLE_CLIENT_ID}")
print(f"RAW ENV GOOGLE_CLIENT_ID: {os.environ.get('GOOGLE_CLIENT_ID')}")
