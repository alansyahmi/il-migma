#!/usr/bin/env python3
"""
Refine batch_017.jsonl (għ- entries).
Fills text_mt (Oxford Maltese), generates 1-3 examples per entry,
removes _scratchpad, validates tags against approved list, removes
redundant tags (e.g. noun on nouns, feminine on feminine-gender entries).
"""

import json
import re

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_017.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_017.jsonl"

APPROVED_TAGS = frozenset({
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time",
})

# ---------------------------------------------------------------------------
# Maltese definitions (text_mt) — Oxford-style, capitalised, no circularity,
# no semicolons, no headword in the definition.
# Keyed by entry headword -> list of definitions in order.
# ---------------------------------------------------------------------------
MT_DEFS = {
    "għarraq": [
        "Għamel lil xi ħaġa tinżel taħt wiċċ l-ilma jew likwidu ieħor, għaddasha kompletament",
        "Ħassar serjament, għawweġ jew neħħa l-valur minn xi ħaġa, għamilha ħażina jew kerha",
        "Ġiegħel lil xi ħadd jarmi għaraq, għamel lil xi ħadd jagħraq b'mod abbundanti",
        "Iddistilla, sepa sustanza likwida permezz ta' sħana u kondensazzjoni, ippurifika likwidu",
        "Stabblixxa ruħu sewwa f'post, kiber u ħa qabda soda bl-għeruq fl-art, tkabbar u ħa s-sahha",
    ],
    "għarras": [
        "Għaqqad lil xi ħadd ma' persuna oħra permezz ta' wegħda formali ta' żwieġ, għamel ingaġġ uffiċjali",
    ],
    "għarres": [
        "Għaqqad lil xi ħadd ma' persuna oħra permezz ta' wegħda formali ta' żwieġ, għamel ingaġġ uffiċjali",
    ],
    "għarrex": [
        "Bena għarix żgħir jew kenn, għamel struttura sempliċi għall-kenn",
        "Ħares b'attenzjoni u b'mod moħbi, għasses u osservat bir-reqqa, ippannja",
        "Sar imsaħħab, tkessaħ u sar b'temp imsaħħab b'sħab qattiel, mgħotti bis-sħab",
    ],
    "għarukaża": [
        "Telf kbir ta' unur jew fama, għajb kbir, skandlu pubbliku qawwi",
    ],
    "għarus": [
        "Raġel li għadu kemm żżewweġ jew li għadu jinsab fit-triq għaż-żwieġ, l-għarus fiż-żwieġ",
    ],
    "għarusa": [
        "Mara li għadha kemm iżżewġet jew li għadha tinsab fit-triq għaż-żwieġ, l-għarusa fiż-żwieġ",
    ],
    "għarwen": [
        "Neħħa l-ħwejjeġ kollha minn fuq xi ħadd, ħallieh għarwien kompletament, xħattu",
    ],
    "għarwien": [
        "Li m'għandu l-ebda ħwejjeġ fuqu, mikxuf kompletament, bla libsa",
        "Li m'għandu l-ebda kisja jew tkessieħ fuqu, vojt, mikxuf u mhux miksi",
    ],
    "għasa": [
        "Biċċa injam twila u rqiqa, użata bħala appoġġ biex wieħed jimxi magħha jew bħala arma, bastun",
    ],
    "għasajfar": [
        "Għasfur żgħir, id-dminuttiv ta' għasfur, għasfur ta' daqs żgħir",
    ],
    "għasar": [
        "It-talb ta' filgħaxija fil-Kristjaneżmu, il-quddiesa ta' filgħaxija, il-Vespri",
        "Wara nofsinhar, il-ħin ta' bejn nofsinhar u l-għabex",
        "It-tieni talb obbligatorju ta' wara nofsinhar fl-Islam, it-talb ta' l-għasar",
    ],
    # verb għasar
    "għasar (verb)": [
        "Għafas, applika pressjoni fuq xi ħaġa biex neħħielha l-likwidu, agħfas sewwa",
        "Neħħa l-meraq jew likwidu ieħor minn xi ħaġa billi għafasha, estra l-meraq",
    ],
    "għasel": [
        "Sustanza ħelwa u viskuża prodotta min-naħal mill-ġbir tan-nectar tal-fjuri, użata bħala ikel u ħlewwa naturali",
    ],
    "għasfur": [
        "Annimal bir-rix u l-ġwienaħ li jitajjar, li jbid il-bajd u ġeneralment ikun jista' jtir, għasfur ta' sess maskili",
    ],
    "għasfur tal-bejt": [
        "Għasfur żgħir komuni ta' lewn kannella u griż, Passer domesticus, li jgħix fil-viċinanzi tal-bnedmin u fil-bliet",
    ],
    "għasfura": [
        "Mara ta' għasfur, il-forma femminili ta' għasfur, għasfur ta' sess femminili",
        "L-organu sesswali maskili, il-pene (użat b'mod umoristiku jew slang)",
    ],
    "għasida": [
        "Tip ta' pudina magħmula minn dqiq imsajjar bl-ilma, xaħam u spiss ħlewwa, ħafna drabi mħallta mal-għasel",
    ],
    "għasli": [
        "Li għandu t-togħma jew il-kwalitajiet tal-għasel, ħelu jew aromatiku bħall-għasel",
        "Li għandu lewn dehbi ċar bejn l-isfar u l-kannella, ta' lewn l-għasel",
    ],
    "għasluġ": [
        "Biċċa injam twila u dritta, bastun għall-appoġġ jew l-mixi",
        "Virga rqiqa u flessibbli tal-injam, stikka rqiqa użata għal skopijiet varji",
    ],
    "għasri": [
        "Li jiġri tard, li jseħħ tard fil-ġurnata, tardiv, tal-aħħar tal-ġurnata",
    ],
    "għassa": [
        "Grupp ta' persuni mħarrġa biex iħarsu u jipproteġu post, persuna jew proprjetà, għases",
        "Bini jew kmamar fejn joqogħdu l-għases jew il-pulizija, stazzjon tal-pulizija",
    ],
    "għassed": [
        "Ħallat u għaġen l-għaġina bl-idejn sakemm saret lixxa u lesta għall-ħami, għaġen l-għaġina",
        "Ħallat flimkien elementi differenti, għamel taħlita mhux ordnata",
        "Ħassar jew għamel ħidma ħażina, għamel xi ħaġa bl-aktar mod inept u imperfett",
    ],
    "għasses": [
        "Baqa' attent u ħares post jew persuna kontra periklu, wettaq dmir ta' għassa",
        "Ħares, proteġġa jew żamm għajnejh fuq xi ħaġa jew xi ħadd biex jipprevjeni ħsara jew telf",
    ],
    "għassies": [
        "Persuna li taħdem bħala għarus, li tieħu ħsieb il-ħarsien u l-protezzjoni ta' post jew persuna, għarus bil-lejl",
    ],
}

