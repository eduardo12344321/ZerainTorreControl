import sqlite3
import os
import glob

def check_db(path):
    print(f"\n📂 Checking: {path}")
    if not os.path.exists(path):
        print("   ❌ File not found")
        return

    try:
        conn = sqlite3.connect(path)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in c.fetchall()]
        conn.close()
        
        if 'orders' in tables:
            print(f"   ✅ FOUND 'orders' table!")
            # Check columns
            conn = sqlite3.connect(path)
            c = conn.cursor()
            c.execute(f"PRAGMA table_info(orders)")
            cols = [col[1] for col in c.fetchall()]
            conn.close()
            if 'previous_location' in cols:
                print("      ℹ️ 'previous_location' column exists.")
            else:
                print("      ⚠️ 'previous_location' column MISSING.")
        else:
            print(f"   ❌ 'orders' table NOT found. Tables: {len(tables)}")
            # print(tables) 
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

files = glob.glob("*.db") + glob.glob("../*.db")
for f in files:
    check_db(f)
