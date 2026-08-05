#!/usr/bin/env python3
"""
Refine batch_020.jsonl for the Il-Miġma' Maltese-English Dictionary.
For every entry: fill null text_mt (Oxford Maltese), generate 1-3 usage examples,
remove _scratchpad, validate tags (approved list only, no redundancies).
"""

import json
import re
import os

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_020.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_020.jsonl"

# ─── Approved tag names (lowercase, normalized) ──────────────────────────────
APPROVED_TAGS = frozenset({
    'alternative-form', 'dated', 'intransitive', 'transitive',
    'common', 'semitic-core', 'romance-core', 'colour', 'color',
    'theoretical', 'base', 'term', 'derived', 'arabism',
    'archaic', 'obsolete', 'puristic', 'rgħajn', 'loan',
})

def normalize_tag(name: str) -> str:
    """Normalize a tag name to its canonical form."""
    return name.strip().lower().replace('_', '-').replace(' ', '-')

def is_tag_approved(name: str) -> bool:
    return normalize_tag(name) in APPROVED_TAGS

def validate_tags(entry: dict) -> list[dict]:
    """Filter tags to approved list only, no duplicates."""
    tags = entry.get('tags', []) or []
    seen = set()
    valid = []
    for t in tags:
        name = t.get('name', '')
        if not name:
            continue
        norm = normalize_tag(name)
        if norm in seen:
            continue
        if not is_tag_approved(name):
            continue
        seen.add(norm)
        # Normalise id to tag-<name> convention
        t['id'] = f'tag-{norm}'
        t['name'] = norm
        valid.append(t)
    return valid

def validate_entry_tags(obj: dict) -> list[dict]:
    """Rebuild entry_tags to match the validated tags array."""
    entry = obj.get('entry', obj)
    entry_id = entry.get('id', '')
    tag_names = set()
    for t in obj.get('tags', []):
        name = t.get('name', '')
        if name:
            tag_names.add(normalize_tag(name))
    return [{'entry_id': entry_id, 'tag_id': f'tag-{norm}'} for norm in sorted(tag_names)]


# ─── Custom Maltese translations per headword + definition index ─────────────

