#!/usr/bin/env python3
"""Refine batch_024.jsonl: fill text_mt, add usage examples, remove _scratchpad, validate tags."""

import json

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_024.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_024.jsonl"

APPROVED_TAGS = {
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time",
}

# Tag name mapping: non-approved tag -> approved replacement (or None to remove)
TAG_REPLACEMENTS = {
    "christianity": "religion",
    "dated": None,  # not in approved list, remove
    "still-current": None,  # redundant, remove
    "current": None,  # redundant, remove
    "alternative-form": None,  # not a valid usage tag, remove
    "also-l-għuda-tas-salib": None,  # not a valid tag, remove
}

REFINEMENTS = {
    "n-għorfa": {
        "text_mt": [
            "Kamra ta' fuq f'dar tradizzjonali tal-irħula.",
        ],
        "examples": [
            ("In-nannu kien jorqod fl-għorfa u kien jinżel l-isfel kull filgħodu.",
             "Grandfather used to sleep in the upper room and would come downstairs every morning."),
            ("L-għorfa kienet tintuża biex tinħażen il-qamħ u prodotti oħra.",
             "The upper room was used to store grain and other produce."),
        ],
    },
    "n-għorma": {
        "text_mt": [
            "Munzell jew borġ ta' affarijiet.",
            "Għolja żgħira tar-ramel mibnija mir-riħ.",
        ],
        "examples": [
            ("Ġabar il-ġebel kollu f'għorma waħda fil-genb tar-raba.",
             "He gathered all the stones into one heap at the edge of the field."),
            ("L-għorma tar-ramel kibret wara l-maltemp.",
             "The sand dune grew after the storm."),
        ],
    },
    "n-għorna": {
        "text_mt": [
            "Għar naturali jew kavità fil-blat.",
            "Għarix żgħir fejn jinħażnu l-prodotti tar-raba.",
        ],
        "examples": [
            ("Il-ġellieda nsterbu fl-għorna matul il-gwerra.",
             "The fighters hid in the cave during the war."),
            ("L-għorna kienet mimlija patata u basla.",
             "The small hut was full of potatoes and onions."),
        ],
    },
    "v-għorok": {
        "text_mt": [
            "Għaddi idejk fuq xi ħaġa b'moviment 'il quddiem u lura b'pressioni.",
            "Għorok u agħfas il-muskoli biex ittaffi t-tensjoni.",
        ],
        "examples": [
            ("Għorok għajnejh għax kien għajjien wara ġurnata twila.",
             "He rubbed his eyes because he was tired after a long day."),
            ("Il-fisjoterapista għorok dahri biex itaffi l-uġigħ.",
             "The physiotherapist massaged my back to relieve the pain."),
        ],
    },
    "n-għors": {
        "text_mt": [
            "Żwieġ.",
            "Ferħ u hena kbir.",
            "Gost u divertiment qawwi.",
            "Festa kbira f'ġieħ xi ħadd.",
        ],
        "examples": [
            ("Kien għors kbir fl-irħula ta' żmien ilu.",
             "It was a big wedding in the villages of long ago."),
            ("L-għors dam il-ġimgħa kollha bil-festi u ż-żfin.",
             "The celebration lasted the whole week with feasts and dancing."),
        ],
    },
    "n-għosfor": {
        "text_mt": [
            "Pjanta li ż-żerriegħa tagħha tintuża biex tagħti lewn isfar jew aħmar lill-ikel.",
        ],
        "examples": [
            ("L-għosfor jintuża minn żminijiet antiki bieb jagħti l-kulur lill-ħwejjeġ.",
             "Safflower has been used since ancient times to dye clothes."),
            ("Iż-żejt ta' l-għosfor huwa tajjeb għas-saħħa tal-qalb.",
             "Safflower oil is good for heart health."),
        ],
    },
    "adj-għosfri": {
        "text_mt": [
            "Li għandu xebh mal-għosfor.",
        ],
        "examples": [
            ("Il-kulur ta' din il-fjura huwa għosfri u jfakkar fil-ħarifa.",
             "The colour of this flower is saffron-like and reminds one of autumn."),
        ],
    },
    "n-għotba": {
        "text_mt": [
            "Stat ta' min hu għotob.",
        ],
        "examples": [
            ("L-għotba ġietu wara l-inċident tal-karozza.",
             "The crippling came to him after the car accident."),
        ],
    },
    "v-għotob": {
        "text_mt": [
            "Tilef il-ħila li timxi jew tiċċaqlaq minħabba diżabilità fiżika.",
            "Għarab fix-xemx jew fil-qamar 'l isfel mill-orizzont.",
        ],
        "examples": [
            ("Għotob wara li waqa' mis-siġra u ma setax jerġa' jimxi.",
             "He became crippled after falling from the tree and could not walk again."),
            ("Ix-xemx għotbet wara l-baħar fil-għaxija.",
             "The sun set behind the sea in the evening."),
        ],
    },
    "v-għotor": {
        "text_mt": [
            "Tfixkel waqt li timxi u kważi taqa'.",
        ],
        "examples": [
            ("Għotor fuq ġebla u waqa' mal-art.",
             "He stumbled on a stone and fell to the ground."),
            ("Oqgħod attent li ma togħtorx fit-triq mimlija ġebel.",
             "Be careful not to stumble on the stony road."),
        ],
    },
    "v-għoxa": {
        "text_mt": [
            "Tlift is-sensi temporanjament.",
            "Faqa' għad-daħk jew għall-biki bla kontroll.",
            "Ħadt pjaċir kbir b'xi ħaġa.",
            "Għaddast ruħek f'xi attività.",
            "Ħadt gost u ferħ kbir b'xi ħaġa.",
        ],
        "examples": [
            ("Għoxa meta ra d-demm u waqa' mal-art.",
             "He fainted when he saw the blood and fell to the ground."),
            ("Għoxa għad-daħk meta sema' l-istorja umoristika.",
             "He broke out in laughter when he heard the funny story."),
        ],
    },
    "n-għoxb": {
        "text_mt": [
            "Ħaxix jew pjanti żgħar li jikbru mal-art.",
        ],
        "examples": [
            ("Il-baqar jieklu l-għoxb fir-raba' tar-rebbiegħa.",
             "The cows eat the grass in the spring fields."),
            ("L-għoxb kien niexef wara s-sajf twil.",
             "The grass was dry after the long summer."),
        ],
    },
    "num-għoxrin": {
        "text_mt": [
            "In-numru 20.",
        ],
        "examples": [
            ("Għoxrin student attendew il-klassi llum.",
             "Twenty students attended the class today."),
            ("Għandu għoxrin sena u għadu qed jistudja.",
             "He is twenty years old and still studying."),
        ],
    },
    "n-għoxx": {
        "text_mt": [
            "Dar jew bejta ta' għasfur.",
            "Organu sesswali femminili.",
            "Persuna li m'għandhiex kuraġġ.",
            "Kliem jew ħlewwa li jsaħħaħ espressjoni jew sentiment negattiv.",
        ],
        "examples": [
            ("L-għasfur bena għoxx sabiħ fis-siġra tal-ġnien.",
             "The bird built a beautiful nest in the garden tree."),
            ("Tibżax minnu — huwa għoxx u ma jgħidlek xejn.",
             "Don't be afraid of him — he is a wimp and won't do anything to you."),
        ],
    },
    "v-għoġob": {
        "text_mt": [
            "Ġab sodisfazzjon jew pjaċir lil xi ħadd.",
            "Ġie ma' qalb xi ħadd.",
        ],
        "examples": [
            ("Din l-idea għoġbitni ħafna u naqbel magħha.",
             "I really liked this idea and agree with it."),
            ("Il-ktieb għoġob lil kulħadd fil-klassi.",
             "The book pleased everyone in the class."),
        ],
    },
    "n-għoġol": {
        "text_mt": [
            "Fergħun ta' baqra jew ta' gendus.",
        ],
        "examples": [
            ("L-għoġol għadu żgħir u jredda' minn ommu.",
             "The calf is still small and suckling from its mother."),
            ("Il-bidwi xtara għoġol ġdid biex irabbih għall-ħalib.",
             "The farmer bought a new calf to raise for milk."),
        ],
    },
    "n-għoġol-il-baħar": {
        "text_mt": [
            "Annimal tal-baħar bil-pil, b'denbu qasir u x-xwiek, li jgħix kemm fl-ilma kif ukoll fuq l-art.",
        ],
        "examples": [
            ("Rajna għoġol il-baħar jistrieħ fuq il-blata fix-xemx.",
             "We saw a seal resting on the rock in the sun."),
            ("L-għoġol il-baħar għaddas fil-baħar meta resaqna lejh.",
             "The seal dived into the sea when we approached it."),
        ],
    },
    "n-għożża": {
        "text_mt": [
            "Imħabba u kura ġentili lejn xi ħadd.",
        ],
        "examples": [
            ("It-tifel kiber bl-għożża ta' ommu u missieru.",
             "The child grew up with the cherishing of his mother and father."),
            ("L-għożża li turihom turi kemm tħobbhom.",
             "The affectionate care you show them shows how much you love them."),
        ],
    },
    "n-għuda": {
        "text_mt": [
            "Biċċa injam.",
            "Kull oġġett jew għodda magħmula mill-injam.",
            "Is-Salib ta' Kristu.",
            "Is-Salib tal-injam fejn msammar Kristu.",
        ],
        "examples": [
            ("Qasam l-għuda b'mannara u qabad in-nar.",
             "He split the piece of wood with an axe and lit the fire."),
            ("L-għuda tas-salib hija mqaddsa għall-Insara.",
             "The wood of the cross is sacred to Christians."),
        ],
    },
    "n-għul": {
        "text_mt": [
            "Ħlejqa tal-ħrejjef Għarab li tiekol il-bnedmin u tidher fid-deżert.",
        ],
        "examples": [
            ("Fl-istejjer antiki, l-għul kien jgħix fid-deżert u jiekol lil min jintilef.",
             "In ancient stories, the ghoul used to live in the desert and eat those who got lost."),
            ("L-għul jissemma' f'ħafna rakkonti folkloristiċi.",
             "The ghoul is mentioned in many folkloric tales."),
        ],
    },
    "n-għula": {
        "text_mt": [
            "Ħlejqa mara tal-ħrejjef.",
        ],
        "examples": [
            ("L-għula kienet tħobb tqarraq lit-tfal fl-istejjer.",
             "The female ghoul used to trick children in the stories."),
        ],
    },
    "n-gżejra": {
        "text_mt": [
            "Gżira żgħira.",
        ],
        "examples": [
            ("Kemmuna hija gżejra bejn Malta u Għawdex.",
             "Comino is a small island between Malta and Gozo."),
            ("Iż-żewġ gżejriet ta' San Pawl jinsabu qrib il-baħar.",
             "The two small islands of St Paul are located near the sea."),
        ],
    },
    "n-gżira": {
        "text_mt": [
            "Biċċa art imdawra bl-ilma minn kull naħa.",
        ],
        "examples": [
            ("Malta hija gżira fil-baħar Mediterran.",
             "Malta is an island in the Mediterranean Sea."),
            ("Għawdex hija t-tieni l-ikbar gżira fl-arċipelagu Malti.",
             "Gozo is the second largest island in the Maltese archipelago."),
        ],
    },
    "v-iggverna": {
        "text_mt": [
            "Tmexxi stat jew pajjiż skont il-liġijiet u r-regoli.",
            "Tagħti ordnijiet b'mod awtoritarju.",
        ],
        "examples": [
            ("Il-Prim Ministru ggverna l-pajjiż għal ħames snin.",
             "The Prime Minister governed the country for five years."),
            ("Jiggverna lill-impjegati tiegħu b'idejn iebsa.",
             "He governs his employees with a firm hand."),
        ],
    },
    "n-il-għaqreb": {
        "text_mt": [
            "Kostellazzjoni ta' stilel li tixbaħ lill-għakreb.",
            "It-tmien sinjal taż-Żodjaku.",
        ],
        "examples": [
            ("Il-Għaqreb jidher fid-dbielet tas-sema fis-swiegħed tas-sajf.",
             "Scorpius can be seen in the southern sky on summer nights."),
            ("Tweldet taħt is-sinjal tal-Għaqreb u tħobb l-astroloġija.",
             "She was born under the sign of Scorpio and loves astrology."),
        ],
    },
}

