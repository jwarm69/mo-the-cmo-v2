"""Configuration — loads DATABASE_URL from mo-the-cmo-v2/.env.local."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Walk up to find .env.local in the project root
# __file__ is competitor_scraper/config.py inside scripts/competitor-scraper/
_project_root = Path(__file__).resolve().parent.parent.parent.parent
_env_file = _project_root / ".env.local"
if _env_file.exists():
    load_dotenv(_env_file)

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise RuntimeError(
        f"DATABASE_URL not set. Expected in {_env_file} or environment."
    )

# Scraping defaults
MAX_CONTENT_LENGTH = 15_000
FETCH_TIMEOUT_S = 30
STALE_DAYS_DEFAULT = 7
