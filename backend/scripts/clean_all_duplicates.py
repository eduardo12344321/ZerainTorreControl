"""
Script to clean duplicate AI investigation notes directly in Odoo and local DB.
"""
import sys
import os

# Add parent directory to path to reach services
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import odoo_client, db

def clean_duplicates():
    print("🔌 Connecting to Odoo...")
    if not odoo_client.uid and not odoo_client.connect():
        print("❌ Could not connect to Odoo")
        return

    marker = "--- [INVESTIGACION AI] ---"
    
    # 1. CLEAN ODOO
    print("\n📋 Fetching customers from Odoo...")
    try:
        # Search for partners with the marker in comment
        partner_ids = odoo_client.execute('res.partner', 'search', [
            ['comment', 'like', marker]
        ])
        
        if not partner_ids:
            print("✅ No customers found with markers in Odoo.")
        else:
            print(f"🔍 Found {len(partner_ids)} customers with markers in Odoo. Checking for duplicates...")
            
            # Read in batches
            BATCH_SIZE = 100
            cleaned_odoo_count = 0
            
            for i in range(0, len(partner_ids), BATCH_SIZE):
                batch_ids = partner_ids[i:i+BATCH_SIZE]
                partners = odoo_client.execute('res.partner', 'read', batch_ids, ['id', 'name', 'comment'])
                
                for p in partners:
                    comment = p.get('comment')
                    if comment and comment.count(marker) > 1:
                        # Find second occurrence
                        first_pos = comment.find(marker)
                        second_pos = comment.find(marker, first_pos + len(marker))
                        
                        cleaned_comment = comment[:second_pos].rstrip()
                        
                        # Update Odoo
                        print(f"  ✨ Cleaning Odoo: {p['name']} ({p['id']})")
                        odoo_client.execute('res.partner', 'write', [p['id']], {'comment': cleaned_comment})
                        cleaned_odoo_count += 1
            
            print(f"✅ Finished cleaning Odoo. Total cleaned: {cleaned_odoo_count}")

    except Exception as e:
        print(f"❌ Error cleaning Odoo: {e}")

    # 2. CLEAN LOCAL DB
    print("\n📋 Cleaning local database...")
    try:
        with db.get_cursor() as c:
            c.execute("SELECT id, name, notes FROM customers WHERE notes LIKE ?", (f"%{marker}%",))
            local_customers = c.fetchall()
            
            cleaned_local_count = 0
            for row in local_customers:
                cid, name, notes = row['id'], row['name'], row['notes']
                if notes and notes.count(marker) > 1:
                    first_pos = notes.find(marker)
                    second_pos = notes.find(marker, first_pos + len(marker))
                    cleaned_notes = notes[:second_pos].rstrip()
                    
                    c.execute("UPDATE customers SET notes = ? WHERE id = ?", (cleaned_notes, cid))
                    cleaned_local_count += 1
            
            print(f"✅ Finished cleaning local DB. Total cleaned: {cleaned_local_count}")
    except Exception as e:
        print(f"❌ Error cleaning local DB: {e}")

if __name__ == "__main__":
    clean_duplicates()
