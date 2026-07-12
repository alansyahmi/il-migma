from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote
from typing import Dict, List, Optional, Tuple

DEFAULT_OUTPUT = Path('tmp/wiktionary_maltese_A.jsonl')
DEFAULT_SEED_URLS = [
    'https://en.wiktionary.org/w/index.php?title=Category:Maltese_lemmas&from=A',
    'https://en.wiktionary.org/w/index.php?title=Category:Maltese_lemmas&pagefrom=ALBANIJA%0AAlbanija&subcatfrom=A&filefrom=A#mw-pages',
    'https://en.wiktionary.org/w/index.php?title=Category:Maltese_lemmas&filefrom=A&pagefrom=AREMM%0Aaremm&subcatfrom=A#mw-pages',
    'https://en.wiktionary.org/w/index.php?title=Category:Maltese_lemmas&filefrom=A&pagefrom=AWTOREVOLI%0Aawtorevoli&subcatfrom=A#mw-pages',
]

POS_ALIASES = {
    'noun': 'noun',
    'proper noun': 'noun',
    'verb': 'verb',
    'adjective': 'adjective',
    'adverb': 'adverb',
    'preposition': 'preposition',
    'conjunction': 'conjunction',
    'particle': 'particle',
    'article': 'article',
    'pronoun': 'pronoun',
    'interrogative': 'interrogative',
    'numeral': 'numeral',
    'interjection': 'interjection',
    'participle': 'participle',
    'verbal noun': 'verbal_noun',
}

SHORT_POS_MAP = {
    'noun': 'n',
    'verb': 'v',
    'adjective': 'adj',
    'adverb': 'adv',
    'preposition': 'prep',
    'conjunction': 'conj',
    'particle': 'part',
    'article': 'art',
    'pronoun': 'pron',
    'interrogative': 'int',
    'numeral': 'num',
    'interjection': 'intj',
    'participle': 'participle',
    'verbal_noun': 'vn',
}

USER_AGENT = 'il-migma-wiktionary-scraper/1.0 (+https://github.com/openai)'
API = 'https://en.wiktionary.org/w/api.php'


