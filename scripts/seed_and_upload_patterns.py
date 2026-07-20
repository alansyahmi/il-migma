#!/usr/bin/env python3
"""Generate pattern seed data from the morphological pattern tables and
upload directly to the database via Turso HTTP API.

Usage:
    # 1. Just generate the seed file (no DB upload)
    python scripts/seed_and_upload_patterns.py --generate-only

    # 2. Generate + upload to Turso
    # Set env vars or pass via --turso-url and --turso-token
    python scripts/seed_and_upload_patterns.py --upload

    # For local SQLite (optional, requires libsql client):
    python scripts/seed_and_upload_patterns.py --upload --db=local.db
"""

import base64
import io
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

OUT_DIR = Path('wiktionary-scraper/refined-results')
OUT_PATH = OUT_DIR / 'patterns_seed.jsonl'


# ── Helpers ────────────────────────────────────────────────────────────

def cv_from_1v(pattern_1v):
    """Convert 1V notation (1i2e3) to CV notation (CiCeC)."""
    if not pattern_1v:
        return None
    result = []
    for ch in pattern_1v:
        result.append('C' if ch.isdigit() else ch)
    return ''.join(result)


def wizen_from_1v(pattern_1v):
    """Convert 1V notation to Arabised wizen (1->f, 2->gh, 3->l, 4->l)."""
    if not pattern_1v:
        return None
    wm = {'1': 'f', '2': 'għ', '3': 'l', '4': 'l'}
    result = []
    i = 0
    while i < len(pattern_1v):
        ch = pattern_1v[i]
        if ch in wm:
            result.append(wm[ch])
        else:
            result.append(ch)
        i += 1
    return ''.join(result)


def pattern_id(cv, wizen):
    raw = f'{cv}|{wizen}'
    return base64.b64encode(raw.encode()).decode().rstrip('=')


# ── Pattern definitions from new_README.md ─────────────────────────────

def build_patterns():
    patterns = []

    # Nominal & Adjectival Mappings
    nominal = [
        ('1e23',     'għelm',    'fiʿl — basic noun pattern'),
        ('1o2o3',    'bogħod',   'fuʿl — noun pattern'),
        ('12ie3',    'ktieb',    'fiʿal / afʿal — broken plural or noun'),
        ('12i3',     'kbir',     'faʿil — adjective pattern'),
        ('1a2i3',    'ħabib',    'faʿil — noun pattern'),
        ('mi12e3',   'miġles',   'mafʿal — place/instrument noun'),
        ('ma12a3',   'madħal',   'mafʿal — variant'),
        ('1a22a3',   'sajjad',   'faʿʿal — agentive noun'),
        ('1i22ie3',  'kittieb',  'faʿʿal — agentive noun (i-ie)'),
        ('a12a3',    'akbar',    'afʿal — comparative / colour'),
    ]
    for p1v, example, desc in nominal:
        cv = cv_from_1v(p1v)
        wz = wizen_from_1v(p1v)
        patterns.append({
            'id': pattern_id(cv, wz),
            'cv_notation': cv,
            'wizen_notation': wz,
            'description': desc,
            'example_word': example,
            'tags': json.dumps(['noun', 'adjective']),
        })

    # Verbal forms
    verb_forms = [
        ('I',   '1a2a3',   '12i3',  '12u3',   'ma12u3',   '1a2e3'),
        ('II',  '1a22a3',  'ta12i3','ti12i3', 'm1a22a3',  '1a22ie3'),
        ('III', '1a2a3',   '1e2i3', None,     'm1ie2a3',  None),
        ('V',   't1a22a3', 't1a22i3', None,   'mit1a22a3', None),
        ('VI',  't1ie2a3', 't1ie2i3', None,   'mit1ie2a3', None),
        ('VII', 'n1a2a3',  None,      None,   None,        None),
        ('VIII','ft1a2a3', 'ft1a2i3','ft1e2i3', None, None),
        ('IX',  '12ie3',   None,      None,    'mu12ie3',  None),
        ('X',   'asta12a3','sta12i3',  None,   'mista12a3',None),
    ]

    for form, lemma, vn1, vn2, pp, ap in verb_forms:
        entries = [
            (f'Form {form} root lemma', lemma),
        ]
        if vn1: entries.append((f'Form {form} verbal noun', vn1))
        if vn2: entries.append((f'Form {form} verbal noun', vn2))
        if pp:  entries.append((f'Form {form} passive participle', pp))
        if ap:  entries.append((f'Form {form} active participle', ap))

        for label, p1v in entries:
            cv = cv_from_1v(p1v)
            wz = wizen_from_1v(p1v)
            patterns.append({
                'id': pattern_id(cv, wz),
                'cv_notation': cv,
                'wizen_notation': wz,
                'description': label,
                'example_word': '',
                'tags': json.dumps(['verb']),
            })

    # Deduplicate by id
    seen = set()
    unique = []
    for p in patterns:
        if p['id'] not in seen:
            seen.add(p['id'])
            unique.append(p)

    return unique


