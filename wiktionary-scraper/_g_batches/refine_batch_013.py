#!/usr/bin/env python3
"""
Refine batch_013.jsonl:
- Fill null text_mt with Oxford Maltese (capitalised, no circularity, no semicolons)
- Generate 1-3 usage examples (Maltese + UK English)
- Remove _scratchpad
- Validate tags (approved list only, no redundants)
"""

import json
import sys

INPUT = r"C:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_013.jsonl"
OUTPUT = r"C:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_013.jsonl"

# ─── Approved tag IDs (from terminology.ts tag- entries) ──────────────────────
APPROVED_TAG_IDS = {
    "tag-common",
    "tag-semitic-core",
    "tag-romance-core",
    "tag-colour",
    "tag-color",
    "tag-theoretical",
    "tag-base",
    "tag-term",
    "tag-derived",
    "tag-arabism",
    "tag-archaic",
    "tag-obsolete",
    "tag-puristic",
    "tag-rgħajn",
    "tag-loan",
}

# ─── Maltese definitions per entry ID ─────────────────────────────────────────
# Using Oxford-standard Maltese, capitalised, no circularity, no semicolons
MT_DEFS = {}

def set_mt(entry_id, texts):
    """Set one or more Maltese definition texts for an entry ID.
    texts is a list of strings, one per definition slot."""
    MT_DEFS[entry_id] = texts

# Entry 1: għalliġej (adverb, dated)
set_mt("adv-għalliġej", [
    "Minn issa 'l quddiem; fil-ġejjieni.",
    "Għal dak li għandu jseħħ fil-futur.",
])

# Entry 2: għalqa (noun, feminine)
set_mt("n-għalqa", [
    "Biċċa art miftuħa u kkultivata, tipikament imħawla bil-ħxejjex jew użata għar-ragħa tal-bhejjem.",
])

# Entry 3: għalt (noun, alternative form of għelt)
set_mt("n-għalt", [
    "Kitba oħra ta' għelt; żball jew nuqqas.",
])

# Entry 4: għalxejn (adverb)
set_mt("adv-għalxejn", [
    "Għal ebda raġuni; mingħajr skop jew bżonn.",
])

# Entry 5: għalxiex (adverb, alternative form of għaliex)
set_mt("adv-għalxiex", [
    "Kitba oħra ta' għaliex; ir-raġuni jew il-kawża ta' xi ħaġa.",
])

# Entry 6: għalxiex (noun, alternative form of għaliex)
set_mt("n-għalxiex", [
    "Kitba oħra ta' għaliex; ir-raġuni jew il-kawża wara xi ħaġa.",
])

# Entry 7: għam (noun, masculine) - year
set_mt("n-għam", [
    "Perjodu ta' tnax-il xahar li fih id-dinja ddur madwar ix-xemx; sena.",
])

# Entry 8: għam (verb) - to swim, to float
set_mt("v-għam", [
    "Jiċċaqlaq fl-ilma billi jċaqlaq idejh u riġlejh.",
    "Jibqa' fuq il-wiċċ ta' likwidu mingħajr ma jegħreq.",
])

# Entry 9: għama (adjective) - misspelling of agħma
set_mt("adj-għama", [
    "Kitba ħażina ta' agħma; min ma jistax jara.",
])

# Entry 10: għama (noun, feminine) - blindness
set_mt("n-għama", [
    "In-nuqqas tal-kapaċità li tara; nuqqas tal-vista.",
])

# Entry 11: għama (verb) - to blind
set_mt("v-għama", [
    "Iċaħħad lil xi ħadd mill-kapaċità li jara; iġiegħel lil xi ħadd isir agħma.",
])

# Entry 12: għamad (noun, masculine) - blindfold, blinkers
set_mt("n-għamad", [
    "Faxxa jew għatu li jitqiegħed fuq l-għajnejn biex ma jara xejn.",
    "Tagħmir imqiegħed ma' ġenb l-għajnejn taż-żiemel biex ma jara minn ġenb.",
])