@dataclass
class SectionCapture(HTMLParser):
    target_language: str = "Maltese"
    in_target: bool = False
    current_pos: Optional[str] = None
    current_pos_label: Optional[str] = None
    etymology_text: Optional[str] = None
    sections: Dict[str, List[str]] = field(default_factory=dict)
    section_labels: Dict[str, str] = field(default_factory=dict)

    def __post_init__(self):
        super().__init__()
        self.sections = {}
        self.section_labels = {}
        self._heading_tag: Optional[str] = None
        self._heading_text: List[str] = []
        self._heading_level: Optional[int] = None
        self._collect_etymology = False
        self._etymology_text: List[str] = []
        self._in_definition_list = False
        self._definition_list_depth = 0
        self._collect_li = False
        self._li_depth = 0
        self._li_text: List[str] = []
        self._skip_depth = 0

    def _flush_etymology(self) -> None:
        if not self._collect_etymology:
            return
        text = clean_text(''.join(self._etymology_text))
        self._collect_etymology = False
        self._etymology_text = []
        if text and not self.etymology_text:
            self.etymology_text = text

    def _flush_heading(self) -> None:
        if self._heading_level is None or self._heading_tag is None:
            return
        text = clean_text(''.join(self._heading_text))
        level = self._heading_level
        self._heading_tag = None
        self._heading_text = []
        self._heading_level = None

        if level == 2:
            self._flush_etymology()
            self.in_target = text == self.target_language
            self.current_pos = None
            self.current_pos_label = None
            self._collect_etymology = False
            self._etymology_text = []
            self._in_definition_list = False
            self._definition_list_depth = 0
            return

        if not self.in_target or level < 3:
            return

        normalized = text.casefold()
        self._flush_etymology()
        if normalized.startswith('etymology'):
            self.current_pos = None
            self.current_pos_label = None
            self._collect_etymology = True
            self._etymology_text = []
            self._in_definition_list = False
            self._definition_list_depth = 0
            return

        pos = POS_ALIASES.get(normalized)
        self.current_pos = pos
        self.current_pos_label = text if pos else None
        self._in_definition_list = False
        self._definition_list_depth = 0
        if pos:
            self.section_labels[pos] = text
            if pos not in self.sections:
                self.sections[pos] = []
        else:
            self.current_pos = None
            self.current_pos_label = None

    def _flush_li(self) -> None:
        if not self._collect_li:
            return
        text = clean_text(''.join(self._li_text))
        self._collect_li = False
        self._li_depth = 0
        self._li_text = []
        if self.in_target and self.current_pos and text:
            self.sections.setdefault(self.current_pos, []).append(text)

    def handle_starttag(self, tag: str, attrs):
        if tag in {'h2', 'h3'}:
            self._flush_li()
            self._flush_heading()
            self._heading_tag = tag
            self._heading_level = 2 if tag == 'h2' else 3
            self._heading_text = []
            return

        if self._heading_tag and tag == 'span':
            return

        if self.in_target and self.current_pos and tag == 'ol' and not self._in_definition_list:
            self._in_definition_list = True
            self._definition_list_depth = 1
            return

        if self._collect_etymology and tag in {'br', 'p', 'li', 'div', 'ul', 'ol'}:
            if self._etymology_text and not self._etymology_text[-1].endswith('\n'):
                self._etymology_text.append('\n')
            return

        if self._in_definition_list and tag == 'ol':
            self._definition_list_depth += 1
            return

        if self._in_definition_list and tag == 'li':
            if not self._collect_li:
                self._collect_li = True
                self._li_depth = 1
                self._li_text = []
            else:
                self._li_depth += 1
            return

        if self._collect_li:
            if tag in {'dl', 'ul', 'ol'}:
                self._skip_depth += 1
            if self._skip_depth == 0:
                self._li_text.append(f'<{tag}>')

    def handle_endtag(self, tag: str):
        if self._heading_tag and tag == self._heading_tag:
            self._flush_heading()
            return

        if self._collect_etymology:
            if tag == 'h3':
                self._flush_etymology()
            else:
                self._etymology_text.append(f'</{tag}>')
            return

        if self._in_definition_list:
            if tag == 'li':
                self._li_depth -= 1
                if self._li_depth <= 0:
                    self._flush_li()
                else:
                    self._li_text.append('</li>')
                return
            if tag == 'ol':
                self._definition_list_depth -= 1
                if self._definition_list_depth <= 0:
                    self._in_definition_list = False
                    self._definition_list_depth = 0
                    self.current_pos = None
                    self.current_pos_label = None
                return
            if self._collect_li:
                if tag in {'dl', 'ul', 'ol'}:
                    self._skip_depth = max(0, self._skip_depth - 1)
                if self._skip_depth == 0:
                    self._li_text.append(f'</{tag}>')

    def handle_data(self, data: str):
        if self._heading_tag:
            self._heading_text.append(data)
        elif self._collect_etymology:
            self._etymology_text.append(data)
        elif self._collect_li:
            if self._skip_depth == 0:
                self._li_text.append(data)

    def close(self):
        self._flush_li()
        self._flush_etymology()
        self._flush_heading()
        super().close()


def clean_text(value: str) -> str:
    text = html.unescape(value)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\[[0-9]+\]', '', text)
    text = re.sub(r'\[\s*edit\s*\]', '', text, flags=re.I)
    text = re.sub(r'\s+', ' ', text)
    text = text.replace(' ,', ',').replace(' .', '.').replace(' ;', ';').replace(' :', ':')
    return text.strip(' \t\r\n\u00a0')


def slugify(value: str) -> str:
    value = value.strip().lower().replace(' ', '-')
    value = re.sub(r'[^a-z0-9\u00c0-\u024f\-]+', '', value)
    value = re.sub(r'-+', '-', value)
    return value.strip('-') or 'entry'


def request_text(url: str) -> str:
    js = f"""
const target = process.argv[1];
const response = await fetch(target, {{ headers: {{ 'User-Agent': '{USER_AGENT}' }} }});
if (!response.ok) {{
  console.error(`HTTP ${{response.status}} for ${{target}}`);
  process.exit(1);
}}
process.stdout.write(await response.text());
""".strip()
    result = subprocess.run(
        ['node', '--input-type=module', '-e', js, url],
        check=True,
        capture_output=True,
        encoding='utf-8',
        errors='replace',
        timeout=120,
    )
    return result.stdout


def request_json(url: str) -> dict:
    return json.loads(request_text(url))


def fetch_category_titles_from_page(url: str) -> List[str]:
    html_text = request_text(url)
    start = html_text.find('<div id="mw-pages">')
    if start >= 0:
        html_text = html_text[start:]
    titles: List[str] = []
    for group_html in re.findall(r'<div class="mw-category-group">(.*?)</div>', html_text, flags=re.S):
        for match in re.finditer(r'<a href="/wiki/[^"]+" title="([^"]+)">([^<]+)</a>', group_html):
            title = html.unescape(match.group(1)).strip()
            if title and ':' not in title:
                titles.append(title)
    return titles


