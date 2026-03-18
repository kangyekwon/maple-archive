-- MapleStory Archive Schema

-- Characters (Heroes, Commanders, NPCs, Transcendents)
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    role TEXT DEFAULT 'npc',
    faction TEXT DEFAULT '',
    class_name TEXT DEFAULT '',
    title TEXT DEFAULT '',
    backstory TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    wiki_url TEXT DEFAULT '',
    is_playable INTEGER DEFAULT 0,
    power_level TEXT DEFAULT '',
    first_appearance TEXT DEFAULT '',
    voice_actor TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Story Arcs
CREATE TABLE IF NOT EXISTS story_arcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    saga TEXT DEFAULT 'black_mage',
    description TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    level_range TEXT DEFAULT '',
    key_characters TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Story Events (Timeline)
CREATE TABLE IF NOT EXISTS story_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arc_id INTEGER,
    title TEXT NOT NULL,
    title_ko TEXT,
    description TEXT DEFAULT '',
    era TEXT DEFAULT 'ancient',
    chronological_order INTEGER DEFAULT 0,
    year_in_lore TEXT DEFAULT '',
    key_characters TEXT DEFAULT '',
    location TEXT DEFAULT '',
    significance TEXT DEFAULT 'major',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (arc_id) REFERENCES story_arcs(id)
);

-- Character Relationships (D3 graph edges)
CREATE TABLE IF NOT EXISTS character_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_a_id INTEGER NOT NULL,
    character_b_id INTEGER NOT NULL,
    relationship_type TEXT NOT NULL,
    description TEXT DEFAULT '',
    strength INTEGER DEFAULT 5,
    FOREIGN KEY (character_a_id) REFERENCES characters(id),
    FOREIGN KEY (character_b_id) REFERENCES characters(id)
);
CREATE INDEX IF NOT EXISTS idx_rel_a ON character_relationships(character_a_id);
CREATE INDEX IF NOT EXISTS idx_rel_b ON character_relationships(character_b_id);

-- Worlds / Maps
CREATE TABLE IF NOT EXISTS worlds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    parent_world TEXT DEFAULT '',
    region TEXT DEFAULT '',
    description TEXT DEFAULT '',
    level_range TEXT DEFAULT '',
    arcane_force INTEGER DEFAULT 0,
    sacred_force INTEGER DEFAULT 0,
    lat REAL DEFAULT 0.0,
    lng REAL DEFAULT 0.0,
    altitude REAL DEFAULT 0.0,
    image_url TEXT DEFAULT '',
    connected_worlds TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Job Classes
CREATE TABLE IF NOT EXISTS job_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    branch TEXT DEFAULT 'explorer',
    class_type TEXT DEFAULT 'warrior',
    main_stat TEXT DEFAULT 'STR',
    weapon_type TEXT DEFAULT '',
    description TEXT DEFAULT '',
    lore TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    release_date TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Job Advancements
CREATE TABLE IF NOT EXISTS job_advancements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_class_id INTEGER NOT NULL,
    advancement_level INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_ko TEXT,
    level_required INTEGER DEFAULT 10,
    description TEXT DEFAULT '',
    FOREIGN KEY (job_class_id) REFERENCES job_classes(id)
);
CREATE INDEX IF NOT EXISTS idx_adv_job ON job_advancements(job_class_id);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_ko TEXT,
    skill_type TEXT DEFAULT 'active',
    advancement_level INTEGER DEFAULT 1,
    max_level INTEGER DEFAULT 20,
    description TEXT DEFAULT '',
    damage_percent INTEGER DEFAULT 0,
    cooldown REAL DEFAULT 0.0,
    icon_url TEXT DEFAULT '',
    FOREIGN KEY (job_class_id) REFERENCES job_classes(id)
);
CREATE INDEX IF NOT EXISTS idx_skill_job ON skills(job_class_id);

-- Bosses
CREATE TABLE IF NOT EXISTS bosses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    difficulty TEXT DEFAULT 'normal',
    level_required INTEGER DEFAULT 0,
    hp_estimate TEXT DEFAULT '',
    mechanics TEXT DEFAULT '',
    rewards TEXT DEFAULT '',
    story_significance TEXT DEFAULT '',
    related_arc_id INTEGER,
    location TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    entry_limit TEXT DEFAULT '',
    party_size INTEGER DEFAULT 6,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (related_arc_id) REFERENCES story_arcs(id)
);

