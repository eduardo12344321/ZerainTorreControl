import os
import os.path
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ['https://www.googleapis.com/auth/drive']
CREDS_FILE = 'torre-control-zerain-e89331561af3.json' # Expecting this in backend root or config folder

class DriveService:
    def __init__(self):
        self.creds = None
        self.service = None
        self._authenticate()

    def _authenticate(self):
        if os.path.exists(CREDS_FILE):
            self.creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
        else:
            print(f"⚠️ Warning: Drive Credentials file '{CREDS_FILE}' not found. Drive sync will fail.")
            return

        try:
            self.service = build('drive', 'v3', credentials=self.creds)
        except Exception as e:
            print(f"❌ Error building Drive Service: {e}")

    def find_folder(self, folder_name, parent_id=None):
        if not self.service: return None
        
        query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
        if parent_id:
            query += f" and '{parent_id}' in parents"
            
        try:
            results = self.service.files().list(q=query, fields="files(id, name)").execute()
            files = results.get('files', [])
            if files:
                return files[0]['id']
            return None
        except Exception as e:
            print(f"Error searching folder {folder_name}: {e}")
            return None

    def create_folder(self, folder_name, parent_id=None):
        if not self.service: return None
        
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        if parent_id:
            file_metadata['parents'] = [parent_id]
            
        try:
            file = self.service.files().create(body=file_metadata, fields='id').execute()
            print(f"Created folder {folder_name} (ID: {file.get('id')})")
            return file.get('id')
        except Exception as e:
            print(f"Error creating folder {folder_name}: {e}")
            return None
            
    def find_or_create_path(self, path_parts):
        """
        Navigates or creates a folder hierarchy.
        path_parts: ['Respaldo', '2026', 'Febrero']
        """
        parent_id = None # Root
        
        for folder_name in path_parts:
            folder_id = self.find_folder(folder_name, parent_id)
            if not folder_id:
                folder_id = self.create_folder(folder_name, parent_id)
            parent_id = folder_id
            
        return parent_id

    def upload_file(self, local_path, filename, parent_id=None):
        if not self.service: return None
        
        # Check if file exists to update it instead of creating duplicate
        query = f"name='{filename}' and trashed=false"
        if parent_id:
            query += f" and '{parent_id}' in parents"
            
        existing_file_id = None
        try:
            results = self.service.files().list(q=query, fields="files(id)").execute()
            files = results.get('files', [])
            if files:
                existing_file_id = files[0]['id']
        except:
            pass
            
        file_metadata = {'name': filename}
        if parent_id and not existing_file_id:
            file_metadata['parents'] = [parent_id]
            
        media = MediaFileUpload(local_path, resumable=True)
        
        try:
            if existing_file_id:
                # Update
                file = self.service.files().update(
                    fileId=existing_file_id,
                    media_body=media,
                    fields='id'
                ).execute()
                print(f"Updated file {filename} (ID: {file.get('id')})")
            else:
                # Create
                file = self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
                print(f"Uploaded file {filename} (ID: {file.get('id')})")
            return file.get('id')
        except Exception as e:
            print(f"Error uploading file {filename}: {e}")
            return None

drive_service = DriveService()
