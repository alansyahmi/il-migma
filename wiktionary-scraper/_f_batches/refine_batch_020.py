#!/usr/bin/env python3
"""
Refine batch_020.jsonl: fill text_mt, generate examples, validate tags,
remove _scratchpad, split semicolons, output clean JSONL.
"""

import json
import sys

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_f_batches\batch_020.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_f_batches\refined\batch_020.jsonl"

APPROVED_TAGS = frozenset({
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time"
})

# Tags to remap (old_name -> new_name or None to remove)
TAG_MAP = {
    "phonetics": None,         # remove – not in approved list
    "military": "war",         # map
    "alternative-form": None,  # remove
    "figuratively": "figurative",  # map
}

# ============================================================
# text_mt: Oxford-style Maltese definitions (Genus + Differentia)
# ============================================================

DEFINITIONS_MT = {
    # --- frekwentattiv (adjective) ---
    "frequentative": "Li jindika jew juri li azzjoni ssir b'mod ripetut jew frekwenti, relatat mal-forma verbali li tesprimi azzjoni mtennija",

    # --- frekwentatur (noun, masculine) ---
    "frequenter": "Persuna li tmur spiss f'post partikolari jew li tattendi regolarment għal xi attività",

    # --- frekwentement (adverb) ---
    "frequently": "B'mod frekwenti, spiss jew b'intervalli qosra",

    # --- frekwenti (adjective) ---
    "frequent": "Li jiġri jew iseħħ spiss, li jsir b'intervalli qosra ta' żmien",

    # --- frekwenza (noun, feminine) ---
    "frequency": "In-numru ta' drabi li xi ħaġa sseħħ f'perjodu partikolari ta' żmien",
    "attendance": "In-numru ta' persuni li jattendu għal xi avveniment, skola, laqgħa jew attività",

    # --- friegħ (verb) ---
    "to become empty": "Sar vojt, tilef l-oġġetti, in-nies jew il-kontenut kollu li kellu",

    # --- friex (noun, masculine) ---
    "bedding, especially the bedsheet": "Drapp jew materjal li jitqiegħed fuq is-sodda biex jorqdu fuqu, speċjalment il-lożor",

    # --- frigħ (noun, masculine) - verbal noun of forogħ ---
    "verbal noun of forogħ": "L-azzjoni ta' meta xi ħaġa ssir vojta, it-tbattil jew l-irtirar tal-baħar mill-kosta waqt il-marea baxxa",

    # --- frikativ (adjective) ---
    "fricative": "Li għandu x'jaqsam ma' konsonanti li tipproduċi ħoss ta' frizzjoni meta tgħaddi l-arja minn fetħa dejqa fil-passaġġ vokali",

    # --- frisk (adjective) ---
    "fresh": "Li għadu kemm sar, inġabar, inħasad jew inkiseb, mhux antik u mhux qadim",
    "cool": "Li għandu temperatura pjaċevoli baxxa imma mhux kiesħa, li jagħti sensazzjoni ta' frisk",

    # --- frix (noun, masculine) - verbal noun of firex ---
    "verbal noun of firex": "It-tixrid jew il-firxa ta' xi ħaġa fuq wiċċ, l-azzjoni li xi ħaġa tinfirex",

    # --- frizzjoni (noun, feminine) ---
    "friction": "Ir-reżistenza li tiġi ġġenerata meta wiċċ ta' oġġett jiżżerżaq fuq wiċċ ieħor, l-attrizzjoni",

    # --- friġġ (noun, masculine) ---
    "fridge, refrigerator": "Apparat elettriku domestiku użat biex iżomm l-ikel f'temperatura baxxa u jippreservah",
    "fridge, refrigerator (appliance)": "Apparat elettriku domestiku użat biex iżomm l-ikel f'temperatura baxxa u jippreservah",

    # --- frodatur (noun, masculine) ---
    "defrauder": "Persuna li tqarraq b'mod intenzjonat u b'qerq biex tieħu flus, proprjetà jew benefiċċji b'mod illegali",

    # --- frodi (noun, feminine) ---
    "fraud, deception": "L-azzjoni li tqarraq b'mod diliberat u intenzjonat għal gwadann personali jew biex tikkawża telf lil ħaddieħor",

    # --- front (noun) ---
    "front": "In-naħa ta' quddiem ta' xi ħaġa, il-parti li tħares 'il barra jew lejn min iħares",

    # --- frontali (adjective) ---
    "frontal": "Li għandu x'jaqsam mal-front, li jinsab fuq jew jikkostitwixxi n-naħa ta' quddiem",

    # --- frontispizju (noun, masculine) ---
    "frontispiece, title page": "Il-paġna ta' quddiem ta' ktieb li fiha t-titlu, l-awtur, il-pubblikatur u spiss tiżjin",

    # --- frontun (noun, masculine) ---
    "pediment, ornamental front of a building": "Struttura arkitettonika ornamentali, ġeneralment trijangolari, fuq in-naħa ta' quddiem ta' bini klassiku",
    "frontispiece": "Struttura arkitettonika ornamentali, ġeneralment trijangolari, fuq in-naħa ta' quddiem ta' bini",

    # --- frosta (noun, feminine) ---
    "whip": "Għodda magħmula minn ċinga jew ħabel imwaħħal ma' manku, użata biex tħeġġeġ lill-annimali jew tikkastiga",

    # --- frott (noun, masculine, collective) ---
    "fruit": "Prodott li jittiekel minn siġra jew pjanta, ġeneralment ħelu u li fih iż-żerriegħa",

    # --- froxx (noun, masculine) ---
    "benefit": "Gwadann jew vantaġġ li wieħed jikseb minn xi ħaġa, profitt",
    "flux, flow": "Moviment kontinwu ta' likwidu jew fluwidu, il-mogħdija jew il-kurrent ta' xi ħaġa",

    # --- froxxna (noun) - alternative spelling ---
    "trident, fish spear, harpoon": "Arma jew għodda b'tliet ponot, użata għas-sajd taħt il-baħar",
    "trident, fishspear, harpoon": "Arma jew għodda b'tliet ponot, użata għas-sajd taħt il-baħar",

    # --- froġa (noun, feminine) ---
    "omelette": "Ikla magħmula minn bajd imsawwat u msajjar fi taġen, spiss mimli bil-ġobon, ħxejjex jew laħam",
    "mess": "Sitwazzjoni ta' diżordni, konfużjoni jew taħwid kbir",

    # --- frugħ (noun, masculine) ---
    "ebb, the receding of the sea": "L-irtirar tal-baħar mill-kosta, speċjalment waqt il-marea baxxa, it-tbattil tal-baħar",
    "verbal noun of forogħ: ebb, the receding of the sea": "L-irtirar tal-baħar mill-kosta, speċjalment waqt il-marea baxxa, it-tbattil tal-baħar",
}