# ---------------------------------------------------------------------------
# Usage examples (1-3 per entry)
# Each entry: list of (maltese_sentence, english_sentence) tuples
# ---------------------------------------------------------------------------
EXAMPLES = {
    "għarraq": [
        ("Il-bastiment għarraq wara li laqat il-blata fil-baħar.", "The ship sank after hitting the rock at sea."),
        ("Huwa għarraq il-proġett bl-iżbalji kontinwi tiegħu.", "He ruined the project with his continuous mistakes."),
        ("Is-sħana qawwija għarrqitu waqt li kien jaħdem fl-għalqa.", "The intense heat made him sweat while he was working in the field."),
    ],
    "għarras": [
        ("Il-ġenituri għarrsu lil binhom ma' tfajla minn raħal ieħor.", "The parents betrothed their son to a girl from another village."),
        ("Il-koppja għarrset uffiċjalment il-ġimgħa li għaddiet.", "The couple officially announced their engagement last week."),
    ],
    "għarres": [
        ("Il-koppja għarset l-ingaġġ tagħhom b'ċerimonja żgħira.", "The couple formalised their engagement with a small ceremony."),
    ],
    "għarrex": [
        ("Il-bidwi għarrex għarix żgħir fl-għalqa għall-kenn mill-bard.", "The farmer built a small hut in the field for shelter from the cold."),
        ("Huwa għarrex wara l-purtiera biex jara min kien hemm.", "He peered from behind the curtain to see who was there."),
        ("Is-sema għarrex u bdew iħaffru l-ewwel qtar tax-xita.", "The sky became overcast and the first drops of rain began to fall."),
    ],
    "għarukaża": [
        ("L-iskandlu kien għarukaża kbira għall-familja kollha.", "The scandal was a great disgrace for the whole family."),
        ("Ġie mkeċċi b'għarukaża wara li nstab ħati.", "He was dismissed in dishonour after being found guilty."),
    ],
    "għarus": [
        ("L-għarus libes libsa bajda għall-ġurnata taż-żwieġ tiegħu.", "The groom wore a white suit for his wedding day."),
        ("Il-koppja l-għarusa u l-għarus dehru ferħanin flimkien.", "The couple, bride and groom, looked happy together."),
    ],
    "għarusa": [
        ("L-għarusa libset il-fuljetta bajda tradizzjonali.", "The bride wore the traditional white veil."),
        ("Il-ħbieb organizzaw festa ta' qabel iż-żwieġ għall-għarusa.", "The friends organised a pre-wedding party for the bride."),
    ],
    "għarwen": [
        ("L-imgħallem għarwen lill-ħaddiem talli ma kienx qed jaħdem sewwa.", "The boss stripped the worker naked because he was not working properly."),
        ("Il-baħħara għarwew il-ġisem tiegħu biex jaraw il-ferita.", "The sailors stripped his body to see the wound."),
    ],
    "għarwien": [
        ("It-tarbija kienet għarwiena wara l-banju.", "The baby was naked after the bath."),
        ("Il-ġebel kien għarwien, mingħajr ebda veġetazzjoni madwaru.", "The rock was bare, without any vegetation around it."),
    ],
    "għasa": [
        ("Huwa mexa bl-għasa f'idu minħabba l-uġigħ f'siequ.", "He walked with a staff in his hand because of the pain in his foot."),
        ("Ir-ragħaj kellu għasa twila biex imexxi l-merħla.", "The shepherd had a long staff to guide the flock."),
    ],
    "għasajfar": [
        ("Rajna għasajfar iż-żgħir ibejjet fis-siġra tal-ġnien.", "We saw the little bird nesting in the garden tree."),
    ],
    "għasar (noun)": [
        ("In-nies marru l-knisja għall-għasar ta' filgħaxija.", "The people went to church for the evening vespers."),
        ("Il-fiera tibda wara l-għasar u tkompli sal-għabex.", "The market starts after the afternoon and continues until dusk."),
        ("Huma qamu għat-talb ta' l-għasar fl-aħħar ta' wara nofsinhar.", "They got up for the asr prayer in the late afternoon."),
    ],
    "għasar (verb)": [
        ("Għasart il-larinġ biex nagħmel meraq frisk.", "I squeezed the oranges to make fresh juice."),
        ("Hi għasret il-ħwejjeġ qabel poġġiethom fuq il-ħabel.", "She wrung out the clothes before hanging them on the line."),
    ],
    "għasel": [
        ("Poġġejt l-għasel fuq il-ħobż għall-kolazzjon.", "I put honey on the bread for breakfast."),
        ("L-għasel Malti huwa magħruf għat-togħma rikka tiegħu.", "Maltese honey is known for its rich flavour."),
    ],
    "għasfur": [
        ("Għasfur ikanta fil-gaġġa kull filgħodu kmieni.", "A bird sings in the cage every early morning."),
        ("Rajna għasfur sabiħ ta' rix blu fil-park.", "We saw a beautiful bird with blue feathers in the park."),
    ],
    "għasfur tal-bejt": [
        ("L-għasafar tal-bejt jgħixu fis-soqfa u fil-ħitan tad-djar.", "Sparrows live on rooftops and in the walls of houses."),
        ("L-għasfur tal-bejt huwa wieħed mill-aktar għasafar komuni f'Malta.", "The sparrow is one of the most common birds in Malta."),
    ],
    "għasfura": [
        ("L-għasfura hejjiet il-bejta għall-frieħ tagħha.", "The female bird prepared the nest for her chicks."),
        ("Tlajt fuq is-sodda u weġġajt l-għasfura tiegħi.", "I climbed onto the bed and hurt my penis."),
    ],
    "għasida": [
        ("F'Malta, l-għasida ssir spiss waqt il-festi tar-Randan.", "In Malta, hasty pudding is often made during Lent festivities."),
    ],
    "għasli": [
        ("Il-ħalib għasli kien fit-togħma maċ-ċereali.", "The honeyed milk was tasty with the cereal."),
        ("Il-ġilda tagħha kellha lewn għasli sabiħ wara l-vaganza.", "Her skin had a beautiful tawny colour after the holiday."),
    ],
    "għasluġ": [
        ("Ir-ragħaj kellu għasluġ fl-idejn biex imexxi n-nagħaġ.", "The shepherd had a rod in his hand to guide the sheep."),
        ("Uża l-għasluġ biex ikejjel it-tul tad-drapp.", "He used the rod to measure the length of the cloth."),
    ],
    "għasri": [
        ("Il-ħin għasri kien meta l-ħaddiema telqu l-post tax-xogħol.", "The lateward time was when the workers left the workplace."),
    ],
    "għassa": [
        ("Il-gwardja kienet għassa soda kontra kull attakk.", "The guard was a strong watch against any attack."),
        ("Il-ħalliel inqabad u nġieb lejn l-għassa tal-pulizija.", "The thief was caught and taken to the police station."),
    ],
    "għassed": [
        ("In-nanna għasset l-għaġina għall-ħobż tradizzjonali.", "Grandma kneaded the dough for traditional bread."),
        ("Huwa għassed l-affarijiet kollha u ma felaħx isib xejn.", "He mixed everything up and could not find anything."),
        ("Minħabba l-għaġġla, huwa għassed ix-xogħol kollu." , "Because of the rush, he botched all the work."),
    ],
    "għasses": [
        ("Il-pulizija għassu l-belt matul il-lejl kollu.", "The police kept watch over the city throughout the whole night."),
        ("Kien hemm raġel jgħasses barra l-bieb tal-iskola kull filgħodu.", "There was a man watching outside the school gate every morning."),
    ],
    "għassies": [
        ("L-għassies tal-bank kien imqabbad jgħasses il-bini bil-lejl.", "The bank guard was assigned to watch the building at night."),
        ("L-għassies għalaq il-bieb wara l-ħin tal-għeluq.", "The watchman closed the door after closing time."),
    ],
}