def fetch_page_html(title: str) -> str:
    page = quote(title.replace(' ', '_'), safe='')
    url = f'https://en.wiktionary.org/wiki/{page}'
    return request_text(url)


def first_alpha_letter(value: str) -> str:
    match = re.search(r'[A-Za-zĊĠĦŻċġĦż]', value)
    return match.group(0).casefold() if match else ''


LETTER_MAP = {
    'a': 'A', 'b': 'B', 'ċ': 'C', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F',
    'ġ': 'G', 'g': 'G', 'għ': 'G', 'h': 'H', 'ħ': 'H', 'i': 'I', 'ie': 'I',
    'j': 'J', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O', 'p': 'P',
    'q': 'Q', 'r': 'R', 's': 'S', 't': 'T', 'u': 'U', 'v': 'V', 'w': 'W',
    'x': 'X', 'ż': 'Z', 'z': 'Z'
}


def get_collation_char(title: str) -> str:
    first = first_alpha_letter(title)
    if not first:
        return ''
    return LETTER_MAP.get(first, first.upper())



# Global lookup counter for the "first 3" feature request
ET_LOOKUP_COUNT = 0
MAX_ET_LOOKUPS = 3
GLOSBE_LANG_MAP = {
    'Arabic': 'ar', 'Italian': 'it', 'Sicilian': 'scn', 'Latin': 'la', 'French': 'fr', 
    'Greek': 'el', 'English': 'en', 'Spanish': 'es', 'Berber': 'ber', 'Phoenician': 'phn', 
    'Punic': 'xpu', 'Ancient Greek': 'grc', 'Portuguese': 'pt', 'Catalan': 'ca', 
    'Norman': 'nrf', 'Hebrew': 'he', 'Aramaic': 'arc', 'Turkish': 'tr', 'Malay': 'ms', 
    'Hindi': 'hi', 'Urdu': 'ur', 'Russian': 'ru', 'German': 'de', 'Dutch': 'nl',
    'Syriac': 'syc', 'Akkadian': 'akk'
}

def lookup_glosbe_definition(language: str, term: str) -> Optional[str]:
    """Fetches a definition from Glosbe as a fallback source."""
    lang_code = GLOSBE_LANG_MAP.get(language)
    if not lang_code:
        return None
        
    try:
        # Glosbe URL for human-readable definitions
        url = f"https://glosbe.com/{lang_code}/en/{quote(term)}"
        html_text = request_text(url)
        
        # Extract from the "top translations" summary sentence
        match = re.search(r'<strong>([^<]+)</strong> are the top translations', html_text)
        if match:
            return match.group(1).strip()
            
        # Fallback to the first translation header
        match = re.search(r'<h3[^>]*>([^<]+)</h3>', html_text)
        if match:
            return match.group(1).strip()
    except Exception:
        pass
    return None


def lookup_wiktionary_definition(language: str, term: str) -> Optional[str]:
    """Fetches the first definition of a term in a specific language by visiting its page."""
    try:
        # For lookups, we try to normalize the term to remove etymology-specific macrons
        normalized_term = term
        for char, repl in [('ā', 'a'), ('ē', 'e'), ('ī', 'i'), ('ō', 'o'), ('ū', 'u'), 
                           ('ḗ', 'e'), ('à', 'a'), ('è', 'e'), ('ì', 'i'), ('ò', 'o'), ('ù', 'u'),
                           ('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u')]:
            normalized_term = normalized_term.replace(char, repl)
            
        html_text = fetch_page_html(normalized_term)
        parser = SectionCapture(target_language=language)
        parser.feed(html_text)
        parser.close()
        
        # Try to find the first non-empty definition across all POS sections
        for pos in ['Noun', 'Verb', 'Adjective', 'Adverb', 'Proper noun', 'Numeral', 'Pronoun', 'Interjection', 'Preposition', 'Conjunction']:
            defs = parser.sections.get(pos)
            if defs:
                for d in defs:
                    cleaned = clean_text(d)
                    if cleaned and not cleaned.startswith('The ') and not cleaned.startswith('A '):
                        return cleaned
                    if cleaned:
                        return cleaned
        
        # Fallback: check any remaining sections
        if parser.sections:
            for defs in parser.sections.values():
                for d in defs:
                    cleaned = clean_text(d)
                    if cleaned: return cleaned
    except Exception:
        pass
    return None


