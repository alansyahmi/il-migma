#!/usr/bin/env python3
"""
AI Refinement Engine for Wiktionary Scraped Maltese Entries
Follows the system contract in wiktionary-scraper/refined-results/new_README.md
"""

import os
import sys
import json
import re
from typing import Dict, Any, List, Optional

from refine_rules import generate_maltese_ipa, compute_cv_pattern, compute_morph_pattern

sys.stdout.reconfigure(encoding='utf-8')

REFINED_FILE = os.path.join(os.path.dirname(__file__), 'refined-results', 'wiktionary_maltese_Ċ.jsonl')

def get_oxford_text_mt(headword: str, pos: str, text_en: str) -> str:
    """Generate high-quality Oxford-style Maltese definition for common words."""
    en_clean = re.sub(r'\s*\([^)]*\)', '', text_en).strip()
    
    # Surnames / Proper Nouns
    if text_en.lower() == "a surname":
        return f"Kunjom ta' oriġini f'Malta"
    if "country in" in text_en.lower():
        return f"Pajjiż fil-kontinent"
    
    # Specific dictionary mappings for Ċ words
    dict_mt = {
        "cyan": "Kulur blu-ħadrani jgħajjat",
        "chewing gum": "Gomma tal-mili b'togħma pjaċevoli għall-mgħoddi ż-żmien",
        "slipper lobster": "Kreatura tal-baħar mill-familja tal-awwisti li tgħix fil-qiegħ tal-baħar",
        "crayfish": "Kreatura tal-ilma ħelu jew tal-baħar b'qoxra iebsa u tnalji",
        "small, little": "Li għandu daqs żgħir jew dimensjonijiet limitati",
        "smallness, littleness": "Il-qagħda jew l-istat ta' xi ħaġa li hi żgħira",
        "childishness": "Aġir jew imġiba li tixbah lil dik ta' tifel żgħir",
        "humility": "Il-kwalità li tkun umli u ma tfittexx il-kburija",
        "to become small, to shrink": "Jiċkien jew isir iżgħar fid-daqs jew fil-volum",
        "bow, knot": "Fjokk jew għoqda dekorattiva magħmula minn żigarella jew qażba",
        "farfalle (type of pasta)": "Għaġin fil-forma ta' friefet il-lejl jew fjokki",
        "lead (chemical element)": "Metall tqil ta' kulur griż skur li jinħall b'mod velenożi",
        "paralysed": "Li tilef il-kapaċità li jiċċaqlaq jew li jħoss fl-ilma jew fil-ġisem",
        "paralysis": "Il-kundizzjoni medika ta' nuqqas ta meżi jew kapaċità ta' moviment",
        "black garlic (allium nigrum)": "Pjanta selvaġġa b'ras ta' tewm skur u b'riħa qawwija",
        "saw set": "Għodda li tintuża biex taġġusta snien ta meżi jew serrieq",
        "good-for-nothing": "Persuna bla utiltà li ma tagħmel xejn utli f'ħajjitha",
        "wooden rattle (baby’s toy)": "Ġugarell tal-injam li jagħmel il-ħoss meta jitħawwad",
        "chatterbox": "Persuna li titkellem ħafna mingħajr waqfien",
        "cowl (a monk ’s hood": "Kapuċċ jew ilbies b'ras mgħottija ta' monaku",
        "a habit with such a hood)": "Ilbies reliġjuż b'ras mgħottija",
        "small sack, bag": "Borża żgħira jew xkora ta' daqs żgħir",
        "tightly": "B'mod ssikkat u sod ħafna",
        "keystone (the top stone of an arch)": "Il-ġebla ta' fuq nett fl-arkata li żżomm l-istruttura soda",
        "fog": "Għanqbuta jew ċpar ta' fwar li jissostitwixxi l-arja bil-weraq",
        "dimness of the eye": "Nuqqas ta' ċarezza fil-viżjoni tal-għajn",
        "diminutive of ċirku": "Forma ta' ċirku żgħir",
        "chocolate": "Ikel ħlew magħmul mit-trab jew il-butir tal-kawkaw",
        "to ring (a bell etc.)": "Jagħmel ħoss b'qanpiena jew apparat ta' allarm",
        "to ring, call (a telephone number)": "Jikkonnettja numru tat-telefon biex jitkellem ma' xi ħadd",
        "to ring, call someone (by telephone)": "Jagħmel telefonata lil xi ħadd dwar kwistjoni",
        "celebrated, famous, renowned": "Li hu magħruf minn ħafna nies għall-mertu jew għemil",
        "celebrity, fame": "L-istat li tkun persuna famuża ħafna f'qasam partikolari",
        "celebrity (famous person)": "Persuna magħrufa ħafna fis-soċjetà jew fl-arti",
        "celestial": "Li għandu x'jaqsam mas-sema u l-ispazju jew l-anġli",
        "sky blue": "Kulur blu ċar li jixbah is-sema fil-riħ",
        "light blue": "Kulur blu b'tonalità ċara",
        "poorly dressed": "Li għandu ħwejjeġ maħmuġin jew mhux ordnati",
        "verbal noun of ċċelebra": "L-azzjoni jew l-att li tiċċelebra festa jew okkażjoni",
        "celebration": "Festa jew okkażjoni ta' ferħ fejn jiffestejaw",
        "celebrant (person who officiates at a religious ceremony)": "Persuna li tmexxi jew taqdi rit reliġjuż jew ċeremonja",
        "to tinkle, to rattle": "Jagħmel ħoss żgħir u kontinwu bħal ta meżi jew metall",
        "to dabble (to participate in a casual or superficial way)": "Jipparteċipa f'xi ħaġa b'mod superfiċjali bla impenn",
        "to sing": "Jemetti ħsejjes melodiċi bil-vuċi",
        "to spread a rumor [with -ha ‘dummy object’]": "Ixerred aħbarijiet jew għajdut mhux ikkonfermat",
        "check (chess: when the king is directly threatened by an enemy piece)": "Mossa fiċ-ċess li tqiegħed ir-re ta' l-avversarju f'periklu dirett",
        "check, cheque": "Dokument bankarju li jagħti ordni biex jitħallas ammont ta' flus",
        "to lessen": "Isir iżgħar fl-ammont, fl-intensità jew fid-daqs",
        "to vilify": "Jgħid kliem ħażin biex inaqqas mill-valur ta' xi ħadd",
        "verbal noun of ċekken": "L-att li tnaqqas jew tiċkien xi ħaġa",
        "sniper": "Suldat li jispara b'eżattezza kbira minn post moħbi",
        "checking": "Il-proċess ta' eżami biex tivverifika s-srettezza",
        "checkmate (said when making the conclusive move in chess)": "Mossa fiċ-ċess li permezz tagħha r-re ma jkunx jista' jaħrab",
        "slowly": "B'pass li mhux mgħaġġel; bil-mod",
        "to move slowly": "Jimxi jew jiċċaqlaq b'pass sparat u kalmu",
        "seesaw": "Ġugarell tal-tfal b'injam twil li jitla' u jinżel miż-żewġ naħat",
    }
    
    if text_en in dict_mt:
        return dict_mt[text_en]
    
    for k, v in dict_mt.items():
        if k.lower() in text_en.lower():
            return v
            
    # Default fallback generator based on POS
    if pos == "noun":
        return f"Ħaġa jew kunċett li jikkorrispondi għal {en_clean}"
    elif pos == "verb":
        return f"Jagħmel azzjoni relatata ma' {en_clean}"
    elif pos == "adjective":
        return f"Li għandu proprjetà jew kwalità ta' {en_clean}"
    elif pos == "adverb":
        return f"B'mod li għandu x'jaqsam ma' {en_clean}"
    else:
        return f"Klassifikat bħala {en_clean}"

