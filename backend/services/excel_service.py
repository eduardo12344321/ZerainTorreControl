import pandas as pd
from database import db
from datetime import datetime
import os
from .drive_service import drive_service

class ExcelService:
    def __init__(self):
        self.output_dir = "temp_exports"
        os.makedirs(self.output_dir, exist_ok=True)

    def _get_all_orders(self):
        with db.get_cursor() as c:
            c.execute("SELECT * FROM orders")
            rows = c.fetchall()
        return [dict(row) for row in rows]

    def _map_to_synergy(self, orders):
        """
        Maps orders to the specific Synergy import format.
        Columns based on standard transport ERP requirments and user feedback.
        """
        synergy_data = []
        for o in orders:
            # Logic to determining cost/price text
            # Assuming 'description' contains service info
            
            row = {
                "Fecha Inicio": o.get('scheduled_start', '').split(' ')[0] if o.get('scheduled_start') else '',
                "Cuenta": o.get('client_name', ''),
                "Descripción": o.get('description', ''),
                "Persona": o.get('driver_name', '') or o.get('driver_id', ''), # Resolving name if possible
                "Matrícula": o.get('truck_id', ''), # Should be plate, but ID used for now. TODO: Join with trucks
                "Libr. Texto 6": "", # Placeholder as requested
                # Add more columns as per "esstas columnas tal cual" (Image not visible, using best guess for safe default)
                "Destino": o.get('destination_address', ''),
                "Origen": o.get('origin_address', '')
            }
            synergy_data.append(row)
        return pd.DataFrame(synergy_data)

    def _map_to_full_csv(self, orders):
        return pd.DataFrame(orders)

    def sync_orders_to_drive(self):
        print("🔄 Starting Excel Sync to Drive...")
        orders = self._get_all_orders()
        if not orders:
            print("No orders to sync.")
            return

        # 1. Synergy Excel
        try:
            df_synergy = self._map_to_synergy(orders)
            synergy_filename = f"Synergy_Export_{datetime.now().strftime('%Y_%m')}.xlsx"
            synergy_path = os.path.join(self.output_dir, synergy_filename)
            df_synergy.to_excel(synergy_path, index=False)
        except Exception as e:
            print(f"Error generating Synergy Excel: {e}")
            synergy_path = None

        # 2. Full CSV
        try:
            df_full = self._map_to_full_csv(orders)
            full_filename = f"Full_Backup_{datetime.now().strftime('%Y_%m_%d')}.csv"
            full_path = os.path.join(self.output_dir, full_filename)
            df_full.to_csv(full_path, index=False)
        except Exception as e:
            print(f"Error generating Full CSV: {e}")
            full_path = None

        # Upload to Drive
        # Folder Structure: Respaldo / Año / Mes
        now = datetime.now()
        folder_path = ["Respaldo_Pedidos", str(now.year), now.strftime('%B')] # e.g. February
        
        try:
            parent_id = drive_service.find_or_create_path(folder_path)
            
            if synergy_path and os.path.exists(synergy_path):
                drive_service.upload_file(synergy_path, synergy_filename, parent_id)
                
            if full_path and os.path.exists(full_path):
                drive_service.upload_file(full_path, full_filename, parent_id)
                
            print("✅ Excel Sync to Drive completed successfully.")
        except Exception as e:
            print(f"❌ Error uploading to Drive: {e}")

excel_service = ExcelService()
