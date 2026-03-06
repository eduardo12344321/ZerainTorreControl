import uvicorn
import os
import sys

# Ensure backend dir is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print(f"🚀 Starting Zerain Backend with Python: {sys.executable}")
    
    # Pre-check imports
    try:
        import google.generativeai
        print("✅ google.generativeai found.")
    except ImportError as e:
        print(f"❌ ERROR: google.generativeai NOT found: {e}")
        print("Installing it now...")
        os.system(f"{sys.executable} -m pip install google-generativeai")
        import google.generativeai
        print("✅ google.generativeai installed and loaded.")

    # Run Uvicorn programmatically
    # This avoids CLI environment issues
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