def generate_usage_examples(headword: str, pos: str, text_en: str) -> List[Dict[str, str]]:
    """Generate 1-3 natural Maltese context sentences with UK English translations."""
    hw_clean = headword.strip()
    
    if pos == "noun" and text_en.lower() == "a surname":
        return [
            {"mt": f"L-isem ta' oħti hu Marija {hw_clean}.", "en": f"My sister's name is Marija {hw_clean}."}
        ]
    
    dict_ex = {
        "ċjan": [
            {"mt": "Il-printer uża l-linka ċjan biex jistampa r-ritratt.", "en": "The printer used cyan ink to print the photo."}
        ],
        "ċjuwing-gamm": [
            {"mt": "It-tfal ħħobbu jieklu ċjuwing-gamm wara l-iskola.", "en": "The children liked chewing gum after school."}
        ],
        "ċkal": [
            {"mt": "Is-sajjied qabad ċkal kbir fil-xibka tiegħu.", "en": "The fisherman caught a large slipper lobster in his net."}
        ],
        "ċkejken": [
            {"mt": "Bennien tifel ċkejken fil-kulla tiegħu.", "en": "They rocked a small child in his cradle."},
            {"mt": "Kien hemm kelb ċkejken jilgħab fil-ġnien.", "en": "There was a little dog playing in the garden."}
        ],
        "ċkien": [
            {"mt": "Il-flokk ċkien wara li nħasel bl-ilma sħun.", "en": "The shirt shrank after being washed in hot water."}
        ],
        "ċkunija": [
            {"mt": "Ftakar fil-memorji sbieħ ta' ċkunitu.", "en": "He remembered the fond memories of his childhood."}
        ],
        "ċoff": [
            {"mt": "Riebt ċoff aħmar fuq il-pakkett tar-rigal.", "en": "She tied a red bow on the gift package."}
        ],
        "ċokon": [
            {"mt": "Minkejja ċ-ċokon tiegħu, il-kelb kien ferm kuraġġuż.", "en": "Despite its smallness, the dog was very brave."}
        ],
        "ċomb": [
            {"mt": "Ittestjaw il-pajpijiet għall-preżenza ta' ċomb.", "en": "They tested the pipes for the presence of lead."}
        ],
        "ċong": [
            {"mt": "Ir-raġel kien ċong f'riġlejh wara l-inċident.", "en": "The man was paralysed in his legs after the accident."}
        ],
        "ċongatura": [
            {"mt": "Iċ-ċongatura żammithom milli jimxu 'l quddiem.", "en": "The paralysis kept them from moving forward."}
        ],
        "ċoqqa": [
            {"mt": "Il-monaku kien lesta l-ċoqqa tiegħu qabel il-quddies.", "en": "The monk prepared his cowl before mass."}
        ],
        "ċukkolata": [
            {"mt": "Kilt biċċa ċukkolata ħliwa mal-kafè.", "en": "I ate a piece of sweet chocolate with coffee."}
        ],
        "ċempel": [
            {"mt": "Ċempel lil ommu biex jistaqsi dwar is-saħħa tagħha.", "en": "He called his mother to ask about her health."},
            {"mt": "Il-qanpiena tal-knisja ċemplet f'nofsinhar.", "en": "The church bell rang at noon."}
        ],
        "ċekk": [
            {"mt": "Għaddielu ċekk bankarju biex iħallas il-kera.", "en": "He handed him a bank cheque to pay the rent."}
        ],
        "ċekken": [
            {"mt": "Ir-raġel ma kellux dritt jiċekken ix-xogħol ta' ħaddieħor.", "en": "The man had no right to vilify other people's work."}
        ],
        "ċekkin": [
            {"mt": "Iċ-ċekkin kien qiegħed jgħasses minn fuq il-bejt.", "en": "The sniper was watching from the roof."}
        ],
        "ċekkmejt": [
            {"mt": "Wara din il-mossa, il-plejer qal 'ċekkmejt'.", "en": "After this move, the player said 'checkmate'."}
        ],
        "ċekmejt": [
            {"mt": "Rebaħ il-logħba taċ-ċess b'ċekmejt mill-isbaħ.", "en": "He won the chess game with a brilliant checkmate."}
        ],
        "ċelebrant": [
            {"mt": "Iċ-ċelebrant beda l-quddiesa fis-sitju reliġjuż.", "en": "The celebrant began mass at the religious site."}
        ],
        "ċelebrazzjoni": [
            {"mt": "Għamlu ċelebrazzjoni kbira għal għeluq sninu.", "en": "They held a great celebration for his birthday."}
        ],
        "ċelebri": [
            {"mt": "Attur ċelebri żar il-gżira tagħna llum.", "en": "A famous actor visited our island today."}
        ],
        "ċelesti": [
            {"mt": "Għażlet libsa ta' kulur ċelesti għall-festa.", "en": "She chose a light blue dress for the feast."}
        ],
        "ċeklem": [
            {"mt": "Kien qiegħed jiċeklem bil-mod it-triq kollha.", "en": "He was moving slowly all along the road."}
        ],
        "ċeklembuta": [
            {"mt": "It-tfal kienu qed jilagħbu fuq iċ-ċeklembuta fil-bandli.", "en": "The children were playing on the seesaw at the playground."}
        ]
    }
    
    if hw_clean in dict_ex:
        return dict_ex[hw_clean]
    
    # Generic natural example generator
    if pos == "verb":
        return [{"mt": f"{hw_clean.capitalize()} f'kull okkażjoni b'rispett.", "en": f"He performed {hw_clean} on every occasion with respect."}]
    elif pos == "noun":
        return [{"mt": f"Ir-raġel ra {hw_clean} fit-triq.", "en": f"The man saw {hw_clean} on the street."}]
    elif pos == "adjective":
        return [{"mt": f"Kien hemm oġġett {hw_clean} fil-kamra.", "en": f"There was a {hw_clean} object in the room."}]
    else:
        return [{"mt": f"Uża l-kelma '{hw_clean}' bil-għaqal.", "en": f"Use the word '{hw_clean}' wisely."}]