# ---------------------------------------------------------------------------
# Fix broken English definitions (entry 2: għarras has split parentheses)
# ---------------------------------------------------------------------------
FIXED_EN = {
    "għarras": [
        "to betroth, to make an official engagement",
    ],
    "għarres": [
        "to betroth, to make an official engagement",
    ],
}


def process_entry(obj):
    """Process a single entry object and return the cleaned object."""
    entry = obj["entry"]
    hw = entry.get("headword", "")
    pos = entry.get("pos", "")
    defs = entry.get("definitions", [])

    # -- 1. Fix broken English definitions --
    if hw in FIXED_EN:
        fixed = FIXED_EN[hw]
        # Replace definitions entirely (għarras/għarres had two split pieces
        # that form a single definition — discard the orphaned halves)
        combined_defs = []
        for i, te in enumerate(fixed):
            combined_defs.append({
                "text_en": te,
                "text_mt": defs[i].get("text_mt") if i < len(defs) else None,
                "register": defs[i].get("register", "") if i < len(defs) else "",
                "nuance": defs[i].get("nuance", "") if i < len(defs) else "",
            })
        defs = combined_defs

    # -- 2. Split semicolons in text_en into separate definitions --
    defs = split_semicolons(defs)

    # -- 3. Fill text_mt (use verb-specific lookup for duplicate headwords) --
    defs = fill_text_mt(defs, hw, pos)

    # -- 4. Validate & clean tags --
    new_tags, new_entry_tags = process_tags(obj)

    entry["definitions"] = defs
    obj["tags"] = new_tags
    obj["entry_tags"] = new_entry_tags

    # -- 5. Add usage examples --
    entry["usage_examples"] = generate_examples(hw, pos, defs)

    obj["entry"] = entry

    return obj


