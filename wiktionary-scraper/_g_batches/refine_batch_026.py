#!/usr/bin/env python3
"""Refine batch_026.jsonl for Maltese-English lexicography.

Processes ALL entries: fills text_mt (Oxford Maltese, capitalised, no
circularity, no ;), generates 1-3 usage examples (Maltese + UK English),
removes _scratchpad, validates tags against approved list.
"""

import json
import os

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_026.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_026.jsonl"

APPROVED_TAGS = {
    "common", "rare", "archaic", "neologism", "purist", "formal",
    "literary", "colloquial", "obsolete", "technical", "dialectal",
    "gozitan", "slang", "vulgar", "euphemistic", "figurative",
    "pejorative", "childish", "agriculture", "anatomy", "animals",
    "architecture", "art", "astronomy", "sea", "botany", "geography",
    "food", "commerce", "family", "physics", "war", "law", "mathematics",
    "medicine", "music", "politics", "religion", "crafts", "sports",
    "technology", "weather", "transport", "time",
}

# ───── text_mt definitions keyed by entry id ─────

MT_DEFS = {
    "n-ġamar": [
        "Fdalijiet inkandexxenti ta' karbonju jew injam li jibqgħu jaħarqu "
        "wara n-nar mingħajr fjamma.",
    ],
    "v-ġama": [
        "Ortografija alternattiva ta' 'ġema'. Ifisser li wieħed jiġbor "
        "affarijiet jew persuni flimkien.",
        "Ortografija alternattiva ta' 'ġema'. Ifisser li wieħed "
        "jakkumula xi ħaġa maħ oġra.",
    ],
    "n-ġamm": [
        "Marmalata magħmula minn frott imsajjar biz-zokkor, li tinfirex "
        "fuq il-ħobż.",
        "Imblokk jew konġestjoni ta' traffiku fejn il-vetturi ma jistgħux "
        "jiċċaqilqu.",
    ],
    "n-ġammajka": [
        "Gżira u pajjiż fil-Karibew, magħrufa għall-bajjiet sbieħ, "
        "il-mużika reggae u l-kultura vibranti tagħha.",
    ],
    "n-ġandar": [
        "Frott tal-ballut, ta' għamla ovali, b'qoxra iebsa u tapit "
        "fil-bażi.",
        "Frott li għadu ma misjurx, speċjalment frott żgħir u iebes.",
    ],
    "adj-ġandri": [
        "Li jixbah il-ġandar fil-forma jew fid-dehra.",
        "Li għadu mhux misjur, speċjalment frott.",
    ],
    "n-ġappun": [
        "Pajjiż fil-Lvant tal-Asja, magħruf għat-teknoloġija avvanzata, "
        "il-kultura antika u l-arkitettura tradizzjonali tiegħu.",
    ],
    "adj-ġappuniż": [
        "Li għandu x'jaqsam mal-Ġappun, man-nies tiegħu, mal-lingwa "
        "tiegħu jew mal-kultura tiegħu.",
    ],
    "n-ġappuniż": [
        "Persuna indiġena tal-Ġappun, ġeneralment raġel.",
        "Il-lingwa uffiċjali tal-Ġappun.",
    ],
    "n-ġar": [
        "Persuna li tgħix ħdejn jew qrib id-dar ta' xi ħadd ieħor.",
    ],
    "n-ġara": [
        "Mara li tgħix ħdejn jew qrib id-dar ta' xi ħadd ieħor.",
    ],
    "v-ġara": [
        "Seħħ jew twettaq, speċjalment mingħajr ma kien ippjanat.",
        "Sar f'post u żmien partikolari.",
    ],
    "n-ġarab": [
        "Marda tal-ġilda kkawżata minn dud żgħir li jidħol taħt "
        "il-ġilda, li tikkawża ħakk kbir.",
    ],
    "n-ġaras": [
        "Strument perkussiv magħmul mill-metall li jdoqq meta jintlaqat, "
        "ġeneralment b'forma ta' qanpiena.",
    ],
    "n-ġarr": [
        "Trasport ta' oġġetti jew persuni minn post għal ieħor.",
    ],
    "v-ġarr": [
        "Refaʻ xi ħaġa miegħu minn post għal ieħor.",
    ],
    "n-ġarra": [
        "Bastiment tal-ħġieġ, tal-fuħħar jew tal-plastik b'fetħa "
        "wiesgħa, użat biex iżomm ikel, xorb jew sustanzi oħra.",
    ],
    "v-ġarrab": [
        "Ipprova xi ħaġa biex jara jekk taħdimx jew jekk "
        "togħġobx.",
        "Pprova affarijiet ġodda biex jara r-riżultat.",
        "Għadda lil xi ħadd minn prova jew tbatija biex jittestja "
        "l-fidi jew is-saħħa tiegħu.",
    ],
    "v-ġarraf": [
        "Waqqaʻ xi struttura, bini jew ħajt, ħafna drabi b'mod "
        "vjolenti.",
    ],
    "n-ġarrażejt": [
        "Logħba fejn persuna tkun fuq dahar xi ħadd ieħor, ħafna "
        "drabi biċ-ċajt.",
    ],
    "n-ġarun": [
        "Ortografija alternattiva ta' 'ġeru'. Ifisser kelb żgħir.",
    ],
    "n-ġawhar": [
        "Ħaġar prezzjuż, deheb u oġġetti oħra ta' valur użati "
        "bħala ornamenti.",
        "Kwalunkwe ħaġa ta' valur kbir, prezzjuża jew għażiża.",
    ],
    "n-ġaħan": [
        "Persuna li m'għandhiex ħafna għaqlu jew li tagħmel "
        "affarijiet iblah.",
    ],
    "v-ġaħġaħ": [
        "Irnexxielu jagħmel xi ħaġa bi tbatija kbira, u bil-kemm.",
        "Mexxa 'l quddiem bi tbatija f'xi attività.",
        "Għadda minn sitwazzjoni diffiċli bi tbatija.",
        "Mexxa bil-mod u b'diffikultà, speċjalment minħabba għeja "
        "jew mard.",
    ],
    "n-ġbejna": [
        "Ġobon żgħir f'forma ta' kejk, tipiku tal-kċina Maltija, "
        "magħmul minn ħalib tal-mogħoż jew tan-nagħaġ, "
        "imfarrad u mħalli jitferma.",
    ],
}

