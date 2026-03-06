import requests

API_BASE = "http://localhost:7000/api/v1"

def test_admin_login():
    login_data = {
        "username": "GerenciaEdu",
        "password": "TorreControl2026"
    }
    print(f"Testing admin login with: {login_data}")
    try:
        res = requests.post(f"{API_BASE}/auth/admin/login", json=login_data)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_admin_login()
