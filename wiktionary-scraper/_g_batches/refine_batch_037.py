#!/usr/bin/env python3
"""Refine batch_037.jsonl entries with proper Maltese definitions, usage examples, and tag validation."""

import json
import os
import copy

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_037.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_037.jsonl"

APPROVED_TAGS = {
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time",
}

# =========================================================================
# Maltese definitions (text_mt) by entry_id, indexed by definition index
# Oxford-style: capitalised, no circularity, no semicolons
# =========================================================================
TEXT_MT = {
    "n-ġurun": [
        "Biċċa drapp jew materjal ieħor użat bħala parti minn libsa jew ħjata.",
    ],
    "adj-ġust": [
        "Li hu skont il-ġustizzja u l-liġi.",
        "Li hu ġust u onest.",
    ],
    "n-ġustizzja": [
        "Il-prinċipju li kulħadd jingħata dak li jistħoqqlu skont il-liġi.",
        "Is-sistema ta' liġijiet u istituzzjonijiet li jamministraw il-liġi.",
        "Il-fergħa tal-gvern li tinterpreta u tamministra l-liġi.",
    ],
    "n-ġuvni": [
        "Raġel żgħir fl-età, adult żagħżugħ.",
        "Tifel jew adolexxent ta' sess maskili.",
        "Tifel żgħir, speċjalment wieħed ferrieħi.",
    ],
    "n-ġuvnott": [
        "Tifel jew żagħżugħ żgħir.",
    ],
    "n-ġuġun": [
        "Ortografija alternattiva ta' 'ġuġù': ħelu żgħir magħmul taz-zokkor.",
    ],
    "n-ġuġù": [
        "Ħelu żgħir magħmul taz-zokkor, ħafna drabi b'togħmiet differenti tal-frott.",
    ],
    "n-ġuħ": [
        "Xewqa qawwija li tiekol minħabba li l-istonku jkun vojt.",
        "Nuqqas ta' mezzi materjali, faqar estrem.",
    ],
    "n-ġwann": [
        "Isem propju maskili, ekwivalenti għall-Ingliż John.",
    ],
    "n-ġwanni": [
        "Ortografija alternattiva ta' 'Ġwann': isem propju maskili.",
    ],
    "adj-ġwejdi": [
        "Li juri umiltà, li ma jiftaħarx b'ħilietu jew b'ġidu.",
    ],
    "n-ġwejferija": [
        "Nuqqas ta' kuraġġ, biża' eċċessiv quddiem il-periklu jew l-isfidi.",
    ],
    "adj-ġwejjed": [
        "Li ma jitkellimx ħafna, li huwa kwiet u kalm fin-natura tiegħu.",
    ],
    "adj-ġwejjef": [
        "Li faċilment jibża' jew jintimidaw, li m'għandux kunfidenza fih innifsu.",
    ],
    "n-ġwejjef": [
        "Plural ta' 'ġifa': fjuri.",
    ],
    "n-ġwejnaħ": [
        "Dinimuttiv ta' 'ġewnaħ': ġewnaħ żgħir.",
    ],
    "n-ġwejżaq": [
        "Dinimuttiv ta' 'ġewżaq': ġewżaq żgħir.",
    ],
    "n-ġwież": [
        "Għalf għall-annimali, bħal tiben jew ħaxix niexef.",
        "Plural ta' 'ġewż': frotta ta' siġra tal-ġewż.",
    ],
    "v-ġġakbina": [
        "Qarraq b'xi ħadd billi tah informazzjoni falza.",
    ],
    "v-ġġakkja": [
        "Rifes vettura billi uża ġakk biex ibiddel tajer.",
    ],
    "v-ġġammja": [
        "Waħħal xi ħaġa f'post dejjaq b'mod li ma tistax tiċċaqlaq.",
        "Fixkel sinjal tar-radju jew tat-televiżjoni billi trażmetti sinjal ieħor.",
    ],
    "v-ġġebbed": [
        "Il-forma mediopassiva ta' 'ġebbed': infirex jew twal.",
        "Iddiskuta l-prezz ma' bejjiegħ biex jikseb prezz orħos.",
        "Inflessjoni ta' 'ġebbed': it-tieni persuna singular imperfett jew it-tielet persuna femminili singular imperfett.",
    ],
    "v-ġġebbes": [
        "Il-forma mediopassiva ta' 'ġebbes': sar imqadded jew imfarrad.",
        "Inflessjoni ta' 'ġebbes': it-tieni persuna singular imperfett jew it-tielet persuna femminili singular imperfett.",
    ],
    "v-ġġela": [
        "Għatta b'saff ta' ġelat jew kisi ħelu fuq kejk jew deżerta.",
        "Bidlu f'solidu b'sħana baxxa, sar silġ.",
    ],
    "v-ġġemina": [
        "Irripeta ħoss biex tagħmel konsonanti doppja fil-pronunzja.",
    ],
}

