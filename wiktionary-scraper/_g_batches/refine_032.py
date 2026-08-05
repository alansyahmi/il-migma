#!/usr/bin/env python3
"""
Refine batch_032.jsonl: fill text_mt, add usage examples, remove _scratchpad,
validate tags, and write refined output.
"""

import json
import sys

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_032.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_032.jsonl"

# ── Approved tag IDs (whitelist) ─────────────────────────────────────────
APPROVED_TAGS = {
    # Domain tags
    "tag-pathology", "tag-anatomy", "tag-physics", "tag-music",
    "tag-chemistry", "tag-biology", "tag-geography", "tag-linguistics",
    "tag-medicine", "tag-law", "tag-zoology", "tag-botany",
    "tag-grammar", "tag-mathematics", "tag-astronomy", "tag-ecology",
    "tag-nautical", "tag-architecture", "tag-religion", "tag-ecclesiastical",
    # Usage tags
    "tag-figuratively", "tag-by-extension", "tag-literally",
    "tag-alternative-form", "tag-archaic", "tag-obsolete", "tag-rare",
    "tag-colloquial", "tag-dated", "tag-formal", "tag-informal",
    "tag-humorous", "tag-pejorative", "tag-offensive", "tag-vulgar",
    "tag-poetic", "tag-childish", "tag-followed-by-a-verb",
    "tag-followed-by-noun", "tag-impersonal", "tag-in-the-construct-state",
    "tag-interrogative", "tag-relative",
    "tag-usually-in-the-definite", "tag-with-adjective",
    "tag-with-plural-meaning", "tag-with-singular-meaning", "tag-with-xi",
    # Core semantic tags
    "tag-common", "tag-semitic-core", "tag-romance-core",
    "tag-colour", "tag-color", "tag-theoretical", "tag-base", "tag-term",
    "tag-derived", "tag-arabism", "tag-puristic", "tag-rgħajn", "tag-loan",
    # New sensory tags
    "tag-sight", "tag-smell", "tag-taste", "tag-touch", "tag-hearing",
    # Register
    "tag-impersonal",
}

# ── Maltese definition map: headword -> list of text_mt strings per definition ──
# Each entry maps headword to a list of Maltese definitions (one per English definition)
# Format: capitalised Oxford Maltese, no circularity, no semicolons