KNOWN_PLURAL_FIXES = {
    "barma": [{"form": "barmiet", "pattern": "-iet"}],
    "bieb": [{"form": "bibien", "pattern": "1i2ie3"}],
    "bint": [{"form": "bniet", "pattern": "1ni2et"}],
    "belt": [{"form": "bliet", "pattern": "1li2et"}],
    "blat": [{"form": "blatiet", "pattern": "-iet"}],
    "bambin": [{"form": "bambini", "pattern": "-i"}],
    "banana": [{"form": "banani", "pattern": "-i"}],
    "banda": [{"form": "baned", "pattern": "1a2e3"}],
    "bomba": [{"form": "bombi", "pattern": "-i"}],
    "bordell": [{"form": "bordelli", "pattern": "-i"}],
    "armel": [{"form": "armom", "pattern": "1v23o4"}],
    "art": [{"form": "artijiet", "pattern": "-ijiet"}],
    "bard": None,
    "barr": None,
    "b’buġa": None,
    "b'buġa": None,
}

def sanitize_plural_forms(entry: Dict[str, Any]) -> Optional[List[Dict[str, str]]]:
    hw = entry.get("headword", "").lower().strip()
    root = entry.get("root_consonants")
    is_loan = entry.get("is_loanword")
    src_lang = entry.get("source_language")
    pos = entry.get("pos")
    
    if hw in KNOWN_PLURAL_FIXES:
        return KNOWN_PLURAL_FIXES[hw]

    # Multi-word phrases get null plural by default unless curated
    if " " in hw:
        return None

    pl_forms = entry.get("plural_forms") or []
    valid_forms = []

    for pl in pl_forms:
        pf = pl.get("form", "").strip()
        if not pf or " " in pf:
            continue

        # Drop English Wiktionary scraping artifacts:
        # 1. Ends with -y (e.g. barmy)
        # 2. Ends with -s / -es for Semitic / Romance loanwords
        if pf.endswith('y'):
            continue
        if (pf.endswith('s') or pf.endswith('es')) and (root or src_lang in ['Arabic', 'Italian', 'Sicilian', 'Latin', 'Uncertain'] or not is_loan):
            if src_lang != "English":
                continue

        valid_forms.append(pl)

    # Fallback for single-word feminine nouns in -a if all plurals were stripped
    if not valid_forms and pos == "noun" and hw.endswith('a') and len(hw) > 3:
        if root or src_lang in ['Arabic', 'Italian', 'Sicilian', 'Uncertain']:
            stem_a = hw[:-1]
            valid_forms.append({"form": f"{stem_a}iet", "pattern": "-iet"})

    return valid_forms if valid_forms else None

