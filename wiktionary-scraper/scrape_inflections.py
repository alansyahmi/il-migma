#!/usr/bin/env python3
import json
import re
import urllib.request
import urllib.parse
import time
import sys
from pathlib import Path

def fetch_html(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None

def parse_inflections_html(html_text):
    if not html_text:
        return {}
    
    inflections = {}
    for p in re.findall(r'<p>.*?</p>', html_text, re.DOTALL):
        if 'Latn headword' not in p:
            continue
            
        match = re.search(r'\((.*?)\)', p, re.DOTALL)
        if not match:
            continue
            
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
                    
    return inflections

def extract_vowels(word):
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

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except (AttributeError, IOError):
        pass

    path = Path('wiktionary-scraper/refined-results/wiktionary_maltese_Ċ.jsonl')
    if not path.exists():
        print(f"Error: {path} not found.")
        sys.exit(1)
        
    print(f"Reading entries from {path}...")
    lines = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            lines.append(json.loads(line))
            
    print(f"Loaded {len(lines)} entries. Scraping inflections for nouns/adjectives...")
    
    updated_count = 0
    for idx, item in enumerate(lines, 1):
        entry = item.get('entry')
        if not entry:
            continue
            
        pos = entry.get('pos')
        if pos not in ['noun', 'proper noun', 'adjective']:
            continue
            
        url = entry.get('source_page')
        if not url:
            continue
            
        print(f"[{idx}/{len(lines)}] Fetching derived forms for {entry['headword']} ({pos})...")
        html_text = fetch_html(url)
        if not html_text:
            continue
            
        inflections = parse_inflections_html(html_text)
        
        # Merge inflections and calculate vowel sets
        print(f"  -> Found inflections: {inflections}")
        
        # Apply to entries
        if pos in ['noun', 'proper noun']:
            entry['vowel_set_sg'] = extract_vowels(entry['headword'])
            
            if inflections.get('is_collective'):
                entry['is_collective'] = 1
            if inflections.get('is_singulative'):
                entry['is_singulative'] = 1
            if 'collective_form' in inflections:
                entry['collective_form'] = inflections['collective_form']
            if 'singulative_form' in inflections:
                entry['singulative_form'] = inflections['singulative_form']
            if 'dual_form' in inflections:
                entry['dual_form'] = inflections['dual_form']
                entry['vowel_set_dual'] = extract_vowels(inflections['dual_form'])
            if 'paucal_form' in inflections:
                entry['paucal_form'] = inflections['paucal_form']
            if 'feminine_form' in inflections:
                entry['feminine_form'] = inflections['feminine_form']
                entry['vowel_set_opp'] = extract_vowels(inflections['feminine_form'])
            if 'masculine_form' in inflections:
                entry['masculine_form'] = inflections['masculine_form']
                entry['vowel_set_opp'] = extract_vowels(inflections['masculine_form'])
            if 'plural_forms' in inflections:
                entry['plural_forms'] = [{'form': val, 'pattern': None} for val in inflections['plural_forms']]
                entry['vowel_set_pl'] = extract_vowels(inflections['plural_forms'][0])
                
        elif pos == 'adjective':
            entry['vowel_set_sg'] = extract_vowels(entry['headword'])
            if 'feminine_form' in inflections:
                entry['feminine_form'] = inflections['feminine_form']
                entry['vowel_set_opp'] = extract_vowels(inflections['feminine_form'])
            if 'masculine_form' in inflections:
                entry['masculine_form'] = inflections['masculine_form']
                entry['vowel_set_opp'] = extract_vowels(inflections['masculine_form'])
            if 'plural_forms' in inflections:
                entry['plural_form'] = [{'form': val, 'pattern': None} for val in inflections['plural_forms']]
                entry['plural_forms'] = entry['plural_form']
                entry['vowel_set_pl'] = extract_vowels(inflections['plural_forms'][0])
                
        updated_count += 1
        time.sleep(0.1)  # Play nice with Wiktionary
        
    print(f"\nDone! Inflections scraped and merged for {updated_count} entries.")
    
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        for item in lines:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    print(f"Saved changes to {path}")

if __name__ == '__main__':
    main()