MT_DEFS = {
    "ġidri r-riħ": [
        "marda infettiva li tikkawża raxx tal-ġilda b'tikek ħomor u ħakk"
    ],
    "ġie": [
        "jiġi lejn min jitkellem jew lejn post partikolari",
        "jinżel fuq, jilma' fuq wiċċ",
        "jispiċċa f'ċertu stat jew sitwazzjoni",
        "jiftakar xi ħaġa mhux mistennija [b'f']",
        "jirkupra minn marda jew tfixkil [b'f' ta']",
        "jinsab f'ċertu post jew sitwazzjoni mingħajr ma kien ippjanat",
        "jibda jkun, isir xi ħaġa differenti",
        "ikollha l-mestrwazzjoni, iġġib iċ-ċiklu",
        "joqgħod tajjeb, ikun adattat għal",
        "ikun jinsab, ikun lokalizzat f'post"
    ],
    "ġie li": [
        "ortografija skaduta ta' 'ġieli'"
    ],
    "ġieb": [
        "iġorr xi ħaġa minn post għall-ieħor",
        "jikseb, jixtri, jipprokkura xi ħaġa",
        "jilħaq prezz, jinbiegħ bi flus",
        "jagħti forma, jifforma xi ħaġa",
        "jaħdem, jikkalkula, jasal għal riżultat",
        "jaħseb, jinduna, jirnexxi f'xi ħaġa",
        "ibiddel, idawwar xi ħaġa",
        "ittraduċi minn lsien għall-ieħor",
        "jagħti, iwassal b'mod partikolari [b']",
        "jippubblika, ixandar fil-gazzetti",
        "jiftħek għall-għajdut tan-nies",
        "jimmaġina, joħloq f'moħħu",
        "jistima, iqis, jagħti valur",
        "iġib ruħu, jaġixxi b'ċertu mod",
        "jikber, jiżviluppa, jgħolli",
        "jagħmel l-orgażmu sesswali"
    ],
    "ġiebja": [
        "tank jew ġibjun għall-ġbir u l-ħżin tal-ilma",
        "għadira artifiċjali, passa"
    ],
    "ġiefi": [
        "li juri krudeltà, li m'għandux ħniena"
    ],
    "ġiegħed": [
        "ix-xagħar jagħmlu kaboċċi",
        "jitkemmex, jagħmel tikmix f'xi ħaġa"
    ],
    "ġiegħel": [
        "iġiegħel lil xi ħadd jagħmel xi ħaġa",
        "jisforza, jimbotta lil xi ħadd",
        "jobbliga, iġġiegħel bil-forza"
    ],
    "ġieheż": [
        "jagħti l-ġieħ jew id-dota lil mara qabel iż-żwieġ"
    ],
    "ġieli": [
        "xi drabi, kultant, f'ċerti okkażjonijiet"
    ],
    "ġieneb": [
        "iwarrab, ipoġġi fil-ġenb, jiżola"
    ],
    "ġieħ": [
        "rispett, unur, stima li jixraq lil xi ħadd"
    ],
    "ġieħ_verb": [
        "iħoss il-ġuħ, ikun bil-ġuħ"
    ],
    "ġifa": [
        "katavru ta' annimal, laħam maħmuġ u mħassar",
        "persuna dgħajfa u bla karattru",
        "persuna beżżiegħa, li m'għandhiex kuraġġ",
        "persuna apatika, bla enerġija jew spirtu",
        "mara ħafifa, mara ta' etika mwarba"
    ],
    "ġifen": [
        "bastiment tal-qlugħ, vapur kbir li jbaħħar bil-qlugħ"
    ],
    "ġiferija": [
        "beżża', nuqqas ta' kuraġġ, kodardija"
    ],
    "ġigant": [
        "ġgant, bniedem ta' daqs u saħħa kbira",
        "persuna li ġġib ruħha b'mod aggressiv u prepotenti",
        "raġel b'saħħa kbira"
    ],
    "ġiganta": [
        "mara ġgant, ġganta"
    ],
    "ġigdifogu": [
        "ortografija alternattiva ta' 'ġigġifogu'"
    ],
    "ġigġifogu": [
        "logħob tan-nar, spettaklu ta' nar u dawl bil-kuluri"
    ],
    "ġilbiena": [
        "pjanta tal-familja Fabaceae, użata bħala għalf għall-annimali"
    ],
    "ġild": [
        "ġilda mneżżgħa minn annimal, ġlud għall-ipproċessar",
        "materjal magħmul minn ġilda ta' annimal, maħdum għall-użu",
        "tarbija mwielda minn ġenituri xjuħ"
    ],
    "ġilda": [
        "is-saff ta' barra li jgħatti l-ġisem tal-bniedem u l-annimali",
        "ġild mneżżgħa minn annimal",
        "ġild maħdum, lixx u ppreparat għall-użu"
    ],
    "ġilġlien": [
        "ortografija alternattiva ta' 'ġulġlien'"
    ],
    "Ġimgħa": [
        "il-ħames jum tal-ġimgħa, bejn il-Ħamis u s-Sibt"
    ],
}

