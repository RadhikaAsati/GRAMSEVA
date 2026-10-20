
import os


class Settings:
    PROJECT_NAME = "GRAMSEVA"
    API_VERSION = "1.0.0"

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://localhost/gramseva",
    )


settings = Settings()
