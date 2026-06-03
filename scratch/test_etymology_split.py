import json
import sys

sys.path.append('scripts')
from scrape_wiktionary_maltese_a import build_etymology_chain

texts = [
    "Borrowed from Spanish Abella from Catalan abella (“bee”)",
    "Related to Hebrew הبل (“Hebel”)",
    "Borrowed from Italian arsella and/or Sicilian arcella (“small clam”)"
]

for t in texts:
    print(f"\nText: {t}")
    chain = build_etymology_chain(t, fetch_missing=False)
    print(json.dumps(chain, indent=2, ensure_ascii=False))
