import sqlite3

def check_db():
    conn = sqlite3.connect('../data/strada_cache.db')
    cur = conn.cursor()
    
    # Check total count
    cur.execute("SELECT count(*) FROM positions")
    print("Total positions:", cur.fetchone()[0])
    
    # Check yesterday count
    cur.execute("SELECT count(*) FROM positions WHERE timestamp LIKE '2026-03-04%'")
    print("Positions yesterday:", cur.fetchone()[0])
    
    # Check today count
    cur.execute("SELECT count(*) FROM positions WHERE timestamp LIKE '2026-03-05%'")
    print("Positions today:", cur.fetchone()[0])
    
    # Sample a timestamp
    cur.execute("SELECT timestamp FROM positions LIMIT 5")
    print("Sample timestamps:", cur.fetchall())

if __name__ == '__main__':
    check_db()
