"""FastAPI backend server for MapleStory Archive"""

import json
import logging
import os
import sys
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import CORS_ORIGINS
from db import Database, Queries
from search import SearchEngine

logger = logging.getLogger(__name__)


# === Rate Limiter ===

class SimpleRateLimiter:
    def __init__(self, max_requests=10, window_seconds=60):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < self.window]
        if len(self.requests[key]) >= self.max_requests:
            return False
        self.requests[key].append(now)
        return True


post_limiter = SimpleRateLimiter(max_requests=10, window_seconds=60)
visitor_limiter = SimpleRateLimiter(max_requests=30, window_seconds=60)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# === Security Headers Middleware ===

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://d3js.org https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
            "img-src 'self' https://maplestory.io https://maplestory.fandom.com data: blob:; "
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
            "connect-src 'self' https://d3js.org https://cdn.jsdelivr.net https://maplestory.io; "
            "frame-ancestors 'none';"
        )
        return response


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(BASE_DIR, "web")
DATA_DIR = os.path.join(BASE_DIR, "data")

_db: Database | None = None


def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db


def _load_data_file(filename, default=None):
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return default or {}


# === Pydantic Models ===

class GuestbookEntry(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=20)
    message: str = Field(..., min_length=1, max_length=300)
    job_pick: str = Field(default="", max_length=50)


class VoteRequest(BaseModel):
    item_type: str = Field(..., max_length=20)
    item_id: int


class BoardPostCreate(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=20)
    title: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=2000)
    job_pick: str = Field(default="", max_length=50)


class BoardReplyCreate(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=20)
    content: str = Field(..., min_length=1, max_length=500)


# === App Lifecycle ===

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db
    _db = Database()
    yield
    if _db is not None:
        _db.close()
        _db = None


app = FastAPI(title="MapleStory Archive API", lifespan=lifespan)
app.add_middleware(SecurityHeadersMiddleware)

