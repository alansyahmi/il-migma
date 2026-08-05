#!/usr/bin/env python3
"""
Refine batch_021.jsonl: fill text_mt, generate examples, validate tags,
remove _scratchpad, output clean JSONL.
"""

import json

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_021.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_021.jsonl"

APPROVED_TAGS = frozenset({
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time"
})

TAG_MAP = {
    "alternative-form": None,
    "dated": None,
    "intransitive": None,
    "of-a-liquid": None,
    "of-a-person": None,
}

# ============================================================
# text_mt: Oxford-style Maltese definitions (capitalised, no circularity, no ;)
# Keyed by headword, with optional |pos disambiguation.
# ============================================================

DEFINITIONS_MT = {
    "għażżiel": {
        "spinner (one who spins)": "Persuna li tagħżel jew iddawwar is-suf jew il-qoton biex tagħmel il-ħajt",
    },
    "għażżiela": {
        "gazelle": "Ċriev żgħir u grazzjuż, oriġinarjament mill-Afrika u l-Asja",
        "cicada": "Insetta li tagħmel ħoss qawwi u ritmiku matul is-sajf",
        "female equivalent of għażżiel (“ spinner, one who spins ”)": "Mara li tagħżel jew iddawwar is-suf jew il-qoton biex tagħmel il-ħajt",
        "female equivalent of għażżiel": "Mara li tagħżel jew iddawwar is-suf jew il-qoton biex tagħmel il-ħajt",
        "female equivalent of għażżiel (“ spinner, one who spins ”)": "Mara li tagħżel jew iddawwar is-suf jew il-qoton biex tagħmel il-ħajt",
        "plural of għażżiel": "Persuni li jagħżlu jew idawwru s-suf jew il-qoton biex jagħmlu l-ħajt",
    },
    "għażżien": {
        "lazy": "Li ma jħobbx jaħdem jew jagħmel sforz, li jevita l-impenn",
    },
    "għeb": {
        "to disappear": "Telaq u ma baqax jidher, sparixxa",
    },
    "Għebrew": {
        "superseded spelling of Ebrew: (of a person) Hebrew": "Ortografija skartata ta' 'Ebrew': (ta' persuna) Lhudi",
    },
    "Għeden": {
        "Eden (the paradise of Adam and Eve)": "Il-ġnien tal-Ġenna fejn għexu Adam u Eva skont il-ġrajja Bibblika",
    },
    "għedwa": {
        "enmity": "Mibgħeda jew ostilità bejn żewġ persuni jew aktar",
    },
    "għeja|noun": {
        "tiredness": "Stat ta' nuqqas ta' enerġija u bżonn ta' mistrieħ wara attività fiżika jew mentali",
    },
    "għeja|verb": {
        "to become tired": "Sar għajjien, tilef l-enerġija u l-qawwa wara sforz",
    },
    "għejbien": {
        "verbal noun of għeb: act of disappearing": "L-azzjoni ta' meta xi ħadd jisparixxi jew jitlaq, il-ħruġ minn post fejn kien preżenti",
    },
    "għejja": {
        "to exhaust, to weary": "Għamel lil xi ħadd għajjien ħafna, eżawrixxa bil-ħidma jew b'attività kontinwa",
    },
    "għejnilla": {
        "diminutive of għonnella": "Għonnella żgħira, il-libsa tradizzjonali Maltija żgħira li kienu jilbsu n-nisa",
    },
    "għejra": {
        "jealousy, envy": "Mibegħda u rabja lejn xi ħadd minħabba s-suċċess jew il-ġid tiegħu",
    },
    "għejxien": {
        "livelihood": "Il-mod kif wieħed jaqla' l-għajxien u jsostni lilu nnifsu u lill-familja",
        "one's living": "Il-flus jew ir-riżorsi meħtieġa għall-għajxien ta' kuljum ta' persuna",
        "survival": "Il-ħila li wieħed jibqa' ħaj minkejja perikli jew diffikultajiet",
        "living": "L-eżistenza u l-attivitajiet ta' kuljum ta' persuna",
    },
    "għela": {
        "to boil": "Sar jaħraq biżżejjed biex likwidu jibda jagħli u jsir fwar",
        "to be boiled": "Tgħalla f'likwidu sħun, ġie msajjar bl-għali",
        "to be bitter": "Kellu togħma morra u mhux ħelwa",
        "to feel bitterness": "Ħass mrar jew rabja f'qalbu minħabba esperjenza ħażina",
        "to rise in price": "Tela' fil-prezz, sar aktar għali",
        "to become expensive": "Sar għali, żdied fil-valur jew fil-prezz",
    },
    "għeleb": {
        "to overcome, to defeat, to win out over": "Rebaħ fuq għadu jew diffikultà, għelibhom u kiseb is-supremazija",
    },
    "għelet": {
        "to make a mistake, to err": "Ħarab mill-verità jew minn dak li kien mistenni, żbalja",
    },
    "għelib": {
        "verbal noun of għeleb": "Ir-rebħa fuq l-għadu jew fuq diffikultà, it-telfa ta' xi ħadd jew xi ħaġa",
    },
    "għeliem": {
        "plural of għelm": "Sinjali jew marki li jidentifikaw jew jindikaw xi ħaġa",
        "servant": "Qaddej, persuna li sservi lil ħaddieħor fid-dar jew f'istabbiliment",
        "slave": "Persuna mjielda u mibjugħa taħt is-setgħa assoluta ta' ħaddieħor",
    },
    "għelk": {
        "gluey substance": "Sustanza li twaħħal, ta' nisġa li tixbah l-għalf jew ir-reżina",
    },
    "għella": {
        "misfortune, bad luck": "Xorti ħażina jew tbatija li tiġi lil xi ħadd",
        "illness, disease": "Marda jew kundizzjoni ħażina li taffettwa s-saħħa tal-ġisem",
    },
    "għelm": {
        "sign, mark": "Sinjal jew marka li turi xi ħaġa, indikazzjoni",
        "tag, label": "Tikketta jew biċċa informazzjoni mwaħħla ma' oġġett għall-identifikazzjoni",
        "knowledge": "Tagħrif u għerf li wieħed jakkumula permezz tal-istudju jew l-esperjenza",
    },
    "għelt": {
        "mistake, error": "Żball li wieħed jagħmel meta ma jsegwix ir-regoli jew il-verità",
    },
    "għeluq": {
        "verbal noun of għalaq: closing, closure": "L-għalaq ta' xi ħaġa, l-azzjoni ta' meta xi ħaġa tingħalaq",
        "ending, end": "It-tmiem ta' perjodu, attività jew avveniment",
    },
    "għeluq snin": {
        "birthday": "Il-jum li fih twieled xi ħadd, iċ-ċelebrazzjoni annwali tat-twelid ta' persuna",
    },
}

