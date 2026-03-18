"""MapleStory Archive - CLI entry point"""

import argparse
import json
import logging
import sys
import os

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import SERVER_HOST, SERVER_PORT, DATA_DIR
from db import Database, Queries
from search import SearchEngine

console = Console()


def cmd_seed(args):
    """Load seed data from JSON files into database."""
    console.print("[bold cyan]Seeding MapleStory Archive database...[/]")

    with Database() as db:
        queries = Queries(db)

        # Characters
        chars = _load_json("characters.json")
        if chars:
            count = 0
            for c in chars:
                try:
                    queries.upsert_character(
                        name=c["name"], name_ko=c.get("name_ko", ""),
                        role=c.get("role", "npc"), faction=c.get("faction", ""),
                        class_name=c.get("class_name", ""), title=c.get("title", ""),
                        backstory=c.get("backstory", ""), image_url=c.get("image_url", ""),
                        wiki_url=c.get("wiki_url", ""), is_playable=c.get("is_playable", 0),
                        power_level=c.get("power_level", "mortal"),
                        first_appearance=c.get("first_appearance", ""),
                        voice_actor=c.get("voice_actor", ""),
                    )
                    count += 1
                except Exception as e:
                    console.print(f"  [dim]Skip character {c.get('name', '?')}: {e}[/]")
            console.print(f"  [green]{count} characters loaded[/]")

        # Story Arcs
        arcs = _load_json("story_arcs.json")
        if arcs:
            count = 0
            for a in arcs:
                try:
                    queries.upsert_story_arc(
                        name=a["name"], name_ko=a.get("name_ko", ""),
                        saga=a.get("saga", "black_mage"),
                        description=a.get("description", ""),
                        order_index=a.get("order_index", 0),
                        status=a.get("status", "completed"),
                        level_range=a.get("level_range", ""),
                        key_characters=a.get("key_characters", ""),
                        image_url=a.get("image_url", ""),
                    )
                    count += 1
                except Exception as e:
                    console.print(f"  [dim]Skip arc {a.get('name', '?')}: {e}[/]")
            console.print(f"  [green]{count} story arcs loaded[/]")

        # Timeline Events
        events = _load_json("timeline_events.json")
        if events:
            count = 0
            for ev in events:
                try:
                    queries.upsert_story_event(
                        arc_id=ev.get("arc_id"),
                        title=ev["title"], title_ko=ev.get("title_ko", ""),
                        description=ev.get("description", ""),
                        era=ev.get("era", "modern"),
                        chronological_order=ev.get("chronological_order", 0),
                        year_in_lore=ev.get("year_in_lore", ""),
                        key_characters=ev.get("key_characters", ""),
                        location=ev.get("location", ""),
                        significance=ev.get("significance", "major"),
                    )
                    count += 1
                except Exception:
                    pass
            console.print(f"  [green]{count} timeline events loaded[/]")

        # Worlds
        worlds = _load_json("worlds.json")
        if worlds:
            count = 0
            for w in worlds:
                try:
                    queries.upsert_world(
                        name=w["name"], name_ko=w.get("name_ko", ""),
                        parent_world=w.get("parent_world", ""),
                        region=w.get("region", ""),
                        description=w.get("description", ""),
                        level_range=w.get("level_range", ""),
                        arcane_force=w.get("arcane_force", 0),
                        sacred_force=w.get("sacred_force", 0),
                        lat=w.get("lat", 0.0), lng=w.get("lng", 0.0),
                        altitude=w.get("altitude", 0.0),
                        image_url=w.get("image_url", ""),
                        connected_worlds=w.get("connected_worlds", ""),
                    )
                    count += 1
                except Exception as e:
                    console.print(f"  [dim]Skip world {w.get('name', '?')}: {e}[/]")
            console.print(f"  [green]{count} worlds loaded[/]")

        # Job Classes
        jobs = _load_json("job_classes.json")
        if jobs:
            count = 0
            for j in jobs:
                try:
                    queries.upsert_job_class(
                        name=j["name"], name_ko=j.get("name_ko", ""),
                        branch=j.get("branch", "explorer"),
                        class_type=j.get("class_type", "warrior"),
                        main_stat=j.get("main_stat", "STR"),
                        weapon_type=j.get("weapon_type", ""),
                        description=j.get("description", ""),
                        lore=j.get("lore", ""),
                        image_url=j.get("image_url", ""),
                        release_date=j.get("release_date", ""),
                        difficulty=j.get("difficulty", "medium"),
                    )
                    count += 1
                except Exception as e:
                    console.print(f"  [dim]Skip job {j.get('name', '?')}: {e}[/]")
            console.print(f"  [green]{count} job classes loaded[/]")

        # Bosses
        bosses = _load_json("bosses.json")
        if bosses:
            count = 0
            for b in bosses:
                try:
                    queries.upsert_boss(
                        name=b["name"], name_ko=b.get("name_ko", ""),
                        difficulty=b.get("difficulty", "normal"),
                        level_required=b.get("level_required", 0),
                        hp_estimate=b.get("hp_estimate", ""),
                        mechanics=b.get("mechanics", ""),
                        rewards=b.get("rewards", ""),
                        story_significance=b.get("story_significance", ""),
                        related_arc_id=b.get("related_arc_id"),
                        location=b.get("location", ""),
                        image_url=b.get("image_url", ""),
                        entry_limit=b.get("entry_limit", ""),
                        party_size=b.get("party_size", 6),
                    )
                    count += 1
                except Exception as e:
                    console.print(f"  [dim]Skip boss {b.get('name', '?')}: {e}[/]")
            console.print(f"  [green]{count} bosses loaded[/]")

        # Relationships
        rels = _load_json("relationships.json")
        if rels:
            count = 0
            for r in rels:
                try:
                    char_a = queries.get_character_by_name(r["character_a"])
                    char_b = queries.get_character_by_name(r["character_b"])
                    if char_a and char_b:
                        queries.upsert_relationship(
                            character_a_id=char_a["id"],
                            character_b_id=char_b["id"],
                            relationship_type=r.get("relationship_type", "ally"),
                            description=r.get("description", ""),
                            strength=r.get("strength", 5),
                        )
                        count += 1
                except Exception:
                    pass
            console.print(f"  [green]{count} relationships loaded[/]")

        # Skills
        skills = _load_json("skills_data.json")
        if skills:
            count = 0
            for s in skills:
                try:
                    job = db.fetchone(
                        "SELECT id FROM job_classes WHERE name = ?",
                        (s.get("job_class", ""),)
                    )
                    if job:
                        queries.upsert_skill(
                            job_class_id=job["id"],
                            name=s["name"], name_ko=s.get("name_ko", ""),
                            skill_type=s.get("skill_type", "active"),
                            advancement_level=s.get("advancement_level", 1),
                            max_level=s.get("max_level", 20),
                            description=s.get("description", ""),
                            damage_percent=s.get("damage_percent", 0),
                            cooldown=s.get("cooldown", 0.0),
                            icon_url=s.get("icon_url", ""),
                        )
                        count += 1
                except Exception:
                    pass
            console.print(f"  [green]{count} skills loaded[/]")

        # Power Systems
        power = _load_json("power_systems.json")
        if power:
            count = 0
            for p in power:
                try:
                    queries.upsert_power_system(
                        name=p["name"], name_ko=p.get("name_ko", ""),
                        category=p.get("category", "general"),
                        description=p.get("description", ""),
                        unlock_level=p.get("unlock_level", 0),
                        max_level=p.get("max_level", ""),
                        details=p.get("details", ""),
                    )
                    count += 1
                except Exception:
                    pass
            console.print(f"  [green]{count} power systems loaded[/]")

        # Monsters
        mons = _load_json("monsters.json")
        if mons:
            count = 0
            for m in mons:
                try:
                    queries.upsert_monster(
                        name=m["name"], name_ko=m.get("name_ko", ""),
                        level=m.get("level", 1), hp=m.get("hp", 100),
                        exp=m.get("exp", 10), location=m.get("location", ""),
                        location_ko=m.get("location_ko", ""),
                        world=m.get("world", "Maple World"),
                        category=m.get("category", "normal"),
                        element=m.get("element") or "",
                        drops=m.get("drops", ""),
                        description=m.get("description", ""),
                        description_ko=m.get("description_ko", ""),
                        image_url=m.get("image_url", ""),
                        is_classic=m.get("is_classic", 0),
                        first_appeared=m.get("first_appeared", ""),
                    )
                    count += 1
                except Exception as e:
                    console.print(f"  [dim]Skip monster {m.get('name', '?')}: {e}[/]")
            console.print(f"  [green]{count} monsters loaded[/]")

        # Items
        items = _load_json("items.json")
        if items:
            count = 0
            for it in items:
                try:
                    queries.upsert_item(
                        name=it["name"], name_ko=it.get("name_ko", ""),
                        category=it.get("category", "etc_item"),
                        sub_category=it.get("sub_category", ""),
                        level_req=it.get("level_req", 0),
                        tier=it.get("tier", "common"),
                        stats=it.get("stats", ""),
                        set_name=it.get("set_name", ""),
                        set_name_ko=it.get("set_name_ko", ""),
                        set_bonus=it.get("set_bonus", ""),
                        how_to_obtain=it.get("how_to_obtain", ""),
                        how_to_obtain_ko=it.get("how_to_obtain_ko", ""),
                        description=it.get("description", ""),
                        description_ko=it.get("description_ko", ""),
                        image_url=it.get("image_url", ""),
                        is_tradeable=it.get("is_tradeable", 1),
                        era=it.get("era", "classic"),
                    )
                    count += 1
                except Exception as e:
                    console.print(f"  [dim]Skip item {it.get('name', '?')}: {e}[/]")
            console.print(f"  [green]{count} items loaded[/]")

    console.print("[bold green]Seed complete![/]")


