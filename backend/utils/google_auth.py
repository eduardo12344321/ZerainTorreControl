from google.oauth2 import id_token
from google.auth.transport import requests
from config import GCP_PROJECT_ID

# You might need a specific Client ID if checking audience
# For now, we verify the token is valid signed by Google
# In production, you MUST verify the AUDIENCE matches your Client ID

def verify_google_token(token: str, client_id: str):
    """
    Verifies a Google ID token.
    CRITICAL: 'client_id' is mandatory to prevent Confused Deputy attacks.
    Returns the user info dict if valid, or raises ValueError.
    """
    if not client_id:
        # Fail safe: If we forgot to configure it, deny everything rather than allow everything
        raise ValueError("Server Misconfiguration: GOOGLE_CLIENT_ID is not set.")

    try:
        # Specify the CLIENT_ID of the app that accesses the backend:
        id_info = id_token.verify_oauth2_token(token, requests.Request(), client_id, clock_skew_in_seconds=10)

        # ID token is valid.
        # Get the user's Google Account ID from the decoded token.
        userid = id_info['sub']
        email = id_info.get('email')
        
        return {
            "sub": userid,
            "email": email,
            "name": id_info.get('name'),
            "picture": id_info.get('picture')
        }
    except ValueError as e:
        # Invalid token
        raise ValueError(f"Invalid Google Token: {str(e)}")
