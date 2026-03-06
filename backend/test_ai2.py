import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents='¿A qué se dedica Acristalamientos Olarizu en Vitoria? Dime si está extinta.',
    config=types.GenerateContentConfig(
        tools=[{"google_search": {}}],
        temperature=0.0
    )
)
print("Resposta:\n", response.text)
