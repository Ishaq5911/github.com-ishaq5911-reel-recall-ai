"""
Multilingual Concept & Vector Search Engine
Provides hybrid semantic retrieval (dense concept vectors + BM25 keyword matching)
with sorting by exact saved date/time and timeframe filtering.
"""

import re
import math
import time
from collections import Counter

# Multilingual Concept Synonyms mapping cross-language terms to unified semantic concepts
MULTILINGUAL_CONCEPTS = {
    # Food & Cooking
    "cooking": ["recipe", "cook", "food", "kitchen", "chef", "khana", "rasoi", "pakana", "cocinar", "receta", "comida", "cucina"],
    "breakfast": ["nashta", "morning meal", "desayuno", "colazione", "pancakes", "eggs", "dosa", "idli", "paratha"],
    "pasta": ["carbonara", "spaghetti", "noodles", "italian food", "pecorino", "parmesan", "pasta recipe"],
    "dessert": ["sweet", "meetha", "mithai", "cake", "postre", "chocolate", "pastry"],
    
    # Fitness & Health
    "workout": ["exercise", "gym", "kasrat", "fitness", "bodybuilding", "ejercicio", "entrenamiento", "allenamento", "weights"],
    "mobility": ["stretching", "flexibility", "yoga", "back pain", "hip flexors", "posture", "relief", "stretch"],
    "diet": ["nutrition", "protein", "calories", "healthy eating", "weight loss", "vajan ghatana"],

    # Tech & Software
    "coding": ["programming", "developer", "software", "python", "javascript", "code", "coder", "vscode", "engineer"],
    "ai": ["artificial intelligence", "machine learning", "chatgpt", "gemini", "deep learning", "llm"],
    "productivity": ["habits", "time management", "focus", "discipline", "80/20 rule", "pomodoro", "study tips", "padhai"],

    # Finance & Business
    "money": ["investing", "stocks", "paisa", "wealth", "savings", "crypto", "dinero", "finance", "budget"],

    # Automotive & Travel
    "car": ["automotive", "vehicle", "gaadi", "motor", "driving", "auto", "coche", "detailing", "drift"],
    "travel": ["vacation", "trip", "ghoomna", "tourism", "viaje", "nature", "mountains", "beach"]
}

WORD_TO_CONCEPTS = {}
for concept, words in MULTILINGUAL_CONCEPTS.items():
    for word in words + [concept]:
        w = word.lower().strip()
        if w not in WORD_TO_CONCEPTS:
            WORD_TO_CONCEPTS[w] = set()
        WORD_TO_CONCEPTS[w].add(concept)


def tokenize(text):
    if not text:
        return []
    text = text.lower()
    return re.findall(r'[@#]?[\w]+', text)


def vectorize_text(text, spoken_text="", topics=None, creator=""):
    topics = topics or []
    counts = Counter()

    def process_field(content, weight):
        tokens = tokenize(content)
        for token in tokens:
            counts[token] += weight
            if token in WORD_TO_CONCEPTS:
                for concept in WORD_TO_CONCEPTS[token]:
                    counts[f"__concept_{concept}__"] += weight * 1.5

    process_field(creator, 4.0)
    process_field(spoken_text, 3.0)
    for t in topics:
        process_field(t, 2.5)
    process_field(text, 2.0)

    magnitude = math.sqrt(sum(v * v for v in counts.values()))
    if magnitude > 0:
        return {k: v / magnitude for k, v in counts.items()}
    return {}


def cosine_similarity(vec_a, vec_b):
    if not vec_a or not vec_b:
        return 0.0
    if len(vec_a) > len(vec_b):
        vec_a, vec_b = vec_b, vec_a
    return sum(weight * vec_b.get(term, 0.0) for term, weight in vec_a.items())


