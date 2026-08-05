#!/usr/bin/env python3
"""
Refine batch_028.jsonl - ġ- entries (ġemma' through ġennen)

For every entry:
  - Fill null text_mt (Oxford Maltese, capitalised, no circularity, no ;)
  - Generate 1-3 usage examples (Maltese + UK English)
  - Remove _scratchpad
  - Validate tags (approved list only, no redundant tags)
"""

import json
import re
import sys
from pathlib import Path

INPUT = Path(r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_028.jsonl")
OUTPUT = Path(r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_028.jsonl")

# ── Lexicographic data: Maltese definitions, examples ──────────────────────

# Each entry indexed by its 'id' field
REFINEMENTS = {
    "v-ġemma": {
        "definitions": [
            {
                "text_mt": "Ġemma': ħa flus u warrabhom għall-użu fil-ġejjieni",
                "examples": [
                    ("Qed niġma' flus biex nixtri dar.", "I am saving money to buy a house."),
                    ("Huwa ġema' biżżejjed għall-vjaġġ.", "He saved enough for the trip."),
                ]
            },
            {
                "text_mt": "Ġemma': warrab flus regolarment għal skop partikolari",
                "examples": [
                    ("Kull xahar niġma' mitt ewro mill-paga tiegħi.", "Every month I put aside a hundred euros from my salary."),
                ]
            },
            {
                "text_mt": "Ġemma': ġabar flimkien affarijiet mifruxin",
                "examples": [
                    ("Il-bdiewa ġemgħu l-qamħ mill-għelieqi.", "The farmers gathered the wheat from the fields."),
                ]
            },
            {
                "text_mt": "Ġemma': ġabar oġġetti ta' tip partikolari bħala kollezzjoni",
                "examples": [
                    ("Ġbart ġemgħa kbira ta' bolli tal-posta minn madwar id-dinja.", "I collected a large collection of postage stamps from around the world."),
                    ("Ommi ġemgħat dolls qodma ta' kull tip.", "My mother collected old dolls of every kind."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġemmed": {
        "definitions": [
            {
                "text_mt": "Ġemmed: sustanza sewda u trabija li titla' min-nar u titħanex mal-uċuħ",
                "examples": [
                    ("Il-ħajt kien miksi b'saff oħxon ta' ġemmed.", "The wall was covered with a thick layer of soot."),
                ]
            },
            {
                "text_mt": "Ġemmed: tiskurija ta' wiċċ minħabba duħħan jew ħruq",
                "examples": [
                    ("Il-ġemmed fuq il-borma ma tantx kien jitneħħa faċilment.", "The soot on the pot was not easy to remove."),
                ]
            },
            {
                "text_mt": "Ġemmed: sustanza li ssir ħoxna u iebsa bil-ksieh",
                "examples": [
                    ("Iż-żejt sar ġemmed wara li tħalla fil-kesħa.", "The oil turned into a congealed substance after being left in the cold."),
                ]
            },
            {
                "text_mt": "Ġemmed: qerq jew ingann fi tranżazzjoni",
                "examples": [
                    ("Kien hemm ġemmed fil-kuntratt li ħadd ma nduna bih.", "There was a trick in the contract that no one noticed."),
                ]
            },
        ],
        # tag-intransitive AND tag-transitive on same entry is contradictory — remove both
        "tags": [],
    },
    "n-ġenb": {
        "definitions": [
            {
                "text_mt": "Ġenb: in-naħa ta' barra ta' xi ħaġa, il-parti laterali",
                "examples": [
                    ("Poġġejt il-borża ma' ġenb is-siġġu.", "I placed the bag at the side of the chair."),
                    ("Fetaħ bieb fil-ġenb tal-bini.", "He opened a door in the side of the building."),
                ]
            },
            {
                "text_mt": "Ġenb: il-parti tal-ġisem bejn il-kustilji u l-ġenbejn",
                "examples": [
                    ("Ħassejt uġiegħ qawwi f'ġenbi wara l-waqgħa.", "I felt a sharp pain in my side after the fall."),
                ]
            },
        ],
        "tags": [{"id": "tag-anatomy", "name": "anatomy", "category": "Domain", "description": None}],
    },
    "v-ġenbel": {
        "definitions": [
            {
                "text_mt": "Ġenbel: laqat b'daqqa qawwija",
                "examples": [
                    ("Ġenbilu b'qatta' ħabel fuq dahru.", "He struck him with a piece of rope on his back."),
                    ("Il-ħaddiem ġenbel l-imħaba b'martell.", "The worker struck the chisel with a hammer."),
                ]
            },
        ],
        "tags": [],
    },
    "adj-ġenerali": {
        "definitions": [
            {
                "text_mt": "Ġenerali: li jirrigwarda l-biċċa l-kbira; mhux speċifiku",
                "examples": [
                    ("L-idea ġenerali tal-proġett kienet ċara għal kulħadd.", "The general idea of the project was clear to everyone."),
                    ("B'mod ġenerali, il-kundizzjonijiet tjiebu matul is-sena.", "In general, conditions improved over the year."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġeneralità": {
        "definitions": [
            {
                "text_mt": "Ġeneralità: kwalità ta' xi ħaġa li hija ġenerali u mhux speċifika",
                "examples": [
                    ("Id-diskors kien mimli ġeneralitajiet u ma qal xejn konkret.", "The speech was full of generalities and said nothing concrete."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġeneralizzar": {
        "definitions": [
            {
                "text_mt": "Ġeneralizzar: il-proċess li bih wieħed japplika regola wiesgħa bbażata fuq ġabra ta' każijiet partikolari",
                "examples": [
                    ("Il-ġeneralizzar huwa pass importanti fix-xjenza.", "Generalisation is an important step in science."),
                    ("Il-ġeneralizzar mgħaġġel spiss iwassal għal konklużjonijiet żbaljati.", "Hasty generalisation often leads to wrong conclusions."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġeneralizzazzjoni": {
        "definitions": [
            {
                "text_mt": "Ġeneralizzazzjoni: dikjarazzjoni jew konklużjoni wiesgħa bbażata fuq tħaddim ta' prinċipju lil diversi każijiet",
                "examples": [
                    ("Din il-ġeneralizzazzjoni mhix applikabbli għal kull sitwazzjoni.", "This generalisation is not applicable to every situation."),
                    ("Huwa għamel ġeneralizzazzjoni dwar it-tfal kollha abbażi ta' ftit eżempji biss.", "He made a generalisation about all children based on only a few examples."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġeneraliżmu": {
        "definitions": [
            {
                "text_mt": "Ġeneraliżmu: approċċ li bih wieħed jipprova jkollu għarfien wiesa' f'ħafna oqsma minflok speċjalizza f'qasam wieħed",
                "examples": [
                    ("Il-ġeneraliżmu kien apprezzat aktar fi żminijiet antiki.", "Generalisme was more appreciated in ancient times."),
                    ("Fid-dinja moderna, il-ġeneraliżmu spiss iċedi għall-ispeċjalizzazzjoni.", "In the modern world, generalism often gives way to specialisation."),
                ]
            },
        ],
        "tags": [],
    },
    "adv-ġeneralment": {
        "definitions": [
            {
                "text_mt": "Ġeneralment: b'mod ġenerali; fil-biċċa l-kbira tal-każijiet",
                "examples": [
                    ("Ġeneralment, il-ħwienet jagħlqu fil-ħdax ta' billejl.", "Generally, the shops close at eleven at night."),
                    ("Is-sajf f'Malta ġeneralment ikun sħun u niexef.", "Summer in Malta is generally hot and dry."),
                ]
            },
        ],
        "tags": [],
    },
    "adj-ġenerativ": {
        "definitions": [
            {
                "text_mt": "Ġenerativ: li għandu l-abbiltà li jiġġenera, jipproduċi jew joħloq xi ħaġa",
                "examples": [
                    ("Il-lingwistika ġenerattiva tistudja kif il-bniedem jipproduċi u jifhem il-lingwa.", "Generative linguistics studies how humans produce and understand language."),
                    ("L-intelliġenza artifiċjali ġenerattiva toħloq kontenut ġdid bbażat fuq data eżistenti.", "Generative artificial intelligence creates new content based on existing data."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġeneratur": {
        "definitions": [
            {
                "text_mt": "Ġeneratur: magna jew apparat li jipproduċi l-elettriku jew enerġija oħra",
                "examples": [
                    ("Il-ġeneratur beda jaħdem waqt il-waqfien tad-dawl.", "The generator started working during the power cut."),
                    ("Ġeneratur ġdid ġie installat fl-istazzjon tal-enerġija.", "A new generator was installed at the power station."),
                ]
            },
        ],
        "tags": [
            {"id": "tag-electricity", "name": "electricity", "category": "Usage", "description": None},
            {"id": "tag-engineering", "name": "engineering", "category": "Usage", "description": None},
        ],
    },
    "n-ġenerazzjoni": {
        "definitions": [
            {
                "text_mt": "Ġenerazzjoni: il-grupp kollu ta' nies imwielda u li jgħixu fi żmien wieħed",
                "examples": [
                    ("Il-ġenerazzjoni l-ġdida għandha teknoloġija li n-naħna ma kellniex.", "The new generation has technology that we did not have."),
                    ("Din it-tradizzjoni għaddiet minn ġenerazzjoni għal oħra.", "This tradition passed from one generation to another."),
                ]
            },
        ],
        "tags": [],
    },
    "adj-ġenetiku": {
        "definitions": [
            {
                "text_mt": "Ġenetiku: relatat mal-ġeni u l-wirt bijoloġiku",
                "examples": [
                    ("Il-marda għandha bażi ġenetika qawwija.", "The disease has a strong genetic basis."),
                    ("L-istudji ġenetiċi għenu biex nifhmu aħjar l-istorja tal-bniedem.", "Genetic studies helped us better understand human history."),
                ]
            },
        ],
        "tags": [
            {"id": "tag-genetics", "name": "genetics", "category": "Usage", "description": None},
        ],
    },
    "adj-ġenitali": {
        "definitions": [
            {
                "text_mt": "Ġenitali: relatat mal-organi riproduttivi esterni",
                "examples": [
                    ("L-iġjene ġenitali hija importanti għas-saħħa ġenerali.", "Genital hygiene is important for overall health."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġenitali": {
        "definitions": [
            {
                "text_mt": "Ġenitali: l-organi riproduttivi esterni tal-bniedem u l-annimali",
                "examples": [
                    ("It-tabib spjega l-anatomija tal-ġenitali umani.", "The doctor explained the anatomy of the human genitalia."),
                ]
            },
        ],
        "tags": [
            {"id": "tag-plural-only", "name": "plural only", "category": "Usage", "description": None},
        ],
    },
    "n-ġenitur": {
        "definitions": [
            {
                "text_mt": "Ġenitur: missier jew omm wieħed",
                "examples": [
                    ("Iż-żewġ ġenituri attendew għal-laqgħa tal-iskola.", "Both parents attended the school meeting."),
                    ("Kull ġenitur irid jieħu ħsieb it-tfal tiegħu.", "Every parent must take care of his or her children."),
                    ("Il-ġenituri tiegħi għallmuni l-valuri importanti tal-ħajja.", "My parents taught me the important values of life."),
                ]
            },
        ],
        "tags": [],
    },
    "adj-ġenjali": {
        "definitions": [
            {
                "text_mt": "Ġenjali: li juri kreattività kbira u intelliġenza oerhört brillanti",
                "examples": [
                    ("Idea ġenjali waslitlu f'mument ta' ispirazzjoni.", "A brilliant idea came to him in a moment of inspiration."),
                ]
            },
            {
                "text_mt": "Ġenjali: li jagħmel pjaċir u jqanqal simpatija fl-oħrajn",
                "examples": [
                    ("Huwa persuna ġenjali li kulħadd iħobb.", "He is a pleasant person whom everyone likes."),
                ]
            },
        ],
        # Remove tag-relational: "relational" (X related to Y) doesn't match
        # the semantics "brilliant/ingenious" or "pleasant"
        "tags": [],
    },
    "n-ġenjalità": {
        "definitions": [
            {
                "text_mt": "Ġenjalità: il-kwalità li wieħed ikun simpatiku, pjaċevoli u akkoljenti",
                "examples": [
                    ("Il-ġenjalità tiegħu għamlet il-laqgħa pjaċevoli għal kulħadd.", "His likeability made the meeting pleasant for everyone."),
                    ("Dejjem nilqa' n-nies b'ġenjalità u tbissima.", "I always welcome people with warmth and a smile."),
                ]
            },
        ],
        "tags": [],
    },
    "adv-ġenjalment": {
        "definitions": [
            {
                "text_mt": "Ġenjalment: b'mod intelliġenti, oriġinali u kreattiv",
                "examples": [
                    ("Hi solviet il-problema ġenjalment fi ftit minuti biss.", "She solved the problem ingeniously in just a few minutes."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġenn": {
        "definitions": [
            {
                "text_mt": "Ġenn: stat fejn wieħed jitlef ir-raġuni u l-kapaċità li jaħseb b'mod ċar",
                "examples": [
                    ("Il-ġenn tiegħu kien dovut għall-istress u n-nuqqas ta' rqad.", "His madness was due to stress and lack of sleep."),
                    ("Il-film juri l-vjaġġ ta' raġel fil-ġenn.", "The film shows a man's journey into madness."),
                ]
            },
            {
                "text_mt": "Ġenn: nuqqas totali ta' ordni, loġika jew ċarezza",
                "examples": [
                    ("Kien hemm ġenn fit-toroq wara l-attakk.", "There was chaos in the streets after the attack."),
                ]
            },
        ],
        "tags": [],
    },
    "n-ġenna": {
        "definitions": [
            {
                "text_mt": "Ġenna: il-ġnien ta' l-għaxqa fejn għexu Adam u Eva skont it-tradizzjoni",
                "examples": [
                    ("Il-ġrajja ta' Adam u Eva fil-ġenna hija magħrufa mad-dinja kollha.", "The story of Adam and Eve in paradise is known throughout the world."),
                ]
            },
            {
                "text_mt": "Ġenna: post ta' hena etern fejn imorru l-erwieħ tal-ġusti wara l-mewt",
                "examples": [
                    ("Skont it-twemmin Nisrani, min imut fil-grazzja ta' Alla jmur il-ġenna.", "According to Christian belief, whoever dies in God's grace goes to heaven."),
                ]
            },
            {
                "text_mt": "Ġenna: post jew esperjenza ta' hena u ferħ perfett",
                "examples": [
                    ("Kienet ġenna li tqatta' l-vaganzi ma' ħbiebek.", "It was paradise to spend the holidays with your friends."),
                ]
            },
        ],
        # Remove tag-also-religion: redundant when tag-religion is already present
        "tags": [
            {"id": "tag-religion", "name": "religion", "category": "Domain", "description": None},
        ],
    },
    "n-ġennata": {
        "definitions": [
            {
                "text_mt": "Ġennata: azzjoni iblah jew bla sens li turi nuqqas ta' ġudizzju",
                "examples": [
                    ("Kienet ġennata li ħalliet il-bieb miftuħ għall-barranin.", "It was a foolish act that she left the door open for strangers."),
                ]
            },
            {
                "text_mt": "Ġennata: wieħed mill-ġennati, imġieba li ma tagħmilx sens",
                "examples": [
                    ("Li tixrob l-ilma baħar hija ġennata perikoluża.", "Drinking seawater is a dangerous foolish act."),
                ]
            },
        ],
        "tags": [],
    },
    "v-ġenneb": {
        "definitions": [
            {
                "text_mt": "Ġenneb: warrab xi ħaġa jew ħalla minn naħa għall-użu aktar tard",
                "examples": [
                    ("Ġennejt xi ftit mill-ikel għal għada.", "I put aside some of the food for tomorrow."),
                    ("Huwa ġenneb il-ġurnal biex jaqrah wara.", "He put the newspaper aside to read later."),
                ]
            },
            {
                "text_mt": "Ġenneb: ħelef flus billi nefaq inqas milli kien imdorri",
                "examples": [
                    ("Qed niġenneb kull xahar biex insiefer fis-sajf.", "I am saving money every month to travel in summer."),
                ]
            },
        ],
        "tags": [],
    },
    "v-ġennen": {
        "definitions": [
            {
                "text_mt": "Ġennen: ġiegħel lil xi ħadd jitlef ir-raġuni jew il-kontroll tiegħu",
                "examples": [
                    ("L-istress qed jiġennen lin-nies f'dan il-ħin tal-eżamijiet.", "The stress is driving people crazy at this exam time."),
                    ("Il-ħsejjes qawwija ġennnu lill-ġar il-qadim.", "The loud noises drove the old neighbour crazy."),
                ]
            },
            {
                "text_mt": "Ġennen: ħawwad lil xi ħadd, għamlu jitlef il-ħila li jaħseb b'mod razzjonali",
                "examples": [
                    ("L-aħbar kienet biżżejjed biex tiġġennu u ma jibqax jaf x'jagħmel.", "The news was enough to confuse him and leave him not knowing what to do."),
                ]
            },
        ],
        "tags": [],
    },
}


def validate_and_clean_tags(tags_list, entry_id):
    """Remove redundant or contradictory tags."""
    if not tags_list:
        return []

    allowed_categories = {"Usage", "Domain"}
    allowed_ids = {
        "tag-anatomy", "tag-electricity", "tag-engineering",
        "tag-genetics", "tag-plural-only", "tag-religion",
        "tag-physics", "tag-intransitive", "tag-transitive",
        "tag-relational", "tag-also-religion",
    }

    cleaned = []
    seen_ids = set()

    for tag in tags_list:
        tag_id = tag.get("id", "")
        tag_cat = tag.get("category", "")

        # Skip tags with non-standard categories
        if tag_cat and tag_cat not in allowed_categories:
            continue

        # Skip unknown tag IDs
        if not tag_id or tag_id not in allowed_ids:
            continue

        # Check for contradictions: intransitive + transitive
        if tag_id == "tag-intransitive" and "tag-transitive" in seen_ids:
            continue
        if tag_id == "tag-transitive" and "tag-intransitive" in seen_ids:
            continue

        # Check for redundant: tag-also-religion when tag-religion is present
        if tag_id == "tag-also-religion" and "tag-religion" in seen_ids:
            continue

        cleaned.append(tag)
        seen_ids.add(tag_id)

    return cleaned


def process_entry(entry_obj):
    """Process a single entry from the batch."""
    entry_data = entry_obj.get("entry", {})
    entry_id = entry_data.get("id", "")

    # Remove _scratchpad
    entry_obj.pop("_scratchpad", None)

    # Get refinements for this entry
    ref = REFINEMENTS.get(entry_id, None)

    if ref:
        # Update definitions with Maltese text and examples
        defs = entry_data.get("definitions", [])
        for i, d in enumerate(defs):
            if i < len(ref["definitions"]):
                rd = ref["definitions"][i]
                d["text_mt"] = rd["text_mt"]

        # Clear existing examples and add new ones
        entry_data["usage_examples"] = []
        for rd in ref["definitions"]:
            for ex_mt, ex_en in rd.get("examples", []):
                entry_data["usage_examples"].append({
                    "maltese": ex_mt,
                    "english": ex_en,
                })

        # Update tags
        new_tags = ref.get("tags", [])
        entry_obj["tags"] = new_tags

        # Update entry_tags
        entry_obj["entry_tags"] = []
        for tag in new_tags:
            entry_obj["entry_tags"].append({
                "entry_id": entry_id,
                "tag_id": tag["id"],
            })
    else:
        # No refinements defined — just clear scratchpad and null text_mt
        defs = entry_data.get("definitions", [])
        for d in defs:
            if d.get("text_mt") is None:
                d["text_mt"] = ""

    # Validate tags regardless
    entry_obj["tags"] = validate_and_clean_tags(entry_obj.get("tags", []), entry_id)
    entry_obj["entry_tags"] = validate_and_clean_tags(entry_obj.get("entry_tags", []), entry_id)

    return entry_obj


def main():
    # Read input
    entries = []
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entries.append(json.loads(line))

    total = len(entries)
    updated_defs = 0
    updated_examples = 0
    tags_removed = 0
    scratchpad_removed = 0

    # Process
    processed = []
    for entry in entries:
        before_tags = len(entry.get("tags", []))
        if "_scratchpad" in entry:
            scratchpad_removed += 1

        processed_entry = process_entry(entry)
        after_tags = len(processed_entry.get("tags", []))

        # Count stats
        if before_tags > after_tags:
            tags_removed += (before_tags - after_tags)

        defs = processed_entry.get("entry", {}).get("definitions", [])
        for d in defs:
            if d.get("text_mt"):
                updated_defs += 1

        exs = processed_entry.get("entry", {}).get("usage_examples", [])
        updated_examples += len(exs)

        processed.append(processed_entry)

    # Write output
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for entry in processed:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    # Report
    print(f"Batch 028 refinement complete.")
    print(f"  Total entries:              {total}")
    print(f"  Scratchpad removed:         {scratchpad_removed}")
    print(f"  Definitions with text_mt:   {updated_defs}")
    print(f"  Usage examples generated:    {updated_examples}")
    print(f"  Redundant/contradictory tags removed: {tags_removed}")
    print(f"  Output: {OUTPUT}")


if __name__ == "__main__":
    main()
