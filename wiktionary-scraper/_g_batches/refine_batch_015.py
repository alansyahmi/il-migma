#!/usr/bin/env python3
"""Refine batch_015.jsonl: fill text_mt, generate examples, validate tags, remove _scratchpad."""

import json
import sys

INPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_015.jsonl"
OUTPUT = r"c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_015.jsonl"

# ── Approved tag taxonomy (from agent_prompt.md Section 5) ──────────────
USAGE_TAGS = {"common", "rare", "archaic", "neologism", "purist"}
REGISTER_TAGS = {
    "formal", "literary", "colloquial", "archaic", "obsolete",
    "technical", "dialectal", "gozitan", "slang", "vulgar",
    "euphemistic", "figurative", "pejorative", "childish",
}
DOMAIN_TAGS = {
    "agriculture", "anatomy", "animals", "architecture", "art",
    "astronomy", "sea", "botany", "geography", "food", "commerce",
    "family", "physics", "war", "law", "mathematics", "medicine",
    "music", "politics", "religion", "crafts", "sports", "technology",
    "weather", "transport", "time",
}
ALLOWED_TAG_NAMES = USAGE_TAGS | REGISTER_TAGS | DOMAIN_TAGS


def is_tag_redundant(tag_name, entry):
    """Check if a tag is redundant given entry fields."""
    # Never tag "noun" if pos is "noun"
    if tag_name == "noun" and entry.get("pos") == "noun":
        return True
    # Never tag "adjective" if pos is "adjective"
    if tag_name == "adjective" and entry.get("pos") == "adjective":
        return True
    # Never tag "verb" if pos is "verb"
    if tag_name == "verb" and entry.get("pos") == "verb":
        return True
    # Never tag "adverb" if pos is "adverb"
    if tag_name == "adverb" and entry.get("pos") == "adverb":
        return True
    # Never tag "adverb" if pos is "adverb"
    if tag_name == "adverb" and entry.get("pos") == "adverb":
        return True
    # Never tag "loanword" if is_loanword == 1
    if tag_name == "loanword" and entry.get("is_loanword") == 1:
        return True
    # Never tag "semitic" if root_consonants is populated
    if tag_name == "semitic" and entry.get("root_consonants"):
        return True
    # Never tag "feminine" if gender is "feminine"
    if tag_name == "feminine" and entry.get("gender") == "feminine":
        return True
    # Never tag "masculine" if gender is "masculine"
    if tag_name == "masculine" and entry.get("gender") == "masculine":
        return True
    return False


def validate_tags(entry, tags, entry_tags):
    """Remove invalid and redundant tags. Return (cleaned_tags, cleaned_entry_tags)."""
    entry_id = entry.get("id", "")
    valid_tag_ids = set()
    cleaned_tags = []
    for tag in tags:
        tag_name = tag.get("name", "").lower().strip()
        tag_id = tag.get("id", "")
        # Check if tag name is in approved list
        if tag_name not in ALLOWED_TAG_NAMES:
            continue
        # Check redundancy
        if is_tag_redundant(tag_name, entry):
            continue
        valid_tag_ids.add(tag_id)
        cleaned_tags.append(tag)

    cleaned_entry_tags = [
        et for et in entry_tags
        if et.get("tag_id") in valid_tag_ids
    ]
    return cleaned_tags, cleaned_entry_tags