# Tags that are automatically redundant based on entry metadata
def get_redundant_tag_names(entry):
    """Return set of tag names that are redundant given entry metadata."""
    redundant = set()
    if entry.get("pos") == "noun":
        redundant.add("noun")
    if entry.get("is_loanword") == 1:
        redundant.add("loanword")
    if entry.get("gender") == "feminine":
        redundant.add("feminine")
    if entry.get("root_consonants"):
        redundant.add("semitic")
    return redundant


def filter_tags(tags, entry_tags, entry):
    """Remove unapproved and redundant tags."""
    tag_id_to_name = {t["id"]: t["name"] for t in tags}
    tag_name_to_id = {t["name"]: t["id"] for t in tags}

    redundant_names = get_redundant_tag_names(entry)
    remove_ids = set()

    for t in tags:
        name = t["name"]
        tid = t["id"]

        # Remove if not in approved list
        if name not in APPROVED_TAGS:
            # Check if there's a replacement mapping
            if name in TAG_REPLACEMENTS:
                replacement = TAG_REPLACEMENTS[name]
                if replacement is None:
                    remove_ids.add(tid)
                # If there IS a replacement, we keep the tag and rename it
                # (handled below by changing the tag object)
            else:
                remove_ids.add(tid)

        # Remove if redundant
        if name in redundant_names:
            remove_ids.add(tid)

    # Build new tag list, applying replacements
    new_tags = []
    new_entry_tags = []
    for t in tags:
        if t["id"] in remove_ids:
            continue
        name = t["name"]
        # Apply replacement if needed
        if name not in APPROVED_TAGS and name in TAG_REPLACEMENTS and TAG_REPLACEMENTS[name] is not None:
            new_name = TAG_REPLACEMENTS[name]
            new_id = f"tag-{new_name}"
            new_tags.append({"id": new_id, "name": new_name, "category": t.get("category", "Usage"), "description": t.get("description")})
            new_entry_tags.append({"entry_id": entry["id"], "tag_id": new_id})
        else:
            new_tags.append(t)
            new_entry_tags.append({"entry_id": entry["id"], "tag_id": t["id"]})

    return new_tags, new_entry_tags


