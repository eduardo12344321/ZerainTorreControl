import sqlite3
import os
import sys

# Add parent dir to sys.path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import DB_PATH
except ImportError:
    DB_PATH = 'local.db'

print(f"🔌 Connecting to {DB_PATH}")
try:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print("Tables found:")
    for t in tables:
        print(f" - {t[0]}")
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
