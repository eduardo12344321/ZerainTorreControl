import xml.etree.ElementTree as ET
import math
import os

KML_FILE = "Histórico del 2059HGD,2187MRK,4055 JMY,4742HMX,5721 CWD,6314KGS,8292LWN,8859MRW,9216FTR del 17_02_2026 al 17_02_2026.kml"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def analyze_kml_km():
    if not os.path.exists(KML_FILE):
        return
    
    tree = ET.parse(KML_FILE)
    root = tree.getroot()
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}
    
    truck_folders = root.findall('.//kml:Folder', ns)
    
    for folder in truck_folders:
        name_elem = folder.find('kml:name', ns)
        if name_elem is not None:
            plate = name_elem.text
            if plate and len(plate) <= 12 and any(char.isdigit() for char in plate):
                points = folder.findall('.//kml:Placemark/kml:Point/kml:coordinates', ns)
                if not points: continue
                
                total_km = 0
                prev_coord = None
                for p in points:
                    coord_text = p.text.strip().split(',')
                    if len(coord_text) < 2: continue
                    lon, lat = float(coord_text[0]), float(coord_text[1])
                    
                    if prev_coord:
                        total_km += haversine(prev_coord[1], prev_coord[0], lat, lon)
                    prev_coord = (lon, lat)
                
                print(f"Truck {plate}: {total_km:.2f} km (from KML)")

if __name__ == "__main__":
    analyze_kml_km()