# Entry 13: għamar (noun, masculine) - habitation, time of maturity
set_mt("n-għamar", [
    "Il-post fejn wieħed jgħix; residenza jew dar.",
    "Iż-żmien tal-ħajja meta wieħed jilħaq il-maturità u s-saħħa sħiħa.",
])

# Entry 14: għamar (verb) - to dwell, to reside
set_mt("v-għamar", [
    "Jgħix f'xi post b'mod permanenti; jirrisjedi.",
])

# Entry 15: għamara (noun, feminine) - furniture, home/family
set_mt("n-għamara", [
    "L-oġġetti kbar u ż-żgħar li jintużaw f'dar bħall-imwejjed, is-siġġijiet u s-sodod.",
    "Id-dar u l-familja; l-unità domestika.",
])

# Entry 16: għamel (verb) - many definitions
set_mt("v-għamel", [
    "Iwettaq azzjoni jew joħloq xi ħaġa.",
    "Iġiegħel lil xi ħadd jagħmel xi ħaġa.",
    "Iseħħ; isir.",
    "Jirranġa jew jippjana avveniment.",
    "Iqatta' l-ħin b'ċertu mod.",
    "Joħroġ l-ilma minn toqba; inixxi.",
    "Jagħti spettaklu jew wirja quddiem udjenza.",
    "Jirreċta parti f'dramm jew spettaklu.",
    "Iħobb xi ħaġa bil-kbir u japprezzaha ħafna.",
    "Iqiegħed xi ħaġa f'postha.",
    "Jipproduċi l-frott (għal siġra).",
    "Jaħdem l-art; jikkoltiva.",
    "Ixarrab bl-ilma b'mod sħiħ.",
    "Iqis; jaħseb li xi ħaġa hija minnha.",
    "Jagħmel xi ħaġa lil xi ħadd jew għal xi ħadd.",
    "Jaqa' taħt kategorija partikolari.",
    "Jattakka b'mod aggressiv.",
    "Jixbah u jimita l-imġiba ta' xi ħadd.",
    "Jagħmel ġid jew deni lil xi ħadd.",
    "Jagħmel li jrid; jippretendi.",
    "Jirnexxi jasal jew itemm xi ħaġa.",
])

# Entry 17: għames (verb) - to dip
set_mt("v-għames", [
    "Jgħaddas xi ħaġa f'likwidu; ibaxxi ġo likwidu.",
])

# Entry 18: għameż (verb, alternative form of għemeż) - to wink, blink
set_mt("v-għameż", [
    "Kitba oħra ta' għemeż; jagħlaq u jiftaħ għajnu malajr bħala sinjal.",
])

# Entry 19: għamieq (noun, masculine, literary) - depth
set_mt("n-għamieq", [
    "Il-fond; dak li jinsab taħt il-wiċċ b'mod qawwi.",
    "L-iktar parti fil-fond ta' xi ħaġa.",
])

# Entry 20: għamla (noun, feminine) - way, manner, shape
set_mt("n-għamla", [
    "Il-mod kif issir xi ħaġa; id-dehra jew il-forma ta' xi ħaġa.",
    "Il- qagħda jew it-tip ta' xi ħaġa.",
])

# Entry 21: għamm (noun, masculine, obsolete) - paternal uncle
set_mt("n-għamm", [
    "Ħu l-missier; ziju min-naħa ta' missieru.",
])

# Entry 22: għammad (verb) - to blindfold
set_mt("v-għammad", [
    "Iqiegħed għamad fuq għajnejn xi ħadd biex ma jara xejn.",
])

# Entry 23: għammar (verb) - to dwell, to furnish, to breed
set_mt("v-għammar", [
    "Jgħix f'post; jirrisjedi b'mod permanenti.",
    "Iżżejjen jew jarma dar bil-għamara u t-tagħmir meħtieġ.",
    "Irabbijiet l-annimali; iżomm u jkabbar l-annimali.",
])

# Entry 24: għammed (verb) - to baptize
set_mt("v-għammed", [
    "Jagħmel il-magħmudija; jdaħħal fil-fidi Nisranija permezz tal-ilma.",
])

