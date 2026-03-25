"""Korean wiki data crawler for MapleStory (Korean Wikipedia API + future namu wiki support)"""

import logging
from .base import BaseCrawler

logger = logging.getLogger(__name__)

KO_WIKI_API = "https://ko.wikipedia.org/w/api.php"
KO_WIKI_UA = "MapleArchiveBot/1.0 (https://github.com/kangyekwon/maple-archive)"

# Search queries to discover MapleStory-related Korean Wikipedia pages
SEARCH_QUERIES = [
    "메이플스토리",
    "메이플스토리 직업",
    "메이플스토리 몬스터",
    "넥슨 온라인 게임",
    "메이플스토리 보스",
    "시그너스 기사단",
    "메이플스토리 세계관",
]

# Direct page titles known to exist on Korean Wikipedia
DIRECT_PAGES = [
    ("메이플스토리", "general"),
    ("메이플스토리 시리즈", "general"),
    ("메이플스토리 2", "general"),
    ("메이플스토리의 직업", "job"),
    ("메이플스토리의 등장인물 목록", "character"),
    ("넥슨", "company"),
    ("위젯", "company"),
    ("온라인 게임", "general"),
    ("MMORPG", "general"),
    ("메이플스토리 (애니메이션)", "media"),
    ("메이플스토리 DS", "media"),
]

# Korean boss/job/character names to search individually
KOREAN_SEARCHES = [
    # Bosses
    ("자쿰", "boss"), ("혼테일", "boss"), ("핑크빈", "boss"),
    ("검은 마법사", "boss"), ("매그너스", "boss"), ("루시드", "boss"),
    ("시그너스", "character"), ("데미안", "character"),
    # Job branches
    ("시그너스 기사단", "job_branch"), ("레지스탕스", "job_branch"),
    # Game concepts
    ("아케인 리버", "region"), ("그란디스", "region"),
    ("빅토리아 아일랜드", "region"), ("엘나스", "region"),
]


