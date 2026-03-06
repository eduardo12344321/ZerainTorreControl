import json
import time
import xmlrpc.client
import sys
import os

# Set environment explicitly
os.environ["GEMINI_API_KEY"] = "AIzaSyAid96mNT86KVza-KUO9QEk1qPaLj7zULY"

from services.odoo_service import odoo_client
from services.enrichment_service import enrichment_service
import re
from urllib.parse import urlparse

def resolve_odoo_location(country_name: str, state_name: str):
    country_id = None
    state_id = None
    if not country_name and not state_name: return None, None
    if country_name:
        c_upper = country_name.upper()
        if any(x in c_upper for x in ['ESPAÑA', 'SPAIN', ' ESP']):
            c_search = odoo_client.execute('res.country', 'search', [('code', '=', 'ES')], limit=1)
            if c_search: country_id = c_search[0]
        else:
            c_search = odoo_client.execute('res.country', 'search', [('name', 'ilike', country_name)], limit=1)
            if c_search: country_id = c_search[0]
            
    if not country_id and state_name:
         s_upper = state_name.upper()
         common_provinces = ['ALICANTE', 'MADRID', 'BARCELONA', 'VALENCIA', 'LEON', 'BILBAO', 'SEVILLA', 'MALAGA', 'MURCIA', 'ZARAGOZA']
         if any(p in s_upper for p in common_provinces):
             c_search = odoo_client.execute('res.country', 'search', [('code', '=', 'ES')], limit=1)
             if c_search: country_id = c_search[0]

    if state_name and country_id:
        s_search = odoo_client.execute('res.country.state', 'search', [('name', 'ilike', state_name), ('country_id', '=', country_id)], limit=1)
        if not s_search:
            spain_map = {
                "ALICANTE": "A", "ALACANT": "A", "ALBACETE": "AB", "ALMERIA": "AL", "AVILA": "AV",
                "BARCELONA": "B", "BADAJOZ": "BA", "VIZCAYA": "BI", "BIZKAIA": "BI", "BURGOS": "BU",
                "CORUÑA": "C", "CORUNA": "C", "CADIZ": "CA", "CACERES": "CC", "CEUTA": "CE",
                "CORDOBA": "CO", "CIUDAD REAL": "CR", "CASTELLON": "CS", "CASTELLO": "CS", "CUENCA": "CU",
                "LAS PALMAS": "GC", "PALMAS": "GC", "GERONA": "GI", "GIRONA": "GI", "GRANADA": "GR",
                "GUADALAJARA": "GU", "HUELVA": "H", "HUESCA": "HU", "JAEN": "J", "LERIDA": "L", "LLEIDA": "L",
                "LEON": "LE", "RIOJA": "LO", "LUGO": "LU", "MADRID": "M", "MALAGA": "MA", "MELILLA": "ME",
                "MURCIA": "MU", "NAVARRA": "NA", "ASTURIAS": "O", "OVIEDO": "O", "ORENSE": "OR", "OURENSE": "OR",
                "PALENCIA": "P", "BALEARES": "PM", "MALLORCA": "PM", "PONTEVEDRA": "PO", "CANTABRIA": "S",
                "SANTANDER": "S", "SALAMANCA": "SA", "SEVILLA": "SE", "SEGOVIA": "SG", "SORIA": "SO",
                "GUIPUZCOA": "SS", "GIPUZKOA": "SS", "SAN SEBASTIAN": "SS", "TARRAGONA": "T", "TERUEL": "TE",
                "TENERIFE": "TF", "TOLEDO": "TO", "VALENCIA": "V", "VALLADOLID": "VA", "ALAVA": "VI", "ARABA": "VI",
                "ZARAGOZA": "Z", "ZAMORA": "ZA"
            }
            norm_state = state_name.upper().replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U')
            
            for key, code in spain_map.items():
                if key in norm_state:
                    s_search_code = odoo_client.execute('res.country.state', 'search', [('code', '=', code), ('country_id', '=', country_id)], limit=1)
                    if s_search_code:
                        state_id = s_search_code[0]
                        break
        else:
            state_id = s_search[0]
            
    return country_id, state_id

