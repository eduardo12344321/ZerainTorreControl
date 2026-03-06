
import sqlite3
import json
import os

db_path = 'backend/zerain.db'
if not os.path.exists(db_path):
    for f in ['backend/database.db', 'backend/local.db']:
        if os.path.exists(f):
            db_path = f
            break

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM customers")
    rows = cursor.fetchall()
    
    res = []
    for r in rows:
        d = dict(r)
        d['locations'] = json.loads(d['locations']) if d.get('locations') else []
        res.append(d)
        
    json_data = json.dumps(res)
    size_mb = len(json_data) / (1024 * 1024)
    
    print(f"Total customers: {len(res)}")
    print(f"JSON Payload Size: {size_mb:.2f} MB")
    
    # Check if any image is particularly large
    cursor.execute("SELECT id, name, length(image_128) as img_size FROM customers WHERE image_128 IS NOT NULL AND image_128 != ''")
    img_rows = cursor.fetchall()
    if img_rows:
        total_img_size = sum(r['img_size'] for r in img_rows)
        avg_img_size = total_img_size / len(img_rows)
        print(f"Total images: {len(img_rows)}")
        print(f"Avg image size: {avg_img_size/1024:.2f} KB")
        print(f"Total image weight in payload: {total_img_size / (1024 * 1024):.2f} MB")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
