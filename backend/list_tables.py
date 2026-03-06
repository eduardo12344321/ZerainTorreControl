import psycopg2
import os
try:
    url = os.getenv("DATABASE_URL")
    print(f"Connecting to {url}...")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    rows = cur.fetchall()
    print("Tables in public schema:")
    for r in rows:
        print(f" - {r[0]}")
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
