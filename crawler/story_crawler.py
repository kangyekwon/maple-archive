"""Story narrative aggregation crawler - combines Fandom + Namu data"""

import logging
from .fandom_crawler import FandomCrawler
from .namu_crawler import NamuCrawler

logger = logging.getLogger(__name__)


class StoryCrawler:
    def __init__(self):
        self.fandom = FandomCrawler()
        self.namu = NamuCrawler()

    def crawl_story_arc(self, arc_name: str, arc_name_ko: str = ""):
        result = {
            "name": arc_name,
            "description_en": "",
            "description_ko": "",
            "key_events": [],
        }

        fandom_data = self.fandom.get_page_content(arc_name)
        if fandom_data:
            result["description_en"] = fandom_data["extract"]

        if arc_name_ko:
            namu_data = self.namu.get_page(f"메이플스토리/{arc_name_ko}")
            if namu_data:
                result["description_ko"] = namu_data["summary"]

        return result

    def crawl_all_story_arcs(self, arcs: list):
        results = []
        for arc in arcs:
            try:
                data = self.crawl_story_arc(arc["name"], arc.get("name_ko", ""))
                results.append(data)
            except Exception as e:
                logger.warning(f"Failed to crawl story arc {arc['name']}: {e}")
        return results

    def crawl_character_story(self, char_name: str, char_name_ko: str = ""):
        result = {
            "name": char_name,
            "backstory_en": "",
            "backstory_ko": "",
        }

        fandom_data = self.fandom.get_page_content(char_name)
        if fandom_data:
            result["backstory_en"] = fandom_data["extract"]

        if char_name_ko:
            namu_data = self.namu.get_page(f"메이플스토리/{char_name_ko}")
            if namu_data:
                result["backstory_ko"] = namu_data["summary"]

        return result

    def close(self):
        self.fandom.close()
        self.namu.close()
