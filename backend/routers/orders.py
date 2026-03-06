import json
import logging
import asyncio
from datetime import datetime, date
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks, UploadFile, File
from database import db
from dependencies import get_current_admin, get_current_user

router = APIRouter(prefix="/api/v1", tags=["Orders"])
def log_audit(*args, **kwargs): pass

from services.odoo_service import odoo_client
try:
    from services.excel_service import excel_service
except:
    excel_service = None

from pydantic import BaseModel
class OrderStatusUpdate(BaseModel):
    status: str
    truck_id: str = None
    priority: int = None
    observation: str = None
    driver_id: str = None
class AssignmentData(BaseModel):
    truck_id: str
    driver_id: str = None
    priority: int = 1
    scheduled_start: str = None
class CreateOrderRequest(BaseModel):
    client_id: str
    origin_address: str
    destination_address: str
    date: str
    status: str = "PENDING"
    start_time: str = None
    volume: str = None
    materials: str = None
    notes: str = None
    truck_id: str = None


