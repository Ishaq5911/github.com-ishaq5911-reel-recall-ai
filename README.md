# ReelRecall AI - Instagram Saved Posts Finder

> An AI-powered search assistant and Chrome Extension that brings semantic, contextual, and multilingual search to your saved Instagram reels and posts.

---

## 🌟 The Problem
Users save hundreds or thousands of reels on Instagram, but Instagram only provides manual collections and zero semantic search. When you remember a reel ("that video where a guy explained 80/20 rule with coffee cups" or "nashta recipe with dosa"), you are left scrolling aimlessly.

## 🚀 The Solution
**ReelRecall AI** acts as your personal memory librarian:
1. **Contextual & Semantic Search:** Search by vague ideas, topics, or what was said in the video.
2. **Multilingual Understanding:** Search in Hindi, Spanish, Italian, or English (e.g. searching *"nashta"* finds English and Indian breakfast reels).
3. **Spoken Dialogue & Audio Indexing:** Searches what creators actually said in the video, not just emojis in captions.
4. **Spotlight Assistant (`Ctrl + K`):** Instant overlay directly inside Instagram with dynamic autocomplete suggestions.
5. **Zero Password Risk:** Operates safely inside your active browser session without scraping or credential sharing.

---

## 🏗️ Project Architecture

```
reel-search-ai/
├── extension/                  # Chrome / Edge Extension (Manifest V3)
│   ├── manifest.json           # Extension permissions and entrypoints
│   ├── popup/                  # Toolbar extension popup (Stats, Quick actions)
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── content/                # Injected script & UI on instagram.com
│   │   ├── content.css         # Modern dark-mode Spotlight modal
│   │   └── content.js          # DOM Scraper, Ctrl+K shortcut, suggestions
│   ├── background/             # Manifest V3 service worker
│   │   └── service-worker.js
│   └── icons/                  # 16px, 48px, 128px extension icons
│
├── backend/                    # Python AI Search Engine
│   ├── server.py               # Multi-threaded REST API (CORS enabled)
│   ├── vector_engine.py        # Multilingual concept vectorizer & BM25 hybrid search
│   ├── db.py                   # SQLite storage for reels & spoken transcripts
│   └── test_engine.py          # Unit & semantic search test suite
│
├── run_backend.bat             # 1-Click launcher for Windows
└── README.md                   # Full documentation & setup guide
```

---

## ⚡ Quick Start Guide

### Step 1: Start the AI Backend (Optional but Recommended)
Double-click `run_backend.bat` or run in terminal:
```bash
python backend/server.py
```
* The backend runs on `http://127.0.0.1:8000`.
* Check health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

*(Note: If the backend is not running, the extension still works using its built-in client-side smart fuzzy engine!)*

### Step 2: Load the Extension in Chrome / Edge / Brave
1. Open your browser and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked** and select the folder:
   ```text
   C:\Users\ishaq\.gemini\antigravity\scratch\reel-search-ai\extension
   ```
4. Open [instagram.com](https://www.instagram.com).
5. Press `Ctrl + K` (or click the floating orange gradient button in the bottom right corner).
6. Try searching for:
   - `pasta without cream` -> Finds Carbonara reel
   - `nashta` -> Finds Indian breakfast recipe
   - `hip pain sitting` -> Finds morning mobility routine
   - `@code_insights` -> Finds coding productivity reel
