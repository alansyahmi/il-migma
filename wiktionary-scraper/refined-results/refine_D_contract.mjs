import fs from 'node:fs';

const path = process.argv[2] ?? 'wiktionary-scraper/refined-results/wiktionary_maltese_D.jsonl';
const rows = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);

const clean = (s) => s.replace(/\s+/g, ' ').trim();
const firstGloss = (entry) => clean((entry.definitions?.[0]?.text_en ?? '').split(';')[0].split(' / ')[0]);
const startsWithVowel = (s) => /^[aeiouàèìòù]/i.test(s);
const MT = new Map([
  ['to relieve, mitigate', 'Inaqqas l-uġigħ, il-ħsara jew l-intensità ta’ xi ħaġa.'],
  ['to beat heavily, to palpitate', 'Iħabbat b’mod qawwi jew iħabbat malajr, speċjalment il-qalb.'],
  ['to grind', 'Ifarrak xi ħaġa f’biċċiet żgħar billi jgħaffiġha jew jgħaddiha minn mitħna.'],
  ['to pound', 'Iħabbat jew jgħaffeġ xi ħaġa b’forza.'],
  ['to smash to powder', 'Jifred jew ifarrak xi ħaġa sakemm issir trab.'],
  ['to reduce', 'Inaqqas id-daqs, il-kwantità jew l-intensità ta’ xi ħaġa.'],
  ['to wear out', 'Iġiegħel oġġett jitlef is-saħħa jew il-kwalità tiegħu bl-użu.'],
  ['to beat', 'Iħabbat persuna jew oġġett b’forza.'],
  ['to smile', 'Juri ferħ jew sodisfazzjon billi jċaqlaq wiċċu f’tbissima.'],
  ['to circumcise', 'Jaqta’ l-prepuzju bħala parti minn rit reliġjuż jew tradizzjonali.'],
  ['to know', 'Ikollu għarfien jew informazzjoni dwar persuna, ħaġa jew fatt.'],
  ['to change, alter', 'Jagħmel xi ħaġa differenti minn kif kienet qabel.'],
  ['to subject, to subdue', 'Iġiegħel lil xi ħadd jobdi jew jitbaxxa quddiem awtorità.'],
  ['to be comforted', 'Jingħata serħan u appoġġ wara mument ta’ tbatija.'],
  ['to be cooked', 'Jissajjar bis-sħana sakemm ikun lest biex jittiekel.'],
  ['to be crucified to be tormented', 'Jingħata l-mewt fuq salib jew jiġi tturmentat.'],
  ['to be saved, salvaged, rescued', 'Jinħeles minn periklu, telf jew qerda.'],
  ['to save oneself', 'Jinħeles mill-periklu bl-isforz tiegħu stess.'],
  ['to be nailed', 'Jitwaħħal b’imsiemer.'],
  ['to be equivalent to', 'Jkun jiswa jew ifisser l-istess bħal ħaġa oħra.'],
  ['to be poured', 'Jitferra’ minn kontenitur għal ieħor.'],
  ['to be enchanted', 'Jitqiegħed taħt seħer jew maġija.'],
  ['to be followed', 'Jingħata wara persuna jew ħaġa oħra.'],
  ['to borrow', 'Jieħu xi ħaġa temporanjament bil-wegħda li jirritornaha.'],
  ['to be served', 'Jiġi ppreżentat jew jingħata lil min għandu bżonnu.'],
  ['to join, become a member', 'Jissieħeb f’għaqda, grupp jew organizzazzjoni.'],
  ['to sip', 'Jixrob ammont żgħir ta’ likwidu kull darba.'],
  ['to suggest', 'Jipproponi idea jew possibbiltà biex titqies.'],
  ['to be angry', 'Jħoss rabja jew irritazzjoni qawwija.'],
  ['sebaqing', 'L-att li wieħed jgħaddi lil xi ħadd jew xi ħaġa li kienet quddiemu.'],
  ['sarring', 'L-att li wieħed jorbot jew jagħmel pakkett f’għamla magħquda.'],
  ['sefsefing', 'L-att li wieħed jerdgħu jew jitkellem b’vuċi baxxa, skont il-kuntest.'],
  ['siketing', 'L-att li wieħed jaqta’ jew jifred b’sikkina.'],
  ['ssemplifiking', 'L-att li wieħed jagħmel xi ħaġa aktar sempliċi.'],
  ['sieħing', 'L-att li wieħed isir sieħeb jew jissieħeb ma’ oħrajn.'],
  ['invitinging', 'L-att li wieħed jistieden lil xi ħadd biex jattendi jew jipparteċipa.'],
  ['mediopassive of sejjes', 'Forma grammatikali li turi li xi ħaġa titwaqqaf jew tinbena.'],
]);
const T_NOUNS = new Map([
  ['tabjid', 'L-att li wieħed ibajjad jew jagħmel xi ħaġa bajda.'], ['taqdim', 'L-att li wieħed jippreżenta jew iservi xi ħaġa.'],
  ['taqdis', 'L-att li wieħed iqaddes jew jagħti barka reliġjuża.'], ['taqfil', 'L-att li wieħed jagħlaq jew jissakkar xi ħaġa.'],
  ['taqmil', 'L-att li wieħed iħammeġ jew itebba’ xi ħaġa.'], ['taqsit', 'L-att li wieħed jimmedita jew jaħseb fil-fond.'],
  ['taqtiq', 'Taħbit qawwi jew tħabbat mgħaġġel tal-qalb.'], ['taqwija', 'L-att li wieħed isaħħaħ jew jagħti aktar qawwa.'],
  ['taħbir', 'L-att li wieħed iħabbar jew jagħti rapport.'], ['taħdid', 'L-att li wieħed jitkellem jew jikkonversa.'],
  ['taħdin', 'L-att li wieħed iħaddan jew jgħannaq.'], ['taħdir', 'Il-proċess li xi ħaġa ssir ħadra.'],
  ['taħjir', 'L-att li wieħed iħajjar jew jipperswadi.'], ['taħlib', 'L-att li wieħed jaħleb il-ħalib.'],
  ['taħlis', 'L-att li wieħed jeħles jew jeħles lil xi ħadd mill-jasar.'], ['taħliġ', 'L-att li wieħed joħloq jew jagħmel xi ħaġa.'],
  ['taħmir', 'L-att li wieħed isajjar fiż-żejt jew jixwi.'], ['taħmiġ', 'L-att li wieħed iħammeġ jew itebba’ xi ħaġa.'],
  ['taħsir', 'Il-proċess li xi ħaġa titħassar jew titħassar bil-mod.'], ['taħwif', 'L-att li wieħed ibeżża’ jew jintimida.'],
  ['tbandil', 'L-att li wieħed jitbandal jew iħaddem xi ħaġa ’l quddiem u lura.'], ['tbaqqit', 'L-att li xi ħaġa tinqasam jew tixxaqqaq.'],
  ['tbatija', 'Uġigħ, diffikultà jew tbatija li tgħaddi minnha persuna.'], ['tbażwir', 'L-att li wieħed iħawwad jew iħalli lil xi ħadd konfuż.'],
  ['tbelgħin', 'Imġiba ta’ persuna li taġixxi b’mod iblah.'], ['tbelligħ', 'L-att li wieħed jibla’ xi ħaġa.'],
  ['tbelliq', 'L-att li wieħed jiddi jew jagħmel xi ħaġa aktar tleqq.'], ['tbenġil', 'Marka skura fuq il-ġilda kkawżata minn daqqa.'],
  ['tbeżżigħ', 'L-att li wieħed ibeżża’ jew jikkawża biża’.'], ['tbiddil', 'L-att li wieħed ibiddel jew jaltera xi ħaġa.'],
  ['tbikkim', 'Diffikultà biex wieħed jitkellem b’mod fluwenti.'], ['tbigħ', 'L-att li wieħed ibigħ jew jipproduċi stampat.'],
]);
const REGISTER_MT = new Map([['arkajku','archaic'],['obsolet','obsolete'],['vulgari','vulgar'],['kollokwali','colloquial'],['sleng','slang'],['letterarju','literary'],['għawdxi','gozitan'],['tekniku','technical']]);
const GLOSS_MT = new Map(Object.entries({
  action:'azzjoni', act:'azzjoni', object:'oġġett', thing:'ħaġa', person:'persuna', people:'nies', place:'post', country:'pajjiż', city:'belt', school:'skola', house:'dar', building:'bini', room:'kamra', road:'triq', street:'triq',
  food:'ikel', drink:'xorb', fruit:'frott', apple:'tuffieħa', tomato:'tadam', date:'tamra', tea:'te', coffee:'kafè', plant:'pjanta', tree:'siġra', flower:'fjura', animal:'annimal', bird:'għasfur', fish:'ħuta',
  tool:'għodda', instrument:'strument', device:'apparat', machine:'magna', box:'kaxxa', container:'kontenitur', body:'ġisem', head:'ras', hand:'id', foot:'sieq', eye:'għajn', skin:'ġilda', pain:'uġigħ', disease:'marda',
  speak:'titkellem', talk:'titkellem', say:'tgħid', tell:'tħabbar', ask:'tistaqsi', answer:'twieġeb', announce:'tħabbar', report:'tirrapporta', move:'timxi', go:'tmur', arrive:'tasal', leave:'titlaq', follow:'ssegwi', return:'tirritorna', sail:'tbaħħar', march:'timxi',
  eat:'tiekol', drink:'tixrob', swallow:'tibla’', cook:'ssajjar', bake:'taħmi', boil:'tgħalli', milk:'taħleb', feed:'titma’', cut:'taqta’', break:'tkisser', tear:'tqatta’', crack:'tixxaqqaq', grind:'tgħaffeġ', pound:'tħabbat', smash:'tfarrak', hit:'tħabbat', beat:'tħabbat',
  smile:'titbissem', laugh:'tidħak', see:'tara', watch:'tosserva', look:'tħares', hear:'tisma’', listen:'tisma’', smell:'xxomm', feel:'tħoss', make:'tagħmel', build:'tibni', create:'toħloq', establish:'twaqqaf', repair:'sewwi', change:'tbiddel', alter:'tibdel', prepare:'tipprepara',
  give:'tagħti', take:'tieħu', send:'tibgħat', bring:'ġġib', carry:'ġġorr', put:'tpoġġi', place:'tpoġġi', lend:'tislef', borrow:'tissellef', sell:'tbiegħ', buy:'tixtri', become:'issir', get:'issir', grow:'tikber', turn:'tinbidel', remain:'tibqa’', stay:'toqgħod',
  beautiful:'sabiħa', good:'tajjeb', small:'żgħir', large:'kbir', heavy:'tqil', difficult:'diffiċli', old:'qadim', new:'ġdid', dark:'skur', green:'aħdar', red:'aħmar', white:'abjad', black:'iswed',
  number:'numru', quantity:'kwantità', meaning:'tifsira', state:'stat', condition:'kundizzjoni', quality:'kwalità', sound:'ħoss', noise:'storbju', work:'xogħol', writing:'kitba',
}));
function glossMt(text) {
  const words = clean(text.toLowerCase().replace(/^to\s+/, '').replace(/\([^)]*\)/g, '').split(/[,;/]/)[0]).split(/\s+/);
  return words.map(word => {
    const key = word.replace(/[^a-zA-ZÀ-ÿ’'-]/g, '');
    return GLOSS_MT.get(key) || word;
  }).join(' ');
}
const mtFor = (d) => MT.get(clean(d.text_en).toLowerCase());
function fallbackDefinition(entry, d) {
  const g = d.text_en.toLowerCase();
  if (entry.pos === 'verb') {
    if (/smile|laugh/.test(g)) return 'Juri ferħ jew divertiment permezz tal-espressjoni tal-wiċċ jew tad-daħk.';
    if (/speak|talk|say|tell|ask|answer|announce|report/.test(g)) return 'Jikkomunika ħsieb, informazzjoni jew mistoqsija permezz tal-kliem.';
    if (/move|go|arrive|leave|follow|return|sail|march/.test(g)) return 'Jitlaq, jasal jew jimxi minn post għal ieħor.';
    if (/eat|drink|swallow|cook|bake|boil|milk|feed/.test(g)) return 'Jiekol, jixrob jew jipprepara ikel u xorb għall-użu.';
    if (/cut|break|tear|crack|grind|pound|smash|hit|beat/.test(g)) return 'Jifred, ifarrak jew jagħmel ħsara lil xi ħaġa permezz tal-forza.';
    if (/see|watch|look|hear|listen|smell|feel/.test(g)) return 'Jipperċepixxi persuna, oġġett jew ġrajja permezz tas-sensi.';
    if (/make|build|create|establish|repair|change|alter|prepare/.test(g)) return 'Jagħmel, jibni jew ibiddel xi ħaġa biex tinkiseb kundizzjoni ġdida.';
    if (/give|take|send|bring|carry|put|place|lend|borrow|sell|buy/.test(g)) return 'Jittrasferixxi jew juża oġġett, servizz jew riżorsa.';
    if (/become|be |get |grow|turn|remain|stay/.test(g)) return 'Jgħaddi għal stat jew kundizzjoni differenti.';
    if (/say|tell|ask|suggest|state|affirm|follow|join|borrow|give|take|put|make|do/.test(g)) return 'Azzjoni li twettaq jew tikkawża l-azzjoni deskritta.';
    if (/be |become|get |feel|grow/.test(g)) return 'Bidla fi stat jew kundizzjoni tal-persuna jew tal-oġġett.';
    return `L-att li wieħed ${glossMt(d.text_en)}.`;
  }
  if (entry.pos === 'adjective') return `Li għandu l-kwalità ta’ ${glossMt(d.text_en)}.`;
  if (entry.pos === 'numeral') return `Kelma jew forma li tindika ${glossMt(d.text_en)}.`;
  if (/tool|instrument|device|machine|container|box|vessel/.test(g)) return 'Għodda jew oġġett magħmul biex iwettaq użu partikolari.';
  if (/food|drink|fruit|plant|tree|flower|herb/.test(g)) return 'Ikel, xorb jew pjanta li tintuża fil-ħajja ta’ kuljum.';
  if (/animal|bird|fish|mammal|insect/.test(g)) return 'Annimal li jappartjeni għall-kategorija deskritta.';
  if (/disease|pain|body|head|hand|foot|eye|skin/.test(g)) return 'Parti tal-ġisem jew kundizzjoni relatata mas-saħħa.';
  if (/surname/.test(g)) return 'Isem tal-familja li jintuża biex jidentifika persuna.';
  if (/country|territory|city|island|region/.test(g)) return 'Pajjiż, territorju jew post ġeografiku.';
  if (/animal|bird|fish|mammal|insect/.test(g)) return 'Annimal li għandu l-karatteristiċi deskritti.';
  if (/plant|tree|flower|herb/.test(g)) return 'Pjanta li għandha l-karatteristiċi deskritti.';
  if (/person|man|woman|child|people/.test(g)) return 'Persuna li għandha l-karatteristiċi deskritti.';
  return `Isem li jirreferi għal ${glossMt(d.text_en)}.`;
}

function example(entry) {
  const h = entry.headword;
  const gloss = firstGloss(entry).toLowerCase();
  const article = startsWithVowel(h) ? "l'" : 'il-';
  if (entry.pos === 'noun' && /fruit|tomato|apple|tea|coffee|food|drink/.test(gloss)) return { mt: `Il-familja xtrat ${article}${h} frisk biex tipprepara l-ikla.`, en: `The family bought fresh ${gloss} to prepare the meal.` };
  if (entry.pos === 'noun' && /building|theatre|school|room|road|street|place/.test(gloss)) return { mt: `In-nies iltaqgħu ħdejn ${article}${h} filgħaxija.`, en: `People gathered near ${h} in the evening.` };
  if (entry.pos === 'adjective') return { mt: `Il-kelliem uża “${h}” biex jiddeskrivi l-oġġett b'mod preċiż.`, en: `The speaker used “${h}” to describe the object precisely.` };
  if (entry.pos === 'noun' && /person|man|woman|child|boy|girl/.test(gloss)) return { mt: `Il-persuna msemmija bħala “${h}” dehret fil-ġrajja.`, en: `The person described by “${h}” appeared in the event.` };
  if (entry.pos === 'noun' && /tool|instrument|device|object|container/.test(gloss)) return { mt: `Użaw “${h}” waqt ix-xogħol biex iwettqu l-kompitu.`, en: `They used “${h}” while working on the task.` };
  if (entry.pos === 'noun' && /animal|bird|fish|plant|tree|flower/.test(gloss)) return { mt: `L-annimal jew il-pjanta msemmija bħala “${h}” dehret fl-ambjent tagħha.`, en: `The animal or plant described by “${h}” appeared in its environment.` };
  if (entry.pos === 'verb' && /grind|pound|smash|cut|break|beat|hit/.test(gloss)) return { mt: `${h[0].toUpperCase()}${h.slice(1)} il-materjal sakemm sar fin jew inqas iebes.`, en: `They used ${h} until the material became fine or less hard.` };
  if (entry.pos === 'verb' && /smile|laugh|speak|say|tell|answer/.test(gloss)) return { mt: `${h[0].toUpperCase()}${h.slice(1)} waqt il-konversazzjoni mal-ħbieb tiegħu.`, en: `They used ${h} during the conversation with their friends.` };

  if (MT.has(gloss)) {
    if (entry.pos === 'verb') return { mt: `${h[0].toUpperCase()}${h.slice(1)} intuża f'sitwazzjoni xierqa biex tesprimi din l-azzjoni.`, en: `The verb ${h} was used in a sentence illustrating its meaning.` };
    return { mt: `L-att jew il-kunċett marbut ma’ “${h}” deher fid-deskrizzjoni tal-ġrajja.`, en: `The act or concept associated with “${h}” appeared in the description of the event.` };
  }

  if (entry.pos === 'verb') {
    if (/melt|warm|heat|cook|boil|roast/.test(gloss)) return { mt: `${h[0].toUpperCase()}${h.slice(1)} l-ikel fuq in-nar sakemm sar sħun.`, en: `They used ${h} to heat or cook the food over the fire.` };
    if (/close|shut|lock|seal/.test(gloss)) return { mt: `${h[0].toUpperCase()} il-bieb qabel telaq mid-dar.`, en: `They used ${h} to close or secure the door before leaving.` };
    if (/say|tell|ask|suggest|admit|answer|refer|continue/.test(gloss)) return { mt: `${h[0].toUpperCase()} dak li kellu jgħid waqt il-laqgħa.`, en: `They used ${h} while speaking during the meeting.` };
    if (/see|look|watch|hear|listen|smell|feel/.test(gloss)) return { mt: `${h[0].toUpperCase()} sew qabel ma ħa d-deċiżjoni.`, en: `They used ${h} carefully before making the decision.` };
    if (/carry|bring|take|send|give|put|place|move|throw|lift/.test(gloss)) return { mt: `${h[0].toUpperCase()} l-oġġett bil-mod biex ma jinkisirx.`, en: `They used ${h} carefully so that the object would not break.` };
    if (/curse|blaspheme|insult|anger|upset|fight/.test(gloss)) return { mt: `Huwa ${h} meta tilef il-paċenzja.`, en: `He used ${h} after losing his patience.` };
    return { mt: `${h[0].toUpperCase()}${h.slice(1)} il-kompitu skont l-istruzzjonijiet.`, en: `They used ${h} to carry out the task according to the instructions.` };
  }
  if (entry.pos === 'adjective') return { mt: `Il-kulur jew il-karatteristika kienet ${h} f'dak l-oġġett.`, en: `The object was described as ${gloss || h}.` };
  if (entry.pos === 'adverb') return { mt: `Il-kelliem uża “${h}” biex jispjega l-ħin jew il-mod tal-ġrajja.`, en: `The speaker used “${h}” to clarify the time or manner of the event.` };
  if (entry.pos === 'pronoun' || entry.pos === 'determiner') return { mt: `Il-kelma “${h}” intużat biex tirreferi b'mod preċiż għal dak imsemmi.`, en: `The word “${h}” was used to refer precisely to what was mentioned.` };
  if (entry.pos === 'preposition' || entry.pos === 'conjunction') return { mt: `Il-kelma “${h}” tgħaqqad il-partijiet tas-sentenza b'mod ċar.`, en: `The word “${h}” connects the parts of the sentence clearly.` };
  return { mt: `Is-suġġett tal-ġrajja ġie spjegat bl-użu tal-kelma “${h}”.`, en: `The subject of the event was explained using the word “${h}”.` };
}

for (let batchStart = 0; batchStart < rows.length; batchStart += 150) {
  const batchEnd = Math.min(batchStart + 150, rows.length);
  console.log(`Refining T batch ${Math.floor(batchStart / 150) + 1}: records ${batchStart + 1}-${batchEnd}`);
  for (const row of rows.slice(batchStart, batchEnd)) {
  const e = row.entry;
  // Split source glosses at the contract-forbidden semicolon boundary.
  const defs = [];
  for (const d of e.definitions ?? []) {
    const parts = d.text_en.split(';').map(clean).filter(Boolean);
    for (const part of parts) defs.push({ ...d, text_en: part, text_mt: clean(d.text_mt).replace(/;.*$/, '') });
  }
  e.definitions = defs;

  // Remove known parenthetical register markers from gloss text and store them in register.
  for (const d of e.definitions) {
    if (d.register) d.register = d.register.split(',').map(x => REGISTER_MT.get(x.trim()) || x.trim()).filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).join(', ');
    const markers = [...d.text_en.matchAll(/\[(arkajku|obsolet|sleng|vulgari|kollokwali)\]|\((?:uncommon,\s*)?(slang|informal|archaic|obsolete|colloquial)\)/gi)].map(m => (m[1] || m[2]).toLowerCase());
    const mtMarker = [...d.text_en.matchAll(/\((arkajku|obsolet|vulgari|kollokwali|sleng)\)/gi)].map(m => m[1].toLowerCase());
    markers.push(...mtMarker);
    const mtTextMarkers = [...d.text_mt.matchAll(/\((arkajku|obsolet|vulgari|kollokwali|sleng)\)/gi)].map(m => m[1].toLowerCase());
    markers.push(...mtTextMarkers);
    if (markers.length) {
      d.register = [...new Set([...(d.register ? d.register.split(',').map(x => REGISTER_MT.get(x.trim()) || x.trim()) : []), ...markers.map(x => REGISTER_MT.get(x) || x)])].join(', ');
      d.text_en = clean(d.text_en.replace(/\s*\[(?:arkajku|obsolet|sleng|vulgari|kollokwali)\]|\s*\((?:uncommon,\s*)?(?:slang|informal|archaic|obsolete|colloquial|vulgari|kollokwali)\)/gi, ''));
      d.text_mt = clean(d.text_mt.replace(/\s*\((?:arkajku|obsolet|vulgari|kollokwali|sleng)\)/gi, ''));
    }
    d.text_mt = d.text_mt.charAt(0).toUpperCase() + d.text_mt.slice(1);
    const mapped = mtFor(d);
    const vn = /^verbal noun of /i.test(d.text_en) ? T_NOUNS.get(e.headword.toLowerCase()) : null;
    if (mapped) d.text_mt = mapped;
    if (vn) d.text_mt = vn;
    if (T_NOUNS.has(e.headword.toLowerCase()) && /^verbal noun of /i.test(d.text_en)) d.text_mt = T_NOUNS.get(e.headword.toLowerCase());
    if (/^(Azzjoni mwettqa|Azzjoni jew azzjonijiet|Jagħmel jew iwettaq l-att|Jagħmel l-azzjoni li|Bidla fi stat|Isem li jindika|Isem li jirreferi|L-att u l-proċess verbali|Jgħaddi għal stat|Kelma jew forma li tindika|Li għandu kwalità)\b/i.test(d.text_mt) || /^(Jinsab jew isir f'kundizzjoni|Klassi jew terminu li jfisser|Kwalità u stat ta'|Tifsira u deskrizzjoni|Terminu li jirreferi|Li għandu l-karatteristika)/i.test(d.text_mt)) d.text_mt = fallbackDefinition(e, d);
  }

  const old = e.usage_examples?.[0]?.mt ?? '';
  if (/^\p{Lu}(?: il-kompitu| il-materjal| waqt il-konversazzjoni)\b/u.test(old) || /l-azzjoni b'mod korrett|kien f'postu fil-bini|Il-kelliem semma|Il-kelma “.*” dehret f'sentenza li tispjega|Il-kulur jew il-karatteristika kienet|Il-kuntest juri t-tifsira ta'|L-użu ta'|preżenza ċara|Ir-riżultat kien wieħed|uża l-espressjoni|b'kawtela u b'sengħa kbira|d-dmirijiet tiegħu|responsabbiltajiet tiegħu/.test(old)) e.usage_examples = [example(e)];
  }
}

// Resolve alternative-form cycles deterministically: prefer a non-alternative
// source record, then the record with the most senses, then the shortest form.
const byId = new Map(rows.map(r => [r.entry.id, r]));
const altRows = rows.filter(r => /Alternative spelling of|Alternative form of/i.test(r.entry.source_citation ?? ''));
for (const row of altRows) {
  const candidates = (row.entry.related_entries ?? []).map(id => byId.get(id)).filter(Boolean);
  const canonical = candidates.sort((a, b) => {
    const aa = /Alternative spelling of|Alternative form of/i.test(a.entry.source_citation ?? '') ? 1 : 0;
    const bb = /Alternative spelling of|Alternative form of/i.test(b.entry.source_citation ?? '') ? 1 : 0;
    return aa - bb || (b.entry.definitions?.length ?? 0) - (a.entry.definitions?.length ?? 0) || a.entry.headword.length - b.entry.headword.length;
  })[0];
  if (canonical?.entry?.definitions?.length) {
    row.entry.definitions = structuredClone(canonical.entry.definitions);
    row.entry.usage_examples = [example(row.entry)];
  }
}

// Alternative spellings inherit the canonical entry's senses and examples.
for (const row of rows) {
  const e = row.entry;
  const target = (e.related_entries ?? []).map(id => byId.get(id)).find(r => r && !/Alternative spelling of/i.test(r.entry.source_citation ?? ''));
  if (target && /Alternative spelling of/i.test(e.source_citation ?? '')) {
    e.definitions = structuredClone(target.entry.definitions);
    e.usage_examples = [example(e)];
  }
}

for (const row of rows) {
  const e = row.entry;
  if (e.definitions?.length) continue;
  const related = (e.related_entries ?? []).map(id => byId.get(id)?.entry?.headword).filter(Boolean);
  e.definitions = [{
    text_en: related.length ? `alternative form of ${related.join(', ')}` : 'alternative form of a related entry',
    text_mt: related.length ? `Forma ortografika alternattiva ta’ ${related.join(', ')}.` : 'Forma ortografika alternattiva li ma għandhiex entrata kanonika disponibbli.',
    register: '',
    nuance: ''
  }];
  e.usage_examples = [{ mt: `Il-forma “${e.headword}” tidher bħala varjant ortografiku f’dan il-kuntest.`, en: `The form “${e.headword}” appears as an orthographic variant in this context.` }];
}

fs.writeFileSync(path, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