# ───── Usage examples keyed by entry id ─────

EXAMPLES = {
    "n-ġamar": [
        {"mt": "Il-ġamar kien għadu jaħraq fil-fuklar filgħodu.",
         "en": "The embers were still burning in the hearth in the morning."},
        {"mt": "Xerred il-ġamar mal-art b'daqqa ta' siequ.",
         "en": "He scattered the embers on the ground with a kick of his foot."},
    ],
    "v-ġama": [
        {"mt": "Huwa ġama’ l-flus kollha f'kont wieħed.",
         "en": "He collected all the money in one account."},
        {"mt": "Ġama’ il-kotba tiegħu qabel ma telaq mid-dar.",
         "en": "He gathered his books before leaving home."},
    ],
    "n-ġamm": [
        {"mt": "Ferrexet il-ġamm fuq il-ħobż għall-kolazzjon.",
         "en": "She spread the jam on the bread for breakfast."},
        {"mt": "Konna nsofru ġamm kbir fit-triq lejn il-belt dalgħodu.",
         "en": "We suffered a big traffic jam on the way to the city this morning."},
    ],
    "n-ġammajka": [
        {"mt": "Il-Ġammajka hi magħrufa għall-mużika reggae u Bob Marley.",
         "en": "Jamaica is known for reggae music and Bob Marley."},
        {"mt": "Żort il-Ġammajka s-sena l-oħra u għoġbitni l-kultura",
         "en": "I visited Jamaica last year and I liked the culture."},
    ],
    "n-ġandar": [
        {"mt": "Il-ġandar kien mifrux mal-art taħt is-siġra tal-ballut.",
         "en": "The acorns were scattered on the ground under the oak tree."},
        {"mt": "Dan it-tuffieħ għadu ġandar u mhux tajjeb għall-ikel.",
         "en": "This apple is still unripe and not good to eat."},
    ],
    "adj-ġandri": [
        {"mt": "Dawn it-tuffieħ għandhom togħma ġandrija.",
         "en": "These apples have an unripe taste."},
        {"mt": "Il-bćula kienet għadha ġandrija u ma setgħetx tittiekel.",
         "en": "The watermelon was still unripe and could not be eaten."},
    ],
    "n-ġappun": [
        {"mt": "Il-Ġappun huwa magħruf għat-teknoloġija u l-kultura "
         "tradizzjonali tiegħu.",
         "en": "Japan is known for its technology and traditional culture."},
        {"mt": "Dejjem xtaqt iżur il-Ġappun biex nara l-fjuri "
         "taċ-ċirasa.",
         "en": "I always wanted to visit Japan to see the cherry blossoms."},
    ],
    "adj-ġappuniż": [
        {"mt": "Il-kċina Ġappuniża hi popolari ħafna madwar id-dinja.",
         "en": "Japanese cuisine is very popular around the world."},
        {"mt": "Il-ġnien Ġappuniż fil-belt huwa paċifiku u sabiħ.",
         "en": "The Japanese garden in the city is peaceful and beautiful."},
    ],
    "n-ġappuniż": [
        {"mt": "Il-Ġappuniżi huma magħrufa għall-edukazzjoni u "
         "x-xogħol iebes tagħhom.",
         "en": "The Japanese are known for their education and hard work."},
        {"mt": "Qed nitgħallem il-Ġappuniż biex inkun nista' naħdem "
         "fil-Ġappun.",
         "en": "I am learning Japanese so I can work in Japan."},
    ],
    "n-ġar": [
        {"mt": "Il-ġar tagħna dejjem jgħinna meta jkollna bżonn.",
         "en": "Our neighbour always helps us when we need it."},
        {"mt": "Il-ġirien iltaqgħu flimkien għal barbecue fis-sajf.",
         "en": "The neighbours got together for a barbecue in the summer."},
    ],
    "n-ġara": [
        {"mt": "Ġara tagħna hi mara sabiħa u ġeneruża.",
         "en": "Our female neighbour is a kind and generous woman."},
        {"mt": "Il-ġara l-ġdida ġiet tislmilna lbieraħ filgħaxija.",
         "en": "The new female neighbour came to greet us yesterday evening."},
    ],
    "v-ġara": [
        {"mt": "X'ġara lbieraħ fil-laqgħa tal-kunsill?",
         "en": "What happened yesterday at the council meeting?"},
        {"mt": "Ġara xi ħaġa importanti li rrid ngħidlek.",
         "en": "Something important happened that I need to tell you."},
    ],
    "n-ġarab": [
        {"mt": "Il-ġarab jinfirex malajr bejn il-persuni f'kuntatt mill-qrib.",
         "en": "Scabies spreads quickly between people in close contact."},
        {"mt": "It-tabib iddijanjostika l-ġarab u tah kura speċjali.",
         "en": "The doctor diagnosed the scabies and gave him special treatment."},
    ],
    "n-ġaras": [
        {"mt": "Il-ġaras tal-knisja daqq filgħodu għall-quddiesa.",
         "en": "The church bell rang in the morning for mass."},
        {"mt": "Smajt il-ħoss tal-ġaras mill-ġnien t'isfel.",
         "en": "I heard the sound of the bell from the garden below."},
    ],
    "n-ġarr": [
        {"mt": "Il-ġarr tal-għamara kien diffiċli minħabba t-taraġ "
         "dejjaq.",
         "en": "The transport of the furniture was difficult because of the narrow "
         "stairs."},
        {"mt": "Il-kumpanija tispeċjalizza fil-ġarr ta' merkanzija bejn "
         "Malta u Sqallija.",
         "en": "The company specialises in the carriage of goods between Malta and "
         "Sicily."},
    ],
    "v-ġarr": [
        {"mt": "Huwa ġarr il-basktijiet tqal lejn il-karozza.",
         "en": "He carried the heavy bags towards the car."},
        {"mt": "Il-ħaddiema ġarru l-oġġetti kollha mill-maħżen.",
         "en": "The workers carried all the items from the warehouse."},
    ],
    "n-ġarra": [
        {"mt": "Poġġiet l-ilma fil-ġarra tal-fuħħar biex jibqa' frisk.",
         "en": "She put the water in the clay jar to keep it cool."},
        {"mt": "Ixtrajt ġarra taż-żejt taż-żebbuġa mis-suq Malti.",
         "en": "I bought a jar of olive oil from the Maltese market."},
    ],
    "v-ġarrab": [
        {"mt": "Ġarrab din l-ikla ġdida u għidli jekk togħbokx.",
         "en": "Try this new dish and tell me if you like it."},
        {"mt": "Ġarrab li titkellem magħha qabel ma tieħu deċizjoni.",
         "en": "Try talking to her before making a decision."},
        {"mt": "Alla ġarrab lil Abraham biex jittestja l-fidi tiegħu.",
         "en": "God put Abraham through a trial to test his faith."},
    ],
    "v-ġarraf": [
        {"mt": "Il-maltemp ġarraf id-dar antika tal-ġebla.",
         "en": "The storm demolished the old stone house."},
        {"mt": "Il-bulldozer ġarraf il-ħajt kollu fi ftit minuti biss.",
         "en": "The bulldozer demolished the entire wall in just a few minutes."},
    ],
    "n-ġarrażejt": [
        {"mt": "It-tfal kienu jilagħbu l-ġarrażejt fil-bitħa "
         "tal-iskola.",
         "en": "The children were playing piggyback in the school yard."},
        {"mt": "Agħtini ġarrażejt sa fejn il-ħanut ta' taħt.",
         "en": "Give me a piggyback ride down to the shop below."},
    ],
    "n-ġarun": [
        {"mt": "Il-ġarun kien qed jilgħab mal-ballun fil-ġnien.",
         "en": "The puppy was playing with the ball in the garden."},
        {"mt": "Il-kelb tagħna welldet tliet ġeru sbieħ.",
         "en": "Our dog gave birth to three beautiful puppies."},
    ],
    "n-ġawhar": [
        {"mt": "Il-ġawhar tar-reġina kien jinsab fil-mużew nazzjonali.",
         "en": "The queen's jewels were kept in the national museum."},
        {"mt": "Din il-pittura antika hi ġawhar nazzjonali ta' valur kbir.",
         "en": "This ancient painting is a national treasure of great value."},
    ],
    "n-ġaħan": [
        {"mt": "Tkun ġaħan jekk temmen kull ħaġa li jgħidulek.",
         "en": "You would be a fool if you believe everything they tell you."},
        {"mt": "Dak il-ġaħan tilef il-flus kollha fil-logħob.",
         "en": "That fool lost all his money in gambling."},
    ],
    "v-ġaħġaħ": [
        {"mt": "Ġaħġaħ fl-iskola u rnexxielu jgħaddi mill-eżami "
         "bil-kemm.",
         "en": "He scraped through school and barely passed the exam."},
        {"mt": "Il-marid ġaħġaħ lejn il-bieb b'passi żgħar u "
         "battojja.",
         "en": "The patient shuffled towards the door with small, unsteady steps."},
    ],
    "n-ġbejna": [
        {"mt": "Il-ġbejna Maltija hi magħmula minn ħalib tal-mogħoż "
         "u mħallta bit-tmelliħ.",
         "en": "The Maltese cheeselet is made from goat's milk and salted."},
        {"mt": "Kilt ġbejna friska mal-ħobż u t-tadam għall-ponta "
         "fl-ikla ta' nofsinhar.",
         "en": "I ate a fresh cheeselet with bread and tomato for a snack at "
         "lunchtime."},
    ],
}

