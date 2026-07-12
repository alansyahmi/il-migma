#!/usr/bin/env python3
"""
Python script to upload scraped wiktionary entries (JSONL) to the Il-Migma database.
Connects via the local or remote HTTP API.

Usage:
  python wiktionary-scraper/upload.py --file wiktionary-scraper/scraped-results/pronouns.jsonl
  python wiktionary-scraper/upload.py --file wiktionary-scraper/scraped-results/pronouns.jsonl --url https://your-production-domain.com --token YOUR_CLERK_ADMIN_JWT
"""

import argparse
import json
import os
import urllib.request
import urllib.parse
import sys
import time

def api_request(url, path, method="GET", body=None, token=None):
    headers = {
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        # Bypasses auth checks on localhost
        headers["Authorization"] = "Bearer local-dev"

    full_url = f"{url.rstrip('/')}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    
    req = urllib.request.Request(full_url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            err_msg = err_body.get("error", str(e))
        except Exception:
            err_msg = str(e)
        return e.code, {"error": err_msg}
    except Exception as e:
        return 500, {"error": str(e)}

def find_existing_entry(url, headword, pos):
    # Search for exact headword and pos
    query = urllib.parse.urlencode({
        "q": headword,
        "pos": pos,
        "lemma": "true",
        "limit": "5"
    })
    status, res = api_request(url, f"/api/search?{query}")
    if status == 200 and "results" in res:
        for item in res["results"]:
            if item.get("headword") == headword and item.get("pos") == pos:
                return item.get("id")
    return None

def main():
    parser = argparse.ArgumentParser(description="Upload wiktionary entries to Il-Migma")
    parser.add_argument("-f", "--file", required=True, help="Path to JSONL file to upload")
    parser.add_argument("-u", "--url", default="http://localhost:8788", help="Base URL of the Il-Migma server")
    parser.add_argument("-t", "--token", help="Admin Clerk JWT token (optional for localhost)")
    parser.add_argument("--delay", type=float, default=0.05, help="Delay in seconds between uploads")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}")
        sys.exit(1)

    print(f"Reading entries from {args.file}...")
    entries = []
    with open(args.file, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except Exception as e:
                print(f"Warning: Invalid JSON on line {line_num}: {e}")

    total = len(entries)
    print(f"Loaded {total} entries. Connecting to API at {args.url}...")

    stats = {"inserted": 0, "updated": 0, "failed": 0}

    for idx, entry in enumerate(entries, 1):
        headword = entry.get("headword")
        pos = entry.get("pos")
        if not headword or not pos:
            print(f"[{idx}/{total}] Skipping invalid entry: {entry}")
            stats["failed"] += 1
            continue

        # 1. Search for existing entry to get ID
        existing_id = find_existing_entry(args.url, headword, pos)

        # 2. Update or insert
        if existing_id:
            entry["id"] = existing_id
            status, res = api_request(args.url, "/api/admin/entries", method="PUT", body=entry, token=args.token)
            if status == 200:
                print(f"[{idx}/{total}] Updated: {headword} ({pos}) -> ID: {existing_id}")
                stats["updated"] += 1
            else:
                print(f"[{idx}/{total}] Failed to update {headword}: {res.get('error')}")
                stats["failed"] += 1
        else:
            status, res = api_request(args.url, "/api/admin/entries", method="POST", body=entry, token=args.token)
            if status == 201:
                new_id = res.get("id")
                print(f"[{idx}/{total}] Inserted: {headword} ({pos}) -> ID: {new_id}")
                stats["inserted"] += 1
            else:
                print(f"[{idx}/{total}] Failed to insert {headword}: {res.get('error')}")
                stats["failed"] += 1

        if args.delay > 0:
            time.sleep(args.delay)

    print("\nUpload Complete!")
    print(f"Total entries: {total}")
    print(f"Inserted:      {stats['inserted']}")
    print(f"Updated:       {stats['updated']}")
    print(f"Failed:        {stats['failed']}")

if __name__ == "__main__":
    main()
