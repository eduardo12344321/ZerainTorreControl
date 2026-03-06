import xml.etree.ElementTree as ET
import os

KML_FILE = "Histórico del 2059HGD,2187MRK,4055 JMY,4742HMX,5721 CWD,6314KGS,8292LWN,8859MRW,9216FTR del 17_02_2026 al 17_02_2026.kml"

def parse_kml():
    if not os.path.exists(KML_FILE):
        print("File not found")
        return

    tree = ET.parse(KML_FILE)
    root = tree.getroot()
    
    # KML namespaces
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}
    
    # Structure: <Folder><name>PLATE</name><Folder><name>DATE</name><Placemark>...
    truck_folders = root.findall('.//kml:Folder', ns)
    
    trucks = {}
    
    for folder in truck_folders:
        name_elem = folder.find('kml:name', ns)
        if name_elem is not None:
            name = name_elem.text
            # If name is a plate (7 chars, or contains space)
            if name and (len(name) <= 12): # Roughly plates like 5721 CWD
                # Count points in this folder
                points = folder.findall('.//kml:Point', ns)
                if points:
                    trucks[name] = trucks.get(name, 0) + len(points)
    
    print("Points per truck in KML:")
    for plate, count in sorted(trucks.items()):
        print(f"{plate}: {count} points")

if __name__ == "__main__":
    parse_kml()
