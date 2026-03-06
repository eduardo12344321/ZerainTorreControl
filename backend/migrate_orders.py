import sqlite3
import os

DB_PATH = 'zerain.db'

def migrate():
    print(f"🔌 Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    columns_to_add = [
        ('requires_jib', 'BOOLEAN DEFAULT 0'),
        ('requires_box_body', 'BOOLEAN DEFAULT 0')
    ]

    for col_name, col_type in columns_to_add:
        try:
            print(f"➕ Adding column {col_name}...")
            c.execute(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}")
            print(f"✅ Added {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"ℹ️ Column {col_name} already exists.")
            else:
                print(f"❌ Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("🏁 Migration finished.")

if __name__ == "__main__":
    migrate()