# ── Turso HTTP API upload ──────────────────────────────────────────────

def upload_via_turso(patterns, turso_url, turso_token):
    """Insert patterns into the database via Turso HTTP API."""
    headers = {
        'Authorization': f'Bearer {turso_token}',
        'Content-Type': 'application/json',
    }

    inserted = 0
    skipped = 0
    errors = []

    for p in patterns:
        sql = '''
            INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation, description, example_word, tags)
            VALUES (?, ?, ?, ?, ?, ?)
        '''
        body = json.dumps({
            'requests': [
                {
                    'type': 'execute',
                    'stmt': {
                        'sql': sql,
                        'args': [
                            {'type': 'text', 'value': p['id']},
                            {'type': 'text', 'value': p['cv_notation']},
                            {'type': 'text', 'value': p['wizen_notation']},
                            {'type': 'text', 'value': p['description']},
                            {'type': 'text', 'value': p.get('example_word', '')},
                            {'type': 'text', 'value': p.get('tags', '[]')},
                        ],
                    },
                }
            ]
        })

        try:
            req = urllib.request.Request(
                f'{turso_url}/v2/pipeline',
                data=body.encode(),
                headers=headers,
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read())
                if result.get('results') and result['results'][0].get('type') == 'ok':
                    # Check if row was actually inserted (vs ignored due to duplicate)
                    if result['results'][0].get('response', {}).get('result', {}).get('rows_affected', 0) > 0:
                        inserted += 1
                    else:
                        skipped += 1
                else:
                    errors.append(f'{p["cv_notation"]}: unexpected response')
        except Exception as e:
            errors.append(f'{p["cv_notation"]}: {e}')

        time.sleep(0.05)  # rate limit

    return inserted, skipped, errors


# ── Main ───────────────────────────────────────────────────────────────

def main():
    print('Building pattern seed data...')
    patterns = build_patterns()
    print(f'  {len(patterns)} patterns generated')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8', newline='\n') as f:
        for p in patterns:
            f.write(json.dumps(p, ensure_ascii=False) + '\n')
    print(f'  Written to {OUT_PATH}')

    # Also generate SQL import file for turso db shell
    sql_path = OUT_DIR / 'patterns_seed.sql'
    with open(sql_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('-- Pattern seed data (auto-generated)\n')
        f.write('-- Import: turso db shell < wiktionary-scraper/refined-results/patterns_seed.sql\n\n')
        for p in patterns:
            cv = p['cv_notation'].replace("'", "''")
            wz = p['wizen_notation'].replace("'", "''")
            desc = p['description'].replace("'", "''")
            ex = p.get('example_word', '').replace("'", "''")
            tags = p.get('tags', '[]')
            f.write(f"INSERT OR IGNORE INTO patterns (id, cv_notation, wizen_notation, description, example_word, tags)\n")
            f.write(f"VALUES ('{p['id']}', '{cv}', '{wz}', '{desc}', '{ex}', '{tags}');\n")
    print(f'  Written to {sql_path}')

    show_summary(patterns)

    # Check for upload mode
    if '--upload' in sys.argv:
        turso_url = os.environ.get('TURSO_URL') or os.environ.get('VITE_TURSO_URL')
        turso_token = os.environ.get('TURSO_AUTH_TOKEN') or os.environ.get('VITE_TURSO_AUTH_TOKEN')
        for arg in sys.argv[1:]:
            if arg.startswith('--turso-url='):
                turso_url = arg.split('=', 1)[1]
            elif arg.startswith('--turso-token='):
                turso_token = arg.split('=', 1)[1]

        if not turso_url or not turso_token:
            print('\nERROR: Turso credentials required.')
            print('Set TURSO_URL and TURSO_AUTH_TOKEN env vars, or use --turso-url= and --turso-token=')
            return

        print(f'\nUploading to Turso: {turso_url}')
        inserted, skipped, errors = upload_via_turso(patterns, turso_url, turso_token)
        print(f'  Inserted: {inserted}, Skipped (existing): {skipped}, Errors: {len(errors)}')
        if errors:
            print(f'  First error: {errors[0]}')


def show_summary(patterns):
    by_type = {}
    for p in patterns:
        tags = json.loads(p.get('tags', '[]'))
        for t in tags:
            by_type.setdefault(t, []).append(p)

    print(f'\n=== Nominal patterns: {len(by_type.get("noun", []) + by_type.get("adjective", []))} ===')
    for p in patterns:
        if 'verb' not in p.get('tags', '[]'):
            print(f'  {p["cv_notation"]:12s} {p["wizen_notation"]:15s}  {p["example_word"]:12s}  {p["description"]}')

    verbs = by_type.get('verb', [])
    print(f'\n=== Verbal patterns: {len(verbs)} ===')
    for p in verbs[:12]:
        print(f'  {p["cv_notation"]:12s} {p["wizen_notation"]:15s}  {p["description"]}')
    if len(verbs) > 12:
        print(f'  ... and {len(verbs) - 12} more')


if __name__ == '__main__':
    main()
