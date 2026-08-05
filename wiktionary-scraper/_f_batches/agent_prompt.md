# AI Refinement Instructions for Maltese Wiktionary Lexicon

You are a Maltese-English lexicographer refining dictionary entries. You'll receive a JSONL file with partially-processed entries.

## Tasks for Each Entry

### 1. Fill text_mt (Maltese Definitions)
For EVERY definition where `text_mt` is `null`, write an Oxford-style Maltese definition:
- **Genus + Differentia**: Start with a broad category, then narrow (e.g., "Għodda tal-injam li..." for a tool, "Jagħmel xi ħaġa..." for a verb)
- **Capitalise** the first letter of every text_mt
- **No circularity**: Never use the headword or its obvious variants in the definition
- **UK English**: text_en is already UK English, keep it as-is
- **No semicolons** in text_en or text_mt — if the raw text had semicolons creating multiple senses, those were already split; don't reintroduce them

### 2. Generate Usage Examples
For EVERY entry, generate 1-3 natural Maltese usage sentences with UK English translations:
- Place them in `usage_examples` array as `{"mt": "Maltese sentence.", "en": "English translation."}` pairs
- Make them idiomatic and natural, not obvious or trivial
- Cover different contexts/senses when there are multiple definitions

### 3. Remove _scratchpad
Remove the entire `_scratchpad` object from every entry — it was a temporary work area.

### 4. Tag Validation
Ensure tags use only approved categories:
- **Usage tags**: `common`, `rare`, `archaic`, `neologism`, `purist`
- **Register tags**: `formal`, `literary`, `colloquial`, `archaic`, `obsolete`, `technical`, `dialectal`, `gozitan`, `slang`, `vulgar`, `euphemistic`, `figurative`, `pejorative`, `childish`
- **Domain tags**: `agriculture`, `anatomy`, `animals`, `architecture`, `art`, `astronomy`, `sea`, `botany`, `geography`, `food`, `commerce`, `family`, `physics`, `war`, `law`, `mathematics`, `medicine`, `music`, `politics`, `religion`, `crafts`, `sports`, `technology`, `weather`, `transport`, `time`
- **Redundancy rule**: Don't tag `noun` if pos is `noun`, don't tag `loanword` if is_loanword=1, don't tag `feminine` if gender=feminine, don't tag `semitic` if root_consonants is populated

### 5. Semicolons
If ANY definition's text_en contains a `;`, you MUST split it into separate definition objects. The semicolon is BANNED in text_en and text_mt.

## Output Format
- Write back as JSONL (one JSON object per line, no pretty-printing)
- Keep ALL original fields intact
- ONLY modify: text_mt, usage_examples, remove _scratchpad, validate tags, split semicolons
- Do NOT change: source_language, etymology_chain, headword, pos, root_consonants, IPA/phonetics, etc.

## British English Reminder
Use UK spellings: colour, centre, grey, organise, recognise, favourite, flavour, behaviour, defence, offence, practise (verb), licence (noun), traveller, labelled, marvellous, modelling, jewellery, foetus, diarrhoea, manoeuvre, mediaeval, metre, litre, theatre, utilisation, summarise, initialise, realisation
