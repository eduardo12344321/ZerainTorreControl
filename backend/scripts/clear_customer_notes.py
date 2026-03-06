"""
Test Odoo connection and clear customer notes
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.odoo_service import OdooClient

def test_and_clear():
    print("🔌 Connecting to Odoo...")
    client = OdooClient()
    
    if not client.connect():
        print("❌ Failed to connect")
        return
    
    print("✅ Connected")
    print(f"   URL: {client.url}")
    print(f"   DB: {client.db}")
    print(f"   User: {client.username}")
    print(f"   UID: {client.uid}")
    
    # Test simple query
    print("\n📋 Testing query...")
    try:
        count = client.execute('res.partner', 'search_count', [[['customer_rank', '>', 0]]])
        print(f"✅ Found {count} customers in Odoo")
    except Exception as e:
        print(f"❌ Query failed: {e}")
        return
    
    # Fetch customers with comment field
    print("\n📋 Fetching customers with notes...")
    try:
        partners = client.execute('res.partner', 'search_read',
            [[['customer_rank', '>', 0], ['comment', '!=', False]]],
            fields=['name', 'comment'],
            limit=100
        )
        
        print(f"Found {len(partners)} customers with notes")
        
        if not partners:
            print("✅ No notes to clear")
            return
        
        for p in partners[:5]:
            preview = str(p.get('comment', ''))[:50]
            print(f"  - {p['name']}: {preview}...")
        
        if len(partners) > 5:
            print(f"  ... and {len(partners) - 5} more")
        
        confirm = input(f"\n⚠️  Clear notes from {len(partners)} customers? Type 'YES': ")
        if confirm != 'YES':
            print("❌ Cancelled")
            return
        
        # Clear notes
        ids = [p['id'] for p in partners]
        print(f"\n🧹 Clearing {len(ids)} notes...")
        
        client.execute('res.partner', 'write', [ids], {'comment': False})
        print(f"✅ Cleared all notes")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_and_clear()
