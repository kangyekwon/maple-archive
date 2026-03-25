"""MapleStory.io API crawler for mobs, maps, and items (GMS v62)"""

import json
import logging
import time

from .base import BaseCrawler
from config import MAPLESTORY_IO_BASE_URL

logger = logging.getLogger(__name__)

# API version path appended to the base URL from config
_API_VERSION_PATH = "/GMS/62"

# Image URL templates
MOB_IMAGE_URL = "https://maplestory.io/api/GMS/62/mob/{mob_id}/render/stand"
ITEM_ICON_URL = "https://maplestory.io/api/GMS/62/item/{item_id}/icon"
NPC_ICON_URL = "https://maplestory.io/api/GMS/62/npc/{npc_id}/icon"


def _ensure_crawl_tables(db):
    """Tables are created by schema.sql on Database init. This is a no-op safety check."""
    pass


class MapleStoryIOCrawler(BaseCrawler):
    """Crawler for the MapleStory.io public REST API (GMS v62).

    Endpoints used:
        GET /mob          - list all mobs
        GET /mob/{id}     - mob detail (stats, foundAt maps)
        GET /map          - list all maps
        GET /item         - list items by category
    """

    def __init__(self):
        super().__init__(delay=0.3)  # Fast rate; no auth needed
        self.base_url = MAPLESTORY_IO_BASE_URL + _API_VERSION_PATH

    # ------------------------------------------------------------------
    # Low-level API helpers
    # ------------------------------------------------------------------

    def crawl_mob_list(self) -> list:
        """GET /mob - returns list of mob summaries.

        Each entry: {id, name, mobType, level, isBoss}
        """
        url = f"{self.base_url}/mob"
        logger.info("Fetching mob list from %s", url)
        data = self.get_json(url)
        if not isinstance(data, list):
            logger.warning("Unexpected mob list response type: %s", type(data))
            return []
        logger.info("Received %d mobs from API", len(data))
        return data

    def crawl_mob_detail(self, mob_id: int) -> dict:
        """GET /mob/{id} - returns full mob detail.

        Includes meta (level, maxHP, maxMP, exp, damage, defense, etc.),
        description, and foundAt map IDs.
        """
        url = f"{self.base_url}/mob/{mob_id}"
        data = self.get_json(url)
        return data

    def crawl_map_list(self) -> list:
        """GET /map - returns list of map summaries.

        Each entry: {id, name, streetName}
        """
        url = f"{self.base_url}/map"
        logger.info("Fetching map list from %s", url)
        data = self.get_json(url)
        if not isinstance(data, list):
            logger.warning("Unexpected map list response type: %s", type(data))
            return []
        logger.info("Received %d maps from API", len(data))
        return data

    def crawl_item_list(self, category: str = "Equip") -> list:
        """GET /item?overallCategory={category} - returns item summaries.

        Each entry: {id, name, desc, requiredLevel, requiredJobs, isCash,
                     typeInfo: {overallCategory, category, subCategory}}
        """
        url = f"{self.base_url}/item"
        params = {"overallCategory": category}
        logger.info("Fetching item list from %s (category=%s)", url, category)
        data = self.get_json(url, params=params)
        if not isinstance(data, list):
            logger.warning("Unexpected item list response type: %s", type(data))
            return []
        logger.info("Received %d items for category '%s'", len(data), category)
        return data

    # ------------------------------------------------------------------
    # Bulk crawl methods (write to DB)
    # ------------------------------------------------------------------

    def crawl_all_mobs(self, db, queries, with_detail=False, progress_callback=None) -> int:
        """Crawl all mobs and insert into crawled_mobs table.

        Args:
            db: Database instance (for direct SQL when needed).
            queries: Queries instance (for update_crawl_status).
            with_detail: If True, fetch per-mob detail for HP/EXP/foundAt.
            progress_callback: Optional callable(current, total) for progress.

        Returns:
            Number of mobs inserted.
        """
        _ensure_crawl_tables(db)

        mob_list = self.crawl_mob_list()
        total = len(mob_list)
        if total == 0:
            logger.warning("No mobs returned from API")
            return 0

        queries.update_crawl_status("maplestory_io_mobs_total", str(total))
        queries.update_crawl_status("maplestory_io_mobs_status", "crawling")
        inserted = 0
        failed = 0
        start_time = time.time()

        for idx, mob in enumerate(mob_list):
            mob_id = mob.get("id")
            mob_name = mob.get("name", "")
            level = mob.get("level", 0)
            is_boss = 1 if mob.get("isBoss") else 0
            image_url = MOB_IMAGE_URL.format(mob_id=mob_id)

            # Detail fields (populated only when with_detail=True)
            max_hp = 0
            max_mp = 0
            exp = 0
            p_damage = 0
            p_defense = 0
            m_damage = 0
            m_defense = 0
            accuracy = 0
            evasion = 0
            is_undead = 0
            description = ""
            found_at = ""

            if with_detail and mob_id is not None:
                try:
                    detail = self.crawl_mob_detail(mob_id)
                    meta = detail.get("meta", {}) or {}
                    max_hp = meta.get("maxHP", 0) or 0
                    max_mp = meta.get("maxMP", 0) or 0
                    exp = meta.get("exp", 0) or 0
                    p_damage = meta.get("physicalDamage", 0) or 0
                    p_defense = meta.get("physicalDefense", 0) or 0
                    m_damage = meta.get("magicDamage", 0) or 0
                    m_defense = meta.get("magicDefense", 0) or 0
                    accuracy = meta.get("accuracy", 0) or 0
                    evasion = meta.get("evasion", 0) or 0
                    is_undead = 1 if meta.get("isUndead") else 0
                    description = detail.get("description", "") or ""
                    found_at_list = detail.get("foundAt", []) or []
                    found_at = json.dumps(found_at_list) if found_at_list else ""
                except Exception as e:
                    failed += 1
                    logger.warning(
                        "Failed to fetch detail for mob %s (id=%s): %s",
                        mob_name, mob_id, e,
                    )

            try:
                db.execute(
                    """INSERT OR REPLACE INTO crawled_mobs
                       (mob_id, name, level, is_boss,
                        max_hp, max_mp, exp,
                        physical_damage, physical_defense,
                        magic_damage, magic_defense,
                        accuracy, evasion, is_undead,
                        description, found_at, image_url)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        mob_id, mob_name, level, is_boss,
                        max_hp, max_mp, exp,
                        p_damage, p_defense,
                        m_damage, m_defense,
                        accuracy, evasion, is_undead,
                        description, found_at, image_url,
                    ),
                )
                inserted += 1
            except Exception as e:
                failed += 1
                logger.warning("Failed to insert mob %s (id=%s): %s", mob_name, mob_id, e)

            # Progress logging every 100 items
            if (idx + 1) % 100 == 0 or (idx + 1) == total:
                elapsed = time.time() - start_time
                logger.info(
                    "[Mobs] Progress: %d/%d (%.1f%%) | inserted=%d failed=%d | %.1fs elapsed",
                    idx + 1, total, (idx + 1) / total * 100,
                    inserted, failed, elapsed,
                )
                queries.update_crawl_status("maplestory_io_mobs_progress", str(idx + 1))

            if progress_callback:
                progress_callback(idx + 1, total)

        elapsed = time.time() - start_time
        queries.update_crawl_status("maplestory_io_mobs_inserted", str(inserted))
        queries.update_crawl_status("maplestory_io_mobs_failed", str(failed))
        queries.update_crawl_status("maplestory_io_mobs_status", "done")
        logger.info(
            "[Mobs] Complete: %d inserted, %d failed out of %d total (%.1fs)",
            inserted, failed, total, elapsed,
        )
        return inserted

    def crawl_all_maps(self, db, queries, progress_callback=None) -> int:
        """Crawl all maps and insert into crawled_maps table.

        Args:
            db: Database instance.
            queries: Queries instance.
            progress_callback: Optional callable(current, total).

        Returns:
            Number of maps inserted.
        """
        _ensure_crawl_tables(db)

        map_list = self.crawl_map_list()
        total = len(map_list)
        if total == 0:
            logger.warning("No maps returned from API")
            return 0

        queries.update_crawl_status("maplestory_io_maps_total", str(total))
        queries.update_crawl_status("maplestory_io_maps_status", "crawling")
        inserted = 0
        failed = 0
        start_time = time.time()

        for idx, map_entry in enumerate(map_list):
            map_id = map_entry.get("id")
            map_name = map_entry.get("name", "")
            street_name = map_entry.get("streetName", "")

            try:
                db.execute(
                    """INSERT OR REPLACE INTO crawled_maps
                       (map_id, name, street_name)
                       VALUES (?, ?, ?)""",
                    (map_id, map_name, street_name),
                )
                inserted += 1
            except Exception as e:
                failed += 1
                logger.warning("Failed to insert map %s (id=%s): %s", map_name, map_id, e)

            # Progress logging every 100 items
            if (idx + 1) % 100 == 0 or (idx + 1) == total:
                elapsed = time.time() - start_time
                logger.info(
                    "[Maps] Progress: %d/%d (%.1f%%) | inserted=%d failed=%d | %.1fs elapsed",
                    idx + 1, total, (idx + 1) / total * 100,
                    inserted, failed, elapsed,
                )
                queries.update_crawl_status("maplestory_io_maps_progress", str(idx + 1))

            if progress_callback:
                progress_callback(idx + 1, total)

        elapsed = time.time() - start_time
        queries.update_crawl_status("maplestory_io_maps_inserted", str(inserted))
        queries.update_crawl_status("maplestory_io_maps_failed", str(failed))
        queries.update_crawl_status("maplestory_io_maps_status", "done")
        logger.info(
            "[Maps] Complete: %d inserted, %d failed out of %d total (%.1fs)",
            inserted, failed, total, elapsed,
        )
        return inserted

    def crawl_all_items(self, db, queries, categories=None, progress_callback=None) -> int:
        """Crawl items by category and insert into crawled_items table.

        Args:
            db: Database instance.
            queries: Queries instance.
            categories: List of overallCategory values to crawl.
                        Defaults to ["Equip"].
            progress_callback: Optional callable(current, total).

        Returns:
            Total number of items inserted across all categories.
        """
        _ensure_crawl_tables(db)

        if categories is None:
            categories = ["Equip"]

        queries.update_crawl_status("maplestory_io_items_status", "crawling")
        queries.update_crawl_status(
            "maplestory_io_items_categories", json.dumps(categories),
        )
        total_inserted = 0
        total_failed = 0
        start_time = time.time()

        for cat in categories:
            logger.info("[Items] Starting category: %s", cat)
            item_list = self.crawl_item_list(category=cat)
            cat_total = len(item_list)

            if cat_total == 0:
                logger.info("[Items] No items for category '%s', skipping", cat)
                continue

            queries.update_crawl_status(
                f"maplestory_io_items_{cat}_total", str(cat_total),
            )
            inserted = 0
            failed = 0

            for idx, item in enumerate(item_list):
                item_id = item.get("id")
                item_name = item.get("name", "")
                desc = item.get("desc", "") or ""
                required_level = item.get("requiredLevel", 0) or 0
                required_jobs = json.dumps(item.get("requiredJobs", []) or [])
                is_cash = 1 if item.get("isCash") else 0

                type_info = item.get("typeInfo", {}) or {}
                overall_category = type_info.get("overallCategory", cat)
                category_name = type_info.get("category", "")
                sub_category = type_info.get("subCategory", "")

                image_url = ITEM_ICON_URL.format(item_id=item_id)

                try:
                    db.execute(
                        """INSERT OR REPLACE INTO crawled_items
                           (item_id, name, description, required_level, required_jobs,
                            is_cash, overall_category, category, sub_category,
                            image_url)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            item_id, item_name, desc, required_level, required_jobs,
                            is_cash, overall_category, category_name, sub_category,
                            image_url,
                        ),
                    )
                    inserted += 1
                except Exception as e:
                    failed += 1
                    logger.warning(
                        "Failed to insert item %s (id=%s): %s",
                        item_name, item_id, e,
                    )

                # Progress logging every 100 items
                if (idx + 1) % 100 == 0 or (idx + 1) == cat_total:
                    elapsed = time.time() - start_time
                    logger.info(
                        "[Items/%s] Progress: %d/%d (%.1f%%) | inserted=%d failed=%d | %.1fs elapsed",
                        cat, idx + 1, cat_total, (idx + 1) / cat_total * 100,
                        inserted, failed, elapsed,
                    )

                if progress_callback:
                    progress_callback(total_inserted + idx + 1, -1)

            total_inserted += inserted
            total_failed += failed
            queries.update_crawl_status(
                f"maplestory_io_items_{cat}_inserted", str(inserted),
            )
            logger.info(
                "[Items/%s] Category done: %d inserted, %d failed",
                cat, inserted, failed,
            )

        elapsed = time.time() - start_time
        queries.update_crawl_status("maplestory_io_items_inserted", str(total_inserted))
        queries.update_crawl_status("maplestory_io_items_failed", str(total_failed))
        queries.update_crawl_status("maplestory_io_items_status", "done")
        logger.info(
            "[Items] Complete: %d inserted, %d failed across %d categories (%.1fs)",
            total_inserted, total_failed, len(categories), elapsed,
        )
        return total_inserted

    # ------------------------------------------------------------------
    # NPC endpoints
    # ------------------------------------------------------------------

    def crawl_npc_list(self) -> list:
        """GET /npc - returns list of NPC summaries.

        Each entry: {id, name}
        """
        url = f"{self.base_url}/npc"
        logger.info("Fetching NPC list from %s", url)
        data = self.get_json(url)
        if not isinstance(data, list):
            logger.warning("Unexpected NPC list response type: %s", type(data))
            return []
        logger.info("Received %d NPCs from API", len(data))
        return data

    def crawl_npc_detail(self, npc_id: int) -> dict:
        """GET /npc/{id} - returns full NPC detail."""
        url = f"{self.base_url}/npc/{npc_id}"
        return self.get_json(url)

    def crawl_all_npcs(self, db, queries, with_detail=False, progress_callback=None) -> int:
        """Crawl all NPCs and insert into crawled_npcs table.

        Args:
            db: Database instance.
            queries: Queries instance.
            with_detail: If True, fetch per-NPC detail for dialogue/foundAt.
            progress_callback: Optional callable(current, total).

        Returns:
            Number of NPCs inserted.
        """
        npc_list = self.crawl_npc_list()
        total = len(npc_list)
        if total == 0:
            logger.warning("No NPCs returned from API")
            return 0

        queries.update_crawl_status("maplestory_io_npcs_total", str(total))
        queries.update_crawl_status("maplestory_io_npcs_status", "crawling")
        inserted = 0
        failed = 0
        start_time = time.time()

        for idx, npc in enumerate(npc_list):
            npc_id = npc.get("id")
            npc_name = npc.get("name", "")
            image_url = NPC_ICON_URL.format(npc_id=npc_id)

            data = {
                "npc_id": npc_id,
                "name": npc_name,
                "image_url": image_url,
            }

            if with_detail and npc_id is not None:
                try:
                    detail = self.crawl_npc_detail(npc_id)
                    if detail:
                        dialogue_dict = detail.get("dialogue", {}) or {}
                        dialogue_text = " | ".join(str(v) for v in dialogue_dict.values()) if dialogue_dict else ""
                        found_at_list = detail.get("foundAt", []) or []
                        found_at = json.dumps([f.get("id") for f in found_at_list if isinstance(f, dict)])
                        related = json.dumps(detail.get("relatedQuests", []) or [])

                        data.update({
                            "is_shop": 1 if detail.get("isShop") else 0,
                            "is_component_npc": 1 if detail.get("isComponentNPC") else 0,
                            "dialogue": dialogue_text,
                            "found_at": found_at,
                            "related_quests": related,
                            "raw_data": json.dumps(detail, ensure_ascii=False),
                        })
                except Exception as e:
                    failed += 1
                    logger.warning(
                        "Failed to fetch detail for NPC %s (id=%s): %s",
                        npc_name, npc_id, e,
                    )

            try:
                queries.upsert_crawled_npc(data)
                inserted += 1
            except Exception as e:
                failed += 1
                logger.warning("Failed to insert NPC %s (id=%s): %s", npc_name, npc_id, e)

            if (idx + 1) % 100 == 0 or (idx + 1) == total:
                elapsed = time.time() - start_time
                logger.info(
                    "[NPCs] Progress: %d/%d (%.1f%%) | inserted=%d failed=%d | %.1fs elapsed",
                    idx + 1, total, (idx + 1) / total * 100,
                    inserted, failed, elapsed,
                )
                queries.update_crawl_status("maplestory_io_npcs_progress", str(idx + 1))

            if progress_callback:
                progress_callback(idx + 1, total)

        elapsed = time.time() - start_time
        queries.update_crawl_status("maplestory_io_npcs_inserted", str(inserted))
        queries.update_crawl_status("maplestory_io_npcs_failed", str(failed))
        queries.update_crawl_status("maplestory_io_npcs_status", "done")
        logger.info(
            "[NPCs] Complete: %d inserted, %d failed out of %d total (%.1fs)",
            inserted, failed, total, elapsed,
        )
        return inserted

    # ------------------------------------------------------------------
    # Quest endpoints
    # ------------------------------------------------------------------

    def crawl_quest_list(self) -> list:
        """GET /quest - returns list of quest summaries.

        Each entry: {id, name}
        """
        url = f"{self.base_url}/quest"
        logger.info("Fetching quest list from %s", url)
        data = self.get_json(url)
        if not isinstance(data, list):
            logger.warning("Unexpected quest list response type: %s", type(data))
            return []
        logger.info("Received %d quests from API", len(data))
        return data

    def crawl_quest_detail(self, quest_id: int) -> dict:
        """GET /quest/{id} - returns full quest detail."""
        url = f"{self.base_url}/quest/{quest_id}"
        return self.get_json(url)

    def crawl_all_quests(self, db, queries, with_detail=False, progress_callback=None) -> int:
        """Crawl all quests and insert into crawled_quests table.

        Args:
            db: Database instance.
            queries: Queries instance.
            with_detail: If True, fetch per-quest detail for messages/requirements.
            progress_callback: Optional callable(current, total).

        Returns:
            Number of quests inserted.
        """
        quest_list = self.crawl_quest_list()
        total = len(quest_list)
        if total == 0:
            logger.warning("No quests returned from API")
            return 0

        queries.update_crawl_status("maplestory_io_quests_total", str(total))
        queries.update_crawl_status("maplestory_io_quests_status", "crawling")
        inserted = 0
        failed = 0
        start_time = time.time()

        for idx, quest in enumerate(quest_list):
            quest_id = quest.get("id")
            quest_name = quest.get("name", "")

            data = {
                "quest_id": quest_id,
                "name": quest_name,
            }

            if with_detail and quest_id is not None:
                try:
                    detail = self.crawl_quest_detail(quest_id)
                    if detail:
                        messages_list = detail.get("messages", []) or []
                        messages = " | ".join(str(m) for m in messages_list)
                        req_start = detail.get("requirementToStart", {}) or {}
                        req_complete = detail.get("requirementToComplete", {}) or {}

                        available_on_complete = detail.get("questsAvailableOnComplete", []) or []
                        next_quests = json.dumps([
                            q.get("id") for q in available_on_complete
                            if isinstance(q, dict)
                        ])

                        # Parse required quests
                        req_quests_list = req_start.get("quests", []) or []
                        required_quests = json.dumps([
                            q.get("id") for q in req_quests_list
                            if isinstance(q, dict)
                        ]) if req_quests_list else json.dumps([])

                        # Parse reward data from completion requirements
                        rewards = detail.get("rewards", {}) or {}
                        reward_items_list = rewards.get("items", []) or req_complete.get("items", []) or []
                        reward_items = json.dumps(reward_items_list) if reward_items_list else json.dumps([])
                        reward_exp = rewards.get("exp", 0) or detail.get("rewardExp", 0) or 0
                        reward_mesos = rewards.get("mesos", 0) or detail.get("rewardMesos", 0) or 0

                        data.update({
                            "area": detail.get("area"),
                            "messages": messages,
                            "start_npc_id": req_start.get("npcId"),
                            "end_npc_id": req_complete.get("npcId"),
                            "required_jobs": json.dumps(req_start.get("jobs", []) or []),
                            "required_items": json.dumps(req_start.get("items", []) or []),
                            "required_quests": required_quests,
                            "reward_items": reward_items,
                            "reward_exp": reward_exp,
                            "reward_mesos": reward_mesos,
                            "next_quests": next_quests,
                            "raw_data": json.dumps(detail, ensure_ascii=False),
                        })
                except Exception as e:
                    failed += 1
                    logger.warning(
                        "Failed to fetch detail for quest %s (id=%s): %s",
                        quest_name, quest_id, e,
                    )

            try:
                queries.upsert_crawled_quest(data)
                inserted += 1
            except Exception as e:
                failed += 1
                logger.warning("Failed to insert quest %s (id=%s): %s", quest_name, quest_id, e)

            if (idx + 1) % 100 == 0 or (idx + 1) == total:
                elapsed = time.time() - start_time
                logger.info(
                    "[Quests] Progress: %d/%d (%.1f%%) | inserted=%d failed=%d | %.1fs elapsed",
                    idx + 1, total, (idx + 1) / total * 100,
                    inserted, failed, elapsed,
                )
                queries.update_crawl_status("maplestory_io_quests_progress", str(idx + 1))

            if progress_callback:
                progress_callback(idx + 1, total)

        elapsed = time.time() - start_time
        queries.update_crawl_status("maplestory_io_quests_inserted", str(inserted))
        queries.update_crawl_status("maplestory_io_quests_failed", str(failed))
        queries.update_crawl_status("maplestory_io_quests_status", "done")
        logger.info(
            "[Quests] Complete: %d inserted, %d failed out of %d total (%.1fs)",
            inserted, failed, total, elapsed,
        )
        return inserted
