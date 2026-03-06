
import requests

try:
    # Try to hit the local server if it's running
    response = requests.get('http://localhost:8000/api/v1/customers')
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total customers received: {len(data)}")
        if len(data) > 0:
            print(f"First customer: {data[0].get('name')}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Failed to connect to server: {e}")
    print("Trying direct database check instead (already done)...")