# ============================================================
# Usage examples (1-3 per entry)
# ============================================================

EXAMPLES = {
    "frekwentattiv": [
        ("Fil-Malti, il-verb 'tħabbat' huwa eżempju ta' forma frekwentattiva ta' 'tabbat'.",
         "In Maltese, the verb 'tħabbat' is an example of a frequentative form of 'tabbat'."),
        ("Il-lingwisti jistudjaw il-forom frekwentattivi biex jifhmu kif tinbidel it-tifsira tal-verb.",
         "Linguists study frequentative forms to understand how the meaning of the verb changes."),
    ],
    "frekwentatur": [
        ("Huwa frekwentatur assidu tal-librerija pubblika l-ġimgħa kollha.",
         "He is a regular frequenter of the public library all week."),
        ("Il-każin tan-nies għandu ħafna frekwentaturi lejlet il-ġimgħa.",
         "The social club has many frequenters on weekend evenings."),
        ("Il-frekwentaturi tal-iskola tal-isports kienu kollha żgħażagħ.",
         "The frequenters of the sports school were all young people."),
    ],
    "frekwentement": [
        ("Jiena nżur lil ommi frekwentement għax tgħix fil-qrib.",
         "I visit my mother frequently because she lives nearby."),
        ("Dawn il-kliemiet jintużaw frekwentement fil-lingwa Maltija mitkellma.",
         "These words are used frequently in spoken Maltese."),
    ],
    "frekwenti": [
        ("Il-passaġġi tal-ajruplani huma frekwenti f'dan l-ajruport internazzjonali.",
         "Flights are frequent at this international airport."),
        ("Il-maltemp huwa frekwenti fix-xitwa fil-gżejjer Maltin.",
         "Storms are frequent in winter in the Maltese islands."),
    ],
    "frekwenza": [
        ("Il-frekwenza tal-mewġ elettromanjetiku tista' titkejjel bl-hertz.",
         "The frequency of electromagnetic waves can be measured in hertz."),
        ("Il-frekwenza tal-istudenti fil-klassi tjiebet din is-sena skolastika.",
         "Student attendance in the classroom improved this academic year."),
        ("Din l-istazzjon tar-radju jxandar fuq frekwenza ta' 100.7 FM.",
         "This radio station broadcasts on a frequency of 100.7 FM."),
    ],
    "friegħ": [
        ("Il-klassi friegħet għal kollox wara nofsinhar meta spiċċat il-iskola.",
         "The classroom became completely empty in the afternoon when school finished."),
        ("Il-pjazza friegħet wara li nfiret l-aħbar tal-attakki.",
         "The square became empty after the news of the attacks spread."),
    ],
    "friex": [
        ("Biddilt il-friex tas-sodda llum għax kien maħmuġ wara l-ġimgħa.",
         "I changed the bedsheets today because they were dirty after the week."),
        ("Tixtri l-friex minn dak il-ħanut li għandu drappijiet tajbin?",
         "Do you buy bedding from that shop that has good fabrics?"),
    ],
    "frigħ": [
        ("Wara l-frigħ tal-baħar, il-blat jibqa' xott u jidher il-qiegħ.",
         "After the ebbing of the sea, the rocks remain dry and the bottom is visible."),
        ("Il-frigħ tal-ġibjun seħħ bil-mod minħabba n-nixfa.",
         "The emptying of the reservoir happened slowly due to the drought."),
    ],
    "frikativ": [
        ("Il-ħoss 'f' huwa eżempju ta' konsonanti frikativa fil-Malti.",
         "The sound 'f' is an example of a fricative consonant in Maltese."),
        ("L-għalliema spjegat id-differenza bejn il-konsonanti okklussivi u dawk frikattivi.",
         "The teacher explained the difference between plosive and fricative consonants."),
    ],
    "frisk": [
        ("Il-ħobż frisk jinxtamm mill-bogħod meta joħroġ mill-forn.",
         "Fresh bread can be smelled from afar when it comes out of the oven."),
        ("Il-bajja kienet friska u t-temp kien perfett għal għawma.",
         "The bay was cool and the weather was perfect for a swim."),
        ("Il-frott frisk huwa dejjem aktar fit-togħma minn dak fil-laned.",
         "Fresh fruit is always more flavourful than tinned fruit."),
    ],
    "frix": [
        ("Il-frix taż-żerriegħa fir-raba' sar kmieni fir-rebbiegħa.",
         "The spreading of the seed in the field was done early in spring."),
        ("Wara l-frix tal-ħwejjeġ mal-art, in-nixxiefa bdiet taħdem.",
         "After the scattering of the clothes on the line, the dryer started working."),
    ],
    "frizzjoni": [
        ("Il-frizzjoni bejn iż-żewġ biċċiet tal-injam ħolqot biżżejjed sħana biex taqbad nar.",
         "The friction between the two pieces of wood created enough heat to start a fire."),
        ("Iż-żejt tal-magna jnaqqas il-frizzjoni u jżid il-ħajja tal-magna.",
         "Engine oil reduces friction and increases the life of the engine."),
    ],
    "friġġ": [
        ("Poġġi l-ħalib lura fil-friġġ qabel ma jaqta' bis-sħana.",
         "Put the milk back in the fridge before it goes off in the heat."),
        ("Għandi bżonn naddaf il-friġġ il-ġimgħa d-dieħla għax fih ikel antik.",
         "I need to clean the fridge next week because it has old food in it."),
    ],
    "frodatur": [
        ("Il-frodatur instab ħati u ngħata sentenza ta' sentejn ħabs.",
         "The defrauder was found guilty and given a sentence of two years in prison."),
        ("Il-frodaturi jużaw diversi metodi sofistikati biex iqarrqu bin-nies.",
         "Defrauders use various sophisticated methods to deceive people."),
    ],
    "frodi": [
        ("Il-frodi tal-karti tal-kreditu qed tiżdied mal-pajjiż kollu.",
         "Credit card fraud is increasing across the whole country."),
        ("Il-kumpanija akkużatu b'frodi kontabbli wara l-verifika tal-kontijiet.",
         "The company accused him of accounting fraud after the audit of the accounts."),
        ("Il-liġi Maltija tikkastiga l-frodi b'mod sever b'multi u priġunerija.",
         "Maltese law punishes fraud severely with fines and imprisonment."),
    ],
    "front": [
        ("Il-front tal-bini kien imżejjen b'balavostri tal-ġebel.",
         "The front of the building was decorated with stone balustrades."),
        ("Il-ġellieda marru lejn il-front wara li rċevew l-ordnijiet.",
         "The soldiers went to the front after receiving their orders."),
    ],
    "frontali": [
        ("Il-ħabta frontali bejn iż-żewġ vetturi kkawżat ħsara estensiva.",
         "The frontal collision between the two vehicles caused extensive damage."),
        ("Il-lobu frontali tal-moħħ huwa responsabbli għall-kontroll tal-personalità.",
         "The frontal lobe of the brain is responsible for the control of personality."),
    ],
    "frontispizju": [
        ("Il-frontispizju tal-ktieb kien imżejjen b'inċiżjoni sabiħa tas-seklu tmintax.",
         "The frontispiece of the book was decorated with a beautiful engraving from the eighteenth century."),
        ("Il-frontispizju juri t-titlu, l-awtur u d-data tal-pubblikazzjoni.",
         "The title page shows the title, the author and the date of publication."),
    ],
    "frontun": [
        ("Il-frontun tal-katidral kien xogħol ta' l-arti barokki.",
         "The pediment of the cathedral was a work of Baroque art."),
        ("Il-frontuni tal-binjiet klassiċi Griegi spiss kienu mżejna bi statwi.",
         "The pediments of classical Greek buildings were often decorated with statues."),
    ],
    "frosta": [
        ("Iż-żiemel mexa aktar malajr wara daqqa ta' frosta fuq dahru.",
         "The horse walked more quickly after a lash of the whip on its back."),
        ("Il-frosta kienet tintuża fil-passat bħala għodda biex tikkastiga lill-iskjavi.",
         "The whip was used in the past as a tool to punish slaves."),
    ],
    "frott": [
        ("Il-frisk huwa importanti ħafna għal saħħa tajba u bilanċjata.",
         "Fresh fruit is very important for good and balanced health."),
        ("Is-siġra tat-tuffieħ tat ħafna frott din is-sena wara x-xita tajba.",
         "The apple tree bore a lot of fruit this year after the good rain."),
        ("Nieklu l-frott ma' kolazzjon kuljum b'ċereali u ħalib.",
         "We eat fruit with breakfast every day with cereal and milk."),
    ],
    "froxx": [
        ("Il-froxx ta' din l-investiment kien tajjeb ħafna għall-familja.",
         "The benefit of this investment was very good for the family."),
        ("Il-froxx tax-xmara kien qawwi wara x-xita qalila tal-jiem li għaddew.",
         "The flow of the river was strong after the heavy rain of the past days."),
    ],
    "froxxna": [
        ("Is-sajjied uża l-froxxna biex jaqbad il-ħut taħt il-baħar.",
         "The fisherman used the harpoon to catch fish underwater."),
        ("Il-froxxna għandha tliet ponot li jaqtgħu u tintuża għas-sajd.",
         "The trident has three sharp prongs and is used for fishing."),
    ],
    "froġa": [
        ("Għamilt froġa bil-ġobon, it-tadam u l-basal għall-pranzu.",
         "I made an omelette with cheese, tomatoes and onions for dinner."),
        ("Il-kamra tal-istudju kienet froġa sħiħa wara l-festa ta' għeluq is-sena.",
         "The study room was a complete mess after the end-of-year party."),
        ("Il-froġa tiegħek ħarġet perfetta u ratba llum, bħal ta' professjonista.",
         "Your omelette turned out perfect and soft today, like a professional's."),
    ],
    "frugħ": [
        ("Il-frugħ tal-baħar kien bil-mod dakinhar u ħalla warajh ħafna qxur.",
         "The ebbing of the sea was slow that day and left behind many seashells."),
        ("Wara l-frugħ, il-bajja kienet mimlija ħut u alka fuq ir-ramel.",
         "After the ebb, the bay was full of fish and seaweed on the sand."),
    ],
}