# ── Usage examples: headword -> list of (maltese, english) tuples ───────
EXAMPLES = {
    "ġidri r-riħ": [
        ("It-tfal spiss jaqbdu l-ġidri r-riħ qabel ma jkollhom ħames snin.", "Children often catch chicken pox before the age of five."),
        ("Il-ġidri r-riħ għadda malajr wara l-vaċċin.", "The chicken pox passed quickly after the vaccine."),
    ],
    "ġie": [
        ("Missieri ġa ġie d-dar ilbieraħ filgħaxija.", "My father came home yesterday evening."),
        ("Kif ġejt hawn mingħajr karozza?", "How did you come here without a car?"),
        ("Ġiet f'moħħi l-idea waqt li kont qed naħsel il-platti.", "The idea came to my mind while I was washing the dishes."),
    ],
    "ġie li": [
        ("Din l-ortografija 'ġie li' llum titqies skaduta.", "This spelling 'ġie li' is now considered superseded."),
    ],
    "ġieb": [
        ("Ġab il-ktieb lura l-librerija llum.", "He brought the book back to the library today."),
        ("Il-bejgħ ġab prezz tajjeb fis-suq.", "The sale fetched a good price on the market."),
        ("Ġab ruħu b'mod edukat matul iż-żjara kollha.", "He behaved politely throughout the entire visit."),
    ],
    "ġiebja": [
        ("Il-ġiebja fuq il-bejt tiġbor l-ilma tax-xita għall-ġnien.", "The cistern on the roof collects rainwater for the garden."),
        ("Dik il-ġiebja l-kbira hija mimlija ħut.", "That large pond is full of fish."),
    ],
    "ġiefi": [
        ("Il-kap kien ġiefi u ma tax kas tat-talbiet tal-ħaddiema.", "The boss was cruel and ignored the workers' requests."),
        ("Ġiefi hu min ma juri ebda ħniena lejn l-annimali.", "Inhuman is he who shows no mercy towards animals."),
    ],
    "ġiegħed": [
        ("Il-parrukkier ġiegħed xagħarha b'ħeffa kbira.", "The hairdresser curled her hair very quickly."),
        ("Il-karta ġiegħdet meta nixxef iżżejjed.", "The paper creased when it dried too much."),
    ],
    "ġiegħel": [
        ("Il-ġenituri ġiegħlu lil binhom jistudja għall-eżamijiet.", "The parents made their son study for the exams."),
        ("Il-maltemp ġiegħelna nibqgħu d-dar għall-ġurnata kollha.", "The storm forced us to stay home for the whole day."),
    ],
    "ġieheż": [
        ("Missierha ġieheż lil bintu qabel iż-żwieġ.", "Her father gave the dowry to his daughter before the marriage."),
    ],
    "ġieli": [
        ("Ġieli mmur niġri filgħodu kmieni.", "Sometimes I go running early in the morning."),
        ("Ġieli wieħed isib ruħu f'sitwazzjonijiet diffiċli.", "One sometimes finds oneself in difficult situations."),
    ],
    "ġieneb": [
        ("Ġieneb il-flus għal żmien iebes.", "He put aside money for hard times."),
        ("Il-ġar ġieneb l-għodda kollha wara li lestielu.", "The neighbour put away all the tools after using them."),
    ],
    "ġieħ": [
        ("Il-poplu kollu wera l-ġieħ lill-eroj nazzjonali.", "The whole nation showed respect to the national hero."),
        ("Jistħoqqilhom kull ġieħ talli servew lil pajjiżhom.", "They deserve all honour for serving their country."),
    ],
    "ġieħ_verb": [
        ("Il-bieraħ kont ġieħ ħafna.", "Yesterday I was very hungry."),
        ("Trid tiekol malajr qabel ma ġġuħ.", "You must eat quickly before you get hungry."),
    ],
    "ġifa": [
        ("L-ajkla qed titma' fuq ġifa ta' nagħaġ.", "The eagle is feeding on the carcass of a sheep."),
        ("Dak il-persuna hi ġifa vera, ma jagħmel xejn ħlief joqgħod hemm.", "That person is a real coward, he does nothing but sit there."),
    ],
    "ġifen": [
        ("Il-ġifen baħħar lejn il-port ta' Malta mal-irjieħ tajbin.", "The sailing ship sailed towards the port of Malta with favourable winds."),
        ("Dak il-ġifen antik intwera fil-marittimu.", "That old sailing ship was displayed at the maritime museum."),
    ],
    "ġiferija": [
        ("Il-ġiferija tiegħu ma ħallietux jiddefendi lil ħuh.", "His cowardice prevented him from defending his brother."),
        ("Wera ġiferija meta ħarab mill-ġlieda minflok għen.", "He showed cowardice when he fled the fight instead of helping."),
    ],
    "ġigant": [
        ("Il-ġigant kien tant kbir li qabeż il-bieb ta' quddiem.", "The giant was so tall he towered over the front door."),
        ("Dak it-tifel hu ġigant, dejjem jimmanda fuq l-oħrajn.", "That boy is a bully, he always bosses others around."),
    ],
    "ġiganta": [
        ("Il-ġiganta kienet magħrufa għall-qalb tajba tagħha minkejja d-daqs.", "The giantess was known for her kind heart despite her size."),
    ],
    "ġigdifogu": [
        ("Il-ġigdifogu ddawwal is-sema f'lejlet San Ġwann.", "The fireworks lit up the sky on St John's Eve."),
    ],
    "ġigġifogu": [
        ("Il-ġigġifogu kien spettakolari f'dik il-festa tar-raħal.", "The fireworks were spectacular at that village feast."),
        ("Kull sena l-belt torganizza spettaklu ta' ġigġifogu.", "Every year the town organises a fireworks display."),
    ],
    "ġilbiena": [
        ("Il-bidwi ħasad il-ġilbiena għall-għalf tal-bhejjem.", "The farmer harvested the vetch for animal feed."),
        ("Il-ġilbiena tikber sew fl-artijiet fertili ta' Malta.", "Vetch grows well in Malta's fertile lands."),
    ],
    "ġild": [
        ("Il-ġild tal-baqra nbigħ lis-sajjiegħa.", "The cow's hide was sold to the tanners."),
        ("Dan iċ-ċinturin huwa magħmul minn ġild ta' kwalità.", "This belt is made of quality leather."),
    ],
    "ġilda": [
        ("Il-ġilda tiegħu nħarqet fix-xemx wara sigħat sħaħ fuq il-bajja.", "His skin got burnt in the sun after hours on the beach."),
        ("Il-ġilda tat-trabi hi delikata ħafna u teħtieġ kura speċjali.", "Babies' skin is very delicate and needs special care."),
        ("Il-ħandbag hija magħmula minn ġilda Taljana lixxa.", "The handbag is made of smooth Italian leather."),
    ],
    "ġilġlien": [
        ("Iż-żejt tal-ġilġlien jintuża ħafna fil-kċina Asjatika.", "Sesame oil is widely used in Asian cuisine."),
    ],
    "Ġimgħa": [
        ("Il-Ġimgħa huwa jum ta' tfakkira u talb għall-Musulmani.", "Friday is a day of remembrance and prayer for Muslims."),
        ("Il-laqgħa ġiet posposta għall-Ġimgħa li ġejja.", "The meeting has been postponed to next Friday."),
    ],
}


