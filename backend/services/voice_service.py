import os
import json
import datetime
from datetime import date
from dotenv import load_dotenv
from database import db

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel as VertexModel, Part
except ImportError:
    vertexai = None
    VertexModel = None
    Part = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Ensure .env is loaded (Centralized config might not have run yet)
load_dotenv()

class VoiceService:
    def __init__(self):
        self.model = None
        self.use_vertex = False
        
        # 1. Try Google AI Studio (API Key) - Best for Local Dev
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and genai:
            try:
                genai.configure(api_key=api_key)
                # Updated to 2.0 Flash as 1.5 is not available/deprecated for this key environment
                self.model = genai.GenerativeModel("gemini-2.0-flash")
                self.use_vertex = False
                print("VoiceService: Initialized Gemini API (via API Key) with gemini-2.0-flash")
                return
            except Exception as e:
                print(f"VoiceService Warning: Failed to init Gemini API: {e}")

        # 2. Fallback to Vertex AI - Best for Production (Cloud Run)
        # User requested to avoid Vertex if possible, but we keep it as backup if key fails entirely
        if vertexai is None:
            print("VoiceService: Vertex AI libraries not installed.")
            return

        project_id = os.getenv("GCP_PROJECT_ID", "torre-control-zerain")
        location = os.getenv("GCP_LOCATION", "europe-west1")
        credentials_path = os.getenv("PATH_TO_GCP_JSON")

        # Set up Google Credentials if available (for local dev)
        if credentials_path and os.path.exists(credentials_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
            print(f"VoiceService: Using credentials from {credentials_path}")
        elif os.path.exists("torre-control-zerain-e89331561af3.json"):
             os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "torre-control-zerain-e89331561af3.json"
             print("VoiceService: Using local service account file.")

        try:
            vertexai.init(project=project_id, location=location)
            # Try to use a valid Vertex model if fallback happens
            self.model = VertexModel("gemini-1.5-flash-002")
            self.use_vertex = True
            print(f"VoiceService: Initialized Vertex AI ({project_id}, {location})")
        except Exception as e:
            print(f"VoiceService Error Initializing Vertex AI: {e}")
            self.model = None

    def parse_order_text(self, text: str):
        """Processes text input."""
        return self._generate_order_from_parts([text])

    def parse_order_audio(self, audio_bytes: bytes, mime_type: str = "audio/mpeg"):
        """Processes audio input directly with Gemini 1.5 Flash."""
        if not self.model:
            return {"error": "IA no disponible (Configuración faltante)"}
        
        if self.use_vertex and Part:
            audio_part = Part.from_data(data=audio_bytes, mime_type=mime_type)
            return self._generate_order_from_parts([audio_part])
        else:
            # Google Generative AI usage (inline blob)
            audio_blob = {
                "mime_type": mime_type,
                "data": audio_bytes
            }
            return self._generate_order_from_parts([audio_blob])

    def _generate_order_from_parts(self, parts: list):
        if self.model is None:
            return {"error": "IA no disponible"}

        from services.odoo_service import odoo_client
        
        # 1. Fetch Context (Clients, Trucks, Drivers)
        try:
            # Fetch Drivers from Odoo (or local log cache)
            # We use employees name and id for mapping
            drivers_raw = odoo_client.get_employees()
            drivers_list = [f"ID:{d['id']} | {d['name']}" for d in drivers_raw] if drivers_raw else []

            with db.get_cursor() as c:
                c.execute("SELECT name FROM customers WHERE is_active = 1")
                rows = c.fetchall()
                clients = [row[0] for row in rows] if rows else []
                
                c.execute("SELECT id, plate, alias, max_weight, max_length, has_crane, has_jib, axles FROM trucks WHERE is_active = 1")
                trucks = c.fetchall()
                truck_list = []
                for t in trucks:
                    # t = (id, plate, alias, max_weight, max_length, has_crane, has_jib, axles)
                    weight_t = (t[3] / 1000) if t[3] and t[3] > 200 else (t[3] or 0)
                    specs = []
                    if t[5]: specs.append("Grúa")
                    if t[6]: specs.append("Jib")
                    if t[7]: specs.append(f"{t[7]} ejes")
                    spec_str = f" [{', '.join(specs)}]" if specs else ""
                    truck_list.append(f"ID:{t[0]} | {t[2]} ({t[1]}) - {weight_t}T{spec_str}")
        except Exception as e:
            print(f"VoiceService Context Error: {e}")
            clients = ["No database context available"]
            truck_list = []
            drivers_list = []

        # 2. Construct Enhanced Prompt
        context_prompt = f"""
Eres el asistente de IA experto de 'Grúas y Transportes Zerain'.
Tu misión es transcribir y estructurar pedidos de transporte dictados por voz por el jefe de tráfico.

**CONTEXTO DE LA EMPRESA:**
- Nos dedicamos al transporte con camiones grúa autocargantes.
- Términos comunes: "pluma", "cesta", "cabrestante", "portapalets", "caja", "trailer", "góndola".

**BASE DE DATOS ACTUAL (Úsala para corregir nombres y matrículas):**
- CLIENTES: {", ".join(clients[:50])} (y otros...)
- CAMIONES: {", ".join(truck_list)}
- CONDUCTORES: {", ".join(drivers_list)}

**INSTRUCCIONES DE DIRECCIONES:**
- Si el usuario dicta una calle sin ciudad (ej: "Toni Morrison 23"), ASUME que es en "Vitoria-Gasteiz" a menos que mencione otra. 
- Devuelve la dirección lo más completa posible (ej: "Calle Toni Morrison 23, Vitoria-Gasteiz").
- Si menciona un polígono (ej: "Jundiz", "Gamarra"), añádelo a la dirección.

**INSTRUCCIONES GENERALES:**
1. Extrae la información en un JSON válido.
2. Si el usuario menciona un cliente, intenta emparejarlo con la lista de CLIENTES (fuzzy match).
3. Si menciona un camión (ej: "el 3 ejes", "el Volvo", "el 2187", "con Jib"), intenta identificar el ID del camión de la lista que mejor encaje.
4. Identifica si requiere grúa (si dice "elevar", "montar", "cesta", "mover caseta", "jib").
5. Si menciona una persona o conductor (ej: "asigna a Juli", "para Pedro"), usa la lista de CONDUCTORES para obtener su ID.
6. Detecta ACCESORIOS específicos: "cristales", "cemento", "palet/palets", "soporte", "jib".

**CAMPOS JSON REQUERIDOS:**
- client_name: Nombre exacto del cliente (string).
- origin_address: Dirección origen completa (calle, número, ciudad).
- destination_address: Dirección destino completa (calle, número, ciudad).
- load_weight: Peso en Kg (float).
- load_length: Largo en metros (float).
- requires_crane: boolean.
- accessories: Lista de IDs encontrados ["cristales", "cemento", "palet", "soporte", "jib"] (array of strings). Si menciona Jib, inclúyelo aquí.
- truck_id: ID del camión si se menciona explícitamente o por sus características (string), o null.
- driver_id: ID del conductor si se menciona (string), o null.
- description: Resumen del TRABAJO a realizar (ej: "Mover caseta de obra").
- internal_notes: Cualquier otra información relevante o comentarios adicionales.
- schedule_suggestion: Si menciona "mañana a las 8", calcula la fecha (asume hoy={datetime.date.today()}).

Responde ÚNICAMENTE con el JSON.
"""

        try:
            # Vertex AI expects [prompt, part1, part2]
            # GenAI expects [prompt, part1, part2] too usually
            response = self.model.generate_content([context_prompt, *parts])
            
            # Clean response
            text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception as e:
            print(f"Error parsing voice order: {e}")
            return {"error": str(e)}

voice_service = VoiceService()