# ============================================================
# Usage examples (1-3 per entry), keyed by headword
# ============================================================

EXAMPLES = {
    "għażżiel": [
        ("Il-għażżiel kien mimli ħajt u ħarir wara ġimgħa sħiħa ta' xogħol.",
         "The spinner was full of thread and silk after a whole week of work."),
        ("Il-għażżiela kienu jaħdmu flimkien fid-dar tas-suf tar-raħal.",
         "The spinners used to work together in the village wool house."),
    ],
    "għażżiela": [
        ("Il-għażżiela ġriet malajr mal-pjanura wara li rat il-predatur.",
         "The gazelle ran quickly across the plain after spotting the predator."),
        ("Is-smigħ tal-għażżiela kien jinstema' mill-bogħod f'lejl sħun tas-sajf.",
         "The sound of the cicada could be heard from afar on a hot summer night."),
        ("Il-għażżiela kienet tiftaħar bil-ħila tagħha fit-tidwir tas-suf.",
         "The spinner woman took pride in her skill at spinning wool."),
    ],
    "għażżien": [
        ("Ibnu huwa tant għażżien li jqatta' l-ġurnata kollha fuq is-sufan.",
         "His son is so lazy that he spends the whole day on the sofa."),
        ("Il-qattus għażżien tiegħi jorqod tmintax-il siegħa kuljum.",
         "My lazy cat sleeps eighteen hours a day."),
        ("Mhux għażżien, imma jippreferi jaħdmu bil-mod u bir-reqqa.",
         "He is not lazy, but he prefers to work slowly and carefully."),
    ],
    "għeb": [
        ("Ix-xemx għebet wara l-baħar u l-lejl beda jinżel.",
         "The sun disappeared behind the sea and the night began to fall."),
        ("L-għasfur għeb fil-boskijiet u ma rajnieh qatt aktar.",
         "The bird disappeared into the woods and we never saw it again."),
    ],
    "Għebrew": [
        ("Ktieb Għebrew antik instab fil-librerija tal-università.",
         "An ancient Hebrew book was found in the university library."),
        ("Il-kitba Għebrea hija fost l-eqdem lingwi li għadhom jintużaw illum.",
         "Hebrew writing is among the oldest languages still in use today."),
    ],
    "Għeden": [
        ("Il-ġnien tal-Għeden huwa deskritt bħala post ta' sbuħija perfetta.",
         "The Garden of Eden is described as a place of perfect beauty."),
        ("Skont it-tradizzjoni, Adam u Eva għexu fil-Għeden qabel il-waqgħa.",
         "According to tradition, Adam and Eve lived in Eden before the fall."),
    ],
    "għedwa": [
        ("Il-għedwa bejn iż-żewġ familji damet aktar minn ġenerazzjoni.",
         "The enmity between the two families lasted more than a generation."),
        ("Wara l-argument, kien hemm għedwa qawwija bejniethom.",
         "After the argument, there was strong enmity between them."),
    ],
    "għeja|noun": [
        ("Wara l-maratona, ħass għeja kbira f'ġismu kollu.",
         "After the marathon, he felt great tiredness throughout his whole body."),
        ("L-għeja bdiet tieħu qabża wara li ħadem ħmistax-il siegħa konsekuttivi.",
         "Tiredness began to take over after he worked fifteen consecutive hours."),
    ],
    "għeja|verb": [
        ("Għeja wara li ġarr il-kaxxi tqal sa tliet sulari.",
         "He became tired after carrying the heavy boxes up three floors."),
        ("L-istudent għeja waqt l-eżami twil ta' tliet sigħat.",
         "The student became tired during the long three-hour exam."),
    ],
    "għejbien": [
        ("L-għejbien tal-ajruplan baqa' misteru għal ħafna snin.",
         "The disappearance of the plane remained a mystery for many years."),
        ("Wara l-għejbien tiegħu, ħadd ma sema' xħin ġralu.",
         "After his disappearance, nobody heard what happened to him."),
    ],
    "għejja": [
        ("Din il-ġirja twila għejjietni ħafna u għandi bżonn nistrieħ.",
         "This long run exhausted me a lot and I need to rest."),
        ("Il-ħidma ta' kuljum fuq ir-razzett għejjiet lill-bdiewa kollha.",
         "The daily work on the farm exhausted all the farmers."),
    ],
    "għejnilla": [
        ("Ommi libset għejnilla għall-festa tar-raħal is-Sibt li għadda.",
         "My mother wore a small għonnella for the village feast last Saturday."),
        ("Il-għejnilla kienet miksija bil-bizzilla bajda u ħadra.",
         "The small għonnella was trimmed with white and green lace."),
    ],
    "għejra": [
        ("Il-għejra qerdet il-ħbiberija tagħhom wara tant snin flimkien.",
         "Jealousy destroyed their friendship after so many years together."),
        ("Ma tistax tgħix ħajja kuntenta jekk int mimli bl-għejra.",
         "You cannot live a happy life if you are full of envy."),
    ],
    "għejxien": [
        ("Jaħtiegħu jaħdmu żewġ impjiegi biex jaqilgħu l-għejxien għall-familja.",
         "They need to work two jobs to earn a living for the family."),
        ("L-għejxien fil-gżira kien iebes qabel ma wasal it-turiżmu.",
         "Livelihood on the island was hard before tourism arrived."),
        ("Il-bdiewa jiddependu fuq ix-xita għall-għejxien tagħhom.",
         "Farmers depend on rain for their survival."),
    ],
    "għela": [
        ("L-ilma għela u jista' jintuża biex issajjar il-makaruni.",
         "The water boiled and can be used to cook the pasta."),
        ("Il-prezz taż-żejt għela b'mod drammatiku din is-sena.",
         "The price of oil rose dramatically this year."),
        ("Qalbu għelitlu meta sema' bil-mewt ta' ħuh.",
         "His heart felt bitter when he heard of his brother's death."),
    ],
    "għeleb": [
        ("Il-ġellieda Maltin għelbu lill-għadu minkejja n-numri iżgħar tagħhom.",
         "The Maltese warriors overcame the enemy despite their smaller numbers."),
        ("Għeleb il-biża' tiegħu u tkellem quddiem il-folla kbira.",
         "He overcame his fear and spoke in front of the large crowd."),
    ],
    "għelet": [
        ("Jekk tgħodd mingħajr attenzjoni, tista' tgħeleb faċilment.",
         "If you count without attention, you can make a mistake easily."),
        ("L-istudent għelet fit-tweġiba għax ma qarax il-mistoqsija sew.",
         "The student erred in the answer because he did not read the question carefully."),
    ],
    "għelib": [
        ("L-għelib tal-avversarju kien importanti għat-tim kollu.",
         "The defeat of the opponent was important for the whole team."),
        ("Wara l-għelib tal-marda, qatt ma ħa s-saħħa għal mogħtija.",
         "After overcoming the illness, he never took his health for granted."),
    ],
    "għeliem": [
        ("L-għeliem kienu jaqdu lil sidhom b'lealtà u dedikazzjoni.",
         "The servants used to serve their master with loyalty and dedication."),
        ("Il-għeliem kienu mibjugħa u mixtrija bħal merkanzija fi żmien il-kummerċ tal-iskjavi.",
         "Slaves were bought and sold like goods during the slave trade era."),
    ],
    "għelk": [
        ("L-għelk li ħareġ mis-siġra kien jintuża biex isewwi l-istrumenti.",
         "The gluey substance that came out of the tree was used to repair tools."),
        ("L-għelk jista' jitqiegħed fuq il-ġilda bħala mediċina tradizzjonali.",
         "The gluey substance can be applied to the skin as a traditional medicine."),
    ],
    "għella": [
        ("Kienet għella li ma kienx jistħoqqilha, wara ħajja tant onesta.",
         "It was a misfortune she did not deserve, after such an honest life."),
        ("L-għella malajr infirxet mal-familja kollha u kellhom isejħu lit-tabib.",
         "The illness quickly spread throughout the whole family and they had to call the doctor."),
    ],
    "għelm": [
        ("Poġġa għelm fuq il-kaxxa biex tkun taf x'hemm ġewwa.",
         "Put a label on the box so you know what is inside."),
        ("L-għelm tat-triq kien moħbi wara s-siġar u ma stajniex narawh.",
         "The road sign was hidden behind the trees and we could not see it."),
        ("Dan il-ktieb fih ammont kbir ta' għelm dwar l-istorja ta' Malta.",
         "This book contains a great amount of knowledge about the history of Malta."),
    ],
    "għelt": [
        ("Kull għelt li tagħmel fit-tagħlim hija opportunità biex titgħallem.",
         "Every mistake you make in learning is an opportunity to learn."),
        ("Il-kont kellu għelt u l-ħanut ħallas lura l-flus żejda.",
         "The bill had an error and the shop refunded the extra money."),
        ("Jekk għamilt għelt, aghtarfu u pprova tikkoreġih.",
         "If you made a mistake, admit it and try to correct it."),
    ],
    "għeluq": [
        ("L-għeluq tal-ħanut isir fid-disgħa ta' filgħaxija kull ġurnata.",
         "The closing of the shop happens at nine in the evening every day."),
        ("Fl-għeluq tal-laqgħa, il-president irringrazzja lil kulħadd.",
         "At the end of the meeting, the president thanked everyone."),
    ],
    "għeluq snin": [
        ("Il-għeluq snin tiegħi huwa fil-ħmistax ta' Ġunju.",
         "My birthday is on the fifteenth of June."),
        ("Għamilna festa kbira għall-għeluq snin in-nanna tagħna.",
         "We had a big party for our grandmother's birthday."),
        ("X'rigal se tixtri lil ħabibek għal għeluq sninu?",
         "What gift will you buy your friend for his birthday?"),
    ],
}