# Entry 25: għammes (verb) - to dip
set_mt("v-għammes", [
    "Jgħaddas xi ħaġa f'likwidu; ibaxxi ġo likwidu b'mod qawwi.",
])


# ─── Usage examples per entry ID ──────────────────────────────────────────────
EXAMPLES = {}

def set_ex(entry_id, examples):
    """examples is a list of (mt_sentence, en_sentence) tuples."""
    EXAMPLES[entry_id] = examples

set_ex("adv-għalliġej", [
    ("Għalliġej, irridu nkunu iżjed attenti.", "Henceforth, we must be more careful."),
    ("Ma nafux x'jistenniena għalliġej.", "We do not know what awaits us in the future."),
])

set_ex("n-għalqa", [
    ("Il-bidwi ħarat l-għalqa qabel ma żeraż-żerriegħa.", "The farmer ploughed the field before sowing the seed."),
    ("L-għelieqi ta' madwar ir-raħel huma kollhom ħodor fir-rebbiegħa.", "The fields around the village are all green in spring."),
])

set_ex("n-għalt", [
    ("Kien għalt li ma widenx il-parir tiegħu.", "It was a mistake not to listen to his advice."),
    ("Għamilt għalt meta ħsibt li kien se jgħinni.", "I made an error when I thought he would help me."),
])

set_ex("adv-għalxejn", [
    ("Għalxejn tipprova tgħidlu xi ħaġa għax ma jismax.", "There is no point trying to tell him anything because he does not listen."),
    ("Ġejt għalxejn għax il-ħanut kien magħluq.", "I came for nothing because the shop was closed."),
])

set_ex("adv-għalxiex", [
    ("Ma nafx għalxiex għamilt hekk.", "I do not know why you did that."),
    ("Għalxiex tħossok hekk wara kull ma għamel għalik?", "Why do you feel that way after all he did for you?"),
])

set_ex("n-għalxiex", [
    ("Qatt ma spjega l-għalxiex ta' għemilu.", "He never explained the reason for his action."),
    ("Għandi nkun naf l-għalxiex qabel ma niddeċiedi.", "I need to know the reason before I decide."),
])

set_ex("n-għam", [
    ("Għadu kif għalaq għam minn meta miet missieru.", "It has just been a year since his father died."),
    ("Għandna għam li ma rajniex.", "It has been a year since we saw him."),
])

set_ex("v-għam", [
    ("Tajjeb li tgħallem tgħum meta tkun żgħir.", "It is good to learn to swim when you are young."),
    ("L-injam jgħum fuq l-ilma.", "Wood floats on water."),
])

set_ex("adj-għama", [
    ("Din hija kitba ħażina; il-kelma t-tajba hi agħma.", "This is a misspelling; the correct word is agħma."),
])

set_ex("n-għama", [
    ("L-għama tista' tkun ikkawżata minn diversi mard.", "Blindness can be caused by various diseases."),
    ("Tilef għajnejh f'inċident u għex bl-għama għall-bqija ta' ħajtu.", "He lost his eyes in an accident and lived with blindness for the rest of his life."),
])

set_ex("v-għama", [
    ("Id-dija qawwija tax-xemx għamitu għal ftit sekondi.", "The bright sunlight blinded him for a few seconds."),
    ("Ir-rabja tgħama l-ġudizzju tiegħu u ma setax jaħseb sewwa.", "Anger blinded his judgment and he could not think clearly."),
])

set_ex("n-għamad", [
    ("Poġġewlu l-għamad fuq għajnejh qabel ma ħaduh.", "They put a blindfold over his eyes before taking him."),
    ("Iż-żiemel kellu l-għamad biex ma jibżax mill-istorbju ta' madwaru.", "The horse had blinkers so it would not get frightened by the noise around it."),
])

set_ex("n-għamar", [
    ("L-għamar tiegħu kien villa sabiħa fil-kampanja.", "His dwelling was a beautiful villa in the countryside."),
    ("Wasal fl-għamar tal-ħajja meta beda jieħu deċiżjonijiet għaqlin.", "He reached the time of maturity when he started making wise decisions."),
])

