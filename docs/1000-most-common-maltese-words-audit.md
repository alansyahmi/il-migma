# 1000 Most Common Maltese Words — Quality & Lexical Audit Checklist

> **Source:** [1000 Most Common Maltese Words (1000mostcommonwords.com)](https://1000mostcommonwords.com/1000-most-common-maltese-words/)  
> **Repository:** *Il-Miġma'* Knowledge Base & Lexicographic Corpus  
> **File:** `docs/1000-most-common-maltese-words-audit.md`  

---

## Executive Summary & Audit Overview

This document is the master audit checklist for the widely circulated **1000 Most Common Maltese Words** frequency list. Although frequently cited online by learners, linguistic analysis reveals that this list was generated via uncurated machine translation from an English frequency list (such as the Fry / Dolch 1,000 list).

### Diagnostic Findings

| Metric | Count | Details |
|:---|---:|:---|
| **Total Entries** | `1,000` | Listed ranks 1 through 1000 |
| **Untranslated English Artifacts** | `69` | Words left entirely in English (e.g. *house*, *girl*, *king*, *sister*, *baby*, *slave*) |
| **Spurious / Loanword Overlaps** | `10` | Valid Maltese loanwords spelled identically to English (e.g. *port*, *idea*, *bank*, *modern*) |
| **Repeated Maltese Lemmas** | `59` words | 132 total occurrences (e.g. *li* appears 6 times; *kien*, *ma*, *minn*, *sħun* appear 3 times each) |
| **Severe Translation Errors** | Several | E.g. #468 `li` = *verb*; #369 `tal` = *test*; #597 `b'saqaf` = *clothe* |
| **Inflected / Non-lemma Forms** | High | Conjugated verbs (*kellhom*, *kienu*, *jkollhom*) and inflected nouns rather than standard citation lemmas |
| **Multi-word Expressions** | `7` | Phrasal items (e.g. `filwaqt li`, `jekk jogħġbok`, `uċuħ tar-raba`, `kien jaf`) |

---

## How to Use This Checklist

1. **Verify or Edit:** Each entry has an interactive markdown task checkbox `- [ ]`. As you audit an entry for inclusion into *Il-Miġma'*, toggle it to `- [x]`. 
2. **Standardize Lemmas:** Convert inflected forms into canonical citation headwords:
   - Verbs: 3rd person singular masculine past perfect (e.g. *kien*, *għamel*, *rebaħ*).
   - Nouns / Adjectives: Singular masculine base form, recording broken plurals or feminine forms in notes.
3. **Resolve English Artifacts:** Replace English words with their authentic Maltese counterparts using the pre-populated suggestions or [Appendix A](#appendix-a--english-artifacts--suggested-replacements).
4. **Deduplicate:** For words appearing multiple times, decide whether to assign distinct polysemous senses or cross-reference them to the primary rank.

### Status Tags Reference
- `✅ Approved` — Lexically authentic, correct citation lemma, accurate English gloss.
- `⚠️ Needs Lemma Fix` — Authentic Maltese, but needs lemmatization (e.g. conjugated verb -> citation form).
- `❌ English Replaced` — Replaced raw English artifact with genuine Maltese headword.
- `🔄 Duplicate / Cross-ref` — Merged or cross-referenced to earlier occurrence.
- `✏️ Revised Gloss` — English gloss corrected or expanded for lexicographic accuracy.

---

## Table of Contents

- [Words 1 – 100 (#001 – #100)](#words-1--100)
- [Words 101 – 200 (#101 – #200)](#words-101--200)
- [Words 201 – 300 (#201 – #300)](#words-201--300)
- [Words 301 – 400 (#301 – #400)](#words-301--400)
- [Words 401 – 500 (#401 – #500)](#words-401--500)
- [Words 501 – 600 (#501 – #600)](#words-501--600)
- [Words 601 – 700 (#601 – #700)](#words-601--700)
- [Words 701 – 800 (#701 – #800)](#words-701--800)
- [Words 801 – 900 (#801 – #900)](#words-801--900)
- [Words 901 – 1000 (#901 – #1000)](#words-901--1000)
- [Appendix A · English Artifacts & Suggested Replacements](#appendix-a--english-artifacts--suggested-replacements)
- [Appendix B · Repeated Maltese Lemmas (Duplicates)](#appendix-b--repeated-maltese-lemmas-duplicates)
- [Appendix C · Multi-Word Expressions & Clitics](#appendix-c--multi-word-expressions--clitics)

---

## Words 1 – 100

> *Ranks #001 to #100 · Audit Batch 1 of 10*

- [x] **#001** · **bħala** — *as*
- [x] **#002** · **I** — *I* — ⚠️ **[English Artifact]** Untranslated English pronoun. Maltese: *jien* / *jiena*
- [ ] **#003** · **tiegħu** — *his*
- [ ] **#004** · **li** — *that* — 🔄 *(Duplicate: also at #31, #40, #194, #468, #776)*
- [ ] **#005** · **hu** — *he*
- [ ] **#006** · **kien** — *was* — 🔄 *(Duplicate: also at #198, #427)*
- [ ] **#007** · **għal** — *for*
- [ ] **#008** · **fuq** — *on* — 🔄 *(Duplicate: also at #188)*
- [ ] **#009** · **huma** — *are* — 🔄 *(Duplicate: also at #11)*
- [ ] **#010** · **ma** — *with* — 🔄 *(Duplicate: also at #51, #242)*
- [ ] **#011** · **huma** — *they* — 🔄 *(Duplicate: also at #9)*
- [ ] **#012** · **jkun** — *be*
- [ ] **#013** · **fi** — *at*
- [ ] **#014** · **wieħed** — *one* — 🔄 *(Duplicate: also at #692)*
- [ ] **#015** · **jkollhom** — *have*
- [ ] **#016** · **dan** — *this* — 🔄 *(Duplicate: also at #25)*
- [ ] **#017** · **minn** — *from* — 🔄 *(Duplicate: also at #18, #191)*
- [ ] **#018** · **minn** — *by* — 🔄 *(Duplicate: also at #17, #191)*
- [ ] **#019** · **sħun** — *hot* — 🔄 *(Duplicate: also at #387, #439)*
- [ ] **#020** · **kelma** — *word*
- [ ] **#021** · **imma** — *but*
- [ ] **#022** · **liema** — *what*
- [ ] **#023** · **xi** — *some*
- [ ] **#024** · **huwa** — *is*
- [ ] **#025** · **dan** — *it* — 🔄 *(Duplicate: also at #16)*
- [ ] **#026** · **inti** — *you*
- [ ] **#027** · **jew** — *or* — 🔄 *(Duplicate: also at #721)*
- [ ] **#028** · **kellhom** — *had*
- [ ] **#029** · **l-** — *the* — ℹ️ Definite article prefix 'l-' listed as standalone headword
- [ ] **#030** · **tal** — *of* — 🔄 *(Duplicate: also at #369)*
- [ ] **#031** · **li** — *to* — 🔄 *(Duplicate: also at #4, #40, #194, #468, #776)*
- [ ] **#032** · **u** — *and*
- [ ] **#033** · **a** — *a* — ⚠️ **[English Artifact]** Untranslated English indefinite article. Maltese has no indefinite article (use indefinite noun or *wieħed* / *xi*)
- [ ] **#034** · **fil** — *in*
- [ ] **#035** · **aħna** — *we*
- [ ] **#036** · **jista** — *can* — 🔄 *(Duplicate: also at #195, #233)*
- [ ] **#037** · **out** — *out* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *barra*
- [ ] **#038** · **oħra** — *other*
- [ ] **#039** · **kienu** — *were*
- [ ] **#040** · **li** — *which* — 🔄 *(Duplicate: also at #4, #31, #194, #468, #776)*
- [ ] **#041** · **do** — *do* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *għamel* / *agħmel*
- [ ] **#042** · **tagħhom** — *their*
- [ ] **#043** · **ħin** — *time*
- [ ] **#044** · **jekk** — *if* — 🔄 *(Duplicate: also at #710)*
- [ ] **#045** · **se** — *will*
- [ ] **#046** · **kif** — *how*
- [ ] **#047** · **qal** — *said*
- [ ] **#048** · **l** — *an* — ℹ️ Indefinite 'an' mapped to single letter 'l' (consonantal prefix of Maltese definite article)
- [ ] **#049** · **kull** — *each* — 🔄 *(Duplicate: also at #120)*
- [ ] **#050** · **tell** — *tell* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *qal* / *għid* / *irrakkonta*
- [ ] **#051** · **ma** — *does* — 🔄 *(Duplicate: also at #10, #242)*
- [ ] **#052** · **sett** — *set*
- [ ] **#053** · **tlieta** — *three*
- [ ] **#054** · **trid** — *want*
- [ ] **#055** · **arja** — *air*
- [ ] **#056** · **ukoll** — *well*
- [ ] **#057** · **wkoll** — *also*
- [ ] **#058** · **play** — *play* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *lagħab* (verb) or *dramm* / *logħob* (noun)
- [ ] **#059** · **żgħir** — *small*
- [ ] **#060** · **aħħar** — *end* — 🔄 *(Duplicate: also at #224)*
- [ ] **#061** · **tpoġġi** — *put*
- [ ] **#062** · **domiċilju** — *home*
- [ ] **#063** · **aqra** — *read*
- [ ] **#064** · **idejn** — *hand*
- [ ] **#065** · **port** — *port* — ℹ️ **[Loanword]** Valid Maltese loanword (*port* = harbour/seaport; pl. *portijiet*)
- [ ] **#066** · **kbir** — *large*
- [ ] **#067** · **jespliċitaw** — *spell*
- [ ] **#068** · **żid** — *add*
- [ ] **#069** · **anke** — *even*
- [ ] **#070** · **art** — *land* — 🔄 *(Duplicate: also at #464, #720)*
- [ ] **#071** · **hawn** — *here*
- [ ] **#072** · **għandhom** — *must* — 🔄 *(Duplicate: also at #205, #715)*
- [ ] **#073** · **big** — *big* — ⚠️ **[English Artifact]** Untranslated English adjective. Maltese: *kbir* (f. *kbira*, pl. *kbar*)
- [ ] **#074** · **għolja** — *high*
- [ ] **#075** · **bħal** — *such* — 🔄 *(Duplicate: also at #164)*
- [ ] **#076** · **isegwu** — *follow*
- [ ] **#077** · **att** — *act*
- [ ] **#078** · **għaliex** — *why*
- [ ] **#079** · **staqsi** — *ask*
- [ ] **#080** · **irġiel** — *men*
- [ ] **#081** · **bidla** — *change*
- [ ] **#082** · **marru** — *went*
- [ ] **#083** · **dawl** — *light*
- [ ] **#084** · **tip** — *kind* — 🔄 *(Duplicate: also at #729)*
- [ ] **#085** · **barra** — *off*
- [ ] **#086** · **bżonn** — *need*
- [ ] **#087** · **house** — *house* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *dar* (pl. *djar*)
- [ ] **#088** · **stampa** — *picture*
- [ ] **#089** · **jippruvaw** — *try*
- [ ] **#090** · **us** — *us* — ⚠️ **[English Artifact]** Untranslated English pronoun. Maltese: *lilna* / object clitic *-na*
- [ ] **#091** · **darb’oħra** — *again*
- [ ] **#092** · **annimali** — *animal*
- [ ] **#093** · **punt** — *point*
- [ ] **#094** · **omm** — *mother*
- [ ] **#095** · **dinja** — *world*
- [ ] **#096** · **qrib** — *near* — 🔄 *(Duplicate: also at #245)*
- [ ] **#097** · **jibnu** — *build*
- [ ] **#098** · **awto** — *self*
- [ ] **#099** · **earth** — *earth* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *art* / *dinja*
- [ ] **#100** · **missier** — *father*

## Words 101 – 200

> *Ranks #101 to #200 · Audit Batch 2 of 10*

- [ ] **#101** · **kwalunkwe** — *any*
- [ ] **#102** · **ġdida** — *new*
- [ ] **#103** · **xogħol** — *work* — 🔄 *(Duplicate: also at #580)*
- [ ] **#104** · **parti** — *part* — 🔄 *(Duplicate: also at #774)*
- [ ] **#105** · **tieħu** — *take*
- [ ] **#106** · **jiksbu** — *get*
- [ ] **#107** · **post** — *place* — 🔄 *(Duplicate: also at #844)*
- [ ] **#108** · **magħmula** — *made*
- [ ] **#109** · **jgħixu** — *live*
- [ ] **#110** · **fejn** — *where*
- [ ] **#111** · **wara** — *after* — 🔄 *(Duplicate: also at #445, #860)*
- [ ] **#112** · **back** — *back* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *dahar* (anatomy) or *lura* (direction)
- [ ] **#113** · **ftit** — *little* — 🔄 *(Duplicate: also at #249)*
- [ ] **#114** · **biss** — *only* — 🔄 *(Duplicate: also at #129)*
- [ ] **#115** · **rawnd** — *round*
- [ ] **#116** · **bniedem** — *man* — 🔄 *(Duplicate: also at #787)*
- [ ] **#117** · **sena** — *year*
- [ ] **#118** · **daħal** — *came*
- [ ] **#119** · **juru** — *show*
- [ ] **#120** · **kull** — *every* — 🔄 *(Duplicate: also at #49)*
- [ ] **#121** · **tajba** — *good*
- [ ] **#122** · **me** — *me* — ⚠️ **[English Artifact]** Untranslated English pronoun. Maltese: *lili* / object clitic *-ni*
- [ ] **#123** · **jagħtu** — *give*
- [ ] **#124** · **tagħna** — *our*
- [ ] **#125** · **taħt** — *under*
- [ ] **#126** · **isem** — *name*
- [ ] **#127** · **ħafna** — *very* — 🔄 *(Duplicate: also at #141, #159)*
- [ ] **#128** · **permezz** — *through*
- [ ] **#129** · **biss** — *just* — 🔄 *(Duplicate: also at #114)*
- [ ] **#130** · **forma** — *form* — 🔄 *(Duplicate: also at #385)*
- [ ] **#131** · **sentenza** — *sentence*
- [ ] **#132** · **kbira** — *great*
- [ ] **#133** · **jaħsbu** — *think*
- [ ] **#134** · **jgħidu** — *say*
- [ ] **#135** · **jgħinu** — *help*
- [ ] **#136** · **baxxa** — *low*
- [ ] **#137** · **line** — *line* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *linja* (pl. *linji*)
- [ ] **#138** · **differenti** — *differ*
- [ ] **#139** · **dawran** — *turn*
- [ ] **#140** · **kawża** — *cause*
- [ ] **#141** · **ħafna** — *much* — 🔄 *(Duplicate: also at #127, #159)*
- [ ] **#142** · **jfissru** — *mean*
- [ ] **#143** · **qabel** — *before*
- [ ] **#144** · **mossa** — *move*
- [ ] **#145** · **dritt** — *right*
- [ ] **#146** · **tifel** — *boy*
- [ ] **#147** · **qodma** — *old*
- [ ] **#148** · **wisq** — *too*
- [ ] **#149** · **istess** — *same*
- [ ] **#150** · **hi** — *she*
- [ ] **#151** · **kollha** — *all*
- [ ] **#152** · **hemm** — *there*
- [ ] **#153** · **meta** — *when*
- [ ] **#154** · **up** — *up* — ⚠️ **[English Artifact]** Untranslated English preposition/adverb. Maltese: *fuq*
- [ ] **#155** · **użu** — *use*
- [ ] **#156** · **tiegħek** — *your*
- [ ] **#157** · **mod** — *way*
- [ ] **#158** · **dwar** — *about*
- [ ] **#159** · **ħafna** — *many* — 🔄 *(Duplicate: also at #127, #141)*
- [ ] **#160** · **imbagħad** — *then*
- [ ] **#161** · **minnhom** — *them*
- [ ] **#162** · **jiktbu** — *write*
- [ ] **#163** · **kieku** — *would*
- [ ] **#164** · **bħal** — *like* — 🔄 *(Duplicate: also at #75)*
- [ ] **#165** · **hekk** — *so*
- [ ] **#166** · **dawn** — *these*
- [ ] **#167** · **tagħha** — *her*
- [ ] **#168** · **twil** — *long*
- [ ] **#169** · **jagħmlu** — *make*
- [ ] **#170** · **ħaġa** — *thing*
- [ ] **#171** · **tara** — *see*
- [ ] **#172** · **lilu** — *him*
- [ ] **#173** · **tnejn** — *two*
- [ ] **#174** · **għandha** — *has*
- [ ] **#175** · **ħarsa** — *look*
- [ ] **#176** · **aktar** — *more* — 🔄 *(Duplicate: also at #185)*
- [ ] **#177** · **jum** — *day*
- [ ] **#178** · **jistgħu** — *could*
- [ ] **#179** · **go** — *go* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *mar* (impf. *jmur*, impv. *mur*)
- [ ] **#180** · **come** — *come* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *ġie* (impf. *jiġi*, impv. *ejja*)
- [ ] **#181** · **għamlet** — *did*
- [ ] **#182** · **numru** — *number*
- [ ] **#183** · **ħoss** — *sound*
- [ ] **#184** · **ebda** — *no*
- [ ] **#185** · **aktar** — *most* — 🔄 *(Duplicate: also at #176)*
- [ ] **#186** · **nies** — *people*
- [ ] **#187** · **tiegħi** — *my*
- [ ] **#188** · **fuq** — *over* — 🔄 *(Duplicate: also at #8)*
- [ ] **#189** · **taf** — *know*
- [ ] **#190** · **ilma** — *water*
- [ ] **#191** · **minn** — *than* — 🔄 *(Duplicate: also at #17, #18)*
- [ ] **#192** · **sejħa** — *call*
- [ ] **#193** · **ewwel** — *first*
- [ ] **#194** · **li** — *who* — 🔄 *(Duplicate: also at #4, #31, #40, #468, #776)*
- [ ] **#195** · **jista** — *may* — 🔄 *(Duplicate: also at #36, #233)*
- [ ] **#196** · **isfel** — *down*
- [ ] **#197** · **ġenb** — *side*
- [ ] **#198** · **kien** — *been* — 🔄 *(Duplicate: also at #6, #427)*
- [ ] **#199** · **issa** — *now*
- [ ] **#200** · **isibu** — *find*

## Words 201 – 300

> *Ranks #201 to #300 · Audit Batch 3 of 10*

- [ ] **#201** · **ras** — *head*
- [ ] **#202** · **toqgħod** — *stand*
- [ ] **#203** · **stess** — *own*
- [ ] **#204** · **paġna** — *page*
- [ ] **#205** · **għandhom** — *should* — 🔄 *(Duplicate: also at #72, #715)*
- [ ] **#206** · **pajjiż** — *country*
- [ ] **#207** · **misjuba** — *found*
- [ ] **#208** · **tweġiba** — *answer*
- [ ] **#209** · **iskola** — *school*
- [ ] **#210** · **jikbru** — *grow*
- [ ] **#211** · **studju** — *study*
- [ ] **#212** · **xorta** — *still*
- [ ] **#213** · **jitgħallmu** — *learn*
- [ ] **#214** · **impjant** — *plant*
- [ ] **#215** · **kopertura** — *cover*
- [ ] **#216** · **ikel** — *food*
- [ ] **#217** · **xemx** — *sun*
- [ ] **#218** · **erbgħa** — *four*
- [ ] **#219** · **bejn** — *between*
- [ ] **#220** · **istat** — *state*
- [ ] **#221** · **iżommu** — *keep*
- [ ] **#222** · **għajn** — *eye*
- [ ] **#223** · **qatt** — *never* — 🔄 *(Duplicate: also at #308)*
- [ ] **#224** · **aħħar** — *last* — 🔄 *(Duplicate: also at #60)*
- [ ] **#225** · **let** — *let* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *ħalla* (impf. *iħalli*)
- [ ] **#226** · **ħasbu** — *thought*
- [ ] **#227** · **belt** — *city* — 🔄 *(Duplicate: also at #403)*
- [ ] **#228** · **siġra** — *tree*
- [ ] **#229** · **jaqsmu** — *cross*
- [ ] **#230** · **farm** — *farm* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *razzett* (pl. *rziezet*)
- [ ] **#231** · **diffiċli** — *hard* — 🔄 *(Duplicate: also at #763)*
- [ ] **#232** · **bidu** — *start*
- [ ] **#233** · **jista** — *might* — 🔄 *(Duplicate: also at #36, #195)*
- [ ] **#234** · **istorja** — *story* — 🔄 *(Duplicate: also at #788)*
- [ ] **#235** · **serrieq** — *saw*
- [ ] **#236** · **ferm** — *far*
- [ ] **#237** · **baħar** — *sea*
- [ ] **#238** · **jiġbed** — *draw*
- [ ] **#239** · **xellug** — *left*
- [ ] **#240** · **tard** — *late*
- [ ] **#241** · **medda** — *run*
- [ ] **#242** · **ma** — *don’t* — 🔄 *(Duplicate: also at #10, #51)*
- [ ] **#243** · **filwaqt li** — *while* — ℹ️ *(Multi-word expression)*
- [ ] **#244** · **istampa** — *press*
- [ ] **#245** · **qrib** — *close* — 🔄 *(Duplicate: also at #96)*
- [ ] **#246** · **lejl** — *night*
- [ ] **#247** · **reali** — *real*
- [ ] **#248** · **ħajja** — *life*
- [ ] **#249** · **ftit** — *few* — 🔄 *(Duplicate: also at #113)*
- [ ] **#250** · **tramuntana** — *north*
- [ ] **#251** · **ktieb** — *book*
- [ ] **#252** · **twettaq** — *carry*
- [ ] **#253** · **ħa** — *took*
- [ ] **#254** · **xjenza** — *science*
- [ ] **#255** · **jieklu** — *eat*
- [ ] **#256** · **kamra** — *room*
- [ ] **#257** · **ħabib** — *friend*
- [ ] **#258** · **beda** — *began*
- [ ] **#259** · **idea** — *idea* — ℹ️ **[Loanword]** Valid Maltese loanword (*idea* = thought/concept; pl. *ideat*)
- [ ] **#260** · **ħut** — *fish*
- [ ] **#261** · **muntanji** — *mountain*
- [ ] **#262** · **tieqaf** — *stop*
- [ ] **#263** · **ladarba** — *once*
- [ ] **#264** · **bażi** — *base*
- [ ] **#265** · **tisma** — *hear*
- [ ] **#266** · **żiemel** — *horse*
- [ ] **#267** · **qatgħa** — *cut*
- [ ] **#268** · **żgur** — *sure*
- [ ] **#269** · **watch** — *watch* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *arloġġ* (noun) or *ħares* / *għassa* (verb)
- [ ] **#270** · **kulur** — *color*
- [ ] **#271** · **wiċċ** — *face* — 🔄 *(Duplicate: also at #362)*
- [ ] **#272** · **injam** — *wood*
- [ ] **#273** · **prinċipali** — *main*
- [ ] **#274** · **miftuħa** — *open*
- [ ] **#275** · **jidhru** — *seem* — 🔄 *(Duplicate: also at #491)*
- [ ] **#276** · **flimkien** — *together*
- [ ] **#277** · **li jmiss** — *next* — ℹ️ *(Multi-word expression)*
- [ ] **#278** · **abjad** — *white*
- [ ] **#279** · **tfal** — *children* — 🔄 *(Duplicate: also at #665)*
- [ ] **#280** · **tibda** — *begin*
- [ ] **#281** · **ltqajna** — *got*
- [ ] **#282** · **jimxu** — *walk*
- [ ] **#283** · **eżempju** — *example*
- [ ] **#284** · **faċilità** — *ease*
- [ ] **#285** · **karta** — *paper* — 🔄 *(Duplicate: also at #933)*
- [ ] **#286** · **grupp** — *group*
- [ ] **#287** · **dejjem** — *always*
- [ ] **#288** · **mużika** — *music*
- [ ] **#289** · **dawk** — *those*
- [ ] **#290** · **kemm** — *both*
- [ ] **#291** · **marka** — *mark*
- [ ] **#292** · **spiss** — *often*
- [ ] **#293** · **ittra** — *letter*
- [ ] **#294** · **sakemm** — *until*
- [ ] **#295** · **mile** — *mile* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *mil* (pl. *mili*)
- [ ] **#296** · **xmara** — *river*
- [ ] **#297** · **karozza** — *car*
- [ ] **#298** · **saqajn** — *feet*
- [ ] **#299** · **kura** — *care*
- [ ] **#300** · **tieni** — *second*

## Words 301 – 400

> *Ranks #301 to #400 · Audit Batch 4 of 10*

- [ ] **#301** · **biżżejjed** — *enough*
- [ ] **#302** · **plain** — *plain* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *sempliċi* (adj) or *pjanura* (noun)
- [ ] **#303** · **girl** — *girl* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *tifla* (pl. *tfal* / *bniet*) or *tfajla*
- [ ] **#304** · **soltu** — *usual*
- [ ] **#305** · **żgħażagħ** — *young*
- [ ] **#306** · **lest** — *ready*
- [ ] **#307** · **hawn fuq** — *above* — ℹ️ *(Multi-word expression)*
- [ ] **#308** · **qatt** — *ever* — 🔄 *(Duplicate: also at #223)*
- [ ] **#309** · **aħmar** — *red*
- [ ] **#310** · **lista** — *list*
- [ ] **#311** · **għalkemm** — *though*
- [ ] **#312** · **jħossu** — *feel*
- [ ] **#313** · **talk** — *talk* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *tkellem* (Form V)
- [ ] **#314** · **għasfur** — *bird*
- [ ] **#315** · **dalwaqt** — *soon*
- [ ] **#316** · **korp** — *body*
- [ ] **#317** · **klieb** — *dog*
- [ ] **#318** · **familja** — *family*
- [ ] **#319** · **dirett** — *direct*
- [ ] **#320** · **joħolqu** — *pose* — 🔄 *(Duplicate: also at #805)*
- [ ] **#321** · **tħalli** — *leave*
- [ ] **#322** · **kanzunetta** — *song*
- [ ] **#323** · **ikejlu** — *measure*
- [ ] **#324** · **bieb** — *door*
- [ ] **#325** · **prodott** — *product*
- [ ] **#326** · **iswed** — *black*
- [ ] **#327** · **qasir** — *short*
- [ ] **#328** · **numerali** — *numeral*
- [ ] **#329** · **klassi** — *class*
- [ ] **#330** · **riħ** — *wind*
- [ ] **#331** · **kwistjoni** — *question* — 🔄 *(Duplicate: also at #528)*
- [ ] **#332** · **jiġri** — *happen*
- [ ] **#333** · **kompluta** — *complete*
- [ ] **#334** · **vapur** — *ship*
- [ ] **#335** · **żona** — *area*
- [ ] **#336** · **nofs** — *half* — 🔄 *(Duplicate: also at #656)*
- [ ] **#337** · **blat** — *rock*
- [ ] **#338** · **ordni** — *order*
- [ ] **#339** · **nar** — *fire*
- [ ] **#340** · **nofsinhar** — *south* — 🔄 *(Duplicate: also at #767)*
- [ ] **#341** · **problema** — *problem*
- [ ] **#342** · **biċċa** — *piece*
- [ ] **#343** · **told** — *told* — ⚠️ **[English Artifact]** Untranslated English past tense. Maltese: *qal* (perf. 3sg.m)
- [ ] **#344** · **kien jaf** — *knew* — ℹ️ *(Multi-word expression)*
- [ ] **#345** · **jgħaddu** — *pass*
- [ ] **#346** · **peress** — *since*
- [ ] **#347** · **top** — *top* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *quċċata* (summit) or *fuq* (top part)
- [ ] **#348** · **kollu** — *whole*
- [ ] **#349** · **king** — *king* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *re* (pl. *rejiet*) or *sultan*
- [ ] **#350** · **toroq** — *street*
- [ ] **#351** · **pulzier** — *inch*
- [ ] **#352** · **immoltiplika** — *multiply*
- [ ] **#353** · **xejn** — *nothing*
- [ ] **#354** · **kors** — *course*
- [ ] **#355** · **waqfa** — *stay* — 🔄 *(Duplicate: also at #620)*
- [ ] **#356** · **rota** — *wheel*
- [ ] **#357** · **sħiħa** — *full*
- [ ] **#358** · **forza** — *force*
- [ ] **#359** · **blu** — *blue*
- [ ] **#360** · **oġġett** — *object*
- [ ] **#361** · **tiddeċiedi** — *decide*
- [ ] **#362** · **wiċċ** — *surface* — 🔄 *(Duplicate: also at #271)*
- [ ] **#363** · **fond** — *deep*
- [ ] **#364** · **qamar** — *moon*
- [ ] **#365** · **gżira** — *island*
- [ ] **#366** · **sieq** — *foot*
- [ ] **#367** · **sistema** — *system*
- [ ] **#368** · **okkupati** — *busy*
- [ ] **#369** · **tal** — *test* — ⚠️ **[Translation Error]** 'tal' glossed as 'test' (abbreviation or MT error; Maltese for test is *test* / *eżami* / *prova*) | 🔄 *(Duplicate: also at #30)*
- [ ] **#370** · **rekord** — *record*
- [ ] **#371** · **dgħajsa** — *boat*
- [ ] **#372** · **komuni** — *common*
- [ ] **#373** · **deheb** — *gold*
- [ ] **#374** · **possibbli** — *possible*
- [ ] **#375** · **pjan** — *plane* — 🔄 *(Duplicate: also at #414)*
- [ ] **#376** · **minfloku** — *stead*
- [ ] **#377** · **xott** — *dry*
- [ ] **#378** · **wonder** — *wonder* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *stagħġeb* (verb) or *għaġeb* (noun)
- [ ] **#379** · **tidħaq** — *laugh*
- [ ] **#380** · **elf** — *thousand*
- [ ] **#381** · **ilu** — *ago*
- [ ] **#382** · **dam** — *ran*
- [ ] **#383** · **jiċċekkjaw** — *check*
- [ ] **#384** · **logħba** — *game* — 🔄 *(Duplicate: also at #913)*
- [ ] **#385** · **forma** — *shape* — 🔄 *(Duplicate: also at #130)*
- [ ] **#386** · **qabblet** — *equate*
- [ ] **#387** · **sħun** — *hot* — 🔄 *(Duplicate: also at #19, #439)*
- [ ] **#388** · **jitilfu** — *miss*
- [ ] **#389** · **miġjuba** — *brought*
- [ ] **#390** · **sħana** — *heat*
- [ ] **#391** · **borra** — *snow*
- [ ] **#392** · **tajer** — *tire*
- [ ] **#393** · **iġibu** — *bring*
- [ ] **#394** · **iva** — *yes*
- [ ] **#395** · **bogħod** — *distant*
- [ ] **#396** · **imla** — *fill*
- [ ] **#397** · **lvant** — *east*
- [ ] **#398** · **żebgħa** — *paint*
- [ ] **#399** · **lingwa** — *language*
- [ ] **#400** · **fost** — *among*

## Words 401 – 500

> *Ranks #401 to #500 · Audit Batch 5 of 10*

- [ ] **#401** · **unità** — *unit*
- [ ] **#402** · **qawwa** — *power*
- [ ] **#403** · **belt** — *town* — 🔄 *(Duplicate: also at #227)*
- [ ] **#404** · **multa** — *fine*
- [ ] **#405** · **ċerti** — *certain*
- [ ] **#406** · **fly** — *fly* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *tar* (verb, impf. *jtir*) or *dubbiena* (noun: insect)
- [ ] **#407** · **jaqgħu** — *fall*
- [ ] **#408** · **ċomb** — *lead*
- [ ] **#409** · **cry** — *cry* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *beka* (weep) or *għajjat* (shout)
- [ ] **#410** · **dlam** — *dark*
- [ ] **#411** · **magna** — *machine* — 🔄 *(Duplicate: also at #545)*
- [ ] **#412** · **nota** — *note*
- [ ] **#413** · **stenna** — *wait*
- [ ] **#414** · **pjan** — *plan* — 🔄 *(Duplicate: also at #375)*
- [ ] **#415** · **figura** — *figure*
- [ ] **#416** · **stilla** — *star*
- [ ] **#417** · **kaxxa** — *box*
- [ ] **#418** · **nom** — *noun*
- [ ] **#419** · **qasam** — *field*
- [ ] **#420** · **bqija** — *rest*
- [ ] **#421** · **korretta** — *correct*
- [ ] **#422** · **kapaċi** — *able*
- [ ] **#423** · **lira** — *pound*
- [ ] **#424** · **isir** — *done*
- [ ] **#425** · **sbuħija** — *beauty*
- [ ] **#426** · **drive** — *drive* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *saq* (impf. *jsuq*)
- [ ] **#427** · **kien** — *stood* — 🔄 *(Duplicate: also at #6, #198)*
- [ ] **#428** · **fihom** — *contain*
- [ ] **#429** · **quddiem** — *front* — 🔄 *(Duplicate: also at #922)*
- [ ] **#430** · **jgħallmu** — *teach*
- [ ] **#431** · **ġimgħa** — *week*
- [ ] **#432** · **finali** — *final*
- [ ] **#433** · **taw** — *gave*
- [ ] **#434** · **aħdar** — *green*
- [ ] **#435** · **oh** — *oh* — ⚠️ **[English Artifact]** Untranslated English interjection. Maltese: *jaħasra* or *oħ*
- [ ] **#436** · **malajr** — *quick*
- [ ] **#437** · **jiżviluppaw** — *develop*
- [ ] **#438** · **oċean** — *ocean*
- [ ] **#439** · **sħun** — *warm* — 🔄 *(Duplicate: also at #19, #387)*
- [ ] **#440** · **ħielsa** — *free*
- [ ] **#441** · **minuta** — *minute*
- [ ] **#442** · **qawwija** — *strong*
- [ ] **#443** · **speċjali** — *special*
- [ ] **#444** · **mind** — *mind* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *moħħ* (brain/mind)
- [ ] **#445** · **wara** — *behind* — 🔄 *(Duplicate: also at #111, #860)*
- [ ] **#446** · **ċara** — *clear*
- [ ] **#447** · **denb** — *tail*
- [ ] **#448** · **jipproduċu** — *produce*
- [ ] **#449** · **fatt** — *fact*
- [ ] **#450** · **ispazju** — *space*
- [ ] **#451** · **jinstemgħu** — *heard*
- [ ] **#452** · **aħjar** — *best* — 🔄 *(Duplicate: also at #454)*
- [ ] **#453** · **siegħa** — *hour*
- [ ] **#454** · **aħjar** — *better* — 🔄 *(Duplicate: also at #452)*
- [ ] **#455** · **veru** — *true*
- [ ] **#456** · **matul** — *during*
- [ ] **#457** · **mitt** — *hundred*
- [ ] **#458** · **ħamsa** — *five*
- [ ] **#459** · **ftakar** — *remember*
- [ ] **#460** · **pass** — *step*
- [ ] **#461** · **kmieni** — *early*
- [ ] **#462** · **istiva** — *hold*
- [ ] **#463** · **punent** — *west*
- [ ] **#464** · **art** — *ground* — 🔄 *(Duplicate: also at #70, #720)*
- [ ] **#465** · **interess** — *interest*
- [ ] **#466** · **jilħqu** — *reach*
- [ ] **#467** · **fast** — *fast* — ⚠️ **[English Artifact]** Untranslated English adj/adv. Maltese: *mgħaġġel* / *veloċi* / *malajr*
- [ ] **#468** · **li** — *verb* — ⚠️ **[Severe Error]** 'li' glossed as 'verb' (machine translation glitch; Maltese for verb is *verb*) | 🔄 *(Duplicate: also at #4, #31, #40, #194, #776)*
- [ ] **#469** · **nijet** — *sing*
- [ ] **#470** · **jisimgħu** — *listen*
- [ ] **#471** · **sitta** — *six*
- [ ] **#472** · **tabella** — *table*
- [ ] **#473** · **ivvjaġġar** — *travel*
- [ ] **#474** · **inqas** — *less* — 🔄 *(Duplicate: also at #610)*
- [ ] **#475** · **filgħodu** — *morning*
- [ ] **#476** · **għaxar** — *ten*
- [ ] **#477** · **sempliċi** — *simple*
- [ ] **#478** · **diversi** — *several*
- [ ] **#479** · **vokali** — *vowel*
- [ ] **#480** · **lejn** — *toward*
- [ ] **#481** · **gwerra** — *war*
- [ ] **#482** · **jistabbilixxu** — *lay*
- [ ] **#483** · **kontra** — *against*
- [ ] **#484** · **mudell** — *pattern*
- [ ] **#485** · **bil-mod** — *slow*
- [ ] **#486** · **ċentru** — *center*
- [ ] **#487** · **imħabba** — *love*
- [ ] **#488** · **persuna** — *person*
- [ ] **#489** · **flus** — *money*
- [ ] **#490** · **jservu** — *serve*
- [ ] **#491** · **jidhru** — *appear* — 🔄 *(Duplicate: also at #275)*
- [ ] **#492** · **triq** — *road* — 🔄 *(Duplicate: also at #893)*
- [ ] **#493** · **mappa** — *map*
- [ ] **#494** · **xita** — *rain*
- [ ] **#495** · **regola** — *rule*
- [ ] **#496** · **jirregolaw** — *govern*
- [ ] **#497** · **iġbed** — *pull*
- [ ] **#498** · **kiesaħ** — *cold*
- [ ] **#499** · **avviż** — *notice*
- [ ] **#500** · **vuċi** — *voice*

## Words 501 – 600

> *Ranks #501 to #600 · Audit Batch 6 of 10*

- [ ] **#501** · **enerġija** — *energy*
- [ ] **#502** · **kaċċa** — *hunt*
- [ ] **#503** · **probabbli** — *probable*
- [ ] **#504** · **sodda** — *bed*
- [ ] **#505** · **ħuh** — *brother*
- [ ] **#506** · **bajd** — *egg*
- [ ] **#507** · **rikba** — *ride*
- [ ] **#508** · **ċellula** — *cell*
- [ ] **#509** · **jemmnu** — *believe*
- [ ] **#510** · **forsi** — *perhaps*
- [ ] **#511** · **pick** — *pick* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *għażel* (choose) or *qata'* (harvest/pluck)
- [ ] **#512** · **f’daqqa** — *sudden*
- [ ] **#513** · **għadd** — *count*
- [ ] **#514** · **kwadru** — *square*
- [ ] **#515** · **raġuni** — *reason*
- [ ] **#516** · **tul** — *length* — 🔄 *(Duplicate: also at #962)*
- [ ] **#517** · **jirrappreżentaw** — *represent*
- [ ] **#518** · **arti** — *art*
- [ ] **#519** · **suġġett** — *subject*
- [ ] **#520** · **reġjun** — *region*
- [ ] **#521** · **daqs** — *size*
- [ ] **#522** · **jvarjaw** — *vary*
- [ ] **#523** · **joqgħod** — *settle*
- [ ] **#524** · **jitkellmu** — *speak*
- [ ] **#525** · **piż** — *weight*
- [ ] **#526** · **ġenerali** — *general*
- [ ] **#527** · **silġ** — *ice*
- [ ] **#528** · **kwistjoni** — *matter* — 🔄 *(Duplicate: also at #331)*
- [ ] **#529** · **ċirku** — *circle*
- [ ] **#530** · **par** — *pair*
- [ ] **#531** · **jinkludu** — *include*
- [ ] **#532** · **firda** — *divide*
- [ ] **#533** · **sillaba** — *syllable*
- [ ] **#534** · **ħass** — *felt*
- [ ] **#535** · **grand** — *grand* — ⚠️ **[English Artifact]** Untranslated English adjective. Maltese: *grandjuż* or *kbir*
- [ ] **#536** · **logħob** — *ball*
- [ ] **#537** · **għadhom** — *yet*
- [ ] **#538** · **mewġa** — *wave*
- [ ] **#539** · **qatra** — *drop*
- [ ] **#540** · **qalb** — *heart*
- [ ] **#541** · **am** — *am* — ⚠️ **[English Artifact]** Untranslated English verb form. Maltese copula: *jien*
- [ ] **#542** · **preżenti** — *present*
- [ ] **#543** · **tqil** — *heavy*
- [ ] **#544** · **żfin** — *dance*
- [ ] **#545** · **magna** — *engine* — 🔄 *(Duplicate: also at #411)*
- [ ] **#546** · **pożizzjoni** — *position*
- [ ] **#547** · **driegħ** — *arm*
- [ ] **#548** · **wiesgħa** — *wide* — 🔄 *(Duplicate: also at #993)*
- [ ] **#549** · **qlugħ** — *sail*
- [ ] **#550** · **materjal** — *material*
- [ ] **#551** · **frazzjoni** — *fraction*
- [ ] **#552** · **foresta** — *forest*
- [ ] **#553** · **ipoġġu** — *sit*
- [ ] **#554** · **razza** — *race*
- [ ] **#555** · **tieqa** — *window*
- [ ] **#556** · **maħżen** — *store*
- [ ] **#557** · **sajf** — *summer*
- [ ] **#558** · **ferrovija** — *train* — 🔄 *(Duplicate: also at #793)*
- [ ] **#559** · **irqad** — *sleep*
- [ ] **#560** · **jipprova** — *prove*
- [ ] **#561** · **isolati** — *lone*
- [ ] **#562** · **riġel** — *leg*
- [ ] **#563** · **eżerċizzju** — *exercise*
- [ ] **#564** · **ħajt** — *wall*
- [ ] **#565** · **qabda** — *catch*
- [ ] **#566** · **impunjazzjoni** — *mount*
- [ ] **#567** · **tixtieq** — *wish*
- [ ] **#568** · **sema** — *sky*
- [ ] **#569** · **abbord** — *board*
- [ ] **#570** · **ferħ** — *joy*
- [ ] **#571** · **xitwa** — *winter*
- [ ] **#572** · **sib** — *sat*
- [ ] **#573** · **miktub** — *written*
- [ ] **#574** · **selvaġġi** — *wild*
- [ ] **#575** · **istrument** — *instrument*
- [ ] **#576** · **miżmuma** — *kept* — 🔄 *(Duplicate: also at #716)*
- [ ] **#577** · **ħġieġ** — *glass*
- [ ] **#578** · **ħaxix** — *grass*
- [ ] **#579** · **baqra** — *cow*
- [ ] **#580** · **xogħol** — *job* — 🔄 *(Duplicate: also at #103)*
- [ ] **#581** · **tarf** — *edge*
- [ ] **#582** · **sinjal** — *sign*
- [ ] **#583** · **żjara** — *visit*
- [ ] **#584** · **passat** — *past*
- [ ] **#585** · **soft** — *soft* — ⚠️ **[English Artifact]** Untranslated English adjective. Maltese: *artab* (f. *ratba*, pl. *rotob*)
- [ ] **#586** · **gost** — *fun*
- [ ] **#587** · **bright** — *bright* — ⚠️ **[English Artifact]** Untranslated English adjective. Maltese: *jgħajjat* / *ileqq* / *fiddien*
- [ ] **#588** · **gass** — *gas*
- [ ] **#589** · **temp** — *weather*
- [ ] **#590** · **xahar** — *month*
- [ ] **#591** · **miljun** — *million*
- [ ] **#592** · **iġorru** — *bear*
- [ ] **#593** · **finitura** — *finish*
- [ ] **#594** · **kuntenti** — *happy*
- [ ] **#595** · **tama** — *hope*
- [ ] **#596** · **fjura** — *flower*
- [ ] **#597** · **b’saqaf** — *clothe* — ⚠️ **[Severe Error]** 'b’saqaf' glossed as 'clothe' (literally means 'roofed/with a roof'; Maltese to clothe is *libbes* / *lbis*)
- [ ] **#598** · **stramba** — *strange*
- [ ] **#599** · **marret** — *gone*
- [ ] **#600** · **kummerċ** — *trade*

## Words 601 – 700

> *Ranks #601 to #700 · Audit Batch 7 of 10*

- [ ] **#601** · **melodija** — *melody*
- [ ] **#602** · **vjaġġ** — *trip*
- [ ] **#603** · **uffiċċju** — *office*
- [ ] **#604** · **jirċievu** — *receive*
- [ ] **#605** · **ringiela** — *row*
- [ ] **#606** · **ħalq** — *mouth*
- [ ] **#607** · **eżatt** — *exact*
- [ ] **#608** · **simbolu** — *symbol*
- [ ] **#609** · **jmutu** — *die*
- [ ] **#610** · **inqas** — *least* — 🔄 *(Duplicate: also at #474)*
- [ ] **#611** · **trouble** — *trouble* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *inkwiet* or *problema*
- [ ] **#612** · **shout** — *shout* — ⚠️ **[English Artifact]** Untranslated English verb/noun. Maltese: *għajjat* (verb) / *għajta* (noun)
- [ ] **#613** · **ħlief** — *except*
- [ ] **#614** · **kiteb** — *wrote*
- [ ] **#615** · **żerriegħa** — *seed*
- [ ] **#616** · **tone** — *tone* — ℹ️ **[Loanword]** Valid Maltese loanword (standard orthography is *ton*, pl. *toni*)
- [ ] **#617** · **jissieħbu** — *join*
- [ ] **#618** · **jissuġġerixxu** — *suggest*
- [ ] **#619** · **nadif** — *clean*
- [ ] **#620** · **waqfa** — *break* — 🔄 *(Duplicate: also at #355)*
- [ ] **#621** · **mara** — *lady* — 🔄 *(Duplicate: also at #799, #964)*
- [ ] **#622** · **tarzna** — *yard*
- [ ] **#623** · **lok** — *rise*
- [ ] **#624** · **ħażina** — *bad*
- [ ] **#625** · **daqqa** — *blow*
- [ ] **#626** · **żejt** — *oil*
- [ ] **#627** · **demm** — *blood*
- [ ] **#628** · **tmissx** — *touch*
- [ ] **#629** · **kiber** — *grew*
- [ ] **#630** · **ċenteżmu** — *cent*
- [ ] **#631** · **taħlita** — *mix*
- [ ] **#632** · **tim** — *team*
- [ ] **#633** · **wajer** — *wire*
- [ ] **#634** · **ispiża** — *cost*
- [ ] **#635** · **mitlufa** — *lost*
- [ ] **#636** · **kannella** — *brown*
- [ ] **#637** · **jilbsu** — *wear*
- [ ] **#638** · **ġnien** — *garden*
- [ ] **#639** · **ugwali** — *equal*
- [ ] **#640** · **mibgħuta** — *sent*
- [ ] **#641** · **jagħżlu** — *choose*
- [ ] **#642** · **waqgħet** — *fell*
- [ ] **#643** · **tajbin** — *fit*
- [ ] **#644** · **fluss** — *flow*
- [ ] **#645** · **ġust** — *fair*
- [ ] **#646** · **bank** — *bank* — ℹ️ **[Loanword]** Valid Maltese loanword (*bank* = financial institution or bench; pl. *banek*)
- [ ] **#647** · **jiġbru** — *collect* — 🔄 *(Duplicate: also at #980)*
- [ ] **#648** · **jiffranka** — *save*
- [ ] **#649** · **kontroll** — *control*
- [ ] **#650** · **informazzjoni** — *decimal*
- [ ] **#651** · **widna** — *ear*
- [ ] **#652** · **inkella** — *else*
- [ ] **#653** · **pjuttost** — *quite* — 🔄 *(Duplicate: also at #809)*
- [ ] **#654** · **kissru** — *broke*
- [ ] **#655** · **każ** — *case*
- [ ] **#656** · **nofs** — *middle* — 🔄 *(Duplicate: also at #336)*
- [ ] **#657** · **joqtlu** — *kill*
- [ ] **#658** · **iben** — *son*
- [ ] **#659** · **lag** — *lake*
- [ ] **#660** · **mument** — *moment*
- [ ] **#661** · **iskala** — *scale*
- [ ] **#662** · **qawwi** — *loud*
- [ ] **#663** · **rebbiegħa** — *spring*
- [ ] **#664** · **josservaw** — *observe*
- [ ] **#665** · **tfal** — *child* — 🔄 *(Duplicate: also at #279)*
- [ ] **#666** · **dritta** — *straight*
- [ ] **#667** · **konsonanti** — *consonant*
- [ ] **#668** · **nazzjon** — *nation*
- [ ] **#669** · **dizzjunarju** — *dictionary*
- [ ] **#670** · **ħalib** — *milk*
- [ ] **#671** · **veloċità** — *speed*
- [ ] **#672** · **metodu** — *method*
- [ ] **#673** · **organu** — *organ*
- [ ] **#674** · **tħallas** — *pay*
- [ ] **#675** · **età** — *age*
- [ ] **#676** · **taqsima** — *section*
- [ ] **#677** · **libsa** — *dress* — 🔄 *(Duplicate: also at #846)*
- [ ] **#678** · **sħaba** — *cloud*
- [ ] **#679** · **sorpriża** — *surprise*
- [ ] **#680** · **kwieta** — *quiet*
- [ ] **#681** · **ġebel** — *stone*
- [ ] **#682** · **ċkejkna** — *tiny*
- [ ] **#683** · **tluq** — *climb*
- [ ] **#684** · **jibred** — *cool*
- [ ] **#685** · **disinn** — *design*
- [ ] **#686** · **foqra** — *poor*
- [ ] **#687** · **lott** — *lot*
- [ ] **#688** · **esperiment** — *experiment*
- [ ] **#689** · **qiegħ** — *bottom*
- [ ] **#690** · **ċavetta** — *key*
- [ ] **#691** · **ħadid** — *iron*
- [ ] **#692** · **wieħed** — *single* — 🔄 *(Duplicate: also at #14)*
- [ ] **#693** · **stick** — *stick* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *bastun* (rod) or *waħħal* (adhere)
- [ ] **#694** · **ċatt** — *flat*
- [ ] **#695** · **għoxrin** — *twenty*
- [ ] **#696** · **ġilda** — *skin*
- [ ] **#697** · **daħka** — *smile*
- [ ] **#698** · **titkemmex** — *crease*
- [ ] **#699** · **toqba** — *hole*
- [ ] **#700** · **jaqbżu** — *jump*

## Words 701 – 800

> *Ranks #701 to #800 · Audit Batch 8 of 10*

- [ ] **#701** · **baby** — *baby* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *tarbija* (pl. *trabi*)
- [ ] **#702** · **tmienja** — *eight*
- [ ] **#703** · **raħal** — *village*
- [ ] **#704** · **jissodisfaw** — *meet*
- [ ] **#705** · **għerq** — *root*
- [ ] **#706** · **jixtru** — *buy*
- [ ] **#707** · **jgħollu** — *raise*
- [ ] **#708** · **isolvu** — *solve*
- [ ] **#709** · **metall** — *metal*
- [ ] **#710** · **jekk** — *whether* — 🔄 *(Duplicate: also at #44)*
- [ ] **#711** · **timbotta** — *push*
- [ ] **#712** · **seba** — *seven*
- [ ] **#713** · **paragrafu** — *paragraph*
- [ ] **#714** · **tielet** — *third*
- [ ] **#715** · **għandhom** — *shall* — 🔄 *(Duplicate: also at #72, #205)*
- [ ] **#716** · **miżmuma** — *held* — 🔄 *(Duplicate: also at #576)*
- [ ] **#717** · **xagħar** — *hair*
- [ ] **#718** · **jiddeskrivu** — *describe*
- [ ] **#719** · **kok** — *cook*
- [ ] **#720** · **art** — *floor* — 🔄 *(Duplicate: also at #70, #464)*
- [ ] **#721** · **jew** — *either* — 🔄 *(Duplicate: also at #27)*
- [ ] **#722** · **riżultat** — *result*
- [ ] **#723** · **burn** — *burn* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *ħaraq* (verb, impf. *jaħraq*)
- [ ] **#724** · **hill** — *hill* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *għolja* (pl. *għoljiet*)
- [ ] **#725** · **sikur** — *safe*
- [ ] **#726** · **qattus** — *cat*
- [ ] **#727** · **seklu** — *century*
- [ ] **#728** · **jikkunsidraw** — *consider*
- [ ] **#729** · **tip** — *type* — 🔄 *(Duplicate: also at #84)*
- [ ] **#730** · **liġi** — *law*
- [ ] **#731** · **daqsxejn** — *bit*
- [ ] **#732** · **kosta** — *coast*
- [ ] **#733** · **kopja** — *copy*
- [ ] **#734** · **frażi** — *phrase*
- [ ] **#735** · **siekta** — *silent*
- [ ] **#736** · **tall** — *tall* — ⚠️ **[English Artifact]** Untranslated English adjective. Maltese: *twil* (f. *twila*, pl. *twal*)
- [ ] **#737** · **ramel** — *sand*
- [ ] **#738** · **ħamrija** — *soil*
- [ ] **#739** · **romblu** — *roll*
- [ ] **#740** · **temperatura** — *temperature*
- [ ] **#741** · **finger** — *finger* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *saba'* (pl. *swaba'*)
- [ ] **#742** · **industrija** — *industry*
- [ ] **#743** · **valur** — *value*
- [ ] **#744** · **ġlieda** — *fight*
- [ ] **#745** · **jimteddu** — *lie*
- [ ] **#746** · **taħbit** — *beat*
- [ ] **#747** · **eċitati** — *excite*
- [ ] **#748** · **naturali** — *natural*
- [ ] **#749** · **fehma** — *view*
- [ ] **#750** · **sens** — *sense*
- [ ] **#751** · **kapital** — *capital*
- [ ] **#752** · **mhux se** — *won’t* — ℹ️ *(Multi-word expression)*
- [ ] **#753** · **president** — *chair*
- [ ] **#754** · **periklu** — *danger*
- [ ] **#755** · **frott** — *fruit*
- [ ] **#756** · **sinjuri** — *rich*
- [ ] **#757** · **ħoxna** — *thick*
- [ ] **#758** · **suldat** — *soldier*
- [ ] **#759** · **proċess** — *process*
- [ ] **#760** · **joperaw** — *operate*
- [ ] **#761** · **prattika** — *practice*
- [ ] **#762** · **separata** — *separate*
- [ ] **#763** · **diffiċli** — *difficult* — 🔄 *(Duplicate: also at #231)*
- [ ] **#764** · **tabib** — *doctor*
- [ ] **#765** · **jekk jogħġbok** — *please* — ℹ️ *(Multi-word expression)*
- [ ] **#766** · **jipproteġu** — *protect*
- [ ] **#767** · **nofsinhar** — *noon* — 🔄 *(Duplicate: also at #340)*
- [ ] **#768** · **uċuħ tar-raba** — *crop* — ℹ️ *(Multi-word expression)*
- [ ] **#769** · **modern** — *modern* — ℹ️ **[Loanword]** Valid Maltese loanword (*modern*, f. *moderna*, pl. *moderni*)
- [ ] **#770** · **element** — *element* — ℹ️ **[Loanword]** Valid Maltese loanword (*element*; pl. *elementi*)
- [ ] **#771** · **hit** — *hit* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *laqat* or *ħabbat*
- [ ] **#772** · **istudent** — *student*
- [ ] **#773** · **kantuniera** — *corner*
- [ ] **#774** · **parti** — *party* — 🔄 *(Duplicate: also at #104)*
- [ ] **#775** · **provvista** — *supply*
- [ ] **#776** · **li** — *whose* — 🔄 *(Duplicate: also at #4, #31, #40, #194, #468)*
- [ ] **#777** · **lokalizzar** — *locate*
- [ ] **#778** · **ring** — *ring* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *ċurkett* (finger ring) or *ċempel* (call)
- [ ] **#779** · **karattru** — *character*
- [ ] **#780** · **insetti** — *insect*
- [ ] **#781** · **maqbuda** — *caught*
- [ ] **#782** · **perjodu** — *period*
- [ ] **#783** · **jindikaw** — *indicate*
- [ ] **#784** · **radju** — *radio*
- [ ] **#785** · **Tkellem** — *spoke*
- [ ] **#786** · **atomu** — *atom*
- [ ] **#787** · **bniedem** — *human* — 🔄 *(Duplicate: also at #116)*
- [ ] **#788** · **istorja** — *history* — 🔄 *(Duplicate: also at #234)*
- [ ] **#789** · **effett** — *effect*
- [ ] **#790** · **elettriku** — *electric*
- [ ] **#791** · **jistennew** — *expect*
- [ ] **#792** · **għadam** — *bone*
- [ ] **#793** · **ferrovija** — *rail* — 🔄 *(Duplicate: also at #558)*
- [ ] **#794** · **jimmaġina** — *imagine*
- [ ] **#795** · **jipprovdu** — *provide*
- [ ] **#796** · **jaqblu** — *agree*
- [ ] **#797** · **b’hekk** — *thus*
- [ ] **#798** · **ġentili** — *gentle*
- [ ] **#799** · **mara** — *woman* — 🔄 *(Duplicate: also at #621, #964)*
- [ ] **#800** · **kaptan** — *captain* — 🔄 *(Duplicate: also at #851)*

## Words 801 – 900

> *Ranks #801 to #900 · Audit Batch 9 of 10*

- [ ] **#801** · **raden** — *guess*
- [ ] **#802** · **meħtieġ** — *necessary*
- [ ] **#803** · **sharp** — *sharp* — ⚠️ **[English Artifact]** Untranslated English adjective. Maltese: *jaqta'* or *qawwi*
- [ ] **#804** · **ġwienaħ** — *wing*
- [ ] **#805** · **joħolqu** — *create* — 🔄 *(Duplicate: also at #320)*
- [ ] **#806** · **proxxmu** — *neighbor*
- [ ] **#807** · **aħsel** — *wash*
- [ ] **#808** · **maġina** — *bat*
- [ ] **#809** · **pjuttost** — *rather* — 🔄 *(Duplicate: also at #653)*
- [ ] **#810** · **folla** — *crowd*
- [ ] **#811** · **qamħ** — *corn*
- [ ] **#812** · **iqabblu** — *compare*
- [ ] **#813** · **poeżija** — *poem*
- [ ] **#814** · **sekwenza** — *string*
- [ ] **#815** · **qanpiena** — *bell*
- [ ] **#816** · **jiddependu** — *depend*
- [ ] **#817** · **laħam** — *meat*
- [ ] **#818** · **Togħrokx** — *rub*
- [ ] **#819** · **tubu** — *tube*
- [ ] **#820** · **famuż** — *famous*
- [ ] **#921** · **dollaru** — *dollar*
- [ ] **#822** · **nixxiegħa** — *stream*
- [ ] **#823** · **biża** — *fear*
- [ ] **#284** · **vista** — *sight*
- [ ] **#825** · **irqiq** — *thin*
- [ ] **#826** · **trijanglu** — *triangle*
- [ ] **#827** · **pjaneta** — *planet*
- [ ] **#828** · **hurry** — *hurry* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *għaġġel* (verb) or *għaġla* (noun)
- [ ] **#829** · **kap** — *chief*
- [ ] **#830** · **kolonja** — *colony*
- [ ] **#831** · **arloġġ** — *clock*
- [ ] **#832** · **minjiera** — *mine*
- [ ] **#833** · **tie** — *tie* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *rabat* (verb) or *ingravata* (necktie)
- [ ] **#834** · **jidħol** — *enter*
- [ ] **#835** · **maġġuri** — *major*
- [ ] **#836** · **frisk** — *fresh*
- [ ] **#837** · **tfittxija** — *search*
- [ ] **#838** · **tibgħat** — *send*
- [ ] **#839** · **isfar** — *yellow*
- [ ] **#840** · **gun** — *gun* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *xkubetta* or *pistola*
- [ ] **#841** · **jippermettu** — *allow*
- [ ] **#842** · **istampar** — *print*
- [ ] **#843** · **mejta** — *dead*
- [ ] **#844** · **post** — *spot* — 🔄 *(Duplicate: also at #107)*
- [ ] **#845** · **deżert** — *desert*
- [ ] **#846** · **libsa** — *suit* — 🔄 *(Duplicate: also at #677)*
- [ ] **#847** · **attwali** — *current*
- [ ] **#848** · **lift** — *lift* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *refa'* (verb) or *lift* (noun: elevator loanword)
- [ ] **#840** · **tela** — *rose*
- [ ] **#850** · **jaslu** — *arrive*
- [ ] **#851** · **kaptan** — *master* — 🔄 *(Duplicate: also at #800)*
- [ ] **#852** · **binarju** — *track*
- [ ] **#853** · **ġenitur** — *parent*
- [ ] **#854** · **shore** — *shore* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *xatt* (pl. *xtut*)
- [ ] **#855** · **diviżjoni** — *division*
- [ ] **#856** · **folja** — *sheet*
- [ ] **#857** · **sustanza** — *substance*
- [ ] **#858** · **favur** — *favor*
- [ ] **#859** · **jgħaqqdu** — *connect*
- [ ] **#860** · **wara** — *post* — 🔄 *(Duplicate: also at #111, #445)*
- [ ] **#861** · **jonfqu** — *spend*
- [ ] **#862** · **korda** — *chord*
- [ ] **#863** · **xaħam** — *fat*
- [ ] **#864** · **ferħan** — *glad*
- [ ] **#865** · **oriġinali** — *original*
- [ ] **#866** · **sehem** — *share*
- [ ] **#867** · **istazzjon** — *station*
- [ ] **#868** · **dad** — *dad* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *missier* or *pa*
- [ ] **#869** · **ħobż** — *bread*
- [ ] **#870** · **ħlas** — *charge*
- [ ] **#871** · **xierqa** — *proper*
- [ ] **#872** · **bar** — *bar* — ℹ️ **[Loanword]** Valid Maltese loanword (*bar*; pl. *bars* / *barijiet*)
- [ ] **#873** · **offerta** — *offer*
- [ ] **#874** · **segment** — *segment* — ℹ️ **[Loanword]** Valid Maltese loanword (*segment*; pl. *segmenti*)
- [ ] **#875** · **slave** — *slave* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *ilsir* (pl. *ilsiera*) or *skjav*
- [ ] **#876** · **papra** — *duck*
- [ ] **#877** · **instant** — *instant* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *istant* / *mument* / *f'ħakka t'għajn*
- [ ] **#878** · **suq** — *market*
- [ ] **#879** · **grad** — *degree*
- [ ] **#880** · **timla** — *populate*
- [ ] **#881** · **flieles** — *chick*
- [ ] **#882** · **għażiż** — *dear*
- [ ] **#883** · **ghadu** — *enemy*
- [ ] **#884** · **risposta** — *reply*
- [ ] **#885** · **xarba** — *drink*
- [ ] **#886** · **jseħħu** — *occur*
- [ ] **#887** · **appoġġ** — *support*
- [ ] **#888** · **diskors** — *speech*
- [ ] **#889** · **natura** — *nature*
- [ ] **#890** · **firxa** — *range*
- [ ] **#891** · **fwar** — *steam*
- [ ] **#892** · **mozzjoni** — *motion*
- [ ] **#893** · **triq** — *path* — 🔄 *(Duplicate: also at #492)*
- [ ] **#894** · **likwidu** — *liquid*
- [ ] **#895** · **log** — *log* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *zokk* (wood) or *reġistru* (record)
- [ ] **#896** · **fisser** — *meant*
- [ ] **#897** · **kwozjent** — *quotient*
- [ ] **#898** · **snien** — *teeth*
- [ ] **#899** · **qoxra** — *shell*
- [ ] **#900** · **għonq** — *neck*

## Words 901 – 1000

> *Ranks #901 to #1000 · Audit Batch 10 of 10*

- [ ] **#901** · **ossiġnu** — *oxygen*
- [ ] **#902** · **zokkor** — *sugar*
- [ ] **#903** · **mewt** — *death*
- [ ] **#904** · **pretty** — *pretty* — ⚠️ **[English Artifact]** Untranslated English adjective. Maltese: *sabiħ* / *ħelu*
- [ ] **#905** · **ħiliet** — *skill*
- [ ] **#906** · **nisa** — *women*
- [ ] **#907** · **istaġun** — *season*
- [ ] **#908** · **soluzzjoni** — *solution*
- [ ] **#909** · **kalamita** — *magnet*
- [ ] **#910** · **fidda** — *silver*
- [ ] **#911** · **nirringrazzja** — *thank*
- [ ] **#912** · **fergħa** — *branch*
- [ ] **#913** · **logħba** — *match* — 🔄 *(Duplicate: also at #384)*
- [ ] **#914** · **suffiss** — *suffix*
- [ ] **#915** · **speċjalment** — *especially*
- [ ] **#916** · **fig** — *fig* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *tina* (pl. *tin*)
- [ ] **#917** · **jibżgħu** — *afraid*
- [ ] **#918** · **enormi** — *huge*
- [ ] **#919** · **sister** — *sister* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *oħt* (pl. *aħwa*)
- [ ] **#920** · **azzar** — *steel*
- [ ] **#921** · **jiddiskutu** — *discuss*
- [ ] **#922** · **quddiem** — *forward* — 🔄 *(Duplicate: also at #429)*
- [ ] **#923** · **simili** — *similar*
- [ ] **#924** · **gwida** — *guide*
- [ ] **#925** · **esperjenza** — *experience*
- [ ] **#926** · **F’ħin** — *score* — ⚠️ **[Translation Error]** 'F’ħin' glossed as 'score' (Maltese *f'ħin* = in time; score is *skor* or *riżultat*)
- [ ] **#927** · **tuffieħ** — *apple*
- [ ] **#928** · **mixtrija** — *bought*
- [ ] **#929** · **wassal** — *led*
- [ ] **#930** · **żift** — *pitch*
- [ ] **#931** · **kowt** — *coat*
- [ ] **#932** · **massa** — *mass*
- [ ] **#933** · **karta** — *card* — 🔄 *(Duplicate: also at #285)*
- [ ] **#934** · **band** — *band* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *banda* (musical band) or *faxxa*
- [ ] **#935** · **ħabel** — *rope*
- [ ] **#936** · **slip** — *slip* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *żelaq* (verb) or *żelqa* (noun)
- [ ] **#937** · **win** — *win* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *rebaħ* (impf. *jirbaħ*)
- [ ] **#938** · **ħolma** — *dream*
- [ ] **#939** · **filgħaxija** — *evening*
- [ ] **#940** · **kundizzjoni** — *condition*
- [ ] **#941** · **għalf** — *feed*
- [ ] **#942** · **għodda** — *tool*
- [ ] **#943** · **total** — *total* — ℹ️ **[Loanword]** Valid Maltese loanword (*total*; pl. *totali*)
- [ ] **#944** · **bażiku** — *basic*
- [ ] **#945** · **riħa** — *smell*
- [ ] **#946** · **wied** — *valley*
- [ ] **#947** · **lanqas** — *nor*
- [ ] **#948** · **double** — *double* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *doppju*
- [ ] **#949** · **sedil** — *seat*
- [ ] **#950** · **tkompli** — *continue*
- [ ] **#951** · **blokk** — *block*
- [ ] **#952** · **grafika** — *chart*
- [ ] **#953** · **kpiepel** — *hat*
- [ ] **#954** · **jbiegħu** — *sell*
- [ ] **#955** · **suċċess** — *success*
- [ ] **#956** · **kumpanija** — *company*
- [ ] **#957** · **naqqas** — *subtract*
- [ ] **#958** · **avveniment** — *event*
- [ ] **#959** · **partikolari** — *particular*
- [ ] **#960** · **jittrattaw** — *deal*
- [ ] **#961** · **jgħum** — *swim*
- [ ] **#962** · **tul** — *term* — 🔄 *(Duplicate: also at #516)*
- [ ] **#963** · **oppost** — *opposite*
- [ ] **#964** · **mara** — *wife* — 🔄 *(Duplicate: also at #621, #799)*
- [ ] **#965** · **żarbun** — *shoe*
- [ ] **#966** · **ispalla** — *shoulder*
- [ ] **#967** · **tixrid** — *spread*
- [ ] **#968** · **tirranġa** — *arrange*
- [ ] **#969** · **camp** — *camp* — ℹ️ **[Loanword]** Valid Maltese loanword (*kamp* is standard, but *camp* occurs in loan contexts)
- [ ] **#970** · **nivvintaw** — *invent*
- [ ] **#971** · **qoton** — *cotton*
- [ ] **#972** · **Mwieled** — *born*
- [ ] **#973** · **jiddeterminaw** — *determine*
- [ ] **#974** · **quart** — *quart* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *kwart*
- [ ] **#975** · **disa** — *nine*
- [ ] **#976** · **trakk** — *truck*
- [ ] **#977** · **istorbju** — *noise*
- [ ] **#978** · **livell** — *level*
- [ ] **#979** · **ċans** — *chance*
- [ ] **#980** · **jiġbru** — *gather* — 🔄 *(Duplicate: also at #647)*
- [ ] **#981** · **shop** — *shop* — ⚠️ **[English Artifact]** Untranslated English noun. Maltese: *ħanut* (pl. *ħwienet*)
- [ ] **#982** · **stretch** — *stretch* — ⚠️ **[English Artifact]** Untranslated English. Maltese: *matted* / *ġibed*
- [ ] **#983** · **tarmi** — *throw*
- [ ] **#984** · **shine** — *shine* — ⚠️ **[English Artifact]** Untranslated English verb. Maltese: *idda* / *leqq*
- [ ] **#985** · **proprjetà** — *property*
- [ ] **#986** · **kolonna** — *column*
- [ ] **#987** · **molekula** — *molecule*
- [ ] **#988** · **tagħżel** — *select*
- [ ] **#989** · **ħażin** — *wrong*
- [ ] **#990** · **griż** — *gray*
- [ ] **#991** · **irrepeti** — *repeat*
- [ ] **#992** · **jeħtieġu** — *require*
- [ ] **#993** · **wiesgħa** — *broad* — 🔄 *(Duplicate: also at #548)*
- [ ] **#994** · **jippreparaw** — *prepare*
- [ ] **#995** · **melħ** — *salt*
- [ ] **#996** · **imnieħer** — *nose*
- [ ] **#997** · **plurali** — *plural*
- [ ] **#998** · **rabja** — *anger*
- [ ] **#999** · **pretensjoni** — *claim*
- [ ] **#1000** · **kontinent** — *continent*

---

## Appendix A · English Artifacts & Suggested Replacements

The following 79 entries in the source list were left completely untranslated or mirror English lemmas. Of these, 10 are valid Maltese loanwords, while 69 require direct lexical replacement.

| Rank | Raw Entry | Source Gloss | Classification | Suggested Maltese Headword / Notes |
|:---:|:---|:---|:---|:---|
| #002 | **I** | *I* | ❌ English Artifact | Untranslated English pronoun. Maltese: *jien* / *jiena* |
| #033 | **a** | *a* | ❌ English Artifact | Untranslated English indefinite article. Maltese has no indefinite article (use indefinite noun or *wieħed* / *xi*) |
| #037 | **out** | *out* | ❌ English Artifact | Untranslated English. Maltese: *barra* |
| #041 | **do** | *do* | ❌ English Artifact | Untranslated English verb. Maltese: *għamel* / *agħmel* |
| #050 | **tell** | *tell* | ❌ English Artifact | Untranslated English verb. Maltese: *qal* / *għid* / *irrakkonta* |
| #058 | **play** | *play* | ❌ English Artifact | Untranslated English verb. Maltese: *lagħab* (verb) or *dramm* / *logħob* (noun) |
| #065 | **port** | *port* | ✅ Valid Loanword | Valid Maltese loanword (*port* = harbour/seaport; pl. *portijiet*) |
| #073 | **big** | *big* | ❌ English Artifact | Untranslated English adjective. Maltese: *kbir* (f. *kbira*, pl. *kbar*) |
| #087 | **house** | *house* | ❌ English Artifact | Untranslated English noun. Maltese: *dar* (pl. *djar*) |
| #090 | **us** | *us* | ❌ English Artifact | Untranslated English pronoun. Maltese: *lilna* / object clitic *-na* |
| #099 | **earth** | *earth* | ❌ English Artifact | Untranslated English noun. Maltese: *art* / *dinja* |
| #112 | **back** | *back* | ❌ English Artifact | Untranslated English. Maltese: *dahar* (anatomy) or *lura* (direction) |
| #122 | **me** | *me* | ❌ English Artifact | Untranslated English pronoun. Maltese: *lili* / object clitic *-ni* |
| #137 | **line** | *line* | ❌ English Artifact | Untranslated English noun. Maltese: *linja* (pl. *linji*) |
| #154 | **up** | *up* | ❌ English Artifact | Untranslated English preposition/adverb. Maltese: *fuq* |
| #179 | **go** | *go* | ❌ English Artifact | Untranslated English verb. Maltese: *mar* (impf. *jmur*, impv. *mur*) |
| #180 | **come** | *come* | ❌ English Artifact | Untranslated English verb. Maltese: *ġie* (impf. *jiġi*, impv. *ejja*) |
| #225 | **let** | *let* | ❌ English Artifact | Untranslated English verb. Maltese: *ħalla* (impf. *iħalli*) |
| #230 | **farm** | *farm* | ❌ English Artifact | Untranslated English noun. Maltese: *razzett* (pl. *rziezet*) |
| #259 | **idea** | *idea* | ✅ Valid Loanword | Valid Maltese loanword (*idea* = thought/concept; pl. *ideat*) |
| #269 | **watch** | *watch* | ❌ English Artifact | Untranslated English. Maltese: *arloġġ* (noun) or *ħares* / *għassa* (verb) |
| #295 | **mile** | *mile* | ❌ English Artifact | Untranslated English noun. Maltese: *mil* (pl. *mili*) |
| #302 | **plain** | *plain* | ❌ English Artifact | Untranslated English. Maltese: *sempliċi* (adj) or *pjanura* (noun) |
| #303 | **girl** | *girl* | ❌ English Artifact | Untranslated English noun. Maltese: *tifla* (pl. *tfal* / *bniet*) or *tfajla* |
| #313 | **talk** | *talk* | ❌ English Artifact | Untranslated English verb. Maltese: *tkellem* (Form V) |
| #343 | **told** | *told* | ❌ English Artifact | Untranslated English past tense. Maltese: *qal* (perf. 3sg.m) |
| #347 | **top** | *top* | ❌ English Artifact | Untranslated English. Maltese: *quċċata* (summit) or *fuq* (top part) |
| #349 | **king** | *king* | ❌ English Artifact | Untranslated English noun. Maltese: *re* (pl. *rejiet*) or *sultan* |
| #378 | **wonder** | *wonder* | ❌ English Artifact | Untranslated English. Maltese: *stagħġeb* (verb) or *għaġeb* (noun) |
| #406 | **fly** | *fly* | ❌ English Artifact | Untranslated English. Maltese: *tar* (verb, impf. *jtir*) or *dubbiena* (noun: insect) |
| #409 | **cry** | *cry* | ❌ English Artifact | Untranslated English. Maltese: *beka* (weep) or *għajjat* (shout) |
| #426 | **drive** | *drive* | ❌ English Artifact | Untranslated English verb. Maltese: *saq* (impf. *jsuq*) |
| #435 | **oh** | *oh* | ❌ English Artifact | Untranslated English interjection. Maltese: *jaħasra* or *oħ* |
| #444 | **mind** | *mind* | ❌ English Artifact | Untranslated English noun. Maltese: *moħħ* (brain/mind) |
| #467 | **fast** | *fast* | ❌ English Artifact | Untranslated English adj/adv. Maltese: *mgħaġġel* / *veloċi* / *malajr* |
| #511 | **pick** | *pick* | ❌ English Artifact | Untranslated English verb. Maltese: *għażel* (choose) or *qata'* (harvest/pluck) |
| #535 | **grand** | *grand* | ❌ English Artifact | Untranslated English adjective. Maltese: *grandjuż* or *kbir* |
| #541 | **am** | *am* | ❌ English Artifact | Untranslated English verb form. Maltese copula: *jien* |
| #585 | **soft** | *soft* | ❌ English Artifact | Untranslated English adjective. Maltese: *artab* (f. *ratba*, pl. *rotob*) |
| #587 | **bright** | *bright* | ❌ English Artifact | Untranslated English adjective. Maltese: *jgħajjat* / *ileqq* / *fiddien* |
| #611 | **trouble** | *trouble* | ❌ English Artifact | Untranslated English noun. Maltese: *inkwiet* or *problema* |
| #612 | **shout** | *shout* | ❌ English Artifact | Untranslated English verb/noun. Maltese: *għajjat* (verb) / *għajta* (noun) |
| #616 | **tone** | *tone* | ✅ Valid Loanword | Valid Maltese loanword (standard orthography is *ton*, pl. *toni*) |
| #646 | **bank** | *bank* | ✅ Valid Loanword | Valid Maltese loanword (*bank* = financial institution or bench; pl. *banek*) |
| #693 | **stick** | *stick* | ❌ English Artifact | Untranslated English. Maltese: *bastun* (rod) or *waħħal* (adhere) |
| #701 | **baby** | *baby* | ❌ English Artifact | Untranslated English noun. Maltese: *tarbija* (pl. *trabi*) |
| #723 | **burn** | *burn* | ❌ English Artifact | Untranslated English. Maltese: *ħaraq* (verb, impf. *jaħraq*) |
| #724 | **hill** | *hill* | ❌ English Artifact | Untranslated English noun. Maltese: *għolja* (pl. *għoljiet*) |
| #736 | **tall** | *tall* | ❌ English Artifact | Untranslated English adjective. Maltese: *twil* (f. *twila*, pl. *twal*) |
| #741 | **finger** | *finger* | ❌ English Artifact | Untranslated English noun. Maltese: *saba'* (pl. *swaba'*) |
| #769 | **modern** | *modern* | ✅ Valid Loanword | Valid Maltese loanword (*modern*, f. *moderna*, pl. *moderni*) |
| #770 | **element** | *element* | ✅ Valid Loanword | Valid Maltese loanword (*element*; pl. *elementi*) |
| #771 | **hit** | *hit* | ❌ English Artifact | Untranslated English verb. Maltese: *laqat* or *ħabbat* |
| #778 | **ring** | *ring* | ❌ English Artifact | Untranslated English. Maltese: *ċurkett* (finger ring) or *ċempel* (call) |
| #803 | **sharp** | *sharp* | ❌ English Artifact | Untranslated English adjective. Maltese: *jaqta'* or *qawwi* |
| #828 | **hurry** | *hurry* | ❌ English Artifact | Untranslated English. Maltese: *għaġġel* (verb) or *għaġla* (noun) |
| #833 | **tie** | *tie* | ❌ English Artifact | Untranslated English. Maltese: *rabat* (verb) or *ingravata* (necktie) |
| #840 | **gun** | *gun* | ❌ English Artifact | Untranslated English noun. Maltese: *xkubetta* or *pistola* |
| #848 | **lift** | *lift* | ❌ English Artifact | Untranslated English. Maltese: *refa'* (verb) or *lift* (noun: elevator loanword) |
| #854 | **shore** | *shore* | ❌ English Artifact | Untranslated English noun. Maltese: *xatt* (pl. *xtut*) |
| #868 | **dad** | *dad* | ❌ English Artifact | Untranslated English noun. Maltese: *missier* or *pa* |
| #872 | **bar** | *bar* | ✅ Valid Loanword | Valid Maltese loanword (*bar*; pl. *bars* / *barijiet*) |
| #874 | **segment** | *segment* | ✅ Valid Loanword | Valid Maltese loanword (*segment*; pl. *segmenti*) |
| #875 | **slave** | *slave* | ❌ English Artifact | Untranslated English noun. Maltese: *ilsir* (pl. *ilsiera*) or *skjav* |
| #877 | **instant** | *instant* | ❌ English Artifact | Untranslated English. Maltese: *istant* / *mument* / *f'ħakka t'għajn* |
| #895 | **log** | *log* | ❌ English Artifact | Untranslated English noun. Maltese: *zokk* (wood) or *reġistru* (record) |
| #904 | **pretty** | *pretty* | ❌ English Artifact | Untranslated English adjective. Maltese: *sabiħ* / *ħelu* |
| #916 | **fig** | *fig* | ❌ English Artifact | Untranslated English noun. Maltese: *tina* (pl. *tin*) |
| #919 | **sister** | *sister* | ❌ English Artifact | Untranslated English noun. Maltese: *oħt* (pl. *aħwa*) |
| #934 | **band** | *band* | ❌ English Artifact | Untranslated English noun. Maltese: *banda* (musical band) or *faxxa* |
| #936 | **slip** | *slip* | ❌ English Artifact | Untranslated English. Maltese: *żelaq* (verb) or *żelqa* (noun) |
| #937 | **win** | *win* | ❌ English Artifact | Untranslated English verb. Maltese: *rebaħ* (impf. *jirbaħ*) |
| #943 | **total** | *total* | ✅ Valid Loanword | Valid Maltese loanword (*total*; pl. *totali*) |
| #948 | **double** | *double* | ❌ English Artifact | Untranslated English. Maltese: *doppju* |
| #969 | **camp** | *camp* | ✅ Valid Loanword | Valid Maltese loanword (*kamp* is standard, but *camp* occurs in loan contexts) |
| #974 | **quart** | *quart* | ❌ English Artifact | Untranslated English noun. Maltese: *kwart* |
| #981 | **shop** | *shop* | ❌ English Artifact | Untranslated English noun. Maltese: *ħanut* (pl. *ħwienet*) |
| #982 | **stretch** | *stretch* | ❌ English Artifact | Untranslated English. Maltese: *matted* / *ġibed* |
| #984 | **shine** | *shine* | ❌ English Artifact | Untranslated English verb. Maltese: *idda* / *leqq* |

---

## Appendix B · Repeated Maltese Lemmas (Duplicates)

The source list maps multiple English synonyms to the same Maltese word without distinction. During audit, these should either be distinguished by exact POS/sense or merged into a single comprehensive headword.

| Maltese Lemma | Occurrences | Ranks & Glosses | Recommended Audit Action |
|:---|:---:|:---|:---|
| **li** | 6 | #4 (*that*), #31 (*to*), #40 (*which*), #194 (*who*), #468 (*verb*), #776 (*whose*) | Disambiguate relative pronoun (*that/which/who*), prepositional complement (*to*), and fix #468 error (*verb*) |
| **kien** | 3 | #6 (*was*), #198 (*been*), #427 (*stood*) | Canonical auxiliary verb *kien*; distinguish past tense from participle |
| **ma** | 3 | #10 (*with*), #51 (*does*), #242 (*don’t*) | Distinguish negative particle *ma* from preposition *ma'* (*with*) |
| **minn** | 3 | #17 (*from*), #18 (*by*), #191 (*than*) | Verify semantic distinctions or cross-reference to primary entry |
| **sħun** | 3 | #19 (*hot*), #387 (*hot*), #439 (*warm*) | Verify semantic distinctions or cross-reference to primary entry |
| **jista** | 3 | #36 (*can*), #195 (*may*), #233 (*might*) | Verify semantic distinctions or cross-reference to primary entry |
| **art** | 3 | #70 (*land*), #464 (*ground*), #720 (*floor*) | Verify semantic distinctions or cross-reference to primary entry |
| **għandhom** | 3 | #72 (*must*), #205 (*should*), #715 (*shall*) | Verify semantic distinctions or cross-reference to primary entry |
| **wara** | 3 | #111 (*after*), #445 (*behind*), #860 (*post*) | Verify semantic distinctions or cross-reference to primary entry |
| **ħafna** | 3 | #127 (*very*), #141 (*much*), #159 (*many*) | Verify semantic distinctions or cross-reference to primary entry |
| **mara** | 3 | #621 (*lady*), #799 (*woman*), #964 (*wife*) | Verify semantic distinctions or cross-reference to primary entry |
| **fuq** | 2 | #8 (*on*), #188 (*over*) | Verify semantic distinctions or cross-reference to primary entry |
| **huma** | 2 | #9 (*are*), #11 (*they*) | Verify semantic distinctions or cross-reference to primary entry |
| **wieħed** | 2 | #14 (*one*), #692 (*single*) | Verify semantic distinctions or cross-reference to primary entry |
| **dan** | 2 | #16 (*this*), #25 (*it*) | Verify semantic distinctions or cross-reference to primary entry |
| **jew** | 2 | #27 (*or*), #721 (*either*) | Verify semantic distinctions or cross-reference to primary entry |
| **tal** | 2 | #30 (*of*), #369 (*test*) | Verify semantic distinctions or cross-reference to primary entry |
| **jekk** | 2 | #44 (*if*), #710 (*whether*) | Verify semantic distinctions or cross-reference to primary entry |
| **kull** | 2 | #49 (*each*), #120 (*every*) | Verify semantic distinctions or cross-reference to primary entry |
| **aħħar** | 2 | #60 (*end*), #224 (*last*) | Verify semantic distinctions or cross-reference to primary entry |
| **bħal** | 2 | #75 (*such*), #164 (*like*) | Verify semantic distinctions or cross-reference to primary entry |
| **tip** | 2 | #84 (*kind*), #729 (*type*) | Verify semantic distinctions or cross-reference to primary entry |
| **qrib** | 2 | #96 (*near*), #245 (*close*) | Verify semantic distinctions or cross-reference to primary entry |
| **xogħol** | 2 | #103 (*work*), #580 (*job*) | Verify semantic distinctions or cross-reference to primary entry |
| **parti** | 2 | #104 (*part*), #774 (*party*) | Verify semantic distinctions or cross-reference to primary entry |
| **post** | 2 | #107 (*place*), #844 (*spot*) | Verify semantic distinctions or cross-reference to primary entry |
| **ftit** | 2 | #113 (*little*), #249 (*few*) | Verify semantic distinctions or cross-reference to primary entry |
| **biss** | 2 | #114 (*only*), #129 (*just*) | Verify semantic distinctions or cross-reference to primary entry |
| **bniedem** | 2 | #116 (*man*), #787 (*human*) | Verify semantic distinctions or cross-reference to primary entry |
| **forma** | 2 | #130 (*form*), #385 (*shape*) | Verify semantic distinctions or cross-reference to primary entry |
| **aktar** | 2 | #176 (*more*), #185 (*most*) | Verify semantic distinctions or cross-reference to primary entry |
| **qatt** | 2 | #223 (*never*), #308 (*ever*) | Verify semantic distinctions or cross-reference to primary entry |
| **belt** | 2 | #227 (*city*), #403 (*town*) | Verify semantic distinctions or cross-reference to primary entry |
| **diffiċli** | 2 | #231 (*hard*), #763 (*difficult*) | Verify semantic distinctions or cross-reference to primary entry |
| **istorja** | 2 | #234 (*story*), #788 (*history*) | Verify semantic distinctions or cross-reference to primary entry |
| **wiċċ** | 2 | #271 (*face*), #362 (*surface*) | Verify semantic distinctions or cross-reference to primary entry |
| **jidhru** | 2 | #275 (*seem*), #491 (*appear*) | Verify semantic distinctions or cross-reference to primary entry |
| **tfal** | 2 | #279 (*children*), #665 (*child*) | Verify semantic distinctions or cross-reference to primary entry |
| **karta** | 2 | #285 (*paper*), #933 (*card*) | Verify semantic distinctions or cross-reference to primary entry |
| **joħolqu** | 2 | #320 (*pose*), #805 (*create*) | Verify semantic distinctions or cross-reference to primary entry |
| **kwistjoni** | 2 | #331 (*question*), #528 (*matter*) | Verify semantic distinctions or cross-reference to primary entry |
| **nofs** | 2 | #336 (*half*), #656 (*middle*) | Verify semantic distinctions or cross-reference to primary entry |
| **nofsinhar** | 2 | #340 (*south*), #767 (*noon*) | Verify semantic distinctions or cross-reference to primary entry |
| **waqfa** | 2 | #355 (*stay*), #620 (*break*) | Verify semantic distinctions or cross-reference to primary entry |
| **pjan** | 2 | #375 (*plane*), #414 (*plan*) | Verify semantic distinctions or cross-reference to primary entry |
| **logħba** | 2 | #384 (*game*), #913 (*match*) | Verify semantic distinctions or cross-reference to primary entry |
| **magna** | 2 | #411 (*machine*), #545 (*engine*) | Verify semantic distinctions or cross-reference to primary entry |
| **quddiem** | 2 | #429 (*front*), #922 (*forward*) | Verify semantic distinctions or cross-reference to primary entry |
| **aħjar** | 2 | #452 (*best*), #454 (*better*) | Verify semantic distinctions or cross-reference to primary entry |
| **inqas** | 2 | #474 (*less*), #610 (*least*) | Verify semantic distinctions or cross-reference to primary entry |
| **triq** | 2 | #492 (*road*), #893 (*path*) | Verify semantic distinctions or cross-reference to primary entry |
| **tul** | 2 | #516 (*length*), #962 (*term*) | Verify semantic distinctions or cross-reference to primary entry |
| **wiesgħa** | 2 | #548 (*wide*), #993 (*broad*) | Verify semantic distinctions or cross-reference to primary entry |
| **ferrovija** | 2 | #558 (*train*), #793 (*rail*) | Verify semantic distinctions or cross-reference to primary entry |
| **miżmuma** | 2 | #576 (*kept*), #716 (*held*) | Verify semantic distinctions or cross-reference to primary entry |
| **jiġbru** | 2 | #647 (*collect*), #980 (*gather*) | Verify semantic distinctions or cross-reference to primary entry |
| **pjuttost** | 2 | #653 (*quite*), #809 (*rather*) | Verify semantic distinctions or cross-reference to primary entry |
| **libsa** | 2 | #677 (*dress*), #846 (*suit*) | Verify semantic distinctions or cross-reference to primary entry |
| **kaptan** | 2 | #800 (*captain*), #851 (*master*) | Verify semantic distinctions or cross-reference to primary entry |

---

## Appendix C · Multi-Word Expressions & Clitics

| Rank | Raw Text | English Gloss | Lexical Category | Audit Recommendation |
|:---:|:---|:---|:---|:---|
| #029 | **l-** | the | Definite Article | Standardize as clitic prefix or subentry under article rules |
| #048 | **l** | an | Definite Article Variant | Merge with #029; English gloss 'an' is incorrect (Maltese has no indefinite article) |
| #091 | **darb’oħra** | again | Adverbial Phrase | Index under *darba* or as distinct phrasal entry |
| #243 | **filwaqt li** | while | Subordinating Conjunction | Valid compound conjunction; document as multi-word unit |
| #277 | **li jmiss** | next | Relative Participle Phrase | Index under verb *mess* or as idiomatic expression |
| #307 | **hawn fuq** | above | Locative Adverbial Phrase | Index under *hawn* / *fuq* |
| #344 | **kien jaf** | knew | Compound Past Verb | Lemmatize under base verb *jaf* (past: *kien jaf*) |
| #485 | **bil-mod** | slow | Adverbial Phrase | Means 'slowly'; adjective 'slow' is *mgħaġġel* / *tqil* / *bil-mod* |
| #512 | **f’daqqa** | sudden | Adverbial Phrase | Means 'suddenly / all at once'; adjective is *għarrieda* / *f'daqqa* |
| #597 | **b’saqaf** | clothe | Prepositional Phrase | Severe error; means 'roofed'. To clothe is *libbes* |
| #752 | **mhux se** | won’t | Future Negative Particle | Compound future negation (*mhux* + *se*) |
| #765 | **jekk jogħġbok** | please | Courtesy Formula / Idiom | Valid idiomatic formula; index as set phrase |
| #768 | **uċuħ tar-raba** | crop | Plural Noun Compound | Construct state compound; base singular: *wiċċ ir-raba* |
| #797 | **b’hekk** | thus | Conjunctive Adverb | Valid conjunctive adverb (*b'hekk* = thus / in this way) |
| #926 | **F’ħin** | score | Prepositional Phrase | Error in gloss; means 'in time'. Score = *skor* / *riżultat* |