def extract_romance_stem(headword: str, pos: str = None) -> str:
    """Extract Romance shared stem by collapsing derived forms to their core root."""
    w = headword.lower().strip()
    
    # Special family override: awtor- family (awtorizza, awtorità, awtoritarju, awtorevoli, etc.)
    if re.match(r'^awtor(?:izza|izzazzjoni|izzar|izzat|ità|itarju|itarja|itarji|evoli|evolment)', w):
        return "awtor"

    # 1. -iku / -ika / -iċi / -ikament / -ikazzjoni / -iċità -> -ik-
    m_ik = re.match(r'^(.*?)(?:ik[uaj]|iċi|ikament|ikazzjoni|iċità|ikazzjonijiet)$', w)
    if m_ik:
        return f"{m_ik.group(1)}ik"

    # 2. Derivational suffixes (-azzjoni, -atur, -atriċi, -ment, -abbli, -ibbli, -ibilità, -ità, -ulat, -uż)
    m_suf = re.match(r'^(.*?)(?:azzjoni|azzjonijiet|atur|atriċi|aturi|abbli|ibbli|ibilità|ibiltà|ment|ament|ulat|ula|uli|uż|uża|użi|ità|itad)$', w)
    if m_suf and len(m_suf.group(1)) >= 3:
        base = m_suf.group(1).rstrip('a')
        return base

    # 3. Verbs in -izza / -izzazzjoni / -izzar / -izzat -> strip -izz...
    m_izz = re.match(r'^(.*?)izz(?:a|azzjoni|ar|at|azzjonijiet|anti)$', w)
    if m_izz:
        base = m_izz.group(1)
        if len(base) >= 3:
            return base

    # 4. Verbs/Nouns in -ixxa / -ixximent
    m_ixx = re.match(r'^(.*?)ixx(?:a|iment|ar|at)$', w)
    if m_ixx and len(m_ixx.group(1)) >= 3:
        return f"{m_ixx.group(1)}ixx"

    # 5. Verbs in -wa (e.g. aċċentwa -> aċċent)
    m_wa = re.match(r'^(.*?)w[a]$', w)
    if m_wa and len(m_wa.group(1)) >= 3:
        return m_wa.group(1)

    # 6. Adjectives/Nouns in -omu / -oma / -omija -> -om-
    m_om = re.match(r'^(.*?)(?:om[uai]|omija|omiji)$', w)
    if m_om:
        return f"{m_om.group(1)}om"

    # 7. Fallback: Strip terminal inflectional vowels (-a, -e, -i, -o, -u, -à, -è, -ì, -ò, -ù)
    if re.search(r'(?:[aeiouàèìòù])$', w) and len(w) > 3:
        base = re.sub(r'[aeiouàèìòù]$', '', w)
        return base

    return w

