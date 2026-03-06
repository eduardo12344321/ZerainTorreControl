import sys
import os

print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")

try:
    import google.generativeai as genai
    print(f"SUCCESS: google-generativeai version {genai.__version__} imported correctly.")
except ImportError as e:
    print(f"ERROR: Could not import google.generativeai. {e}")
    print("sys.path is:")
    for p in sys.path:
        print(f"  - {p}")
except Exception as e:
    print(f"ERROR: Unexpected error importing google.generativeai. {e}")
