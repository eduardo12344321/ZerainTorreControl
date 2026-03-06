import requests
import json

API_BASE = "http://localhost:7001/api/v1"

def test_create_and_login():
    # 1. Create driver
    driver_data = {
        "name": "TEST DRIVER",
        "dni": "12341234X",
        "password": "mypassword"
    }
    print(f"Creating driver: {driver_data}")
    res = requests.post(f"{API_BASE}/drivers", json=driver_data)
    print(f"Create Response: {res.status_code} - {res.text}")
    
    if res.status_code == 200:
        # 2. Try login
        login_data = {
            "dni": "12341234X",
            "password": "mypassword"
        }
        print(f"Trying login: {login_data}")
        res_login = requests.post(f"{API_BASE}/auth/driver/login", json=login_data)
        print(f"Login Response: {res_login.status_code} - {res_login.text}")

if __name__ == "__main__":
    try:
        test_create_and_login()
    except Exception as e:
        print(f"Error: {e}")
