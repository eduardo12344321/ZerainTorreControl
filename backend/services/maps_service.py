import requests
from config import GOOGLE_MAPS_API_KEY
from database import db

class MapsService:
    def __init__(self):
        self.api_key = GOOGLE_MAPS_API_KEY
        self.base_url = "https://maps.googleapis.com/maps/api/distancematrix/json"

    def get_route_data(self, origin: str, destination: str):
        """
        Calculates route, distance, time, and polyline between two points.
        Uses Directions API.
        """
        if not origin or not destination or not self.api_key:
            return None

        # Normalize key
        route_key = f"{origin.strip()}|{destination.strip()}"

        # 1. Check Cache
        try:
            with db.get_cursor() as c:
                c.execute("SELECT distance_km, duration_mins, polyline FROM route_cache WHERE route_key = ?", (route_key,))
                row = c.fetchone()
                if row:
                    print(f"MapsService: Cache HIT for {route_key}")
                    return dict(row)
        except Exception as e:
            print(f"Cache check error: {e}")

        # 2. Call Google Maps Directions API
        url = "https://maps.googleapis.com/maps/api/directions/json"
        print(f"MapsService: Calling Google Directions API for {origin} -> {destination}")
        params = {
            "origin": origin,
            "destination": destination,
            "mode": "driving",
            "language": "es",
            "units": "metric",
            "key": self.api_key
        }

        try:
            # Track usage
            with db.get_cursor() as c:
                c.execute("INSERT INTO gcp_usage (service, request_type, cost_est) VALUES (?, ?, ?)", 
                         ('MAPS_DIRECTIONS', 'Directions Request', 0.005))

            response = requests.get(url, params=params)
            data = response.json()

            if data["status"] == "OK" and len(data["routes"]) > 0:
                route = data["routes"][0]
                leg = route["legs"][0]
                
                distance_km = round(leg["distance"]["value"] / 1000.0, 2)
                
                # GOOGLE TIME * 1.4 (Truck Factor)
                raw_duration_mins = leg["duration"]["value"] / 60.0
                duration_mins = round(raw_duration_mins * 1.4, 0)
                
                polyline = route["overview_polyline"]["points"]

                result = {
                    "distance_km": distance_km,
                    "duration_mins": duration_mins,
                    "polyline": polyline
                }
                print(f"MapsService: Calculated Route: {distance_km}km, {duration_mins}min")

                # 3. Save to Cache
                try:
                    with db.get_cursor() as c:
                        c.execute("""
                            INSERT OR REPLACE INTO route_cache 
                            (route_key, origin_full, dest_full, distance_km, duration_mins, polyline) 
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (route_key, origin, destination, distance_km, duration_mins, polyline))
                except Exception as ce:
                    print(f"Cache save error: {ce}")

                return result
            
            error_msg = data.get("error_message", data.get("status", "No route found"))
            print(f"MapsService Error: {error_msg}")
            return {"error": error_msg}

        except Exception as e:
            print(f"Maps Service Exception: {e}")
            return {"error": str(e)}

    # Alias for backward compatibility
    def get_distance_and_time(self, origin, destination):
        return self.get_route_data(origin, destination)

def geocode_address(address: str):
    """
    Geocodes an address string using Google Maps Geocoding API.
    """
    if not address or len(address) < 3:
        return None
        
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'address': address,
        'key': GOOGLE_MAPS_API_KEY,
        'language': 'es'
    }
    # Referer to bypass potential browser-centric key restrictions
    headers = {
        'Referer': 'http://localhost:5173/'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        if data['status'] == 'OK':
            # Extract the formatted address
            formatted_address = data['results'][0]['formatted_address']
            return formatted_address
        else:
            print(f"Geocoding error: {data['status']}")
            if 'error_message' in data:
                print(f"Message: {data['error_message']}")
            return None
    except Exception as e:
        print(f"Geocoding Request error: {e}")
        return None

maps_service = MapsService()
