import sys
sys.path.append('scripts')
from scrape_wiktionary_maltese_a import parse_entry_rows

html_lemma = """
<h2>Maltese</h2>
<h3>Noun</h3>
<ul>
<li>alternative form of abbaku: abacus</li>
</ul>
"""
rows_lemma = parse_entry_rows('abaku', html_lemma)
print(f"Lemma rows (abaku): {len(rows_lemma)}")
if len(rows_lemma) > 0:
    print(f"Definition: {rows_lemma[0]['definitions'][0]['text_en']}")

html_non_lemma = """
<h2>Maltese</h2>
<h3>Verb</h3>
<ul>
<li>second-person singular imperative of ghaqar</li>
</ul>
"""
rows_non = parse_entry_rows('aghqar', html_non_lemma)
print(f"Non-lemma rows (aghqar): {len(rows_non)}")
