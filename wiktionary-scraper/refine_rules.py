#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

# Maltese base letters collation map
LETTER_MAP = {
    'a': 'A', 'b': 'B', 'ċ': 'C', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F',
    'ġ': 'G', 'g': 'G', 'għ': 'G', 'h': 'H', 'ħ': 'H', 'i': 'I', 'ie': 'I',
    'j': 'J', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O', 'p': 'P',
    'q': 'Q', 'r': 'R', 's': 'S', 't': 'T', 'u': 'U', 'v': 'V', 'w': 'W',
    'x': 'X', 'ż': 'Z', 'z': 'Z'
}

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()

def generate_maltese_ipa(headword: str) -> str:
    """Generates Standard Maltese IPA transcription for a headword based on rules."""
    w = headword.lower().strip()
    
    # Placeholders for clusters and symbols
    # Rules:
    # għi -> /ɛj/
    # għu -> /ɔw/
    w = w.replace('għi', 'ɛj')
    w = w.replace('għu', 'ɔw')
    
    # Word-final għ / h / ħ -> /ħ/
    if w.endswith('għ') or w.endswith('h') or w.endswith('ħ'):
        # strip final and we'll add ħ later
        w = re.sub(r'(għ|h|ħ)$', 'Ħ', w)
        
    # Internal għ/h function as vowel-lengthening markers
    # We replace them with a lengthening marker bound to the preceding vowel.
    # Note: we use placeholder 'ː' and will bind it to the preceding vowel.
    w = re.sub(r'għ(?!i|u)', 'ː', w)
    w = re.sub(r'h(?!$)', 'ː', w)
    
    # Character mapping to IPA symbols
    # ie -> ɪː
    w = w.replace('ie', 'Iː')
    
    # Vowels
    # a -> ɐ, e -> ɛ, i -> ɪ, o -> ɔ, u -> ʊ
    # Note we capitalised I for long ie to avoid matching short i
    
    # Mapping consonants
    mapping = {
        'ċ': 't͡ʃ',
        'ġ': 'd͡ʒ',
        'ħ': 'ħ',
        'q': 'ʔ',
        'x': 'ʃ',
        'ż': 'z',
        'z': 't͡s',
        'c': 'k',
        'g': 'ɡ',
        'j': 'j',
        'w': 'w',
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
        elif w[i:i+3] == 't͡ʃ':
            res.append('t͡ʃ')
            i += 3
        elif w[i:i+3] == 'd͡ʒ':
            res.append('d͡ʒ')
            i += 3
        elif w[i:i+3] == 't͡s':
            res.append('t͡s')
            i += 3
        elif char in mapping:
            res.append(mapping[char])
            i += 1
        elif char in ['a', 'e', 'i', 'o', 'u']:
            v_map = {'a': 'ɐ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɔ', 'u': 'ʊ'}
            res.append(v_map[char])
            i += 1
        else:
            res.append(char)
            i += 1
            
    # Final obstruent devoicing
    # b->p, d->t, ġ(d͡ʒ)->ċ(t͡ʃ), g(ɡ)->k, v->f, ż(z)->s
    if res:
        last = res[-1]
        devoice = {
            'b': 'p', 'd': 't', 'd͡ʒ': 't͡ʃ', 'ɡ': 'k', 'v': 'f', 'z': 's'
        }
        if last in devoice:
            res[-1] = devoice[last]
            
    # Syllabification & Stress Heuristics
    # Vowel inventory:
    vowels = {'ɐ', 'ɛ', 'ɪ', 'ɔ', 'ʊ', 'ɐː', 'ɛː', 'ɪː', 'ɔː', 'ʊː'}
    
    # Re-group vowel + lengthening marker
    grouped = []
    i = 0
    while i < len(res):
        if i + 1 < len(res) and res[i+1] == 'ː':
            grouped.append(res[i] + 'ː')
            i += 2
        else:
            grouped.append(res[i])
            i += 1
            
    # Simple syllabification
    # Find positions of vowels
    v_indices = [idx for idx, char in enumerate(grouped) if any(v in char for v in vowels)]
    
    if len(v_indices) <= 1:
        # Monosyllabic
        ipa_str = "".join(grouped)
        return f"/{ipa_str}/"
        
    # Split into syllables (rough maximal onset)
    syllables = []
    last_split = 0
    for idx, v_idx in enumerate(v_indices):
        if idx == len(v_indices) - 1:
            syllables.append(grouped[last_split:])
        else:
            # Split between this vowel and the next
            next_v_idx = v_indices[idx + 1]
            consonants_between = next_v_idx - v_idx - 1
            if consonants_between <= 1:
                split_point = v_idx + 1
            else:
                # Give most consonants to the onset of the next syllable
                split_point = next_v_idx - 1
            syllables.append(grouped[last_split:split_point])
            last_split = split_point
            
    # Stress: Penultimate by default. Ultimate if final syllable has a long vowel (contains ː).
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

def refine_entry(entry):
    headword = entry.get("headword")
    pos = entry.get("pos")
    
    # 1. Skip curated
    if entry.get("curated") is True:
        return entry, False
        
    # 2. Base fields
    entry["source_id"] = "src-crowd"
    
    # 3. Source Language and Loanword mapping
    chain = entry.get("etymology_chain") or []
    is_loan = 0
    source_lang = "Uncertain"
    
    if chain:
        first_node = chain[0]
        lang = (first_node.get("language") or "").strip()
        if lang:
            source_lang = lang
            if lang.lower() == "arabic" or lang.lower().startswith("clerical arabic") or lang.lower().startswith("classical arabic"):
                is_loan = 0
            else:
                is_loan = 1
                
    entry["source_language"] = source_lang
    entry["is_loanword"] = is_loan
    
    # 4. Generate IPA
    entry["phonetics"] = [
        {
            "dialect": "Standard",
            "ipa": generate_maltese_ipa(headword),
            "notes": None
        }
    ]
    
    # 5. Handle Proper Nouns / Surnames
    is_proper_surname = False
    defs = entry.get("definitions") or []
    if defs:
        # Check if it is a surname
        text_en = defs[0].get("text_en") or ""
        if text_en.strip().lower() == "a surname":
            is_proper_surname = True
            defs[0]["text_mt"] = "kunjom"
            defs[0]["register"] = ""
            defs[0]["nuance"] = ""
            entry["usage_examples"] = []
            entry["is_loanword"] = 1
            if entry.get("source_language") == "Uncertain":
                entry["source_language"] = "Italian" # standard default for Maltese surnames
                
        # Check for Chad/Ċad
        elif headword in ["Ċad", "Chad"]:
            is_proper_surname = True
            defs[0]["text_en"] = "Chad (a country in Central Africa)"
            defs[0]["text_mt"] = "il-Ċad; pajjiż fl-Afrika Ċentrali"
            defs[0]["register"] = ""
            defs[0]["nuance"] = ""
            entry["usage_examples"] = [
                {
                    "mt": "N'Djamena hija l-kapitali taċ-Ċad.",
                    "en": "N'Djamena is the capital of Chad."
                }
            ]
            entry["is_loanword"] = 1
            entry["source_language"] = "French"
            
    # Clean up fields
    if "tags" in entry:
        raw_tags = entry["tags"] or []
        cleaned_tags = []
        for t in raw_tags:
            # Remove redundant tags
            t_clean = t.strip().lower()
            if t_clean in [pos.lower(), "misluf", "għerq semitiku", "maltese", "malti", "proper noun"]:
                continue
            cleaned_tags.append(t_clean)
        entry["tags"] = cleaned_tags if cleaned_tags else None
        
    return entry, is_proper_surname

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
    
    entries_file = out_dir / "wiktionary_maltese_Ċ-entries.jsonl"
    tags_file = out_dir / "wiktionary_maltese_Ċ-tags.jsonl"
    etags_file = out_dir / "wiktionary_maltese_Ċ-entry_tags.jsonl"
    
    print(f"Refining entries from {src_file}...")
    
    entries_list = []
    proper_surnames_count = 0
    other_count = 0
    
    with src_file.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            refined, is_proper = refine_entry(entry)
            entries_list.append(refined)
            if is_proper:
                proper_surnames_count += 1
            else:
                other_count += 1
                
    # Write entries
    with entries_file.open("w", encoding="utf-8", newline="\n") as ef:
        for e in entries_list:
            # We omit "tags" from the entry object body for the 3-file format
            e_out = {k: v for k, v in e.items() if k != "tags"}
            ef.write(json.dumps(e_out, ensure_ascii=False) + "\n")
            
    # Write unique tags and entry_tags mapping
    unique_tags = {}
    entry_tags = []
    
    for e in entries_list:
        tags = e.get("tags") or []
        for t in tags:
            tag_slug = t.replace(' ', '-').lower()
            tag_id = f"tag-{tag_slug}"
            if tag_id not in unique_tags:
                unique_tags[tag_id] = {
                    "id": tag_id,
                    "name": t,
                    "category": None,
                    "description": None
                }
            entry_tags.append({
                "entry_id": e["id"],
                "tag_id": tag_id
            })
            
    with tags_file.open("w", encoding="utf-8", newline="\n") as tf:
        for tid in sorted(unique_tags.keys()):
            tf.write(json.dumps(unique_tags[tid], ensure_ascii=False) + "\n")
            
    with etags_file.open("w", encoding="utf-8", newline="\n") as etf:
        for et in entry_tags:
            etf.write(json.dumps(et, ensure_ascii=False) + "\n")
            
    print("\nRefinement Complete!")
    print(f"Total entries: {len(entries_list)}")
    print(f"Proper nouns/surnames auto-filled: {proper_surnames_count}")
    print(f"Other entries (need semantic definitions): {other_count}")
    print(f"Written entries to: {entries_file}")
    print(f"Written tags to:    {tags_file}")
    print(f"Written mappings to: {etags_file}")

if __name__ == "__main__":
    main()
