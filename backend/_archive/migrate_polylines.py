from database import db

try:
    with db.get_cursor() as c:
        # 1. Update ORDERS Table
        try:
            c.execute("ALTER TABLE orders ADD COLUMN route_polyline TEXT")
            print("Added route_polyline to orders table.")
        except:
            print("route_polyline already exists in orders table.")

        # 2. Update ROUTE_CACHE Table
        try:
            c.execute("ALTER TABLE route_cache ADD COLUMN polyline TEXT")
            print("Added polyline to route_cache table.")
        except:
             print("polyline already exists in route_cache table.")

except Exception as e:
    print(f"Migration error: {e}")
