import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dct_crm")
JWT_SECRET = os.getenv("JWT_SECRET", "dct-crm-jwt-secret-key-2024")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:3001")
