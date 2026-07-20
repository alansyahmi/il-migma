#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import quote

# Maltese base letters collation map
LETTER_MAP = {
    'a': 'A', 'b': 'B', 'ċ': 'C', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F',
    'ġ': 'G', 'g': 'G', 'għ': 'G', 'h': 'H', 'ħ': 'H', 'i': 'I', 'ie': 'I',
    'j': 'J', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O', 'p': 'P',
    'q': 'Q', 'r': 'R', 's': 'S', 't': 'T', 'u': 'U', 'v': 'V', 'w': 'W',
    'x': 'X', 'ż': 'Z', 'z': 'Z'
}

REGISTER_MAP = {
    "archaic": ("arkajku", "archaic"),
    "slang": ("sleng", "slang"),
    "colloquial": ("kollokwali", "colloquial"),
    "technical": ("tekniku", "technical"),
    "obsolete": ("obsolet", "obsolete"),
    "vulgar": ("vulgari", "vulgar"),
    "dialectal": ("dialettali", "dialectal"),
}

GLOBAL_TAG_MAP = {
    "childish": "childish",
    "figurative": "figurative",
    "pejorative": "pejorative",
    "euphemistic": "euphemistic",
}

APPROVED_TAG_DOMAINS = {
    'agriculture', 'anatomy', 'animals', 'architecture', 'art', 'astronomy', 'sea',
    'botany', 'geography', 'food', 'commerce', 'family', 'physics', 'war', 'law',
    'mathematics', 'medicine', 'music', 'politics', 'religion', 'crafts', 'sports',
    'technology', 'weather', 'transport', 'time'
}

# Recognised Maltese dialect regions / localities — when a definition starts with
# one of these in parentheses it sets register="dialettali" + dialect on the gloss
# rather than being stored as a standalone tag.
# All Maltese localities (towns, villages, and hamlets) in lowercase.
MALTESE_DIALECTS = {
    # ――― Malta ―――
    # Southern Harbour
    'birgu', 'vittoriosa', 'bormla', 'cospicua', 'fgura', 'floriana',
    'għaxaq', 'kalkara', 'luqa', 'marsa', 'marsaskala', 'wied il-għajn',
    'marsaxlokk', 'mqabba', 'paola', 'raħal ġdid', 'qormi', 'Ħal qormi',
    'qrendi', 'safi', 'santa luċija', 'tarxien', 'valletta', 'il-belt',
    'xgħajra', 'żabbar', 'Ħaż-żabbar', 'żejtu', 'żurrieq',
    # South Eastern
    'birżebbuġa', 'gudja', 'kirkop', 'ħal kirkop',
    # Northern Harbour
    'birkirkara', 'gżira', 'ħamrun', 'msida', 'pembroke',
    'pietà', 'tal-pietà', 'san ġiljan', 'st julian', 'san ġwann',
    'santa venera', 'sliema', 'swieqi', 'ta\' xbiex',
    # Western
    'attard', 'balzan', 'dingli', 'iklin', 'lija',
    'mdina', 'l-imdina', 'mtarfa', 'rabat', 'ħar-rabat',
    'siġġiewi', 'żebbuġ', 'Ħaż-żebbuġ',
    # Northern
    'buġibba', 'għargħur', 'mellieħa', 'mġarr', 'imġarr',
    'mosta', 'naxxar', 'qawra', 'san pawl il-baħar', 'st paul\'s bay',
    'burmarrad',
    # ――― Gozo (Għawdex) ―――
    'fontana', 'għajnsielem', 'għarb', 'għasri', 'kerċem',
    'marsalforn', 'munxar', 'nadur', 'qala', 'san lawrenz',
    'sannat', 'ta\' sannat', 'victoria', 'rabat għawdex',
    'xagħra', 'ix-xagħra', 'xewkija', 'żebbuġ għawdex',
    # ――― Historic / archaic ―――
    'vassalli', 'vassalli (arkajku)',
}

