#!/usr/bin/env python3
"""
Refine batch_033.jsonl: Maltese lemmas ġ-imġma through ġlata.

For EVERY entry:
  - Remove _scratchpad
  - Fill null text_mt (Oxford Maltese, capitalised, no circularity, no ;)
  - Generate 1-3 examples (Maltese + UK English)
  - Validate tags (approved list only, no redundant tags)
"""

import json
import os
import re

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_033.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_033.jsonl"

APPROVED_TAGS = {
    'common', 'rare', 'archaic', 'neologism', 'purist', 'formal', 'literary',
    'colloquial', 'obsolete', 'technical', 'dialectal', 'gozitan', 'slang',
    'vulgar', 'euphemistic', 'figurative', 'pejorative', 'childish',
    'agriculture', 'anatomy', 'animals', 'architecture', 'art', 'astronomy',
    'sea', 'botany', 'geography', 'food', 'commerce', 'family', 'physics',
    'war', 'law', 'mathematics', 'medicine', 'music', 'politics', 'religion',
    'crafts', 'sports', 'technology', 'weather', 'transport', 'time',
    'alternative-form',
}

# ── Maltese definitions ──────────────────────────────────────────────────

MT_DEFS = {
    'ġimġma': [
        'Ġimġma: l-għadam tar-ras li jgħatti l-moħħ u jipproteġih.',
    ],
    'ġimġona': [
        'Ġimġona: ortografija alternattiva ta\' "ġimġma".',
    ],
    'Ġinjett': [
        'Ġinjett: ortografija alternattiva ta\' "Ġunjett" (Lulju).',
    ],
    'Ġinju': [
        'Ġinju: ortografija alternattiva ta\' "Ġunju" (ix-xahar tas-sitt).',
    ],
    'ġir': [
        'Ġir: sustanza bajda trabija li tinkiseb mill-ġebla tal-ġir, użata fil-bini u fil-kisi tal-ħitan.',
    ],
    'ġiraff': [
        'Ġiraff: annimal kbir ta\' għonq twil b\'plejks kannella u bojod, nattiv għall-Afrika.',
    ],
    'ġirasol': [
        'Ġirasol: pjanta għolja bi fjura kbira safra li ddur lejn ix-xemx.',
    ],
    'ġiri': [
        'Ġiri: nom verbali ta\' "ġera".',
    ],
    'ġirja': [
        'Ġirja: moviment b\'saqajn mgħaġġlin, aktar mgħaġġel mill-mixja.',
        'Ġirja: vjaġġ qasir f\'vettura, speċjalment bħala ħarġa ta\' pjaċir.',
    ],
    'ġirun': [
        'Ġirun: ortografija alternattiva ta\' "ġurun" (biċċa drapp).',
    ],
    'ġisem': [
        'Ġisem: l-istruttura fiżika kollha ta\' bniedem jew annimal, inklużi l-għadam, il-muskoli u l-organi.',
    ],
    'ġiża': [
        'Ġiża: nom verbali ta\' "ġeża". (Kliem skadut)',
    ],
    'ġiżell': [
        'Ġiżell: għodda tal-ħadid jew tal-azzar b\'tarf jaqta\' għat-tinqix u l-iskultura tal-injam jew tal-ġebel.',
    ],
    'ġiżi': [
        'Ġiżi: pjanta tal-familja Brassicaceae bi fjuri vjola jew bojod, li tikber mal-ħitan u l-blat.',
        'Ġiżi: fjura tar-rebbiegħa ta\' lewn isfar jew abjad, b\'għamla ta\' tazza.',
        'Ġiżi: nom verbali ta\' "ġeża". (Kliem skadut)',
    ],
    'ġiżimin': [
        'Ġiżimin: pjanta tal-familja Oleaceae bi fjuri bojod jew sofor b\'riħa ħelwa qawwija.',
    ],
    'ġiżirana': [
        'Ġiżirana: biċċa dehbijiet li tintlibes madwar l-għonq, magħmula minn katina, ġebel prezzjuż jew żibeġ.',
    ],
    'ġiżmin': [
        'Ġiżmin: ortografija alternattiva ta\' "ġiżimin".',
    ],
    'ġjaċint': [
        'Ġjaċint: pjanta tal-familja Asparagaceae bi fjuri leħliela f\'forma ta\' qanpiena b\'riħa ħelwa.',
    ],
    'ġjometra': [
        'Ġjometra: matematiku li jispeċjalizza fil-ġjometrija.',
    ],
    'ġjometrija': [
        'Ġjometrija: fergħa tal-matematika li tistudja l-forom, id-daqsijiet, l-angoli u l-proprjetajiet tal-ispazju.',
    ],
    'ġjometrikament': [
        'Ġjometrikament: b\'mod ġeometriku, skont il-prinċipji tal-ġjometrija.',
    ],
    'ġjometriku': [
        'Ġjometriku: relatat mal-ġjometrija, li għandu forom, linji u disinni ġeometriċi.',
    ],
    'ġjufija': [
        'Ġjufija: nuqqas ta\' kuraġġ u determinazzjoni quddiem il-periklu jew l-isfidi.',
    ],
    'ġlat': [
        'Ġlat: ortografija alternattiva ta\' "ġlata" (saff irqiq ta\' silġ).',
        'Ġlat: qoxra iebsa tas-silġ jew tal-borra.',
    ],
    'ġlata': [
        'Ġlata: saff irqiq ta\' silġ li jifforma fuq l-uċuħ meta jkollu kesħa estrema.',
        'Ġlata: qoxra iebsa tas-silġ jew tal-borra fuq l-art.',
    ],
}

