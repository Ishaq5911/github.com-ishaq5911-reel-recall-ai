import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import init_db, get_all_reels
from vector_engine import ReelVectorIndex

def main():
    init_db()
    reels = get_all_reels()
    print(f"Total Reels in SQLite: {len(reels)}")

    idx = ReelVectorIndex()
    idx.set_reels(reels)

    print("\n--- 1. TESTING DATE SORTING (NEWEST SAVED FIRST) ---")
    newest = idx.search(query="", sort_by="date_desc", top_k=3)
    for r in newest:
        print(f"[{r.get('creator')}] SavedAt: {r.get('savedAt')} -> {r['caption'][:55]}...")

    print("\n--- 2. TESTING TIMEFRAME FILTER (THIS WEEK) ---")
    week_reels = idx.search(query="", timeframe="week", top_k=5)
    print(f"Reels saved this week: {len(week_reels)}")
    for r in week_reels:
        print(f" - {r.get('creator')}: {r['caption'][:50]}...")

    print("\n--- 3. TESTING SEMANTIC SEARCH + DATE SORTING ---")
    res = idx.search(query="cooking recipe", sort_by="date_desc", top_k=2)
    for r in res:
        print(f"Match: {r.get('creator')} | Score: {r.get('_score')} | Date: {r.get('savedAt')}")

if __name__ == "__main__":
    main()
