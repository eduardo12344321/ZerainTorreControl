import sqlite3
from datetime import datetime

def migrate_expenses_table():
    """Add ticket_url and description columns to expenses table"""
    conn = sqlite3.connect('zerain.db')
    c = conn.cursor()
    
    try:
        # Check if columns exist
        c.execute("PRAGMA table_info(expenses)")
        columns = [col[1] for col in c.fetchall()]
        
        if 'description' not in columns:
            c.execute('ALTER TABLE expenses ADD COLUMN description TEXT')
            print("✅ Added 'description' column to expenses")
        else:
            print("ℹ️  'description' column already exists")
        
        if 'ticket_url' not in columns:
            c.execute('ALTER TABLE expenses ADD COLUMN ticket_url TEXT')
            print("✅ Added 'ticket_url' column to expenses")
        else:
            print("ℹ️  'ticket_url' column already exists")
        
        conn.commit()
        print("\n🎉 Expenses table migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_expenses_table()