-- Power Systems
CREATE TABLE IF NOT EXISTS power_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    category TEXT DEFAULT 'general',
    description TEXT DEFAULT '',
    unlock_level INTEGER DEFAULT 0,
    max_level TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Monsters
CREATE TABLE IF NOT EXISTS monsters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    level INTEGER DEFAULT 1,
    hp INTEGER DEFAULT 100,
    exp INTEGER DEFAULT 10,
    location TEXT DEFAULT '',
    location_ko TEXT DEFAULT '',
    world TEXT DEFAULT 'Maple World',
    category TEXT DEFAULT 'normal',
    element TEXT DEFAULT '',
    drops TEXT DEFAULT '',
    description TEXT DEFAULT '',
    description_ko TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    is_classic INTEGER DEFAULT 0,
    first_appeared TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_monster_level ON monsters(level);
CREATE INDEX IF NOT EXISTS idx_monster_category ON monsters(category);
CREATE INDEX IF NOT EXISTS idx_monster_world ON monsters(world);

-- Items / Equipment
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ko TEXT,
    category TEXT DEFAULT 'etc_item',
    sub_category TEXT DEFAULT '',
    level_req INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'common',
    stats TEXT DEFAULT '',
    set_name TEXT DEFAULT '',
    set_name_ko TEXT DEFAULT '',
    set_bonus TEXT DEFAULT '',
    how_to_obtain TEXT DEFAULT '',
    how_to_obtain_ko TEXT DEFAULT '',
    description TEXT DEFAULT '',
    description_ko TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    is_tradeable INTEGER DEFAULT 1,
    era TEXT DEFAULT 'classic',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_item_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_item_tier ON items(tier);

-- Crawl status
CREATE TABLE IF NOT EXISTS crawl_status (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now'))
);

-- Community: Guestbook
CREATE TABLE IF NOT EXISTS guestbook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    message TEXT NOT NULL,
    job_pick TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Community: Visitor count
CREATE TABLE IF NOT EXISTS visitor_count (
    id INTEGER PRIMARY KEY,
    count INTEGER DEFAULT 0
);
INSERT OR IGNORE INTO visitor_count (id, count) VALUES (1, 0);

-- Community: Votes
CREATE TABLE IF NOT EXISTS votes (
    item_type TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    votes INTEGER DEFAULT 0,
    PRIMARY KEY (item_type, item_id)
);

-- Community: Board posts
CREATE TABLE IF NOT EXISTS board_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    job_pick TEXT DEFAULT '',
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    ip_hash TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_board_created ON board_posts(created_at DESC);

