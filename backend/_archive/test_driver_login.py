import requests
import json

try:
    url = "http://localhost:7000/api/v1/auth/driver/login"
    payload = {"dni": "12345678A", "password": "Zerain2026!"}
    headers = {"Content-Type": "application/json"}
    
    print(f"Testing login for DNI: {payload['dni']}")
    response = requests.post(url, json=payload, timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
