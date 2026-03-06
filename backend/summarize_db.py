import sqlite3
import json

def summarize_db():
    conn = sqlite3.connect('zerain.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r['name'] for r in c.fetchall()]
    
    summary = {}
    for table in tables:
        c.execute(f"SELECT count(*) as cnt FROM {table}")
        count = c.fetchone()['cnt']
        
        c.execute(f"PRAGMA table_info({table})")
        columns = [dict(r) for r in c.fetchall()]
        
        summary[table] = {
            "count": count,
            "columns": [col['name'] for col in columns]
        }
        
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    summarize_db()