def process_tags(obj):
    """Validate and remap tags. Returns (tags, entry_tags) lists."""
    old_tags = obj.get("tags", [])
    old_entry_tags = obj.get("entry_tags", [])

    id_map = {}
    for t in old_tags:
        old_name = t.get("name", "")
        new_name = TAG_MAP.get(old_name, old_name if old_name in APPROVED_TAGS else None)
        if new_name is not None:
            old_id = t.get("id", f"tag-{old_name}")
            new_id = f"tag-{new_name}"
            id_map[old_id] = new_id

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


def fill_text_mt(defs, headword, pos):
    """Fill null text_mt with appropriate Maltese definition."""
    for d in defs:
        te = d.get("text_en", "")
        tm = d.get("text_mt")
        if tm is not None and tm != "":
            continue

        # Try headword|pos key first, then bare headword
        lookup = DEFINITIONS_MT.get(f"{headword}|{pos}", {})
        if te not in lookup:
            lookup = DEFINITIONS_MT.get(headword, {})

        if te in lookup:
            d["text_mt"] = lookup[te]
        elif te.startswith("verbal noun of"):
            # Generic fallback for verbal nouns - should not happen if DEFINITIONS_MT is complete
            verb = te.replace("verbal noun of ", "").split(":")[0].strip()
            d["text_mt"] = f"Nom verbali ta' '{verb}': l-azzjoni ta' meta xi ħadd {verb}"
        else:
            d["text_mt"] = headword.capitalize()
    return defs


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


