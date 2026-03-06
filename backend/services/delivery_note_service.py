from database import db
import uuid
import json

class DeliveryNoteService:
    def create_note(self, note_data: dict, user_id=None):
        note_id = str(uuid.uuid4())
        
        # Ensure JSON lists are serialized
        complements = json.dumps(note_data.get('complements', []))
        billing_items = json.dumps(note_data.get('billing_items', []))
        
        with db.get_cursor() as c:
            c.execute("""
                INSERT INTO delivery_notes (
                    id, albaran_number, order_id, date, driver_name, vehicle_plate,
                    client_name, client_code, client_address,
                    shipper_name, shipper_address, loading_date,
                    consignee_name, consignee_address, unloading_date,
                    service_concept, merchandise, weight_kg, length_m,
                    vehicle_type, complements, crane_height, load_capacity,
                    start_time, arrival_time, departure_time, end_time, total_hours,
                    observations, billing_items, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                note_id,
                note_data.get('albaran_number'),
                note_data.get('order_id'),
                note_data.get('date'),
                note_data.get('driver_name'),
                note_data.get('vehicle_plate'),
                note_data.get('client_name'),
                note_data.get('client_code'),
                note_data.get('client_address'),
                note_data.get('shipper_name'),
                note_data.get('shipper_address'),
                note_data.get('loading_date'),
                note_data.get('consignee_name'),
                note_data.get('consignee_address'),
                note_data.get('unloading_date'),
                note_data.get('service_concept'),
                note_data.get('merchandise'),
                note_data.get('weight_kg', 0),
                note_data.get('length_m', 0),
                note_data.get('vehicle_type'),
                complements,
                note_data.get('crane_height'),
                note_data.get('load_capacity'),
                note_data.get('start_time'),
                note_data.get('arrival_time'),
                note_data.get('departure_time'),
                note_data.get('end_time'),
                note_data.get('total_hours', 0),
                note_data.get('observations', ''),
                billing_items,
                note_data.get('status', 'draft')
            ))
            
        return self.get_note_by_id(note_id)

    def get_all_notes(self):
        with db.get_cursor() as c:
            c.execute("""
                SELECT * FROM delivery_notes 
                ORDER BY created_at DESC
            """)
            rows = c.fetchall()
            
        return [self._row_to_dict(row) for row in rows]

    def get_note_by_id(self, note_id):
        with db.get_cursor() as c:
            c.execute("SELECT * FROM delivery_notes WHERE id = ?", (note_id,))
            row = c.fetchone()
            
        if row:
            return self._row_to_dict(row)
        return None
        
    def update_note(self, note_id, update_data: dict):
        # Build dynamic update query
        allowed_keys = [
            'albaran_number', 'order_id', 'date', 'driver_name', 'vehicle_plate',
            'client_name', 'client_code', 'client_address', 'shipper_name', 'shipper_address', 'loading_date',
            'consignee_name', 'consignee_address', 'unloading_date', 'service_concept', 'merchandise',
            'weight_kg', 'length_m', 'vehicle_type', 'complements', 'crane_height', 'load_capacity',
            'start_time', 'arrival_time', 'departure_time', 'end_time', 'total_hours', 'observations',
            'billing_items', 'status'
        ]
        
        updates = []
        values = []
        
        for key, value in update_data.items():
            if key in allowed_keys:
                if key in ['complements', 'billing_items'] and isinstance(value, (list, dict)):
                    value = json.dumps(value)
                updates.append(f"{key} = ?")
                values.append(value)
                
        if not updates:
            return None
            
        values.append(note_id)
        
        query = f"UPDATE delivery_notes SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        
        with db.get_cursor() as c:
            c.execute(query, values)
            
        return self.get_note_by_id(note_id)

    def _row_to_dict(self, row):
        d = dict(row)
        # Parse JSON fields
        try:
            d['complements'] = json.loads(d['complements']) if d.get('complements') else []
        except:
            d['complements'] = []
            
        try:
            d['billing_items'] = json.loads(d['billing_items']) if d.get('billing_items') else []
        except:
            d['billing_items'] = []
            
        return d

delivery_note_service = DeliveryNoteService()
