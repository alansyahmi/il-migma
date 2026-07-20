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

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
        self._in_style_or_script = False

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

        # Handle h4 headings as potential POS sections
        if level == 4:
            self._flush_etymology()
            normalized = text.casefold()
            pos = POS_ALIASES.get(normalized)
            self.current_pos = pos
            self.current_pos_label = pos
            self._in_definition_list = False
            self._definition_list_depth = 0
            if pos:
                self.section_labels[pos] = text
                if pos not in self.sections:
                    self.sections[pos] = []
            else:
                self.current_pos = None
                self.current_pos_label = None
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
        self.section_labels[pos] = text
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
        if tag in {'style', 'script'}:
            self._in_style_or_script = True
            self._skip_depth += 1
            return

        if tag in {'h2', 'h3', 'h4'}:
            self._flush_li()
            self._flush_heading()
            self._heading_tag = tag
            if tag == 'h2':
                self._heading_level = 2
            elif tag == 'h4':
                self._heading_level = 4
            else:
                self._heading_level = 3
            self._heading_text = []
            return

        if self._heading_tag and tag == 'span':
            return

        if self.in_target and self.current_pos and tag == 'ol' and not self._in_definition_list:
            self._in_definition_list = True
            self._definition_list_depth = 1
            return

        # Detect unheaded <ol> definitions inside etymology sections
        # (e.g. ċavi has a Noun <ol> under Etymology 1 with no <h4> heading)
        if self.in_target and self._collect_etymology and tag == 'ol' and not self._in_definition_list:
            self._collect_etymology = False
            self.current_pos = 'noun'
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
        if tag in {'style', 'script'}:
            self._in_style_or_script = False
            self._skip_depth = max(0, self._skip_depth - 1)
            return

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
        if self._in_style_or_script:
            return
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


def detect_loanword_from_chain(chain: List[dict]) -> int:
    """Returns 1 if the etymology chain indicates a loanword, 0 if native (Arabic/Maltese)."""
    for node in chain:
        lang = (node.get('language') or '').strip().lower()
        if not lang:
            continue
        if lang == 'maltese':
            continue
        if lang.startswith('arab'):
            continue
        return 1
    return 0


def extract_page_categories(html_text: str) -> List[str]:
    """Extract Maltese-specific category display names from page HTML."""
    matches = re.findall(
        r'<a\s+href="/wiki/Category:Maltese[^"]*"[^>]*>([^<]+)</a>',
        html_text
    )
    return matches