def cmd_crawl(args):
    """Crawl data from external sources."""
    target = args.target
    console.print(f"[bold cyan]Crawling {target}...[/]")

    with Database() as db:
        queries = Queries(db)

        if target in ("all", "fandom"):
            from crawler import FandomCrawler
            crawler = FandomCrawler()
            try:
                success, fail = crawler.crawl_all(db, queries)
                queries.update_crawl_status("fandom_wiki_pages", success)
            finally:
                crawler.close()

        if target in ("all", "namu"):
            from crawler import NamuCrawler
            crawler = NamuCrawler()
            try:
                console.print("  [yellow]Namu Wiki crawling requires specific page names[/]")
                queries.update_crawl_status("namu", 0)
            finally:
                crawler.close()

        if target in ("all", "maplestory_io"):
            from crawler import MapleStoryIOCrawler
            crawler = MapleStoryIOCrawler()
            try:
                console.print("  [cyan]Crawling mobs from MapleStory.io...[/]")
                mob_count = crawler.crawl_all_mobs(db, queries, with_detail=args.detail)
                console.print(f"  [green]{mob_count} mobs crawled[/]")

                console.print("  [cyan]Crawling maps from MapleStory.io...[/]")
                map_count = crawler.crawl_all_maps(db, queries)
                console.print(f"  [green]{map_count} maps crawled[/]")

                console.print("  [cyan]Crawling items from MapleStory.io...[/]")
                item_count = crawler.crawl_all_items(db, queries, categories=["Equip"])
                console.print(f"  [green]{item_count} items crawled[/]")

                console.print("  [cyan]Crawling NPCs from MapleStory.io...[/]")
                npc_count = crawler.crawl_all_npcs(db, queries, with_detail=args.detail)
                console.print(f"  [green]{npc_count} NPCs crawled[/]")

                console.print("  [cyan]Crawling quests from MapleStory.io...[/]")
                quest_count = crawler.crawl_all_quests(db, queries, with_detail=args.detail)
                console.print(f"  [green]{quest_count} quests crawled[/]")
            finally:
                crawler.close()

    console.print("[bold green]Crawl complete![/]")