# ── Redundant tags (remove when the field already conveys the info) ──────

def is_redundant_tag(tag_name, entry):
    """Check if a tag is redundant given the entry's other fields."""
    if tag_name in ('noun', 'nouns') and entry.get('pos') == 'noun':
        return True
    if tag_name in ('verb', 'verbs') and entry.get('pos') == 'verb':
        return True
    if tag_name in ('adjective', 'adjectives') and entry.get('pos') == 'adjective':
        return True
    if tag_name in ('adverb') and entry.get('pos') == 'adverb':
        return True
    if tag_name in ('loanword', 'loan') and entry.get('is_loanword') == 1:
        return True
    if tag_name in ('feminine', 'fem') and entry.get('gender') == 'feminine':
        return True
    if tag_name in ('masculine', 'masc') and entry.get('gender') == 'masculine':
        return True
    if tag_name == 'semitic' and entry.get('root_consonants'):
        return True
    if tag_name == 'collective' and entry.get('is_collective') == 1:
        return True
    return False


def clean_semicolons(text):
    """Replace semicolons with full stops — no semicolon rule."""
    if not text:
        return text
    text = text.replace(';', '.')
    # Clean up double dots
    text = re.sub(r'\.\s*\.', '.', text)
    return text


def validate_and_clean_tags(obj, entry):
    """Remove unapproved and redundant tags."""
    if not obj.get('tags'):
        obj['tags'] = []
        obj['entry_tags'] = []
        return

    valid_tags = []
    for t in obj['tags']:
        tag_name = t.get('name') or t.get('id', '')
        # Strip tag- prefix if present
        raw_name = tag_name.replace('tag-', '')
        if raw_name not in APPROVED_TAGS:
            continue
        if is_redundant_tag(raw_name, entry):
            continue
        valid_tags.append(t)

    obj['tags'] = valid_tags

    # Sync entry_tags
    valid_tag_ids = {t['id'] for t in valid_tags}
    if obj.get('entry_tags'):
        obj['entry_tags'] = [et for et in obj['entry_tags'] if et.get('tag_id') in valid_tag_ids]
    else:
        obj['entry_tags'] = []


