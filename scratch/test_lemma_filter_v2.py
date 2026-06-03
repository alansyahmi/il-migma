import sys
sys.path.append('scripts')
from scrape_wiktionary_maltese_a import parse_entry_rows

html_non_lemma = """
<div class="mw-heading mw-heading3"><h3 id="Maltese">Maltese</h3></div>
<div class="mw-heading mw-heading4"><h4 id="Verb">Verb</h4></div>
<ul><li>second-person singular imperative of ghaqar</li></ul>
"""
rows = parse_entry_rows('aghqar', html_non_lemma)
print(f"Non-lemma rows (aghqar): {len(rows)}")

html_lemma = """
<div class="mw-heading mw-heading3"><h3 id="Maltese">Maltese</h3></div>
<div class="mw-heading mw-heading4"><h4 id="Noun">Noun</h4></div>
<ul><li>alternative form of abbaku: abacus</li></ul>
"""
rows_lemma = parse_entry_rows('abaku', html_lemma)
print(f"Lemma rows (abaku): {len(rows_lemma)}")