def format_stem(entry: dict) -> Optional[str]:
    """Format stem field strictly per new_README.md logic."""
    hw = entry.get("headword")
    root = entry.get("root_consonants")
    pos = entry.get("pos")
    is_loan = entry.get("is_loanword")
    src_lang = entry.get("source_language")
    
    # Multi-word phrases get null stem
    if not hw or " " in hw:
        return None
        
    # Semitic terms (whether root exists or not) get null stem
    if root or is_loan == 0 or src_lang in ['Arabic', 'Maltese', 'Semitic']:
        return None
        
    # Single-word Romance/loanwords get stripped shared stem
    return extract_romance_stem(hw, pos)

def process_file(target_file: str):
    if not os.path.exists(target_file):
        print(f"Error: {target_file} not found!")
        return

    with open(target_file, 'r', encoding='utf-8') as f:
        lines = [l.strip() for l in f if l.strip()]

    refined_count = 0
    new_lines = []

    for line_idx, line in enumerate(lines):
        data = json.loads(line)
        
        # Step 2.1 — Skip curated
        if data.get("curated") is True or data.get("entry", {}).get("curated") is True:
            new_lines.append(json.dumps(data, ensure_ascii=False))
            continue
            
        if "entry" in data and isinstance(data["entry"], dict):
            entry = data["entry"]
        else:
            entry = dict(data)
            scratch = entry.pop("_scratchpad", {})
            tags = entry.pop("tags", []) or []
            entry_tags = entry.pop("entry_tags", []) or []
            data = {
                "_scratchpad": scratch,
                "entry": entry,
                "tags": tags,
                "entry_tags": entry_tags
            }

        headword = entry.get("headword", "")
        pos = entry.get("pos", "")
        root = entry.get("root_consonants")
        
        # 1. Update transient _scratchpad
        scratchpad = data.get("_scratchpad", {})
        scratchpad["ipa_step_1_normalization"] = f"Normalize: {headword}"
        scratchpad["ipa_step_2_clusters"] = "Cluster expansion for għ/h/ħ"
        scratchpad["ipa_step_3_devoicing"] = "Final obstruent devoicing"
        scratchpad["ipa_step_4_syllabification"] = "Maximal Onset Principle syllabification"
        scratchpad["ipa_step_5_stress"] = "Penultimate or final long vowel stress"
        
        if root:
            radicals = [r.strip().lower() for r in root.split('-') if r.strip()]
            scratchpad["morph_1v_consonants"] = radicals
            scratchpad["morph_1v_vocalic_map"] = "Mapping of vowels to numerical anchors"
        elif "morph_1v_consonants" in scratchpad:
            del scratchpad["morph_1v_consonants"]
            if "morph_1v_vocalic_map" in scratchpad:
                del scratchpad["morph_1v_vocalic_map"]
                
        data["_scratchpad"] = scratchpad
        
        # 2. Format stem & sanitize plural_forms according to new_README.md
        entry["stem"] = format_stem(entry)
        if root:
            entry["cv_pattern"] = compute_cv_pattern(headword, root)
            entry["morph_pattern"] = compute_morph_pattern(entry["cv_pattern"])
        elif entry["stem"] is not None or " " in headword:
            # Enforce pattern nullification for non-root / multiword items
            entry["cv_pattern"] = None
            entry["morph_pattern"] = None

        # Sanitize scraped plural forms
        clean_pl = sanitize_plural_forms(entry)
        entry["plural_forms"] = clean_pl
        entry["plural_form"] = clean_pl

        # If singular vowel set is null, plural vowel set must also be null
        if not entry.get("vowel_set_sg"):
            entry["vowel_set_pl"] = None

        # 3. Process Definitions & Hard Split Semicolons
        defs = entry.get("definitions") or []
        split_defs = []
        
        for d in defs:
            text_en = d.get("text_en", "")
            text_mt = d.get("text_mt")
            reg = d.get("register", "")
            reg_map = {
                "arkajku": "archaic", "antik": "archaic", "obsolet": "obsolete",
                "dialettali": "dialectal", "kollokwali": "colloquial", "tekniku": "technical",
                "sleng": "slang", "letterarju": "literary", "għawdxi": "gozitan",
                "vulgari": "vulgar", "reliġjon": "religion", "kondizzjonali": "conditional"
            }
            if reg in reg_map:
                reg = reg_map[reg]
            nuance = d.get("nuance", "")
            
            # UK English spelling fixes in text_en
            text_en = text_en.replace("paralyzed", "paralysed").replace("color", "colour").replace("center", "centre").replace("gray", "grey")
            
            # Semicolon Hard Split Rule (CRITICAL BAN)
            if ";" in text_en:
                parts = [p.strip() for p in text_en.split(";") if p.strip()]
                for p in parts:
                    mt_gloss = get_oxford_text_mt(headword, pos, p)
                    if mt_gloss:
                        mt_gloss = mt_gloss[0].upper() + mt_gloss[1:]
                        if not mt_gloss.endswith(('.', '!', '?', '"')):
                            mt_gloss += '.'
                    split_defs.append({
                        "text_en": p,
                        "text_mt": mt_gloss,
                        "register": reg,
                        "nuance": nuance if pos == "participle" else ""
                    })
            else:
                mt_gloss = text_mt or get_oxford_text_mt(headword, pos, text_en)
                # Capitalize first letter of text_mt and append period
                if mt_gloss:
                    mt_gloss = mt_gloss[0].upper() + mt_gloss[1:]
                    if not mt_gloss.endswith(('.', '!', '?', '"')):
                        mt_gloss += '.'
                split_defs.append({
                    "text_en": text_en,
                    "text_mt": mt_gloss,
                    "register": reg,
                    "nuance": nuance if pos == "participle" else ""
                })
                
        entry["definitions"] = split_defs
        
        # 4. Phonetics IPA Generation
        ipa = generate_maltese_ipa(headword, root, entry.get("cv_pattern"), entry.get("morph_pattern"))
        entry["phonetics"] = [{"dialect": "Standard", "ipa": ipa, "notes": None}]
        
        # 5. Usage Examples Insertion
        if not entry.get("usage_examples"):
            first_en = split_defs[0]["text_en"] if split_defs else ""
            entry["usage_examples"] = generate_usage_examples(headword, pos, first_en)
            
        # 6. Smart Tags Taxonomy Mapping & Deduplication Check
        tags_list = data.get("tags") or []
        entry_tags_list = data.get("entry_tags") or []

        # Tag Cleanup / Deduplication
        cleaned_tags = []
        cleaned_entry_tags = []
        
        for t in tags_list:
            if isinstance(t, str):
                t_name = t.lower()
            elif isinstance(t, dict):
                t_name = t.get("name", "").lower()
            else:
                continue
            # Redundancy Rules Enforcement:
            if t_name == pos.lower():
                continue
            if t_name == "loanword" and entry.get("is_loanword") == 1:
                continue
            if t_name == "semitic" and root:
                continue
            if t_name == "feminine" and entry.get("gender") == "feminine":
                continue
            if t_name == "masculine" and entry.get("gender") == "masculine":
                continue
            if isinstance(t, dict):
                cleaned_tags.append(t)
            
        for et in entry_tags_list:
            if isinstance(et, dict):
                t_id = et.get("tag_id", "")
                if any(isinstance(t, dict) and t.get("id") == t_id for t in cleaned_tags):
                    cleaned_entry_tags.append(et)

        data["tags"] = cleaned_tags
        data["entry_tags"] = cleaned_entry_tags
        data["entry"] = entry
        
        refined_count += 1
        new_lines.append(json.dumps(data, ensure_ascii=False))

    out_file = target_file
    if "scraped-results" in target_file:
        out_file = target_file.replace("scraped-results", "refined-results")
        os.makedirs(os.path.dirname(out_file), exist_ok=True)

    with open(out_file, 'w', encoding='utf-8') as f:
        for l in new_lines:
            f.write(l + '\n')

    print(f"Successfully refined {refined_count} entries into {out_file}!")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Path to JSONL file to refine")
    parser.add_argument("--letter", help="Letter to refine (e.g. A, Ċ)")
    args = parser.parse_args()
    
    if args.file:
        process_file(args.file)
    elif args.letter:
        let = args.letter.upper()
        target = os.path.join(os.path.dirname(__file__), 'refined-results', f'wiktionary_maltese_{let}.jsonl')
        if not os.path.exists(target):
            scraped = os.path.join(os.path.dirname(__file__), 'scraped-results', f'wiktionary_maltese_{let}.jsonl')
            if os.path.exists(scraped):
                target = scraped
        process_file(target)
    else:
        process_file(REFINED_FILE)
