import requests

API_BASE = "http://localhost:7000/api/v1"

def test_driver_login():
    login_data = {
        "dni": "72749672M",
        "password": "Zerain2026!"
    }
    print(f"Testing driver login with: {login_data}")
    try:
        res = requests.post(f"{API_BASE}/auth/driver/login", json=login_data)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_driver_login()