def process_tags(obj):
    """Validate and remap tags. Returns (tags, entry_tags) lists."""
    old_tags = obj.get("tags", [])
    old_entry_tags = obj.get("entry_tags", [])

    # Build map of old id -> new id (or None to drop)
    id_map = {}
    for t in old_tags:
        old_name = t.get("name", "")
        new_name = TAG_MAP.get(old_name, old_name if old_name in APPROVED_TAGS else None)
        if new_name is not None:
            old_id = t.get("id", f"tag-{old_name}")
            new_id = f"tag-{new_name}"
            id_map[old_id] = new_id

    # Filter and remap tags
    new_tags = []
    new_entry_tags = []
    used_ids = set()

    for t in old_tags:
        old_name = t.get("name", "")
        new_name = TAG_MAP.get(old_name, old_name if old_name in APPROVED_TAGS else None)
        if new_name is None:
            continue
        old_id = t.get("id", f"tag-{old_name}")
        new_id = f"tag-{new_name}"
        if new_id not in used_ids:
            new_tags.append({
                "id": new_id,
                "name": new_name,
                "category": t.get("category", "Usage"),
                "description": t.get("description"),
            })
            used_ids.add(new_id)

    for et in old_entry_tags:
        old_id = et.get("tag_id", "")
        new_id = id_map.get(old_id)
        if new_id is None:
            continue
        new_entry_tags.append({
            "entry_id": et.get("entry_id", ""),
            "tag_id": new_id,
        })

    return new_tags, new_entry_tags


