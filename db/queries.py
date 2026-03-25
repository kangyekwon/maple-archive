"""Database CRUD operations for MapleStory Archive"""

from .database import Database


class Queries:
    def __init__(self, db: Database):
        self.db = db

    # === Characters ===
    def upsert_character(self, **kwargs):
        self.db.execute("""
            INSERT INTO characters (name, name_ko, role, faction, class_name, title,
                backstory, image_url, wiki_url, is_playable, power_level, first_appearance, voice_actor)
            VALUES (:name, :name_ko, :role, :faction, :class_name, :title,
                :backstory, :image_url, :wiki_url, :is_playable, :power_level, :first_appearance, :voice_actor)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, role=excluded.role, faction=excluded.faction,
                class_name=excluded.class_name, title=excluded.title, backstory=excluded.backstory,
                image_url=excluded.image_url, wiki_url=excluded.wiki_url, is_playable=excluded.is_playable,
                power_level=excluded.power_level, first_appearance=excluded.first_appearance,
                voice_actor=excluded.voice_actor
        """, kwargs)

    def get_character(self, char_id: int):
        return self.db.fetchone("SELECT * FROM characters WHERE id = ?", (char_id,))

    def get_character_by_name(self, name: str):
        return self.db.fetchone(
            "SELECT * FROM characters WHERE name = ? OR name_ko = ?", (name, name)
        )

    def get_all_characters(self, limit=None, offset=0, role=None, faction=None):
        sql = "SELECT * FROM characters WHERE 1=1"
        params = []
        if role:
            sql += " AND role = ?"
            params.append(role)
        if faction:
            sql += " AND faction = ?"
            params.append(faction)
        sql += " ORDER BY id"
        if limit:
            sql += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        return self.db.fetchall(sql, params)

    def get_character_count(self):
        row = self.db.fetchone("SELECT COUNT(*) as cnt FROM characters")
        return row["cnt"] if row else 0

    def get_character_relationships(self, char_id: int):
        return self.db.fetchall("""
            SELECT cr.*,
                ca.name as char_a_name, ca.name_ko as char_a_name_ko, ca.role as char_a_role,
                cb.name as char_b_name, cb.name_ko as char_b_name_ko, cb.role as char_b_role
            FROM character_relationships cr
            JOIN characters ca ON cr.character_a_id = ca.id
            JOIN characters cb ON cr.character_b_id = cb.id
            WHERE cr.character_a_id = ? OR cr.character_b_id = ?
        """, (char_id, char_id))

    def get_relationship_graph(self):
        characters = self.db.fetchall("SELECT id, name, name_ko, role, faction, image_url, power_level FROM characters")
        relationships = self.db.fetchall("""
            SELECT character_a_id, character_b_id, relationship_type, description, strength
            FROM character_relationships
        """)
        return {
            "nodes": [dict(c) for c in characters],
            "links": [dict(r) for r in relationships],
        }

    # === Story Arcs ===
    def upsert_story_arc(self, **kwargs):
        self.db.execute("""
            INSERT INTO story_arcs (name, name_ko, saga, description, order_index,
                status, level_range, key_characters, image_url)
            VALUES (:name, :name_ko, :saga, :description, :order_index,
                :status, :level_range, :key_characters, :image_url)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, saga=excluded.saga, description=excluded.description,
                order_index=excluded.order_index, status=excluded.status,
                level_range=excluded.level_range, key_characters=excluded.key_characters,
                image_url=excluded.image_url
        """, kwargs)

    def get_story_arc(self, arc_id: int):
        return self.db.fetchone("SELECT * FROM story_arcs WHERE id = ?", (arc_id,))

    def get_all_story_arcs(self, saga=None):
        if saga:
            return self.db.fetchall(
                "SELECT * FROM story_arcs WHERE saga = ? ORDER BY order_index", (saga,)
            )
        return self.db.fetchall("SELECT * FROM story_arcs ORDER BY order_index")

    def get_arc_events(self, arc_id: int):
        return self.db.fetchall(
            "SELECT * FROM story_events WHERE arc_id = ? ORDER BY chronological_order",
            (arc_id,)
        )

    def get_sagas(self):
        return self.db.fetchall("""
            SELECT saga, COUNT(*) as arc_count FROM story_arcs GROUP BY saga ORDER BY MIN(order_index)
        """)

    # === Timeline Events ===
    def upsert_story_event(self, **kwargs):
        self.db.execute("""
            INSERT INTO story_events (arc_id, title, title_ko, description, era,
                chronological_order, year_in_lore, key_characters, location, significance)
            VALUES (:arc_id, :title, :title_ko, :description, :era,
                :chronological_order, :year_in_lore, :key_characters, :location, :significance)
        """, kwargs)

    def get_timeline(self):
        return self.db.fetchall("""
            SELECT se.*, sa.name as arc_name, sa.saga
            FROM story_events se
            LEFT JOIN story_arcs sa ON se.arc_id = sa.id
            ORDER BY se.chronological_order
        """)

    # === Worlds ===
    def upsert_world(self, **kwargs):
        self.db.execute("""
            INSERT INTO worlds (name, name_ko, parent_world, region, description,
                level_range, arcane_force, sacred_force, lat, lng, altitude,
                image_url, connected_worlds)
            VALUES (:name, :name_ko, :parent_world, :region, :description,
                :level_range, :arcane_force, :sacred_force, :lat, :lng, :altitude,
                :image_url, :connected_worlds)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, parent_world=excluded.parent_world,
                region=excluded.region, description=excluded.description,
                level_range=excluded.level_range, arcane_force=excluded.arcane_force,
                sacred_force=excluded.sacred_force, lat=excluded.lat, lng=excluded.lng,
                altitude=excluded.altitude, image_url=excluded.image_url,
                connected_worlds=excluded.connected_worlds
        """, kwargs)

    def get_world(self, world_id: int):
        return self.db.fetchone("SELECT * FROM worlds WHERE id = ?", (world_id,))

    def get_all_worlds(self, parent=None):
        if parent:
            return self.db.fetchall(
                "SELECT * FROM worlds WHERE parent_world = ? ORDER BY id", (parent,)
            )
        return self.db.fetchall("SELECT * FROM worlds ORDER BY id")

    def get_world_map_data(self):
        return self.db.fetchall(
            "SELECT id, name, name_ko, parent_world, region, lat, lng, altitude, level_range, arcane_force, sacred_force FROM worlds"
        )

    def get_worlds_by_force(self, force_type="arcane"):
        col = "arcane_force" if force_type == "arcane" else "sacred_force"
        return self.db.fetchall(
            f"SELECT * FROM worlds WHERE {col} > 0 ORDER BY {col}"
        )

    def get_connected_worlds(self, world_id: int):
        world = self.db.fetchone("SELECT connected_worlds FROM worlds WHERE id = ?", (world_id,))
        if not world or not world["connected_worlds"]:
            return []
        names = [n.strip() for n in world["connected_worlds"].split(",")]
        placeholders = ",".join("?" for _ in names)
        return self.db.fetchall(
            f"SELECT * FROM worlds WHERE name IN ({placeholders})", names
        )

    # === Job Classes ===
    def upsert_job_class(self, **kwargs):
        self.db.execute("""
            INSERT INTO job_classes (name, name_ko, branch, class_type, main_stat,
                weapon_type, description, lore, image_url, release_date, difficulty)
            VALUES (:name, :name_ko, :branch, :class_type, :main_stat,
                :weapon_type, :description, :lore, :image_url, :release_date, :difficulty)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, branch=excluded.branch, class_type=excluded.class_type,
                main_stat=excluded.main_stat, weapon_type=excluded.weapon_type,
                description=excluded.description, lore=excluded.lore, image_url=excluded.image_url,
                release_date=excluded.release_date, difficulty=excluded.difficulty
        """, kwargs)

    def get_job_class(self, job_id: int):
        return self.db.fetchone("SELECT * FROM job_classes WHERE id = ?", (job_id,))

    def get_all_job_classes(self, branch=None, class_type=None):
        sql = "SELECT * FROM job_classes WHERE 1=1"
        params = []
        if branch:
            sql += " AND branch = ?"
            params.append(branch)
        if class_type:
            sql += " AND class_type = ?"
            params.append(class_type)
        sql += " ORDER BY branch, name"
        return self.db.fetchall(sql, params)

    def get_job_tree(self):
        jobs = self.db.fetchall("SELECT * FROM job_classes ORDER BY branch, name")
        advancements = self.db.fetchall("SELECT * FROM job_advancements ORDER BY job_class_id, advancement_level")
        return {"jobs": [dict(j) for j in jobs], "advancements": [dict(a) for a in advancements]}

    def get_job_branches(self):
        return self.db.fetchall(
            "SELECT branch, COUNT(*) as count FROM job_classes GROUP BY branch ORDER BY branch"
        )

    def get_job_advancements(self, job_id: int):
        return self.db.fetchall(
            "SELECT * FROM job_advancements WHERE job_class_id = ? ORDER BY advancement_level",
            (job_id,)
        )

    def get_job_skills(self, job_id: int):
        return self.db.fetchall(
            "SELECT * FROM skills WHERE job_class_id = ? ORDER BY advancement_level, name",
            (job_id,)
        )

    def upsert_job_advancement(self, **kwargs):
        self.db.execute("""
            INSERT INTO job_advancements (job_class_id, advancement_level, name, name_ko, level_required, description)
            VALUES (:job_class_id, :advancement_level, :name, :name_ko, :level_required, :description)
        """, kwargs)

    def upsert_skill(self, **kwargs):
        self.db.execute("""
            INSERT INTO skills (job_class_id, name, name_ko, skill_type, advancement_level,
                max_level, description, damage_percent, cooldown, icon_url)
            VALUES (:job_class_id, :name, :name_ko, :skill_type, :advancement_level,
                :max_level, :description, :damage_percent, :cooldown, :icon_url)
        """, kwargs)

    # === Bosses ===
    def upsert_boss(self, **kwargs):
        self.db.execute("""
            INSERT INTO bosses (name, name_ko, difficulty, level_required, hp_estimate,
                mechanics, rewards, story_significance, related_arc_id, location,
                image_url, entry_limit, party_size)
            VALUES (:name, :name_ko, :difficulty, :level_required, :hp_estimate,
                :mechanics, :rewards, :story_significance, :related_arc_id, :location,
                :image_url, :entry_limit, :party_size)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, difficulty=excluded.difficulty,
                level_required=excluded.level_required, hp_estimate=excluded.hp_estimate,
                mechanics=excluded.mechanics, rewards=excluded.rewards,
                story_significance=excluded.story_significance, related_arc_id=excluded.related_arc_id,
                location=excluded.location, image_url=excluded.image_url,
                entry_limit=excluded.entry_limit, party_size=excluded.party_size
        """, kwargs)

    def get_boss(self, boss_id: int):
        return self.db.fetchone("SELECT * FROM bosses WHERE id = ?", (boss_id,))

    def get_all_bosses(self, difficulty=None):
        if difficulty:
            return self.db.fetchall(
                "SELECT * FROM bosses WHERE difficulty = ? ORDER BY level_required", (difficulty,)
            )
        return self.db.fetchall("SELECT * FROM bosses ORDER BY level_required")

    def get_bosses_by_arc(self, arc_id: int):
        return self.db.fetchall(
            "SELECT * FROM bosses WHERE related_arc_id = ? ORDER BY level_required", (arc_id,)
        )

    def get_boss_ranking(self):
        return self.db.fetchall("SELECT * FROM bosses ORDER BY level_required DESC")

    # === Power Systems ===
    def upsert_power_system(self, **kwargs):
        self.db.execute("""
            INSERT INTO power_systems (name, name_ko, category, description, unlock_level, max_level, details)
            VALUES (:name, :name_ko, :category, :description, :unlock_level, :max_level, :details)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, category=excluded.category,
                description=excluded.description, unlock_level=excluded.unlock_level,
                max_level=excluded.max_level, details=excluded.details
        """, kwargs)

    # === Monsters ===
    def upsert_monster(self, **kwargs):
        self.db.execute("""
            INSERT INTO monsters (name, name_ko, level, hp, exp, location, location_ko,
                world, category, element, drops, description, description_ko,
                image_url, is_classic, first_appeared)
            VALUES (:name, :name_ko, :level, :hp, :exp, :location, :location_ko,
                :world, :category, :element, :drops, :description, :description_ko,
                :image_url, :is_classic, :first_appeared)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, level=excluded.level, hp=excluded.hp,
                exp=excluded.exp, location=excluded.location, location_ko=excluded.location_ko,
                world=excluded.world, category=excluded.category, element=excluded.element,
                drops=excluded.drops, description=excluded.description,
                description_ko=excluded.description_ko, image_url=excluded.image_url,
                is_classic=excluded.is_classic, first_appeared=excluded.first_appeared
        """, kwargs)

    def get_monster(self, monster_id: int):
        return self.db.fetchone("SELECT * FROM monsters WHERE id = ?", (monster_id,))

    def get_all_monsters(self, category=None, world=None, level_min=None, level_max=None):
        sql = "SELECT * FROM monsters WHERE 1=1"
        params = []
        if category:
            sql += " AND category = ?"
            params.append(category)
        if world:
            sql += " AND world = ?"
            params.append(world)
        if level_min is not None:
            sql += " AND level >= ?"
            params.append(level_min)
        if level_max is not None:
            sql += " AND level <= ?"
            params.append(level_max)
        sql += " ORDER BY level"
        return self.db.fetchall(sql, params)

    def get_classic_monsters(self):
        return self.db.fetchall("SELECT * FROM monsters WHERE is_classic = 1 ORDER BY level")

    # === Items ===
    def upsert_item(self, **kwargs):
        self.db.execute("""
            INSERT INTO items (name, name_ko, category, sub_category, level_req, tier,
                stats, set_name, set_name_ko, set_bonus, how_to_obtain, how_to_obtain_ko,
                description, description_ko, image_url, is_tradeable, era)
            VALUES (:name, :name_ko, :category, :sub_category, :level_req, :tier,
                :stats, :set_name, :set_name_ko, :set_bonus, :how_to_obtain, :how_to_obtain_ko,
                :description, :description_ko, :image_url, :is_tradeable, :era)
            ON CONFLICT(name) DO UPDATE SET
                name_ko=excluded.name_ko, category=excluded.category,
                sub_category=excluded.sub_category, level_req=excluded.level_req,
                tier=excluded.tier, stats=excluded.stats, set_name=excluded.set_name,
                set_name_ko=excluded.set_name_ko, set_bonus=excluded.set_bonus,
                how_to_obtain=excluded.how_to_obtain, how_to_obtain_ko=excluded.how_to_obtain_ko,
                description=excluded.description, description_ko=excluded.description_ko,
                image_url=excluded.image_url, is_tradeable=excluded.is_tradeable, era=excluded.era
        """, kwargs)

    def get_item(self, item_id: int):
        return self.db.fetchone("SELECT * FROM items WHERE id = ?", (item_id,))

    def get_all_items(self, category=None, tier=None, set_name=None):
        sql = "SELECT * FROM items WHERE 1=1"
        params = []
        if category:
            sql += " AND category = ?"
            params.append(category)
        if tier:
            sql += " AND tier = ?"
            params.append(tier)
        if set_name:
            sql += " AND set_name = ?"
            params.append(set_name)
        sql += " ORDER BY level_req, name"
        return self.db.fetchall(sql, params)

    def get_item_sets(self):
        return self.db.fetchall(
            "SELECT set_name, set_name_ko, COUNT(*) as piece_count, MIN(level_req) as min_level "
            "FROM items WHERE set_name != '' GROUP BY set_name ORDER BY min_level"
        )

    # === Community ===
    def add_guestbook_entry(self, nickname, message, job_pick=""):
        self.db.execute(
            "INSERT INTO guestbook (nickname, message, job_pick) VALUES (?, ?, ?)",
            (nickname, message, job_pick)
        )
        return self.db.fetchone("SELECT * FROM guestbook ORDER BY id DESC LIMIT 1")

    def get_guestbook(self, limit=50):
        return self.db.fetchall(
            "SELECT * FROM guestbook ORDER BY created_at DESC LIMIT ?", (limit,)
        )

    def increment_visitor_count(self):
        self.db.execute("UPDATE visitor_count SET count = count + 1 WHERE id = 1")
        row = self.db.fetchone("SELECT count FROM visitor_count WHERE id = 1")
        return row["count"] if row else 0

    def vote_item(self, item_type, item_id):
        self.db.execute("""
            INSERT INTO votes (item_type, item_id, votes) VALUES (?, ?, 1)
            ON CONFLICT(item_type, item_id) DO UPDATE SET votes = votes + 1
        """, (item_type, item_id))
        row = self.db.fetchone(
            "SELECT votes FROM votes WHERE item_type = ? AND item_id = ?",
            (item_type, item_id)
        )
        return row["votes"] if row else 0

    def get_votes(self, item_type, limit=50):
        return self.db.fetchall(
            "SELECT * FROM votes WHERE item_type = ? ORDER BY votes DESC LIMIT ?",
            (item_type, limit)
        )

    def get_board_posts(self, limit=20, offset=0):
        return self.db.fetchall(
            "SELECT * FROM board_posts ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )

    def get_board_post_count(self):
        row = self.db.fetchone("SELECT COUNT(*) as cnt FROM board_posts")
        return row["cnt"] if row else 0

    def get_board_post(self, post_id):
        self.db.execute(
            "UPDATE board_posts SET views = views + 1 WHERE id = ?", (post_id,)
        )
        return self.db.fetchone("SELECT * FROM board_posts WHERE id = ?", (post_id,))

    def create_board_post(self, nickname, title, content, job_pick="", ip_hash=""):
        self.db.execute(
            "INSERT INTO board_posts (nickname, title, content, job_pick, ip_hash) VALUES (?, ?, ?, ?, ?)",
            (nickname, title, content, job_pick, ip_hash)
        )
        return self.db.fetchone("SELECT * FROM board_posts ORDER BY id DESC LIMIT 1")

    def get_board_replies(self, post_id):
        return self.db.fetchall(
            "SELECT * FROM board_replies WHERE post_id = ? ORDER BY created_at", (post_id,)
        )

    def create_board_reply(self, post_id, nickname, content, ip_hash=""):
        self.db.execute(
            "INSERT INTO board_replies (post_id, nickname, content, ip_hash) VALUES (?, ?, ?, ?)",
            (post_id, nickname, content, ip_hash)
        )
        return self.db.fetchone("SELECT * FROM board_replies ORDER BY id DESC LIMIT 1")

    def like_board_post(self, post_id):
        self.db.execute("UPDATE board_posts SET likes = likes + 1 WHERE id = ?", (post_id,))
        row = self.db.fetchone("SELECT likes FROM board_posts WHERE id = ?", (post_id,))
        return row["likes"] if row else 0

    def delete_board_post(self, post_id):
        self.db.execute("DELETE FROM board_posts WHERE id = ?", (post_id,))

    # === Relationships ===
    def upsert_relationship(self, **kwargs):
        self.db.execute("""
            INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, description, strength)
            VALUES (:character_a_id, :character_b_id, :relationship_type, :description, :strength)
        """, kwargs)

    # === Crawl Status ===
    def update_crawl_status(self, key, value):
        self.db.execute("""
            INSERT INTO crawl_status (key, value, last_updated)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, last_updated=datetime('now')
        """, (key, value))

    def get_crawl_status(self):
        rows = self.db.fetchall("SELECT * FROM crawl_status")
        return {r["key"]: {"value": r["value"], "updated": r["last_updated"]} for r in rows}

    # === Stats ===
    def get_entity_counts(self):
        tables = ["characters", "story_arcs", "story_events", "worlds", "job_classes", "bosses", "skills", "power_systems", "monsters", "items"]
        counts = {}
        for table in tables:
            row = self.db.fetchone(f"SELECT COUNT(*) as cnt FROM {table}")
            counts[table] = row["cnt"] if row else 0
        return counts

    # === Crawled Mobs ===
    def upsert_crawled_mob(self, **kwargs):
        self.db.execute("""
            INSERT INTO crawled_mobs (mob_id, name, level, max_hp, max_mp, exp,
                physical_damage, physical_defense, magic_damage, magic_defense,
                accuracy, evasion, is_boss, is_undead, description, found_at, image_url)
            VALUES (:mob_id, :name, :level, :max_hp, :max_mp, :exp,
                :physical_damage, :physical_defense, :magic_damage, :magic_defense,
                :accuracy, :evasion, :is_boss, :is_undead, :description, :found_at, :image_url)
            ON CONFLICT(mob_id) DO UPDATE SET
                name=excluded.name, level=excluded.level, max_hp=excluded.max_hp,
                max_mp=excluded.max_mp, exp=excluded.exp,
                physical_damage=excluded.physical_damage, physical_defense=excluded.physical_defense,
                magic_damage=excluded.magic_damage, magic_defense=excluded.magic_defense,
                accuracy=excluded.accuracy, evasion=excluded.evasion,
                is_boss=excluded.is_boss, is_undead=excluded.is_undead,
                description=excluded.description, found_at=excluded.found_at,
                image_url=excluded.image_url, crawled_at=datetime('now')
        """, kwargs)

    def get_crawled_mob(self, mob_id: int):
        return self.db.fetchone("SELECT * FROM crawled_mobs WHERE mob_id = ?", (mob_id,))

    def get_all_crawled_mobs(self, level_min=None, level_max=None, is_boss=None, limit=100, offset=0):
        sql = "SELECT * FROM crawled_mobs WHERE 1=1"
        params = []
        if level_min is not None:
            sql += " AND level >= ?"
            params.append(level_min)
        if level_max is not None:
            sql += " AND level <= ?"
            params.append(level_max)
        if is_boss is not None:
            sql += " AND is_boss = ?"
            params.append(1 if is_boss else 0)
        sql += " ORDER BY level LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return self.db.fetchall(sql, params)

    def get_crawled_mob_count(self):
        row = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_mobs")
        return row["cnt"] if row else 0

    def get_mob_level_distribution(self):
        return self.db.fetchall("""
            SELECT
                CASE
                    WHEN level BETWEEN 0 AND 10 THEN '1-10'
                    WHEN level BETWEEN 11 AND 30 THEN '11-30'
                    WHEN level BETWEEN 31 AND 60 THEN '31-60'
                    WHEN level BETWEEN 61 AND 100 THEN '61-100'
                    WHEN level BETWEEN 101 AND 150 THEN '101-150'
                    WHEN level BETWEEN 151 AND 200 THEN '151-200'
                    WHEN level > 200 THEN '200+'
                    ELSE 'Unknown'
                END as level_range,
                COUNT(*) as count,
                AVG(max_hp) as avg_hp,
                AVG(exp) as avg_exp
            FROM crawled_mobs
            GROUP BY level_range
            ORDER BY MIN(level)
        """)

    def get_mob_hp_exp_data(self):
        return self.db.fetchall(
            "SELECT mob_id, name, level, max_hp, exp, is_boss FROM crawled_mobs WHERE level > 0 ORDER BY level"
        )

    def get_boss_mobs(self):
        return self.db.fetchall(
            "SELECT * FROM crawled_mobs WHERE is_boss = 1 ORDER BY level"
        )

    def search_crawled_mobs(self, query: str, limit=20):
        return self.db.fetchall(
            "SELECT * FROM crawled_mobs WHERE mob_id IN (SELECT rowid FROM crawled_mobs_fts WHERE crawled_mobs_fts MATCH ?) LIMIT ?",
            (query, limit)
        )

    # === Crawled Maps ===
    def upsert_crawled_map(self, **kwargs):
        self.db.execute("""
            INSERT INTO crawled_maps (map_id, name, street_name, image_url)
            VALUES (:map_id, :name, :street_name, :image_url)
            ON CONFLICT(map_id) DO UPDATE SET
                name=excluded.name, street_name=excluded.street_name,
                image_url=excluded.image_url, crawled_at=datetime('now')
        """, kwargs)

    def get_all_crawled_maps(self, street_name=None, limit=100, offset=0):
        sql = "SELECT * FROM crawled_maps WHERE 1=1"
        params = []
        if street_name:
            sql += " AND street_name = ?"
            params.append(street_name)
        sql += " ORDER BY map_id LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return self.db.fetchall(sql, params)

    def get_crawled_map_count(self):
        row = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_maps")
        return row["cnt"] if row else 0

    def get_map_street_distribution(self):
        return self.db.fetchall("""
            SELECT street_name, COUNT(*) as count
            FROM crawled_maps
            WHERE street_name != ''
            GROUP BY street_name
            ORDER BY count DESC
            LIMIT 30
        """)

    def get_mobs_in_map(self, map_id: int):
        return self.db.fetchall(
            "SELECT * FROM crawled_mobs WHERE found_at LIKE ? ORDER BY level",
            (f'%{map_id}%',)
        )

    # === Crawled Items ===
    def upsert_crawled_item(self, **kwargs):
        self.db.execute("""
            INSERT INTO crawled_items (item_id, name, description, overall_category,
                category, sub_category, required_level, required_jobs, is_cash, image_url)
            VALUES (:item_id, :name, :description, :overall_category,
                :category, :sub_category, :required_level, :required_jobs, :is_cash, :image_url)
            ON CONFLICT(item_id) DO UPDATE SET
                name=excluded.name, description=excluded.description,
                overall_category=excluded.overall_category, category=excluded.category,
                sub_category=excluded.sub_category, required_level=excluded.required_level,
                required_jobs=excluded.required_jobs, is_cash=excluded.is_cash,
                image_url=excluded.image_url, crawled_at=datetime('now')
        """, kwargs)

    def get_all_crawled_items(self, overall_category=None, category=None, sub_category=None, limit=100, offset=0):
        sql = "SELECT * FROM crawled_items WHERE 1=1"
        params = []
        if overall_category:
            sql += " AND overall_category = ?"
            params.append(overall_category)
        if category:
            sql += " AND category = ?"
            params.append(category)
        if sub_category:
            sql += " AND sub_category = ?"
            params.append(sub_category)
        sql += " ORDER BY required_level, name LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return self.db.fetchall(sql, params)

    def get_crawled_item_count(self):
        row = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_items")
        return row["cnt"] if row else 0

    def get_item_category_distribution(self):
        return self.db.fetchall("""
            SELECT overall_category, category, sub_category, COUNT(*) as count
            FROM crawled_items
            GROUP BY overall_category, category, sub_category
            ORDER BY count DESC
        """)

    def get_item_level_distribution(self):
        return self.db.fetchall("""
            SELECT
                CASE
                    WHEN required_level = 0 THEN 'No req'
                    WHEN required_level BETWEEN 1 AND 30 THEN '1-30'
                    WHEN required_level BETWEEN 31 AND 60 THEN '31-60'
                    WHEN required_level BETWEEN 61 AND 100 THEN '61-100'
                    WHEN required_level BETWEEN 101 AND 140 THEN '101-140'
                    WHEN required_level BETWEEN 141 AND 200 THEN '141-200'
                    WHEN required_level > 200 THEN '200+'
                    ELSE 'Unknown'
                END as level_range,
                COUNT(*) as count
            FROM crawled_items
            GROUP BY level_range
            ORDER BY MIN(required_level)
        """)

    def search_crawled_items(self, query: str, limit=20):
        return self.db.fetchall(
            "SELECT * FROM crawled_items WHERE item_id IN (SELECT rowid FROM crawled_items_fts WHERE crawled_items_fts MATCH ?) LIMIT ?",
            (query, limit)
        )

    def get_crawled_data_stats(self):
        mob_count = self.get_crawled_mob_count()
        map_count = self.get_crawled_map_count()
        item_count = self.get_crawled_item_count()
        npc_count = self.get_crawled_npc_count()
        quest_count = self.get_crawled_quest_count()
        wiki_count = self.get_wiki_page_count()
        namu_count = self.get_namu_page_count()
        boss_count = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_mobs WHERE is_boss = 1")
        return {
            "mobs": mob_count,
            "maps": map_count,
            "items": item_count,
            "npcs": npc_count,
            "quests": quest_count,
            "wiki_pages": wiki_count,
            "namu_pages": namu_count,
            "bosses": boss_count["cnt"] if boss_count else 0,
        }

    # ── Crawled NPCs ───────────────────────────────
    def upsert_crawled_npc(self, data: dict):
        self.db.execute("""
            INSERT OR REPLACE INTO crawled_npcs
            (npc_id, name, is_shop, is_component_npc, dialogue, found_at, related_quests, image_url, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("npc_id"), data.get("name"),
            data.get("is_shop", 0), data.get("is_component_npc", 0),
            data.get("dialogue"), data.get("found_at"),
            data.get("related_quests"), data.get("image_url"),
            data.get("raw_data")
        ))

    def get_all_crawled_npcs(self, limit=100, offset=0, shop_only=False):
        where = "WHERE is_shop = 1" if shop_only else ""
        return self.db.fetchall(f"""
            SELECT npc_id, name, is_shop, is_component_npc, found_at, related_quests
            FROM crawled_npcs {where}
            ORDER BY npc_id LIMIT ? OFFSET ?
        """, (limit, offset))

    def get_crawled_npc(self, npc_id: int):
        return self.db.fetchone("SELECT * FROM crawled_npcs WHERE npc_id = ?", (npc_id,))

    def get_crawled_npc_count(self):
        r = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_npcs")
        return r["cnt"] if r else 0

    def search_crawled_npcs(self, query: str, limit=50):
        return self.db.fetchall("""
            SELECT n.npc_id, n.name, n.is_shop, n.found_at, n.related_quests
            FROM crawled_npcs_fts f
            JOIN crawled_npcs n ON f.rowid = n.npc_id
            WHERE crawled_npcs_fts MATCH ?
            ORDER BY rank LIMIT ?
        """, (query, limit))

    def get_npc_map_distribution(self):
        return self.db.fetchall("""
            SELECT found_at, COUNT(*) as count FROM crawled_npcs
            WHERE found_at IS NOT NULL AND found_at != '[]'
            GROUP BY found_at ORDER BY count DESC LIMIT 30
        """)

    # ── Crawled Quests ─────────────────────────────
    def upsert_crawled_quest(self, data: dict):
        self.db.execute("""
            INSERT OR REPLACE INTO crawled_quests
            (quest_id, name, area, messages, start_npc_id, end_npc_id,
             required_jobs, required_items, required_quests,
             reward_items, reward_exp, reward_mesos, next_quests, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("quest_id"), data.get("name"), data.get("area"),
            data.get("messages"), data.get("start_npc_id"), data.get("end_npc_id"),
            data.get("required_jobs"), data.get("required_items"),
            data.get("required_quests"), data.get("reward_items"),
            data.get("reward_exp", 0), data.get("reward_mesos", 0),
            data.get("next_quests"), data.get("raw_data")
        ))

    def get_all_crawled_quests(self, limit=100, offset=0):
        return self.db.fetchall("""
            SELECT quest_id, name, area, start_npc_id, end_npc_id
            FROM crawled_quests ORDER BY quest_id LIMIT ? OFFSET ?
        """, (limit, offset))

    def get_crawled_quest(self, quest_id: int):
        return self.db.fetchone("SELECT * FROM crawled_quests WHERE quest_id = ?", (quest_id,))

    def get_crawled_quest_count(self):
        r = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_quests")
        return r["cnt"] if r else 0

    def search_crawled_quests(self, query: str, limit=50):
        return self.db.fetchall("""
            SELECT q.quest_id, q.name, q.area, q.start_npc_id, q.end_npc_id
            FROM crawled_quests_fts f
            JOIN crawled_quests q ON f.rowid = q.quest_id
            WHERE crawled_quests_fts MATCH ?
            ORDER BY rank LIMIT ?
        """, (query, limit))

    def get_quest_area_distribution(self):
        return self.db.fetchall("""
            SELECT area, COUNT(*) as count FROM crawled_quests
            WHERE area IS NOT NULL
            GROUP BY area ORDER BY count DESC LIMIT 30
        """)

    def get_quests_by_npc(self, npc_id: int):
        return self.db.fetchall("""
            SELECT quest_id, name, area FROM crawled_quests
            WHERE start_npc_id = ? OR end_npc_id = ?
            ORDER BY quest_id
        """, (npc_id, npc_id))

    def get_npc_quest_network(self):
        """Get NPC-Quest connections for network graph"""
        return self.db.fetchall("""
            SELECT q.quest_id, q.name as quest_name,
                   q.start_npc_id, sn.name as start_npc_name,
                   q.end_npc_id, en.name as end_npc_name
            FROM crawled_quests q
            LEFT JOIN crawled_npcs sn ON q.start_npc_id = sn.npc_id
            LEFT JOIN crawled_npcs en ON q.end_npc_id = en.npc_id
            WHERE q.start_npc_id IS NOT NULL OR q.end_npc_id IS NOT NULL
            LIMIT 500
        """)

    # ── Crawled Wiki Pages ─────────────────────────
    def upsert_crawled_wiki_page(self, data: dict):
        self.db.execute("""
            INSERT OR REPLACE INTO crawled_wiki_pages
            (page_id, title, category, extract, image_url, page_url, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("page_id"), data.get("title"),
            data.get("category"), data.get("extract"),
            data.get("image_url"), data.get("page_url"),
            data.get("raw_data")
        ))

    def get_all_wiki_pages(self, limit=100, offset=0, category=None):
        if category:
            return self.db.fetchall("""
                SELECT page_id, title, category, image_url, page_url,
                       substr(extract, 1, 200) as extract_preview
                FROM crawled_wiki_pages WHERE category = ?
                ORDER BY title LIMIT ? OFFSET ?
            """, (category, limit, offset))
        return self.db.fetchall("""
            SELECT page_id, title, category, image_url, page_url,
                   substr(extract, 1, 200) as extract_preview
            FROM crawled_wiki_pages ORDER BY title LIMIT ? OFFSET ?
        """, (limit, offset))

    def get_wiki_page(self, page_id: int):
        return self.db.fetchone("SELECT * FROM crawled_wiki_pages WHERE page_id = ?", (page_id,))

    def get_wiki_page_by_title(self, title: str):
        return self.db.fetchone("SELECT * FROM crawled_wiki_pages WHERE title = ?", (title,))

    def get_wiki_page_count(self, category=None):
        if category:
            r = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_wiki_pages WHERE category = ?", (category,))
        else:
            r = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_wiki_pages")
        return r["cnt"] if r else 0

    def search_wiki_pages(self, query: str, limit=50):
        return self.db.fetchall("""
            SELECT w.page_id, w.title, w.category, w.image_url, w.page_url,
                   substr(w.extract, 1, 200) as extract_preview
            FROM crawled_wiki_fts f
            JOIN crawled_wiki_pages w ON f.rowid = w.page_id
            WHERE crawled_wiki_fts MATCH ?
            ORDER BY rank LIMIT ?
        """, (query, limit))

    def get_wiki_categories(self):
        return self.db.fetchall("""
            SELECT category, COUNT(*) as count
            FROM crawled_wiki_pages
            WHERE category IS NOT NULL
            GROUP BY category ORDER BY count DESC
        """)

    # ── Crawled Namu Wiki Pages ────────────────────
    def upsert_crawled_namu_page(self, data: dict):
        self.db.execute("""
            INSERT INTO crawled_namu_pages (title, category, summary, content, source_name)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(title) DO UPDATE SET
                category=excluded.category, summary=excluded.summary,
                content=excluded.content, source_name=excluded.source_name,
                crawled_at=CURRENT_TIMESTAMP
        """, (
            data.get("title"), data.get("category", ""),
            data.get("summary", ""), data.get("content", ""),
            data.get("source_name", ""),
        ))

    def get_all_namu_pages(self, limit=100, offset=0, category=None):
        if category:
            return self.db.fetchall("""
                SELECT id, title, category, substr(summary, 1, 200) as summary_preview, source_name
                FROM crawled_namu_pages WHERE category = ?
                ORDER BY title LIMIT ? OFFSET ?
            """, (category, limit, offset))
        return self.db.fetchall("""
            SELECT id, title, category, substr(summary, 1, 200) as summary_preview, source_name
            FROM crawled_namu_pages ORDER BY title LIMIT ? OFFSET ?
        """, (limit, offset))

    def get_namu_page(self, page_id: int):
        return self.db.fetchone("SELECT * FROM crawled_namu_pages WHERE id = ?", (page_id,))

    def get_namu_page_by_title(self, title: str):
        return self.db.fetchone("SELECT * FROM crawled_namu_pages WHERE title = ?", (title,))

    def get_namu_page_count(self, category=None):
        if category:
            r = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_namu_pages WHERE category = ?", (category,))
        else:
            r = self.db.fetchone("SELECT COUNT(*) as cnt FROM crawled_namu_pages")
        return r["cnt"] if r else 0

    def search_namu_pages(self, query: str, limit=50):
        return self.db.fetchall("""
            SELECT n.id, n.title, n.category, substr(n.summary, 1, 200) as summary_preview
            FROM crawled_namu_fts f
            JOIN crawled_namu_pages n ON f.rowid = n.id
            WHERE crawled_namu_fts MATCH ?
            ORDER BY rank LIMIT ?
        """, (query, limit))

    def get_namu_categories(self):
        return self.db.fetchall("""
            SELECT category, COUNT(*) as count
            FROM crawled_namu_pages
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category ORDER BY count DESC
        """)
