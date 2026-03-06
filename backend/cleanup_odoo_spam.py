
from services.odoo_service import OdooClient

client = OdooClient()

def cleanup_spam():
    # Find partner 'Uso Interno'
    p_ids = client.execute('res.partner', 'search', [['name', '=', 'Uso Interno']])
    if not p_ids:
        print("Partner 'Uso Interno' not found. No cleanup needed.")
        return
    
    partner_id = p_ids[0]
    
    # Find orders for this partner with total 1.21 in draft state
    domain = [
        ['partner_id', '=', partner_id],
        ['state', '=', 'draft'],
        ['amount_total', '=', 1.21]
    ]
    
    order_ids = client.execute('sale.order', 'search', domain)
    
    if not order_ids:
        print("No spam orders found.")
        return
    
    print(f"Found {len(order_ids)} spam orders. Deleting...")
    
    # Many2one fields usually prevent direct deletion if linked, 
    # but Draft Quotations are usually deletable.
    try:
        # In Odoo, deletion is 'unlink'
        res = client.execute('sale.order', 'unlink', order_ids)
        print(f"Cleanup successful. Result: {res}")
    except Exception as e:
        print(f"Error deleting orders: {e}")
        print("Attempting to cancel them instead...")
        client.execute('sale.order', 'action_cancel', order_ids)

if __name__ == "__main__":
    cleanup_spam()
