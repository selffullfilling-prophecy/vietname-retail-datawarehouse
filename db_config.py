import os
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("POSTGRES_DB")
DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_SCHEMA = os.getenv("POSTGRES_SCHEMA", "dw")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("Thiếu DATABASE_URL trong .env")

SAFE_DATABASE_URL = f"postgresql://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}"