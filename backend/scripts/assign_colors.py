import sys
import os
import re

# Add the directory containing this script to path, and its parent (backend)
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.append(backend_dir)

# Now we can import from the backend directory
from services.odoo_service import odoo_client

def assign_colors():
    print(f"Connecting to Odoo...")
    if not odoo_client.connect():
        print("ERROR: Could not connect to Odoo")
        return

    vehicles = odoo_client.get_vehicles()
    print(f"Found {len(vehicles)} vehicles in Odoo.")

    # High-contrast, premium professional palette (No purples)
    palette = [
        '#3b82f6', # Blue
        '#10b981', # Emerald
        '#f59e0b', # Amber/Gold
        '#ef4444', # Red
        '#0891b2', # Cyan
        '#0d9488', # Teal
        '#f97316', # Orange
        '#475569', # Slate
        '#84cc16', # Lime
        '#2563eb', # Royal Blue
        '#d97706', # Dark Amber
        '#dc2626', # Dark Red
        '#0891b2', # Dark Cyan
        '#059669', # Dark Emerald
        '#ea580c', # Dark Orange
        '#334155', # Dark Slate
        '#65a30d', # Dark Lime
        '#1d4ed8', # Blue Indigo
        '#b91c1c', # Crimson
        '#0f766e', # Deep Teal
        '#1e293b', # Navy Slate
        '#a16207'  # Brownish gold
    ]
    
    for i, v in enumerate(vehicles):
        notes = v.get('notes', '')
        # Check if color is already in notes (HEX format)
        has_hex_color = re.search(r'COLOR:\s*#[0-9A-Fa-f]{6}', str(notes), re.I)
        
        if not has_hex_color:
            color = palette[i % len(palette)]
            print(f"[{i+1}/{len(vehicles)}] Assigning {color} to {v['plate']} ({v['alias']})...")
            # This will update the Odoo description field with the new color tag
            res = odoo_client.update_vehicle(v['id'], {'color': color})
            if res:
                print(f"   OK.")
            else:
                print(f"   FAILED.")
        else:
            print(f"[{i+1}/{len(vehicles)}] SKIP {v['plate']} - Already has manual color.")

if __name__ == "__main__":
    assign_colors()
