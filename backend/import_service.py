import pandas as pd
import json
import uuid
import sqlite3
import io
from typing import List, Dict, Any

def parse_customers_excel(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Parses an Excel file (bytes) looking for specific columns from the user's screenshot.
    Returns a list of customer dictionaries ready for DB insertion.
    """
    try:
        # Load excel with explicit engine to avoid format detection issues
        df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
        
        # Normalize column names to uppercase/stripped for easier matching
        df.columns = [str(c).strip() for c in df.columns]
        
        customers = []
        
        for _, row in df.iterrows():
            # Extract fields with safe defaults
            # Mapping based on screenshot: 
            # Cuenta: Cód. -> display_id
            # Cuenta: Nombre -> name
            # Cuenta: teléfono -> phone
            # Cuenta: E-mail -> email
            # Dirección 1 + C.P. + Ciudad -> billing_address
            
            try:
                # Find columns using flexible matching
                col_code = next((c for c in df.columns if 'Cuenta: Cód' in c or 'Código' in c or 'ID' in c), None)
                col_name = next((c for c in df.columns if 'Cuenta: Nombre' in c or 'Nombre' in c or 'Empresa' in c), None)
                col_addr = next((c for c in df.columns if 'Dirección' in c or 'Calle' in c), None)
                col_cp = next((c for c in df.columns if 'C.P.' in c or 'CP' in c or 'Postal' in c), None)
                col_city = next((c for c in df.columns if 'Ciudad' in c or 'Población' in c or 'Municipio' in c), None)
                col_email = next((c for c in df.columns if 'E-mail' in c or 'Email' in c or 'Correo' in c), None)
                col_phone = next((c for c in df.columns if 'teléfono' in c or 'Teléfono' in c or 'Telf' in c or 'Móvil' in c), None)
                col_nif = next((c for c in df.columns if 'NIF' in c or 'CIF' in c or 'VAT' in c or 'DNI' in c), None)
                
                if not col_name or pd.isna(row[col_name]):
                    continue # Skip empty names

                name = str(row[col_name]).strip()
                display_id = str(row[col_code]).strip() if col_code and not pd.isna(row[col_code]) else None
                nif = str(row[col_nif]).strip() if col_nif and not pd.isna(row[col_nif]) else None
                
                postal_code = str(row[col_cp]).strip() if col_cp and not pd.isna(row[col_cp]) else ""
                
                # Format Address (Just street and city)
                addr_parts = []
                if col_addr and not pd.isna(row[col_addr]): addr_parts.append(str(row[col_addr]).strip())
                if col_city and not pd.isna(row[col_city]): addr_parts.append(str(row[col_city]).strip())
                billing_address = ", ".join(addr_parts)
                
                email = str(row[col_email]).strip() if col_email and not pd.isna(row[col_email]) else ""
                phone = str(row[col_phone]).strip() if col_phone and not pd.isna(row[col_phone]) else ""
                
                # Setup Location (default to billing address)
                locations = []
                if billing_address:
                    locations.append(billing_address)
                
                cust_obj = {
                    "id": str(uuid.uuid4()),
                    "display_id": display_id,
                    "name": name,
                    "nif": nif,
                    "phone": phone,
                    "email": email,
                    "billing_address": billing_address,
                    "postal_code": postal_code,
                    "locations": json.dumps(locations),
                    "notes": ""
                }
                customers.append(cust_obj)
                
            except Exception as e:
                print(f"Error parsing row: {e}")
                continue
                
        return customers
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        raise e

def parse_vehicles_excel(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Parses an Excel file for Vehicles. Expects specific template columns.
    """
    try:
        df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        trucks = []
        for _, row in df.iterrows():
            # Expected cols: ID, MATRICULA, ALIAS, CATEGORIA, EJES, PESO_MAX, GRUA, PLUMA, CAJA, LARGO
            
            # Simple retrieval helper
            def get_val(col_contains):
                col = next((c for c in df.columns if col_contains in c), None)
                return row[col] if col and not pd.isna(row[col]) else None

            plate = get_val("MATRICULA")
            if not plate: 
                continue # Skip without plate
                
            obj = {
                "id": str(get_val("ID") or uuid.uuid4()),
                "plate": str(plate).strip(),
                "alias": str(get_val("ALIAS") or ""),
                "category": str(get_val("CATEGORIA") or "CAMION_GRUA"),
                "status": "AVAILABLE",
                "axles": int(get_val("EJES") or 2),
                "max_weight": float(get_val("PESO") or 0),
                "color": "#3b82f6", # Default blue
                "has_crane": bool(get_val("GRUA") or False),
                "has_jib": bool(get_val("PLUMA") or False),
                "is_box_body": bool(get_val("CAJA") or False),
                "max_length": float(get_val("LARGO") or 0)
            }
            trucks.append(obj)
            
        return trucks
    except Exception as e:
        print(f"Error parsing Vehicle Excel: {e}")
        raise e
