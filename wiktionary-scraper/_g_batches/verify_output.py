import json

with open(r'c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_037.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        obj = json.loads(line)
        eid = obj['entry']['id']

        # Check a few specific entries
        if eid in ('n-ġuħ', 'adj-ġust', 'n-ġwann', 'n-ġwanni', 'v-ġġela', 'v-ġġebbed'):
            print(f'=== {eid} ===')
            defs = obj['entry']['definitions']
            for i, d in enumerate(defs):
                print(f'  Def {i}: en={d.get("text_en")}')
                print(f'         mt={d.get("text_mt")}')
            exs = obj['entry'].get('usage_examples', [])
            for ex in exs:
                print(f'  Ex: mt={ex.get("text_mt")}')
                print(f'      en={ex.get("text_en")}')
            tags = obj.get('tags', [])
            print(f'  Tags: {[t["name"] for t in tags]}')
            print()
