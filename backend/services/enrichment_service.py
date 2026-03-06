import google.generativeai as genai
import logging
import json
import os

logger = logging.getLogger(__name__)

class EnrichmentService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-2.0-flash"
        self.model = None
        
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                logger.info(f"Gemini AI (Legacy SDK) Initialized with API Key")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini API: {e}")
        else:
            logger.warning("GEMINI_API_KEY not found in environment")

    def enrich_company_info(self, name: str, city: str = "", web: str = "") -> str:
        """Simple version for backward compatibility"""
        res = self.enrich_company_deep(name, city, web)
        if isinstance(res, dict):
            return f"{res.get('activity', '')} | {res.get('how_to_help', '')} | Fiabilidad: {res.get('reliability_score', '?')}/10"
        return str(res)

    def enrich_company_deep(self, name: str, city: str = "", web: str = "", current_data: dict = None) -> dict:
        """
        Comprehensive AI enrichment. Returns JSON with activity, help, contact, and risk.
        """
        if not self.model:
            return {"error": "AI Unavailable"}

        phone_str = current_data.get('phone', '') if current_data else ''
        email_str = current_data.get('email', '') if current_data else ''

        default_prompt = """Actúa como un experto en inteligencia de negocios para una empresa de Grúas y Transportes Especiales (Zerain) en España.
Analiza esta empresa para determinar su potencial como cliente:

Nombre: {name}
Ubicación: {city}
Web: {web}
Teléfono Actual: {phone_str}
Email Actual: {email_str}

TAREAS:
1. Identifica su actividad principal (Construcción, Renovables, Industria, Obra Pública, etc.).
2. Caso de Uso: ¿Para qué necesitan grúas o transporte pesado exactamente? (ej: "Montaje de estructuras metálicas").
3. Datos Financieros Estimados: Estima el número de trabajadores y la facturación anual aproximada.
4. Estado de la Empresa (ACTIVA o EXTINGUIDA): Busca activamente información sobre el nombre de la empresa junto a palabras como "concurso de acreedores", "disolución", "liquidación", "extinguida" o "BOE". Si hay evidencia de cierre, el estado DEBE ser "Extinguida".
5. Evaluación de Riesgo/Fiabilidad (1 a 10): 
   - Si la empresa está "Extinguida", en liquidación o inactiva, la nota DEBE ser estrictamente 1.
   - Si está Activa, evalúa su solidez (años en el mercado, tamaño, etc).
   - JUSTIFICA detalladamente la nota.
6. Investigación de Contacto y Ubicación: Busca el NIF/CIF, teléfono, email, Ciudad, Provincia y Código Postal si no están presentes o parecen incorrectos.
7. Etiquetado Sectorial: Genera una lista de 3 a 5 "etiquetas" cortas (ej: "Estructuras Metálicas").

IMPORTANTE: Responde SIEMPRE en ESPAÑOL.

FORMATO DE SALIDA (JSON ESTRICTO):
- activity: string (máximo 10 palabras)
- how_to_help: string (máximo 1 oración)
- employees: string (ej: "20-50 empleados" o "Más de 500")
- revenue: string (ej: "1M€ - 5M€" o "Desconocido")
- reliability_score: integer (1-10)
- reliability_justification: string (justificación detallada de la nota)
- suggested_phone: string (null si no lo encuentras)
- suggested_email: string (null si no lo encuentras)
- suggested_company_status: string (Solo "Activa" o "Extinguida", null si no estás seguro)
- suggested_nif: string (NIF/CIF de España CON PREFIJO 'ES', ej: 'ESB12345678', null si no lo encuentras)
- suggested_city: string (Ciudad/Municipio, null si no lo encuentras)
- suggested_zip: string (Código Postal, null si no lo encuentras)
- suggested_province: string (Provincia, null si no lo encuentras)
- suggested_country: string (País, ej: "España", null si no lo encuentras)
- suggested_tags: array of strings (ej: ["Prefabricados", "Montaje Industrial"])

Devuelve SOLO el bloque JSON."""
        
        prompt = default_prompt.format(
            name=name, city=city, web=web, 
            phone_str=phone_str, email_str=email_str
        )

        raw_text = None
        try:
            # Use generate_content from legacy SDK
            response = self.model.generate_content(prompt)
            raw_text = response.text.strip()
            
            # Remove markdown syntax if present
            raw_text = raw_text.replace("```json", "").replace("```JSON", "").replace("```", "").strip()
            
            # Extract only the JSON object part
            start_idx = raw_text.find('{')
            end_idx = raw_text.rfind('}')
            
            if start_idx != -1 and end_idx != -1:
                raw_text = raw_text[start_idx:end_idx+1]
            
            return json.loads(raw_text)
        except Exception as e:
            logger.error(f"Deep enrichment error for {name}: {e}")
            if raw_text is not None:
                print(f">>> RAW AI OUTPUT for {name} BEFORE PARSE ERROR <<<\n{raw_text}\n>>> END RAW OUTPUT <<<")
            return {
                "error": str(e),
                "activity": "Error en análisis",
                "how_to_help": "No se pudo procesar",
                "reliability_score": 1,
                "risk_notes": f"Fallo técnico: {str(e)}"
            }

enrichment_service = EnrichmentService()