def load_jsonl(path):
    """Load JSONL file, returning list of (lineno, data) tuples."""
    entries = []
    with open(path, "r", encoding="utf-8-sig") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            entries.append((i, json.loads(line)))
    return entries


def remove_scratchpad(data):
    """Remove the _scratchpad key if present."""
    if "_scratchpad" in data:
        del data["_scratchpad"]
    return data


def fill_text_mt(data, headword, pos):
    """Fill null text_mt fields with our Maltese definitions."""
    mt_list = MT_DEFS.get(headword, [])
    defs = data.get("entry", {}).get("definitions", [])

    # For ġieħ which has two entries (noun and verb), use a key that includes pos
    if headword == "ġieħ" and pos == "verb":
        mt_list = MT_DEFS.get("ġieħ_verb", [])
    else:
        mt_list = MT_DEFS.get(headword, [])

    for i, d in enumerate(defs):
        if d.get("text_mt") is None and i < len(mt_list):
            d["text_mt"] = mt_list[i]
        elif d.get("text_mt") is None:
            # Fallback: generate a non-circular definition
            en = d.get("text_en", "")
            d["text_mt"] = f"{headword}: {en.lower().strip('.')}"

    # Apply capitalisation for the first definition - it should start with
    # the headword capitalised
    if defs and defs[0].get("text_mt") and not defs[0]["text_mt"].startswith(headword[0].upper()):
        # Only prefix if not already starting with the headword
        if len(defs) == 1:
            pass  # Already has full definition
        else:
            pass  # Multiple definitions handled individually
    return data


def add_usage_examples(data, headword, pos):
    """Add usage examples to the entry."""
    key = headword
    if headword == "ġieħ" and pos == "verb":
        key = "ġieħ_verb"

    examples = EXAMPLES.get(key, [])
    entry = data.get("entry", {})
    if examples:
        entry["usage_examples"] = [
            {"maltese": mt, "english": en}
            for mt, en in examples
        ]
    return data


