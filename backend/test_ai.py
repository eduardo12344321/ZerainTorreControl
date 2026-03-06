import os
from dotenv import load_dotenv

# Force load .env from backend explicitly
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

print("API KEY:", bool(os.getenv("GEMINI_API_KEY")))

from services.enrichment_service import enrichment_service

print(enrichment_service.enrich_company_deep('ACRISTALAMIENTOS OLARIZU, S.L.', 'Vitoria-Gasteiz', '', {}))
