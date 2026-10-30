import os
import sys

database_url = os.getenv("DATABASE_URL")

if not database_url:
    sys.exit(
        "ERROR: DATABASE_URL must be set. "
        "Refusing to use the local default database."
    )

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from backend.database import Base, engine
from backend.app import models  # Register all application models

config = Config("alembic.ini")
config.set_main_option("script_location", "alembic_setup")

tables = set(inspect(engine).get_table_names())
app_tables = tables - {"alembic_version"}

if not app_tables and "alembic_version" not in tables:
    print("Empty database detected. Creating the current schema...")
    Base.metadata.create_all(bind=engine)
    command.stamp(config, "head")
    print("Fresh database initialized and stamped at Alembic head.")

elif not app_tables:
    sys.exit(
        "ERROR: alembic_version exists but application tables are missing. "
        "Inspect the database before proceeding."
    )

elif "alembic_version" not in tables:
    sys.exit(
        "ERROR: Application tables exist without alembic_version. "
        "Refusing to modify a potentially initialized database."
    )

else:
    print("Existing initialized database detected. Applying migrations...")
    command.upgrade(config, "head")
    print("Database migrations completed.")

engine.dispose()
