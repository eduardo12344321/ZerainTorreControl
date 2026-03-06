from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from services.odoo_service import odoo_client
from dependencies import get_current_user
from fastapi import UploadFile, File, BackgroundTasks
from services.enrichment_service import enrichment_service
from import_service import parse_customers_excel
import pandas as pd
import io
import asyncio
import requests
import base64
from urllib.parse import urlparse

router = APIRouter(
    prefix="/api/v1/odoo",
    tags=["odoo"],
    responses={404: {"description": "Not found"}},
)

def resolve_odoo_tags(tag_names: List[str]) -> List[int]:
    """
    Checks if tags exist in Odoo (res.partner.category), creates them if not, 
    and returns their IDs.
    """
    if not tag_names: return []
    tag_ids = []
    if not odoo_client.uid: odoo_client.connect()
    for name in tag_names:
        name = name.strip()
        if not name: continue
        try:
            # Search for existing tag
            existing = odoo_client.execute('res.partner.category', 'search', [('name', '=', name)], limit=1)
            if existing:
                tag_ids.append(existing[0])
            else:
                # Create new tag
                new_id = odoo_client.execute('res.partner.category', 'create', {'name': name})
                tag_ids.append(new_id)
        except Exception as e:
            print(f"Error resolving tag '{name}': {e}")
    return tag_ids

def resolve_odoo_location(country_name: str, state_name: str):
    """
    Robustly resolves country and state IDs from names.
    Handles 'España' vs 'Spain' and specific Spanish province mapping.
    """
    country_id = None
    state_id = None
    
    if not odoo_client.uid: odoo_client.connect()
    
    # 1. Resolve Country
    if country_name:
        c_upper = country_name.upper()
        if any(x in c_upper for x in ['ESPAÑA', 'SPAIN', ' ESP']):
            c_search = odoo_client.execute('res.country', 'search', [('code', '=', 'ES')], limit=1)
            if c_search: country_id = c_search[0]
        else:
            c_search = odoo_client.execute('res.country', 'search', [('name', 'ilike', country_name)], limit=1)
            if c_search: country_id = c_search[0]
            
    # Fallback for Spain if it looks Spanish but country not found
    if not country_id and state_name:
         s_upper = state_name.upper()
         common_provinces = ['ALICANTE', 'MADRID', 'BARCELONA', 'VALENCIA', 'LEON', 'BILBAO', 'SEVILLA', 'MALAGA', 'MURCIA', 'ZARAGOZA']
         if any(p in s_upper for p in common_provinces):
             c_search = odoo_client.execute('res.country', 'search', [('code', '=', 'ES')], limit=1)
             if c_search: country_id = c_search[0]

    # 2. Resolve State (Province)
    if state_name and country_id:
        # Try finding by name (ilike)
        s_search = odoo_client.execute('res.country.state', 'search', [
            ('name', 'ilike', state_name),
            ('country_id', '=', country_id)
        ], limit=1)
        
        if not s_search:
            # Try a hardcoded mapping for Spain if direct search fails (accents/bilingual names/codes)
            # Matching the user-provided mapping logic
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
            
            # Normalize and check
            clean_name = state_name.upper().replace('Á','A').replace('É','E').replace('Í','I').replace('Ó','O').replace('Ú','U').replace('Ñ','N')
            code = None
            if len(clean_name) <= 2: # Maybe it is already a code?
                code = clean_name
            else:
                for key, val in spain_map.items():
                    if key in clean_name or clean_name in key:
                        code = val; break
            
            if code:
                s_search = odoo_client.execute('res.country.state', 'search', [
                    ('code', '=', code.upper()),
                    ('country_id', '=', country_id)
                ], limit=1)

        if s_search: state_id = s_search[0]
        
    return country_id, state_id