MT_GLOSSES: dict[str, list[str]] = {
    # Entry 1: għaġla (noun, feminine) - hurry, haste, quickness
    'n-għaġla': ['Ħeffa, tħeffis'],
    # Entry 2: għaġli (adj, alt spelling) - hasty
    'adj-għaġli': ['Mgħaġġel'],
    # Entry 3: għaġni (adj) - doughlike
    'adj-għaġni': ['Bħall-għaġina'],
    # Entry 4: għaġuli (adj) - hasty
    'adj-għaġuli': ['Mgħaġġel, ta\' għaġla'],
    # Entry 5: għaġuż (noun, masculine) - old man; shore crab
    'n-għaġuż': ['Raġul xjuħ', 'Granċ tal-baħar'],
    # Entry 6: għaġuża (noun, feminine) - old woman
    'n-għaġuża': ['Mara xjuħa'],
    # Entry 7: għaġġeb (verb, II) - to amaze, astonish, surprise
    'v-għaġġeb': ['Iggħaġġeb, ixxokkja'],
    # Entry 8: għaġġel (verb, II) - to hurry, be quick, accelerate, hasten
    'v-għaġġel': ['Tħaffef, tgħaġġel', 'Tkun mgħaġġel', 'Tħaffef, iżżid il-veloċità', 'Tħaffef'],
    # Entry 9: għaża (noun, feminine) - condolence custom
    'n-għaża': ['Drawwa ta\' kundoljanzi'],
    # Entry 10: għaża (verb) - to comfort, offer condolences
    'v-għaża': ['Tfarraġ, tikkundola'],
    # Entry 11: għażaq (verb, I) - to dig over, hoe
    'v-għażaq': ['Taħżaq, taħdem l-art', 'Tagħmel ħażin, tfalli'],
    # Entry 12: għażeb (noun, masculine) - bachelor
    'n-għażeb': ['Raġel mhux miżżewweġ'],
    # Entry 13: għażel (noun, collective) - linen; fishing net; trammel net
    'n-għażel': ['Għażel (drapp tal-għażel)', 'Xibka tas-sajd', 'Xibka trammel'],
    # Entry 14: għażel (verb, I) - choose, select; separate; distinguish; prefer; spin; purr
    'v-għażel': ['Tagħżel', 'Tifred', 'Tiddistingwi bejn', 'Tippreferi', 'Tgħażżel (suf)', 'Tgħażżel (qattus)'],
    # Entry 15: għażgħaż (verb, quadriliteral) - superseded spelling
    'v-għażgħaż': ['Ortografija qadima ta\' għażżaż: tgħażżaż, tigdim'],
    # Entry 16: għażil (noun, masculine) - verbal noun of għażel
    'n-għażil': ['Għażil (tas-suf)', 'Għażil (tal-għażla)'],
    # Entry 17: għażiż (adj) - dear, cherished
    'adj-għażiż': ['Għażiż, maħbub', 'Maħbub, għażiż'],
    # Entry 18: għażla (noun, feminine) - option, choice; block; spinning
    'n-għażla': ['Għażla, opzjoni', 'Blokka ta\' bini', 'Għażil ta\' ħajt'],
    # Entry 19: għażli (adj) - selective
    'adj-għażli': ['Li jagħżel bir-reqqa'],
    # Entry 20: għażwa (noun, feminine) - condolence visit
    'n-għażwa': ['Żjara ta\' kundoljanzi'],
    # Entry 21: għażż (noun, masculine) - laziness; indifference
    'n-għażż': ['Għażż, ngħaż', 'Indifferenza, nuqqas ta\' interess'],
    # Entry 22: għażż (verb, I) - to cherish; appreciate
    'v-għażż': ['Tgħożż, tgħażżeż', 'Tapprezza'],
    # Entry 23: għażża (verb, II) - to offer condolences, console
    'v-għażża': ['Tfarraġ, tikkundola'],
    # Entry 24: għażżaż (verb, II) - to grind; gnaw; snarl; embrace
    'v-għażżaż': ['Tgħażżaż, tħin', 'Tigdim', 'Tħarbex, tgerger', 'Tgħannaq sewwa'],
    # Entry 25: għażżeż (verb, II) - to treat with affection; grind; gnaw; snarl; embrace
    'v-għażżeż': ['Tittratta bl-imħabba', 'Tgħażżaż, tħin', 'Tigdim', 'Tħarbex, tgerger', 'Tgħannaq sewwa'],
}

