"""
SQLite Storage Engine for Saved Reels
Stores metadata, spoken transcripts, topic tags, exact saved timestamps, and vector representations.
"""

import sqlite3
import json
import os
import time

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reels.db")
NOW_MS = int(time.time() * 1000)

SAMPLE_REELS = [
    {
        "id": "reel_001",
        "url": "https://www.instagram.com/reel/C3_sample1/",
        "creator": "@chef_antonio",
        "caption": "Authentic Carbonara without heavy cream! Just egg yolks, pecorino romano, guanciale and black pepper. Quick 15 min dinner.",
        "spoken_transcript": "Listen to me, never ever add cream or milk to carbonara! The true Roman way uses only egg yolk, finely grated Pecorino Romano cheese, cured guanciale pork cheek, and fresh cracked black pepper. Mix the pasta water into the eggs to create that silky velvet emulsion.",
        "topics": ["cooking", "pasta", "italian", "dinner", "carbonara"],
        "thumbnail": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&auto=format&fit=crop&q=60",
        "audio": "Original Audio - chef_antonio",
        "saved_at": NOW_MS - (3600000 * 4) # 4 hours ago
    },
    {
        "id": "reel_002",
        "url": "https://www.instagram.com/reel/C3_sample2/",
        "creator": "@fit_lifestyle",
        "caption": "10 minute morning mobility stretch routine for lower back pain and tight hip flexors. Do this right after waking up!",
        "spoken_transcript": "If you sit at a computer desk all day, your psoas and hip flexors are locked tight. Start in a deep lunge, tuck your pelvis forward, squeeze your glutes, and raise your opposite arm overhead. Hold for 45 seconds on each side to release lower back pressure immediately.",
        "topics": ["fitness", "stretching", "mobility", "workout", "yoga", "back pain"],
        "thumbnail": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=60",
        "audio": "Chill Lo-Fi Morning Beats",
        "saved_at": NOW_MS - (86400000 * 2) # 2 days ago
    },
    {
        "id": "reel_003",
        "url": "https://www.instagram.com/reel/C3_sample3/",
        "creator": "@code_insights",
        "caption": "5 hidden VS Code extensions that will save you 2 hours every day. AI code completion, git graph, and error lens explained.",
        "spoken_transcript": "Stop writing boilerplate code by hand. Extension number one is Error Lens, which displays inline errors directly next to your code. Number two is Git Graph to visualize git branch history without leaving your terminal. And number three is AI inline auto-complete for full-stack functions.",
        "topics": ["programming", "coding", "productivity", "tech", "software", "vscode"],
        "thumbnail": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop&q=60",
        "audio": "Synthwave Coding - SynthLab",
        "saved_at": NOW_MS - (86400000 * 5) # 5 days ago
    },
    {
        "id": "reel_004",
        "url": "https://www.instagram.com/reel/C3_sample4/",
        "creator": "@desi_swad",
        "caption": "Ghar par banayein crispy restaurant style masala dosa aur nariyal ki chutney! Easy step by step breakfast recipe.",
        "spoken_transcript": "Doston aaj hum banayenge hotel jaisi crispy kurkuri masala dosa. Batter ko raat bhar ferment hone dein. Tawa ko halka paani daal kar wipe karein, fir medium flame par batter ko circular motion me spread karein. Aloo masala bhar kar crispy golden hone tak senkein. Ye subah ka perfect nashta hai!",
        "topics": ["cooking", "breakfast", "indian", "dosa", "nashta", "chutney"],
        "thumbnail": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&auto=format&fit=crop&q=60",
        "audio": "Flute Traditional Fusion",
        "saved_at": NOW_MS - (86400000 * 12) # 12 days ago
    },
    {
        "id": "reel_005",
        "url": "https://www.instagram.com/reel/C3_sample5/",
        "creator": "@focus_mastery",
        "caption": "The 80/20 Rule (Pareto Principle) explained with coffee cups. How 20 percent of your daily habits generate 80 percent of your happiness.",
        "spoken_transcript": "Vilfredo Pareto noticed that 80 percent of results come from 20 percent of causes. In your life, think of these coffee cups. You have 10 habits each day, but only two of them produce all your career progress and energy: uninterrupted deep work and quality sleep. Eliminate the other 8 distractions.",
        "topics": ["psychology", "habits", "productivity", "mindset", "books", "pareto"],
        "thumbnail": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=60",
        "audio": "Inspirational Piano Ambient",
        "saved_at": NOW_MS - (86400000 * 20) # 20 days ago
    },
    {
        "id": "reel_006",
        "url": "https://www.instagram.com/reel/C3_sample6/",
        "creator": "@auto_detailer",
        "caption": "How to properly wash and ceramic coat your car without leaving micro-scratches or swirl marks. Two bucket method tutorial.",
        "spoken_transcript": "Never use a dry sponge on your car's clear coat paint! Always use the two-bucket method with grit guards. One bucket with pH-neutral car foam shampoo, and one bucket filled with clean rinse water. Dip your microfiber wash mitt in clean water before touching the automotive paint again.",
        "topics": ["car", "automotive", "detailing", "gaadi", "cleaning"],
        "thumbnail": "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&auto=format&fit=crop&q=60",
        "audio": "Bass Boosted Garage",
        "saved_at": NOW_MS - (86400000 * 45) # 45 days ago
    }
]


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_reels (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                creator TEXT,
                caption TEXT,
                spoken_transcript TEXT,
                topics_json TEXT,
                thumbnail TEXT,
                audio TEXT,
                saved_at INTEGER
            )
        """)

        cur = conn.execute("SELECT COUNT(*) FROM saved_reels")
        count = cur.fetchone()[0]
        if count == 0:
            for r in SAMPLE_REELS:
                conn.execute("""
                    INSERT OR REPLACE INTO saved_reels 
                    (id, url, creator, caption, spoken_transcript, topics_json, thumbnail, audio, saved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    r["id"],
                    r["url"],
                    r["creator"],
                    r["caption"],
                    r.get("spoken_transcript", ""),
                    json.dumps(r.get("topics", [])),
                    r.get("thumbnail", ""),
                    r.get("audio", ""),
                    r.get("saved_at", int(time.time() * 1000))
                ))
    conn.close()


