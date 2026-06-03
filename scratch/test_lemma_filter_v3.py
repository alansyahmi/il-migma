import sys
sys.path.append('scripts')
from scrape_wiktionary_maltese_a import parse_entry_rows

# Use h3 for language since SectionCapture looks for heading level >= 3
html_lemma = """
<h3 id="Maltese">Maltese</h3>
<h4>Noun</h4>
<ul>
<li>alternative form of abbaku: abacus</li>
</ul>
"""
rows_lemma = parse_entry_rows('abaku', html_lemma)
print(f"Lemma rows (abaku): {len(rows_lemma)}")
if len(rows_lemma) > 0:
    print(f"Definition: {rows_lemma[0]['definitions'][0]['text_en']}")
