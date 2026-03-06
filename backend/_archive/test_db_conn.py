from database import db
try:
    with db.get_cursor() as c:
        c.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = c.fetchall()
        print(f"Tables: {[dict(t) for t in tables]}")
except Exception as e:
    print(f"Database error: {e}")
    import traceback
    traceback.print_exc()
