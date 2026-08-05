#!/usr/bin/env python3
"""Refine batch_030.jsonl for Maltese-English lexicography."""

import json
import os

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_030.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_030.jsonl"

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

# ─── Maltese definitions (Oxford Maltese style, capitalised, no circularity, no ;) ───

MT_DEFS = {
    "n-ġerrej": [
        "Ġerrej: Persuna li tirkeb iż-żwiemel fiċ-ċirku tat-tiġrijiet, speċjalment bħala professjoni."
    ],
    "n-ġerriegħ": [
        "Ġerriegħ: Persuna li tiżra’ z-żerriegħa fl-art, speċjalment għall-għelejq."
    ],
    "adj-ġerriegħi": [
        "Ġerriegħi: Li jista’ jittollera jew jissaporti uġigħ jew diffikultà mingħajr ma jilmenta."
    ],
    "n-ġeru": [
        "Ġeru: Kelb żgħir, speċjalment wieħed li għadu qed jirda’."
    ],
    "n-ġerħ": [
        "Ġerħ: L-azzjoni li wieħed iferri jew iweġġa’ lil xi ħadd jew annimal."
    ],
    "n-ġerħa": [
        "Ġerħa: Ferita fil-ġisem, speċjalment waħda kkawżata minn strument li jaqta’ jew minn daqqa."
    ],
    "n-ġest": [
        "Ġest: Moviment tal-idejn, tar-ras jew tal-ġisem biex jesprima xi ħsieb jew sentiment.",
        "Ġest: Azzjoni magħmula biex turi ġentilezza, rispett jew ħbiberija."
    ],
    "n-ġestikulazzjoni": [
        "Ġestikulazzjoni: Moviment ħajjiel tal-idejn u l-ġisem waqt li wieħed jitkellem, speċjalment meta jkun eċċitat."
    ],
    "n-ġesù": [
        "Ġesù: Il-figura ċentrali tal-Kristjaneżmu, meqjus mill-Kristjani bħala l-iben ta’ Alla u s-salvatur tal-bniedem."
    ],
    "n-ġesù-kristu": [
        "Ġesù Kristu: Il-figura ċentrali tal-Kristjaneżmu, meqjus mill-Kristjani bħala l-iben ta’ Alla u s-salvatur tal-bniedem."
    ],
    "adv-ġew": [
        "Ġew: Fil-parti ta’ ġewwa; mhux barra.",
        "Ġew: Ma'; f'nofs."
    ],
    "prep-ġew": [
        "Ġew: Fil-limiti ta’ xi ħaġa; fil-parti ta’ ġewwa.",
        "Ġew: Ma' jew fost; f'nofs."
    ],
    "n-ġewlaq": [
        "Ġewlaq: Basket tal-qasab jew tal-qroll, ħafna drabi b’manku, użat biex iġorr jew iħżomm affarijiet."
    ],
    "n-ġewnaħ": [
        "Ġewnaħ: Parti tal-ġisem ta’ għasfur, insett jew annimal ieħor użata għat-titjir.",
        "Ġewnaħ: Parti mill-ajruplan li tipprovdi l-irfigh.",
        "Ġewnaħ: Naħa ta’ bini jew struttura fuq kull naħa ta’ punt ċentrali.",
        "Ġewnaħ: Spazju triangulari bejn l-arkata u l-qafas ta’ bini.",
        "Ġewnaħ: Protezzjoni jew kenn mogħti minn xi ħadd."
    ],
    "adv-ġewwa": [
        "Ġewwa: Fil-parti ta’ ġew; mhux barra; fid-dar jew f’post magħluq."
    ],
    "prep-ġewwa": [
        "Ġewwa: Ġo; fil-limiti ta’; f’nofs xi ħaġa.",
        "Ġewwa: Matul; fil-mijiet ta’; fost."
    ],
    "v-ġewwaħ": [
        "Ġewwaħ: Ħalla lil xi ħadd mingħajr ikel għal żmien twil, ħafna drabi sal-mewt."
    ],
    "n-ġewwenija": [
        "Ġewwenija: Is-sens ta’ dak li hu tajjeb u ħazin fl-imġieba tal-bniedem."
    ],
    "adj-ġewwieni": [
        "Ġewwieni: Li jinsab ġewwa; mhux ta’ barra; relatat mal-parti ta’ ġewwa."
    ],
    "n-ġewwieni": [
        "Ġewwieni: Persuna relatata ma’ oħra permezz ta’ demm jew żwieġ.",
        "Ġewwieni: L-organi interni tal-ġisem, speċjalment tal-istonku u l-musrana."
    ],
    "n-ġewwinija": [
        "Ġewwinija: Is-sens ta’ dak li hu tajjeb u ħazin fl-imġieba tal-bniedem."
    ],
    "adj-ġewħan": [
        "Ġewħan: Li għandu aptit qawwi għall-ikel; li għandu ġuħ."
    ],
    "n-ġewż": [
        "Ġewż: Frott bi qoxra iebsa u ġewġiena li tittiekel, bħall-lewż u l-ġellewż.",
        "Ġewż: Speċifikament, il-ġewż tal-ġandar (Juglans regia)."
    ],
    "n-ġewżaq": [
        "Ġewżaq: Għodda żgħira ta’ injam jew plastik, fit-tond u dejqa fin-nofs, użata biex jitgeżwer il-ħajt għad-drap u x-xogħol tal-ħjata."
    ],
    "n-ġeħova": [
        "Ġeħova: Isem ta’ Alla fit-Testment il-Qadim, użat minn xi denominazzjonijiet Insara."
    ],
}

