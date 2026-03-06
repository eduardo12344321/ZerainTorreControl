from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional

try:
    from services.vision_service import vision_service
except Exception as e:
    print(f"⚠️ Warning: Vision Service unavailable: {e}")
    class DummyVisionService:
        def process_receipt(self, *args, **kwargs): return {"error": "Service Unavailable"}
    vision_service = DummyVisionService()

try:
    from services.voice_service import voice_service
except Exception as e:
    print(f"⚠️ Warning: Voice Service unavailable: {e}")
    class DummyVoiceService:
        def parse_order_description(self, *args, **kwargs): return {"error": "Service Unavailable"}
    voice_service = DummyVoiceService()

router = APIRouter(prefix="/api/v1", tags=["AI Integration"])

@router.post("/ocr/receipt")
async def extract_receipt_data(file: UploadFile = File(...)):
    """
    Endpoint to process a receipt image using Vertex AI.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        content = await file.read()
        data = vision_service.process_receipt(content, mime_type=file.content_type)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@router.post("/ai/parse-order")
async def parse_order_voice(data: dict):
    """
    Endpoint to process a natural language order description.
    """
    text = data.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")
    
    try:
        parsed_data = voice_service.parse_order_description(text)
        return parsed_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
