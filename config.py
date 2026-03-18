"""MapleStory Archive configuration with environment variable support"""

import os
from dotenv import load_dotenv

load_dotenv()

# === Data Sources ===
FANDOM_BASE_URL = "https://maplestory.fandom.com/api.php"
NAMU_BASE_URL = "https://namu.wiki"
MAPLESTORY_IO_BASE_URL = "https://maplestory.io/api"

# === Rate limiting ===
CRAWL_DELAY = float(os.getenv("CRAWL_DELAY", "1.0"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
RETRY_BACKOFF = float(os.getenv("RETRY_BACKOFF", "5.0"))

# === Database ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.getenv("DB_PATH", os.path.join(DATA_DIR, "maple.db"))

# === Server ===
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8005"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# === Headers ===
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json",
}

# === Gemini AI ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "imagen-3.0-generate-002")