-- Community: Board replies
CREATE TABLE IF NOT EXISTS board_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    nickname TEXT NOT NULL,
    content TEXT NOT NULL,
    ip_hash TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_replies_post ON board_replies(post_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_char_role ON characters(role);
CREATE INDEX IF NOT EXISTS idx_char_faction ON characters(faction);
CREATE INDEX IF NOT EXISTS idx_arc_saga ON story_arcs(saga);
CREATE INDEX IF NOT EXISTS idx_event_era ON story_events(era);
CREATE INDEX IF NOT EXISTS idx_event_arc ON story_events(arc_id);
CREATE INDEX IF NOT EXISTS idx_world_parent ON worlds(parent_world);
CREATE INDEX IF NOT EXISTS idx_job_branch ON job_classes(branch);
CREATE INDEX IF NOT EXISTS idx_job_type ON job_classes(class_type);
CREATE INDEX IF NOT EXISTS idx_boss_difficulty ON bosses(difficulty);

-- FTS5: Characters search
CREATE VIRTUAL TABLE IF NOT EXISTS characters_fts USING fts5(
    name, name_ko, role, faction, backstory, title,
    content='characters', content_rowid='id',
    tokenize='unicode61'
);

-- FTS5: Story arcs search
CREATE VIRTUAL TABLE IF NOT EXISTS story_arcs_fts USING fts5(
    name, name_ko, saga, description,
    content='story_arcs', content_rowid='id',
    tokenize='unicode61'
);

-- FTS5: Worlds search
CREATE VIRTUAL TABLE IF NOT EXISTS worlds_fts USING fts5(
    name, name_ko, parent_world, region, description,
    content='worlds', content_rowid='id',
    tokenize='unicode61'
);

-- FTS5: Job classes search
CREATE VIRTUAL TABLE IF NOT EXISTS job_classes_fts USING fts5(
    name, name_ko, branch, class_type, description,
    content='job_classes', content_rowid='id',
    tokenize='unicode61'
);

-- FTS5: Bosses search
CREATE VIRTUAL TABLE IF NOT EXISTS bosses_fts USING fts5(
    name, name_ko, difficulty, mechanics, story_significance,
    content='bosses', content_rowid='id',
    tokenize='unicode61'
);

-- FTS triggers: Characters
CREATE TRIGGER IF NOT EXISTS characters_ai AFTER INSERT ON characters BEGIN
    INSERT INTO characters_fts(rowid, name, name_ko, role, faction, backstory, title)
    VALUES (new.id, new.name, new.name_ko, new.role, new.faction, new.backstory, new.title);
END;
CREATE TRIGGER IF NOT EXISTS characters_ad AFTER DELETE ON characters BEGIN
    INSERT INTO characters_fts(characters_fts, rowid, name, name_ko, role, faction, backstory, title)
    VALUES ('delete', old.id, old.name, old.name_ko, old.role, old.faction, old.backstory, old.title);
END;
CREATE TRIGGER IF NOT EXISTS characters_au AFTER UPDATE ON characters BEGIN
    INSERT INTO characters_fts(characters_fts, rowid, name, name_ko, role, faction, backstory, title)
    VALUES ('delete', old.id, old.name, old.name_ko, old.role, old.faction, old.backstory, old.title);
    INSERT INTO characters_fts(rowid, name, name_ko, role, faction, backstory, title)
    VALUES (new.id, new.name, new.name_ko, new.role, new.faction, new.backstory, new.title);
END;

-- FTS triggers: Story arcs
CREATE TRIGGER IF NOT EXISTS story_arcs_ai AFTER INSERT ON story_arcs BEGIN
    INSERT INTO story_arcs_fts(rowid, name, name_ko, saga, description)
    VALUES (new.id, new.name, new.name_ko, new.saga, new.description);
END;
CREATE TRIGGER IF NOT EXISTS story_arcs_ad AFTER DELETE ON story_arcs BEGIN
    INSERT INTO story_arcs_fts(story_arcs_fts, rowid, name, name_ko, saga, description)
    VALUES ('delete', old.id, old.name, old.name_ko, old.saga, old.description);
END;
CREATE TRIGGER IF NOT EXISTS story_arcs_au AFTER UPDATE ON story_arcs BEGIN
    INSERT INTO story_arcs_fts(story_arcs_fts, rowid, name, name_ko, saga, description)
    VALUES ('delete', old.id, old.name, old.name_ko, old.saga, old.description);
    INSERT INTO story_arcs_fts(rowid, name, name_ko, saga, description)
    VALUES (new.id, new.name, new.name_ko, new.saga, new.description);
END;

-- FTS triggers: Worlds
CREATE TRIGGER IF NOT EXISTS worlds_ai AFTER INSERT ON worlds BEGIN
    INSERT INTO worlds_fts(rowid, name, name_ko, parent_world, region, description)
    VALUES (new.id, new.name, new.name_ko, new.parent_world, new.region, new.description);
END;
CREATE TRIGGER IF NOT EXISTS worlds_ad AFTER DELETE ON worlds BEGIN
    INSERT INTO worlds_fts(worlds_fts, rowid, name, name_ko, parent_world, region, description)
    VALUES ('delete', old.id, old.name, old.name_ko, old.parent_world, old.region, old.description);
END;
CREATE TRIGGER IF NOT EXISTS worlds_au AFTER UPDATE ON worlds BEGIN
    INSERT INTO worlds_fts(worlds_fts, rowid, name, name_ko, parent_world, region, description)
    VALUES ('delete', old.id, old.name, old.name_ko, old.parent_world, old.region, old.description);
    INSERT INTO worlds_fts(rowid, name, name_ko, parent_world, region, description)
    VALUES (new.id, new.name, new.name_ko, new.parent_world, new.region, new.description);
END;

-- FTS triggers: Job classes
CREATE TRIGGER IF NOT EXISTS job_classes_ai AFTER INSERT ON job_classes BEGIN
    INSERT INTO job_classes_fts(rowid, name, name_ko, branch, class_type, description)
    VALUES (new.id, new.name, new.name_ko, new.branch, new.class_type, new.description);
END;
CREATE TRIGGER IF NOT EXISTS job_classes_ad AFTER DELETE ON job_classes BEGIN
    INSERT INTO job_classes_fts(job_classes_fts, rowid, name, name_ko, branch, class_type, description)
    VALUES ('delete', old.id, old.name, old.name_ko, old.branch, old.class_type, old.description);
END;
CREATE TRIGGER IF NOT EXISTS job_classes_au AFTER UPDATE ON job_classes BEGIN
    INSERT INTO job_classes_fts(job_classes_fts, rowid, name, name_ko, branch, class_type, description)
    VALUES ('delete', old.id, old.name, old.name_ko, old.branch, old.class_type, old.description);
    INSERT INTO job_classes_fts(rowid, name, name_ko, branch, class_type, description)
    VALUES (new.id, new.name, new.name_ko, new.branch, new.class_type, new.description);
END;

-- FTS triggers: Bosses
CREATE TRIGGER IF NOT EXISTS bosses_ai AFTER INSERT ON bosses BEGIN
    INSERT INTO bosses_fts(rowid, name, name_ko, difficulty, mechanics, story_significance)
    VALUES (new.id, new.name, new.name_ko, new.difficulty, new.mechanics, new.story_significance);
END;
CREATE TRIGGER IF NOT EXISTS bosses_ad AFTER DELETE ON bosses BEGIN
    INSERT INTO bosses_fts(bosses_fts, rowid, name, name_ko, difficulty, mechanics, story_significance)
    VALUES ('delete', old.id, old.name, old.name_ko, old.difficulty, old.mechanics, old.story_significance);
END;
CREATE TRIGGER IF NOT EXISTS bosses_au AFTER UPDATE ON bosses BEGIN
    INSERT INTO bosses_fts(bosses_fts, rowid, name, name_ko, difficulty, mechanics, story_significance)
    VALUES ('delete', old.id, old.name, old.name_ko, old.difficulty, old.mechanics, old.story_significance);
    INSERT INTO bosses_fts(rowid, name, name_ko, difficulty, mechanics, story_significance)
    VALUES (new.id, new.name, new.name_ko, new.difficulty, new.mechanics, new.story_significance);
END;

-- FTS5: Monsters search
CREATE VIRTUAL TABLE IF NOT EXISTS monsters_fts USING fts5(
    name, name_ko, location, description, category,
    content='monsters', content_rowid='id',
    tokenize='unicode61'
);

-- FTS triggers: Monsters
CREATE TRIGGER IF NOT EXISTS monsters_ai AFTER INSERT ON monsters BEGIN
    INSERT INTO monsters_fts(rowid, name, name_ko, location, description, category)
    VALUES (new.id, new.name, new.name_ko, new.location, new.description, new.category);
END;
CREATE TRIGGER IF NOT EXISTS monsters_ad AFTER DELETE ON monsters BEGIN
    INSERT INTO monsters_fts(monsters_fts, rowid, name, name_ko, location, description, category)
    VALUES ('delete', old.id, old.name, old.name_ko, old.location, old.description, old.category);
END;
CREATE TRIGGER IF NOT EXISTS monsters_au AFTER UPDATE ON monsters BEGIN
    INSERT INTO monsters_fts(monsters_fts, rowid, name, name_ko, location, description, category)
    VALUES ('delete', old.id, old.name, old.name_ko, old.location, old.description, old.category);
    INSERT INTO monsters_fts(rowid, name, name_ko, location, description, category)
    VALUES (new.id, new.name, new.name_ko, new.location, new.description, new.category);
END;

-- FTS5: Items search
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    name, name_ko, category, description, set_name,
    content='items', content_rowid='id',
    tokenize='unicode61'
);