# =========================================================================
# Usage examples by entry_id: list of {text_mt, text_en} pairs
# =========================================================================
EXAMPLES = {
    "n-ġurun": [
        {"text_mt": "Il-ħajjiet qatgħet ġurun drapp għall-libsa l-ġdida.", "text_en": "The seamstress cut a panel of fabric for the new dress."},
        {"text_mt": "Dawn il-ġurun tal-ħarir huma delikati ħafna.", "text_en": "These silk panels are very delicate."},
    ],
    "adj-ġust": [
        {"text_mt": "L-imħallef kien ġust fid-deċiżjoni tiegħu.", "text_en": "The judge was just in his decision."},
        {"text_mt": "Mhux ġust li tittratta lin-nies b'mod differenti.", "text_en": "It is not fair to treat people differently."},
    ],
    "n-ġustizzja": [
        {"text_mt": "Il-ġustizzja hi l-pedament ta' soċjetà ċivilizzata.", "text_en": "Justice is the foundation of a civilised society."},
        {"text_mt": "Il-qorti twettaq il-ġustizzja b'mod indipendenti.", "text_en": "The court administers justice independently."},
        {"text_mt": "Is-sistema tal-ġustizzja trid tkun aċċessibbli għal kulħadd.", "text_en": "The justice system must be accessible to everyone."},
    ],
    "n-ġuvni": [
        {"text_mt": "Dak il-ġuvni għadu żgħir wisq biex imur il-każin.", "text_en": "That young man is still too young to go to the club."},
        {"text_mt": "Il-ġuvintur tal-lum għandhom ħafna opportunitajiet.", "text_en": "Today's youths have many opportunities."},
        {"text_mt": "Kien ġuvni sabiħ u edukat li kien jogħġob lil kulħadd.", "text_en": "He was a handsome, well-mannered lad who pleased everyone."},
    ],
    "n-ġuvnott": [
        {"text_mt": "Il-ġuvnott lagħab fit-triq ma' sħabu.", "text_en": "The lad played in the street with his friends."},
        {"text_mt": "Ara kif jikber dan il-ġuvnott!", "text_en": "Look how this boy is growing up!"},
    ],
    "n-ġuġun": [
        {"text_mt": "Ixtri ftit ġuġun mit-tabakka.", "text_en": "Buy some sweets from the tobacconist."},
    ],
    "n-ġuġù": [
        {"text_mt": "It-tfal iħobbu l-ġuġù.", "text_en": "Children love sweets."},
        {"text_mt": "Ġuġù jinstab fil-ħwienet tal-ħelu u t-tabakk.", "text_en": "Sweets are found in confectionery shops and tobacconists."},
    ],
    "n-ġuħ": [
        {"text_mt": "Wara l-vjaġġ kollu, ħassejt ġuħ qawwi.", "text_en": "After the whole journey, I felt intense hunger."},
        {"text_mt": "Ħafna nies ibatu l-ġuħ f'pajjiżi li għadhom qed jiżviluppaw.", "text_en": "Many people suffer from hunger in developing countries."},
        {"text_mt": "Il-ġuħ hu problema serja f'ħafna partijiet tad-dinja.", "text_en": "Hunger is a serious problem in many parts of the world."},
    ],
    "n-ġwann": [
        {"text_mt": "Ġwann huwa isem komuni ħafna f'Malta.", "text_en": "John is a very common name in Malta."},
        {"text_mt": "Is-Sur Ġwann Borg għandu ħanut fil-belt.", "text_en": "Mr John Borg has a shop in Valletta."},
    ],
    "n-ġwanni": [
        {"text_mt": "Ġwanni ġie mistieden għall-festa tar-raħal.", "text_en": "John was invited to the village feast."},
    ],
    "adj-ġwejdi": [
        {"text_mt": "Huwa raġel ġwejdi u kwiet.", "text_en": "He is a modest and quiet man."},
        {"text_mt": "Il-ħwejjeġ tagħha kienu ġwejdin u sempliċi.", "text_en": "Her clothes were modest and simple."},
    ],
    "n-ġwejferija": [
        {"text_mt": "Il-ġwejferija mhix kwalità ammirevoli f'suldat.", "text_en": "Cowardice is not an admirable quality in a soldier."},
        {"text_mt": "Ġwejferija hi li taħrab mill-problemi minflok tiffaċċjahom.", "text_en": "Cowardice is running away from problems instead of facing them."},
    ],
    "adj-ġwejjed": [
        {"text_mt": "Huwa tifel ġwejjed u edukat.", "text_en": "He is a quiet and well-mannered boy."},
        {"text_mt": "Il-viċin tagħna huwa raġel ġwejjed li dejjem iżomm għalih.", "text_en": "Our neighbour is a quiet man who always keeps to himself."},
    ],
    "adj-ġwejjef": [
        {"text_mt": "It-tifel kien ġwejjef u ma kellux ħbieb.", "text_en": "The boy was timid and had no friends."},
        {"text_mt": "L-annimal kien ġwejjef u ħarab minn quddiemna.", "text_en": "The animal was timid and ran away from us."},
    ],
    "n-ġwejjef": [
        {"text_mt": "Dawn il-ġwejjef huma sbieħ ħafna.", "text_en": "These flowers are very beautiful."},
    ],
    "n-ġwejnaħ": [
        {"text_mt": "L-għasfur kellu ġwejnaħ miksur.", "text_en": "The bird had a small broken wing."},
    ],
    "n-ġwejżaq": [
        {"text_mt": "Il-qattus kien ġwejżaq ċkejken u ferrieħi.", "text_en": "The kitten was tiny and playful."},
    ],
    "n-ġwież": [
        {"text_mt": "Il-bidwi ħa l-ġwież biex jitma' l-bhejjem.", "text_en": "The farmer took the fodder to feed the livestock."},
        {"text_mt": "Il-ġwież huwa importanti għan-nutrizzjoni tal-annimali.", "text_en": "Fodder is important for animal nutrition."},
    ],
    "v-ġġakbina": [
        {"text_mt": "Huwa ġġakbina lill-ħbieb tiegħu biex jieħu l-flus.", "text_en": "He deceived his friends to take the money."},
        {"text_mt": "Tippruvax tgħaġġakbina bil-qerq tiegħek.", "text_en": "Do not try to deceive us with your trickery."},
    ],
    "v-ġġakkja": [
        {"text_mt": "Ġġakkja l-karozza biex ibiddel it-tajer.", "text_en": "He jacked up the car to change the tyre."},
        {"text_mt": "Jeħtieġ li tgħaġġakkja l-vettura qabel tibda tiswija.", "text_en": "You need to jack up the vehicle before starting repairs."},
    ],
    "v-ġġammja": [
        {"text_mt": "Il-karta ġġammjat fil-printer u waqfet taħdem.", "text_en": "The paper jammed in the printer and stopped working."},
        {"text_mt": "Huma ġġammjaw is-sinjal tar-radju matul il-kriżi.", "text_en": "They jammed the radio signal during the crisis."},
    ],
    "v-ġġebbed": [
        {"text_mt": "Iż-żewġ naħat bdew jitgħaġġebdu fuq il-prezz tal-art.", "text_en": "The two sides began haggling over the price of the land."},
        {"text_mt": "Is-suq Malti huwa post fejn in-nies jitgħaġġebdu.", "text_en": "The Maltese market is a place where people haggle."},
    ],
    "v-ġġebbes": [
        {"text_mt": "Il-ġobon ġġebbes fix-xemx.", "text_en": "The cheese dried up in the sun."},
    ],
    "v-ġġela": [
        {"text_mt": "Il-kok ġġela l-kejk bil-krema.", "text_en": "The chef iced the cake with cream."},
        {"text_mt": "L-ilma ġġela fil-friża matul il-lejl.", "text_en": "The water froze in the freezer overnight."},
    ],
    "v-ġġemina": [
        {"text_mt": "Fil-Malti, xi konsonanti jiġġeminaw f'ċerti pożizzjonijiet.", "text_en": "In Maltese, some consonants geminate in certain positions."},
        {"text_mt": "Il-lingwisti jistudjaw kif il-konsonanti jiġġeminaw.", "text_en": "Linguists study how consonants geminate."},
    ],
}