def build_entry_map():
    """Return a dict keyed by entry ID with text_mt definitions and usage examples."""
    # Each entry: { "definitions": [{text_mt}...], "usage_examples": [{"mt","en"}...] }
    return {

        # ── 1. għannej ──
        "n-għannej": {
            "definitions": [
                {"text_mt": "Persuna li tkanta, speċjalment bħala professjoni jew arti"}
            ],
            "usage_examples": [
                {"mt": "L-għannej kellu leħen sabiħ li mess lil kulħadd fil-kunċert.", "en": "The singer had a beautiful voice that moved everyone at the concert."},
                {"mt": "Hi għannejja magħrufa madwar il-gżejjer Maltin.", "en": "She is a well-known singer across the Maltese islands."},
            ]
        },

        # ── 2. għanqa ──
        "n-għanqa": {
            "definitions": [
                {"text_mt": "Azzjoni li biha persuna tħaddan lil oħra b'idejha b'mħabba jew affezzjoni"}
            ],
            "usage_examples": [
                {"mt": "Tani għanqa kbira meta ltaqgħajna wara dawn is-snin kollha.", "en": "She gave me a big hug when we met after all these years."},
                {"mt": "L-għanqiet sħan huma importanti għas-saħħa mentali.", "en": "Warm hugs are important for mental health."},
            ]
        },

        # ── 3. għanqbut ──
        "n-għanqbut": {
            "definitions": [
                {"text_mt": "Xibka rqiqa li l-brimba tagħmel mill-ħarir tagħha biex taqbad l-insetti"}
            ],
            "usage_examples": [
                {"mt": "Kien hemm għanqbut mal-ħajt kollu fil-kantina.", "en": "There were spiderwebs all over the wall in the cellar."},
                {"mt": "L-għanqbuta kienet mimlija qtar ta' nida filgħodu.", "en": "The cobweb was full of dewdrops in the morning."},
            ]
        },

        # ── 4. għanqra ──
        "n-għanqra": {
            "definitions": [
                {"text_mt": "Nefħa fil-griżmejn ikkawżata minn tkabbir tal-glandola tirojde"},
                {"text_mt": "Saff żejjed ta' xaħam taħt il-geddum li jagħti dehra ta' nefħa"},
            ],
            "usage_examples": [
                {"mt": "It-tabib iddijanjostika l-għanqra bħala problema tat-tirojde.", "en": "The doctor diagnosed the goitre as a thyroid problem."},
                {"mt": "B'dawn l-għenieqer jidher li għandu piż żejjed.", "en": "With those double chins he looks like he is overweight."},
            ]
        },

        # ── 5. għanqud ──
        "n-għanqud": {
            "definitions": [
                {"text_mt": "Numru ta' frott imkabbar flimkien fuq zokk wieħed, bħall-għeneb"}
            ],
            "usage_examples": [
                {"mt": "Xtrajt għanqud għeneb kbir mis-suq il-ġimgħa li għaddiet.", "en": "I bought a large bunch of grapes from the market last week."},
                {"mt": "L-għenieqed tad-dati kienu tqal u misjura fix-xitwa.", "en": "The bunches of dates were heavy and ripe in winter."},
            ]
        },

        # ── 6. għansal ──
        "n-għansal": {
            "definitions": [
                {"text_mt": "Pjanta selvaġġa tal-basal bil-weraq twal u fjuri bojod, li tikber fir-reġjun tal-Mediterran"}
            ],
            "usage_examples": [
                {"mt": "L-għansal jikber fl-għelieqi tal-kampanja Maltija.", "en": "The squill grows in the fields of the Maltese countryside."},
                {"mt": "Il-basal tal-għansal kien jintuża fil-mediċina tradizzjonali.", "en": "Squill bulbs were used in traditional medicine."},
            ]
        },

        # ── 7. għansar ──
        "n-għansar": {
            "definitions": [
                {"text_mt": "Pjanta selvaġġa tal-basal bil-weraq twal u fjuri bojod, li tikber fir-reġjun tal-Mediterran"}
            ],
            "usage_examples": [
                {"mt": "L-għansar huwa pjanta komuni fil-veġetazzjoni Maltija.", "en": "Squill is a common plant in Maltese vegetation."},
                {"mt": "Il-fjuri tal-għansar jitilgħu fir-rebbiegħa.", "en": "Squill flowers appear in spring."},
            ]
        },

        # ── 8. għansli (adjective) ──
        "adj-għansli": {
            "definitions": [
                {"text_mt": "Li m'għandu l-ebda valur jew siwi, li ma jiswa xejn"}
            ],
            "usage_examples": [
                {"mt": "Dak ir-rigal kien għansli u xejn ma fisser għalija.", "en": "That gift was worthless and meant nothing to me."},
                {"mt": "Il-merkanzija għanslin ma jistgħux jinbiegħu fis-suq.", "en": "Worthless goods cannot be sold in the market."},
            ]
        },

        # ── 9. għansri (adjective) ──
        "adj-għansri": {
            "definitions": [
                {"text_mt": "Li m'għandu l-ebda valur jew siwi, li ma jiswa xejn"}
            ],
            "usage_examples": [
                {"mt": "Il-fehma tiegħu kienet għansri għal dawk li jieħdu d-deċiżjonijiet.", "en": "His opinion was worthless to those making the decisions."},
                {"mt": "Dawn il-karti foloz huma għansrin u ma jistgħux jintużaw.", "en": "These fake documents are worthless and cannot be used."},
            ]
        },

        # ── 10. għant ──
        "n-għant": {
            "definitions": [
                {"text_mt": "Għata ta' xabla jew sejf li żżomm ix-xafra u tipproteġiha"},
                {"text_mt": "Għata ta' arma b'xafra, bħal xabla jew mus"},
            ],
            "usage_examples": [
                {"mt": "Ix-xabla kellha għant imżejjen bil-fidda.", "en": "The sword had a scabbard decorated with silver."},
                {"mt": "Il-ġellied ġibed ix-xabla mill-għant tagħha b'ġesti veloċi.", "en": "The warrior drew the sword from its sheath with swift movements."},
            ]
        },

        # ── 11. għaqad ──
        "v-għaqad": {
            "definitions": [
                {"text_mt": "Isir likwidu jissoda u jsir massa nofs solida, bħal demm jew bajda"},
                {"text_mt": "Isir demm jissoda u jifforma ġelata mhux likwida"},
                {"text_mt": "Isir oħxon, jitlef in-nisġa likwida tiegħu"},
                {"text_mt": "Jingħaqad flimkien, jifforma grupp magħqud u qawwi"},
            ],
            "usage_examples": [
                {"mt": "Id-demm beda jgħaqad malajr wara l-korriment.", "en": "The blood began to coagulate quickly after the injury."},
                {"mt": "Il-ġelatina għaqdet wara li tkessħet fil-friġġ.", "en": "The jelly congealed after being cooled in the fridge."},
                {"mt": "Il-klassi għaqdet flimkien biex tirbaħ il-kompetizzjoni tal-isport.", "en": "The class became tight-knit to win the sports competition."},
            ]
        },

        # ── 12. għaqal ──
        "n-għaqal": {
            "definitions": [
                {"text_mt": "Kapaċità li wieħed jaħseb u jiddeċiedi b'mod sensibbli u razzjonali"},
                {"text_mt": "Stat ta' żvilupp mentali u emozzjonali sħiħ"},
            ],
            "usage_examples": [
                {"mt": "Dejjem wera l-għaqal fid-deċiżjonijiet importanti ta' ħajtu.", "en": "He always showed wisdom in the important decisions of his life."},
                {"mt": "Bil-maturità jiġi l-għaqal u l-fehma t-tajba tal-affarijiet.", "en": "With maturity comes good sense and the right understanding of things."},
            ]
        },

        # ── 13. għaqar ──
        "v-għaqar": {
            "definitions": [
                {"text_mt": "Jagħmel ferita miftuħa u infettata fuq il-ġilda jew membrana mukuża"},
                {"text_mt": "Iħoss nuqqas ta' fiduċja lejn xi ħadd, ikun suspettuż minnu"},
            ],
            "usage_examples": [
                {"mt": "Il-ferita bdiet tgħaqar minħabba n-nuqqas ta' kura.", "en": "The wound began to ulcerate because of the lack of treatment."},
                {"mt": "Niesna bdew jgħaqru minnu wara li semgħu l-għidut.", "en": "Our people became suspicious of him after hearing the gossip."},
            ]
        },

        # ── 14. għaqba ──
        "n-għaqba": {
            "definitions": [
                {"text_mt": "Għolja żgħira jew art imgħollija fuq il-livell ta' madwarha"}
            ],
            "usage_examples": [
                {"mt": "It-telgħa kien fih bosta għeqiebi li għamlu l-mixi diffiċli.", "en": "The slope had many small mounds that made walking difficult."},
                {"mt": "Wara l-għolja kien hemm wiċċ ta' art ċatta mimlija għelieqi.", "en": "Beyond the hill there was a flat stretch of land full of fields."},
            ]
        },

        # ── 15. għaqda ──
        "n-għaqda": {
            "definitions": [
                {"text_mt": "Ftehim jew istituzzjoni li permezz tagħha żewġ persuni jew aktar jingħaqdu flimkien, bħaż-żwieġ"},
                {"text_mt": "Grupp organizzat ta' nies iffurmat għal skop partikolari, bħal klabb jew alleanza"},
                {"text_mt": "Stat ta' magħqudija u solidarjetà bejn il-membri ta' grupp"},
            ],
            "usage_examples": [
                {"mt": "Il-għaqda tal-ħaddiema ġġieldu għal kundizzjonijiet aħjar.", "en": "The workers' union fought for better conditions."},
                {"mt": "Iż-żwieġ huwa għaqda qaddisa bejn raġel u mara.", "en": "Marriage is a sacred union between a man and a woman."},
                {"mt": "L-għaqda bejn il-membri tat-tim kienet notevoli.", "en": "The unity among the team members was remarkable."},
            ]
        },

        # ── 16. għaqda ċivili ──
        "n-għaqda-ċivili": {
            "definitions": [
                {"text_mt": "Unjoni legali bejn żewġ persuni, rikonoxxuta mill-istat, li tagħti drittijiet u responsabbiltajiet simili għaż-żwieġ"}
            ],
            "usage_examples": [
                {"mt": "Huma għażlu li jagħmlu għaqda ċivili minflok jiżżewġu l-knisja.", "en": "They chose to enter a civil union instead of getting married in church."},
                {"mt": "L-għaqdiet ċivili huma protetti mil-liġi f'Malta.", "en": "Civil unions are protected by law in Malta."},
            ]
        },

        # ── 17. għaqli ──
        "adj-għaqli": {
            "definitions": [
                {"text_mt": "Li għandu l-għaqal, li jaħseb u jaġixxi b'mod razzjonali u prudenti"}
            ],
            "usage_examples": [
                {"mt": "Kien għaqli biżżejjed biex ma jinvestix il-flus kollha f'riskju wieħed.", "en": "He was wise enough not to invest all his money in one risk."},
                {"mt": "Deċiżjoni għaqlija tista' tiffranka ħafna problemi fil-futur.", "en": "A prudent decision can save many problems in the future."},
            ]
        },

        # ── 18. għaqqad ──
        "v-għaqqad": {
            "definitions": [
                {"text_mt": "Iġiegħel żewġ affarijiet jew aktar jingħaqdu flimkien f'ħaġa waħda"},
                {"text_mt": "Iġiegħel nies jew gruppi jiffurmaw entità waħda"},
                {"text_mt": "Iġiegħel affarijiet differenti jsiru sistema waħda"},
            ],
            "usage_examples": [
                {"mt": "Iċ-chairperson irnexxielu jgħaqqad lill-membri kollha mad-deċiżjoni.", "en": "The chairperson managed to unite all the members around the decision."},
                {"mt": "Il-proġett għaqqad it-teknoloġija mat-tradizzjoni b'suċċess kbir.", "en": "The project joined technology with tradition with great success."},
            ]
        },

        # ── 19. għaqra ──
        "n-għaqra": {
            "definitions": [
                {"text_mt": "Ferita miftuħa u infettata fuq il-ġilda jew membrana mukuża li tfejjaq bil-mod"}
            ],
            "usage_examples": [
                {"mt": "L-għaqra ma riditx tfejjaq minkejja l-mediċina kollha li uża.", "en": "The ulcer would not heal despite all the medicine he used."},
                {"mt": "L-għoqor jistgħu jkunu sintomu ta' mard serju fl-istonku.", "en": "Ulcers can be a symptom of serious stomach disease."},
            ]
        },

        # ── 20. Għaqreb ──
        "n-għaqreb": {
            "definitions": [
                {"text_mt": "Kostellazzjoni kbira viżibbli fis-sema tan-Nofsinhar, li tixbah lill-forma ta' skorpjun"},
                {"text_mt": "Is-sitt sinjal taż-żodijaku għal dawk imwielda bejn it-23 ta' Ottubru u l-21 ta' Novembru"},
            ],
            "usage_examples": [
                {"mt": "Stajna naraw il-kostellazzjoni ta' L-Għaqreb b'mod ċar dak il-lejl.", "en": "We could see the constellation of Scorpius clearly that night."},
                {"mt": "Twelet taħt is-sinjal tal-Għaqreb, li jagħmilha persuna passjonata.", "en": "She was born under the sign of Scorpio, which makes her a passionate person."},
            ]
        },

        # ── 21. għar ──
        "n-għar": {
            "definitions": [
                {"text_mt": "Spazju kbir naturali taħt l-art jew gewwa muntanja, bi ftuħ minn barra"},
                {"text_mt": "Telfa tal-istima personali jew tal-kunċett li ħaddieħor għandu minn xi ħadd", "register": "arkajku"},
                {"text_mt": "Sensazzjoni ta' mistħija kbira quddiem ħaddieħor", "register": "arkajku"},
            ],
            "usage_examples": [
                {"mt": "L-għar kien jintuża mill-bnedmin tal-qedem bħala kenn.", "en": "The cave was used by ancient humans as shelter."},
                {"mt": "Ħa għar kbir quddiem in-nies meta nstab jigdeb.", "en": "He suffered great disgrace in front of people when he was caught lying."},
                {"mt": "L-għerien ta' Għar Dalam huma fost l-aktar importanti f'Malta.", "en": "The caves of Għar Dalam are among the most important in Malta."},
            ]
        },

        # ── 22. għar u każa ──
        "n-għar-u-każa": {
            "definitions": [
                {"text_mt": "Ġrajja jew sitwazzjoni li ġġib għar u mistħija kbira lill-persuna kkonċernata"}
            ],
            "usage_examples": [
                {"mt": "Kien għar u każa meta nkixfet l-iskandlu fil-gazzetti kollha.", "en": "It was a great disgrace when the scandal was exposed in all the newspapers."},
                {"mt": "Dak li għamel ġab għar u każa fuq il-familja kollha.", "en": "What he did brought great shame upon the whole family."},
            ]
        },

        # ── 23. għar-riq ──
        "adv-għar-riq": {
            "definitions": [
                {"text_mt": "B'żaqq vojt, mingħajr ma wieħed ikun kiel ikel minn mindu qam"}
            ],
            "usage_examples": [
                {"mt": "It-tabib qalli li għandi nieħu l-mediċina għar-riq kull filgħodu.", "en": "The doctor told me I should take the medicine on an empty stomach every morning."},
                {"mt": "Għar-riq, kafè jista' jagħmel ħsara lill-istonku.", "en": "On an empty stomach, coffee can harm the stomach."},
            ]
        },

        # ── 24. għarab ──
        "n-għarab": {
            "definitions": [
                {"text_mt": "Għasfur ta' daqs kbir ta' lewn iswed, li jinstab f'ħafna partijiet tad-dinja u magħruf għall-għajta qawwija tiegħu"}
            ],
            "usage_examples": [
                {"mt": "L-għarab tant kienu jgħajtu filgħaxija li ma stajt norqod.", "en": "The crows were cawing so loudly in the evening that I could not sleep."},
                {"mt": "L-irgħab ġew fl-għelieqi malli bdew jaħartu l-art.", "en": "The ravens came to the fields as soon as they started ploughing the land."},
            ]
        },

        # ── 25. għaraf ──
        "v-għaraf": {
            "definitions": [
                {"text_mt": "Jagħraf xi ħadd jew xi ħaġa li diġà ra, iltaqa' magħha, jew kellu esperjenza tagħha qabel"},
                {"text_mt": "Isir konxju ta' xi ħaġa ġdida, jiskopri informazzjoni li ma kellux qabel"},
                {"text_mt": "Jiskopri l-vera natura ta' xi ħadd jew xi ħaġa permezz ta' osservazzjoni"},
            ],
            "usage_examples": [
                {"mt": "Għaraftu minn mal-bogħod għax kien jilbes libsa ħamra.", "en": "I recognised him from far away because he was wearing a red suit."},
                {"mt": "Għaraf li kien hemm xi ħaġa ħażina mill-ewwel daqqa t'għajn.", "en": "He became aware that something was wrong at first glance."},
                {"mt": "Wara ħafna riċerka, għaraf il-verità wara l-istorja kollha.", "en": "After much research, he found out the truth behind the whole story."},
            ]
        },
    }


