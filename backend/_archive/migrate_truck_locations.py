from database import db
import random

try:
    with db.get_cursor() as c:
        # Add columns if they don't exist
        try:
            c.execute("ALTER TABLE trucks ADD COLUMN last_location_lat REAL")
            c.execute("ALTER TABLE trucks ADD COLUMN last_location_lng REAL")
            print("Added location columns to trucks table.")
        except:
            print("Location columns already exist or could not be added.")

        # Seed some data around La Rioja
        c.execute("SELECT id FROM trucks")
        truck_ids = [r[0] for r in c.fetchall()]
        
        for tid in truck_ids:
            # Randomly spread around Logroño (42.46, -2.44)
            lat = 42.46 + (random.random() - 0.5) * 0.5
            lng = -2.45 + (random.random() - 0.5) * 0.5
            c.execute("UPDATE trucks SET last_location_lat = ?, last_location_lng = ? WHERE id = ?", (lat, lng, tid))
        
        print(f"Updated locations for {len(truck_ids)} trucks.")
except Exception as e:
    print(f"Migration error: {e}")
