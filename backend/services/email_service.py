from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import os.path
import pickle
import base64

# Scopes needed for Gmail
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

class EmailService:
    def __init__(self):
        self.creds = None
        self.token_path = 'token.pickle'
        # This file MUST serve as OAuth 2.0 Client ID (not Service Account)
        # Download it from GCP > Credentials > OAuth 2.0 Client IDs
        self.credentials_path = 'credentials.json' 

    def authenticate(self):
        """Shows basic usage of the Gmail API.
        Lists the user's Gmail labels.
        """
        creds = None
        # The file token.pickle stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                creds = pickle.load(token)
        
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open(self.token_path, 'wb') as token:
                pickle.dump(creds, token)

        self.creds = creds
        return build('gmail', 'v1', credentials=creds)

    def get_messages(self, max_results=20):
        try:
            service = self.authenticate()
            results = service.users().messages().list(userId='me', maxResults=max_results).execute()
            messages = results.get('messages', [])

            final_messages = []
            if not messages:
                print('No messages found.')
            else:
                for message in messages:
                    msg = service.users().messages().get(userId='me', id=message['id']).execute()
                    
                    # Extract headers
                    headers = msg['payload']['headers']
                    subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '(No Subject)')
                    sender = next((h['value'] for h in headers if h['name'] == 'From'), '(Unknown)')
                    date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                    
                    snippet = msg.get('snippet', '')
                    
                    final_messages.append({
                        'id': message['id'],
                        'subject': subject,
                        'sender': sender,
                        'date': date,
                        'snippet': snippet
                    })
                    
            return final_messages

        except Exception as e:
            print(f"An error occurred: {e}")
            return []

email_service = EmailService()