def validate_tags(entry, top_tags, top_entry_tags):
    """Remove tags not in APPROVED_TAGS. Remove redundant tags based on entry fields.
    Tags are at the top level of the JSON obj, not inside entry.
    """
    old_tags = top_tags
    old_entry_tags = top_entry_tags

    # Build set of approved tag names and filter
    valid_tag_ids = set()
    new_tags = []
    for tag in old_tags:
        if tag.get("name") in APPROVED_TAGS:
            new_tags.append(tag)
            valid_tag_ids.add(tag["id"])

    # Filter entry_tags to only those that reference approved tags
    new_entry_tags = [et for et in old_entry_tags if et.get("tag_id") in valid_tag_ids]

    # Apply redundancy rules
    pos = entry.get("pos")
    is_loanword = entry.get("is_loanword", 0)
    gender = entry.get("gender")
    root_cons = entry.get("root_consonants")

    filtered_tags = []
    filtered_tag_ids = set()
    for tag in new_tags:
        tag_name = tag.get("name", "").lower()
        tag_id = tag.get("id", "")

        # Skip redundant tags
        if pos == "noun" and tag_name in ("noun",):
            continue
        if is_loanword == 1 and tag_name in ("loanword", "loan"):
            continue
        if gender and gender == "feminine" and tag_name in ("feminine",):
            continue
        if root_cons and tag_name in ("semitic",):
            continue

        filtered_tags.append(tag)
        filtered_tag_ids.add(tag_id)

    # Filter entry_tags again
    filtered_entry_tags = [et for et in new_entry_tags if et.get("tag_id") in filtered_tag_ids]

    return filtered_tags, filtered_entry_tags