def parse_verb_form_and_class(categories: List[str]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Parse verb form (I, II, III...) and verb class (hollow, sound, weak...)
    from Wiktionary category tags like 'Maltese hollow form-I verbs'."""
    verb_form: Optional[str] = None
    verb_class: Optional[str] = None

    # Combined: "Maltese hollow form-I verbs" or "Maltese form-I verbs" (class optional)
    form_pat = re.compile(
        r'^Maltese\s+(?:(sound|hollow|weak|geminated|defective|irregular)\s+)?'
        r'form-([IVX]+)\s+verbs?$',
        re.IGNORECASE
    )
    # Class only: "Maltese hollow verbs"
    class_pat = re.compile(
        r'^Maltese\s+(sound|hollow|weak|geminated|defective|irregular)\s+verbs?$',
        re.IGNORECASE
    )

    # Wiktionary category → (verb_class, verb_weak_class) mapping
    # verb_class is broad: "strong" or "weak"
    # verb_weak_class is the specific subtype for weak verbs
    CLASS_MAP = {
        'sound':     ('strong',  None),
        'hollow':    ('weak',    'hollow'),
        'weak':      ('weak',    'defective'),
        'geminated': ('weak',    'doubled'),
        'defective': ('weak',    'defective'),
        'irregular': ('weak',    'irregular'),
    }

    for cat in categories:
        m = form_pat.match(cat)
        if m:
            raw_class = m.group(1).lower() if m.group(1) else None
            if raw_class and not verb_class:
                mapped = CLASS_MAP.get(raw_class)
                if mapped:
                    verb_class, verb_weak_class = mapped
                else:
                    verb_class = raw_class
            if not verb_form:
                verb_form = m.group(2)
            continue

        m = class_pat.match(cat)
        if m and not verb_class:
            raw_class = m.group(1).lower()
            mapped = CLASS_MAP.get(raw_class)
            if mapped:
                verb_class, verb_weak_class = mapped
            else:
                verb_class = raw_class

    return verb_form, verb_class, verb_weak_class


# Global lookup counter for the "first 3" feature request
ET_LOOKUP_COUNT = 0
MAX_ET_LOOKUPS = 200
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

    # Patterns that ALWAYS indicate non-lemma forms, even with colon content
    # e.g. "inflection of x: second-person singular imperfect" is still an inflection
    strong_non_lemma = [
        r'\binflection of\b',
        r'\bimperative of\b',
        r'\bparticiple of\b',
        r'\bpast participle of\b',
        r'\bpresent participle of\b',
    ]
    for p in strong_non_lemma:
        if re.search(p, text_clean):
            return True

    # Person-specific patterns (always inflectional)
    for p in [r'\bperson singular\b', r'\bperson plural\b', r'\bperson dual\b']:
        if re.search(p, text_clean):
            return True

    # Alternative form/spelling patterns: check if there's real meaning after the colon
    # e.g. "alternative form of x: to insult" → keep as lemma (colon has meaning)
    # e.g. "alternative form of x" (no colon) → non-lemma, skip
    for p in [r'\balternative form of\b', r'\balternative spelling of\b']:
        if re.search(p, text_clean):
            if ':' in text_clean:
                _, definition_part = text.split(':', 1)
                if len(definition_part.strip().split()) >= 1:
                    return False  # Has real content after colon → keep as lemma
            return True  # No colon → non-lemma

    return False


def extract_root_consonants(html_text: str) -> Optional[str]:
    """Extracts Semitic root consonants from the Wiktionary page HTML."""
    import urllib.parse
    import html
    
    # Matches Appendix:Maltese_roots/xxx or Category:Maltese_terms_belonging_to_the_root_xxx
    matches = re.findall(r'(?:Appendix:Maltese_roots/|Category:Maltese_terms_belonging_to_the_root_)([^\"#\s>]+)', html_text)
    
    roots = set()
    for m in matches:
        decoded = urllib.parse.unquote(m).replace('_', ' ')
        decoded = html.unescape(decoded)
        # Strip query parameters
        decoded = decoded.split('&')[0].split('?')[0]
        root = decoded.strip().lower()
        if '-' in root:
            roots.add(root)
            
    if roots:
        return sorted(list(roots), key=len)[0]
    return None


def extract_vowels(word: str) -> Optional[str]:
    if not word:
        return None
    w = word.lower().strip()
    norm_map = {
        'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u',
        'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'
    }
    for k, v in norm_map.items():
        w = w.replace(k, v)
    found = re.findall(r'(ie|[aeiou])', w)
    return "-".join(found) if found else None


def normalize_vowel_set(vowels: Optional[str], root_consonants: Optional[str] = None, gender: Optional[str] = None) -> Optional[str]:
    """Pad/trim a vowel set to match the number of root positions.

    Format rules:
    - Always has (num_radicals - 1) positions (2 for triliteral, 3 for quadriliteral)
    - Missing vowel positions shown as '-'
    - Feminine suffix vowels (-a, -i) are stripped for feminine-gender entries
    - 'ie' counts as a single vowel (diphthong)

    Examples:
      root=ċ-j-k, vowels="ie"        → "ie-"    (hollow verb, no position-2 vowel)
      root=k-t-b, vowels="i-e"       → "i-e"    (standard triliteral)
      root=ħ-r-b-t, vowels="a-a"     → "a-a-"   (quadriliteral, missing 3rd vowel)
      gender=f, vowels="a-i-a"        → "a-i"    (feminine suffix -a stripped)
    """
    if not vowels:
        return None

    parts = vowels.split('-')

    # Strip trailing feminine suffix vowel (-a Semitic, -i Romance)
    # This removes one trailing vowel BEFORE truncating to 2 positions
    if gender == 'feminine' and len(parts) > 2:
        parts = parts[:-1]

    # Always enforce v-v format: exactly 2 vowel positions
    # Pad with '-' if fewer, truncate if more
    while len(parts) < 2:
        parts.append('-')
    if len(parts) > 2:
        parts = parts[:2]

    return '-'.join(parts)


def deduce_verb_vowel_sets(perfect: str, imperfect: str, root_consonants: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    if not perfect:
        return None, None, None

    v_perf = normalize_vowel_set(extract_vowels(perfect), root_consonants)
    if not imperfect:
        return v_perf, None, None

    impf = imperfect.lower().strip()

    # Determine stem by stripping person prefix (j-, n-, t-)
    # and detecting any prefix vowel
    pfx_vowel = ''
    stem = impf

    if impf.startswith('j') and len(impf) > 1:
        if impf[1] in 'aeiou':
            # "jV..." – prefix vowel present (e.g. "jikteb")
            pfx_vowel = impf[1]
            stem = impf[2:]
        else:
            # "jC..." – just person prefix, no vowel (e.g. "jcallam")
            stem = impf[1:]
    elif impf.startswith(('t', 'n')) and len(impf) > 1 and impf[1] in 'aeiou':
        pfx_vowel = impf[1]
        stem = impf[2:]

    stem_vowels = extract_vowels(stem)
    theme_vowel = stem_vowels if stem_vowels else 'a'

    # Heuristic: if stem has >= 2 vowels, the prefix is just
    # a consonant (j/n/t) with no prefix vowel.  If stem has
    # only 1 vowel, assume a prefix vowel merged into it.
    has_prefix_vowel = bool(pfx_vowel) or (
        not pfx_vowel and stem_vowels and len(stem_vowels.split('-')) <= 1
    )

    if has_prefix_vowel:
        pfx = pfx_vowel if pfx_vowel else 'i'
        v_impf = f"{pfx}-{theme_vowel}"
    else:
        v_impf = theme_vowel

    # Imperative vowel set
    if has_prefix_vowel:
        imp_pfx = 'i'
        if root_consonants:
            c1 = root_consonants.split('-')[0].strip().lower()
            if c1 in ['għ', 'h', 'ħ']:
                imp_pfx = 'a'
        v_impv = f"{imp_pfx}-{theme_vowel}"
    else:
        v_impv = theme_vowel

    return v_perf, v_impf, v_impv


def get_pos_section_headword_paragraph(html_text: str, pos_label: str) -> str:
    pos_match = re.search(fr'id="({pos_label}(?:_\d+)?)"', html_text, re.IGNORECASE)
    if not pos_match:
        return ""
    start_pos = pos_match.start()
    search_space = html_text[start_pos : start_pos + 4000]
    for p in re.findall(r'<p>.*?</p>', search_space, re.DOTALL):
        if 'Latn headword' in p:
            return p
    return ""


def parse_headword_paragraph(paragraph: str) -> dict:
    if not paragraph:
        return {}
    
    gender = None
    gender_match = re.search(r'class="gender"[^>]*><abbr[^>]*>([mf])</abbr>', paragraph)
    if gender_match:
        gender = "masculine" if gender_match.group(1) == "m" else "feminine"
        
    inflections = {}
    if gender:
        inflections['gender'] = gender
        
    match = re.search(r'\((.*)\)', paragraph, re.DOTALL)
    if not match:
        return inflections
        
    parts = match.group(1).split(',')
    for part in parts:
        part = part.strip()
        labels = [l.strip().lower() for l in re.findall(r'<i>(.*?)</i>', part)]
        values = []
        for b_match in re.finditer(r'<b class="Latn" lang="mt">(.*?)</b>', part, re.DOTALL):
            b_content = b_match.group(1)
            val = re.sub(r'<[^>]+>', '', b_content).strip()
            if val:
                values.append(val)
        
        if not values:
            for a_match in re.finditer(r'<a [^>]+>([^<]+)</a>', part):
                val = a_match.group(1).strip()
                if val and not val.startswith('or') and not val.startswith('and'):
                    values.append(val)
        
        for label in labels:
            if label == 'collective' and not values:
                inflections['is_collective'] = True
            elif label == 'singulative' and values:
                inflections['singulative_form'] = values[0]
                inflections['is_collective'] = True
            elif label == 'collective' and values:
                inflections['collective_form'] = values[0]
                inflections['is_singulative'] = True
            elif label == 'plural' and values:
                inflections['plural_forms'] = values
            elif label == 'dual' and values:
                inflections['dual_form'] = values[0]
            elif label == 'paucal' and values:
                inflections['paucal_form'] = values[0]
            elif label in ['feminine', 'fem'] and values:
                inflections['feminine_form'] = values[0]
            elif label in ['masculine', 'masc'] and values:
                inflections['masculine_form'] = values[0]
            elif label == 'imperfect' and values:
                inflections['imperfect'] = values[0]
            elif label in ['verbal noun', 'verbal_noun'] and values:
                inflections['verbal_noun'] = values[0]
            elif label in ['active participle', 'active_ptcp'] and values:
                inflections['active_ptcp'] = values[0]
            elif label in ['passive participle', 'past participle', 'passive_ptcp', 'past_ptcp'] and values:
                inflections['passive_ptcp'] = values[0]

    return inflections


def parse_alternative_forms(html_text: str) -> List[str]:
    match = re.search(r'id="Alternative_forms".*?</h3>.*?<ul>(.*?)</ul>', html_text, re.DOTALL)
    if not match:
        return []
    ul_content = match.group(1)
    items = []
    for li in re.findall(r'<li>(.*?)</li>', ul_content, re.DOTALL):
        word_match = re.search(r'lang="mt"[^>]*>(.*?)<\/(?:a|b|span)>', li)
        if word_match:
            word = re.sub(r'<[^>]+>', '', word_match.group(1)).strip()
            word = word.split('&')[0].split('?')[0].strip()
            if word:
                items.append(word)
    return items


def parse_related_terms(html_text: str) -> List[str]:
    items = []
    for sec_id in ["Related_terms", "Derived_terms"]:
        pattern = r'id="' + sec_id + r'".*?(?:</h[34]>|<div class="mw-heading[^"]*">).*?(?:<ul>|<div class="list-switcher-wrapper">.*?<ul>)(.*?)(?:</ul>|</div>\s*</div>)'
        match = re.search(pattern, html_text, re.DOTALL | re.IGNORECASE)
        if match:
            ul_content = match.group(1)
            for li in re.findall(r'<li>(.*?)</li>', ul_content, re.DOTALL):
                word_match = re.search(r'lang="mt"[^>]*>(.*?)<\/(?:a|b|span|strong)>', li)
                if word_match:
                    word = re.sub(r'<[^>]+>', '', word_match.group(1)).strip()
                    word = word.split('&')[0].split('?')[0].strip()
                    if word:
                        items.append(word)
    return list(dict.fromkeys(items))


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
                
                # Keep the raw text with parentheticals — the refine pipeline
                # handles register/dialect/tag extraction from leading brackets.
                cleaned_defs.append({'text_en': cleaned, 'text_mt': None})
        
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

        # Parse specific POS headword paragraph
        paragraph = get_pos_section_headword_paragraph(html_text, pos)
        infl = parse_headword_paragraph(paragraph)
        alt_words = parse_alternative_forms(html_text)
        alt_list = [{'headword': a, 'type': 'orthographic'} for a in alt_words]
        related_terms = parse_related_terms(html_text)

        # Calculate inflections and vowel sets
        plural_forms = infl.get('plural_forms')
        gender_val = infl.get('gender')
        is_collective = 1 if infl.get('is_collective') else 0
        is_singulative = 1 if infl.get('is_singulative') else 0

        collective_form = infl.get('collective_form')
        singulative_form = infl.get('singulative_form')
        feminine_form = infl.get('feminine_form')
        masculine_form = infl.get('masculine_form')

        if is_collective and singulative_form:
            feminine_form = singulative_form
            masculine_form = title
            gender_val = gender_val or 'masculine'
        elif is_singulative and collective_form:
            masculine_form = collective_form
            feminine_form = title
            gender_val = gender_val or 'feminine'
        
        has_inflections = (
            plural_forms or
            infl.get('dual_form') or
            infl.get('paucal_form') or
            collective_form or
            singulative_form or
            feminine_form or
            masculine_form
        )
        is_inflectable = 1 if (has_inflections or pos.lower() == 'verb') else 0

        # Calculate verb vowel sets if POS is a verb
        verb_vowel_perf = None
        verb_vowel_impf = None
        verb_vowel_impv = None
        verb_form = None
        verb_class = None
        verb_weak_class = None
        verb_transitivity = None
        verb_perfective_3sgm = None
        verb_imperfective_3sgm = None
        verb_verbal_noun = None
        verb_active_ptcp = None
        verb_passive_ptcp = None
        if pos.lower() == 'verb':
            imperfect_val = infl.get('imperfect')
            rcs = extract_root_consonants(html_text)
            if rcs:
                verb_vowel_perf, verb_vowel_impf, verb_vowel_impv = deduce_verb_vowel_sets(title, imperfect_val, rcs)
            # else: loan verbs without roots keep null vowel sets
            # Extract verb form/class from Wiktionary category tags
            categories = extract_page_categories(html_text)
            verb_form, verb_class, verb_weak_class = parse_verb_form_and_class(categories)
            # Verb fields from headword paragraph and categories
            verb_perfective_3sgm = title  # headword IS the 3ms perfect form for Maltese
            verb_imperfective_3sgm = imperfect_val
            verb_verbal_noun = infl.get('verbal_noun')
            verb_active_ptcp = infl.get('active_ptcp')
            verb_passive_ptcp = infl.get('passive_ptcp')
            # Detect transitivity from categories
            for cat in categories:
                cat_lower = cat.lower()
                if re.search(r'\btransitive\b', cat_lower):
                    verb_transitivity = 'transitive'
                elif re.search(r'\bintransitive\b', cat_lower):
                    verb_transitivity = 'intransitive'

        rc = extract_root_consonants(html_text)
        row = {
            'id': final_id,
            'headword': title,
            'pos': pos,
            'definitions': cleaned_defs,
            'gender': gender_val,
            'root_consonants': rc,
            'is_loanword': detect_loanword_from_chain(chain),
            'is_inflectable': is_inflectable,
            'source_title': 'Wiktionary',
            'source_page': f'https://en.wiktionary.org/wiki/{quote(title.replace(" ", "_"), safe="")}',
            'source_citation': f'Wiktionary: {title}',
            'source_publisher': 'Wiktionary',
            'tags': sorted(list(all_entry_tags)) if all_entry_tags else None,
            'etymology_notes': None,
            'etymology_chain': chain,
            
            # Inflection fields
            'is_collective': is_collective,
            'is_singulative': is_singulative,
            'collective_form': collective_form,
            'singulative_form': singulative_form,
            'dual_form': infl.get('dual_form'),
            'paucal_form': infl.get('paucal_form'),
            'feminine_form': feminine_form,
            'masculine_form': masculine_form,
            'plural_forms': [{'form': f, 'pattern': None} for f in plural_forms] if plural_forms else None,
            'plural_form': [{'form': f, 'pattern': None} for f in plural_forms] if plural_forms else None,
            
            # Vowel sets
            'vowel_set_sg': normalize_vowel_set(extract_vowels(title), rc, gender_val) if rc else None,
            'vowel_set_pl': extract_vowels(plural_forms[0]) if plural_forms else None,
            'vowel_set_dual': extract_vowels(infl.get('dual_form')),
            'vowel_set_opp': extract_vowels(feminine_form or masculine_form),
            
            # Verb vowel sets
            'verb_vowel_perf': verb_vowel_perf,
            'verb_vowel_impf': verb_vowel_impf,
            'verb_vowel_impv': verb_vowel_impv,
            # Verb form & class (extracted from Wiktionary category tags)
            'verb_form': verb_form,
            'verb_class': verb_class,
            'verb_weak_class': verb_weak_class,
            # Verb fields from headword paragraph and categories
            'verb_transitivity': verb_transitivity,
            'verb_perfective_3sgm': verb_perfective_3sgm,
            'verb_imperfective_3sgm': verb_imperfective_3sgm,
            'verb_verbal_noun': verb_verbal_noun,
            'verb_active_ptcp': verb_active_ptcp,
            'verb_passive_ptcp': verb_passive_ptcp,
            'alternative_forms': alt_list,
            'raw_related_terms': related_terms,
            'related_entries': []
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

    # Auto-create alternative form stubs
    scraped_headwords = {r['headword'].lower() for r in all_rows}
    alternative_stubs = []
    seen_stub_ids = set()
    for row in all_rows:
        alt_list = row.get('alternative_forms') or []
        for alt in alt_list:
            alt_hw = alt.get('headword')
            if alt_hw and alt_hw.lower() not in scraped_headwords:
                pos = row.get('pos')
                short_pos = row.get('id').split('-')[0]
                alt_id = f"{short_pos}-{slugify(alt_hw)}"
                if alt_id not in seen_stub_ids:
                    seen_stub_ids.add(alt_id)
                    stub_row = {
                        'id': alt_id,
                        'headword': alt_hw,
                        'pos': pos,
                        'definitions': [],
                        'is_loanword': row.get('is_loanword', False),
                        'is_inflectable': 0,
                        'source_language': row.get('source_language', 'Uncertain'),
                        'source_title': 'Wiktionary',
                        'source_page': f'https://en.wiktionary.org/wiki/{quote(alt_hw.replace(" ", "_"), safe="")}',
                        'source_citation': f'Wiktionary: {alt_hw} (Alternative spelling of {row["headword"]})',
                        'source_publisher': 'Wiktionary',
                        'tags': ['alternative-form'],
                        'etymology_notes': None,
                        'etymology_chain': row.get('etymology_chain'),
                        'alternative_forms': [{'headword': row['headword'], 'type': 'orthographic'}],
                        'related_entries': [row['id']],
                        
                        # Set default null inflection fields
                        'is_collective': 0,
                        'is_singulative': 0,
                        'collective_form': None,
                        'singulative_form': None,
                        'dual_form': None,
                        'paucal_form': None,
                        'feminine_form': None,
                        'masculine_form': None,
                        'plural_forms': None,
                        'plural_form': None,
                        'vowel_set_sg': extract_vowels(alt_hw),
                        'vowel_set_pl': None,
                        'vowel_set_dual': None,
                        'vowel_set_opp': None
                    }
                    alternative_stubs.append(stub_row)
    all_rows.extend(alternative_stubs)

    # Resolve related entries using scraped headwords mapping
    headword_to_ids = {}
    for row in all_rows:
        hw = row.get('headword')
        if hw:
            headword_to_ids.setdefault(hw, []).append(row['id'])

    for row in all_rows:
        raw_related = row.pop('raw_related_terms', [])
        related_ids = list(row.get('related_entries') or [])
        for term in raw_related:
            if term == row.get('headword'):
                continue
            # Look up in our scraped entries
            if term in headword_to_ids:
                for target_id in headword_to_ids[term]:
                    if target_id not in related_ids:
                        related_ids.append(target_id)
            else:
                # Guess ID if not found in this scrape set (default to noun, or verb if double-consonant prefix)
                guessed_id = None
                if term.startswith(('ċċ', 'pp', 'tt', 'ss', 'ff', 'gg', 'ġġ', 'kk', 'qq', 'zz', 'żż', 'mm', 'nn')):
                    guessed_id = f"v-{slugify(term)}"
                else:
                    guessed_id = f"n-{slugify(term)}"
                if guessed_id and guessed_id not in related_ids:
                    related_ids.append(guessed_id)
        if related_ids:
            row['related_entries'] = related_ids

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

            detected_loan = detect_loanword_from_chain(chain_for_detection)

            # Map definitions inline as JSON array of EntryDefinition shapes
            defs_list = []
            for d in row.get('definitions') or []:
                defs_list.append({
                    'text_en': d.get('text_en') or d.get('text') or '',
                    'text_mt': d.get('text_mt'),
                    'register': '',
                    'nuance': ''
                })

            root_consonants = row.get('root_consonants')
            headword = row.get('headword')
            has_spaces = ' ' in headword or '\t' in headword
            
            stem = None
            if not root_consonants and not has_spaces:
                stem = f"-{headword}-"

            entry_obj = {
                'id': entry_id,
                'headword': headword,
                'pos': row.get('pos').lower(),
                'gender': row.get('gender') or (row.get('noun_type') if row.get('noun_type') else None),
                'root_consonants': root_consonants,
                'stem': stem,
                'is_loanword': detected_loan,
                'is_inflectable': row.get('is_inflectable', 0),
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
                'usage_examples': [],
                
                # Copy inflection/vowel fields
                'is_collective': row.get('is_collective', 0),
                'is_singulative': row.get('is_singulative', 0),
                'collective_form': row.get('collective_form'),
                'singulative_form': row.get('singulative_form'),
                'dual_form': row.get('dual_form'),
                'paucal_form': row.get('paucal_form'),
                'feminine_form': row.get('feminine_form'),
                'masculine_form': row.get('masculine_form'),
                'plural_forms': row.get('plural_forms'),
                'plural_form': row.get('plural_form'),
                'vowel_set_sg': row.get('vowel_set_sg'),
                'vowel_set_pl': row.get('vowel_set_pl'),
                'vowel_set_dual': row.get('vowel_set_dual'),
                'vowel_set_opp': row.get('vowel_set_opp'),
                'alternative_forms': row.get('alternative_forms')
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
