import json, os, re

INPUT = 'c:/Projects/il-migma/wiktionary-scraper/_g_batches/batch_038.jsonl'
OUTPUT = 'c:/Projects/il-migma/wiktionary-scraper/_g_batches/refined/batch_038.jsonl'

APPROVED_TAGS = {
    'common', 'rare', 'archaic', 'neologism', 'purist', 'formal', 'literary',
    'colloquial', 'obsolete', 'technical', 'dialectal', 'gozitan', 'slang',
    'vulgar', 'euphemistic', 'figurative', 'pejorative', 'childish', 'agriculture',
    'anatomy', 'animals', 'architecture', 'art', 'astronomy', 'sea', 'botany',
    'geography', 'food', 'commerce', 'family', 'physics', 'war', 'law',
    'mathematics', 'medicine', 'music', 'politics', 'religion', 'crafts',
    'sports', 'technology', 'weather', 'transport', 'time'
}

# Maltese definitions (text_mt) keyed by entry ID
MT_DEFS = {
    'v-ġġemma': [
        'Iġbor flimkien fi grupp wieħed',
        'Tqabbad ma\' oħrajn biex tifforma grupp'
    ],
    'v-ġġenera': [
        'Oħloq jew iġib il-bidu ta\' xi ħaġa'
    ],
    'v-ġġeneralizza': [
        'Agħti dikjarazzjoni ġenerali minn każijiet partikolari; wasal għal regola ġenerali'
    ],
    'n-ġġeneralizzar': [
        'L-att jew il-proċess li wieħed jiġġeneralizza'
    ],
    'v-ġġeoloġizza': [
        'Istudja l-ġeoloġija ta\' art jew reġjun partikolari'
    ],
    'v-ġġeometrizza': [
        'Ippreżenta xi ħaġa skont il-prinċipji tal-ġeometrija'
    ],
    'v-ġġerra': [
        'Imxi minn post għall-ieħor mingħajr għan fiss'
    ],
    'v-ġġerragħ': [
        'Tweġġa\' jew issirlu ħsara',
        'Tifsira nflessiva: it-tieni persuna singulari imperfett jew it-tielet persuna femminili singulari imperfett ta\' ġerragħ'
    ],
    'v-ġġestikola': [
        'Agħmel movimenti b\'idejk u b\'ġismek biex tesprimi ħsibijiet jew sentimenti'
    ],
    'v-ġġestikula': [
        'Agħmel movimenti b\'idejk u b\'ġismek biex tesprimi ħsibijiet jew sentimenti'
    ],
    'v-ġġieled': [
        'Ipparteċipa f\'ġlieda jew argument ma\' xi ħadd',
        'Ikkumbatti kontra xi ħaġa jew xi ħadd; toqgħod kontra'
    ],
    'v-ġġoggja': [
        'Ġri bil-mod għall-eżerċizzju fiżiku'
    ],
    'v-ġġudika': [
        'Ifforma opinjoni jew deċiżjoni wara li teżamina bir-reqqa'
    ],
    'v-ġġuramenta': [
        'Agħmel wegħda solenni billi ssejjaħ lil Alla jew lil xi ħaġa qaddisa bħala xhud'
    ],
    'n-ġżira': [
        'Biċċa art imdawra bl-ilma minn kull naħa',
        'Ortografija alternattiva ta\' gżira'
    ]
}