def fix_broken_defs(definitions):
    """Fix broken definitions split across entries (parenthetical continuations)."""
    if not definitions:
        return definitions

    result = []
    i = 0
    while i < len(definitions):
        d = definitions[i]
        text_en = d.get("text_en", "").strip()

        # Check for unclosed parentheses continuing to next def
        if (text_en.count("(") > text_en.count(")") and i + 1 < len(definitions)):
            next_text = definitions[i + 1].get("text_en", "").strip()
            # Merge the two: current + next
            merged_en = text_en + " " + next_text
            # Clean up: fix misplaced close-paren
            merged_en = merged_en.replace("( ", "(").replace(" )", ")").replace(" .", ".")
            # Remove multiple spaces
            while "  " in merged_en:
                merged_en = merged_en.replace("  ", " ")
            d = dict(d)
            d["text_en"] = merged_en
            i += 1  # Skip next

        result.append(d)
        i += 1

    return result


def split_semicolons(definitions):
    """Split definitions on semicolons into separate definitions."""
    result = []
    for d in definitions:
        text_en = d.get("text_en", "")
        text_mt = d.get("text_mt", "")

        has_semicolon_en = ";" in text_en
        has_semicolon_mt = text_mt and ";" in text_mt

        if has_semicolon_en or has_semicolon_mt:
            if has_semicolon_en:
                en_parts = [p.strip() for p in text_en.split(";") if p.strip()]
            else:
                en_parts = [text_en.strip()]

            if text_mt and ";" in text_mt:
                mt_parts = [p.strip() for p in text_mt.split(";") if p.strip()]
            else:
                mt_parts = [text_mt] if text_mt else [""]

            # Ensure equal length
            max_len = max(len(en_parts), len(mt_parts))
            while len(en_parts) < max_len:
                en_parts.append(en_parts[-1])
            while len(mt_parts) < max_len:
                mt_parts.append(mt_parts[-1])

            for i in range(max_len):
                new_d = dict(d)
                en_text = en_parts[i].rstrip(",").strip()
                mt_text = mt_parts[i].rstrip(",").strip() if mt_parts[i] else ""

                # Capitalise first letter
                if en_text and not en_text[0].isupper():
                    en_text = en_text[0].upper() + en_text[1:]

                new_d["text_en"] = en_text
                new_d["text_mt"] = mt_text if mt_text else en_text
                result.append(new_d)
        else:
            result.append(d)

    return result


def capitalise_defs(definitions):
    """Ensure text_en starts with capital letter."""
    for d in definitions:
        text_en = d.get("text_en", "")
        if text_en and not text_en[0].isupper():
            d["text_en"] = text_en[0].upper() + text_en[1:]


