from logging.config import fileConfig
import os
from dotenv import load_dotenv

from sqlalchemy import engine_from_config, pool
from alembic import context

# -------------------------------------------------
# Alembic Config
# -------------------------------------------------
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# -------------------------------------------------
# Load ENV (same .env your app uses)
# -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # app/
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH)

POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")

if not all(
    [POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB]
):
    raise RuntimeError("Postgres environment variables not loaded for Alembic")

# -------------------------------------------------
# Alembic MUST use SYNC driver
# -------------------------------------------------
DATABASE_URL = (
    f"postgresql://{POSTGRES_USER}:"
    f"{POSTGRES_PASSWORD}@"
    f"{POSTGRES_HOST}:"
    f"{POSTGRES_PORT}/"
    f"{POSTGRES_DB}"
)

config.set_main_option(
    "sqlalchemy.url",
    DATABASE_URL.replace("%", "%%")
)


# -------------------------------------------------
# Import Base + ALL models (CRITICAL)
# -------------------------------------------------
from db.postgres import Base

# 🔑 Auth
from auth.models import User

# 🔑 Posts & Social
from posts.models import Post
from posts.models import PostLike, PostSave, PostComment

# 🔑 Social graph
from social.models import UserFollow

# 🔑 Itinerary
from itinerary.models import Itinerary, ItineraryPlace

# 🔑 Places
from places.models import Place

# -------------------------------------------------
# Metadata for autogenerate
# -------------------------------------------------
target_metadata = Base.metadata


# -------------------------------------------------
# Offline migrations
# -------------------------------------------------
def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# -------------------------------------------------
# Online migrations
# -------------------------------------------------
def run_migrations_online() -> None:
    connectable = engine_from_config(
        {
            "sqlalchemy.url": DATABASE_URL
        },
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# -------------------------------------------------
# Entrypoint
# -------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
