import sqlcipher3 as sqlite3
from config import DB_PATH, DB_ENCRYPTION_KEY

def check():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute(f"PRAGMA key = '{DB_ENCRYPTION_KEY}'")
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='delivery_notes'")
        row = c.fetchone()
        if row:
            print("YES: delivery_notes table exists.")
        else:
            print("NO: delivery_notes table does NOT exist.")
        conn.close()
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check()
