#!/usr/bin/env python3
import json
import re
import sys
import argparse
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
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\(\s+', '(', text)
    text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'\[\s+', '[', text)
    text = re.sub(r'\s+\]', ']', text)
    return text.strip()

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

CONSONANT_PATTERN = r'[^\saeiouâêîôûāēīōūAEIOUàèìòù]'

def generate_maltese_ipa(headword: str, root_consonants: Optional[str] = None, cv_pattern: Optional[str] = None, morph_pattern: Optional[str] = None) -> str:
    """Automated 5-Stage G2P Engine for Maltese Phonology (Semitic + Non-Semitic Loanwords)."""
    raw_hw = headword.strip()
    words = raw_hw.split()
    if len(words) > 1:
        # Multi-word phrase: process each word independently
        return "/" + " ".join(generate_maltese_ipa(w, root_consonants, cv_pattern, morph_pattern).strip("/") for w in words) + "/"

    w = raw_hw.lower()
    w = w.replace("'", "").replace("’", "")
    has_grave = any(c in w for c in ['à', 'è', 'ì', 'ò', 'ù'])

    # Stage 1: Orthographic Pre-Processing & Segment Normalization
    w = w.replace('zz', 'tz')
    w = re.sub(r'iegħe', 'IːjE', w)
    w = re.sub(r'iegħa', 'IːjA', w)
    w = w.replace('għi', 'ɛj')
    w = w.replace('għu', 'ɔw')

    if w.startswith('għ'):
        w = w[2:]

    if w.endswith('għ') or w.endswith('h') or w.endswith('ħ'):
        w = re.sub(r'(għ|h|ħ)$', 'Ħ', w)

    w = re.sub(r'għ(?!i|u)', 'ː', w)
    w = re.sub(r'([aeiou])ː\1', r'\1ː', w)
    w = re.sub(r'h(?!$)', 'ː', w)

    # Circumflex & Macrons (Etymologically Long)
    w = w.replace('â', 'Aː').replace('ā', 'Aː')
    w = w.replace('ê', 'Eː').replace('ē', 'Eː')
    w = w.replace('î', 'Iː').replace('ī', 'Iː')
    w = w.replace('ô', 'Oː').replace('ō', 'Oː')
    w = w.replace('û', 'Uː').replace('ū', 'Uː')

    # Grave Accents (Stressed Final Open Vowels - phonetically long)
    w = w.replace('à', 'Aː').replace('è', 'Eː').replace('ì', 'Iː').replace('ò', 'Oː').replace('ù', 'Uː')

    w = w.replace('ie', 'Iː')

    # Morphological Semitic Pattern & Suffix Detection
    # Apply Semitic 12i3 / 12u3 patterns ONLY IF Semitic root/pattern is present OR word has <= 2 syllables
    num_ortho_syllables = len(re.findall(r'[aeiouâêîôûāēīōūàèìòù]+', raw_hw.lower()))
    is_semitic_or_short = (root_consonants is not None) or (cv_pattern is not None) or (morph_pattern is not None) or (num_ortho_syllables <= 2)

    is_pattern_12i3 = is_semitic_or_short and (
        (cv_pattern and any(p in cv_pattern for p in ['12i3', '1a2i3', 'a2v3', '12i3a', '12i3in'])) or
        (morph_pattern and any(p in morph_pattern for p in ['C1C2iC3', 'C1aC2iC3', 'aC2vC3'])) or
        (re.match(rf'^(?:[aeiou])?{CONSONANT_PATTERN}{{1,2}}i{CONSONANT_PATTERN}$', w))
    )
    is_pattern_12u3 = is_semitic_or_short and (
        (cv_pattern and any(p in cv_pattern for p in ['12u3', '1a2u3'])) or
        (morph_pattern and any(p in morph_pattern for p in ['C1C2uC3', 'C1aC2uC3'])) or
        (re.match(rf'^{CONSONANT_PATTERN}{{1,2}}u{CONSONANT_PATTERN}$', w))
    )

    is_suffix_uz = re.search(r'uż$', raw_hw.lower()) and len(raw_hw) > 3
    is_suffix_iz = re.search(r'iż$', raw_hw.lower()) and len(raw_hw) > 3
    is_suffix_an = re.search(rf'{CONSONANT_PATTERN}an$', raw_hw.lower()) and len(raw_hw) > 3
    is_suffix_tur = re.search(r'(?:tur|ur)$', raw_hw.lower()) and len(raw_hw) > 3
    is_suffix_in = re.search(rf'{CONSONANT_PATTERN}in$', raw_hw.lower()) and len(raw_hw) > 3
    is_suffix_iet = raw_hw.lower().endswith('iet')
    is_suffix_ar = raw_hw.lower().endswith('ar') and cv_pattern is None and root_consonants is None and len(raw_hw) > 4

    if is_pattern_12i3:
        w = re.sub(rf'i({CONSONANT_PATTERN})$', r'Iː\1', w)
    elif is_pattern_12u3:
        w = re.sub(rf'u({CONSONANT_PATTERN})$', r'Uː\1', w)
    elif is_suffix_uz:
        w = re.sub(r'uż$', 'Uːż', w)
    elif is_suffix_iz:
        w = re.sub(r'iż$', 'Iːż', w)
    elif is_suffix_an:
        w = re.sub(r'an$', 'Aːn', w)
    elif is_suffix_tur:
        w = re.sub(r'ur$', 'Uːr', w)
    elif is_suffix_in:
        w = re.sub(r'in$', 'Iːn', w)
    elif is_suffix_iet:
        w = re.sub(r'iet$', 'Iːt', w)
    elif is_suffix_ar:
        w = re.sub(r'ar$', 'Aːr', w)

    # Phoneme Segment Mapping
    mapping = {
        'ċ': 't͡ʃ', 'ġ': 'd͡ʒ', 'ħ': 'ħ', 'q': 'ʔ', 'x': 'ʃ', 'ż': 'z', 'z': 't͡s',
        'c': 'k', 'g': 'ɡ', 'j': 'j', 'w': 'w',
    }

    res = []
    i = 0
    while i < len(w):
        char = w[i]
        if char == 'A':
            res.append('ɐ')
            i += 1
        elif char == 'E':
            res.append('ɛ')
            i += 1
        elif char == 'I':
            res.append('ɪ')
            i += 1
        elif char == 'O':
            res.append('ɔ')
            i += 1
        elif char == 'U':
            res.append('ʊ')
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
            v_ipa = {'a': 'ɐ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɔ', 'u': 'ʊ'}
            res.append(v_ipa[char])
            i += 1
        else:
            res.append(char)
            i += 1

    # Devoicing of word-final obstruents
    if res:
        last = res[-1]
        devoice = {'b': 'p', 'd': 't', 'd͡ʒ': 't͡ʃ', 'ɡ': 'k', 'v': 'f', 'z': 's'}
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
        if grouped:
            grouped[0] = "ˈ" + grouped[0].lstrip("ˈ")
        ipa_str = "".join(grouped)
        return f"/{ipa_str}/"

    # Stage 3: Syllabification Protocol (Maximal Onset Principle)
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
                between_chars = grouped[v_idx + 1 : next_v_idx]
                if len(between_chars) == 3 and between_chars[0] in ['s', 'ʃ'] and between_chars[1] in ['t', 'p', 'k', 'b', 'd', 'ɡ'] and between_chars[2] in ['r', 'l']:
                    split_point = v_idx + 2  # split after s/x (e.g. nis.tra)
                elif between_chars[-1] in ['j', 'w'] and len(between_chars) >= 2:
                    split_point = next_v_idx - 2  # glide j/w attaches to onset of following syllable
                else:
                    split_point = next_v_idx - 1
            syllables.append(grouped[last_split:split_point])
            last_split = split_point

    # Stage 2: Stress Assignment Rules
    final_syllable_str = "".join(syllables[-1])
    is_superheavy_ment = raw_hw.lower().endswith('ment')
    is_suffix_evoli = raw_hw.lower().endswith('evoli')
    
    # Proparoxytone Italian/Sicilian loan suffixes (-iku, -ika, -iċi, -itu, -ita, -idu, -ida, -imu, -ima, -ilu, -ila, -omu, -oma)
    is_proparoxytone = bool(re.search(r'(?:ik[uajċ]|it[ua]|id[ua]|im[ua]|il[ua]|om[ua])$', raw_hw.lower())) and len(syllables) >= 3

    is_ultimate_stress = (
        'ː' in final_syllable_str or 
        final_syllable_str.endswith('ħ') or 
        has_grave or 
        is_superheavy_ment
    )

    if (is_suffix_evoli or is_proparoxytone) and len(syllables) >= 3:
        stressed_idx = len(syllables) - 3
    elif is_ultimate_stress:
        stressed_idx = len(syllables) - 1
    else:
        stressed_idx = len(syllables) - 2

    if stressed_idx < 0:
        stressed_idx = 0

    # Stage 4: Elongation & Complementary Quantity Rules
    stressed_syl = syllables[stressed_idx]
    is_word_final_stressed = (stressed_idx == len(syllables) - 1)
    
    # Form I Semitic triliteral verbs (e.g. kotor, qatol, kines, kiber) preserve short root vowels
    is_form1_semitic_verb = False
    if cv_pattern and (cv_pattern in ['1v2v3', '1o2o3', '1i2e3', '1a2a3', '1e2e3', '1i2i3', '1u2u3'] or re.match(r'^1[aeiouv]2[aeiouv]3$', cv_pattern)):
        is_form1_semitic_verb = True
    elif morph_pattern and (morph_pattern in ['C1vC2vC3', 'C1oC2oC3', 'C1iC2eC3'] or re.match(r'^C1[aeiouv]C2[aeiouv]C3$', morph_pattern)):
        is_form1_semitic_verb = True
    elif root_consonants and len(root_consonants.split('-')) == 3 and re.match(r'^[b-df-hj-np-tv-zżċġħq]{1}[aeiou]{1}[b-df-hj-np-tv-zżċġħq]{1}[aeiou]{1}[b-df-hj-np-tv-zżċġħq]{1}$', raw_hw.lower()):
        is_form1_semitic_verb = True

    # An open syllable ends in a vowel segment (not closed by a consonant or geminate)
    is_open_syllable = any(v in stressed_syl[-1] for v in vowels) and 'ː' not in stressed_syl[-1]
    
    if is_open_syllable and not is_word_final_stressed and not is_form1_semitic_verb:
        v_char = stressed_syl[-1]
        stressed_syl[-1] = v_char + 'ː'

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
        
    cleaned_parts = []
    for p in parts:
        p_clean = p.strip()
        if not p_clean:
            p_clean = '-'
        elif p_clean in ('ā', 'â', 'á', 'à'):
            p_clean = 'a'
        elif p_clean in ('ē', 'ê', 'é', 'è'):
            p_clean = 'e'
        elif p_clean in ('ī', 'î', 'í', 'ì'):
            p_clean = 'i'
        elif p_clean in ('ō', 'ô', 'ó', 'ò'):
            p_clean = 'o'
        elif p_clean in ('ū', 'û', 'ú', 'ù'):
            p_clean = 'u'
        cleaned_parts.append(p_clean)

    while len(cleaned_parts) < 2:
        cleaned_parts.append('-')
    if len(cleaned_parts) > 2:
        cleaned_parts = cleaned_parts[:2]
    return '-'.join(cleaned_parts)


def tokenize_maltese_word(w: str):
    tokens = []
    i = 0
    w = w.lower().strip()
    while i < len(w):
        if i + 1 < len(w):
            pair = w[i:i+2]
            if pair == 'ie':
                tokens.append(('ie', True))
                i += 2
                continue
            elif pair in ('gh', 'għ'):
                tokens.append(('għ', False))
                i += 2
                continue
        ch = w[i]
        if ch in 'aeiouāēīōūàèìòùáéíóúâêîôû':
            tokens.append((ch, True))
        else:
            tokens.append((ch, False))
        i += 1
    return tokens


def derive_vowels_from_cv(cv_pattern: Optional[str]) -> Optional[str]:
    """Extract 2-slot root vowel set directly from a 1V CV pattern (e.g. 1a2e3 -> a-e, 12ie3 -> --ie, 1a23a -> a--)."""
    if not cv_pattern:
        return None
    import re
    v1_m = re.search(r'1([aeiou|ie|â]+)2', cv_pattern)
    v1 = v1_m.group(1) if v1_m else ''
    if v1 == 'v': v1 = 'a'
    
    v2_m = re.search(r'2([aeiou|ie|â]+)3', cv_pattern)
    v2 = v2_m.group(1) if v2_m else ''
    if v2 == 'v': v2 = 'a'

    if not v1 and not v2:
        return None
    return normalize_vowel_set(f"{v1}-{v2}")


def derive_vowel_set_from_root(word: Optional[str], root_consonants: Optional[str], cv_pattern: Optional[str] = None) -> Optional[str]:
    """Derive root-aligned vowel set (slot1-slot2) using root consonant positions or CV pattern.

    - slot1: Vowel between C1 and C2 (e.g. 'a--' for 1a23)
    - slot2: Vowel between C2 and C3 (e.g. '--ie' for 12ie3)
    """
    if cv_pattern:
        cv_vset = derive_vowels_from_cv(cv_pattern)
        if cv_vset:
            return cv_vset

    if not word or not root_consonants:
        return None

    # Strip sound plural and dual suffixes before matching root vowels
    suffixes = ['tejn', 'ejn', 'ijiet', 'iet', 'at', 'in', 'i', 's']
    for suf in suffixes:
        if word.endswith(suf) and len(word) > len(suf):
            word = word[:-len(suf)]
            break

    radicals = [r.strip().lower() for r in root_consonants.split('-') if r.strip()]
    if not radicals or len(radicals) < 2:
        return None

    tokens = tokenize_maltese_word(word)

    matched_indices = {}
    search_start = 0

    for rad_idx, rad in enumerate(radicals):
        for i in range(search_start, len(tokens)):
            token_text, is_vowel = tokens[i]
            if not is_vowel and token_text.lower() == rad:
                matched_indices[rad_idx] = i
                search_start = i + 1
                break

    if 0 not in matched_indices:
        return None

    if len(radicals) == 3:
        c1_idx = matched_indices[0]
        c2_idx = matched_indices.get(1)
        c3_idx = matched_indices.get(2)

        v1 = ""
        if c2_idx is not None and c2_idx > c1_idx + 1:
            v_tokens = [t[0] for t in tokens[c1_idx+1:c2_idx] if t[1]]
            if v_tokens:
                v1 = v_tokens[0]

        v2 = ""
        if c2_idx is not None and c3_idx is not None and c3_idx > c2_idx + 1:
            v_tokens = [t[0] for t in tokens[c2_idx+1:c3_idx] if t[1]]
            if v_tokens:
                v2 = v_tokens[0]
        elif c2_idx is None and c3_idx is not None and c3_idx > c1_idx + 1:
            v_tokens = [t[0] for t in tokens[c1_idx+1:c3_idx] if t[1]]
            if v_tokens:
                v2 = v_tokens[0]

        return normalize_vowel_set(f"{v1}-{v2}")

    elif len(radicals) == 4:
        c1_idx = matched_indices[0]
        c2_idx = matched_indices.get(1)
        c3_idx = matched_indices.get(2)
        c4_idx = matched_indices.get(3)

        v1 = ""
        if c2_idx is not None and c2_idx > c1_idx + 1:
            v_tokens = [t[0] for t in tokens[c1_idx+1:c2_idx] if t[1]]
            if v_tokens:
                v1 = v_tokens[0]

        v2 = ""
        if c3_idx is not None and c4_idx is not None and c4_idx > c3_idx + 1:
            v_tokens = [t[0] for t in tokens[c3_idx+1:c4_idx] if t[1]]
            if v_tokens:
                v2 = v_tokens[0]

        return normalize_vowel_set(f"{v1}-{v2}")

    return None


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
    c1_is_hamza = radicals[0] in ("'", "hamza", "alif")

    for idx, (token, is_vowel) in enumerate(tokens):
        if is_vowel:
            if idx == 0 and c1_is_hamza and rad_idx == 0:
                matched_indices[0] = 1
                rad_idx = 1
                last_matched = 0
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
            if idx == 0 and c1_is_hamza and 0 in matched_indices:
                # If C1 is hamza and token 0 is mapped to 1:
                # For geminated verbs/nouns like ażżem (1v22v3), emit 1v
                if len(tokens) > 2 and tokens[1][0] == tokens[2][0] and not tokens[1][1]:
                    output.append('1v')
                else:
                    output.append('1')
                continue

            # Only map to v / â if the vowel is root-internal
            if first_rad_token_idx != -1 and first_rad_token_idx < idx < last_rad_token_idx:
                tok_low = token.lower()
                if tok_low in ('ie', 'ā', 'ē', 'ī', 'ō', 'ū', 'â', 'ê', 'î', 'ô', 'û'):
                    output.append('â')
                elif tok_low in ('u', 'o', 'e', 'a', 'i'):
                    output.append('v')
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


UNAMBIGUOUS_SOUND_SUFFIXES = ["ijiet", "jin", "iet", "at", "in"]

BROKEN_PLURAL_PATTERNS = [
    r'^12[âv̂]?3$',          # fgħiel, fgħal, fjal, fwiel, fwal
    r'^12[âv̂]?3a$',        # fgħala, 12v3a
    r'^1[veo]?2[veo]3$', # fagħel, figħel, fogħol, fojol
    r'^12u3$',          # fgħul, fjul
    r'^12u3a$',         # fgħula
    r'^1o2u3$',         # fogħul
    r'^12v?jjv?3$',     # fgħajjel, fwajjel
    r'^12[âv̂]?3i$',        # fgħali, fgħieli, fjieli
    r'^1[oev]?23a$',    # fogħla, 1v23a, 1o23a
    r'^[vo]?123a$',     # ifgħla, ofgħla, oqbra (o123a / v123a)
    r'^1o22[âv̂]3$',        # fogħgħiel
    r'^12ija$',         # fgħija
    r'^1w[âv̂]2v3$',        # fwiegħel
    r'^1v?3ân$',        # filan, filien, felien
    r'^12v2v3$',        # fwawal, fgħalel
    r'^1u2e3$',         # fuwel
    r'^1wâ2i$',         # fwiegħi
    r'^m[i1][âv̂]?2v3$',    # mfagħel, mfagħal
    r'^mi13a$',         # mifja
    r'^12[âv̂]?3v4$',       # fgħalal, fgħalel, fgħielel
    r'^12[âv̂]?2v3$',       # fgħagħal, fgħagħel
    r'^12o3o4$',        # fgħolol
]


def normalize_broken_cv_pattern(cv_pat: str) -> str:
    if not cv_pat:
        return cv_pat
    cv_pat = re.sub(r'^12v3v4$', r'12â3v4', cv_pat)
    cv_pat = re.sub(r'^12v2v3$', r'12â2v3', cv_pat)
    cv_pat = re.sub(r'^12v3$', r'12â3', cv_pat)
    cv_pat = re.sub(r'^12v3a$', r'12â3a', cv_pat)
    cv_pat = re.sub(r'^12v3i$', r'12â3i', cv_pat)
    cv_pat = re.sub(r'^1[vea]2e3$', r'1v2e3', cv_pat)
    cv_pat = re.sub(r'^12[vea]?jj[vea]?3$', r'12vjjv3', cv_pat)
    cv_pat = re.sub(r'^12â3[ev]4$', r'12â3e4', cv_pat)
    return cv_pat


def is_broken_plural_pattern(cv_pat: str) -> bool:
    if not cv_pat:
        return False
    for pat in BROKEN_PLURAL_PATTERNS:
        if re.match(pat, cv_pat):
            return True
    return False


def infer_root_consonants(headword: Optional[str], plural_forms: Optional[list] = None) -> Optional[str]:
    if not headword:
        return None

    def get_raw_cons(text):
        w = text.lower().strip()
        consonants = []
        i = 0
        while i < len(w):
            if i + 1 < len(w):
                pair = w[i:i+2]
                if pair in ('gh', 'għ'):
                    consonants.append('għ')
                    i += 2
                    continue
                elif pair == 'ie':
                    i += 2
                    continue
            ch = w[i]
            if ch not in 'aeiouāēīōūàèìòùáéíóúâêîôû':
                if ch.isalpha():
                    consonants.append(ch)
            i += 1
        return consonants

    raw_cons = get_raw_cons(headword)
    if 3 <= len(raw_cons) <= 4:
        return '-'.join(raw_cons)

    if len(raw_cons) > 4:
        collapsed = []
        for c in raw_cons:
            if not collapsed or collapsed[-1] != c:
                collapsed.append(c)
        if 3 <= len(collapsed) <= 4:
            return '-'.join(collapsed)

    if len(raw_cons) == 2 and plural_forms:
        for pf in plural_forms:
            p_form = pf.get("form") if isinstance(pf, dict) else (pf if isinstance(pf, str) else None)
            if not p_form:
                continue
            p_cons = get_raw_cons(p_form)
            p_text = p_form.lower()
            if 'jj' in p_text:
                filtered_p_cons = [c for c in p_cons if c != 'j']
                if len(filtered_p_cons) == 3 and filtered_p_cons[0] == raw_cons[0] and filtered_p_cons[2] == raw_cons[1]:
                    return '-'.join(filtered_p_cons)
            if len(p_cons) >= 3 and p_cons[0] == raw_cons[0]:
                for idx in range(1, len(p_cons) - 1):
                    if p_cons[idx] in ('w', 'j') and p_cons[idx+1] == raw_cons[1]:
                        return f"{raw_cons[0]}-{p_cons[idx]}-{raw_cons[1]}"

    return None


def process_plural_forms(plural_forms, root_consonants, headword=None):
    if not plural_forms:
        return plural_forms
    if not isinstance(plural_forms, list):
        return plural_forms

    effective_root = root_consonants or (headword and infer_root_consonants(headword, plural_forms))

    refined = []
    for pf in plural_forms:
        if isinstance(pf, str):
            pf = {"form": pf, "pattern": None}
        elif isinstance(pf, dict):
            pf = dict(pf)
        else:
            refined.append(pf)
            continue

        form = pf.get("form") or ""
        
        # 1. Compute CV pattern first using effective root
        cv_pat = compute_cv_pattern(form, effective_root) if effective_root else None
        if cv_pat:
            cv_pat = normalize_broken_cv_pattern(cv_pat)
        
        # 2. Check if CV pattern matches a known broken plural pattern
        if cv_pat and is_broken_plural_pattern(cv_pat):
            pf["pattern"] = cv_pat
        else:
            # 3. Unambiguous sound suffixes
            matched_suffix = None
            for suffix in UNAMBIGUOUS_SOUND_SUFFIXES:
                if form.endswith(suffix):
                    matched_suffix = f"-{suffix}"
                    break

            if matched_suffix:
                pf["pattern"] = matched_suffix
            else:
                # 4. Check secondary sound suffixes (-ien, -an, -i, -a, -s)
                secondary_suffixes = ["ien", "an", "i", "a", "s"]
                sec_matched = None
                for suffix in secondary_suffixes:
                    if form.endswith(suffix):
                        sec_matched = f"-{suffix}"
                        break
                
                pf["pattern"] = sec_matched if sec_matched else cv_pat
        
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

    zokk_class = raw_entry.get("zokk_class")
    if root_consonants:
        _scratchpad["morph_1v_consonants"] = root_consonants.split("-")
        _scratchpad["morph_1v_vocalic_map"] = "Mapping of vowels to numerical anchors"
    else:
        if not has_spaces:
            stem = headword
        if pos == 'verb':
            # Determine from headword ending
            last_char = headword.lower()[-1]
            if last_char == 'a':
                zokk_class = 'ar'
            elif last_char in ('i', 'e'):
                zokk_class = 'ir'

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

            # Check if it's an alternative spelling/form (Section 2.6)
            alt_match = re.search(r'\balternative\s+(?:form|spelling)\s+of\s+([a-zċġħżĊĠĦŻ\s\-\']+)', part_uk, re.IGNORECASE)
            if alt_match:
                canonical = alt_match.group(1).split(':')[0].split('(')[0].strip()
                alternative_forms.append({"headword": canonical, "type": "orthographic"})
                # Section 2.6: Drop the definition object block out of definitions structure completely
                continue

            # Ensure clean capitalization, handle missing text_mt without generic fallbacks
            mt_val = text_mt if text_mt and "tifsira tradizzjonali" not in text_mt else None
            if mt_val:
                mt_val = mt_val[0].upper() + mt_val[1:]
                if not mt_val.endswith(('.', '!', '?', '"')):
                    mt_val += '.'
            elif part_uk:
                # Contextual non-generic fallback generation for missing Maltese definitions
                en_low = part_uk.lower().strip()
                if en_low.startswith('verbal noun of '):
                    base_v = en_low.replace('verbal noun of ', '').split(':')[0].strip()
                    mt_val = f"L-att u l-proċess verbali ta' {base_v}."
                elif en_low.startswith('plural of '):
                    base_w = en_low.replace('plural of ', '').strip()
                    mt_val = f"Forma plurali ta' {base_w}."
                elif en_low.startswith('female equivalent of '):
                    base_w = en_low.replace('female equivalent of ', '').strip()
                    mt_val = f"Forma femminili ta' {base_w}."
                elif en_low.startswith('alternative form of ') or en_low.startswith('alternative spelling of '):
                    canon = en_low.replace('alternative form of ', '').replace('alternative spelling of ', '').split(':')[0].strip()
                    mt_val = f"Forma ortografika alternattiva ta' {canon}."
                else:
                    clean_p = re.sub(r'^\([^)]+\)\s*', '', part_uk).strip()
                    mt_val = f"Tifsira u deskrizzjoni ta' '{headword}': {clean_p}."

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
        if re.match(r'^1' + vowels_pat + r'22' + vowels_pat + r'3$', cv_pattern_val) or cv_pattern_val in ("1v22v3", "1v22v̂3"):
            cv_pattern_val = "1v22â3"
        elif re.match(r'^1' + vowels_pat + r'22' + vowels_pat + r'3a$', cv_pattern_val) or cv_pattern_val in ("1v22v3a", "1v22v̂3a"):
            cv_pattern_val = "1v22â3a"
    morph_pattern_val = raw_entry.get("morph_pattern") or (cv_pattern_val and compute_morph_pattern(cv_pattern_val))

    raw_p_forms = raw_entry.get("plural_forms") or raw_entry.get("plural_form")
    pl_form_str = None
    if raw_p_forms and isinstance(raw_p_forms, list) and len(raw_p_forms) > 0:
        first_pf = raw_p_forms[0]
        pl_form_str = first_pf.get("form") if isinstance(first_pf, dict) else (first_pf if isinstance(first_pf, str) else None)

    dual_form_str = raw_entry.get("dual_form")
    opp_form_str = raw_entry.get("feminine_form") or raw_entry.get("masculine_form")

    # Phonetics IPA with pattern context
    ipa = generate_maltese_ipa(headword, root_consonants, cv_pattern_val, morph_pattern_val)
    phonetics = [{"dialect": "Standard", "ipa": ipa, "notes": None}]

    vowel_set_sg_val = (derive_vowel_set_from_root(headword, root_consonants) or normalize_vowel_set(raw_entry.get("vowel_set_sg"), raw_entry.get("gender"))) if root_consonants else None
    vowel_set_pl_val = (derive_vowel_set_from_root(pl_form_str, root_consonants) or normalize_vowel_set(raw_entry.get("vowel_set_pl"))) if root_consonants else None
    vowel_set_dual_val = (derive_vowel_set_from_root(dual_form_str, root_consonants) or normalize_vowel_set(raw_entry.get("vowel_set_dual"))) if root_consonants else None
    vowel_set_opp_val = (derive_vowel_set_from_root(opp_form_str, root_consonants) or normalize_vowel_set(raw_entry.get("vowel_set_opp"))) if root_consonants else None

    verb_perf_str = raw_entry.get("verb_perfective_3sgm") or (headword if pos == "verb" else None)
    verb_impf_str = raw_entry.get("verb_imperfective_3sgm")
    verb_impv_str = raw_entry.get("verb_vowel_impv")

    verb_vowel_perf_val = (derive_vowel_set_from_root(verb_perf_str, root_consonants) or normalize_vowel_set(raw_entry.get("verb_vowel_perf"), raw_entry.get("gender"))) if root_consonants else None
    verb_vowel_impf_val = (derive_vowel_set_from_root(verb_impf_str, root_consonants) or normalize_vowel_set(raw_entry.get("verb_vowel_impf"), raw_entry.get("gender"))) if root_consonants else None
    verb_vowel_impv_val = (derive_vowel_set_from_root(verb_impv_str, root_consonants) or normalize_vowel_set(raw_entry.get("verb_vowel_impv"), raw_entry.get("gender"))) if root_consonants else None

    all_vsets = [v for v in [vowel_set_sg_val, vowel_set_pl_val, vowel_set_dual_val, vowel_set_opp_val, verb_vowel_perf_val, verb_vowel_impf_val, verb_vowel_impv_val] if v is not None]

    is_imala_blocked_val = raw_entry.get("is_imala_blocked", 0)
    if all_vsets and all(v == 'a-a' for v in all_vsets):
        is_imala_blocked_val = 1

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
        "is_imala_blocked": is_imala_blocked_val,
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
        "usage_examples": [
            ex for ex in (raw_entry.get("usage_examples") or [])
            if "Użu tradizzjonali" not in ex.get("mt", "") and "fil-kitba Maltija" not in ex.get("mt", "") and "b'mod korrett u bla dewmien" not in ex.get("mt", "") and "fil-bini u fl-użu" not in ex.get("mt", "")
        ],
        "related_entries": raw_entry.get("related_entries") or [],
        "alternative_forms": unique_alts,
        "phonetics": phonetics,
        "source_display": None,
        "source_tooltip": None,
        "sound_suffix": raw_entry.get("sound_suffix"),
        "zokk_morphology": raw_entry.get("zokk_morphology"),
        "zokk_class": zokk_class,
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
        "plural_forms": process_plural_forms(raw_entry.get("plural_forms"), root_consonants, headword),
        "plural_form": process_plural_forms(raw_entry.get("plural_form"), root_consonants, headword),
        "vowel_set_sg": vowel_set_sg_val,
        "vowel_set_pl": vowel_set_pl_val,
        "vowel_set_dual": vowel_set_dual_val,
        "vowel_set_opp": vowel_set_opp_val,
        
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
        "verb_vowel_perf": verb_vowel_perf_val,
        "verb_vowel_impf": verb_vowel_impf_val,
        "verb_vowel_impv": verb_vowel_impv_val,
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

    parser = argparse.ArgumentParser(
        description="Refine a scraped Maltese Wiktionary letter batch into unified relational JSONL."
    )
    parser.add_argument(
        "--letter",
        default="Ċ",
        help="Maltese letter batch to refine, e.g. A, B, C, or Ċ (default: Ċ).",
    )
    parser.add_argument(
        "--update",
        action="store_true",
        help="Use existing refined-results batch JSONL file as source instead of scraped-results to update rules without losing AI-refined fields.",
    )
    args = parser.parse_args()

    letter = args.letter.strip()
    if len(letter) != 1:
        parser.error("--letter must be exactly one letter, such as A, C, or Ċ")

    letter_upper = letter.upper()
    src_dir = Path("wiktionary-scraper/scraped-results")
    out_dir = Path("wiktionary-scraper/refined-results")
    
    if args.update:
        src_file = out_dir / f"wiktionary_maltese_{letter_upper}.jsonl"
    else:
        src_file = src_dir / f"wiktionary_maltese_{letter_upper}.jsonl"

    if not src_file.exists():
        print(f"Error: {src_file} does not exist.")
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)

    refined_file = out_dir / f"wiktionary_maltese_{letter_upper}.jsonl"
    
    source_type = "refined-results (update mode)" if args.update else "scraped-results"
    print(f"Refining entries from {src_file} [{source_type}] into unified relational format...")

    def extract_entry(line_str):
        obj = json.loads(line_str)
        if "entry" in obj and isinstance(obj["entry"], dict):
            return obj["entry"]
        return obj

    # Build headword→definitions lookup for cross-referencing alternative forms
    headword_defs_lookup = {}
    with src_file.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = extract_entry(line)
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
            entry = extract_entry(line)
            refined, _ = refine_entry(entry, headword_defs_lookup)
            refined_lines.append(refined)

    # Post-process: fill definitions for alternative-form stubs
    # When an entry has no definitions but references another entry via
    # alternative_forms, copy the canonical entry's definitions over.
    filled_count = 0
    hw_refined_defs = {}
    hw_refined_exs = {}
    for rl in refined_lines:
        e = rl["entry"]
        hw = e.get("headword", "").strip().lower()
        defs = e.get("definitions") or []
        exs = e.get("usage_examples") or []
        if hw and defs:
            hw_refined_defs[hw] = defs
        if hw and exs:
            hw_refined_exs[hw] = exs

    for rl in refined_lines:
        e = rl["entry"]
        alts = e.get("alternative_forms") or []
        if not e.get("definitions"):
            for alt in alts:
                canon = alt.get("headword", "").strip().lower()
                if canon in hw_refined_defs:
                    e["definitions"] = hw_refined_defs[canon]
                    filled_count += 1
                    break
        if not e.get("usage_examples"):
            for alt in alts:
                canon = alt.get("headword", "").strip().lower()
                if canon in hw_refined_exs:
                    e["usage_examples"] = hw_refined_exs[canon]
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