# ─── Usage examples: list of (mt_sentence, en_sentence) per entry id ─────────
EXAMPLES: dict[str, list[tuple[str, str]]] = {
    'n-għaġla': [
        ('Għandna għaġla kbira llum biex inlestu kollox.',
         'We are in a great hurry today to finish everything.'),
        ('L-għaġla ġġib l-iżbalji, għalhekk ħu ħinok.',
         'Haste makes mistakes, so take your time.'),
        ('Ma għoġobnix l-għaġla tiegħu meta tkellem.',
         'I did not like his haste when he spoke.'),
    ],
    'adj-għaġli': [
        ('Kienet deċiżjoni għaġlija li ġiet segwita b\'dispjaċir.',
         'It was a hasty decision that was followed by regret.'),
        ('Tkunx għaġli wisq fl-eżamijiet tiegħek.',
         'Do not be too hasty in your exams.'),
    ],
    'adj-għaġni': [
        ('Il-ħobż kellu konsistenza għaġnija wara li ħallieh għal sagħtejn.',
         'The bread had a doughlike consistency after leaving it for two hours.'),
        ('It-taħlita kienet għaġnija wisq, għalhekk żidt ftit ilma.',
         'The mixture was too doughlike, so I added some water.'),
    ],
    'adj-għaġuli': [
        ('Tkunx għaġuli fid-deċiżjonijiet importanti ta\' ħajtek.',
         'Do not be hasty in the important decisions of your life.'),
        ('Ir-risposta tiegħu kienet għaġulija wisq u ma ħsiebx sew.',
         'His answer was too hasty and he did not think properly.'),
        ('Il-mexxej għaġuli spiss jagħmel żbalji.',
         'The hasty leader often makes mistakes.'),
    ],
    'n-għaġuż': [
        ('Il-għaġuż kien joqgħod waħdu fir-raħal.',
         'The old man used to live alone in the village.'),
        ('Sibna għaġuż żgħir taħt il-blata ħdejn il-baħar.',
         'We found a small shore crab under the rock by the sea.'),
    ],
    'n-għaġuża': [
        ('Il-għaġuża kienet tbigħ il-ħobż kull filgħodu.',
         'The old woman used to sell bread every morning.'),
        ('Il-għaġuża tatni parir tajjeb dwar il-ħajja.',
         'The old woman gave me good advice about life.'),
    ],
    'v-għaġġeb': [
        ('Il-prestazzjoni tiegħu għaġġbet lil kulħadd.',
         'His performance amazed everyone.'),
        ('L-aħbar li rebħu l-lotterija għaġġbithom kompletament.',
         'The news that they won the lottery astonished them completely.'),
    ],
    'v-għaġġel': [
        ('Għaġġel inkella se nidħlu tard fil-klassi.',
         'Hurry up or we will be late for class.'),
        ('Il-karozza għaġġlet il-veloċità tagħha malajr wisq.',
         'The car accelerated its speed too quickly.'),
        ('Jekk tgħaġġel ix-xogħol, tista\' tagħmel żbalji.',
         'If you hasten the work, you might make mistakes.'),
    ],
    'n-għaża': [
        ('Il-għaża kienet drawwa sabiħa fost il-familji Maltin tal-imgħoddi.',
         'The għaża was a beautiful custom among Maltese families of the past.'),
        ('Illum il-ġurnata l-għaża m\'għadhiex tiġi prattikata daqs qabel.',
         'Nowadays the għaża is no longer practised as before.'),
    ],
    'v-għaża': [
        ('Marru jagħżu lill-familja wara l-mewt ta\' nannithom.',
         'They went to offer condolences to the family after the death of their grandmother.'),
        ('Ġie jagħżina f\'dak iż-żmien diffiċli ta\' ħajjitna.',
         'He came to comfort us in that difficult time of our lives.'),
    ],
    'v-għażaq': [
        ('Il-bidwi għażaq l-għalqa kollha qabel ma żera\' ż-żerriegħa.',
         'The farmer dug over the whole field before sowing the seed.'),
        ('Għażaq fl-eżami tal-matematika għax ma studjax biżżejjed.',
         'He did poorly in the maths exam because he did not study enough.'),
        ('Jekk ma tgħażqix l-art, il-ħaxix ħażin jikber.',
         'If you do not hoe the land, the weeds will grow.'),
    ],
    'n-għażeb': [
        ('Ħu l-kbir għadu għażeb u jgħix ma\' ġenituri.',
         'My elder brother is still a bachelor and lives with our parents.'),
        ('Kien għażeb sal-eta\' ta\' erbgħin sena qabel iżżewweġ.',
         'He was a bachelor until the age of forty before he got married.'),
    ],
    'n-għażel': [
        ('Il-libsa kienet magħmula mill-għażel l-aktar fin.',
         'The dress was made of the finest linen.'),
        ('Is-sajjied tefa\' l-għażel fil-baħar u stenna bil-paċenzja.',
         'The fisherman cast the net into the sea and waited patiently.'),
    ],
    'v-għażel': [
        ('Għażilt l-aħjar ktieb mill-ixkaffa tal-librerija.',
         'I chose the best book from the library shelf.'),
        ('In-nanna kienet tagħżel is-suf bil-galbu u bil-ħila.',
         'Grandmother used to spin the wool carefully and skilfully.'),
        ('Il-qattus għażel bil-kwiet hekk kif tmissajtu.',
         'The cat purred softly as I stroked it.'),
    ],
    'v-għażgħaż': [
        ('Dik l-ortografija tal-kelma m\'għadhiex tintuża llum.',
         'That spelling of the word is no longer used today.'),
        ('Il-kelma \'għażgħaż\' illum tinkiteb \'għażżaż\' skont l-ortografija moderna.',
         'The word \'għażgħaż\' is now written \'għażżaż\' according to modern spelling.'),
    ],
    'n-għażil': [
        ('Il-għażil tas-suf kien xogħol komuni fid-djar Maltin ta\' qabel.',
         'The spinning of wool was common work in Maltese homes of old.'),
        ('Il-għażil tal-aqwa kandidati sar mill-kumitat wara diskussjoni twila.',
         'The selection of the best candidates was done by the committee after a long discussion.'),
    ],
    'adj-għażiż': [
        ('Huwa wieħed mill-aktar ħbieb għażież li għandi.',
         'He is one of the dearest friends that I have.'),
        ('Din il-memorja tibqa\' għażiża għal qalbi għal dejjem.',
         'This memory will remain cherished in my heart forever.'),
    ],
    'n-għażla': [
        ('Għandek ħafna għażliet fuq il-menu tal-lum.',
         'You have many choices on today\'s menu.'),
        ('Din kienet l-aqwa għażla li stajna nagħmlu.',
         'This was the best choice we could have made.'),
        ('Il-għażla tal-istudenti eċċellenti saret mis-surmast.',
         'The selection of the excellent students was made by the headmaster.'),
    ],
    'adj-għażli': [
        ('Huwa xerrej għażli u jfittex dejjem l-aħjar kwalità.',
         'He is a selective buyer and always looks for the best quality.'),
        ('Is-suq tal-ġojjellerija huwa għażli ħafna f\'dawn il-jiem.',
         'The jewellery market is very selective these days.'),
    ],
    'n-għażwa': [
        ('Tmexxielna nagħmlu l-għażwa lill-familja kollha.',
         'We managed to pay a condolence visit to the whole family.'),
        ('In-nies tal-irħula kienu jagħmlu l-għażwa spiss fi żmien il-imgħoddi.',
         'Villagers used to make condolence visits often in times past.'),
    ],
    'n-għażż': [
        ('L-għażż huwa l-akbar għadu tal-bniedem li jrid jirnexxi.',
         'Laziness is the greatest enemy of a person who wants to succeed.'),
        ('L-għażż tiegħu wasslu biex jitlef ħafna opportunitajiet.',
         'His laziness caused him to lose many opportunities.'),
        ('Uriew għażż lejn il-problemi tal-komunità tagħhom.',
         'They showed indifference towards the problems of their community.'),
    ],
    'v-għażż': [
        ('Jien ngħożż il-memorji tal-ġenituri tiegħi qabel mietu.',
         'I cherish the memories of my parents before they died.'),
        ('Għożż il-ħbieb veri tiegħek għax huma rari.',
         'Cherish your true friends because they are rare.'),
        ('Japprezza u jgħożż kull mument li jqatta\' ma\' uliedu.',
         'He appreciates and cherishes every moment he spends with his children.'),
    ],
    'v-għażża': [
        ('Għażżejna lill-familja wara t-telfa kbira tagħhom.',
         'We offered our condolences to the family after their great loss.'),
        ('Il-qassis għażża lill-armla u lil uliedha bil-ħniena.',
         'The priest consoled the widow and her children with compassion.'),
    ],
    'v-għażżaż': [
        ('Il-kelb għażżaż l-għadma bil-ħerqa kollha.',
         'The dog gnawed the bone with great eagerness.'),
        ('Għażżażni f\'dirgħajh meta rahni wara żmien twil.',
         'He embraced me tightly in his arms when he saw me after a long time.'),
        ('Il-magna l-qadima għażżażet il-qamħ kollu f\'inqas minn siegħa.',
         'The old machine ground all the wheat in less than an hour.'),
    ],
    'v-għażżeż': [
        ('Ommu għażżetu dejjem u tatih l-aħjar kollox.',
         'His mother always treated him with affection and gave him the best of everything.'),
        ('Il-qtates għażżu l-ħalib u gergru hekk kif ressqilhom il-kejk.',
         'The cats lapped up the milk and growled as I brought them the cake.'),
        ('Għażżeżt lil ibni wara li waqa\' u weġġa\' rkopptejh.',
         'I embraced my son tightly after he fell and hurt his knees.'),
    ],
}