print("Iniciando servicio de enriquecimiento IA en segundo plano...")
while True:
    try:
        if not odoo_client.uid and not odoo_client.connect():
            print("Fallo de autenticación en Odoo. Retentando en 60s...")
            time.sleep(60)
            continue
            
        domain = [
            ('is_company', '=', True),
            ('x_studio_fiabilidad', '=', False),
            ('active', '=', True),
            ('id', '>', 5)
        ]
        
        pending_clients = odoo_client.execute('res.partner', 'search_read', 
            domain, fields=['id', 'name', 'city', 'phone', 'email', 'website', 'vat', 'zip'], limit=1
        )
        
        if not pending_clients:
            print("No hay clientes pendientes de enriquecimiento IA. Durmiendo 5 minutos...")
            time.sleep(300)
            continue
            
        client = pending_clients[0]
        name = client.get('name')
        c_id = client['id']
        
        if not name:
            odoo_client.execute('res.partner', 'write', [[c_id], {'x_studio_fiabilidad': 'Error: Sin Nombre'}])
            continue
            
        print(f"[{time.strftime('%H:%M:%S')}] Enriqueciendo con IA: {name} (ID: {c_id})")
        
        intel = enrichment_service.enrich_company_deep(
            name=name, 
            city=client.get('city', ''), 
            web=client.get('website', ''),
            current_data={'phone': client.get('phone', ''), 'email': client.get('email', '')}
        )
        
        vals = {}
        
        if intel.get("error"):
            vals['x_studio_fiabilidad'] = '1'
            vals['x_studio_explicacion'] = f"Error en la IA: {intel.get('error')}"
        else:
            if 'activity' in intel: vals['x_studio_categoria'] = str(intel['activity'])[:250]
            if 'revenue' in intel: vals['x_studio_facturacion_estimada'] = str(intel['revenue'])[:250]
            if 'employees' in intel: vals['x_studio_num_empleados'] = str(intel['employees'])[:250]
            if 'reliability_score' in intel: vals['x_studio_fiabilidad'] = str(intel['reliability_score'])[:250]
            if 'reliability_justification' in intel: vals['x_studio_explicacion'] = str(intel['reliability_justification'])
            if 'suggested_company_status' in intel and intel['suggested_company_status']: 
                vals['x_studio_estado_empresa'] = str(intel['suggested_company_status'])[:250]
            
            # Additional metadata
            if not client.get('phone') and intel.get('suggested_phone'):
                vals['phone'] = intel['suggested_phone']
            if not client.get('email') and intel.get('suggested_email'):
                vals['email'] = intel['suggested_email']
            
            vat = str(client.get('vat') or '').strip()
            if (not vat or len(vat) < 5) and intel.get('suggested_nif'):
                vals['vat'] = intel['suggested_nif']
                
            if not client.get('zip') and intel.get('suggested_zip'):
                vals['zip'] = intel['suggested_zip']
            if not client.get('city') and intel.get('suggested_city'):
                vals['city'] = intel['suggested_city']
                
            # Location
            target_country = intel.get('suggested_country') or 'España'
            target_state = intel.get('suggested_province')
            country_id, state_id = resolve_odoo_location(target_country, target_state)
            if country_id: vals['country_id'] = country_id
            if state_id: vals['state_id'] = state_id

            if 'suggested_company_status' in intel:
                st = str(intel['suggested_company_status']).strip()
                vals['x_studio_estado_empresa'] = st

        try:
            odoo_client.execute('res.partner', 'write', [[c_id], vals], raise_exception=True)
            print(f"  -> Guardado exitosamente.")
        except Exception as odoo_err:
            error_msg = str(odoo_err)
            if "VAT" in error_msg or 'NIF' in error_msg or 'vat' in error_msg.lower():
                print(f"  ⚠️ Error de VAT/NIF detectado. Forzando N/A y reintentando...")
                vals['vat'] = 'N/A'
                try:
                    odoo_client.execute('res.partner', 'write', [[c_id], vals], raise_exception=True)
                    print(f"  -> Guardado (Ignorando NIF inválido).")
                except Exception as e2:
                    print(f"  ❌ Fallo reintentando sin NIF: {e2}")
            else:
                print(f"  ❌ Fallo al guardar en Odoo: {odoo_err}")
                if vals.get('x_studio_fiabilidad') is None:
                    odoo_client.execute('res.partner', 'write', [[c_id], {'x_studio_fiabilidad': 'Error: Guardado Odoo'}])

        time.sleep(5)
        
    except Exception as e:
        print(f"Error general en el loop: {e}. Reintentando en 30s...")
        time.sleep(30)
