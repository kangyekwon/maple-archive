"""Namu Wiki HTML parser for Korean MapleStory data"""

import logging
from bs4 import BeautifulSoup
from .base import BaseCrawler
from config import NAMU_BASE_URL

logger = logging.getLogger(__name__)


class NamuCrawler(BaseCrawler):
    def __init__(self):
        super().__init__(delay=2.0)
        self.base_url = NAMU_BASE_URL

    def get_page(self, title: str):
        url = f"{self.base_url}/w/{title}"
        try:
            resp = self.get(url, headers={"Accept": "text/html"})
            soup = BeautifulSoup(resp.text, "html.parser")
            article = soup.find("article") or soup.find("div", class_="wiki-paragraph")
            if not article:
                return None

            text = article.get_text(separator="\n", strip=True)
            first_para = text.split("\n")[0] if text else ""

            return {
                "title": title,
                "text": text[:2000],
                "summary": first_para[:500],
            }
        except Exception as e:
            logger.warning(f"Failed to fetch namu page {title}: {e}")
            return None

    def crawl_character_korean_names(self, character_names: list):
        results = {}
        for name in character_names:
            search_term = f"메이플스토리/{name}"
            page = self.get_page(search_term)
            if page:
                results[name] = {
                    "summary_ko": page["summary"],
                    "full_text": page["text"],
                }
        return results

    def crawl_job_details(self, job_names: list):
        results = {}
        for name in job_names:
            search_term = f"메이플스토리/{name}"
            page = self.get_page(search_term)
            if page:
                results[name] = {
                    "description_ko": page["summary"],
                    "lore_ko": page["text"][:1000],
                }
        return results