CANONICAL_DIALECTS = {
    'birgu': 'Birgu (Vittoriosa)',
    'vittoriosa': 'Birgu (Vittoriosa)',
    'bormla': 'Bormla (Cospicua)',
    'cospicua': 'Bormla (Cospicua)',
    'fgura': 'Fgura',
    'floriana': 'Floriana',
    'għaxaq': 'Għaxaq',
    'marsa': 'Il-Marsa',
    'il-marsa': 'Il-Marsa',
    'paola': 'Il-Paola (Raħal Ġdid)',
    'raħal ġdid': 'Il-Paola (Raħal Ġdid)',
    'isla': 'Isla (Senglea)',
    'senglea': 'Isla (Senglea)',
    'kalkara': 'Kalkara',
    'luqa': 'Luqa',
    'marsaskala': 'Marsaskala (Wied il-Għajn)',
    'wied il-għajn': 'Marsaskala (Wied il-Għajn)',
    'marsaxlokk': 'Marsaxlokk',
    'mqabba': 'Mqabba',
    'qormi': 'Qormi',
    'qrendi': 'Qrendi',
    'safi': 'Safi',
    'santa luċija': 'Santa Luċija',
    'tarxien': 'Tarxien',
    'valletta': 'Valletta',
    'il-belt': 'Valletta',
    'xgħajra': 'Xgħajra',
    'żabbar': 'Żabbar',
    'żejtu': 'Żejtun',
    'żejtun': 'Żejtun',
    'żurrieq': 'Żurrieq',
    'birżebbuġa': 'Birżebbuġa',
    'gudja': 'Gudja',
    'kirkop': 'Kirkop',
    'birkirkara': 'Birkirkara',
    'gżira': 'Gżira',
    'ħamrun': 'Ħamrun',
    'msida': 'Msida',
    'pembroke': 'Pembroke',
    'pietà': 'Pietà',
    'san ġiljan': 'San Ġiljan (St Julian\'s)',
    'st julian': 'San Ġiljan (St Julian\'s)',
    'san ġwann': 'San Ġwann',
    'santa venera': 'Santa Venera',
    'sliema': 'Sliema',
    'swieqi': 'Swieqi',
    'ta\' xbiex': 'Ta\' Xbiex',
    'attard': 'Attard',
    'balzan': 'Balzan',
    'dingli': 'Dingli',
    'iklin': 'Iklin',
    'lija': 'Lija',
    'mdina': 'Mdina',
    'mtarfa': 'Mtarfa',
    'rabat': 'Rabat',
    'siġġiewi': 'Siġġiewi',
    'żebbuġ': 'Żebbuġ',
    'buġibba': 'Buġibba',
    'għargħur': 'Għargħur',
    'mellieħa': 'Mellieħa',
    'mġarr': 'Mġarr',
    'mosta': 'Mosta',
    'naxxar': 'Naxxar',
    'san pawl il-baħar': 'San Pawl il-Baħar (St Paul\'s Bay)',
    'st paul\'s bay': 'San Pawl il-Baħar (St Paul\'s Bay)',
    'fontana': 'Fontana',
    'għajnsielem': 'Għajnsielem',
    'għarb': 'Għarb',
    'għasri': 'Għasri',
    'kerċem': 'Kerċem',
    'marsalforn': 'Marsalforn',
    'munxar': 'Munxar',
    'nadur': 'Nadur',
    'qala': 'Qala',
    'san lawrenz': 'San Lawrenz',
    'sannat': 'Sannat',
    'victoria': 'Victoria (Rabat)',
    'rabat għawdex': 'Victoria (Rabat)',
    'xagħra': 'Xagħra',
    'xewkija': 'Xewkija',
    'żebbuġ għawdex': 'Żebbuġ (Għawdex)',
    'vassalli': 'Vassalli (Arkajku)',
    'vassalli (arkajku)': 'Vassalli (Arkajku)'
}

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()

def convert_to_uk_english(text: str) -> str:
    if not text:
        return ""
    replacements = {
        r'\bcolor(s|ed|ing|ful)?\b': r'colour\1',
        r'\bcenter(s|ed|ing)?\b': r'centre\1',
        r'\bgray(s|ish)?\b': r'grey\1',
        r'\bparalyze(d|s|ing)?\b': r'paralyse\1',
        r'\borganize(d|s|ing|ation|ations)?\b': r'organise\1',
        r'\brecognize(d|s|ing)?\b': r'recognise\1',
    }
    for pattern, repl in replacements.items():
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text