-- FTS triggers: Items
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, name, name_ko, category, description, set_name)
    VALUES (new.id, new.name, new.name_ko, new.category, new.description, new.set_name);
END;
CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, name_ko, category, description, set_name)
    VALUES ('delete', old.id, old.name, old.name_ko, old.category, old.description, old.set_name);
END;
CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, name_ko, category, description, set_name)
    VALUES ('delete', old.id, old.name, old.name_ko, old.category, old.description, old.set_name);
    INSERT INTO items_fts(rowid, name, name_ko, category, description, set_name)
    VALUES (new.id, new.name, new.name_ko, new.category, new.description, new.set_name);
END;

-- ============================================================
-- Crawled Data Tables (MapleStory.io)
-- ============================================================

-- Crawled mobs
CREATE TABLE IF NOT EXISTS crawled_mobs (
    mob_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 0,
    max_hp INTEGER DEFAULT 0,
    max_mp INTEGER DEFAULT 0,
    exp INTEGER DEFAULT 0,
    physical_damage INTEGER DEFAULT 0,
    physical_defense INTEGER DEFAULT 0,
    magic_damage INTEGER DEFAULT 0,
    magic_defense INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 0,
    evasion INTEGER DEFAULT 0,
    is_boss INTEGER DEFAULT 0,
    is_undead INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    found_at TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    crawled_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cmob_level ON crawled_mobs(level);
CREATE INDEX IF NOT EXISTS idx_cmob_boss ON crawled_mobs(is_boss);

-- Crawled maps
CREATE TABLE IF NOT EXISTS crawled_maps (
    map_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    street_name TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    crawled_at TEXT DEFAULT (datetime('now'))
);

-- Crawled items (equipment)
CREATE TABLE IF NOT EXISTS crawled_items (
    item_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    overall_category TEXT DEFAULT '',
    category TEXT DEFAULT '',
    sub_category TEXT DEFAULT '',
    required_level INTEGER DEFAULT 0,
    required_jobs TEXT DEFAULT '',
    is_cash INTEGER DEFAULT 0,
    image_url TEXT DEFAULT '',
    crawled_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_citem_cat ON crawled_items(overall_category);
CREATE INDEX IF NOT EXISTS idx_citem_subcat ON crawled_items(sub_category);
CREATE INDEX IF NOT EXISTS idx_citem_level ON crawled_items(required_level);

-- FTS5 for crawled mobs
CREATE VIRTUAL TABLE IF NOT EXISTS crawled_mobs_fts USING fts5(
    name, description,
    content='crawled_mobs', content_rowid='mob_id',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS crawled_mobs_ai AFTER INSERT ON crawled_mobs BEGIN
    INSERT INTO crawled_mobs_fts(rowid, name, description)
    VALUES (new.mob_id, new.name, new.description);
END;
CREATE TRIGGER IF NOT EXISTS crawled_mobs_ad AFTER DELETE ON crawled_mobs BEGIN
    INSERT INTO crawled_mobs_fts(crawled_mobs_fts, rowid, name, description)
    VALUES ('delete', old.mob_id, old.name, old.description);
END;

-- FTS5 for crawled items
CREATE VIRTUAL TABLE IF NOT EXISTS crawled_items_fts USING fts5(
    name, description, category, sub_category,
    content='crawled_items', content_rowid='item_id',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS crawled_items_ai AFTER INSERT ON crawled_items BEGIN
    INSERT INTO crawled_items_fts(rowid, name, description, category, sub_category)
    VALUES (new.item_id, new.name, new.description, new.category, new.sub_category);
END;
CREATE TRIGGER IF NOT EXISTS crawled_items_ad AFTER DELETE ON crawled_items BEGIN
    INSERT INTO crawled_items_fts(crawled_items_fts, rowid, name, description, category, sub_category)
    VALUES ('delete', old.item_id, old.name, old.description, old.category, old.sub_category);
END;

-- ============================================================
-- Crawled NPCs
-- ============================================================
CREATE TABLE IF NOT EXISTS crawled_npcs (
    npc_id INTEGER PRIMARY KEY,
    name TEXT,
    is_shop INTEGER DEFAULT 0,
    is_component_npc INTEGER DEFAULT 0,
    dialogue TEXT,
    found_at TEXT,
    related_quests TEXT,
    image_url TEXT,
    raw_data TEXT,
    crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cnpc_shop ON crawled_npcs(is_shop);

CREATE VIRTUAL TABLE IF NOT EXISTS crawled_npcs_fts USING fts5(
    name, dialogue,
    content='crawled_npcs', content_rowid='npc_id'
);

CREATE TRIGGER IF NOT EXISTS crawled_npcs_ai AFTER INSERT ON crawled_npcs BEGIN
    INSERT INTO crawled_npcs_fts(rowid, name, dialogue) VALUES (new.npc_id, new.name, new.dialogue);
END;
CREATE TRIGGER IF NOT EXISTS crawled_npcs_ad AFTER DELETE ON crawled_npcs BEGIN
    INSERT INTO crawled_npcs_fts(crawled_npcs_fts, rowid, name, dialogue) VALUES ('delete', old.npc_id, old.name, old.dialogue);
END;

-- ============================================================
-- Crawled Quests
-- ============================================================
CREATE TABLE IF NOT EXISTS crawled_quests (
    quest_id INTEGER PRIMARY KEY,
    name TEXT,
    area INTEGER,
    messages TEXT,
    start_npc_id INTEGER,
    end_npc_id INTEGER,
    required_jobs TEXT,
    required_items TEXT,
    required_quests TEXT,
    reward_items TEXT,
    reward_exp INTEGER DEFAULT 0,
    reward_mesos INTEGER DEFAULT 0,
    next_quests TEXT,
    raw_data TEXT,
    crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cquest_area ON crawled_quests(area);
CREATE INDEX IF NOT EXISTS idx_cquest_start_npc ON crawled_quests(start_npc_id);
CREATE INDEX IF NOT EXISTS idx_cquest_end_npc ON crawled_quests(end_npc_id);

CREATE VIRTUAL TABLE IF NOT EXISTS crawled_quests_fts USING fts5(
    name, messages,
    content='crawled_quests', content_rowid='quest_id'
);

CREATE TRIGGER IF NOT EXISTS crawled_quests_ai AFTER INSERT ON crawled_quests BEGIN
    INSERT INTO crawled_quests_fts(rowid, name, messages) VALUES (new.quest_id, new.name, new.messages);
END;
CREATE TRIGGER IF NOT EXISTS crawled_quests_ad AFTER DELETE ON crawled_quests BEGIN
    INSERT INTO crawled_quests_fts(crawled_quests_fts, rowid, name, messages) VALUES ('delete', old.quest_id, old.name, old.messages);
END;

-- ============================================================
-- Crawled Wiki Pages (Fandom)
-- ============================================================
CREATE TABLE IF NOT EXISTS crawled_wiki_pages (
    page_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    extract TEXT,
    image_url TEXT,
    page_url TEXT,
    raw_data TEXT,
    crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cwiki_category ON crawled_wiki_pages(category);
CREATE INDEX IF NOT EXISTS idx_cwiki_title ON crawled_wiki_pages(title);

CREATE VIRTUAL TABLE IF NOT EXISTS crawled_wiki_fts USING fts5(
    title, extract, category,
    content='crawled_wiki_pages', content_rowid='page_id'
);

CREATE TRIGGER IF NOT EXISTS crawled_wiki_ai AFTER INSERT ON crawled_wiki_pages BEGIN
    INSERT INTO crawled_wiki_fts(rowid, title, extract, category) VALUES (new.page_id, new.title, new.extract, new.category);
END;
CREATE TRIGGER IF NOT EXISTS crawled_wiki_ad AFTER DELETE ON crawled_wiki_pages BEGIN
    INSERT INTO crawled_wiki_fts(crawled_wiki_fts, rowid, title, extract, category) VALUES ('delete', old.page_id, old.title, old.extract, old.category);
END;
