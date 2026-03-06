import requests
import json

try:
    url = "http://localhost:7000/api/v1/drivers"
    response = requests.get(url, timeout=5)
    print(f"Status: {response.status_code}")
    # Print first driver for inspection
    data = response.json()
    if data:
        print(json.dumps(data[0], indent=2))
    else:
        print("No drivers returned")
except Exception as e:
    print(f"Error: {e}")