# Usage examples keyed by entry ID
EXAMPLES = {
    'v-ġġemma': [
        { 'mt': 'Il-ġemgħa kollha ġġemmgħet fil-pjazza.', 'en': 'The whole crowd gathered in the square.' },
        { 'mt': 'Il-familja kollha tiġġemma\' għall-ikla tal-Milied.', 'en': 'The whole family gathers for Christmas lunch.' },
        { 'mt': 'L-istudenti ġġemmgħu madwar l-għalliem.', 'en': 'The students gathered around the teacher.' }
    ],
    'v-ġġenera': [
        { 'mt': 'Il-programm jiġġenera rapport kull xahar.', 'en': 'The program generates a report every month.' },
        { 'mt': 'L-impjant il-ġdid jiġġenera l-elettriku għall-belt kollha.', 'en': 'The new plant generates electricity for the whole city.' }
    ],
    'v-ġġeneralizza': [
        { 'mt': 'Tista\' tiġġeneralizza minn dawn l-eżempji?', 'en': 'Can you generalise from these examples?' },
        { 'mt': 'Huwa ġġeneralizza wisq meta qal li kulħadd jaħseb hekk.', 'en': 'He oversimplified when he said everyone thinks that way.' }
    ],
    'n-ġġeneralizzar': [
        { 'mt': 'L-ġġeneralizzar ta\' regola mingħajr evidenza huwa perikoluż.', 'en': 'Generalising a rule without evidence is dangerous.' },
        { 'mt': 'Il-ġġeneralizzar xjentifiku jeħtieġ data suffiċjenti.', 'en': 'Scientific generalisation requires sufficient data.' }
    ],
    'v-ġġeoloġizza': [
        { 'mt': 'Ix-xjenzat qatta\' x-xitwa kollha jiġġeoloġizza fid-deżert.', 'en': 'The scientist spent the whole winter geologising in the desert.' },
        { 'mt': 'L-istudenti marru jiġġeoloġizzaw fil-Grand Canyon.', 'en': 'The students went to geologise in the Grand Canyon.' }
    ],
    'v-ġġeometrizza': [
        { 'mt': 'L-artist kien jiġġeometrizza l-forom kollha fix-xogħlijiet tiegħu.', 'en': 'The artist would geometrise all the forms in his works.' },
        { 'mt': 'Il-matematiku ġġeometrizza l-problema qabel ma ssolviha.', 'en': 'The mathematician geometrised the problem before solving it.' }
    ],
    'v-ġġerra': [
        { 'mt': 'Il-kelb ġġerra matul it-toroq kollha tal-belt.', 'en': 'The dog roamed through all the streets of the city.' },
        { 'mt': 'Tħallix lit-tfal jiġġerrdu waħedhom fil-belt.', 'en': 'Do not let the children wander alone in the city.' },
        { 'mt': 'Wara l-iskola, kienu jiġġerrdu fil-kampanja.', 'en': 'After school, they used to roam the countryside.' }
    ],
    'v-ġġerragħ': [
        { 'mt': 'Is-suldat ġġerragħ fil-battalja.', 'en': 'The soldier was wounded in the battle.' },
        { 'mt': 'Oqgħod attent li ma tiġġerragħx bis-sikkina.', 'en': 'Be careful not to get wounded by the knife.' }
    ],
    'v-ġġestikola': [
        { 'mt': 'Kien qed jiġġestikola b\'mod selvaġġ waqt li kien jitkellem.', 'en': 'He was gesticulating wildly while speaking.' },
        { 'mt': 'Minflok ma wieġeb, huwa ġġestikola b\'idejh.', 'en': 'Instead of answering, he gesticulated with his hands.' }
    ],
    'v-ġġestikula': [
        { 'mt': 'Kien qed jiġġestikula b\'mod eċċessiv fuq il-palk.', 'en': 'He was gesticulating excessively on stage.' },
        { 'mt': 'L-attur ġġestikula biex juri r-rabja tiegħu.', 'en': 'The actor gesticulated to show his anger.' }
    ],
    'v-ġġieled': [
        { 'mt': 'Iż-żewġt aħwa ġġieldu għal sigħat shiħ.', 'en': 'The two siblings fought for hours on end.' },
        { 'mt': 'Il-pajjiż ġġieled għall-indipendenza tiegħu.', 'en': 'The country fought for its independence.' },
        { 'mt': 'Huma ġġieldu kontra l-inġustizzja fis-soċjetà.', 'en': 'They fought against injustice in society.' }
    ],
    'v-ġġoggja': [
        { 'mt': 'Jien immur niġġoggja kull filgħodu qabel ix-xogħol.', 'en': 'I go jogging every morning before work.' },
        { 'mt': 'Kienet qed tiġġoggja fil-park meta bdiet ix-xita.', 'en': 'She was jogging in the park when it started raining.' }
    ],
    'v-ġġudika': [
        { 'mt': 'M\'għandekx tiġġudika lin-nies mid-dehra tagħhom.', 'en': 'You should not judge people by their appearance.' },
        { 'mt': 'Il-qorti ġġudikat il-każ wara diversi xhur.', 'en': 'The court judged the case after several months.' },
        { 'mt': 'Huwa diffiċli li tiġġudika sitwazzjoni mingħajr ma tkun taf il-fatti kollha.', 'en': 'It is difficult to judge a situation without knowing all the facts.' }
    ],
    'v-ġġuramenta': [
        { 'mt': 'Huwa ġġuramenta li kien se jgħid il-verità kollha.', 'en': 'He swore that he would tell the whole truth.' },
        { 'mt': 'Il-president ġġuramenta quddiem il-poplu kollu.', 'en': 'The president took an oath before all the people.' }
    ],
    'n-ġżira': [
        { 'mt': 'Malta hija ġżira żgħira fil-Mediterran.', 'en': 'Malta is a small island in the Mediterranean.' },
        { 'mt': 'Il-ġżira ta\' Għawdex hija magħrufa għas-sbuħija naturali tagħha.', 'en': 'The island of Gozo is known for its natural beauty.' }
    ]
}

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

with open(INPUT, 'r', encoding='utf-8') as f:
    raw_text = f.read()
if raw_text.startswith('﻿'):
    raw_text = raw_text[1:]
lines = [l for l in raw_text.split('\n') if l.strip()]