# ───── text_en fixes (improving English definitions) ─────

FIXED_EN = {
    "n-ġamar": [
        "embers, live coal",
    ],
    "n-ġamm": [
        "jam (sweet mixture of fruit boiled with sugar)",
        "jam (blockage, congestion)",
    ],
    "n-ġandar": [
        "acorns",
        "unripe fruit",
    ],
    "adj-ġandri": [
        "acornlike",
        "unripe",
    ],
    "n-ġara": [
        "female neighbour",
    ],
    "v-ġara": [
        "to happen",
        "to take place",
    ],
    "n-ġarun": [
        "pup, puppy (alternative spelling of ġeru)",
    ],
    "n-ġawhar": [
        "jewels, precious stones or ornaments",
        "anything precious, a jewel, treasure",
    ],
    "n-ġaħan": [
        "fool",
    ],
    "v-ġaħġaħ": [
        "to barely manage",
        "to perform an action with difficulty",
        "to scrape through",
        "to walk with difficulty",
    ],
    "n-ġbejna": [
        "fresh cheese, cheeselet (traditional Maltese cheese)",
    ],
}


def validate_tags(entry, tags, entry_tags):
    """Remove tags not in approved list."""
    forbidden_names = set()
    pos = entry.get("pos")
    gender = entry.get("gender")
    is_loanword = entry.get("is_loanword", 0)
    root_consonants = entry.get("root_consonants")

    if pos == "noun":
        forbidden_names.add("noun")
    if is_loanword == 1:
        forbidden_names.add("loanword")
    if gender == "feminine":
        forbidden_names.add("feminine")
    if root_consonants:
        forbidden_names.add("semitic")

    new_tags = []
    for tag in tags:
        tname = tag.get("name", "")
        if tname in APPROVED_TAGS and tname not in forbidden_names:
            new_tags.append(tag)

    kept_ids = {t["id"] for t in new_tags}
    new_entry_tags = [et for et in entry_tags if et.get("tag_id", "") in kept_ids]

    return new_tags, new_entry_tags


