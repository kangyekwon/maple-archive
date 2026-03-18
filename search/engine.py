"""FTS5-based search engine for MapleStory Archive"""

import logging
from db.database import Database

logger = logging.getLogger(__name__)


class SearchEngine:
    def __init__(self, db: Database):
        self.db = db

    def search_all(self, query: str, limit=30, offset=0):
        characters = self.search_characters(query, limit=limit, offset=offset)
        story_arcs = self.search_story_arcs(query, limit=limit, offset=offset)
        worlds = self.search_worlds(query, limit=limit, offset=offset)
        jobs = self.search_jobs(query, limit=limit, offset=offset)
        bosses = self.search_bosses(query, limit=limit, offset=offset)
        monsters = self.search_monsters(query, limit=limit, offset=offset)
        items = self.search_items(query, limit=limit, offset=offset)
        return {
            "characters": characters["items"],
            "characters_total": characters["total"],
            "story_arcs": story_arcs["items"],
            "story_arcs_total": story_arcs["total"],
            "worlds": worlds["items"],
            "worlds_total": worlds["total"],
            "jobs": jobs["items"],
            "jobs_total": jobs["total"],
            "bosses": bosses["items"],
            "bosses_total": bosses["total"],
            "monsters": monsters["items"],
            "monsters_total": monsters["total"],
            "items": items["items"],
            "items_total": items["total"],
        }

    def search_characters(self, query: str, limit=30, offset=0):
        try:
            fts_query = self._build_fts_query(query)
            rows = self.db.fetchall("""
                SELECT c.* FROM characters c
                JOIN characters_fts fts ON c.id = fts.rowid
                WHERE characters_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """, (fts_query, limit, offset))
            total_row = self.db.fetchone("""
                SELECT COUNT(*) as cnt FROM characters c
                JOIN characters_fts fts ON c.id = fts.rowid
                WHERE characters_fts MATCH ?
            """, (fts_query,))
            return {
                "items": [dict(r) for r in rows],
                "total": total_row["cnt"] if total_row else 0,
            }
        except Exception:
            return self._fallback_search("characters",
                ["name", "name_ko", "role", "faction", "backstory"], query, limit, offset)

    def search_story_arcs(self, query: str, limit=30, offset=0):
        try:
            fts_query = self._build_fts_query(query)
            rows = self.db.fetchall("""
                SELECT s.* FROM story_arcs s
                JOIN story_arcs_fts fts ON s.id = fts.rowid
                WHERE story_arcs_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """, (fts_query, limit, offset))
            total_row = self.db.fetchone("""
                SELECT COUNT(*) as cnt FROM story_arcs s
                JOIN story_arcs_fts fts ON s.id = fts.rowid
                WHERE story_arcs_fts MATCH ?
            """, (fts_query,))
            return {
                "items": [dict(r) for r in rows],
                "total": total_row["cnt"] if total_row else 0,
            }
        except Exception:
            return self._fallback_search("story_arcs",
                ["name", "name_ko", "saga", "description"], query, limit, offset)

    def search_worlds(self, query: str, limit=30, offset=0):
        try:
            fts_query = self._build_fts_query(query)
            rows = self.db.fetchall("""
                SELECT w.* FROM worlds w
                JOIN worlds_fts fts ON w.id = fts.rowid
                WHERE worlds_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """, (fts_query, limit, offset))
            total_row = self.db.fetchone("""
                SELECT COUNT(*) as cnt FROM worlds w
                JOIN worlds_fts fts ON w.id = fts.rowid
                WHERE worlds_fts MATCH ?
            """, (fts_query,))
            return {
                "items": [dict(r) for r in rows],
                "total": total_row["cnt"] if total_row else 0,
            }
        except Exception:
            return self._fallback_search("worlds",
                ["name", "name_ko", "parent_world", "region", "description"], query, limit, offset)

    def search_jobs(self, query: str, limit=30, offset=0):
        try:
            fts_query = self._build_fts_query(query)
            rows = self.db.fetchall("""
                SELECT j.* FROM job_classes j
                JOIN job_classes_fts fts ON j.id = fts.rowid
                WHERE job_classes_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """, (fts_query, limit, offset))
            total_row = self.db.fetchone("""
                SELECT COUNT(*) as cnt FROM job_classes j
                JOIN job_classes_fts fts ON j.id = fts.rowid
                WHERE job_classes_fts MATCH ?
            """, (fts_query,))
            return {
                "items": [dict(r) for r in rows],
                "total": total_row["cnt"] if total_row else 0,
            }
        except Exception:
            return self._fallback_search("job_classes",
                ["name", "name_ko", "branch", "class_type", "description"], query, limit, offset)

    def search_bosses(self, query: str, limit=30, offset=0):
        try:
            fts_query = self._build_fts_query(query)
            rows = self.db.fetchall("""
                SELECT b.* FROM bosses b
                JOIN bosses_fts fts ON b.id = fts.rowid
                WHERE bosses_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """, (fts_query, limit, offset))
            total_row = self.db.fetchone("""
                SELECT COUNT(*) as cnt FROM bosses b
                JOIN bosses_fts fts ON b.id = fts.rowid
                WHERE bosses_fts MATCH ?
            """, (fts_query,))
            return {
                "items": [dict(r) for r in rows],
                "total": total_row["cnt"] if total_row else 0,
            }
        except Exception:
            return self._fallback_search("bosses",
                ["name", "name_ko", "difficulty", "mechanics", "story_significance"], query, limit, offset)

    def search_monsters(self, query: str, limit=30, offset=0):
        try:
            fts_query = self._build_fts_query(query)
            rows = self.db.fetchall("""
                SELECT m.* FROM monsters m
                JOIN monsters_fts fts ON m.id = fts.rowid
                WHERE monsters_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """, (fts_query, limit, offset))
            total_row = self.db.fetchone("""
                SELECT COUNT(*) as cnt FROM monsters m
                JOIN monsters_fts fts ON m.id = fts.rowid
                WHERE monsters_fts MATCH ?
            """, (fts_query,))
            return {
                "items": [dict(r) for r in rows],
                "total": total_row["cnt"] if total_row else 0,
            }
        except Exception:
            return self._fallback_search("monsters",
                ["name", "name_ko", "location", "description"], query, limit, offset)

    def search_items(self, query: str, limit=30, offset=0):
        try:
            fts_query = self._build_fts_query(query)
            rows = self.db.fetchall("""
                SELECT i.* FROM items i
                JOIN items_fts fts ON i.id = fts.rowid
                WHERE items_fts MATCH ?
                ORDER BY rank
                LIMIT ? OFFSET ?
            """, (fts_query, limit, offset))
            total_row = self.db.fetchone("""
                SELECT COUNT(*) as cnt FROM items i
                JOIN items_fts fts ON i.id = fts.rowid
                WHERE items_fts MATCH ?
            """, (fts_query,))
            return {
                "items": [dict(r) for r in rows],
                "total": total_row["cnt"] if total_row else 0,
            }
        except Exception:
            return self._fallback_search("items",
                ["name", "name_ko", "category", "description", "set_name"], query, limit, offset)

    def _fallback_search(self, table, columns, query, limit, offset):
        like = f"%{query}%"
        where = " OR ".join(f"{col} LIKE ?" for col in columns)
        params = [like] * len(columns)

        rows = self.db.fetchall(
            f"SELECT * FROM {table} WHERE {where} ORDER BY id LIMIT ? OFFSET ?",
            params + [limit, offset]
        )
        total_row = self.db.fetchone(
            f"SELECT COUNT(*) as cnt FROM {table} WHERE {where}",
            params
        )
        return {
            "items": [dict(r) for r in rows],
            "total": total_row["cnt"] if total_row else 0,
        }

    def suggest(self, query: str, limit=10):
        like = f"{query}%"
        results = []
        for table, name_col in [("characters", "name"), ("job_classes", "name"),
                                 ("worlds", "name"), ("bosses", "name"),
                                 ("monsters", "name"), ("items", "name")]:
            rows = self.db.fetchall(
                f"SELECT id, name, name_ko, '{table}' as type FROM {table} "
                f"WHERE name LIKE ? OR name_ko LIKE ? LIMIT ?",
                (like, like, limit)
            )
            results.extend([dict(r) for r in rows])
        return results[:limit]

    def get_stats(self):
        tables = {
            "characters": "characters",
            "story_arcs": "story_arcs",
            "story_events": "story_events",
            "worlds": "worlds",
            "job_classes": "job_classes",
            "bosses": "bosses",
            "skills": "skills",
            "power_systems": "power_systems",
            "monsters": "monsters",
            "items": "items",
        }
        stats = {}
        for key, table in tables.items():
            row = self.db.fetchone(f"SELECT COUNT(*) as cnt FROM {table}")
            stats[key] = row["cnt"] if row else 0
        return stats

    def _build_fts_query(self, query: str) -> str:
        terms = query.strip().split()
        if len(terms) == 1:
            term = terms[0].replace('"', '')
            return f'"{term}" OR {term}*'
        escaped = [t.replace('"', '') for t in terms]
        return " OR ".join(f'"{t}"' for t in escaped)
