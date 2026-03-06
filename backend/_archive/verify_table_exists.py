from services.delivery_note_service import delivery_note_service

def verify_table():
    try:
        notes = delivery_note_service.get_all_notes()
        print(f"✅ Successfully fetched {len(notes)} notes. Table exists and is working.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_table()