_cors_origins = CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False if _cors_origins == ["*"] else True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Accept"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# === Static files ===
app.mount("/css", StaticFiles(directory=os.path.join(WEB_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(WEB_DIR, "js")), name="js")


@app.get("/")
def index():
    return FileResponse(os.path.join(WEB_DIR, "index.html"))


# ============================================================
# Search (3 endpoints)
# ============================================================

@app.get("/api/search")
def search(
    q: str = Query(..., description="Search query"),
    type: str = Query("all", description="all, characters, story_arcs, worlds, jobs, bosses"),
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    db = get_db()
    engine = SearchEngine(db)
    if type == "characters":
        r = engine.search_characters(q, limit=limit, offset=offset)
        return {"characters": r["items"], "characters_total": r["total"]}
    elif type == "story_arcs":
        r = engine.search_story_arcs(q, limit=limit, offset=offset)
        return {"story_arcs": r["items"], "story_arcs_total": r["total"]}
    elif type == "worlds":
        r = engine.search_worlds(q, limit=limit, offset=offset)
        return {"worlds": r["items"], "worlds_total": r["total"]}
    elif type == "jobs":
        r = engine.search_jobs(q, limit=limit, offset=offset)
        return {"jobs": r["items"], "jobs_total": r["total"]}
    elif type == "bosses":
        r = engine.search_bosses(q, limit=limit, offset=offset)
        return {"bosses": r["items"], "bosses_total": r["total"]}
    elif type == "monsters":
        r = engine.search_monsters(q, limit=limit, offset=offset)
        return {"monsters": r["items"], "monsters_total": r["total"]}
    elif type == "items":
        r = engine.search_items(q, limit=limit, offset=offset)
        return {"items": r["items"], "items_total": r["total"]}
    return engine.search_all(q, limit=limit, offset=offset)


@app.get("/api/suggest")
def suggest(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50)):
    db = get_db()
    engine = SearchEngine(db)
    return {"suggestions": engine.suggest(q, limit=limit)}


@app.get("/api/stats")
def stats():
    db = get_db()
    engine = SearchEngine(db)
    return engine.get_stats()


# ============================================================
# Characters (5 endpoints)
# ============================================================

@app.get("/api/characters")
def character_list(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    role: str = Query(None),
    faction: str = Query(None),
):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_all_characters(limit=limit, offset=offset, role=role, faction=faction)
    total = queries.get_character_count()
    return {"characters": [dict(r) for r in rows], "total": total}


@app.get("/api/characters/graph")
def character_graph():
    db = get_db()
    queries = Queries(db)
    return queries.get_relationship_graph()


@app.get("/api/characters/compare")
def character_compare(ids: str = Query(..., description="Comma-separated character IDs")):
    db = get_db()
    queries = Queries(db)
    char_ids = [int(x.strip()) for x in ids.split(",") if x.strip().isdigit()]
    chars = []
    for cid in char_ids:
        c = queries.get_character(cid)
        if c:
            chars.append(dict(c))
    return {"characters": chars}


@app.get("/api/characters/{char_id}")
def character_detail(char_id: int):
    db = get_db()
    queries = Queries(db)
    char = queries.get_character(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    relationships = queries.get_character_relationships(char_id)
    return {**dict(char), "relationships": [dict(r) for r in relationships]}


@app.get("/api/characters/{char_id}/relationships")
def character_relationships(char_id: int):
    db = get_db()
    queries = Queries(db)
    rels = queries.get_character_relationships(char_id)
    return {"relationships": [dict(r) for r in rels]}


# ============================================================
# Story (6 endpoints)
# ============================================================

@app.get("/api/story/arcs")
def story_arcs(saga: str = Query(None)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_all_story_arcs(saga=saga)
    return {"arcs": [dict(r) for r in rows]}


@app.get("/api/story/arcs/{arc_id}")
def story_arc_detail(arc_id: int):
    db = get_db()
    queries = Queries(db)
    arc = queries.get_story_arc(arc_id)
    if not arc:
        raise HTTPException(status_code=404, detail="Story arc not found")
    return dict(arc)


@app.get("/api/story/arcs/{arc_id}/events")
def story_arc_events(arc_id: int):
    db = get_db()
    queries = Queries(db)
    events = queries.get_arc_events(arc_id)
    return {"events": [dict(e) for e in events]}


@app.get("/api/story/timeline")
def story_timeline():
    db = get_db()
    queries = Queries(db)
    events = queries.get_timeline()
    arcs = queries.get_all_story_arcs()
    return {"events": [dict(e) for e in events], "arcs": [dict(a) for a in arcs]}


@app.get("/api/story/sagas")
def story_sagas():
    db = get_db()
    queries = Queries(db)
    sagas = queries.get_sagas()
    return {"sagas": [dict(s) for s in sagas]}


@app.get("/api/story/full")
def story_full():
    db = get_db()
    queries = Queries(db)
    arcs = queries.get_all_story_arcs()
    timeline = queries.get_timeline()
    sagas = queries.get_sagas()
    return {
        "arcs": [dict(a) for a in arcs],
        "timeline": [dict(e) for e in timeline],
        "sagas": [dict(s) for s in sagas],
    }


# ============================================================
# Worlds (5 endpoints)
# ============================================================

@app.get("/api/worlds")
def worlds_list(parent: str = Query(None)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_all_worlds(parent=parent)
    return {"worlds": [dict(r) for r in rows]}


@app.get("/api/worlds/map")
def world_map():
    db = get_db()
    queries = Queries(db)
    data = queries.get_world_map_data()
    return {"worlds": [dict(w) for w in data]}


@app.get("/api/worlds/by-force")
def worlds_by_force(type: str = Query("arcane")):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_worlds_by_force(force_type=type)
    return {"worlds": [dict(r) for r in rows]}


@app.get("/api/worlds/connected/{world_id}")
def worlds_connected(world_id: int):
    db = get_db()
    queries = Queries(db)
    connected = queries.get_connected_worlds(world_id)
    return {"connected": [dict(w) for w in connected]}


@app.get("/api/worlds/{world_id}")
def world_detail(world_id: int):
    db = get_db()
    queries = Queries(db)
    world = queries.get_world(world_id)
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    return dict(world)


# ============================================================
# Jobs (6 endpoints)
# ============================================================

@app.get("/api/jobs")
def jobs_list(branch: str = Query(None), class_type: str = Query(None)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_all_job_classes(branch=branch, class_type=class_type)
    return {"jobs": [dict(r) for r in rows]}


@app.get("/api/jobs/tree")
def job_tree():
    db = get_db()
    queries = Queries(db)
    return queries.get_job_tree()


@app.get("/api/jobs/branches")
def job_branches():
    db = get_db()
    queries = Queries(db)
    rows = queries.get_job_branches()
    return {"branches": [dict(r) for r in rows]}


@app.get("/api/jobs/{job_id}")
def job_detail(job_id: int):
    db = get_db()
    queries = Queries(db)
    job = queries.get_job_class(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job class not found")
    adv = queries.get_job_advancements(job_id)
    skills = queries.get_job_skills(job_id)
    return {
        **dict(job),
        "advancements": [dict(a) for a in adv],
        "skills": [dict(s) for s in skills],
    }


@app.get("/api/jobs/{job_id}/advancements")
def job_advancements(job_id: int):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_job_advancements(job_id)
    return {"advancements": [dict(r) for r in rows]}


@app.get("/api/jobs/{job_id}/skills")
def job_skills(job_id: int):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_job_skills(job_id)
    return {"skills": [dict(r) for r in rows]}


# ============================================================
# Bosses (4 endpoints)
# ============================================================

@app.get("/api/bosses")
def bosses_list(difficulty: str = Query(None)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_all_bosses(difficulty=difficulty)
    return {"bosses": [dict(r) for r in rows]}


@app.get("/api/bosses/ranking")
def bosses_ranking():
    db = get_db()
    queries = Queries(db)
    rows = queries.get_boss_ranking()
    return {"bosses": [dict(r) for r in rows]}


@app.get("/api/bosses/by-story-arc/{arc_id}")
def bosses_by_arc(arc_id: int):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_bosses_by_arc(arc_id)
    return {"bosses": [dict(r) for r in rows]}


@app.get("/api/bosses/{boss_id}")
def boss_detail(boss_id: int):
    db = get_db()
    queries = Queries(db)
    boss = queries.get_boss(boss_id)
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")
    return dict(boss)


# ============================================================
# Power Systems (2 endpoints)
# ============================================================

@app.get("/api/power-systems")
def power_systems(category: str = Query(None)):
    db = get_db()
    if category:
        rows = db.fetchall(
            "SELECT * FROM power_systems WHERE category = ? ORDER BY unlock_level", (category,)
        )
    else:
        rows = db.fetchall("SELECT * FROM power_systems ORDER BY category, unlock_level")
    return {"systems": [dict(r) for r in rows]}


@app.get("/api/power-systems/{system_id}")
def power_system_detail(system_id: int):
    db = get_db()
    row = db.fetchone("SELECT * FROM power_systems WHERE id = ?", (system_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Power system not found")
    return dict(row)


# ============================================================
# Monsters (4 endpoints)
# ============================================================

@app.get("/api/monsters")
def monsters_list(category: str = Query(None), world: str = Query(None),
                  level_min: int = Query(None), level_max: int = Query(None)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_all_monsters(category=category, world=world,
                                     level_min=level_min, level_max=level_max)
    return {"monsters": [dict(r) for r in rows]}


@app.get("/api/monsters/classic")
def monsters_classic():
    db = get_db()
    queries = Queries(db)
    rows = queries.get_classic_monsters()
    return {"monsters": [dict(r) for r in rows]}


@app.get("/api/monsters/{monster_id}")
def monster_detail(monster_id: int):
    db = get_db()
    queries = Queries(db)
    monster = queries.get_monster(monster_id)
    if not monster:
        raise HTTPException(status_code=404, detail="Monster not found")
    return dict(monster)


# ============================================================
# Items (4 endpoints)
# ============================================================

@app.get("/api/items")
def items_list(category: str = Query(None), tier: str = Query(None),
               set_name: str = Query(None)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_all_items(category=category, tier=tier, set_name=set_name)
    return {"items": [dict(r) for r in rows]}


@app.get("/api/items/sets")
def item_sets():
    db = get_db()
    queries = Queries(db)
    rows = queries.get_item_sets()
    return {"sets": [dict(r) for r in rows]}


@app.get("/api/items/{item_id}")
def item_detail(item_id: int):
    db = get_db()
    queries = Queries(db)
    item = queries.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return dict(item)


# ============================================================
# Party Quests (1 endpoint - JSON file)
# ============================================================

@app.get("/api/party-quests")
def party_quests():
    return _load_data_file("party_quests.json", [])


# ============================================================
# BGM / Music (1 endpoint - JSON file)
# ============================================================

@app.get("/api/bgm")
def bgm_list():
    return _load_data_file("bgm.json", [])


# ============================================================
# Patch History (1 endpoint - JSON file)
# ============================================================

@app.get("/api/patch-history")
def patch_history():
    return _load_data_file("patch_history.json", [])


# ============================================================
# Memes / Culture (1 endpoint - JSON file)
# ============================================================

@app.get("/api/memes")
def memes_list():
    return _load_data_file("memes.json", [])


# ============================================================
# Quiz (1 endpoint)
# ============================================================

@app.get("/api/quiz/questions")
def quiz_questions():
    return _load_data_file("quiz_questions.json", {"questions": []})


# ============================================================
# Community: Guestbook (2 endpoints)
# ============================================================

@app.post("/api/guestbook")
def create_guestbook(entry: GuestbookEntry, request: Request):
    client_ip = get_client_ip(request)
    if not post_limiter.is_allowed(f"guestbook:{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    db = get_db()
    queries = Queries(db)
    row = queries.add_guestbook_entry(entry.nickname.strip(), entry.message.strip(), entry.job_pick.strip())
    return dict(row)


@app.get("/api/guestbook")
def list_guestbook():
    db = get_db()
    queries = Queries(db)
    rows = queries.get_guestbook()
    return {"messages": [dict(r) for r in rows]}


# ============================================================
# Community: Votes (2 endpoints)
# ============================================================

@app.post("/api/votes")
def vote(req: VoteRequest, request: Request):
    client_ip = get_client_ip(request)
    if not post_limiter.is_allowed(f"vote:{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    db = get_db()
    queries = Queries(db)
    votes = queries.vote_item(req.item_type, req.item_id)
    return {"item_type": req.item_type, "item_id": req.item_id, "votes": votes}


@app.get("/api/votes")
def get_votes(item_type: str = Query("job"), limit: int = Query(50)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_votes(item_type, limit=limit)
    return {"votes": [dict(r) for r in rows]}


# ============================================================
# Community: Visitor Count (1 endpoint)
# ============================================================

@app.get("/api/visitor-count")
def visitor_count(request: Request):
    client_ip = get_client_ip(request)
    if not visitor_limiter.is_allowed(f"visitor:{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests.")
    db = get_db()
    queries = Queries(db)
    count = queries.increment_visitor_count()
    return {"count": count}


# ============================================================
# Community: Board (5 endpoints)
# ============================================================

def _get_ip_hash(request: Request) -> str:
    import hashlib
    host = request.client.host if request.client else "unknown"
    return hashlib.sha256(host.encode()).hexdigest()[:16]


@app.get("/api/board/posts")
def board_list_posts(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    db = get_db()
    queries = Queries(db)
    rows = queries.get_board_posts(limit=limit, offset=offset)
    total = queries.get_board_post_count()
    return {"posts": [dict(r) for r in rows], "total": total}


@app.get("/api/board/posts/{post_id}")
def board_get_post(post_id: int):
    db = get_db()
    queries = Queries(db)
    post = queries.get_board_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    replies = queries.get_board_replies(post_id)
    return {**dict(post), "replies": [dict(r) for r in replies]}


@app.post("/api/board/posts")
def board_create_post(body: BoardPostCreate, request: Request):
    client_ip = get_client_ip(request)
    if not post_limiter.is_allowed(f"board:{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests.")
    db = get_db()
    queries = Queries(db)
    ip_hash = _get_ip_hash(request)
    row = queries.create_board_post(
        nickname=body.nickname.strip(), title=body.title.strip(),
        content=body.content.strip(), job_pick=body.job_pick.strip(), ip_hash=ip_hash,
    )
    return dict(row)


@app.get("/api/board/posts/{post_id}/replies")
def board_get_replies(post_id: int):
    db = get_db()
    queries = Queries(db)
    replies = queries.get_board_replies(post_id)
    return {"replies": [dict(r) for r in replies]}


@app.post("/api/board/posts/{post_id}/replies")
def board_create_reply(post_id: int, body: BoardReplyCreate, request: Request):
    client_ip = get_client_ip(request)
    if not post_limiter.is_allowed(f"reply:{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests.")
    db = get_db()
    queries = Queries(db)
    post = queries.get_board_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    ip_hash = _get_ip_hash(request)
    row = queries.create_board_reply(post_id=post_id, nickname=body.nickname.strip(),
                                      content=body.content.strip(), ip_hash=ip_hash)
    return dict(row)


@app.post("/api/board/posts/{post_id}/like")
def board_like_post(post_id: int):
    db = get_db()
    queries = Queries(db)
    likes = queries.like_board_post(post_id)
    return {"post_id": post_id, "likes": likes}


# ============================================================
# External Resources (1 endpoint)
# ============================================================

@app.get("/api/external-resources")
def external_resources():
    return _load_data_file("external_resources.json", {"categories": []})


# ============================================================
# Stats Dashboard (3 endpoints)
# ============================================================

@app.get("/api/stats/entity-counts")
def entity_counts():
    db = get_db()
    queries = Queries(db)
    return queries.get_entity_counts()


@app.get("/api/stats/faction-distribution")
def faction_distribution():
    db = get_db()
    rows = db.fetchall(
        "SELECT faction, COUNT(*) as count FROM characters GROUP BY faction ORDER BY count DESC"
    )
    return {"distribution": {r["faction"]: r["count"] for r in rows}}


@app.get("/api/stats/job-distribution")
def job_distribution():
    db = get_db()
    rows = db.fetchall(
        "SELECT branch, COUNT(*) as count FROM job_classes GROUP BY branch ORDER BY count DESC"
    )
    return {"distribution": {r["branch"]: r["count"] for r in rows}}


@app.get("/api/stats/boss-difficulty")
def boss_difficulty_stats():
    db = get_db()
    rows = db.fetchall(
        "SELECT difficulty, COUNT(*) as count FROM bosses GROUP BY difficulty ORDER BY count DESC"
    )
    return {"distribution": {r["difficulty"]: r["count"] for r in rows}}


@app.get("/api/stats/world-distribution")
def world_distribution():
    db = get_db()
    rows = db.fetchall(
        "SELECT parent_world, COUNT(*) as count FROM worlds GROUP BY parent_world ORDER BY count DESC"
    )
    return {"distribution": {r["parent_world"]: r["count"] for r in rows}}


@app.get("/api/stats/monster-distribution")
def monster_distribution():
    db = get_db()
    rows = db.fetchall(
        "SELECT category, COUNT(*) as count FROM monsters GROUP BY category ORDER BY count DESC"
    )
    return {"distribution": {r["category"]: r["count"] for r in rows}}


@app.get("/api/stats/item-distribution")
def item_distribution():
    db = get_db()
    rows = db.fetchall(
        "SELECT category, COUNT(*) as count FROM items GROUP BY category ORDER BY count DESC"
    )
    return {"distribution": {r["category"]: r["count"] for r in rows}}


# ============================================================
# Admin (3 endpoints)
# ============================================================

@app.get("/admin/status")
def admin_status():
    db = get_db()
    queries = Queries(db)
    return {
        "entities": queries.get_entity_counts(),
        "crawl_status": queries.get_crawl_status(),
    }


@app.post("/admin/db/vacuum")
def admin_db_vacuum():
    db = get_db()
    try:
        db.conn.execute("VACUUM")
        db.conn.commit()
        return {"message": "Database optimized successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/db/backup")
def admin_db_backup():
    import shutil
    from datetime import datetime

    db_path = os.path.join(DATA_DIR, "maple.db")
    backup_dir = os.path.join(DATA_DIR, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"maple_backup_{timestamp}.db")

    try:
        shutil.copy2(db_path, backup_file)
        backup_size = os.path.getsize(backup_file)
        return {"message": "Backup completed.", "backup_file": backup_file, "size": backup_size}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Crawled Data: Mobs (5 endpoints)
# ============================================================

@app.get("/api/crawled/mobs")
def crawled_mobs(level_min: int = None, level_max: int = None, is_boss: bool = None, limit: int = 100, offset: int = 0):
    db = get_db()
    queries = Queries(db)
    mobs = queries.get_all_crawled_mobs(level_min=level_min, level_max=level_max, is_boss=is_boss, limit=limit, offset=offset)
    return {"mobs": [dict(m) for m in mobs], "total": queries.get_crawled_mob_count()}


@app.get("/api/crawled/mobs/stats")
def crawled_mob_stats():
    db = get_db()
    queries = Queries(db)
    return {
        "total": queries.get_crawled_mob_count(),
        "level_distribution": [dict(d) for d in queries.get_mob_level_distribution()],
        "bosses": [dict(b) for b in queries.get_boss_mobs()],
    }


@app.get("/api/crawled/mobs/chart")
def crawled_mob_chart():
    """Return mob HP/EXP scatter data for D3.js visualization"""
    db = get_db()
    queries = Queries(db)
    data = queries.get_mob_hp_exp_data()
    return {"data": [dict(d) for d in data]}


@app.get("/api/crawled/mobs/search")
def crawled_mob_search(q: str = ""):
    if not q:
        return {"mobs": []}
    db = get_db()
    queries = Queries(db)
    mobs = queries.search_crawled_mobs(q)
    return {"mobs": [dict(m) for m in mobs]}


@app.get("/api/crawled/mobs/{mob_id}")
def crawled_mob_detail(mob_id: int):
    db = get_db()
    queries = Queries(db)
    mob = queries.get_crawled_mob(mob_id)
    if not mob:
        return {"error": "Not found"}
    return dict(mob)


# ============================================================
# Crawled Data: Maps (3 endpoints)
# ============================================================

@app.get("/api/crawled/maps")
def crawled_maps(street_name: str = None, limit: int = 100, offset: int = 0):
    db = get_db()
    queries = Queries(db)
    maps = queries.get_all_crawled_maps(street_name=street_name, limit=limit, offset=offset)
    return {"maps": [dict(m) for m in maps], "total": queries.get_crawled_map_count()}


@app.get("/api/crawled/maps/stats")
def crawled_map_stats():
    db = get_db()
    queries = Queries(db)
    return {
        "total": queries.get_crawled_map_count(),
        "street_distribution": [dict(d) for d in queries.get_map_street_distribution()],
    }


@app.get("/api/crawled/maps/{map_id}/mobs")
def crawled_map_mobs(map_id: int):
    db = get_db()
    queries = Queries(db)
    mobs = queries.get_mobs_in_map(map_id)
    return {"mobs": [dict(m) for m in mobs]}


# ============================================================
# Crawled Data: Items (3 endpoints)
# ============================================================

@app.get("/api/crawled/items")
def crawled_items(overall_category: str = None, category: str = None, sub_category: str = None, limit: int = 100, offset: int = 0):
    db = get_db()
    queries = Queries(db)
    items = queries.get_all_crawled_items(overall_category=overall_category, category=category, sub_category=sub_category, limit=limit, offset=offset)
    return {"items": [dict(i) for i in items], "total": queries.get_crawled_item_count()}


@app.get("/api/crawled/items/stats")
def crawled_item_stats():
    db = get_db()
    queries = Queries(db)
    return {
        "total": queries.get_crawled_item_count(),
        "category_distribution": [dict(d) for d in queries.get_item_category_distribution()],
        "level_distribution": [dict(d) for d in queries.get_item_level_distribution()],
    }


@app.get("/api/crawled/items/search")
def crawled_item_search(q: str = ""):
    if not q:
        return {"items": []}
    db = get_db()
    queries = Queries(db)
    items = queries.search_crawled_items(q)
    return {"items": [dict(i) for i in items]}


# ============================================================
# Crawled Data: Overview (1 endpoint)
# ============================================================

@app.get("/api/crawled/overview")
def crawled_overview():
    db = get_db()
    queries = Queries(db)
    stats = queries.get_crawled_data_stats()
    crawl_status = queries.get_crawl_status()
    return {"stats": stats, "crawl_status": crawl_status}


# ============================================================
# Crawled Data: NPCs (5 endpoints)
# ============================================================

@app.get("/api/crawled/npcs")
def crawled_npcs(limit: int = 100, offset: int = 0, shop_only: bool = False):
    db = get_db()
    queries = Queries(db)
    return {"npcs": [dict(n) for n in queries.get_all_crawled_npcs(limit, offset, shop_only)],
            "total": queries.get_crawled_npc_count()}


@app.get("/api/crawled/npcs/stats")
def crawled_npc_stats():
    db = get_db()
    queries = Queries(db)
    count = queries.get_crawled_npc_count()
    shop_count = len(queries.get_all_crawled_npcs(10000, 0, shop_only=True))
    return {"total": count, "shops": shop_count}


@app.get("/api/crawled/npcs/search")
def crawled_npc_search(q: str = ""):
    if not q:
        return {"npcs": []}
    db = get_db()
    queries = Queries(db)
    return {"npcs": [dict(n) for n in queries.search_crawled_npcs(q)]}


@app.get("/api/crawled/npcs/{npc_id}")
def crawled_npc_detail(npc_id: int):
    db = get_db()
    queries = Queries(db)
    npc = queries.get_crawled_npc(npc_id)
    if not npc:
        raise HTTPException(404, "NPC not found")
    return dict(npc)


@app.get("/api/crawled/npcs/{npc_id}/quests")
def crawled_npc_quests(npc_id: int):
    db = get_db()
    queries = Queries(db)
    return {"quests": [dict(q) for q in queries.get_quests_by_npc(npc_id)]}


# ============================================================
# Crawled Data: Quests (4 endpoints)
# ============================================================

@app.get("/api/crawled/quests")
def crawled_quests(limit: int = 100, offset: int = 0):
    db = get_db()
    queries = Queries(db)
    return {"quests": [dict(q) for q in queries.get_all_crawled_quests(limit, offset)],
            "total": queries.get_crawled_quest_count()}


@app.get("/api/crawled/quests/stats")
def crawled_quest_stats():
    db = get_db()
    queries = Queries(db)
    count = queries.get_crawled_quest_count()
    area_dist = queries.get_quest_area_distribution()
    return {"total": count, "area_distribution": [dict(r) for r in area_dist]}


@app.get("/api/crawled/quests/search")
def crawled_quest_search(q: str = ""):
    if not q:
        return {"quests": []}
    db = get_db()
    queries = Queries(db)
    return {"quests": [dict(q_row) for q_row in queries.search_crawled_quests(q)]}


@app.get("/api/crawled/quests/{quest_id}")
def crawled_quest_detail(quest_id: int):
    db = get_db()
    queries = Queries(db)
    quest = queries.get_crawled_quest(quest_id)
    if not quest:
        raise HTTPException(404, "Quest not found")
    return dict(quest)


# ============================================================
# Crawled Data: NPC-Quest Network (1 endpoint)
# ============================================================

@app.get("/api/crawled/network")
def crawled_npc_quest_network():
    """Get NPC-Quest connection graph data for D3.js"""
    db = get_db()
    queries = Queries(db)
    connections = queries.get_npc_quest_network()
    nodes = {}
    links = []
    for c in connections:
        c = dict(c)
        quest_node_id = f"quest_{c['quest_id']}"
        if quest_node_id not in nodes:
            nodes[quest_node_id] = {"id": quest_node_id, "name": c["quest_name"], "type": "quest"}

        if c.get("start_npc_id"):
            npc_node_id = f"npc_{c['start_npc_id']}"
            if npc_node_id not in nodes:
                nodes[npc_node_id] = {"id": npc_node_id, "name": c.get("start_npc_name", "Unknown"), "type": "npc"}
            links.append({"source": npc_node_id, "target": quest_node_id, "type": "starts"})

        if c.get("end_npc_id"):
            npc_node_id = f"npc_{c['end_npc_id']}"
            if npc_node_id not in nodes:
                nodes[npc_node_id] = {"id": npc_node_id, "name": c.get("end_npc_name", "Unknown"), "type": "npc"}
            links.append({"source": quest_node_id, "target": npc_node_id, "type": "completes"})

    return {"nodes": list(nodes.values()), "links": links}


# ============================================================
# Wiki Pages - Fandom (5 endpoints)
# ============================================================

@app.get("/api/wiki/pages")
def get_wiki_pages(limit: int = 100, offset: int = 0, category: str = None):
    db = get_db()
    queries = Queries(db)
    return {"pages": [dict(p) for p in queries.get_all_wiki_pages(limit, offset, category)],
            "total": queries.get_wiki_page_count(category)}


@app.get("/api/wiki/categories")
def get_wiki_categories():
    db = get_db()
    queries = Queries(db)
    return {"categories": [dict(c) for c in queries.get_wiki_categories()]}


@app.get("/api/wiki/stats")
def get_wiki_stats():
    db = get_db()
    queries = Queries(db)
    count = queries.get_wiki_page_count()
    categories = queries.get_wiki_categories()
    return {"total": count, "categories": [dict(c) for c in categories]}


@app.get("/api/wiki/search")
def search_wiki(q: str = ""):
    if not q:
        return {"pages": []}
    db = get_db()
    queries = Queries(db)
    return {"pages": [dict(p) for p in queries.search_wiki_pages(q)]}


@app.get("/api/wiki/pages/{page_id}")
def get_wiki_page(page_id: int):
    db = get_db()
    queries = Queries(db)
    page = queries.get_wiki_page(page_id)
    if not page:
        raise HTTPException(404, "Wiki page not found")
    return dict(page)


if __name__ == "__main__":
    import uvicorn
    from config import SERVER_HOST, SERVER_PORT
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
