"""
Script to clean duplicate AI investigations in Odoo customer comments.
Keeps only the last investigation for each customer.
"""
from services.odoo_service import odoo_client
import re

def clean_duplicate_investigations():
    """
    Find customers with multiple [INVESTIGACION AI] blocks and keep only the last one.
    """
    try:
        # Connect to Odoo
        if not odoo_client.uid and not odoo_client.connect():
            print("❌ Could not connect to Odoo")
            return
        
        print("🔍 Searching for customers with AI investigations...")
        
        # Get all customers with AI investigations - OPTIMIZED: fetch all data at once
        domain = [
            ('customer_rank', '>', 0),
            ('comment', 'ilike', '%[INVESTIGACION AI]%')
        ]
        
        # Fetch all customer data in ONE call instead of individual calls
        customers = odoo_client.execute('res.partner', 'search_read', domain, ['name', 'comment'])
        
        print(f"📊 Found {len(customers)} customers with AI investigations")
        print(f"⚡ Processing in batch mode for speed...\n")
        
        cleaned_count = 0
        
        for cust in customers:
            pid = cust['id']
            comment = str(cust.get('comment') or '')
            
            # Find all [INVESTIGACION AI] blocks
            pattern = r'\[INVESTIGACION AI\].*?(?=\[INVESTIGACION AI\]|$)'
            matches = list(re.finditer(pattern, comment, re.DOTALL))
            
            if len(matches) > 1:
                print(f"🔧 {cust['name']} (ID: {pid}) - Found {len(matches)} investigations")
                
                # Keep only the last investigation
                last_investigation = matches[-1].group(0)
                
                # Remove all [INVESTIGACION AI] blocks
                cleaned_comment = re.sub(pattern, '', comment, flags=re.DOTALL)
                
                # Add back only the last investigation
                new_comment = cleaned_comment.strip() + '\n\n' + last_investigation.strip()
                
                # Update in Odoo
                try:
                    odoo_client.execute('res.partner', 'write', [int(pid)], {'comment': new_comment})
                    print(f"   ✅ Cleaned - Removed {len(matches) - 1} duplicate(s)")
                    cleaned_count += 1
                except Exception as e:
                    print(f"   ❌ Error updating: {e}")
        
        print(f"\n✨ Cleanup complete! Cleaned {cleaned_count} customers")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    clean_duplicate_investigations()
