import requests
import json

def test_trucks_api():
    print("🔍 Consultando API local para ver qué datos llegan al frontend...")
    try:
        r = requests.get("http://localhost:7000/api/v1/trucks")
        if r.status_code == 200:
            data = r.json()
            print(f"✅ Recibidos {len(data)} vehículos.")
            if data:
                print("\nMuestra del primer vehículo:")
                print(json.dumps(data[0], indent=2))
        else:
            print(f"❌ Error API: {r.status_code}")
            print(r.text)
    except Exception as e:
        print(f"🔥 Error de conexión: {e}")

if __name__ == "__main__":
    test_trucks_api()