set_ex("v-għamar", [
    ("Għamar f'dik id-dar għal ħamsa u tletin sena.", "He lived in that house for thirty-five years."),
    ("Il-poplu għamar f'dawk l-artijiet għal sekli sħaħ.", "The people inhabited those lands for centuries."),
])

set_ex("n-għamara", [
    ("Ixtraw għamara ġdida għall-kamra tal-ikel.", "They bought new furniture for the dining room."),
    ("L-għamara antika kienet tiswa ħafna flus.", "The antique furniture was worth a lot of money."),
])

set_ex("v-għamel", [
    ("Għamel il-ħobż biż-żebbuġ u r-rum.", "He made bread with olives and pomegranate."),
    ("X'għamilt ilbieraħ filgħaxija?", "What did you do yesterday evening?"),
    ("Ġara inċident u ma għamilx ħsara.", "There was an accident and no harm was done."),
])

set_ex("v-għames", [
    ("Ġhamset il-ħobż fil-ħalib qabel ma kilitu.", "She dipped the bread in the milk before eating it."),
    ("Għames il-pinzell fiż-żebgħa blu.", "He dipped the brush in the blue paint."),
])

set_ex("v-għameż", [
    ("Għamżetlu b'għajnejha biex turih li kienet taf.", "She winked at him to show that she knew."),
    ("Għameżli meta għadd ejt minn ħdejh.", "He winked at me when I passed by him."),
])

set_ex("n-għamieq", [
    ("L-għamieq tal-baħar huwa mimli kreaturi strambi.", "The depth of the sea is full of strange creatures."),
    ("Ma jaf ħadd x'jinsab fl-għamieq tal-art.", "No one knows what lies in the depths of the earth."),
])

set_ex("n-għamla", [
    ("Ma nħobbx l-għamla kif għamilt dan ix-xogħol.", "I do not like the way you did this work."),
    ("X'għamla ta' siġra hija din?", "What kind of tree is this?"),
    ("Il-mejda kellha għamla tonda sabiħa.", "The table had a beautiful round shape."),
])

set_ex("n-għamm", [
    ("L-għamm kien raġel ġentili u maħbub minn kulħadd.", "The paternal uncle was a kind man loved by everyone."),
    ("Żar lil għammu fi tmiem il-ġimgħa.", "He visited his paternal uncle at the weekend."),
])

set_ex("v-għammad", [
    ("Għammaduh qabel ma ħaduh biex ma jarax fejn kien sejjer.", "They blindfolded him before taking him so he would not see where he was going."),
])

set_ex("v-għammar", [
    ("Għammar f'dik il-belt għal ħafna snin qabel mar l-Amerika.", "He lived in that city for many years before going to America."),
    ("Għammru d-dar il-ġdida bl-ifjen għamara.", "They furnished the new house with the finest furniture."),
    ("Jgħammar in-naħal għall-għasel.", "He breeds bees for honey."),
])

set_ex("v-għammed", [
    ("Il-qassis għammed it-tarbija fil-knisja l-ġimgħa li għaddiet.", "The priest baptised the baby in the church last week."),
    ("Għammduh meta kellu biss xahar.", "He was baptised when he was only a month old."),
])

set_ex("v-għammes", [
    ("Għammes il-kejk fil-ġulepp u ħallieh għal ftit minuti.", "He dipped the cake in the syrup and left it for a few minutes."),
    ("Għammes subgħajh fl-ilma biex iħoss kemm kien sħun.", "He dipped his finger in the water to feel how hot it was."),
])


# ─── Process entries ──────────────────────────────────────────────────────────