@router.get("/customers/enrich-stats")
async def get_enrichment_stats(current_user: dict = Depends(get_current_user)):
    """
    Returns statistics about customer enrichment status.
    """
    try:
        # Count total customers (active only, excluding ID 1)
        total_customers = odoo_client.execute('res.partner', 'search_count', [
            ('customer_rank', '>', 0),
            ('active', '=', True),
            ('id', '!=', 1)
        ])
        
        # Count customers without AI enrichment (checking x_studio_fiabilidad mapping like the background worker)
        pending_enrichment = odoo_client.execute('res.partner', 'search_count', [
            ('customer_rank', '>', 0),
            ('active', '=', True),
            ('x_studio_fiabilidad', '=', False)
        ])
        
        enriched = total_customers - pending_enrichment
        
        return {
            "total": total_customers,
            "enriched": enriched,
            "pending": pending_enrichment,
            "completion_percentage": round((enriched / total_customers * 100) if total_customers > 0 else 0, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customers/enrich-bulk")
async def enrich_all_customers_bulk(background_tasks: BackgroundTasks, limit: int = Query(50), current_user: dict = Depends(get_current_user)):
    """
    Triggers a background process to enrich up to 'limit' non-enriched customers in Odoo.
    Uses a 5-second delay between requests to respect Google Gemini free tier limits (15 RPM).
    """
    background_tasks.add_task(process_bulk_enrichment, limit)
    return {"message": f"Proceso de investigación masiva para {limit} clientes iniciado en segundo plano. Esto tardará varios minutos."}

async def process_bulk_enrichment(limit: int):
    try:
        domain = [
            ('customer_rank', '>', 0),
            ('x_studio_fiabilidad', '=', False),
            ('active', '=', True),
            ('is_company', '=', True),
            ('id', '>', 5)
        ]
        partner_ids = odoo_client.execute('res.partner', 'search', domain, limit=limit)
        
        print(f"======= BULK ENRICH: STARTED for {len(partner_ids)} customers (Targeted Batch of {limit}) =======")
        
        for i, pid in enumerate(partner_ids):
            try:
                # Fetch including image check
                read_res = odoo_client.execute('res.partner', 'read', [int(pid)], 
                                            ['name', 'street', 'city', 'phone', 'email', 'comment', 'website', 'image_128', 'state_id', 'country_id', 'zip', 'vat', 'x_studio_fiabilidad'])
                if not read_res: continue
                cust = read_res[0]

                print(f"\n[{i+1}/{len(partner_ids)}] 🤖 Procesando: {cust.get('name')} (ID: {pid})")
                
                updates = {}
                
                # --- CHECK 1: INTELLIGENCE ---
                has_intel = bool(cust.get('x_studio_fiabilidad'))
                
                if not has_intel:
                    print(f"   🔍 Iniciando análisis IA...")
                    # AI
                    intel = enrichment_service.enrich_company_deep(
                        name=cust.get('name', 'Unknown'), 
                        city=cust.get('city', ''), 
                        web=cust.get('website', ''),
                        current_data={'phone': cust.get('phone'), 'email': cust.get('email')}
                    )
                    
                    if "error" in intel:
                        print(f"   ❌ Error IA: {intel['error']}")
                    else:
                        print(f"   ✨ IA Éxito -> Fiabilidad: {intel.get('reliability_score')}/10")
                        
                        # Contact & Identity suggestions
                        if not cust.get('phone') and intel.get('suggested_phone'):
                            updates['phone'] = intel['suggested_phone']
                            print(f"   📞 Nuevo teléfono sugerido: {intel['suggested_phone']}")
                        
                        if not cust.get('email') and intel.get('suggested_email'):
                            updates['email'] = intel['suggested_email']
                            print(f"   📧 Nuevo email sugerido: {intel['suggested_email']}")
                        
                        # VAT/NIF: Update if empty or seems like a placeholder
                        vat = str(cust.get('vat') or '').strip()
                        if (not vat or len(vat) < 5) and intel.get('suggested_nif'):
                            updates['vat'] = intel['suggested_nif']
                            print(f"   🆔 Nuevo NIF sugerido: {intel['suggested_nif']}")
                        
                        if not cust.get('zip') and intel.get('suggested_zip'):
                            updates['zip'] = intel['suggested_zip']
                            print(f"   📮 Nuevo CP sugerido: {intel['suggested_zip']}")
                        
                        if not cust.get('city') and intel.get('suggested_city'):
                            updates['city'] = intel['suggested_city']
                            print(f"   🏙️ Nueva ciudad sugerida: {intel['suggested_city']}")

                        # Location refinement: State and Country (Odoo uses IDs)
                        target_country = intel.get('suggested_country') or 'España'
                        target_state = intel.get('suggested_province')
                        c_id, s_id = resolve_odoo_location(target_country, target_state)
                        
                        if c_id:
                            curr_c = cust.get('country_id')
                            if not curr_c or curr_c[0] != c_id:
                                updates['country_id'] = c_id
                                print(f"   🌍 País detectado: {target_country} (ID: {c_id})")
                        
                        if s_id:
                            curr_s = cust.get('state_id')
                            if not curr_s or curr_s[0] != s_id:
                                updates['state_id'] = s_id
                                print(f"   📍 Provincia detectada: {target_state} (ID: {s_id})")

                        # Company Status (Active/Extinguished)
                        comp_status = intel.get('suggested_company_status')
                        if comp_status:
                            updates['x_studio_estado_empresa'] = str(comp_status)[:250]
                            print(f"   🏛️ Estado Empresa: {comp_status}")

                        # Tags logic
                        tag_names = intel.get('suggested_tags', [])
                        if tag_names:
                            t_ids = resolve_odoo_tags(tag_names)
                            if t_ids:
                                updates['category_id'] = [(6, 0, t_ids)]
                                print(f"   🏷️ Etiquetas detectadas: {tag_names}")

                        if 'activity' in intel: updates['x_studio_categoria'] = str(intel['activity'])[:250]
                        if 'revenue' in intel: updates['x_studio_facturacion_estimada'] = str(intel['revenue'])[:250]
                        if 'employees' in intel: updates['x_studio_num_empleados'] = str(intel['employees'])[:250]
                        if 'reliability_score' in intel: updates['x_studio_fiabilidad'] = str(intel['reliability_score'])[:250]
                        if 'reliability_justification' in intel: updates['x_studio_explicacion'] = str(intel['reliability_justification'])
                else:
                    print(f"   ⏩ IA: Ya realizada previamente.")

                # --- CHECK 2: LOGO (Free Clearbit Strategy) ---
                has_logo = bool(cust.get('image_128'))
                if not has_logo:
                    domain_name = None
                    if cust.get('website'):
                        try: domain_name = urlparse(cust.get('website')).netloc
                        except: pass
                    elif cust.get('email') and '@' in cust.get('email'):
                        try: domain_name = cust.get('email').split('@')[1]
                        except: pass
                    
                    if domain_name:
                        domain_name = domain_name.replace('www.', '')
                        # Ignore common email providers
                        if domain_name not in ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es', 'yahoo.com', 'icloud.com', 'me.com']:
                            try:
                                # Fallback to DuckDuckGo icons (more reliable DNS)
                                logo_url = f"https://icons.duckduckgo.com/ip3/{domain_name}.ico"
                                
                                # Timeout short to not block too much
                                resp = requests.get(logo_url, timeout=3)
                                if resp.status_code == 200 and len(resp.content) > 100:
                                    try:
                                        from PIL import Image
                                        import io
                                        # Validate and convert to PNG (Odoo is much happier with PNG/JPG)
                                        img = Image.open(io.BytesIO(resp.content))
                                        
                                        # Convert to RGB if necessary (rgba to rgb for generic jpg, but we'll use png)
                                        output = io.BytesIO()
                                        img.save(output, format="PNG")
                                        img_b64 = base64.b64encode(output.getvalue()).decode('utf-8')
                                        
                                        updates['image_1920'] = img_b64
                                        print(f"   🖼️ Logo encontrado y validado: {domain_name}")
                                    except Exception as img_err:
                                        print(f"   ⚠️ Logo encontrado pero inválido para Odoo: {img_err}")
                                else:
                                    print(f"   ⚠️ Logo no encontrado u omitido por tamaño ({domain_name})")
                            except Exception as e:
                                print(f"   ❌ Error buscando logo: {e}")
                    else:
                        print(f"   ⚠️ Sin dominio para buscar logo.")
                else:
                    print(f"   ⏩ Logo: Ya existe.")

                # --- SAVE UPDATES ---
                if updates:
                    try:
                        odoo_client.execute('res.partner', 'write', [int(pid)], updates, raise_exception=True)
                        print(f"   💾 Cambios guardados en Odoo.")
                    except Exception as odoo_error:
                        error_msg = str(odoo_error)
                        
                        # Fallback 1: VAT Validation issues
                        if "VAT" in error_msg or 'NIF' in error_msg or 'vat' in error_msg.lower():
                            print(f"   ⚠️ Error de NIF en Odoo: {error_msg}. Forzando N/A.")
                            updates['vat'] = 'N/A'
                            try:
                                odoo_client.execute('res.partner', 'write', [int(pid)], updates, raise_exception=True)
                                print(f"   💾 Cambios guardados (Ignorando NIF).")
                                continue # Skip image fallback if this works
                            except Exception as e2:
                                print(f"   ❌ Fallo reintentando sin NIF: {e2}")
                        
                        # Fallback 2: Image issues (if previous attempt failed or we skipped)
                        if 'image_1920' in updates:
                            print(f"   ❌ Fallo al escribir imagen, reintentando solo texto...")
                            del updates['image_1920']
                            if updates:
                                try:
                                    odoo_client.execute('res.partner', 'write', [int(pid)], updates, raise_exception=True)
                                except Exception as e3:
                                    print(f"   🔥 Fallo final al escribir en Odoo: {e3}")
                        else:
                            print(f"   🔥 Fallo final al escribir en Odoo: {odoo_error}")
                else:
                    print(f"   💤 Sin cambios necesarios.")
                
            except Exception as e:
                print(f"   🔥 Error procesando cliente {pid}: {e}")
            
            # WAIT if we did AI (to respect rate limit)
            if not has_intel:
                print("   ⏳ Esperando 5s (Rate Limit IA)...")
                await asyncio.sleep(5)
            else:
                # Faster if only checking logo
                await asyncio.sleep(0.1)
            
        print("======= BULK ENRICH: FINISHED SUCCESSFULLY =======")
    except Exception as e:
        print(f"BULK ENRICH FATAL ERROR: {e}")

@router.get("/customers")
def get_odoo_customers(limit: int = 5000, current_user: dict = Depends(get_current_user)):
    """
    Fetch customers directly from Odoo.
    """
    try:
        # Check connection
        if not odoo_client.uid and not odoo_client.connect():
             raise HTTPException(status_code=503, detail="Could not connect to Odoo")
        
        customers = odoo_client.get_customers(limit=limit)
        return customers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
def get_odoo_orders(customer_id: Optional[int] = None, limit: int = 500, current_user: dict = Depends(get_current_user)):
    """
    Fetch sale orders from Odoo, optionally filtered by customer.
    """
    try:
        if not odoo_client.uid and not odoo_client.connect():
            raise HTTPException(status_code=503, detail="Could not connect to Odoo")
        
        # Get sale orders
        orders = odoo_client.get_sale_orders(limit=limit)
        
        # Filter by customer if specified and EXCLUDE CANCELLED
        filtered = []
        for o in orders:
            if o.get('state') == 'cancel':
                continue
            if customer_id and (not o.get('partner_id') or o['partner_id'][0] != customer_id):
                continue
            filtered.append(o)
        
        return filtered
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicles")
def get_odoo_vehicles(current_user: dict = Depends(get_current_user)):
    """
    Fetch vehicles directly from Odoo.
    """
    try:
         if not odoo_client.uid and not odoo_client.connect():
             raise HTTPException(status_code=503, detail="Could not connect to Odoo")
         
         vehicles = odoo_client.get_vehicles()
         return vehicles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import/customers-excel")
async def import_customers_excel(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    enrich: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Import customers with improved robustness and background processing.
    """
    try:
        content = await file.read()
        customers = parse_customers_excel(content)
        
        if not customers:
            return {"status": "error", "message": "No customers found in Excel"}

        # Start background processing
        background_tasks.add_task(process_customer_import, customers, enrich, current_user['username'])
        
        return {
            "status": "success", 
            "message": f"Iniciando importación de {len(customers)} clientes en segundo plano.",
            "total_in_file": len(customers)
        }
        
    except Exception as e:
        print(f"IMPORT CONTROLLER ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_customer_import(customers: List[dict], enrich: bool, admin_name: str):
    """Long-running import process"""
    created_count = 0
    updated_count = 0
    errors = 0
    
    # Ensure connection
    if not odoo_client.uid and not odoo_client.connect():
        print("IMPORT ERROR: Could not connect to Odoo in background")
        return

    for i, cust in enumerate(customers):
        try:
            name = cust['name']
            
            # 1. Search existing (VAT first, then Name)
            existing_ids = []
            if cust.get('nif'):
                existing_ids = odoo_client.execute('res.partner', 'search', [['vat', '=', str(cust['nif'])]])
            
            if not existing_ids:
                existing_ids = odoo_client.execute('res.partner', 'search', [['name', '=', name]])
            
            odoo_data = {
                'name': name,
                'vat': cust.get('nif', '') or '',
                'street': cust.get('billing_address', '') or '',
                'zip': cust.get('postal_code', '') or '',
                'phone': cust.get('phone', '') or '',
                'email': cust.get('email', '') or '',
                'comment': cust.get('notes', '') or '',
                'ref': cust.get('display_id', '') or '',
                'customer_rank': 1,
                'is_company': True
            }

            partner_id = None
            if existing_ids:
                # Get the first ID, ensuring it's an int (Odoo returns list of ints)
                partner_id = int(existing_ids[0])
                odoo_client.execute('res.partner', 'write', [partner_id], odoo_data)
                updated_count += 1
                # print(f"[{i+1}/{len(customers)}] Updated: {name}")
            else:
                # Create new
                res = odoo_client.create_customer(odoo_data)
                # Coerce result (Odoo create usually returns Int, but handle List)
                if isinstance(res, list): partner_id = int(res[0])
                else: partner_id = int(res)
                created_count += 1
                # print(f"[{i+1}/{len(customers)}] Created: {name} (ID: {partner_id})")

            # 2. AI Enrichment (only if enabled and skip on errors)
            if enrich and partner_id and enrichment_service.model:
                try:
                    # Async-like safety: don't let AI crash the import
                    city_guess = cust.get('billing_address', '').split(',')[-1].strip()
                    ai_note = enrichment_service.enrich_company_info(name, city=city_guess)
                    if ai_note and "Verification" not in ai_note:
                        odoo_client.execute('res.partner', 'write', [partner_id], {'comment': f"{odoo_data['comment']}\n[AI]: {ai_note}"})
                except:
                    pass # Silently skip AI enrichment if it fails (likely quota or permission)

        except Exception as e:
            print(f"ERROR processing customer {cust.get('name', 'UNKNOWN')}: {e}")
            errors += 1
            continue
            
    print(f"IMPORT FINISHED: {created_count} created, {updated_count} updated, {errors} errors.")

@router.post("/customers/{customer_id}/enrich-expert")
async def enrich_customer_expert(customer_id: str, overwrite: bool = False, current_user: dict = Depends(get_current_user)):
    """
    Triggers deep AI analysis for a specific customer.
    Updates Odoo with suggested phone/email if missing and adds detailed business intel to notes.
    If overwrite=True, it will overwrite existing addresses, phones, and emails.
    """
    try:
        # 1. Read current data from Odoo
        read_res = odoo_client.execute('res.partner', 'read', [int(customer_id)], 
                                     ['name', 'street', 'city', 'phone', 'email', 'comment', 'website', 'state_id', 'country_id', 'zip', 'vat'])
        if not read_res:
            raise HTTPException(status_code=404, detail="Customer not found in Odoo")
        
        cust = read_res[0]
        name = cust.get('name', 'Unknown')
        city = cust.get('city', '')
        
        # 2. Call Deep AI
        intel = enrichment_service.enrich_company_deep(
            name=name, 
            city=city, 
            web=cust.get('website', ''),
            current_data={'phone': cust.get('phone'), 'email': cust.get('email')}
        )

        if "error" in intel:
             raise HTTPException(status_code=500, detail=intel['error'])

        # 3. Prepare Updates
        updates = {}
        
        # Contact & Identity suggestions
        if (overwrite or not cust.get('phone')) and intel.get('suggested_phone'):
            updates['phone'] = intel.get('suggested_phone')
        if (overwrite or not cust.get('email')) and intel.get('suggested_email'):
            updates['email'] = intel.get('suggested_email')
        
        vat = str(cust.get('vat') or '').strip()
        if (overwrite or not vat or len(vat) < 5) and intel.get('suggested_nif'):
            updates['vat'] = intel.get('suggested_nif')
        
        if (overwrite or not cust.get('zip')) and intel.get('suggested_zip'):
            updates['zip'] = intel.get('suggested_zip')
        if (overwrite or not cust.get('city')) and intel.get('suggested_city'):
            updates['city'] = intel.get('suggested_city')
        
        # Location refinement: State and Country (Resolve IDs)
        target_country = intel.get('suggested_country') or 'España'
        target_state = intel.get('suggested_province')
        c_id, s_id = resolve_odoo_location(target_country, target_state)
        
        if c_id:
            curr_c = cust.get('country_id')
            if overwrite or not curr_c or curr_c[0] != c_id:
                updates['country_id'] = c_id
        
        if s_id:
            curr_s = cust.get('state_id')
            if overwrite or not curr_s or curr_s[0] != s_id:
                updates['state_id'] = s_id

        # Tags logic
        tag_names = intel.get('suggested_tags', [])
        if tag_names:
            t_ids = resolve_odoo_tags(tag_names)
            if t_ids:
                updates['category_id'] = [(6, 0, t_ids)]

        if 'activity' in intel: updates['x_studio_categoria'] = str(intel['activity'])[:250]
        if 'revenue' in intel: updates['x_studio_facturacion_estimada'] = str(intel['revenue'])[:250]
        if 'employees' in intel: updates['x_studio_num_empleados'] = str(intel['employees'])[:250]
        if 'reliability_score' in intel: updates['x_studio_fiabilidad'] = str(intel['reliability_score'])[:250]
        if 'reliability_justification' in intel: updates['x_studio_explicacion'] = str(intel['reliability_justification'])
        if 'suggested_company_status' in intel:
            st = str(intel['suggested_company_status']).strip()
            updates['x_studio_estado_empresa'] = st

        # 4. Write back to Odoo
        # Pop the VAT to try it separately because Odoo is very strict with the VAT format (e.g. requires ES prefix)
        vat_to_update = updates.pop('vat', None)

        if updates:
            odoo_client.execute('res.partner', 'write', [int(customer_id)], updates)
            
        if vat_to_update:
            try:
                # Add ES if missing and length is roughly a standard spanish NIF/CIF
                if len(vat_to_update) >= 8 and not vat_to_update.upper().startswith('ES'):
                    vat_to_update = f"ES{vat_to_update}"
                odoo_client.execute('res.partner', 'write', [int(customer_id)], {'vat': vat_to_update}, raise_exception=True)
                updates['vat'] = vat_to_update
            except Exception as vat_error:
                print(f"Warning: Could not update VAT for {customer_id} due to Odoo validation: {vat_error}")
                # We do not fail the whole request, we just skip the VAT update.

        return {
            "status": "success", 
            "intel": intel,
            "updates_made": list(updates.keys())
        }
    except Exception as e:
        print(f"Error enriching customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customers/enrich-reset")
async def reset_enrichment_stats(current_user: dict = Depends(get_current_user)):
    """
    Resets the 'x_studio_fiabilidad' field to False for all customers.
    This forces the background AI enrichment worker to re-evaluate the entire database.
    """
    try:
        domain = [
            ('is_company', '=', True),
            ('x_studio_fiabilidad', '!=', False)
        ]
        
        # Find all already-enriched companies
        enriched_clients = odoo_client.execute('res.partner', 'search', [domain])
        
        if not enriched_clients:
            return {"status": "success", "message": "No hay clientes para reiniciar.", "reset_count": 0}
            
        # Bulk reset their reliability
        odoo_client.execute('res.partner', 'write', enriched_clients, {'x_studio_fiabilidad': False})
        
        return {
            "status": "success", 
            "message": f"⏳ Historial reiniciado. {len(enriched_clients)} clientes volverán a ser escaneados por la IA en breve.",
            "reset_count": len(enriched_clients)
        }
        
    except Exception as e:
        print(f"Error resetting enrichment stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customers/search-intel")
async def search_intel_by_name(name: str, city: Optional[str] = "", current_user: dict = Depends(get_current_user)):
    """
    Returns AI intelligence for a company name without requiring an existing Odoo record.
    Useful for 'Autocomplete with AI' when creating a new customer.
    """
    try:
        intel = enrichment_service.enrich_company_deep(name=name, city=city)
        if "error" in intel:
             raise HTTPException(status_code=500, detail=intel['error'])
        return intel
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/all")
async def sync_all_odoo_data(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Triggers a background full sync: Odoo Online -> Local DB.
    """
    from scripts.sync_odoo_local import sync_all
    background_tasks.add_task(sync_all)
    return {"status": "success", "message": "Sincronización global iniciada en segundo plano."}

@router.post("/sync/customers")
async def sync_customers_local_endpoint(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Sync only customers from Odoo.
    """
    from scripts.sync_odoo_local import sync_customers
    background_tasks.add_task(sync_customers)
    return {"status": "success", "message": "Sincronización de clientes iniciada."}

@router.post("/sync/vehicles")
async def sync_vehicles_local_endpoint(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """
    Sync only vehicles from Odoo.
    """
    from scripts.sync_odoo_local import sync_vehicles
    background_tasks.add_task(sync_vehicles)
    return {"status": "success", "message": "Sincronización de vehículos iniciada."}