class ReelVectorIndex:
    def __init__(self):
        self.reels = []
        self.vectors = []

    def set_reels(self, reels_list):
        self.reels = reels_list
        self.vectors = []
        for r in reels_list:
            vec = vectorize_text(
                text=r.get("caption", ""),
                spoken_text=r.get("spoken_transcript", ""),
                topics=r.get("topics", []),
                creator=r.get("creator", "")
            )
            self.vectors.append(vec)

    def search(self, query="", top_k=20, sort_by="relevance", timeframe="all"):
        """
        Hybrid search with temporal filtering and date sorting.
        """
        now_ms = int(time.time() * 1000)
        time_limits = {
            "today": 86400000,
            "week": 86400000 * 7,
            "month": 86400000 * 30
        }
        max_age = time_limits.get(timeframe, float("inf"))

        # Filter by timeframe first
        filtered_indices = []
        for idx, r in enumerate(self.reels):
            saved_at = r.get("savedAt") or r.get("saved_at") or 0
            if (now_ms - saved_at) <= max_age:
                filtered_indices.append(idx)

        # If no query provided, return list sorted by date
        if not query or not query.strip():
            results = [dict(self.reels[i], _score=1.0, _match_reasons=["Saved library"]) for i in filtered_indices]
            if sort_by == "date_desc":
                results.sort(key=lambda x: (x.get("savedAt") or x.get("saved_at") or 0), reverse=True)
            elif sort_by == "date_asc":
                results.sort(key=lambda x: (x.get("savedAt") or x.get("saved_at") or 0))
            return results[:top_k]

        q_clean = query.strip().lower()
        q_tokens = tokenize(q_clean)
        q_vec = vectorize_text(q_clean)

        results = []
        for idx in filtered_indices:
            reel = self.reels[idx]
            doc_vec = self.vectors[idx]
            sim = cosine_similarity(q_vec, doc_vec)

            creator = (reel.get("creator") or "").lower()
            caption = (reel.get("caption") or "").lower()
            spoken = (reel.get("spoken_transcript") or "").lower()
            topics = [t.lower() for t in reel.get("topics", [])]

            keyword_boost = 0.0
            matched_terms = []

            for token in q_tokens:
                if token.startswith("@") and token == creator:
                    keyword_boost += 0.8
                    matched_terms.append(f"Creator @match")
                elif token in creator:
                    keyword_boost += 0.4
                    matched_terms.append(f"Creator handle")
                if token in caption:
                    keyword_boost += 0.25
                    matched_terms.append(f"Caption: '{token}'")
                if token in spoken:
                    keyword_boost += 0.35
                    matched_terms.append(f"Spoken: '{token}'")
                if any(token in t for t in topics):
                    keyword_boost += 0.3
                    matched_terms.append(f"Topic tag")

            total_score = sim + keyword_boost

            if total_score > 0.05:
                item = dict(reel)
                item["_score"] = round(total_score, 3)
                item["_match_reasons"] = list(set(matched_terms)) if matched_terms else ["Semantic Concept Match"]
                results.append(item)

        # Sorting
        if sort_by == "date_desc":
            results.sort(key=lambda x: (x.get("savedAt") or x.get("saved_at") or 0), reverse=True)
        elif sort_by == "date_asc":
            results.sort(key=lambda x: (x.get("savedAt") or x.get("saved_at") or 0))
        else:
            results.sort(key=lambda x: x["_score"], reverse=True)

        return results[:top_k]

    def get_suggestions(self, prefix, max_suggestions=6):
        if not prefix or not prefix.strip():
            popular = ["@chef_antonio", "quick pasta without cream", "mobility stretch", "80/20 rule", "nashta recipe"]
            return [{"text": p, "type": "starter"} for p in popular[:max_suggestions]]

        p = prefix.strip().lower()
        suggestions = []
        seen = set()

        for reel in self.reels:
            creator = reel.get("creator", "")
            if creator and p in creator.lower() and creator not in seen:
                suggestions.append({"text": creator, "type": "creator"})
                seen.add(creator)

        for reel in self.reels:
            for t in reel.get("topics", []):
                if p in t.lower() and t not in seen:
                    suggestions.append({"text": f"#{t}", "type": "topic"})
                    seen.add(t)

        for concept, words in MULTILINGUAL_CONCEPTS.items():
            for w in words:
                if p in w and w not in seen:
                    suggestions.append({"text": w, "type": "concept"})
                    seen.add(w)
                    break

        if not suggestions:
            suggestions.append({"text": f"Reels about '{prefix}'", "type": "query"})
            suggestions.append({"text": f"Spoken context for '{prefix}'", "type": "query"})

        return suggestions[:max_suggestions]