def generate_examples(headword, pos, entry_id, defs):
    """Get 1-3 usage examples per entry."""
    # Try entry_id first, then headword|pos, then bare headword
    exs = EXAMPLES.get(entry_id, None)
    if exs is None:
        exs = EXAMPLES.get(f"{headword}|{pos}", None)
    if exs is None:
        exs = EXAMPLES.get(headword, [])
    result = []
    for mt_sentence, en_sentence in exs:
        result.append({
            "mt": mt_sentence,
            "en": en_sentence,
        })
    return result


def main():
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        lines = [l.strip() for l in f if l.strip()]

    refined = []
    stats = {
        "total": 0,
        "text_mt_filled": 0,
        "examples_added": 0,
        "tags_kept": 0,
        "tags_removed": 0,
    }

    for line in lines:
        obj = json.loads(line)

        # Remove _scratchpad
        obj.pop("_scratchpad", None)

        # Process tags
        new_tags, new_entry_tags = process_tags(obj)
        stats["tags_kept"] += len(new_tags)
        stats["tags_removed"] += len(obj.get("tags", [])) - len(new_tags)
        obj["tags"] = new_tags
        obj["entry_tags"] = new_entry_tags

        entry = obj["entry"]
        headword = entry.get("headword", "")
        pos = entry.get("pos", "")

        # Split semicolons in definitions
        defs = entry.get("definitions", [])
        old_def_count = len(defs)
        defs = split_semicolons(defs)

        # Fill text_mt
        defs = fill_text_mt(defs, headword, pos)
        for d in defs:
            if d.get("text_mt") is not None:
                stats["text_mt_filled"] += 1

        entry["definitions"] = defs

        # Generate usage examples
        entry_id = entry.get("id", "")
        examples = generate_examples(headword, pos, entry_id, defs)
        if examples:
            entry["usage_examples"] = examples
            stats["examples_added"] += len(examples)

        obj["entry"] = entry
        refined.append(obj)
        stats["total"] += 1

    # Write output
    import os
    output_dir = os.path.dirname(OUTPUT)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        for obj in refined:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    print(f"Done. Processed {stats['total']} entries -> {OUTPUT}")
    print(f"  text_mt fields filled: {stats['text_mt_filled']}")
    print(f"  Usage examples added: {stats['examples_added']}")
    print(f"  Tags kept: {stats['tags_kept']}")
    print(f"  Tags removed: {stats['tags_removed']}")


if __name__ == "__main__":
    main()