def cmd_search(args):
    """Search the database."""
    with Database() as db:
        engine = SearchEngine(db)
        results = engine.search_all(args.query, limit=args.limit)

        for entity_type in ["characters", "story_arcs", "worlds", "jobs", "bosses"]:
            items = results.get(entity_type, [])
            if items:
                table = Table(title=f"{entity_type.replace('_', ' ').title()} Results")
                table.add_column("#", style="cyan", width=4)
                table.add_column("Name", style="white")
                table.add_column("Korean", style="dim")
                for item in items[:10]:
                    table.add_row(
                        str(item.get("id", "")),
                        item.get("name", ""),
                        item.get("name_ko", ""),
                    )
                console.print(table)

        total = sum(results.get(f"{k}_total", 0) for k in
                    ["characters", "story_arcs", "worlds", "jobs", "bosses"])
        if total == 0:
            console.print("[dim]No results found[/]")


def cmd_status(args):
    """Show database status."""
    with Database() as db:
        engine = SearchEngine(db)
        stats = engine.get_stats()
        queries = Queries(db)
        crawl = queries.get_crawl_status()

        lines = []
        for key, count in stats.items():
            label = key.replace("_", " ").title()
            lines.append(f"[cyan]{label}:[/] {count}")

        if crawl:
            lines.append("")
            lines.append("[dim]Crawl Status:[/]")
            for k, v in crawl.items():
                lines.append(f"  [dim]{k}: {v['value']} (updated: {v['updated']})[/]")

        panel = Panel(
            "\n".join(lines),
            title="MapleStory Archive Status",
            border_style="cyan",
        )
        console.print(panel)