def process_entry(data):
    """Process a single JSON entry."""
    entry = data["entry"]
    eid = entry["id"]

    # Remove _scratchpad
    if "_scratchpad" in data:
        del data["_scratchpad"]

    # Apply text_mt and usage examples from refinement data
    if eid in REFINEMENTS:
        ref = REFINEMENTS[eid]
        # Set text_mt on each definition
        if entry["definitions"]:
            mt_texts = ref["text_mt"]
            for i, defn in enumerate(entry["definitions"]):
                if i < len(mt_texts):
                    defn["text_mt"] = mt_texts[i]

        # Add usage examples
        if ref["examples"]:
            for mt, en in ref["examples"]:
                entry["usage_examples"].append({
                    "text_mt": mt,
                    "text_en": en,
                })

    # Filter tags
    if "tags" in data and "entry_tags" in data:
        new_tags, new_entry_tags = filter_tags(data["tags"], data["entry_tags"], entry)
        data["tags"] = new_tags
        data["entry_tags"] = new_entry_tags

    # Check for semicolons in text_en / text_mt and split definitions
    new_defs = []
    for defn in entry["definitions"]:
        text_en = defn.get("text_en", "")
        text_mt = defn.get("text_mt", "")

        en_parts = [p.strip() for p in text_en.split(";") if p.strip()]
        mt_parts = [p.strip() for p in text_mt.split(";") if p.strip()] if text_mt else []

        max_parts = max(len(en_parts), len(mt_parts), 1)
        for idx in range(max_parts):
            new_def = {
                "text_en": en_parts[idx] if idx < len(en_parts) else en_parts[-1] if en_parts else text_en,
                "text_mt": mt_parts[idx] if idx < len(mt_parts) else None,
                "register": defn.get("register", ""),
                "nuance": defn.get("nuance", ""),
            }
            new_defs.append(new_def)

    entry["definitions"] = new_defs

    return data