# ─── Fix text_en for broken definitions ───

FIXED_EN = {
    "n-ġerriegħ": [
        "sower, seeder"
    ],
    "n-ġerħ": [
        "wounding, injury (verbal noun)"
    ],
    "n-ġewż": [
        "nuts (collectively)",
        "walnuts"
    ],
}

# ─── Usage examples ───

USAGE_EXAMPLES = {
    "n-ġerrej": [
        {
            "text_mt": "Il-ġerrej rebaħ it-tellieqa bl-iż-żiemel favorit tiegħu.",
            "text_en": "The jockey won the race with his favourite horse.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Wieħed mis-subien jixtieq isir ġerrej meta jikber.",
            "text_en": "One of the boys wants to become a jockey when he grows up.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġerriegħ": [
        {
            "text_mt": "Il-ġerriegħ xerred iz-żerriegħa bir-reqqa fl-għelieqi kollha.",
            "text_en": "The sower scattered the seed carefully across all the fields.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "L-imgħallem kien ġerriegħ ta’ għerf fost l-istudenti tiegħu.",
            "text_en": "The teacher was a sower of wisdom among his students.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "adj-ġerriegħi": [
        {
            "text_mt": "Missieri huwa bniedem ġerriegħi u qatt ma jilmenta.",
            "text_en": "My father is a tolerant man and never complains.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Is-sitwazzjoni kienet ġerriegħja, imma aħna bqajna siekta.",
            "text_en": "The situation was tolerable, but we remained quiet.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġeru": [
        {
            "text_mt": "Il-kelb tagħna welldet ġeru żgħir ilbieraħ filgħodu.",
            "text_en": "Our dog gave birth to a small puppy yesterday morning.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Il-ġeru kien qed jilgħab bil-ballun fil-ġnien.",
            "text_en": "The puppy was playing with the ball in the garden.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġerħ": [
        {
            "text_mt": "Il-ġerħ tal-annimal kien ħazin u bżaġa.",
            "text_en": "The wounding of the animal was cruel and frightening.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġerħa": [
        {
            "text_mt": "Il-ġerħa fuq saqqu damet ġimgħat biex fejqet.",
            "text_en": "The wound on his leg took weeks to heal.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Dik il-ġerħa qatt ma fejqet għalkemm għaddiet ġimgħat.",
            "text_en": "That bruise never healed even though weeks passed.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "It-tabib ħejjeġ il-ġerħa u libes faxxa madwar id-driegħ.",
            "text_en": "The doctor dressed the wound and wrapped a bandage around the arm.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġest": [
        {
            "text_mt": "B’ġest sempliċi ta’ idu wrieh it-triq it-tajba.",
            "text_en": "With a simple gesture of his hand he showed him the right way.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Kien ġest sabiħ li offra li jħallas għall-ikla tagħna.",
            "text_en": "It was a kind gesture to offer to pay for our meal.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġestikulazzjoni": [
        {
            "text_mt": "Il-ġestikulazzjoni tiegħu kienet ħajjiela waqt id-diskors.",
            "text_en": "His gesticulation was lively during the speech.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Minn barra l-kamra, stajna naraw il-ġestikulazzjonijiet tiegħu mit-tieqa.",
            "text_en": "From outside the room, we could see his gesticulations through the window.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġesù": [
        {
            "text_mt": "Ġesù twieled f’Betlem u trabba f’Nazaret.",
            "text_en": "Jesus was born in Bethlehem and grew up in Nazareth.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Il-Kristjani jemmnu li Ġesù miet u qam mill-imwiet għall-fidwa tal-bniedem.",
            "text_en": "Christians believe that Jesus died and rose from the dead for the redemption of mankind.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "L-istorja ta’ Ġesù hija rrakkontata fl-Evanġelji tal-Bibbja.",
            "text_en": "The story of Jesus is told in the Gospels of the Bible.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġesù-kristu": [
        {
            "text_mt": "Ġesù Kristu huwa meqjus mill-Kristjani bħala l-iben ta’ Alla.",
            "text_en": "Jesus Christ is regarded by Christians as the son of God.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Il-festa ta’ Ġesù Kristu Re tiġi ċċelebrata f’Novembru.",
            "text_en": "The feast of Christ the King is celebrated in November.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "adv-ġew": [
        {
            "text_mt": "Ommi kienet ġew meta wasalt id-dar.",
            "text_en": "My mother was inside when I arrived home.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "prep-ġew": [
        {
            "text_mt": "Poġġejt il-ktieb ġew il-kexxun.",
            "text_en": "I put the book inside the drawer.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "It-tfal damu ġew id-dar il-jiem kollha tax-xita.",
            "text_en": "The children stayed inside the house all the rainy days.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġewlaq": [
        {
            "text_mt": "Il-bidwi ġarr il-ward u l-frott fil-ġewlaq tal-qasab.",
            "text_en": "The farmer carried the flowers and fruit in the wicker basket.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Xtrajt ġewlaq ġdid mis-suq għall-ġnien.",
            "text_en": "I bought a new wicker basket from the market for the garden.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġewnaħ": [
        {
            "text_mt": "L-għasfur kellu ġewnaħ imkisser u ma setax itir.",
            "text_en": "The bird had a broken wing and could not fly.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Il-ġewnaħ tal-ajruplan kien twil u eleganti.",
            "text_en": "The wing of the aeroplane was long and elegant.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Il-familja kollha ġiet taħt il-ġewnaħ ta’ nannuhom.",
            "text_en": "The whole family came under the protection of their grandfather.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "adv-ġewwa": [
        {
            "text_mt": "It-tfal kienu ġewwa meta bdiet ix-xita.",
            "text_en": "The children were inside when it started raining.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Il-qtates iħobbu jibqgħu ġewwa meta jkun kiesaħ.",
            "text_en": "Cats like to stay indoors when it is cold.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "prep-ġewwa": [
        {
            "text_mt": "It-teżor kien moħbi ġewwa l-kaxxa tal-injam.",
            "text_en": "The treasure was hidden inside the wooden box.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Hemm ħafna ħut ġewwa l-baħar Mediterran.",
            "text_en": "There are many fish in the Mediterranean Sea.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "v-ġewwaħ": [
        {
            "text_mt": "Il-gwerra ġewħet lill-poplu kollu għal xhur sħaħ.",
            "text_en": "The war starved the entire population for months on end.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Minflok ma ġewwaħ lill-annimal, kellu jitmgħu kif jixraq.",
            "text_en": "Instead of starving the animal, he should have fed it properly.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġewwenija": [
        {
            "text_mt": "Il-ġewwenija tiegħu ma ħallietux jorgod wara dak li għamel.",
            "text_en": "His conscience did not let him sleep after what he did.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "adj-ġewwieni": [
        {
            "text_mt": "Il-bitħa ta’ ġewwa kienet mimlija fjuri u siġar.",
            "text_en": "The inner courtyard was full of flowers and trees.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Is-sliem ta’ ġewwa huwa importanti daqs is-sliem ta’ barra.",
            "text_en": "Inner peace is as important as outer peace.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġewwieni": [
        {
            "text_mt": "Il-ġewwiena tiegħu nġabru biex jiċċelebraw l-għors.",
            "text_en": "His relatives gathered to celebrate the wedding.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "It-tabib eżamina l-ġewwiena tal-pazjent permezz tal-ultraħoss.",
            "text_en": "The doctor examined the patient’s entrails through ultrasound.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġewwinija": [
        {
            "text_mt": "Kull wieħed għandu ġewwinija li tgħinu jagħmel l-għażla t-tajba.",
            "text_en": "Everyone has a conscience to help them make the right choice.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "adj-ġewħan": [
        {
            "text_mt": "Wara l-mixja twila, uliedi kienu ġewħana u għajjiena.",
            "text_en": "After the long walk, my children were hungry and tired.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Il-qtates ġewħana kienu qed jimjaw madwar il-platt tal-ikel.",
            "text_en": "The hungry cats were meowing around the food bowl.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġewż": [
        {
            "text_mt": "Il-ġewż frisk mis-suq kien ta’ kwalità eċċellenti din is-sena.",
            "text_en": "The fresh nuts from the market were of excellent quality this year.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Xtrajt borza ġewż tal-ġandar għall-kejk tal-Milied.",
            "text_en": "I bought a bag of walnuts for the Christmas cake.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġewżaq": [
        {
            "text_mt": "Il-ġewżaq kien mimli ħajt abjad u lesti għad-drap.",
            "text_en": "The bobbin was full of white thread and ready for weaving.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "In-nanna ħallietli l-ġwieżaq tagħha tal-injam bħala wirt.",
            "text_en": "My grandmother left me her wooden bobbins as an inheritance.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
    "n-ġeħova": [
        {
            "text_mt": "Ix-Xhieda ta’ Ġeħova jippritkaw mill-bieb għall-bieb.",
            "text_en": "Jehovah’s Witnesses preach from door to door.",
            "register": "",
            "nuance": "",
            "source": None
        },
        {
            "text_mt": "Fil-Bibbja, Ġeħova hu spiss imsejjaħ ‘Alla tal-eżerċti’.",
            "text_en": "In the Bible, Jehovah is often called the God of Hosts.",
            "register": "",
            "nuance": "",
            "source": None
        }
    ],
}


def validate_tags(entry, tags, entry_tags):
    """Remove tags not in approved list and auto-forbidden redundant tags."""
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
    if gender == "masculine":
        forbidden_names.add("masculine")
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

    # Remove _scratchpad
    obj.pop("_scratchpad", None)

    # Fix text_en for broken definitions
    if eid in FIXED_EN:
        fixed = FIXED_EN[eid]
        for i, en_text in enumerate(fixed):
            if i < len(entry["definitions"]):
                entry["definitions"][i]["text_en"] = en_text

    # Fix n-ġewż: remove the broken third definition that was a fragment
    if eid == "n-ġewż":
        # The original had 3 defs: "nuts", "walnuts (several nuts", "walnut as a mass or species)"
        # Only keep the first 2 clean definitions
        if len(entry["definitions"]) >= 3:
            entry["definitions"] = entry["definitions"][:2]
        # Also fix the related field plural_form which has duplicated data
        if "plural_form" in entry and entry["plural_form"] is not None and len(entry["plural_form"]) >= 3:
            entry["plural_form"] = entry["plural_form"][:2]

    # Fix n-ġest: the two definitions overlap/repeat
    if eid == "n-ġest":
        # First def: "gesture, act" -> "gesture"
        # Second def: "gesture, sign, movement" -> "kind act"
        entry["definitions"][0]["text_en"] = "gesture, movement"
        entry["definitions"][1]["text_en"] = "kind act, favour"

    # Fix prep-ġewwa: the two definitions overlap
    if eid == "prep-ġewwa":
        entry["definitions"][0]["text_en"] = "in, inside, into"
        entry["definitions"][1]["text_en"] = "within, among, during"

    # Fix n-ġeħova definition
    if eid == "n-ġeħova":
        entry["definitions"][0]["text_en"] = "Jehovah (name of God in the Hebrew Scriptures)"

    # Fill text_mt
    if eid in MT_DEFS:
        mt_defs = MT_DEFS[eid]
        current_defs = entry["definitions"]
        for i, mt in enumerate(mt_defs):
            if i < len(current_defs):
                current_defs[i]["text_mt"] = mt

    # Fill usage examples
    if eid in USAGE_EXAMPLES:
        entry["usage_examples"] = USAGE_EXAMPLES[eid]

    # Validate tags
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
        "tags_kept": 0,
        "tags_removed": 0,
        "text_en_fixed": 0,
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

            # Track text_mt stats
            if entry.get("definitions"):
                filled = sum(1 for d in entry["definitions"] if d.get("text_mt"))
                stats["text_mt_filled"] += filled

            # Track usage examples stats
            if entry.get("usage_examples"):
                stats["usage_examples_added"] += len(entry["usage_examples"])

            # Track tag stats
            stats["tags_kept"] += len(obj.get("tags", []))

            # Scratchpad always removed
            stats["scratchpad_removed"] += 1

            entries.append(obj)

    # Write output
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for obj in entries:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")

    # Stats report
    removed = stats["total"] - stats["tags_kept"]
    # Count pre-refinement tags to compute removal count
    pre_tag_count = 0
    with open(INPUT, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            pre_tag_count += len(obj.get("tags", []))

    actual_removed = pre_tag_count - stats["tags_kept"]

    print("=" * 50)
    print("REFINEMENT COMPLETE: batch_030.jsonl")
    print("=" * 50)
    print(f"  Total entries processed:    {stats['total']}")
    print(f"  Scratchpad removed:         {stats['scratchpad_removed']} / {stats['total']}")
    print(f"  text_mt definitions filled: {stats['text_mt_filled']}")
    print(f"  Usage examples added:       {stats['usage_examples_added']}")
    print(f"  Tags before validation:     {pre_tag_count}")
    print(f"  Tags after validation:      {stats['tags_kept']}")
    print(f"  Tags removed:               {actual_removed}")
    print(f"  text_en fixes:              {len(FIXED_EN)} entries")
    print(f"  Output file:                {OUTPUT}")


if __name__ == "__main__":
    main()
