"""
MapleStory Archive - Image Coverage Update Script
Task 1: Boss images (from crawled_mobs + wiki + maplestory.io URL pattern)
Task 2: Character images (from crawled_npcs + wiki + mobs)
Task 3: Wiki page image enrichment (match titles to mobs/npcs)
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "maple.db")

MOB_IMG_URL = "https://maplestory.io/api/GMS/62/mob/{mob_id}/render/stand"
NPC_IMG_URL = "https://maplestory.io/api/GMS/62/npc/{npc_id}/render/stand"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ============================================================
# TASK 1: Boss Images
# ============================================================
def update_boss_images(conn):
    print("=" * 60)
    print("TASK 1: Updating Boss Images")
    print("=" * 60)

    # Known boss mob IDs (these may not be in crawled_mobs but
    # maplestory.io API can still serve the images)
    BOSS_MOB_IDS = {
        "Zakum": 8800002,
        "Horntail": 8810018,
        "Hilla": 8840000,
        "Pink Bean": 8820001,
        "Von Leon": 8840004,
        "Arkarium": 8860000,
        "Magnus": 8880000,
        "Lotus": 8880100,
        "Damien": 8880140,
        "Lucid": 8880200,
        "Will": 8880300,
        "Gloom": 8880400,
        "Verus Hilla": 8880500,
        "Darknell": 8880501,
        "Black Mage": 8880600,
        "Seren": 8880700,
        "Kalos": 8880800,
        "Kaling": 8880900,
        "Cygnus": 8850002,  # Empress Cygnus boss form
    }

    # Wiki page mappings for bosses (page_id -> image_url from crawled_wiki_pages)
    BOSS_WIKI_SEARCH = {
        "Hilla": ["Hilla/Monster", "Hilla"],
        "Magnus": ["Magnus/Monster"],
        "Damien": ["Damien/Monster"],
        "Lucid": ["Lucid/Monster"],
        "Will": ["Will/Monster"],
        "Orchid": ["Orchid/Monster"],
        "Lotus": ["Lotus/Monster"],
        "Black Mage": ["Black Mage/Monster", "Black Mage"],
        "Cygnus": ["Cygnus/Monster", "Cygnus"],
        "Arkarium": ["Arkarium/Monster", "Arkarium"],
        "Verus Hilla": ["Hilla/Monster (Reborn)"],
        "Darknell": ["Guard Captain Darknell/Monster", "Guard Captain Darknell"],
    }

    bosses = conn.execute("SELECT id, name, name_ko, image_url FROM bosses").fetchall()
    updated = 0
    results = []

    for boss in bosses:
        boss_name = boss["name"]
        boss_id = boss["id"]
        current_img = boss["image_url"]

        if current_img:
            results.append(f"  [SKIP] {boss_name}: already has image")
            continue

        image_url = None
        source = ""

        # Strategy 1: Check if mob_id exists in crawled_mobs
        if boss_name in BOSS_MOB_IDS:
            mob_id = BOSS_MOB_IDS[boss_name]
            row = conn.execute(
                "SELECT image_url FROM crawled_mobs WHERE mob_id = ?", (mob_id,)
            ).fetchone()
            if row and row["image_url"]:
                image_url = row["image_url"]
                source = f"crawled_mobs (mob_id={mob_id})"

        # Strategy 2: Search crawled_mobs by name
        if not image_url:
            row = conn.execute(
                "SELECT mob_id, image_url FROM crawled_mobs WHERE name = ? AND is_boss = 1",
                (boss_name,),
            ).fetchone()
            if row and row["image_url"]:
                image_url = row["image_url"]
                source = f"crawled_mobs name match (mob_id={row['mob_id']})"

        # Strategy 3: Search wiki pages for boss-specific pages
        if not image_url and boss_name in BOSS_WIKI_SEARCH:
            for wiki_title in BOSS_WIKI_SEARCH[boss_name]:
                row = conn.execute(
                    "SELECT image_url FROM crawled_wiki_pages WHERE title = ? AND image_url IS NOT NULL AND image_url != ''",
                    (wiki_title,),
                ).fetchone()
                if row and row["image_url"]:
                    image_url = row["image_url"]
                    source = f"wiki '{wiki_title}'"
                    break

        # Strategy 4: Search wiki pages by boss name
        if not image_url:
            row = conn.execute(
                "SELECT title, image_url FROM crawled_wiki_pages WHERE title = ? AND image_url IS NOT NULL AND image_url != ''",
                (boss_name,),
            ).fetchone()
            if row and row["image_url"]:
                image_url = row["image_url"]
                source = f"wiki exact '{row['title']}'"

        # Strategy 5: Construct maplestory.io URL directly using known mob IDs
        if not image_url and boss_name in BOSS_MOB_IDS:
            mob_id = BOSS_MOB_IDS[boss_name]
            image_url = MOB_IMG_URL.format(mob_id=mob_id)
            source = f"constructed URL (mob_id={mob_id})"

        if image_url:
            conn.execute(
                "UPDATE bosses SET image_url = ? WHERE id = ?",
                (image_url, boss_id),
            )
            updated += 1
            results.append(f"  [OK] {boss_name}: {source}")
        else:
            results.append(f"  [MISS] {boss_name}: no image found")

    conn.commit()
    for r in results:
        print(r)
    print(f"\nBoss images updated: {updated}/{len(bosses)}")
    return updated


# ============================================================
# TASK 2: Character Images
# ============================================================
def update_character_images(conn):
    print("\n" + "=" * 60)
    print("TASK 2: Updating Character Images")
    print("=" * 60)

    # Known NPC IDs for characters that ARE NPCs in the game
    # These are the actual in-game NPC IDs
    CHAR_NPC_IDS = {
        "Athena Pierce": 1012100,
        "Grendel the Really Old": 1032001,
        "Dark Lord": 1052001,
        "Maple Administrator": 9010000,
    }

    # Wiki page titles that correspond to characters (class pages with images)
    CHAR_WIKI_TITLES = {
        "Mercedes": "Mercedes",
        "Aran": "Aran",
        "Evan": "Evan",
        "Luminous": "Luminous",
        "Phantom": "Phantom",
        "Shade": "Shade",
        "Hilla": "Hilla",
        "Magnus": "Magnus/Monster",
        "Arkarium": "Arkarium",
        "Von Leon": None,  # search needed
        "Damien": "Damien",
        "Lucid": "Lucid/Monster",
        "Will": "Will/Monster",
        "Verus Hilla": "Hilla/Monster (Reborn)",
        "Orchid": None,
        "Lotus": "Lotus/Monster",
        "Black Mage": "Black Mage",
        "Rhinne": None,
        "Alicia": None,
        "Darmoor": None,
        "Aeona": None,
        "Empress Cygnus": "Cygnus",
        "Neinheart": None,
        "Claudine": None,
        "Alpha": None,
        "Beta": None,
        "Gelimer": None,
        "Francis": None,
        "Eleanor": None,
        "Edea": None,
        "Lily": None,
        "Checky": None,
        "Sugar": None,
        "Kain": "Kain",
        "Lara": "Lara",
        "Adele": "Adele",
        "Illium": "Illium",
        "Ark": "Ark",
        "Hoyoung": "Hoyoung",
        "Zero": "Zero",
        "Demon Slayer": "Demon Slayer",
        "Demon Avenger": None,
        "Xenon": "Xenon",
        "Kaiser": "Kaiser",
        "Angelic Buster": "Angelic Buster",
        "Cadena": "Cadena",
    }

    # Boss mob IDs for characters that are also bosses
    CHAR_AS_BOSS_MOB = {
        "Hilla": 8840000,
        "Magnus": 8880000,
        "Arkarium": 8860000,
        "Von Leon": 8840004,
        "Damien": 8880140,
        "Lucid": 8880200,
        "Will": 8880300,
        "Verus Hilla": 8880500,
        "Orchid": None,
        "Lotus": 8880100,
        "Black Mage": 8880600,
    }

    characters = conn.execute(
        "SELECT id, name, name_ko, image_url FROM characters"
    ).fetchall()
    updated = 0
    results = []

    for char in characters:
        char_name = char["name"]
        char_id = char["id"]
        current_img = char["image_url"]

        if current_img:
            results.append(f"  [SKIP] {char_name}: already has image")
            continue

        image_url = None
        source = ""

        # Strategy 1: Known NPC ID match
        if char_name in CHAR_NPC_IDS:
            npc_id = CHAR_NPC_IDS[char_name]
            image_url = NPC_IMG_URL.format(npc_id=npc_id)
            source = f"known NPC (npc_id={npc_id})"

        # Strategy 2: Exact NPC name match in crawled_npcs
        if not image_url:
            row = conn.execute(
                "SELECT npc_id, name, image_url FROM crawled_npcs WHERE name = ?",
                (char_name,),
            ).fetchone()
            if row:
                # Use render/stand instead of icon for better quality
                npc_id = row["npc_id"]
                image_url = NPC_IMG_URL.format(npc_id=npc_id)
                source = f"crawled_npcs exact match (npc_id={npc_id})"

        # Strategy 3: Wiki page with image
        if not image_url:
            wiki_title = CHAR_WIKI_TITLES.get(char_name)
            if wiki_title:
                row = conn.execute(
                    "SELECT image_url FROM crawled_wiki_pages WHERE title = ? AND image_url IS NOT NULL AND image_url != ''",
                    (wiki_title,),
                ).fetchone()
                if row and row["image_url"]:
                    image_url = row["image_url"]
                    source = f"wiki '{wiki_title}'"

        # Strategy 4: Search wiki by character name (broader search)
        if not image_url:
            # Search for exact title match first
            row = conn.execute(
                "SELECT title, image_url FROM crawled_wiki_pages WHERE title = ? AND image_url IS NOT NULL AND image_url != ''",
                (char_name,),
            ).fetchone()
            if row and row["image_url"]:
                image_url = row["image_url"]
                source = f"wiki exact '{row['title']}'"

        # Strategy 5: Search wiki for character/NPC pages
        if not image_url:
            for suffix in ["/NPC", "/Monster", ""]:
                search_title = f"{char_name}{suffix}"
                row = conn.execute(
                    "SELECT title, image_url FROM crawled_wiki_pages WHERE title = ? AND image_url IS NOT NULL AND image_url != ''",
                    (search_title,),
                ).fetchone()
                if row and row["image_url"]:
                    image_url = row["image_url"]
                    source = f"wiki '{row['title']}'"
                    break

        # Strategy 6: Search wiki with LIKE for partial matches
        if not image_url:
            row = conn.execute(
                "SELECT title, image_url FROM crawled_wiki_pages "
                "WHERE title LIKE ? AND image_url IS NOT NULL AND image_url != '' "
                "ORDER BY LENGTH(title) ASC LIMIT 1",
                (f"{char_name}%",),
            ).fetchone()
            if row and row["image_url"]:
                image_url = row["image_url"]
                source = f"wiki partial '{row['title']}'"

        # Strategy 7: Boss mob URL for characters that are bosses
        if not image_url and char_name in CHAR_AS_BOSS_MOB:
            mob_id = CHAR_AS_BOSS_MOB[char_name]
            if mob_id:
                image_url = MOB_IMG_URL.format(mob_id=mob_id)
                source = f"boss mob URL (mob_id={mob_id})"

        # Strategy 8: Search crawled_mobs by character name
        if not image_url:
            row = conn.execute(
                "SELECT mob_id, image_url FROM crawled_mobs WHERE name LIKE ? ORDER BY mob_id LIMIT 1",
                (f"%{char_name}%",),
            ).fetchone()
            if row and row["image_url"]:
                image_url = row["image_url"]
                source = f"crawled_mobs name match (mob_id={row['mob_id']})"

        if image_url:
            conn.execute(
                "UPDATE characters SET image_url = ? WHERE id = ?",
                (image_url, char_id),
            )
            updated += 1
            results.append(f"  [OK] {char_name}: {source}")
        else:
            results.append(f"  [MISS] {char_name}: no image found")

    conn.commit()
    for r in results:
        print(r)
    print(f"\nCharacter images updated: {updated}/{len(characters)}")
    return updated


# ============================================================
# TASK 3: Enrich Wiki Page Images
# ============================================================
def enrich_wiki_images(conn):
    print("\n" + "=" * 60)
    print("TASK 3: Enriching Wiki Page Images")
    print("=" * 60)

    # Get wiki pages without images
    wiki_pages = conn.execute(
        "SELECT page_id, title FROM crawled_wiki_pages "
        "WHERE image_url IS NULL OR image_url = ''"
    ).fetchall()
    print(f"Wiki pages without images: {len(wiki_pages)}")

    # Build lookup indexes for fast matching
    # Mob name -> image_url
    mob_lookup = {}
    mobs = conn.execute("SELECT mob_id, name, image_url FROM crawled_mobs").fetchall()
    for m in mobs:
        name_lower = m["name"].lower().strip()
        if name_lower and m["image_url"]:
            mob_lookup[name_lower] = m["image_url"]

    # NPC name -> image_url (use render/stand for better quality)
    npc_lookup = {}
    npcs = conn.execute("SELECT npc_id, name, image_url FROM crawled_npcs").fetchall()
    for n in npcs:
        name_lower = n["name"].lower().strip() if n["name"] else ""
        if name_lower:
            npc_lookup[name_lower] = NPC_IMG_URL.format(npc_id=n["npc_id"])

    # Item name -> image_url
    item_lookup = {}
    items = conn.execute(
        "SELECT item_id, name, image_url FROM crawled_items WHERE image_url IS NOT NULL AND image_url != ''"
    ).fetchall()
    for i in items:
        name_lower = i["name"].lower().strip()
        if name_lower and i["image_url"]:
            item_lookup[name_lower] = i["image_url"]

    print(f"Lookup sizes: mobs={len(mob_lookup)}, npcs={len(npc_lookup)}, items={len(item_lookup)}")

    updated = 0
    matches_by_type = {"mob": 0, "npc": 0, "item": 0}

    for page in wiki_pages:
        title = page["title"]
        title_lower = title.lower().strip()
        page_id = page["page_id"]

        image_url = None
        match_type = None

        # Clean title for matching: remove suffixes like /Monster, /NPC, etc.
        clean_title = title_lower
        for suffix in ["/monster", "/npc", "/item", " (monster)", " (npc)"]:
            clean_title = clean_title.replace(suffix, "")

        # Match 1: Exact mob name match
        if clean_title in mob_lookup:
            image_url = mob_lookup[clean_title]
            match_type = "mob"
        # Match 2: Exact NPC name match
        elif clean_title in npc_lookup:
            image_url = npc_lookup[clean_title]
            match_type = "npc"
        # Match 3: Exact item name match
        elif clean_title in item_lookup:
            image_url = item_lookup[clean_title]
            match_type = "item"
        # Match 4: Title with /Monster suffix -> mob
        elif title_lower.endswith("/monster"):
            base = title_lower.replace("/monster", "").strip()
            if base in mob_lookup:
                image_url = mob_lookup[base]
                match_type = "mob"
        # Match 5: Title with /NPC suffix -> npc
        elif title_lower.endswith("/npc"):
            base = title_lower.replace("/npc", "").strip()
            if base in npc_lookup:
                image_url = npc_lookup[base]
                match_type = "npc"

        if image_url:
            conn.execute(
                "UPDATE crawled_wiki_pages SET image_url = ? WHERE page_id = ?",
                (image_url, page_id),
            )
            updated += 1
            matches_by_type[match_type] = matches_by_type.get(match_type, 0) + 1

    conn.commit()
    print(f"\nWiki pages enriched: {updated}/{len(wiki_pages)}")
    print(f"  By mob match: {matches_by_type.get('mob', 0)}")
    print(f"  By NPC match: {matches_by_type.get('npc', 0)}")
    print(f"  By item match: {matches_by_type.get('item', 0)}")
    return updated


# ============================================================
# VERIFICATION
# ============================================================
def verify_results(conn):
    print("\n" + "=" * 60)
    print("VERIFICATION: Final Image Coverage")
    print("=" * 60)

    # Bosses
    total_bosses = conn.execute("SELECT COUNT(*) as c FROM bosses").fetchone()["c"]
    bosses_with_img = conn.execute(
        "SELECT COUNT(*) as c FROM bosses WHERE image_url IS NOT NULL AND image_url != ''"
    ).fetchone()["c"]
    pct = (bosses_with_img / total_bosses * 100) if total_bosses else 0
    print(f"\nBosses:      {bosses_with_img}/{total_bosses} ({pct:.1f}%)")

    # Characters
    total_chars = conn.execute("SELECT COUNT(*) as c FROM characters").fetchone()["c"]
    chars_with_img = conn.execute(
        "SELECT COUNT(*) as c FROM characters WHERE image_url IS NOT NULL AND image_url != ''"
    ).fetchone()["c"]
    pct = (chars_with_img / total_chars * 100) if total_chars else 0
    print(f"Characters:  {chars_with_img}/{total_chars} ({pct:.1f}%)")

    # Wiki pages
    total_wiki = conn.execute("SELECT COUNT(*) as c FROM crawled_wiki_pages").fetchone()["c"]
    wiki_with_img = conn.execute(
        "SELECT COUNT(*) as c FROM crawled_wiki_pages WHERE image_url IS NOT NULL AND image_url != ''"
    ).fetchone()["c"]
    pct = (wiki_with_img / total_wiki * 100) if total_wiki else 0
    print(f"Wiki pages:  {wiki_with_img}/{total_wiki} ({pct:.1f}%)")

    # Print each boss with image status
    print("\n--- Boss Details ---")
    bosses = conn.execute("SELECT name, image_url FROM bosses ORDER BY id").fetchall()
    for b in bosses:
        img = b["image_url"][:80] if b["image_url"] else "NO IMAGE"
        status = "OK" if b["image_url"] else "MISS"
        print(f"  [{status}] {b['name']}: {img}")

    # Print each character with image status
    print("\n--- Character Details ---")
    chars = conn.execute("SELECT name, image_url FROM characters ORDER BY id").fetchall()
    for c in chars:
        img = c["image_url"][:80] if c["image_url"] else "NO IMAGE"
        status = "OK" if c["image_url"] else "MISS"
        print(f"  [{status}] {c['name']}: {img}")


# ============================================================
# MAIN
# ============================================================
def main():
    print("MapleStory Archive - Image Coverage Update")
    print(f"Database: {DB_PATH}")

    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    conn = get_connection()

    try:
        boss_count = update_boss_images(conn)
        char_count = update_character_images(conn)
        wiki_count = enrich_wiki_images(conn)
        verify_results(conn)

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"  Boss images updated:      {boss_count}")
        print(f"  Character images updated:  {char_count}")
        print(f"  Wiki pages enriched:       {wiki_count}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