def generate_maltese_ipa(headword: str) -> str:
    w = headword.lower().strip()
    w = w.replace('għi', 'ɛj')
    w = w.replace('għu', 'ɔw')

    # Word-initial għ is silent
    if w.startswith('għ'):
        w = w[2:]

    if w.endswith('għ') or w.endswith('h') or w.endswith('ħ'):
        w = re.sub(r'(għ|h|ħ)$', 'Ħ', w)

    w = re.sub(r'għ(?!i|u)', 'ː', w)
    # When għ/ː appears between two identical vowels, merge into a single long vowel
    # e.g. ċagħak → ċaːak → ċaːk, għagħa → aːa → aː
    w = re.sub(r'([aeiou])ː\1', r'\1ː', w)
    w = re.sub(r'h(?!$)', 'ː', w)
    w = w.replace('ie', 'Iː')
    
    mapping = {
        'ċ': 't͡ʃ', 'ġ': 'd͡ʒ', 'ħ': 'ħ', 'q': 'ʔ', 'x': 'ʃ', 'ż': 'z', 'z': 't͡s',
        'c': 'k', 'g': 'ɡ', 'j': 'j', 'w': 'w',
    }
    
    res = []
    i = 0
    while i < len(w):
        char = w[i]
        if char == 'I':
            res.append('ɪ')
            i += 1
        elif char == 'ː':
            res.append('ː')
            i += 1
        elif char == 'Ħ':
            res.append('ħ')
            i += 1
        elif char in mapping:
            res.append(mapping[char])
            i += 1
        elif char in ['a', 'e', 'i', 'o', 'u']:
            v_map = {'a': 'a', 'e': 'e', 'i': 'i', 'o': 'o', 'u': 'u'} # will map to IPA equivalents below
            v_ipa = {'a': 'ɐ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɔ', 'u': 'ʊ'}
            res.append(v_ipa[char])
            i += 1
        else:
            res.append(char)
            i += 1
            
    if res:
        last = res[-1]
        devoice = {
            'b': 'p', 'd': 't', 'd͡ʒ': 't͡ʃ', 'ɡ': 'k', 'v': 'f', 'z': 's'
        }
        if last in devoice:
            res[-1] = devoice[last]
            
    vowels = {'ɐ', 'ɛ', 'ɪ', 'ɔ', 'ʊ', 'ɐː', 'ɛː', 'ɪː', 'ɔː', 'ʊː'}
    
    grouped = []
    i = 0
    while i < len(res):
        if i + 1 < len(res) and res[i+1] == 'ː':
            grouped.append(res[i] + 'ː')
            i += 2
        else:
            grouped.append(res[i])
            i += 1
            
    v_indices = [idx for idx, char in enumerate(grouped) if any(v in char for v in vowels)]
    
    if len(v_indices) <= 1:
        # Single-syllable word: stress the only syllable
        if grouped:
            grouped[0] = "ˈ" + grouped[0].lstrip("ˈ")
        ipa_str = "".join(grouped)
        return f"/{ipa_str}/"
        
    syllables = []
    last_split = 0
    for idx, v_idx in enumerate(v_indices):
        if idx == len(v_indices) - 1:
            syllables.append(grouped[last_split:])
        else:
            next_v_idx = v_indices[idx + 1]
            consonants_between = next_v_idx - v_idx - 1
            if consonants_between <= 1:
                split_point = v_idx + 1
            else:
                split_point = next_v_idx - 1
            syllables.append(grouped[last_split:split_point])
            last_split = split_point
            
    final_syllable = "".join(syllables[-1])
    is_ultimate_stress = 'ː' in final_syllable or final_syllable.endswith('ħ')
    
    stressed_idx = len(syllables) - 1 if is_ultimate_stress else len(syllables) - 2
    if stressed_idx < 0:
        stressed_idx = 0
        
    formatted_syllables = []
    for idx, syl in enumerate(syllables):
        syl_str = "".join(syl)
        if idx == stressed_idx:
            syl_str = "ˈ" + syl_str
        formatted_syllables.append(syl_str)
        
    return "/" + ".".join(formatted_syllables).replace('.ˈ', 'ˈ') + "/"

def normalize_vowel_set(vowels: Optional[str], gender: Optional[str] = None) -> Optional[str]:
    """Normalize a vowel set string to exactly 2 positions (v-v format).

    - Truncates if more than 2 vowels
    - Pads with '-' if fewer than 2 vowels
    - 'ie' counts as a single vowel  (already split by extract_vowels)
    - Feminine suffix vowels (-a, -i) are stripped before truncating
    """
    if not vowels:
        return None
    parts = vowels.split('-')
    # Strip trailing feminine suffix vowel if applicable
    if gender == 'feminine' and len(parts) > 2:
        parts = parts[:-1]
    # Enforce exactly 2 positions
    while len(parts) < 2:
        parts.append('-')
    if len(parts) > 2:
        parts = parts[:2]
    return '-'.join(parts)