def build_etymology_chain(raw_text: str, fetch_missing: bool = True) -> List[dict]:
    if not raw_text:
        return []
    
    global ET_LOOKUP_COUNT
    
    # Patterns for relationships - more inclusive
    rel_pattern = r'(?:Borrowed|Ultimately|Inherited|Derived|From|Cognate|Related|Of|Via|Through)\b(?:\s+(?:from|to|with|of|in))?'
    
    # Comprehensive list of languages, ordered by length to prevent partial matches
    lang_list = [
        'Arabic', 'Italian', 'Sicilian', 'Latin', 'French', 'Greek', 'English', 'Spanish', 
        'Berber', 'Phoenician', 'Punic', 'Medieval Latin', 'Ancient Greek', 'Vulgar Latin', 
        'Old French', 'Old English', 'Old Italian', 'Old Sicilian', 'Classical Arabic', 
        'Maghrebi Arabic', 'Occitan', 'Portuguese', 'Catalan', 'Norman', 'Sicilian Arabic', 
        'Old High German', 'Gothic', 'Sanskrit', 'Persian', 'Hebrew', 'Aramaic', 'Turkish',
        'Malay', 'Hindi', 'Urdu', 'Russian', 'German', 'Dutch', 'Dutch Low Saxon', 
        'Late Latin', 'New Latin', 'Middle English', 'Syriac', 'Akkadian'
    ]
    lang_list.sort(key=len, reverse=True)
    lang_pattern = '|'.join(lang_list)
    
    # Pattern for Gloss: typically (gloss) or "gloss" or “gloss”
    gloss_pattern = r'(?:\s*\(([^)]+)\)|\s*[\u201c"“”]([^”"“”]+)[\u201d"”])'
    
    # Junctions like "and/or", "or", or just a comma splitting multiple languages
    # Plus relationship-like words used internally: "from", "related to", "via"
    junction_pattern = r'\b(?:and/or|or|and|from|related to|via)\b|,'
    
    # regex to find "(Relationship OR Junction) + Language + [Term] + [Gloss]"
    # Group 1: Whole prefix, Group 2: Rel part, Group 3: Junction part, Group 4: Lang, Group 5: Term, Group 6/7: Gloss
    pattern = fr'(({rel_pattern})|({junction_pattern}))\s+({lang_pattern})(?:\s+([^,.;(\u201c\u201d"“”\s][^,.;(\u201c\u201d"“”]*))?(?:{gloss_pattern})?'
    
    chain = []
    text = html.unescape(raw_text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    last_rel = "From"
    
    for match in re.finditer(pattern, text, flags=re.I):
        prefix_rel = match.group(2)
        prefix_junct = match.group(3)
        lang = match.group(4).strip()
        term = match.group(5).strip() if match.group(5) else None
        # Gloss can be in either group 6 (parentheses) or group 7 (quotes)
        gloss = (match.group(6) or match.group(7) or "").strip() or None
        
        # Use existing last_rel if we hit a junction
        if prefix_rel:
            last_rel = prefix_rel.strip()
        elif prefix_junct:
            # If the junction itself is a relationship-like word, update last_rel
            if prefix_junct.lower() in ['from', 'related to', 'via']:
                last_rel = prefix_junct.strip()
            # Otherwise (and, or, comma), keep last_rel
        
        rel = last_rel

        # NEW: Handle internal junctions in the term
        # Example: "Spanish Abella from Catalan abella"
        if term:
            internal_pattern = fr'\s*({junction_pattern})\s+({lang_pattern})\b\s*(.*)$'
            m = re.search(internal_pattern, term, flags=re.I)
            if m:
                # First part
                first_term = term[:m.start()].strip()
                if first_term:
                    chain.append({
                        'relationship': rel.strip().capitalize(),
                        'language': lang.title(),
                        'term': first_term,
                        'definition': gloss
                    })
                
                # Determine relationship for the next part
                next_rel = rel
                junc_text = m.group(1).lower().strip()
                if junc_text in ['from', 'related to', 'via']:
                    next_rel = junc_text
                
                # Recursive part for the rest
                synthetic = f"{next_rel} {m.group(2)} {m.group(3)} " + (f'"{gloss}"' if gloss else "")
                sub_chain = build_etymology_chain(synthetic, fetch_missing=False)
                chain.extend(sub_chain)
                continue
        
        # Clean up gloss: often Wiktionary has (transliteration, "definition")
        if gloss:
            # Heuristic: Priority 1 - if there is a quoted part, that's the definition
            quoted = re.search(r'[\u201c"“”](.*?)[\u201d"”]', gloss)
            if quoted:
                gloss = quoted.group(1).strip()
            # Heuristic: Priority 2 - if no quotes and it looks like a transliteration, discard it
            elif lang.title() in ['Arabic', 'Classical Arabic', 'Maghrebi Arabic', 'Phoenician', 'Punic', 'Hebrew', 'Aramaic', 'Ancient Greek', 'Syriac', 'Akkadian']:
                # Common transliteration characters that shouldn't be in a definition
                if re.search(r'[ʔʿḥṯḏšṣḍṭẓġāēīōū\u02be\u02bf\u1e25\u1e6f\u1e0f\u1e63\u1e11\u1e3d\u1e53\u1e71\u1e0d\u1e6d\u1e63\u1e2b\u0161]', gloss):
                    gloss = None
                elif gloss and len(gloss.split()) == 1 and not any(c in '“"”' for c in gloss):
                    gloss = None
            else:
                # For other languages, take the last part if comma separated
                if ',' in gloss:
                    parts = [p.strip() for p in gloss.split(',')]
                    if len(parts) > 1:
                        found_quoted = False
                        for p in parts:
                            if any(c in '“"”' for c in p):
                                q_match = re.search(r'[\u201c"“”](.*?)[\u201d"”]', p)
                                if q_match:
                                    gloss = q_match.group(1).strip()
                                    found_quoted = True
                                    break
                        if not found_quoted:
                            gloss = parts[-1]

        # MULTI-SOURCE LOOKUP: If term is available but definition is missing
        if fetch_missing and term and not gloss and ET_LOOKUP_COUNT < MAX_ET_LOOKUPS:
            if lang.title() not in ['English', 'Maltese'] and ' ' not in term and '+' not in term:
                # Source A: Wiktionary (Deep Scrape)
                fetched = lookup_wiktionary_definition(lang.title(), term)
                if not fetched:
                    # Source B: Glosbe Fallback
                    fetched = lookup_glosbe_definition(lang.title(), term)
                    if fetched:
                         print(f"  [Glosbe] Fetched definition for {term} ({lang}): {fetched}", file=sys.stderr)
                else:
                    print(f"  [Wiktionary] Fetched definition for {term} ({lang}): {fetched}", file=sys.stderr)

                if fetched:
                    gloss = fetched
                    ET_LOOKUP_COUNT += 1

        # Final cleanup for punctuation
        if gloss:
            gloss = gloss.strip('.,; ')

        chain.append({
            'relationship': rel.capitalize(),
            'language': lang.title(),
            'term': term,
            'definition': gloss
        })
        
    return chain


def extract_tags(text: str) -> Tuple[str, List[str]]:
    if not text:
        return text, []
    tags = []
    # Match one or more leading parenthesized blocks: ( tag1 ) ( tag2 ) text
    while True:
        # Also handles ( tag1, tag2 )
        match = re.match(r'^\s*\(\s*([^)]+)\s*\)\s*(.*)$', text)
        if match:
            label = match.group(1).strip()
            # Common labels to extract as tags
            # We split by comma or semicolon
            for p in re.split(r'[,;]', label):
                p_clean = p.strip().lower()
                if p_clean:
                    tags.append(p_clean)
            text = match.group(2).strip()
        else:
            break
    return text, tags


def is_non_lemma_definition(text: str) -> bool:
    """Detects if a definition describes a non-lemma (inflectional) form."""
    if not text:
        return True
    
    text_clean = text.lower()
    # Patterns that strongly indicate a non-base form
    non_lemma_patterns = [
        r'\binflection of\b',
        r'\bimperative of\b',
        r'\bperson singular\b',
        r'\bperson plural\b',
        r'\bperson dual\b',
        r'\bparticiple of\b',
        r'\bpast participle of\b',
        r'\bpresent participle of\b',
        r'\balternative form of\b',
        r'\balternative spelling of\b',
    ]
    
    # If the definition contains a colon, usually everything after the colon is the real definition
    # e.g. "alternative form of x: meaning"
    if ':' in text_clean:
        main_part, definition_part = text.split(':', 1)
        # If the part after the colon has significant content, it's a good definition
        if len(definition_part.strip().split()) >= 1:
            return False
            
    for p in non_lemma_patterns:
        if re.search(p, text_clean):
            return True
            
    return False


def parse_entry_rows(title: str, html_text: str) -> List[dict]:
    parser = SectionCapture(target_language="Maltese")
    parser.feed(html_text)
    parser.close()

    rows: List[dict] = []
    # Count occurrences of (headword, short_pos) to create unique IDs
    id_counts: Dict[str, int] = {}

    for pos, defs in parser.sections.items():
        all_entry_tags = set()
        cleaned_defs = []
        is_pos_non_lemma = True
        
        for definition in defs:
            cleaned = clean_text(definition)
            if cleaned:
                # If we find at least one definition that isn't just an inflection, 
                # the POS section is considered a lemma section
                if not is_non_lemma_definition(cleaned):
                    is_pos_non_lemma = False
                
                text_clean, tags = extract_tags(cleaned)
                for t in tags: all_entry_tags.add(t)
                cleaned_defs.append({'text_en': text_clean, 'text_mt': None})
        
        # SKIP if the entire POS section for this word is just inflections/non-lemmas
        if is_pos_non_lemma or not cleaned_defs:
            continue

        short_pos = SHORT_POS_MAP.get(pos, slugify(pos))
        base_id = f"{short_pos}-{slugify(title)}"
        
        id_counts[base_id] = id_counts.get(base_id, 0) + 1
        final_id = base_id
        if id_counts[base_id] > 1:
            final_id = base_id + "-" + str(id_counts[base_id])

        # Handle etymology chain and tags
        chain = []
        if parser.etymology_text:
            chain = build_etymology_chain(parser.etymology_text)
            for item in chain:
                if item.get('definition'):
                    d_clean, d_tags = extract_tags(item['definition'])
                    item['definition'] = d_clean
                    for t in d_tags: all_entry_tags.add(t)

        row = {
            'id': final_id,
            'headword': title,
            'pos': pos,
            'definitions': cleaned_defs,
            'source_language': 'Uncertain',
            'is_loanword': False,
            'source_title': 'Wiktionary',
            'source_page': f'https://en.wiktionary.org/wiki/{quote(title.replace(" ", "_"), safe="")}',
            'source_citation': f'Wiktionary: {title}',
            'source_publisher': 'Wiktionary',
            'tags': sorted(list(all_entry_tags)) if all_entry_tags else None,
            'etymology_notes': None,
            'etymology_chain': chain
        }

        if parser.section_labels.get(pos) == 'Proper noun':
            row['noun_type'] = 'proper'
        rows.append(row)

    return rows


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except (AttributeError, IOError):
        pass

    parser = argparse.ArgumentParser(description='Scrape Maltese entries from Wiktionary.')
    parser.add_argument('--seed-url', action='append', dest='seed_urls', help='Category listing URL to scan. Can be passed multiple times.')
    parser.add_argument('--letter', default=None, help='Target Maltese letter to scrape (e.g. A, B, Ċ, D, etc.).')
    parser.add_argument('--output', default=str(DEFAULT_OUTPUT), help='Output JSONL file path.')
    parser.add_argument('--db-output-prefix', default=None, help='If provided, write DB-shaped JSONL files with this path prefix (e.g. tmp/wik_A)')
    parser.add_argument('--limit', type=int, default=0, help='Limit the number of source pages processed.')
    parser.add_argument('--sleep', type=float, default=0.0, help='Optional delay between page requests.')
    parser.add_argument('--all-letters', action='store_true', help='Scan all letters instead of stopping at target letter.')
    parser.add_argument('--no-overwrite', action='store_true', help='Do not overwrite existing entries in output files to protect manual edits.')
    args = parser.parse_args()

    target_letter = args.letter.strip().lower() if args.letter else None
    target_collation = LETTER_MAP.get(target_letter) if target_letter else None

    # Automatically set output file paths based on target letter
    if target_letter:
        letter_upper = target_letter.upper()
        if args.output == str(DEFAULT_OUTPUT):
            args.output = f"wiktionary-scraper/scraped-results/wiktionary_maltese_{letter_upper}.jsonl"

    seed_urls = args.seed_urls
    if not seed_urls:
        if target_collation:
            seed_urls = [f'https://en.wiktionary.org/w/index.php?title=Category:Maltese_lemmas&from={quote(target_collation)}']
        else:
            seed_urls = DEFAULT_SEED_URLS

    titles: List[str] = []
    seen_titles = set()
    stop_scraping = False

    for seed_url in seed_urls:
        current_url = seed_url
        while current_url:
            print(f"Fetching category page: {current_url}", file=sys.stderr)
            try:
                html_text = request_text(current_url)
            except Exception as e:
                print(f"Error fetching page {current_url}: {e}", file=sys.stderr)
                break

            # Extract titles from this page
            page_titles = []
            start = html_text.find('<div id="mw-pages">')
            if start >= 0:
                mw_pages_content = html_text[start:]
                for group_html in re.findall(r'<div class="mw-category-group">(.*?)</div>', mw_pages_content, flags=re.S):
                    for match in re.finditer(r'<a href="/wiki/[^"]+" title="([^"]+)">([^<]+)</a>', group_html):
                        title = html.unescape(match.group(1)).strip()
                        if title and ':' not in title:
                            page_titles.append(title)

            # Process page titles
            for title in page_titles:
                if title in seen_titles:
                    continue

                if not args.all_letters:
                    if target_collation:
                        current_collation = get_collation_char(title)
                        # Stop if we went past the target collation letter
                        if current_collation and current_collation > target_collation:
                            stop_scraping = True
                            break
                    else:
                        # Default A behavior: stop when we reach B
                        first_letter = first_alpha_letter(title)
                        if first_letter and first_letter > 'a':
                            if first_letter >= 'b':
                                stop_scraping = True
                                break

                seen_titles.add(title)
                titles.append(title)
                if args.limit and len(titles) >= args.limit:
                    stop_scraping = True
                    break

            if stop_scraping:
                break

            # Find next page link if exists
            next_match = re.search(r'<a href="([^"]+)"[^>]*>next page</a>', html_text)
            if next_match:
                next_url = html.unescape(next_match.group(1)).replace('&amp;', '&')
                current_url = 'https://en.wiktionary.org' + next_url
            else:
                current_url = None

        if stop_scraping:
            break

    if args.limit and args.limit > 0:
        titles = titles[:args.limit]

    all_rows: List[dict] = []
    for index, title in enumerate(titles, start=1):
        try:
            html_text = fetch_page_html(title)
            rows = parse_entry_rows(title, html_text)
            all_rows.extend(rows)
            safe_title = title.encode('ascii', 'backslashreplace').decode('ascii')
            print(f'[{index}/{len(titles)}] {safe_title}: {len(rows)} rows')
        except Exception as exc:
            safe_title = title.encode('ascii', 'backslashreplace').decode('ascii')
            print(f'[{index}/{len(titles)}] {safe_title}: ERROR {exc}', file=sys.stderr)
        if args.sleep:
            time.sleep(args.sleep)

    all_rows.sort(key=lambda row: (row['headword'].casefold(), row['pos'], row['id']))

    # If db-output-prefix provided, emit DB-shaped JSONL files: entries, tags, entry_tags
    if args.db_output_prefix:
        prefix = Path(args.db_output_prefix)
        prefix.parent.mkdir(parents=True, exist_ok=True)
        entries_f = prefix.with_name(prefix.name + '-entries.jsonl')
        tags_f = prefix.with_name(prefix.name + '-tags.jsonl')
        etags_f = prefix.with_name(prefix.name + '-entry_tags.jsonl')

        # Load existing files for merging/conflict resolution
        existing_entries = {}
        if entries_f.exists():
            try:
                with entries_f.open('r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            entry_obj = json.loads(line)
                            existing_entries[entry_obj['id']] = entry_obj
            except Exception as e:
                print(f"Warning: Failed to load existing entries for merge: {e}", file=sys.stderr)

        unique_tags = {}
        if tags_f.exists():
            try:
                with tags_f.open('r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            tag_obj = json.loads(line)
                            unique_tags[tag_obj['id']] = tag_obj
            except Exception as e:
                print(f"Warning: Failed to load existing tags for merge: {e}", file=sys.stderr)

        # Determine which entries to overwrite vs preserve
        entries_to_overwrite = set()
        for row in all_rows:
            entry_id = row.get('id')
            if entry_id in existing_entries:
                existing = existing_entries[entry_id]
                is_curated = existing.get('curated') is True or existing.get('manual') is True
                if args.no_overwrite or is_curated:
                    continue
            entries_to_overwrite.add(entry_id)

        merged_etags = []
        if etags_f.exists():
            try:
                with etags_f.open('r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            etag_obj = json.loads(line)
                            # Remove old tag mappings ONLY for entries we are overwriting
                            if etag_obj.get('entry_id') not in entries_to_overwrite:
                                merged_etags.append(etag_obj)
            except Exception as e:
                print(f"Warning: Failed to load existing entry_tags for merge: {e}", file=sys.stderr)

        for row in all_rows:
            entry_id = row.get('id')
            if entry_id not in entries_to_overwrite:
                continue

            chain_for_detection = row.get('etymology_chain') or []
            
            # Consider Maltese and Arabic (and variants) as native; anything else => loan
            def _is_foreign(chain_list: List[dict]) -> bool:
                for node in chain_list:
                    lang = (node.get('language') or '').strip().lower()
                    if not lang:
                        continue
                    if lang == 'maltese':
                        continue
                    if lang.startswith('arab'):
                        continue
                    return True
                return False

            detected_loan = 1 if _is_foreign(chain_for_detection) else 0

            # Map definitions inline as JSON array of EntryDefinition shapes
            defs_list = []
            for d in row.get('definitions') or []:
                defs_list.append({
                    'text_en': d.get('text_en') or d.get('text') or '',
                    'text_mt': d.get('text_mt'),
                    'register': '',
                    'nuance': ''
                })

            entry_obj = {
                'id': entry_id,
                'headword': row.get('headword'),
                'pos': row.get('pos').lower(),
                'gender': row.get('noun_type') if row.get('noun_type') else None,
                'root_consonants': None,
                'stem': None,
                'is_loanword': detected_loan,
                'is_inflectable': 0,
                'source_language': row.get('source_language'),
                'source_id': 'src-crowd',
                'source_citation': row.get('source_citation'),
                'source_title': row.get('source_title'),
                'source_year': None,
                'source_page': row.get('source_page'),
                'source_publisher': row.get('source_publisher'),
                'etymology_chain': chain_for_detection if chain_for_detection else None,
                'etymology_notes': row.get('etymology_notes'),
                'definitions': defs_list,
                'usage_examples': []
            }
            # Overwrite/insert
            existing_entries[entry_id] = entry_obj

            # Process tags
            tags = row.get('tags') or []
            for tag in tags:
                tag_slug = slugify(tag)
                tag_id = f"tag-{tag_slug}"
                if tag_id not in unique_tags:
                    unique_tags[tag_id] = {
                        'id': tag_id,
                        'name': tag,
                        'category': None,
                        'description': None
                    }
                
                merged_etags.append({
                    'entry_id': entry_id,
                    'tag_id': tag_id
                })

        # Write merged entries
        with entries_f.open('w', encoding='utf-8', newline='\n') as efh:
            for entry_obj in sorted(existing_entries.values(), key=lambda e: (e['headword'].casefold(), e['pos'], e['id'])):
                efh.write(json.dumps(entry_obj, ensure_ascii=False) + '\n')

        # Write unique tags file
        with tags_f.open('w', encoding='utf-8', newline='\n') as tfh:
            for tag_obj in sorted(unique_tags.values(), key=lambda t: t['id']):
                tfh.write(json.dumps(tag_obj, ensure_ascii=False) + '\n')

        # Write entry-to-tag relationships
        with etags_f.open('w', encoding='utf-8', newline='\n') as etfh:
            for etag_obj in sorted(merged_etags, key=lambda et: (et['entry_id'], et['tag_id'])):
                etfh.write(json.dumps(etag_obj, ensure_ascii=False) + '\n')

        print(f'Merged & wrote entries to {entries_f}')
        print(f'Merged & wrote unique tags to {tags_f}')
        print(f'Merged & wrote entry-to-tag relationships to {etags_f}')
    else:
        output_path = Path(args.output)
        existing_rows = {}
        if output_path.exists():
            try:
                with output_path.open('r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            row = json.loads(line)
                            existing_rows[row['id']] = row
            except Exception as e:
                print(f"Warning: Failed to load existing output: {e}", file=sys.stderr)
                
        for row in all_rows:
            entry_id = row.get('id')
            if entry_id in existing_rows:
                existing = existing_rows[entry_id]
                is_curated = existing.get('curated') is True or existing.get('manual') is True
                if args.no_overwrite or is_curated:
                    continue
            existing_rows[entry_id] = row

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open('w', encoding='utf-8', newline='\n') as fh:
            for row in sorted(existing_rows.values(), key=lambda r: (r['headword'].casefold(), r['pos'], r['id'])):
                fh.write(json.dumps(row, ensure_ascii=False) + '\n')
        print(f'Merged & wrote rows to {output_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
