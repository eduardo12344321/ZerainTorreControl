import os
import json
import base64
from typing import Optional, Dict, Any
try:
    import vertexai
    from vertexai.generative_models import GenerativeModel, Part, GenerationConfig
except ImportError:
    vertexai = None
    GenerativeModel = None
    Part = None
    GenerationConfig = None
from dotenv import load_dotenv

load_dotenv()

class VisionService:
    def __init__(self):
        project_id = os.getenv("GCP_PROJECT_ID")
        location = os.getenv("GCP_LOCATION", "europe-west1")
        credentials_path = os.getenv("PATH_TO_GCP_JSON")

        if credentials_path:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        if project_id and vertexai:
            print(f"Initializing Vertex AI in project {project_id}...")
            vertexai.init(project=project_id, location=location)
            self.model = GenerativeModel("gemini-1.5-flash")
        else:
            self.model = None
            if vertexai is None:
                print("WARNING: Vertex AI libraries not installed. VisionService in mock mode.")
            else:
                print("WARNING: GCP_PROJECT_ID not found in .env. VisionService in mock mode.")

    def process_receipt(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Processes a receipt image using Gemini 1.5 Flash and returns structured JSON.
        """
        if not self.model:
            print("VisionService: Model not initialized (mock mode).")
            return self._get_mock_response()

        from database import db
        default_prompt = """Analyze this receipt and extract the following information in JSON format:
- type: One of ["FUEL", "DIET", "PARKING", "OTHER"]
- amount: The total amount as a float.
- description: A brief summary of the expense.
- date: The date of the receipt in YYYY-MM-DD format.
- merchant: The name of the merchant/store.

JSON structure:
{
  "type": "...",
  "amount": 0.0,
  "description": "...",
  "date": "...",
  "merchant": "..."
}"""
        prompt = db.get_ai_prompt('vision_receipt', default_prompt)
        return self._call_gemini(image_bytes, mime_type, prompt)

    def process_delivery_note(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Processes a delivery note (albarán) and extracts logistical data.
        """
        if not self.model:
            return {
                "client_name": "Mock Client",
                "load_weight": 1000.0,
                "origin_address": "Mock Origin",
                "destination_address": "Mock Destination",
                "is_mock": True
            }

        from database import db
        default_prompt = """Eres un experto en logística de Zerain. Analiza este albarán (delivery note) y extrae:
- client_name: Nombre de la empresa cliente.
- load_weight: El peso total de la carga en KG (solo el número, como float).
- origin_address: La dirección de origen/carga si aparece.
- destination_address: La dirección de destino/entrega.
- delivery_note_number: El número o ID del albarán.
- description: Breve descripción de la mercancía.

Responde ÚNICAMENTE con el objeto JSON puro. Estructura:
{
  "client_name": "...",
  "load_weight": 0.0,
  "origin_address": "...",
  "destination_address": "...",
  "delivery_note_number": "...",
  "description": "..."
}"""
        prompt = db.get_ai_prompt('vision_delivery_note', default_prompt)
        return self._call_gemini(image_bytes, mime_type, prompt)

    def _call_gemini(self, image_bytes: bytes, mime_type: str, prompt: str) -> Dict[str, Any]:
        image_part = Part.from_data(data=image_bytes, mime_type=mime_type)
        try:
            print(f"Calling Gemini Flash via Vertex AI...")
            response = self.model.generate_content(
                [image_part, prompt],
                generation_config=GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            # Track usage
            try:
                from database import db
                with db.get_cursor() as c:
                    c.execute("INSERT INTO gcp_usage (service, request_type, cost_est) VALUES (?, ?, ?)", 
                             ('VERTEX_OCR', 'Gemini 1.5 Flash', 0.001))
            except: pass

            return json.loads(response.text)
        except Exception as e:
            print(f"ERROR calling Gemini: {str(e)}")
            return self._get_mock_response()

    def _get_mock_response(self) -> Dict[str, Any]:
        """Fallback mock response for development."""
        return {
            "type": "OTHER",
            "amount": 0.0,
            "description": "Error in AI extraction or service not configured",
            "date": "2026-01-01",
            "merchant": "Unknown",
            "error": True
        }

# Singleton instance
vision_service = VisionService()