def split_semicolons(defs):
    """Split definitions on semicolons into separate definitions."""
    result = []
    for d in defs:
        text_en = d.get("text_en", "")
        if ";" in text_en and text_en.strip():
            parts = [p.strip() for p in text_en.split(";") if p.strip()]
            for p in parts:
                result.append({
                    "text_en": p,
                    "text_mt": d.get("text_mt"),
                    "register": d.get("register", ""),
                    "nuance": d.get("nuance", ""),
                })
        else:
            result.append(dict(d))
    return result


def fill_text_mt(defs, hw, pos):
    """Fill null text_mt with appropriate Maltese definition."""
    # Build lookup key
    # Check for verb-specific lookup first if pos == verb and there's a noun homonym
    lookup_key = hw
    noun_form = None
    verb_form = None

    # Check if both a noun and verb "għasar" exist
    if hw == "għasar":
        if pos == "verb":
            lookup_key = "għasar (verb)"
        else:
            lookup_key = "għasar (noun)"

    mt_lookup = MT_DEFS.get(lookup_key, MT_DEFS.get(hw, []))

    for i, d in enumerate(defs):
        te = d.get("text_en", "")
        tm = d.get("text_mt")
        if tm is not None and tm != "":
            continue

        if i < len(mt_lookup):
            d["text_mt"] = mt_lookup[i]
        elif mt_lookup:
            # Reuse last available MT def if more English defs than MT defs
            d["text_mt"] = mt_lookup[-1]
        else:
            # Fallback capitalised headword (should never happen with complete data)
            d["text_mt"] = hw.capitalize()

    return defs


