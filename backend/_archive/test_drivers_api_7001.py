import requests
import json

try:
    # UPDATED PORT 7001
    url = "http://localhost:7001/api/v1/drivers"
    response = requests.get(url, timeout=5)
    print(f"Status: {response.status_code}")
    data = response.json()
    if data:
        # Print first driver stats to verify structure
        d = data[0]
        print(f"Driver: {d['name']}")
        print(f"Stats: {d.get('stats', 'MISSING')}")
    else:
        print("No drivers returned")
except Exception as e:
    print(f"Error: {e}")
