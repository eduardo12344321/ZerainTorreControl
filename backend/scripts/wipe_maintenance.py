import sys
import os
import logging

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.odoo_service import odoo_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def wipe_all_maintenance():
    if not odoo_client.connect():
        logger.error("Failed to connect to Odoo")
        return

    logger.info("Searching for maintenance orders under 'Uso Interno'...")
    
    # 1. Find Partners
    partners = odoo_client.execute('res.partner', 'search', [('name', '=', 'Uso Interno')])
    
    if not partners:
        logger.info("Partner 'Uso Interno' not found.")
        return

    partner_id = partners[0]

    # 2. Find Orders for this partner
    domain = [
        ('partner_id', '=', partner_id),
        ('state', '!=', 'cancel')
    ]
    
    orders = odoo_client.execute('sale.order', 'search_read', domain, fields=['client_order_ref', 'note'])
    logger.info(f"Found {len(orders)} internal orders. Filtering for Maintenance...")

    to_delete = []
    for o in orders:
        desc = (o.get('client_order_ref') or "") + (o.get('note') or "")
        if "Mantenimiento" in desc or "Taller" in desc or "Averiado" in desc:
            to_delete.append(o['id'])

    logger.info(f"Found {len(to_delete)} actual maintenance orders to delete.")

    count = 0
    for order_id in to_delete:
        try:
            # Cancel first
            odoo_client.execute('sale.order', 'action_cancel', [order_id])
            # Then Delete (Unlink)
            odoo_client.execute('sale.order', 'unlink', [order_id])
            count += 1
        except Exception as e:
            logger.error(f"Failed to delete order {order_id}: {e}")

    logger.info(f"Successfully deleted {count} orders.")

if __name__ == "__main__":
    wipe_all_maintenance()
