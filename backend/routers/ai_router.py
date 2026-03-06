from fastapi import APIRouter, UploadFile, File, HTTPException
from services.vision_service import vision_service
from services.voice_service import voice_service
from typing import Dict, Any

router = APIRouter(prefix="/ai", tags=["IA & Automation"])

@router.post("/ocr/receipt")
async def process_receipt(file: UploadFile = File(...)):
    """Processes an expense receipt."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    result = vision_service.process_receipt(contents, file.content_type)
    return result

@router.post("/ocr/delivery-note")
async def process_delivery_note(file: UploadFile = File(...)):
    """Processes a logistical delivery note (albarán)."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    result = vision_service.process_delivery_note(contents, file.content_type)
    return result

@router.post("/voice/parse-order")
async def parse_order(file: UploadFile = File(...)):
    """Parses an audio file into a structured transport order."""
    # Gemini 1.5 Flash supports many audio types, but web usually sends opus/webm or mp3
    contents = await file.read()
    result = voice_service.parse_order_audio(contents, file.content_type or "audio/mpeg")
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

@router.post("/voice/parse-text")
async def parse_order_text(payload: Dict[str, str]):
    """Parses a text description into a structured transport order."""
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    result = voice_service.parse_order_text(text)
    return result
