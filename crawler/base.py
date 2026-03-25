"""Crawler base class with session, rate limiting, retries, and exponential backoff"""

import time
import logging

import requests

from config import (
    CRAWL_DELAY, MAX_RETRIES, RETRY_BACKOFF,
    DEFAULT_HEADERS,
)

logger = logging.getLogger(__name__)


class BaseCrawler:
    def __init__(self, delay: float = CRAWL_DELAY):
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self._last_request_time = 0.0

    def _rate_limit(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self.delay:
            wait = self.delay - elapsed
            logger.debug(f"Rate limit: {wait:.1f}s wait")
            time.sleep(wait)

    def get(self, url: str, params: dict = None,
            headers: dict = None, timeout: int = 30) -> requests.Response:
        self._rate_limit()

        merged_headers = dict(self.session.headers)
        if headers:
            merged_headers.update(headers)

        for attempt in range(MAX_RETRIES):
            try:
                self._last_request_time = time.time()
                resp = self.session.get(
                    url, params=params, headers=merged_headers, timeout=timeout
                )

                if resp.status_code == 404:
                    # 404 means page/resource doesn't exist - no point retrying
                    resp.raise_for_status()

                if resp.status_code == 429:
                    wait = RETRY_BACKOFF * (2 ** attempt)
                    logger.warning(f"429 Rate Limited. Waiting {wait:.0f}s...")
                    time.sleep(wait)
                    continue

                if resp.status_code == 403:
                    wait = RETRY_BACKOFF * (2 ** attempt)
                    logger.warning(f"403 Forbidden. Waiting {wait:.0f}s...")
                    time.sleep(wait)
                    continue

                if resp.status_code == 503:
                    wait = RETRY_BACKOFF * (2 ** attempt)
                    logger.warning(f"503 Service Unavailable. Waiting {wait:.0f}s...")
                    time.sleep(wait)
                    continue

                resp.raise_for_status()
                return resp

            except requests.RequestException as e:
                if attempt == MAX_RETRIES - 1:
                    logger.error(f"Request failed ({MAX_RETRIES} attempts): {url} - {e}")
                    raise
                wait = RETRY_BACKOFF * (2 ** attempt)
                logger.warning(f"Request error, retry in {wait:.0f}s ({attempt+1}/{MAX_RETRIES}): {e}")
                time.sleep(wait)

    def get_json(self, url: str, params: dict = None) -> dict:
        resp = self.get(url, params=params)
        return resp.json()

    def close(self):
        self.session.close()