# Weak radicals that can be silently dropped in hollow/weak verb forms
_WEAK_RADICALS = {'w', 'j', 'għ', 'gh', "'"}


def compute_cv_pattern(headword: str, root_consonants: Optional[str]) -> Optional[str]:
    """Compute 1V cv_pattern by matching root consonants to headword positions.

    Examples:
        kiteb (k-t-b)       -> 1i2e3
        ktieb (k-t-b)       -> 12ie3
        kisser (k-s-r)      -> 1i22e3
        ciek (c-j-k)        -> 1ie3       (hollow: C2 dropped)
        nkiteb (k-t-b)      -> n1i2e3     (Form VII prefix)
        stkiteb (k-t-b)     -> st1i2e3    (Form X prefix)
        caghak (c-għ-q)     -> 1a2a3
        kotba (k-t-b)       -> 1o23a      (broken plural)
    """
    if not headword or not root_consonants:
        return None

    radicals = [r for r in root_consonants.split('-') if r.strip()]
    if not radicals:
        return None

    w = headword.lower().strip()

    # Tokenize: split into vowels, consonants, and digraphs (ie, gh)
    tokens = []  # list of (token_string, is_vowel)
    i = 0
    while i < len(w):
        if i + 1 < len(w):
            pair = w[i:i+2]
            if pair == 'ie':
                tokens.append(('ie', True))
                i += 2
                continue
            elif pair in ('gh', 'għ'):
                tokens.append(('gh', False))
                i += 2
                continue
        ch = w[i]
        if ch in 'aeiouāēīōūàèìòùáéíóúâêîôû':
            tokens.append((ch, True))
        else:
            tokens.append((ch, False))
        i += 1
    # First pass: find radical matches
    matched_indices = {}  # token_idx -> radical_number (1-based)
    rad_idx = 0
    last_matched = -1
    for idx, (token, is_vowel) in enumerate(tokens):
        if is_vowel:
            continue
        token_norm = token.lower().replace('gh', 'għ')
        matched = False
        for try_idx in range(rad_idx, len(radicals)):
            expected = radicals[try_idx].strip().lower().replace('gh', 'għ')
            if token_norm == expected:
                skipped = try_idx - rad_idx
                if skipped > 0 and not all(
                    radicals[r].strip().lower().replace('gh', 'għ') in _WEAK_RADICALS
                    for r in range(rad_idx, try_idx)
                ):
                    continue
                matched_indices[idx] = try_idx + 1
                rad_idx = try_idx + 1
                last_matched = try_idx
                matched = True
                break
        if matched:
            continue
        if last_matched >= 0:
            expected = radicals[last_matched].strip().lower().replace('gh', 'għ')
            if token_norm == expected:
                matched_indices[idx] = last_matched + 1

    first_rad_token_idx = min(matched_indices.keys()) if matched_indices else -1
    last_rad_token_idx = max(matched_indices.keys()) if matched_indices else -1

    # Second pass: construct final pattern
    output = []
    for idx, (token, is_vowel) in enumerate(tokens):
        if is_vowel:
            # Only map to v / v̂ if the vowel is root-internal
            if first_rad_token_idx != -1 and first_rad_token_idx < idx < last_rad_token_idx:
                if token.lower() in ('ie', 'ā', 'ē', 'ī', 'ō', 'ū', 'â', 'ê', 'î', 'ô', 'û'):
                    output.append('v̂')
                else:
                    output.append('v')
            else:
                output.append(token)
            continue

        if idx in matched_indices:
            output.append(str(matched_indices[idx]))
        else:
            output.append(token)

    return ''.join(output)


def compute_morph_pattern(cv_pattern: Optional[str]) -> Optional[str]:
    """Derive morph_pattern from cv_pattern by replacing numbers with C notation.

    Examples:
        1i2e3   -> C1iC2eC3
        12ie3   -> C1C2ieC3
        1i22e3  -> C1iC2C2eC3
        n1i2e3  -> nC1iC2eC3
    """
    if not cv_pattern:
        return None
    result = cv_pattern
    for i in range(9, 0, -1):
        result = result.replace(str(i), f'C{i}')
    return result