def cmd_serve(args):
    """Start the web server."""
    port = args.port or SERVER_PORT
    is_production = os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("PRODUCTION")
    reload = not is_production

    console.print(f"[bold cyan]Starting MapleStory Archive server...[/] http://localhost:{port}")
    if is_production:
        console.print("[yellow]Running in production mode (reload disabled)[/]")

    import uvicorn
    uvicorn.run("api.server:app", host=SERVER_HOST, port=port, reload=reload)


def _load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        console.print(f"  [yellow]File not found: {filename}[/]")
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="MapleStory Archive - Story & World Explorer")
    parser.add_argument("-v", "--verbose", action="store_true")
    subparsers = parser.add_subparsers(dest="command")

    # seed
    subparsers.add_parser("seed", help="Load seed data from JSON files")

    # crawl
    crawl_parser = subparsers.add_parser("crawl", help="Crawl external data sources")
    crawl_parser.add_argument(
        "target", choices=["all", "fandom", "namu", "maplestory_io"],
        help="What to crawl",
    )
    crawl_parser.add_argument(
        "--detail", action="store_true",
        help="Fetch per-mob detail (HP/EXP/foundAt) - slower but richer data",
    )

    # search
    search_parser = subparsers.add_parser("search", help="Search the archive")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--limit", type=int, default=30)

    # status
    subparsers.add_parser("status", help="Show database status")

    # serve
    serve_parser = subparsers.add_parser("serve", help="Start web server")
    serve_parser.add_argument("--port", type=int, default=None)

    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    try:
        if args.command == "seed":
            cmd_seed(args)
        elif args.command == "crawl":
            cmd_crawl(args)
        elif args.command == "search":
            cmd_search(args)
        elif args.command == "status":
            cmd_status(args)
        elif args.command == "serve":
            cmd_serve(args)
        else:
            parser.print_help()
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted.[/]")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
