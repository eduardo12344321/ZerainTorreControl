import logging

logger = logging.getLogger("zerain_audit")

def log_audit(username, action, resource_type, resource_id=None, details=None, ip_address=None):
    """Log audit trail (DB removed as per request)."""
    msg = f"AUDIT: [{username}] {action} on {resource_type} (ID: {resource_id}) - {details} [IP: {ip_address}]"
    logger.info(msg)