def get_all_reels(sort_by="date_desc"):
    conn = get_connection()
    order_clause = "ORDER BY saved_at DESC" if sort_by == "date_desc" else "ORDER BY saved_at ASC"
    cur = conn.execute(f"SELECT * FROM saved_reels {order_clause}")
    rows = cur.fetchall()
    reels = []
    for row in rows:
        reels.append({
            "id": row["id"],
            "url": row["url"],
            "creator": row["creator"],
            "caption": row["caption"],
            "spoken_transcript": row["spoken_transcript"],
            "topics": json.loads(row["topics_json"] or "[]"),
            "thumbnail": row["thumbnail"],
            "audio": row["audio"],
            "savedAt": row["saved_at"]
        })
    conn.close()
    return reels


def insert_or_update_reel(reel_dict):
    conn = get_connection()
    saved_at = reel_dict.get("savedAt") or reel_dict.get("saved_at") or int(time.time() * 1000)
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO saved_reels
            (id, url, creator, caption, spoken_transcript, topics_json, thumbnail, audio, saved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reel_dict.get("id") or reel_dict.get("url"),
            reel_dict.get("url"),
            reel_dict.get("creator", ""),
            reel_dict.get("caption", ""),
            reel_dict.get("spoken_transcript", ""),
            json.dumps(reel_dict.get("topics", [])),
            reel_dict.get("thumbnail", ""),
            reel_dict.get("audio", ""),
            int(saved_at)
        ))
    conn.close()


def import_instagram_export_file(file_path):
    """
    Parses an official Instagram saved_posts.json or saved_collections.json export file
    and imports all entries with their exact historical timestamps into the SQLite database.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    entries = []
    if "saved_saved_media" in data and isinstance(data["saved_saved_media"], list):
        entries = data["saved_saved_media"]
    elif isinstance(data, list):
        entries = data
    elif "saved_collections" in data and isinstance(data["saved_collections"], list):
        entries = data["saved_collections"]

    imported_count = 0
    now_ms = int(time.time() * 1000)

    for entry in entries:
        href = ""
        timestamp = now_ms
        title = entry.get("title", "")

        if "string_map_data" in entry and isinstance(entry["string_map_data"], dict):
            for k, val in entry["string_map_data"].items():
                if "href" in val:
                    href = val["href"]
                if "timestamp" in val:
                    timestamp = int(val["timestamp"]) * 1000
        elif "string_list_data" in entry and len(entry["string_list_data"]) > 0:
            item = entry["string_list_data"][0]
            if "href" in item:
                href = item["href"]
            if "timestamp" in item:
                timestamp = int(item["timestamp"]) * 1000

        if href:
            creator = title if title.startswith("@") else (f"@{title}" if title else "@instagram_creator")
            insert_or_update_reel({
                "id": href,
                "url": href,
                "creator": creator,
                "caption": f"Saved Reel by {creator}",
                "spoken_transcript": "",
                "topics": [w for w in title.lower().split() if len(w) > 3],
                "thumbnail": "",
                "audio": "",
                "savedAt": timestamp
            })
            imported_count += 1

    return imported_count