def build_usage_examples(headword, pos, definitions):
    """Return 1-3 usage examples for the given headword."""
    hw_lower = headword.lower()
    examples_map = {
        'ġimġma': [
            ('Il-ġimġma tal-bniedem tipproteġi l-moħħ mill-ħsara.', 'The human skull protects the brain from injury.'),
            ('L-arkeoloġi sabu ġimġma antika waqt it-tħaffir.', 'The archaeologists found an ancient skull during the excavation.'),
        ],
        'ġir': [
            ('Il-bennejja uża l-ġir biex jiksu l-ħitan ta\' barra.', 'The builders used lime to coat the exterior walls.'),
        ],
        'ġiraff': [
            ('Il-ġiraff jilħaq l-għoli tal-fergħat bl-għonq twil tiegħu.', 'The giraffe reaches the height of the branches with its long neck.'),
            ('Rajna ġiraff fis-safari matul il-vaganzi.', 'We saw a giraffe on safari during the holidays.'),
        ],
        'ġirasol': [
            ('Il-ġirasol dejjem idur lejn ix-xemx matul il-jum.', 'The sunflower always turns towards the sun during the day.'),
            ('Il-ġirasol iż-żejjed joħorġu żrieragħ li jittieklu.', 'Sunflowers produce edible seeds.'),
        ],
        'ġiri': [
            ('Il-ġiri huwa eżerċizzju tajjeb għas-saħħa tal-qalb.', 'Running is good exercise for heart health.'),
        ],
        'ġirja': [
            ('Kull filgħodu huwa jagħmel ġirja ta\' ħames kilometri.', 'Every morning he goes for a run of five kilometres.'),
            ('Ħadna ġirja bir-rota sal-bajja waranofsinhar.', 'We took a ride by bike to the bay in the afternoon.'),
        ],
        'ġisem': [
            ('Huwa importanti li tieħu ħsieb ġisemek b\'ikel tajjeb u eżerċizzju.', 'It is important to look after your body with good food and exercise.'),
            ('Il-ġisem tal-bniedem għandu aktar minn mitejn għadma.', 'The human body has more than two hundred bones.'),
        ],
        'ġiżell': [
            ('L-iskultur uża l-ġiżell biex inaqqax id-dettalji fl-injam.', 'The sculptor used a chisel to carve the details in the wood.'),
        ],
        'ġiżimin': [
            ('Ir-riħa tal-ġiżimin timla l-ġnien kollu.', 'The scent of jasmine fills the whole garden.'),
        ],
        'ġiżirana': [
            ('Ommu libset ġiżirana tad-deheb għall-festa.', 'His mother wore a gold necklace for the feast.'),
            ('Il-ġiżirana tal-perli kienet preżent mill-għarus.', 'The pearl necklace was a gift from her fiancé.'),
        ],
        'ġjaċint': [
            ('Il-ġjaċint jiffjorixxi fir-rebbiegħa u għandu riħa sabiħa.', 'The hyacinth blooms in spring and has a beautiful scent.'),
        ],
        'ġjometra': [
            ('Il-ġjometra kejjel l-angoli tal-bini qabel il-kostruzzjoni.', 'The geometer measured the angles of the building before construction.'),
        ],
        'ġjometrija': [
            ('Il-ġjometrija hija waħda mill-eqdem friegħi tal-matematika.', 'Geometry is one of the oldest branches of mathematics.'),
            ('It-tfal jitgħallmu l-ġjometrija bażika fl-iskola primarja.', 'Children learn basic geometry in primary school.'),
        ],
        'ġjometrikament': [
            ('Il-mudell ġie ddisinjat ġjometrikament b\'preċiżjoni kbira.', 'The pattern was designed geometrically with great precision.'),
        ],
        'ġjometriku': [
            ('L-artist uża disinn ġjometriku fil-mużajk tiegħu.', 'The artist used a geometric design in his mosaic.'),
        ],
        'ġjufija': [
            ('Il-ġjufija tiegħu żammitu milli jiffaċċja l-isfida.', 'His cowardice prevented him from facing the challenge.'),
        ],
        'ġlata': [
            ('Il-ġlata kopriet l-art kollha b\'saff irqiq ta\' silġ.', 'The frost covered the entire ground with a thin layer of ice.'),
            ('Filgħodu kmieni, kien hemm ġlata fuq il-karozzi.', 'Early in the morning, there was frost on the cars.'),
        ],
    }
    return examples_map.get(headword, [])


def fix_text_en(text_en):
    """Fix English text_en to remove semicolons and clean up."""
    if not text_en:
        return text_en
    text_en = text_en.replace(';', '.')
    text_en = re.sub(r'\.\s*\.', '.', text_en)
    return text_en.strip()


def process_entry(raw_line):
    """Process a single JSON line and return the refined JSON string."""
    obj = json.loads(raw_line)

    # Remove _scratchpad
    obj.pop('_scratchpad', None)

    entry = obj.get('entry', obj)
    hw = entry.get('headword', '')
    defs = entry.get('definitions', [])
    pos = entry.get('pos', '')

    # 1. Fill text_mt
    if hw in MT_DEFS:
        mt_defs = MT_DEFS[hw]
        # Expand definitions array if needed
        while len(defs) < len(mt_defs):
            defs.append({
                'text_en': '',
                'text_mt': None,
                'register': '',
                'nuance': '',
            })
        for i, mt_text in enumerate(mt_defs):
            if i < len(defs):
                defs[i]['text_mt'] = clean_semicolons(mt_text)

    # 2. Clean text_en semicolons
    for d in defs:
        if d.get('text_en'):
            d['text_en'] = fix_text_en(d['text_en'])

    # 3. Add usage examples
    examples = build_usage_examples(hw, pos, defs)
    if examples:
        entry['usage_examples'] = [
            {'maltese': mt, 'english': en}
            for mt, en in examples
        ]

    # 4. Validate tags
    validate_and_clean_tags(obj, entry)

    return json.dumps(obj, ensure_ascii=False)


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    # Strip BOM if present
    if content and content[0] == '﻿':
        content = content[1:]

    lines = [l.strip() for l in content.split('\n') if l.strip()]
    stats = {'total': len(lines), 'modified': 0, 'errors': 0}
    results = []

    for i, line in enumerate(lines, 1):
        try:
            processed = process_entry(line)
            results.append(processed)
            stats['modified'] += 1
        except Exception as e:
            print(f"Error processing line {i}: {e}")
            stats['errors'] += 1
            results.append(line)  # keep original

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        for r in results:
            f.write(r + '\n')

    # Print stats as JSON
    print(json.dumps(stats, ensure_ascii=False))
    print(f"\nBatch 033 refinement complete. Output written to: {OUTPUT}")


if __name__ == '__main__':
    main()