def process_tags(obj):
    """Validate and remove tags not in approved list.
    Remove redundant tags (noun on nouns, feminine on feminine entries, etc.)."""
    old_tags = obj.get("tags", [])
    old_entry_tags = obj.get("entry_tags", [])
    entry = obj.get("entry", {})

    pos = entry.get("pos", "")
    gender = entry.get("gender")
    is_loanword = entry.get("is_loanword", 0)
    root_consonants = entry.get("root_consonants")

    new_tags = []
    new_entry_tags = []
    old_id_to_new = {}

    for t in old_tags:
        tag_name = t.get("name", "")
        tag_id = t.get("id", f"tag-{tag_name}")

        # Remove if not in approved list
        if tag_name not in APPROVED_TAGS:
            continue

        # Remove redundant tags
        if tag_name == "noun" and pos == "noun":
            continue
        if tag_name in ("feminine", "fem") and gender == "feminine":
            continue
        if tag_name == "masculine" and gender == "masculine":
            continue
        if tag_name in ("loanword", "loan") and is_loanword == 1:
            continue
        if tag_name == "semitic" and root_consonants:
            continue
        if tag_name == "verb" and pos == "verb":
            continue
        if tag_name == "adjective" and pos == "adjective":
            continue

        # Keep the tag
        new_tag = {
            "id": tag_id,
            "name": tag_name,
            "category": t.get("category", "Usage"),
            "description": t.get("description"),
        }
        old_id_to_new[tag_id] = tag_id
        new_tags.append(new_tag)

    for et in old_entry_tags:
        old_tag_id = et.get("tag_id", "")
        if old_tag_id in old_id_to_new:
            new_entry_tags.append({
                "entry_id": et.get("entry_id", ""),
                "tag_id": old_tag_id,
            })

    return new_tags, new_entry_tags


def generate_examples(hw, pos, defs):
    """Get 1-3 usage examples per entry."""
    lookup_key = hw
    if hw == "għasar":
        if pos == "verb":
            lookup_key = "għasar (verb)"
        else:
            lookup_key = "għasar (noun)"

    exs = EXAMPLES.get(lookup_key, EXAMPLES.get(hw, []))
    result = []
    for mt_sent, en_sent in exs:
        result.append({
            "mt": mt_sent,
            "en": en_sent,
        })
    return result


def main():
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        lines = [l.strip() for l in f if l.strip()]

    refined = []
    stats = {"total": len(lines), "modified": 0, "errors": 0, "tags_removed": 0, "entries_with_tags_removed": 0}

    for line in lines:
        try:
            obj = json.loads(line)

            # Count original tags
            orig_tag_count = len(obj.get("tags", []))

            # Remove _scratchpad
            obj.pop("_scratchpad", None)

            # Process entry
            obj = process_entry(obj)

            # Count removed tags
            new_tag_count = len(obj.get("tags", []))
            if orig_tag_count > new_tag_count:
                stats["tags_removed"] += (orig_tag_count - new_tag_count)
                stats["entries_with_tags_removed"] += 1

            refined.append(obj)
            stats["modified"] += 1
        except Exception as e:
            print(f"Error processing line: {e}")
            # Keep original if error
            obj = json.loads(line)
            obj.pop("_scratchpad", None)
            refined.append(obj)
            stats["errors"] += 1

    import os
    out_dir = os.path.dirname(OUTPUT)
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        for obj in refined:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    print(json.dumps(stats, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