def refine_entry(entry_data, refinement_map):
    """Refine a single entry: remove _scratchpad, fill text_mt, add examples, validate tags."""
    # Remove _scratchpad
    entry_data.pop("_scratchpad", None)

    entry = entry_data.get("entry", {})
    entry_id = entry.get("id", "")

    refinements = refinement_map.get(entry_id, {})
    def_refs = refinements.get("definitions", [])
    ex_refs = refinements.get("usage_examples", [])

    # Fill text_mt from refinement map
    definitions = entry.get("definitions", [])
    for i, defn in enumerate(definitions):
        if defn.get("text_mt") is None:
            if i < len(def_refs):
                # Carry over register and nuance from the ref if specified
                defn["text_mt"] = def_refs[i].get("text_mt", "")
                if def_refs[i].get("register"):
                    defn["register"] = def_refs[i]["register"]
            else:
                defn["text_mt"] = ""

    # Set usage examples
    entry["usage_examples"] = ex_refs

    # Validate tags
    tags = entry_data.get("tags", [])
    entry_tags = entry_data.get("entry_tags", [])
    cleaned_tags, cleaned_entry_tags = validate_tags(entry, tags, entry_tags)
    entry_data["tags"] = cleaned_tags
    entry_data["entry_tags"] = cleaned_entry_tags

    return entry_data


