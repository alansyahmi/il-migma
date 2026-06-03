import sys
sys.path.append('scripts')
from scrape_wiktionary_maltese_a import parse_entry_rows

html = """
<div class="mw-heading mw-heading3"><h3 id="Maltese">Maltese</h3></div>
<div class="mw-heading mw-heading4"><h4 id="Verb">Verb</h4></div>
<ul><li><span class="headword">agħqar</span></li>
<li>second-person singular imperative of għaqar</li></ul>
"""

rows = parse_entry_rows('agħqar', html)
print(f"Rows found for agħqar: {len(rows)}")
for r in rows:
    print(r['id'])

html_lemma = """
<div class="mw-heading mw-heading3"><h3 id="Maltese">Maltese</h3></div>
<div class="mw-heading mw-heading4"><h4 id="Noun">Noun</h4></div>
<ul><li><span class="headword">abaku</span></li>
<li>alternative form of abbaku: abacus</li></ul>
"""
rows_lemma = parse_entry_rows('abaku', html_lemma)
print(f"Rows found for abaku: {len(rows_lemma)}")