def process_entry(entry_id, entry, tags, entry_tags):
    """Apply all refinements to a single entry."""

    # 1. Fill text_mt definitions
    if entry_id in TEXT_MT:
        mt_defs = TEXT_MT[entry_id]
        definitions = entry.get("definitions", [])
        for i, d in enumerate(definitions):
            if i < len(mt_defs):
                d["text_mt"] = mt_defs[i]

    # 2. Check for semicolons and split (must happen before fixing capitalisation for specific entries)
    defs = entry.get("definitions", [])
    defs = split_semicolons(defs)
    entry["definitions"] = defs

    # 3. Entry-specific fixes for broken definitions
    if entry_id == "adj-ġust":
        # The original source split "just (in accordance with justice, fair)" across two defs
        # Fix: split into two proper definitions with correct parentheses
        defs = entry.get("definitions", [])
        if len(defs) == 1:
            # If merged, split it back
            text_en = defs[0].get("text_en", "")
            text_mt = defs[0].get("text_mt", "")
            # Create two proper definitions
            defs = [
                {"text_en": "Just (in accordance with justice)", "text_mt": "Li hu skont il-ġustizzja u l-liġi.", "register": "", "nuance": ""},
                {"text_en": "Fair", "text_mt": "Li hu ġust u onest.", "register": "", "nuance": ""},
            ]
        elif len(defs) >= 2:
            # Fix parens on the first if needed
            defs[0]["text_en"] = "Just (in accordance with justice)"
            defs[1]["text_en"] = "Fair"
        entry["definitions"] = defs

    if entry_id == "n-ġwann":
        # Fix the displayed text_en to be cleaner
        defs = entry.get("definitions", [])
        if defs:
            defs[0]["text_en"] = "A male given name, equivalent to English John"
        entry["definitions"] = defs

    if entry_id == "n-ġwanni":
        defs = entry.get("definitions", [])
        if defs:
            defs[0]["text_en"] = "Alternative spelling of Ġwann"
        entry["definitions"] = defs

    # 4. Ensure capitalisation (after all fixes)
    defs = entry.get("definitions", [])
    capitalise_defs(defs)
    entry["definitions"] = defs

    # 5. Add usage examples
    if entry_id in EXAMPLES:
        entry["usage_examples"] = EXAMPLES[entry_id]

    # 6. Tag validation (tags are at top level)
    validated_tags, validated_entry_tags = validate_tags(entry, tags, entry_tags)

    return entry, validated_tags, validated_entry_tags


def main():
    entries = []
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)

            # Remove _scratchpad
            obj.pop("_scratchpad", None)

            # Keep top-level tags and entry_tags (do NOT remove them)
            top_tags = obj.get("tags", [])
            top_entry_tags = obj.get("entry_tags", [])

            entry = obj.get("entry", {})
            entry_id = entry.get("id", "")

            entry, validated_tags, validated_entry_tags = process_entry(entry_id, entry, top_tags, top_entry_tags)

            obj["entry"] = entry
            obj["tags"] = validated_tags
            obj["entry_tags"] = validated_entry_tags
            entries.append(obj)

    # Write output
    output_dir = os.path.dirname(OUTPUT)
    os.makedirs(output_dir, exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        for obj in entries:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    # Stats
    total = len(entries)
    total_defs = sum(len(obj["entry"].get("definitions", [])) for obj in entries)
    text_mt_filled = sum(1 for obj in entries for d in obj["entry"].get("definitions", []) if d.get("text_mt") and d["text_mt"] not in (None, ""))
    text_mt_null = sum(1 for obj in entries for d in obj["entry"].get("definitions", []) if not d.get("text_mt") or d["text_mt"] is None or d["text_mt"] == "")
    total_examples = sum(len(obj["entry"].get("usage_examples", [])) for obj in entries)
    total_tags = sum(len(obj.get("tags", [])) for obj in entries)
    entries_with_tags = sum(1 for obj in entries if obj.get("tags", []))
    examples_per_entry = [(obj["entry"]["id"], len(obj["entry"].get("usage_examples", []))) for obj in entries]

    print("=" * 50)
    print("BATCH 037 REFINEMENT REPORT")
    print("=" * 50)
    print(f"Total entries processed: {total}")
    print(f"Total definitions: {total_defs}")
    print(f"text_mt filled: {text_mt_filled}")
    print(f"text_mt still null: {text_mt_null}")
    print(f"Total usage examples: {total_examples}")
    print(f"Entries with examples: {sum(1 for _, c in examples_per_entry if c > 0)}")
    print(f"Examples per entry: {dict(examples_per_entry)}")
    print(f"Total tags after validation: {total_tags}")
    print(f"Entries with tags: {entries_with_tags}")
    print(f"Output written to: {OUTPUT}")
    print("=" * 50)


if __name__ == "__main__":
    main()