def process_plural_forms(plural_forms, root_consonants):
    if not plural_forms:
        return plural_forms
    if not isinstance(plural_forms, list):
        return plural_forms

    refined = []
    sound_suffixes = ["in", "iet", "at", "i"]
    for pf in plural_forms:
        if isinstance(pf, str):
            pf = {"form": pf, "pattern": None}
        elif isinstance(pf, dict):
            pf = dict(pf)
        else:
            refined.append(pf)
            continue

        form = pf.get("form") or ""
        matched_suffix = None
        for suffix in sound_suffixes:
            if form.endswith(suffix):
                matched_suffix = f"-{suffix}"
                break

        if matched_suffix:
            pf["pattern"] = matched_suffix
        else:
            pf["pattern"] = compute_cv_pattern(form, root_consonants)
        
        refined.append(pf)
    return refined


def refine_entry(raw_entry, headword_defs_lookup=None):
    headword = raw_entry.get("headword")
    pos = raw_entry.get("pos", "").lower()
    
    # 1. Verification Bypass
    if raw_entry.get("curated") is True:
        return raw_entry, False

    # 2. Base relational keys mapping
    entry_id = raw_entry.get("id")
    if not entry_id:
        short_pos = pos[:1] if pos else 'n'
        entry_id = f"{short_pos}-{headword.lower().replace(' ', '-')}"

    # Etymology & source language
    chain = raw_entry.get("etymology_chain") or []
    is_loan = 0
    source_lang = "Uncertain"
    
    if chain:
        first_node = chain[0]
        lang = (first_node.get("language") or "").strip()
        if lang:
            source_lang = lang
            if lang.lower() in ["arabic", "classical arabic", "maghrebi arabic"]:
                is_loan = 0
            else:
                is_loan = 1

    # Overrides
    if headword in ["Ċad", "Chad"]:
        is_loan = 1
        source_lang = "French"
    elif headword.istitle() and not re.search(r'[0-9]', headword): # possible surname
        # Check definitions for surname
        defs = raw_entry.get("definitions") or []
        if defs and "surname" in (defs[0].get("text_en") or "").lower():
            is_loan = 1
            source_lang = "Italian"

    # Phonetics IPA
    ipa = generate_maltese_ipa(headword)
    phonetics = [{"dialect": "Standard", "ipa": ipa, "notes": None}]

    # Transient Scratchpad
    _scratchpad = {
        "ipa_step_1_normalization": f"Normalize: {headword.lower()}",
        "ipa_step_2_clusters": "Cluster expansion for għ/h/ħ",
        "ipa_step_3_devoicing": "Final obstruent devoicing",
        "ipa_step_4_syllabification": "Maximal Onset Principle syllabification",
        "ipa_step_5_stress": "Penultimate or final long vowel stress"
    }

    # Roots & Stems logic
    root_consonants = raw_entry.get("root_consonants")
    stem = None
    has_spaces = ' ' in headword or '\t' in headword

    if root_consonants:
        _scratchpad["morph_1v_consonants"] = root_consonants.split("-")
        _scratchpad["morph_1v_vocalic_map"] = "Mapping of vowels to numerical anchors"
    else:
        if not has_spaces:
            stem = f"-{headword}-"

    # Verb type derivation (triliteral/quadriliteral/loan)
    verb_type = None
    if root_consonants:
        radicals = [r for r in root_consonants.split('-') if r.strip()]
        verb_type = 'quadriliteral' if len(radicals) >= 4 else 'triliteral'
    elif is_loan == 1 and pos == 'verb':
        verb_type = 'loan'

    # Definition splits & parentheticals register extract
    tags_accumulated = []
    raw_defs = raw_entry.get("definitions") or []
    processed_defs = []
    alternative_forms = []

    for d in raw_defs:
        text_en = clean_text(d.get("text_en") or d.get("text") or "")
        text_mt = clean_text(d.get("text_mt") or "")
        
        # Hard Split on Semicolons
        en_parts = [p.strip() for p in text_en.split(";") if p.strip()]
        for part in en_parts:
            # Apply UK orthography
            part_uk = convert_to_uk_english(part)
            
            # Extract parenthetical registers/nuances
            register_val = ""
            nuance_val = ""
            dialect_val = ""
            match = re.match(r'^\(([^)]+)\)\s*(.*)$', part_uk)
            if match:
                label = match.group(1).strip().lower()
                content = match.group(2).strip()
                if label in REGISTER_MAP:
                    reg, tag = REGISTER_MAP[label]
                    register_val = reg
                    tags_accumulated.append(tag)
                    part_uk = content
                elif label in GLOBAL_TAG_MAP:
                    tags_accumulated.append(GLOBAL_TAG_MAP[label])
                    part_uk = content
                else:
                    # Check domain tags (agriculture, medicine, etc.)
                    if label in APPROVED_TAG_DOMAINS:
                        tags_accumulated.append(label)
                        part_uk = content
                    elif label in MALTESE_DIALECTS:
                        # Known locality — set register="dialettali" + dialect
                        register_val = "dialettali"
                        dialect_val = CANONICAL_DIALECTS.get(label, label)
                        part_uk = content
                    else:
                        # Unknown parenthetical — keep as tag rather than
                        # guessing it is a dialect, so info is not lost.
                        tags_accumulated.append(label)
                        part_uk = content

            # Check if it's an alternative spelling/form
            alt_match = re.search(r'\balternative\s+(?:form|spelling)\s+of\s+([a-zċġħżĊĠĦŻ\s\-\']+)', part_uk, re.IGNORECASE)
            if alt_match:
                canonical = alt_match.group(1).strip()
                alternative_forms.append({"headword": canonical, "type": "orthographic"})
                # Preserve the actual meaning after the colon, e.g.
                # "alternative form of ziek: to insult" → keep "to insult" as definition
                colon_idx = part_uk.find(':')
                if colon_idx >= 0:
                    meaning = part_uk[colon_idx + 1:].strip()
                    if meaning:
                        mt_val = text_mt if text_mt else None
                        if mt_val:
                            mt_val = mt_val[0].upper() + mt_val[1:]
                        def_entry = {
                            "text_en": meaning,
                            "text_mt": mt_val,
                            "register": register_val,
                            "nuance": nuance_val,
                        }
                        if dialect_val:
                            def_entry["dialect"] = dialect_val
                        processed_defs.append(def_entry)
                elif headword_defs_lookup:
                    # No colon — copy definitions from the canonical entry
                    canon_lower = canonical.lower()
                    if canon_lower in headword_defs_lookup:
                        for canon_def in headword_defs_lookup[canon_lower]:
                            canon_text = clean_text(canon_def.get("text_en") or canon_def.get("text") or "")
                            if canon_text:
                                mt_val = text_mt if text_mt else None
                                if mt_val:
                                    mt_val = mt_val[0].upper() + mt_val[1:]
                                def_entry = {
                                    "text_en": convert_to_uk_english(canon_text),
                                    "text_mt": mt_val,
                                    "register": register_val,
                                    "nuance": nuance_val,
                                }
                                if dialect_val:
                                    def_entry["dialect"] = dialect_val
                                processed_defs.append(def_entry)
                continue

            # Ensure capitalization on text_mt if present
            mt_val = text_mt if text_mt else None
            if mt_val:
                mt_val = mt_val[0].upper() + mt_val[1:]

            def_entry = {
                "text_en": part_uk,
                "text_mt": mt_val,
                "register": register_val,
                "nuance": "noun" if pos == "participle" else nuance_val,
            }
            if dialect_val:
                def_entry["dialect"] = dialect_val
            processed_defs.append(def_entry)

    # Prepare tags array from raw tags + extracted
    final_tag_slugs = []
    dialects_from_tags = []
    raw_tags = raw_entry.get("tags") or []
    for t in raw_tags + tags_accumulated:
        sub_tags = [st.strip() for st in t.split(",") if st.strip()]
        for sub_t in sub_tags:
            clean_tag = sub_t.lower()
            if clean_tag in MALTESE_DIALECTS:
                dialects_from_tags.append(CANONICAL_DIALECTS.get(clean_tag, clean_tag))
                continue
            if clean_tag in [pos, "misluf", "għerq semitiku", "maltese", "malti", "proper noun", "noun", "verb", "adjective", "adverb"]:
                continue
            if clean_tag == "loanword" and is_loan == 1:
                continue
            if clean_tag == "semitic" and root_consonants:
                continue
            final_tag_slugs.append(clean_tag)

    dialect_from_tags = ", ".join(dict.fromkeys(dialects_from_tags)) if dialects_from_tags else None

    # If a dialect was found in raw_tags but no definition got it from
    # parenthetical extraction, apply it to the first definition.
    if dialect_from_tags and processed_defs:
        first = processed_defs[0]
        if not first.get("dialect") and not first.get("register"):
            first["register"] = "dialettali"
            first["dialect"] = dialect_from_tags

    unique_slugs = sorted(list(set(final_tag_slugs)))

    # Merge alternative forms list
    all_alts = alternative_forms + (raw_entry.get("alternative_forms") or [])
    seen_alts = set()
    unique_alts = []
    for a in all_alts:
        hw = a.get("headword")
        if hw and hw not in seen_alts:
            seen_alts.add(hw)
            unique_alts.append(a)

    is_inflectable = raw_entry.get("is_inflectable", 0) if pos in ["noun", "adjective"] else (1 if pos == "verb" else 0)

    # Compute morphological patterns from root + headword
    cv_pattern_val = raw_entry.get("cv_pattern") or (root_consonants and compute_cv_pattern(headword, root_consonants))
    if pos == "noun" and cv_pattern_val:
        vowels_pat = r'(?:ie|[aeiouāēīōūàèìòùáéíóúâêîôû])'
        if re.match(r'^1' + vowels_pat + r'22' + vowels_pat + r'3$', cv_pattern_val) or cv_pattern_val == "1v22v3":
            cv_pattern_val = "1v22v̂3"
        elif re.match(r'^1' + vowels_pat + r'22' + vowels_pat + r'3a$', cv_pattern_val) or cv_pattern_val == "1v22v3a":
            cv_pattern_val = "1v22v̂3a"
    morph_pattern_val = raw_entry.get("morph_pattern") or (cv_pattern_val and compute_morph_pattern(cv_pattern_val))

    # Assemble relational entry layout
    entry_dict = {
        "id": entry_id,
        "headword": headword,
        "pos": pos,
        "gender": raw_entry.get("gender"),
        "root_consonants": root_consonants,
        "stem": stem,
        "cv_pattern": cv_pattern_val,
        "morph_pattern": morph_pattern_val,
        "is_loanword": is_loan,
        "is_inflectable": is_inflectable,
        "is_imala_blocked": raw_entry.get("is_imala_blocked", 0),
        "source_language": source_lang,
        "source_id": "src-crowd",
        "source_citation": raw_entry.get("source_citation") or f"Wiktionary: {headword}",
        "source_title": "Wiktionary",
        "source_year": None,
        "source_page": raw_entry.get("source_page") or f"https://en.wiktionary.org/wiki/{quote(headword.replace(' ', '_'), safe='')}",
        "source_publisher": "Wiktionary",
        "etymology_chain": chain,
        "etymology_notes": raw_entry.get("etymology_notes"),
        "definitions": processed_defs,
        "usage_examples": raw_entry.get("usage_examples") or [],
        "related_entries": raw_entry.get("related_entries") or [],
        "alternative_forms": unique_alts,
        "phonetics": phonetics,
        "source_display": None,
        "source_tooltip": None,
        "sound_suffix": raw_entry.get("sound_suffix"),
        "zokk_morphology": raw_entry.get("zokk_morphology"),
        "zokk_class": raw_entry.get("zokk_class"),
        "zokk_is_hybrid": raw_entry.get("zokk_is_hybrid"),
        "zokk_agentive_suffix": raw_entry.get("zokk_agentive_suffix"),
        
        # Inflection and Vowel sets
        "is_collective": raw_entry.get("is_collective", 0),
        "is_singulative": raw_entry.get("is_singulative", 0),
        "collective_form": raw_entry.get("collective_form"),
        "singulative_form": raw_entry.get("singulative_form"),
        "dual_form": raw_entry.get("dual_form"),
        "paucal_form": raw_entry.get("paucal_form"),
        "feminine_form": raw_entry.get("feminine_form"),
        "masculine_form": raw_entry.get("masculine_form"),
        "plural_forms": process_plural_forms(raw_entry.get("plural_forms"), root_consonants),
        "plural_form": process_plural_forms(raw_entry.get("plural_form"), root_consonants),
        "vowel_set_sg": normalize_vowel_set(raw_entry.get("vowel_set_sg"), raw_entry.get("gender")) if root_consonants else None,
        "vowel_set_pl": normalize_vowel_set(raw_entry.get("vowel_set_pl")) if root_consonants else None,
        "vowel_set_dual": normalize_vowel_set(raw_entry.get("vowel_set_dual")) if root_consonants else None,
        "vowel_set_opp": normalize_vowel_set(raw_entry.get("vowel_set_opp")) if root_consonants else None,
        
        # Inject all other possible POS specific values as Null
        "verb_form": raw_entry.get("verb_form"),
        "verb_type": raw_entry.get("verb_type") or verb_type,
        "verb_class": raw_entry.get("verb_class"),
        "verb_weak_class": raw_entry.get("verb_weak_class"),
        "verb_transitivity": raw_entry.get("verb_transitivity"),
        "verb_perfective_3sgm": raw_entry.get("verb_perfective_3sgm"),
        "verb_imperfective_3sgm": raw_entry.get("verb_imperfective_3sgm"),
        "verb_verbal_noun": raw_entry.get("verb_verbal_noun"),
        "verb_active_ptcp": raw_entry.get("verb_active_ptcp"),
        "verb_passive_ptcp": raw_entry.get("verb_passive_ptcp"),
        "verb_vowel_perf": normalize_vowel_set(raw_entry.get("verb_vowel_perf"), raw_entry.get("gender")) if root_consonants else None,
        "verb_vowel_impf": normalize_vowel_set(raw_entry.get("verb_vowel_impf"), raw_entry.get("gender")) if root_consonants else None,
        "verb_vowel_impv": normalize_vowel_set(raw_entry.get("verb_vowel_impv"), raw_entry.get("gender")) if root_consonants else None,
        "elative_form": raw_entry.get("elative_form"),
        "participle_type": raw_entry.get("participle_type"),
        "numeral_type": raw_entry.get("numeral_type"),
        "form_attributive_short": raw_entry.get("form_attributive_short"),
        "form_attributive_long": raw_entry.get("form_attributive_long"),
        "numeral_ordinal": raw_entry.get("numeral_ordinal"),
        "numeral_adverbial": raw_entry.get("numeral_adverbial"),
        "numeral_fractional": raw_entry.get("numeral_fractional"),
        "numeral_multiplier": raw_entry.get("numeral_multiplier"),
        "numeral_distributive": raw_entry.get("numeral_distributive"),
    }

    # Build unique tags relational lists
    tags_list = []
    entry_tags_list = []
    for t_name in unique_slugs:
        tag_id = f"tag-{t_name.replace(' ', '-').lower()}"
        # Determine category based on domains list
        cat = "Domain" if t_name in APPROVED_TAG_DOMAINS else "Usage"
        tags_list.append({
            "id": tag_id,
            "name": t_name,
            "category": cat,
            "description": None
        })
        entry_tags_list.append({
            "entry_id": entry_id,
            "tag_id": tag_id
        })

    unified_line = {
        "_scratchpad": _scratchpad,
        "entry": entry_dict,
        "tags": tags_list,
        "entry_tags": entry_tags_list
    }

    return unified_line, False

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except (AttributeError, IOError):
        pass

    src_file = Path("wiktionary-scraper/scraped-results/wiktionary_maltese_Ċ.jsonl")
    if not src_file.exists():
        print(f"Error: {src_file} does not exist.")
        sys.exit(1)
        
    out_dir = Path("wiktionary-scraper/refined-results")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    refined_file = out_dir / "wiktionary_maltese_Ċ.jsonl"
    
    print(f"Refining entries from {src_file} into unified relational format...")

    # Build headword→definitions lookup for cross-referencing alternative forms
    headword_defs_lookup = {}
    with src_file.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            hw = entry.get("headword", "").strip().lower()
            defs = entry.get("definitions") or []
            if hw and defs:
                headword_defs_lookup[hw] = defs

    refined_lines = []
    with src_file.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            refined, _ = refine_entry(entry, headword_defs_lookup)
            refined_lines.append(refined)

    # Post-process: fill definitions for alternative-form stubs
    # When an entry has no definitions but references another entry via
    # alternative_forms, copy the canonical entry's definitions over.
    filled_count = 0
    hw_refined_defs = {}
    for rl in refined_lines:
        e = rl["entry"]
        hw = e.get("headword", "").strip().lower()
        defs = e.get("definitions") or []
        if hw and defs:
            hw_refined_defs[hw] = defs

    for rl in refined_lines:
        e = rl["entry"]
        if e.get("definitions"):
            continue
        alts = e.get("alternative_forms") or []
        for alt in alts:
            canon = alt.get("headword", "").strip().lower()
            if canon in hw_refined_defs:
                e["definitions"] = hw_refined_defs[canon]
                filled_count += 1
                break

    if filled_count:
        print(f"Filled definitions for {filled_count} alternative-form stubs via cross-reference.")

    with refined_file.open("w", encoding="utf-8", newline="\n") as rf:
        for rl in refined_lines:
            rf.write(json.dumps(rl, ensure_ascii=False) + "\n")
            
    print("\nRefinement Complete!")
    print(f"Total entries: {len(refined_lines)}")
    print(f"Written unified relational entries to: {refined_file}")

if __name__ == "__main__":
    main()
