import json

INPUT = r'c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_037.jsonl'

with open(INPUT, 'r', encoding='utf-8-sig') as f:
    for i, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        entry = obj.get('entry', {})
        eid = entry.get('id', '')
        if eid in ('n-ġuħ', 'n-Ġwann', 'n-Ġwanni', 'n-ġwann', 'n-ġwanni'):
            entry_tags = entry.get('tags', [])
            print(f'Line {i}: id={eid}')
            print(f'  tags count: {len(entry_tags)}')
            for t in entry_tags:
                print(f'  Tag: {json.dumps(t, ensure_ascii=False)}')
                print(f'  name: {repr(t.get("name", ""))}')

            # Also check top-level tags
            top_tags = obj.get('tags', [])
            print(f'  top-level tags count: {len(top_tags)}')

            # Check defs
            defs = entry.get('definitions', [])
            for j, d in enumerate(defs):
                print(f'  Def {j}: text_mt={repr(d.get("text_mt"))}')