def split_semicolons(defs):
    """Split definitions on semicolons into separate definitions."""
    result = []
    for d in defs:
        text_en = d.get("text_en", "")
        if ";" in text_en:
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


def fill_text_mt(defs, headword):
    """Fill null text_mt with appropriate Maltese definition."""
    # Handle verbal noun circular references
    for d in defs:
        te = d.get("text_en", "")
        tm = d.get("text_mt")
        if tm is not None and tm != "":
            continue

        # Look up in DEFINITIONS_MT dictionary
        if te in DEFINITIONS_MT:
            d["text_mt"] = DEFINITIONS_MT[te]
        # Fallback for "verbal noun of X" patterns
        elif te.startswith("verbal noun of"):
            d["text_mt"] = DEFINITIONS_MT.get(te, f"Il-verb tan-nom ta' {te.replace('verbal noun of ', '')}")
        else:
            # Generic fallback using headword
            # Use the headword itself capitalised as a minimal fallback
            # (this should never happen if DEFINITIONS_MT is complete)
            d["text_mt"] = headword.capitalize()
    return defs


def generate_examples(headword, defs):
    """Get 1-3 usage examples per entry."""
    exs = EXAMPLES.get(headword, [])
    result = []
    for mt_sentences, en_sentence in exs:
        result.append({
            "mt": mt_sentences,
            "en": en_sentence,
        })
    return result


def main():
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        lines = [l.strip() for l in f if l.strip()]

    refined = []
    for line in lines:
        obj = json.loads(line)

        # Remove _scratchpad
        obj.pop("_scratchpad", None)

        # Process tags
        new_tags, new_entry_tags = process_tags(obj)
        obj["tags"] = new_tags
        obj["entry_tags"] = new_entry_tags

        entry = obj["entry"]
        headword = entry.get("headword", "")

        # Split semicolons in definitions
        defs = entry.get("definitions", [])
        defs = split_semicolons(defs)

        # Fill text_mt
        defs = fill_text_mt(defs, headword)

        entry["definitions"] = defs

        # Generate usage examples
        entry["usage_examples"] = generate_examples(headword, defs)

        obj["entry"] = entry

        refined.append(obj)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        # Ensure no BOM in output
        for obj in refined:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    print(f"Done. Processed {len(refined)} entries -> {OUTPUT}")


if __name__ == "__main__":
    main()
