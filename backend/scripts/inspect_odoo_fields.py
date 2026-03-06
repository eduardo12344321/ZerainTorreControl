import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import odoo_client

def inspect_partner_fields():
    print("🔍 Inspeccionando campos de 'res.partner' en Odoo...")
    try:
        # Fetch all fields of res.partner
        fields = odoo_client.execute('res.partner', 'fields_get', [], ['string', 'type', 'help'])
        
        # Check for the problematic field
        target_field = 'aeat_sending_enabled'
        
        if target_field in fields:
            print(f"✅ El campo '{target_field}' EXISTE en el modelo.")
            print(f"   Detalles: {fields[target_field]}")
        else:
            print(f"❌ El campo '{target_field}' NO EXISTE en el modelo 'res.partner'.")
            print("   Esto confirma por qué la vista falla: intenta mostrar un campo que no está en la base de datos.")

    except Exception as e:
        print(f"🚨 Error inspeccionando campos: {e}")

if __name__ == "__main__":
    inspect_partner_fields()
