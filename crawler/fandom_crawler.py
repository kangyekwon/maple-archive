"""Fandom Wiki MediaWiki API crawler for MapleStory data"""

import json
import logging

from .base import BaseCrawler
from config import FANDOM_BASE_URL

logger = logging.getLogger(__name__)

CATEGORIES_TO_CRAWL = [
    ("Classes", "Classes"),
    ("Bosses", "Bosses"),
    ("Characters", "Characters"),
    ("Explorer_Skills", "Explorer Skills"),
    ("Cygnus_Knight_Skills", "Cygnus Knight Skills"),
    ("Hero_Skills", "Hero Skills"),
    ("Resistance_Skills", "Resistance Skills"),
    ("Equipment_Sets", "Equipment Sets"),
    ("Boss_Reward_Equipment", "Boss Reward Equipment"),
    ("Party_Quests", "Party Quests"),
    ("Cross_World_Party_Quests", "Cross World Party Quests"),
    ("Heroes_of_Maple", "Heroes of Maple"),
    ("Arcane_River_NPCs", "Arcane River NPCs"),
    ("Event_Quests", "Event Quests"),
    ("HEXA_Skills", "HEXA Skills"),
    ("Hyper_Skills", "Hyper Skills"),
    ("Link_Skills", "Link Skills"),
]


class FandomCrawler(BaseCrawler):
    """Crawler for the MapleStory Fandom Wiki (MediaWiki API)."""

    def __init__(self):
        super().__init__(delay=1.0)
        self.base_url = FANDOM_BASE_URL

    def get_category_members_all(self, category, limit_per_request=500):
        all_members = []
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": f"Category:{category}",
            "cmlimit": limit_per_request,
            "format": "json",
        }
        while True:
            data = self.get_json(self.base_url, params=params)
            if not data:
                break
            members = data.get("query", {}).get("categorymembers", [])
            all_members.extend(members)
            cont = data.get("continue")
            if cont and "cmcontinue" in cont:
                params["cmcontinue"] = cont["cmcontinue"]
            else:
                break
        return all_members

    def get_page_full_content(self, title):
        params = {
            "action": "query",
            "titles": title,
            "prop": "extracts|pageimages|info",
            "explaintext": True,
            "exlimit": 1,
            "pithumbsize": 400,
            "inprop": "url",
            "format": "json",
        }
        data = self.get_json(self.base_url, params=params)
        if not data:
            return None
        pages = data.get("query", {}).get("pages", {})
        for page_id, page in pages.items():
            if page_id == "-1" or int(page_id) < 0:
                return None
            return {
                "page_id": int(page_id),
                "title": page.get("title", ""),
                "extract": page.get("extract", ""),
                "image_url": page.get("thumbnail", {}).get("source", ""),
                "page_url": page.get("fullurl", f"https://maplestory.fandom.com/wiki/{title.replace(' ', '_')}"),
            }
        return None

    def crawl_category(self, category, label, db, queries):
        members = self.get_category_members_all(category)
        logger.info(f"Category '{label}': {len(members)} pages")
        success, fail = 0, 0
        for member in members:
            title = member.get("title", "")
            if title.startswith("Category:"):
                continue
            try:
                content = self.get_page_full_content(title)
                if content:
                    content["category"] = label
                    content["raw_data"] = json.dumps(content, ensure_ascii=False)
                    queries.upsert_crawled_wiki_page(content)
                    success += 1
                else:
                    fail += 1
            except Exception as e:
                fail += 1
                logger.warning(f"Failed to crawl wiki page '{title}': {e}")
        db.conn.commit()
        return success, fail

    def crawl_all(self, db, queries, categories=None):
        from rich.console import Console
        console = Console()
        cats = categories or CATEGORIES_TO_CRAWL
        total_success, total_fail = 0, 0
        for cat_key, cat_label in cats:
            console.print(f"[cyan]Crawling category: {cat_label}...[/cyan]")
            try:
                s, f = self.crawl_category(cat_key, cat_label, db, queries)
                console.print(f"  [green]{s} success[/green], [red]{f} failed[/red]")
                total_success += s
                total_fail += f
            except Exception as e:
                console.print(f"  [red]Category failed: {e}[/red]")
        console.print(f"\n[bold green]Wiki crawl complete: {total_success} pages, {total_fail} failed[/bold green]")
        return total_success, total_fail

    def search_pages(self, query, limit=10):
        params = {
            "action": "query", "list": "search",
            "srsearch": query, "srlimit": limit, "format": "json",
        }
        data = self.get_json(self.base_url, params=params)
        return data.get("query", {}).get("search", []) if data else []

    def get_page_content(self, title):
        return self.get_page_full_content(title)

    def get_category_members(self, category, limit=50):
        params = {
            "action": "query", "list": "categorymembers",
            "cmtitle": f"Category:{category}", "cmlimit": limit, "format": "json",
        }
        data = self.get_json(self.base_url, params=params)
        return data.get("query", {}).get("categorymembers", []) if data else []