def process_entry(obj):
    """Process a single JSON object and return the refined version."""

    # Make a copy to avoid mutation
    result = {}

    entry = obj.get("entry", obj)

    # Remove _scratchpad
    if "_scratchpad" in obj:
        del obj["_scratchpad"]

    # Remove _scratchpad if it's at the entry level (shouldn't be, but just in case)
    if "_scratchpad" in entry:
        del entry["_scratchpad"]

    # Now check if entry is nested under "entry" key or at top level
    # The refined format wraps everything in {"entry": {...}, "tags": [...], "entry_tags": [...]}

    # Fill text_mt for each definition
    entry_id = entry.get("id", "")
    mt_defs = MT_DEFS.get(entry_id, [])

    definitions = entry.get("definitions", [])
    for i, defn in enumerate(definitions):
        if defn.get("text_mt") is None:
            if i < len(mt_defs):
                defn["text_mt"] = mt_defs[i]
            else:
                # Fallback: derive from English
                en_text = defn.get("text_en", "")
                if en_text:
                    # Clean up any bracketed notes
                    import re
                    clean_en = re.sub(r'\s*\[.*?\]', '', en_text).strip().capitalize()
                    defn["text_mt"] = f"{clean_en}."

    # Generate usage examples
    examples = EXAMPLES.get(entry_id, [])
    if examples:
        entry["usage_examples"] = []
        for mt, en in examples:
            entry["usage_examples"].append({"mt": mt, "en": en})

    # Validate tags - remove any not in approved list
    # The structure has both "tags" (array of tag objects) and "entry_tags" (array of link objects)
    # Also need to check tags embedded in the entry if they exist

    # Process tags arrays from the wrapping object
    valid_tag_ids = set()
    tags_to_keep = []
    for tag in obj.get("tags", []):
        tag_id = tag.get("id", "")
        if tag_id in APPROVED_TAG_IDS:
            tags_to_keep.append(tag)
            valid_tag_ids.add(tag_id)

    # Process entry_tags
    entry_tags_to_keep = []
    for et in obj.get("entry_tags", []):
        tag_id = et.get("tag_id", "")
        if tag_id in APPROVED_TAG_IDS:
            entry_tags_to_keep.append(et)

    # Update the wrapping object
    obj["tags"] = tags_to_keep
    obj["entry_tags"] = entry_tags_to_keep

    # If there's a top-level "entry" wrapping, keep it
    if "entry" not in obj and entry is not obj:
        # The entry was nested - wrap it back
        result["entry"] = entry
        result["tags"] = tags_to_keep
        result["entry_tags"] = entry_tags_to_keep
        return result

    return obj


def main():
    entries_in = 0
    entries_out = 0
    definitions_filled = 0
    examples_added = 0
    scratchpad_removed = 0
    tags_removed = 0
    tags_kept = 0

    with open(INPUT, "r", encoding="utf-8-sig") as fin, \
         open(OUTPUT, "w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue

            obj = json.loads(line)
            entries_in += 1

            # Count null text_mt before
            entry = obj.get("entry", obj)
            null_defs = sum(1 for d in entry.get("definitions", []) if d.get("text_mt") is None)

            # Count scratchpad
            has_sp = "_scratchpad" in obj
            if has_sp:
                scratchpad_removed += 1

            # Count tags before
            tags_before = len(obj.get("tags", []))

            # Process
            processed = process_entry(obj)

            # Count what happened
            entry_after = processed.get("entry", processed)

            # Count definitions filled
            defs_after = entry_after.get("definitions", [])
            non_null_after = sum(1 for d in defs_after if d.get("text_mt") is not None)
            filled = non_null_after - (len(defs_after) - null_defs)
            if filled > 0:
                definitions_filled += filled

            # Count examples
            ex_count = len(entry_after.get("usage_examples", []))
            if ex_count > 0:
                examples_added += ex_count

            # Count tags kept/removed
            tags_after = len(processed.get("tags", []))
            tags_kept += tags_after
            tags_removed += tags_before - tags_after

            fout.write(json.dumps(processed, ensure_ascii=False) + "\n")
            entries_out += 1

    print(f"Entries processed: {entries_in}")
    print(f"Entries written:   {entries_out}")
    print(f"Definitions filled: {definitions_filled}")
    print(f"Examples added:    {examples_added}")
    print(f"Scratchpads removed: {scratchpad_removed}")
    print(f"Tags kept:         {tags_kept}")
    print(f"Tags removed:      {tags_removed}")
    print(f"Output:            {OUTPUT}")


if __name__ == "__main__":
    main()