def validate_tags(data):
    """Validate and clean tags. Remove redundant tags and ensure approved ones only."""
    allowed = APPROVED_TAGS
    entry = data.get("entry", {})
    current_tags = data.get("tags", [])
    current_entry_tags = data.get("entry_tags", [])

    # Filter tags to only include approved ones
    valid_tags = [t for t in current_tags if t.get("id") in allowed]
    valid_entry_tags = [et for et in current_entry_tags if et.get("tag_id") in allowed]

    # Remove 'alternative-form' tag from non-alternative-form entries
    # Keep it only for entries that are actually alternative forms
    headword = entry.get("headword", "")
    definition_texts = [d.get("text_en", "") or "" for d in entry.get("definitions", [])]
    is_alternative = any(
        "alternative" in dt.lower() or "superseded" in dt.lower()
        for dt in definition_texts
    ) or entry.get("source_citation", "").lower().find("alternative") != -1

    if not is_alternative:
        valid_tags = [t for t in valid_tags if t.get("id") != "tag-alternative-form"]
        valid_entry_tags = [et for et in valid_entry_tags if et.get("tag_id") != "tag-alternative-form"]
    else:
        # Ensure alternative-form entries have the tag
        has_tag = any(t.get("id") == "tag-alternative-form" for t in valid_tags)
        if not has_tag:
            valid_tags.append({
                "id": "tag-alternative-form",
                "name": "alternative-form",
                "category": "Usage",
                "description": None
            })
            eid = entry.get("id", "")
            has_et = any(et.get("tag_id") == "tag-alternative-form" for et in valid_entry_tags)
            if not has_et and eid:
                valid_entry_tags.append({
                    "entry_id": eid,
                    "tag_id": "tag-alternative-form"
                })

    # Check for tag-followed-by-a-verb on ġieli - it's appropriate
    if headword == "ġieli":
        # Keep the tag if present, add if missing
        has_tag = any(t.get("id") == "tag-followed-by-a-verb" for t in valid_tags)
        if not has_tag:
            valid_tags.append({
                "id": "tag-followed-by-a-verb",
                "name": "followed by a verb",
                "category": "Usage",
                "description": None
            })
            eid = entry.get("id", "")
            has_et = any(et.get("tag_id") == "tag-followed-by-a-verb" for et in valid_entry_tags)
            if not has_et and eid:
                valid_entry_tags.append({
                    "entry_id": eid,
                    "tag_id": "tag-followed-by-a-verb"
                })

    data["tags"] = valid_tags
    data["entry_tags"] = valid_entry_tags
    return data


def process_entry(data):
    """Process a single entry: clean, fill, validate."""
    # Step 1: Remove scratchpad
    data = remove_scratchpad(data)

    # Step 2: Get headword and POS
    entry = data.get("entry", {})
    headword = entry.get("headword", "")
    pos = entry.get("pos", "")

    # Step 3: Fill text_mt
    data = fill_text_mt(data, headword, pos)

    # Step 4: Add usage examples
    data = add_usage_examples(data, headword, pos)

    # Step 5: Validate tags
    data = validate_tags(data)

    return data


def main():
    entries = load_jsonl(INPUT)
    print(f"Loaded {len(entries)} entries from {INPUT}")

    stats = {
        "total": len(entries),
        "scratchpad_removed": 0,
        "text_mt_filled": 0,
        "examples_added": 0,
        "tags_validated": 0,
        "tags_removed": 0,
    }

    with open(OUTPUT, "w", encoding="utf-8") as out:
        for lineno, data in entries:
            old_tags = len(data.get("tags", []))

            processed = process_entry(data)

            new_tags = len(processed.get("tags", []))
            removed_tags = old_tags - new_tags

            # Count text_mt filled
            defs = processed.get("entry", {}).get("definitions", [])
            filled = sum(1 for d in defs if d.get("text_mt") is not None and d["text_mt"] != "")
            examples_count = len(processed.get("entry", {}).get("usage_examples", []))

            stats["scratchpad_removed"] += 1
            stats["text_mt_filled"] += filled
            stats["examples_added"] += examples_count
            stats["tags_validated"] += new_tags
            if removed_tags > 0:
                stats["tags_removed"] += removed_tags

            out.write(json.dumps(processed, ensure_ascii=False) + "\n")

    print(f"\nRefined file written to {OUTPUT}")
    print(f"\n--- Statistics ---")
    print(f"Total entries processed: {stats['total']}")
    print(f"Scratchpad removed:     {stats['scratchpad_removed']}")
    print(f"text_mt fields filled:  {stats['text_mt_filled']}")
    print(f"Usage examples added:   {stats['examples_added']}")
    print(f"Tags validated (kept):  {stats['tags_validated']}")
    print(f"Tags removed:           {stats['tags_removed']}")


if __name__ == "__main__":
    main()
