"""
ReelRecall AI - Backend API Server
Supports multilingual semantic search, date/time sorting, timeframe filters,
and direct Instagram data export ingestion.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import init_db, get_all_reels, insert_or_update_reel, import_instagram_export_file
from vector_engine import ReelVectorIndex

PORT = 8000
HOST = "127.0.0.1"

vector_index = ReelVectorIndex()


def reload_index():
    reels = get_all_reels()
    vector_index.set_reels(reels)
    print(f"[Engine] Indexed {len(reels)} saved reels into vector memory.")


class ReelRecallHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query_params = urllib.parse.parse_qs(parsed.query)

        # 1. Health & Stats
        if path == "/api/health" or path == "/":
            reels = get_all_reels()
            self._send_json_response(200, {
                "status": "online",
                "service": "ReelRecall AI Search Engine",
                "version": "1.2.0",
                "total_indexed": len(reels),
                "features": ["date_time_tracking", "multilingual_search", "auto_harvester", "meta_export_import"]
            })
            return

        # 2. Search Endpoint: /api/search?q=...&sort=date_desc&timeframe=month
        elif path == "/api/search":
            query = query_params.get("q", [""])[0]
            top_k = int(query_params.get("limit", [25])[0])
            sort_by = query_params.get("sort", ["relevance"])[0]
            timeframe = query_params.get("timeframe", ["all"])[0]

            results = vector_index.search(query=query, top_k=top_k, sort_by=sort_by, timeframe=timeframe)
            self._send_json_response(200, {
                "query": query,
                "sort": sort_by,
                "timeframe": timeframe,
                "count": len(results),
                "results": results
            })
            return

        # 3. Dynamic Suggestions: /api/suggest?q=...
        elif path == "/api/suggest":
            prefix = query_params.get("q", [""])[0]
            suggestions = vector_index.get_suggestions(prefix)
            self._send_json_response(200, {
                "prefix": prefix,
                "suggestions": suggestions
            })
            return

        # 4. List all reels: /api/reels
        elif path == "/api/reels":
            sort_by = query_params.get("sort", ["date_desc"])[0]
            reels = get_all_reels(sort_by=sort_by)
            self._send_json_response(200, {
                "count": len(reels),
                "reels": reels
            })
            return

        else:
            self._send_json_response(404, {"error": "Endpoint not found"})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception as e:
            self._send_json_response(400, {"error": f"Invalid JSON payload: {str(e)}"})
            return

        # 1. Batch Index Reels (from Auto-Harvester or Extension)
        if path == "/api/index":
            items = body if isinstance(body, list) else [body]
            added = 0
            for item in items:
                if item.get("url"):
                    insert_or_update_reel(item)
                    added += 1
            reload_index()
            self._send_json_response(200, {
                "message": f"Successfully indexed {added} reel(s)",
                "total_indexed": len(get_all_reels())
            })
            return

        # 2. Import Instagram Export File by Path
        elif path == "/api/import_file":
            file_path = body.get("file_path", "")
            if not file_path or not os.path.exists(file_path):
                self._send_json_response(400, {"error": "Valid file_path is required"})
                return
            try:
                count = import_instagram_export_file(file_path)
                reload_index()
                self._send_json_response(200, {
                    "message": f"Successfully imported {count} reels with historical timestamps",
                    "total_indexed": len(get_all_reels())
                })
            except Exception as e:
                self._send_json_response(500, {"error": str(e)})
            return

        else:
            self._send_json_response(404, {"error": "Endpoint not found"})


def run():
    init_db()
    reload_index()
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, ReelRecallHandler)
    print("=" * 65)
    print(f"🚀 ReelRecall AI Server running at http://{HOST}:{PORT}")
    print("✨ Features: Exact Timestamps, Auto-Harvest, Multilingual AI")
    print("✨ Health Check:      http://127.0.0.1:8000/api/health")
    print("✨ Search Endpoint:   http://127.0.0.1:8000/api/search?sort=date_desc")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down cleanly.")
        httpd.server_close()


if __name__ == "__main__":
    run()