stats = {
    'total': 0,
    'scratchpad_removed': 0,
    'text_mt_filled': 0,
    'examples_added': 0,
    'invalid_tags_removed': 0,
    'redundant_tags_removed': 0,
    'semicolons_split': 0,
    'definitions_expanded': 0
}

output_lines = []

for line in lines:
    obj = json.loads(line)
    entry = obj['entry']
    entry_id = entry['id']
    stats['total'] += 1

    # 1. Remove _scratchpad
    if '_scratchpad' in obj:
        del obj['_scratchpad']
        stats['scratchpad_removed'] += 1

    # 2. Detect and split semicolons in text_en
    definitions = entry.get('definitions', [])
    new_defs = []
    had_semicolons = False
    for defn in definitions:
        text_en = defn.get('text_en', '')
        if ';' in text_en:
            had_semicolons = True
            parts = [p.strip() for p in text_en.split(';') if p.strip()]
            for part in parts:
                part_cap = part[0].upper() + part[1:] if part else part
                new_defs.append({
                    'text_en': part_cap,
                    'text_mt': None,
                    'register': defn.get('register', ''),
                    'nuance': defn.get('nuance', '')
                })
                stats['semicolons_split'] += 1
        else:
            new_defs.append(dict(defn))
    if had_semicolons:
        definitions = new_defs
        entry['definitions'] = definitions

    # 3. Fill text_mt
    mt_list = MT_DEFS.get(entry_id, [])
    if mt_list:
        for i in range(len(definitions)):
            if definitions[i].get('text_mt') is None and i < len(mt_list):
                definitions[i]['text_mt'] = mt_list[i]
                stats['text_mt_filled'] += 1
        # If there are more definitions than mt entries, leave extra as null
        # If there are more mt entries than definitions, we have a mismatch
        if len(mt_list) > len(definitions):
            stats['definitions_expanded'] += len(mt_list) - len(definitions)

    # 4. Add usage examples (1-3 per entry)
    ex_list = EXAMPLES.get(entry_id, [])
    if ex_list:
        examples_out = []
        for ex in ex_list:
            examples_out.append({
                'text_mt': ex['mt'],
                'text_en': ex['en'],
                'register': '',
                'nuance': '',
                'source': None
            })
        entry['usage_examples'] = examples_out
        stats['examples_added'] += len(examples_out)

    # 5. Validate tags - approved list only, remove redundant tags
    valid_tag_ids = set()
    valid_tags = []

    for tag in obj.get('tags', []):
        tag_name = tag.get('name', '').lower().strip()
        # Check if in approved list
        if tag_name in APPROVED_TAGS:
            valid_tag_ids.add(tag['id'])
            valid_tags.append(tag)
        else:
            stats['invalid_tags_removed'] += 1

    # Check for redundant tags: tags that duplicate info already in entry structure
    for tag in list(valid_tags):
        tag_name = tag.get('name', '').lower().strip()
        pos = entry.get('pos')
        gender = entry.get('gender')
        is_loan = entry.get('is_loanword') == 1
        has_root = bool(entry.get('root_consonants'))
        redundant = False

        if tag_name == 'noun' and pos == 'noun':
            redundant = True
        elif tag_name == 'verb' and pos == 'verb':
            redundant = True
        elif tag_name == 'adjective' and pos in ('adjective', 'adj'):
            redundant = True
        elif tag_name == 'adverb' and pos == 'adverb':
            redundant = True
        elif tag_name == 'feminine' and gender == 'feminine':
            redundant = True
        elif tag_name == 'masculine' and gender == 'masculine':
            redundant = True
        elif tag_name == 'loanword' and is_loan:
            redundant = True
        elif tag_name == 'semitic' and has_root:
            redundant = True
        elif tag_name == 'loan' and is_loan:
            redundant = True

        if redundant:
            valid_tag_ids.discard(tag['id'])
            valid_tags = [t for t in valid_tags if t['id'] != tag['id']]
            stats['redundant_tags_removed'] += 1

    obj['tags'] = valid_tags
    obj['entry_tags'] = [et for et in obj.get('entry_tags', []) if et.get('tag_id') in valid_tag_ids]

    output_lines.append(json.dumps(obj, ensure_ascii=False))
    stats['total']

output_text = '\n'.join(output_lines) + '\n'
with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(output_text)

print('=== REFINEMENT STATS ===')
print(f'Total entries processed:  {stats["total"]}')
print(f'Scratchpad removed:       {stats["scratchpad_removed"]}')
print(f'Maltese definitions filled: {stats["text_mt_filled"]}')
print(f'Usage examples added:     {stats["examples_added"]}')
print(f'Semicolons split:         {stats["semicolons_split"]}')
print(f'Invalid tags removed:     {stats["invalid_tags_removed"]}')
print(f'Redundant tags removed:   {stats["redundant_tags_removed"]}')
print(f'Definitions expanded:     {stats["definitions_expanded"]}')
print(f'Output written to:        {OUTPUT}')
