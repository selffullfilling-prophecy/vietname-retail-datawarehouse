import os
from dotenv import load_dotenv

load_dotenv(override=True)

DB_HOST = os.getenv("MSSQL_HOST", "localhost")
DB_PORT = os.getenv("MSSQL_PORT", "1433")
DB_NAME = os.getenv("MSSQL_DB", "datawarehouse")
DB_SCHEMA = os.getenv("MSSQL_SCHEMA", "dw")
DB_USER = "sa"
DB_PASSWORD = os.getenv("SA_PASSWORD")
DB_DRIVER = os.getenv("MSSQL_DRIVER", "ODBC Driver 18 for SQL Server")

if not DB_PASSWORD:
    raise RuntimeError("Thieu SA_PASSWORD trong .env")

CONNECTION_STRING = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_HOST},{DB_PORT};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
    f"TrustServerCertificate=yes;"
)

MASTER_CONNECTION_STRING = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_HOST},{DB_PORT};"
    f"DATABASE=master;"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
    f"TrustServerCertificate=yes;"
)

SAFE_DATABASE_URL = f"mssql://sa:***@{DB_HOST}:{DB_PORT}/{DB_NAME}"