class NamuCrawler(BaseCrawler):
    """Korean wiki data crawler.

    Primary source: Korean Wikipedia (ko.wikipedia.org) via MediaWiki API.
    Namu wiki requires headless browser (future enhancement).
    """

    def __init__(self):
        super().__init__(delay=0.5)
        self.base_url = KO_WIKI_API
        self.session.headers.update({"User-Agent": KO_WIKI_UA})

    def _search_pages(self, query, limit=20):
        """Search Korean Wikipedia for pages matching a query."""
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": limit,
            "format": "json",
        }
        data = self.get_json(self.base_url, params=params)
        if not data:
            return []
        return data.get("query", {}).get("search", [])

    def _get_page_content(self, title):
        """Get full page content from Korean Wikipedia."""
        params = {
            "action": "query",
            "titles": title,
            "prop": "extracts|pageimages|info|categories",
            "explaintext": True,
            "exlimit": 1,
            "pithumbsize": 400,
            "inprop": "url",
            "cllimit": 10,
            "format": "json",
        }
        data = self.get_json(self.base_url, params=params)
        if not data:
            return None
        pages = data.get("query", {}).get("pages", {})
        for page_id, page in pages.items():
            if page_id == "-1" or int(page_id) < 0:
                return None
            extract = page.get("extract", "")
            if not extract:
                return None
            categories = [
                c.get("title", "").replace("분류:", "")
                for c in page.get("categories", [])
            ]
            return {
                "title": page.get("title", title),
                "summary": extract[:500] if extract else "",
                "content": extract[:5000] if extract else "",
                "image_url": page.get("thumbnail", {}).get("source", ""),
                "page_url": page.get("fullurl", ""),
                "categories": categories,
            }
        return None

    def _build_page_set(self, db):
        """Build a deduplicated set of page titles to crawl."""
        titles = set()
        title_categories = {}

        # 1. Direct known pages
        for title, cat in DIRECT_PAGES:
            titles.add(title)
            title_categories[title] = cat

        # 2. Search-discovered pages
        for query in SEARCH_QUERIES:
            try:
                results = self._search_pages(query, limit=20)
                for r in results:
                    t = r.get("title", "")
                    if t and t not in titles:
                        titles.add(t)
                        title_categories[t] = "search"
            except Exception as e:
                logger.warning(f"Search failed for '{query}': {e}")

        # 3. Individual Korean name searches
        for name, cat in KOREAN_SEARCHES:
            try:
                results = self._search_pages(name, limit=5)
                for r in results:
                    t = r.get("title", "")
                    if t and t not in titles:
                        titles.add(t)
                        title_categories[t] = cat
            except Exception as e:
                logger.warning(f"Search failed for '{name}': {e}")

        # 4. DB-driven: just add character Korean names as direct page lookups (no search)
        try:
            rows = db.fetchall(
                "SELECT name, name_ko FROM characters WHERE name_ko IS NOT NULL AND name_ko != '' LIMIT 20"
            )
            for row in rows:
                t = row["name_ko"]
                if t and t not in titles:
                    titles.add(t)
                    title_categories[t] = "character"
        except Exception as e:
            logger.warning(f"Failed to load characters from DB: {e}")

        return [(t, title_categories.get(t, "general")) for t in sorted(titles)]

    def crawl_all(self, db, queries, progress_callback=None):
        """Crawl Korean Wikipedia pages and store in crawled_namu_pages table.

        Returns:
            Tuple of (success_count, fail_count).
        """
        from rich.console import Console
        console = Console()

        page_list = self._build_page_set(db)
        total = len(page_list)
        console.print(f"  [cyan]Korean Wiki: {total} pages to crawl[/cyan]")

        queries.update_crawl_status("namu_total", str(total))
        queries.update_crawl_status("namu_status", "crawling")

        success = 0
        fail = 0

        for idx, (title, category) in enumerate(page_list):
            page_data = self._get_page_content(title)
            if page_data:
                try:
                    queries.upsert_crawled_namu_page({
                        "title": page_data["title"],
                        "category": category,
                        "summary": page_data["summary"],
                        "content": page_data["content"],
                        "source_name": "ko.wikipedia",
                    })
                    success += 1
                except Exception as e:
                    fail += 1
                    logger.warning(f"Failed to save wiki page '{title}': {e}")
            else:
                fail += 1

            if (idx + 1) % 10 == 0 or (idx + 1) == total:
                console.print(
                    f"  [dim]Korean Wiki: {idx + 1}/{total} "
                    f"({success} ok, {fail} skipped)[/dim]"
                )
                queries.update_crawl_status("namu_progress", str(idx + 1))

            if progress_callback:
                progress_callback(idx + 1, total)

        db.conn.commit()
        queries.update_crawl_status("namu_inserted", str(success))
        queries.update_crawl_status("namu_failed", str(fail))
        queries.update_crawl_status("namu_status", "done")

        console.print(
            f"  [bold green]Korean Wiki complete: {success} pages saved, "
            f"{fail} skipped[/bold green]"
        )
        return success, fail

    # Legacy methods for backward compatibility
    def crawl_character_korean_names(self, character_names: list):
        results = {}
        for name in character_names:
            search_results = self._search_pages(f"메이플스토리 {name}", limit=3)
            for r in search_results:
                page = self._get_page_content(r["title"])
                if page:
                    results[name] = {
                        "summary_ko": page["summary"],
                        "full_text": page["content"],
                    }
                    break
        return results

    def crawl_job_details(self, job_names: list):
        results = {}
        for name in job_names:
            search_results = self._search_pages(f"메이플스토리 {name}", limit=3)
            for r in search_results:
                page = self._get_page_content(r["title"])
                if page:
                    results[name] = {
                        "description_ko": page["summary"],
                        "lore_ko": page["content"][:1000],
                    }
                    break
        return results