def main():
    import os
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    refinement_map = build_entry_map()

    stats = {
        "total": 0,
        "text_mt_filled": 0,
        "examples_generated": 0,
        "tags_removed": 0,
        "scratchpad_removed": 0,
        "entries_with_tags_removed": 0,
    }

    with open(INPUT, "r", encoding="utf-8-sig") as inf, \
         open(OUTPUT, "w", encoding="utf-8") as outf:
        for line in inf:
            line = line.strip()
            if not line:
                continue
            entry_data = json.loads(line)

            stats["total"] += 1

            # Count scratchpad removal
            if "_scratchpad" in entry_data:
                stats["scratchpad_removed"] += 1

            # Count before tag removal
            orig_tag_count = len(entry_data.get("tags", []))

            refined = refine_entry(entry_data, refinement_map)

            # Count tag removal
            new_tag_count = len(refined.get("tags", []))
            removed = orig_tag_count - new_tag_count
            stats["tags_removed"] += removed
            if removed > 0:
                stats["entries_with_tags_removed"] += 1

            # Count text_mt filled (non-null, non-empty now)
            for defn in refined.get("entry", {}).get("definitions", []):
                if defn.get("text_mt") and len(defn["text_mt"]) > 0:
                    stats["text_mt_filled"] += 1

            # Count examples
            ex_count = len(refined.get("entry", {}).get("usage_examples", []))
            stats["examples_generated"] += ex_count

            # Remove trailing whitespace in text_mt values that may have been affected
            for defn in refined.get("entry", {}).get("definitions", []):
                if "text_mt" in defn and defn["text_mt"] is not None:
                    defn["text_mt"] = defn["text_mt"].rstrip()

            outf.write(json.dumps(refined, ensure_ascii=False) + "\n")

    print(f"Batch 015 Refinement Complete")
    print(f"{'='*40}")
    print(f"Total entries processed:   {stats['total']}")
    print(f"_scratchpad removed from: {stats['scratchpad_removed']}")
    print(f"Definitions filled:        {stats['text_mt_filled']}")
    print(f"Usage examples added:      {stats['examples_generated']}")
    print(f"Invalid tags removed:      {stats['tags_removed']} (across {stats['entries_with_tags_removed']} entries)")
    print(f"{'='*40}")
    print(f"Output written to: {OUTPUT}")


if __name__ == "__main__":
    main()
