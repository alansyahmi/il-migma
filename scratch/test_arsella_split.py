import json
import sys
import os

# Add scripts directory to path
sys.path.append('scripts')
from scrape_wiktionary_maltese_a import parse_entry_rows

with open('tmp/arsella.html', 'r', encoding='latin-1') as f: # Try latin-1 or similar if utf-8 fails
    html = f.read()

rows = parse_entry_rows('arsella', html)
print(json.dumps(rows, indent=2, ensure_ascii=False))
