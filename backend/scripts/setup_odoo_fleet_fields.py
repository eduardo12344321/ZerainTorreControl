import sys
import os
import logging
# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from services.odoo_service import odoo_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_field(model_name, field_name, field_label, field_type):
    """Creates a custom field (x_) in Odoo if it doesn't exist."""
    # 1. Check if exists
    existing = odoo_client.execute('ir.model.fields', 'search', 
                                   [['name', '=', field_name], ['model', '=', model_name]])
    if existing:
        logger.info(f"Field {field_name} already exists.")
        return

    # 2. Get Model ID
    model_ids = odoo_client.execute('ir.model', 'search', [['model', '=', model_name]])
    if not model_ids:
        logger.error(f"Model {model_name} not found!")
        return
    model_id = model_ids[0]

    # 3. Create Field
    try:
        odoo_client.execute('ir.model.fields', 'create', [{
            'name': field_name,
            'field_description': field_label,
            'model_id': model_id,
            'ttype': field_type,
            'state': 'manual', # Important for custom fields
        }])
        logger.info(f"Created field {field_name} ({field_type})")
    except Exception as e:
        logger.error(f"Failed to create {field_name}: {e}")

def setup_truck_fields():
    if not odoo_client.connect():
        return

    model = 'fleet.vehicle'
    
    # Define custom fields based on local DB schema
    # axles, max_weight, has_crane, has_jib, is_box_body, max_length, category
    
    create_field(model, 'x_axles', 'Ejes', 'integer')
    create_field(model, 'x_max_weight', 'Peso Máximo (T)', 'float')
    create_field(model, 'x_max_length', 'Longitud Máxima (m)', 'float')
    create_field(model, 'x_has_crane', 'Tiene Grúa', 'boolean')
    create_field(model, 'x_has_jib', 'Tiene Jib', 'boolean')
    create_field(model, 'x_is_box_body', 'Caja Cerrada', 'boolean')
    create_field(model, 'x_category_zerain', 'Categoría Zerain', 'char') 

if __name__ == "__main__":
    setup_truck_fields()