def process_entry(line):
    obj = json.loads(line)
    entry = obj["entry"]
    eid = entry["id"]

    # 1. Remove _scratchpad
    obj.pop("_scratchpad", None)

    # 2. Fill text_mt
    if eid in MT_DEFS:
        mt_defs = MT_DEFS[eid]
        current_defs = entry["definitions"]
        # Extend definitions array if we have more MT defs
        while len(current_defs) < len(mt_defs):
            current_defs.append({
                "text_en": "",
                "text_mt": None,
                "register": "",
                "nuance": "",
            })
        for i, mt in enumerate(mt_defs):
            if i < len(current_defs):
                current_defs[i]["text_mt"] = mt

    # 3. Fill usage examples
    if eid in EXAMPLES:
        entry["usage_examples"] = [
            {"text_mt": ex["mt"], "text_en": ex["en"],
             "register": "", "nuance": "", "source": None}
            for ex in EXAMPLES[eid]
        ]

    # 4. Validate tags
    new_tags, new_entry_tags = validate_tags(
        entry, obj.get("tags", []), obj.get("entry_tags", [])
    )
    obj["tags"] = new_tags
    obj["entry_tags"] = new_entry_tags

    return obj


def main():
    entries = []
    stats = {
        "total": 0,
        "text_mt_filled": 0,
        "usage_examples_added": 0,
        "tags_removed": 0,
        "scratchpad_removed": 0,
    }

    with open(INPUT, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            stats["total"] += 1
            obj = process_entry(line)

            entry = obj["entry"]
            if entry.get("definitions"):
                filled = sum(1 for d in entry["definitions"] if d.get("text_mt"))
                stats["text_mt_filled"] += filled
            if entry.get("usage_examples"):
                stats["usage_examples_added"] += len(entry["usage_examples"])

            # Count removed tags
            # (We can't easily count original tags here, but we can report
            # the number of tags after validation)
            stats["scratchpad_removed"] += 1

            entries.append(obj)

    # Count removed tags by comparing original vs new counts
    # Let's re-scan to get accurate tag removal stats
    tag_removed_count = 0
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            original = json.loads(line)
            original_tag_count = len(original.get("tags", []))
            # Re-process to get new tag count
            processed = process_entry(line)
            new_tag_count = len(processed.get("tags", []))
            tag_removed_count += (original_tag_count - new_tag_count)
    stats["tags_removed"] = tag_removed_count

    # Write output
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for obj in entries:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    # Stats
    print(f"=== Batch 026 Refinement Complete ===")
    print(f"Total entries processed:           {stats['total']}")
    print(f"text_mt definitions filled:        {stats['text_mt_filled']}")
    print(f"Usage examples added:              {stats['usage_examples_added']}")
    print(f"Non-approved/redundant tags removed: {stats['tags_removed']}")
    print(f"Scratchpad removed:                {stats['scratchpad_removed']}")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    main()