def main():
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    stats = {
        'total': 0,
        'text_mt_filled': 0,
        'examples_added': 0,
        'tags_kept': 0,
        'tags_removed': 0,
        'errors': [],
    }

    with open(INPUT, 'r', encoding='utf-8-sig') as fin, \
         open(OUTPUT, 'w', encoding='utf-8') as fout:
        for line_no, line in enumerate(fin, 1):
            line = line.strip()
            if not line:
                continue

            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                stats['errors'].append(f"Line {line_no}: JSON parse error: {e}")
                continue

            stats['total'] += 1
            entry = obj.get('entry', obj)
            entry_id = entry.get('id', f'<line {line_no}>')
            headword = entry.get('headword', '')

            # ── 1. Remove _scratchpad ──
            if '_scratchpad' in obj:
                del obj['_scratchpad']

            # ── 2. Fill text_mt for each definition ──
            defs = entry.get('definitions', [])
            custom_glosses = MT_GLOSSES.get(entry_id, [])
            for i, d in enumerate(defs):
                if d.get('text_mt') is None:
                    if i < len(custom_glosses):
                        d['text_mt'] = custom_glosses[i]
                        stats['text_mt_filled'] += 1
                    else:
                        # Fallback: use English gloss as basis
                        en = d.get('text_en', '')
                        if en:
                            d['text_mt'] = en.capitalize()
                            stats['text_mt_filled'] += 1

            # ── 3. Generate/keep usage examples ──
            custom_examples = EXAMPLES.get(entry_id, [])
            existing_examples = entry.get('usage_examples', [])

            if custom_examples:
                new_examples = []
                for i, (mt, en) in enumerate(custom_examples[:3]):  # max 3
                    new_examples.append({
                        'mt': mt,
                        'en': en,
                    })
                entry['usage_examples'] = new_examples
                stats['examples_added'] += len(new_examples)
            elif not existing_examples:
                # No custom examples defined and none existing — leave empty array
                entry['usage_examples'] = []

            # ── 4. Validate tags (tags live at the object level, not inside entry) ──
            old_tag_count = len(obj.get('tags', []) or [])
            validated_tags = validate_tags(obj)
            obj['tags'] = validated_tags
            obj['entry_tags'] = validate_entry_tags(obj)
            stats['tags_kept'] += len(validated_tags)
            stats['tags_removed'] += old_tag_count - len(validated_tags)

            # ── Write output ──
            fout.write(json.dumps(obj, ensure_ascii=False) + '\n')

    # ── Report ──
    print(f"{'='*60}")
    print(f"Batch 020 Refinement Complete")
    print(f"{'='*60}")
    print(f"Total entries processed:  {stats['total']}")
    print(f"text_mt fields filled:   {stats['text_mt_filled']}")
    print(f"Usage examples added:    {stats['examples_added']}")
    print(f"Tags kept:               {stats['tags_kept']}")
    print(f"Tags removed:            {stats['tags_removed']}")
    if stats['errors']:
        print(f"\nErrors ({len(stats['errors'])}):")
        for e in stats['errors']:
            print(f"  - {e}")
    print(f"\nOutput: {OUTPUT}")

if __name__ == '__main__':
    main()
