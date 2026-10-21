
import os
from pathlib import Path
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")


class Settings:
    PROJECT_NAME = "GRAMSEVA"
    API_VERSION = "1.0.0"

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://localhost/gramseva",
    )

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_MINUTES = 30


settings = Settings()