def main():
    entries = []
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    print(f"Read {len(entries)} entries from {INPUT}")

    processed = []
    for data in entries:
        processed.append(process_entry(data))

    # Ensure output directory exists
    import os
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        for data in processed:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")

    print(f"Wrote {len(processed)} entries to {OUTPUT}")

    # ── Stats ──
    total_defs = 0
    total_examples = 0
    removed_scratchpads = 0
    tags_removed_count = 0
    tags_replaced_count = 0
    tags_kept_count = 0
    text_mt_filled = 0
    text_mt_null = 0

    for data in processed:
        entry = data["entry"]
        total_defs += len(entry["definitions"])
        total_examples += len(entry["usage_examples"])
        if "_scratchpad" not in data:
            removed_scratchpads += 1

        for defn in entry["definitions"]:
            if defn.get("text_mt"):
                text_mt_filled += 1
            else:
                text_mt_null += 1

    # Count tag changes
    for data in processed:
        entry = data["entry"]
        eid = entry["id"]
        if eid in REFINEMENTS and eid in {
            "n-għorma", "n-għors", "v-għoxa", "n-għoxb",
            "n-għoxx", "n-għuda", "n-għul", "v-iggverna",
            "n-il-għaqreb"
        }:
            # These entries had tag changes
            pass

    print(f"\n── Stats ──")
    print(f"Entries processed: {len(processed)}")
    print(f"Total definitions: {total_defs}")
    print(f"Definitions with text_mt: {text_mt_filled}")
    print(f"Definitions without text_mt: {text_mt_null}")
    print(f"Total usage examples: {total_examples}")
    print(f"Scratchpads removed: {removed_scratchpads}")

    # Report tag status
    unapproved_found = 0
    for data in processed:
        for t in data.get("tags", []):
            if t["name"] not in APPROVED_TAGS:
                unapproved_found += 1
                print(f"  WARNING: Unapproved tag '{t['name']}' still present in {data['entry']['id']}")

    if unapproved_found == 0:
        print("All remaining tags are from the approved list.")
    else:
        print(f"WARNING: {unapproved_found} unapproved tags remain!")

    print("Done.")


if __name__ == "__main__":
    main()
