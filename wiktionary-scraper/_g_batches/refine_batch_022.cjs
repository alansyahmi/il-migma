const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, 'batch_022.jsonl');
const OUTPUT = path.resolve(__dirname, 'refined', 'batch_022.jsonl');

const APPROVED_TAGS = new Set([
  'common', 'rare', 'archaic', 'neologism', 'purist', 'formal', 'literary',
  'colloquial', 'obsolete', 'technical', 'dialectal', 'gozitan', 'slang',
  'vulgar', 'euphemistic', 'figurative', 'pejorative', 'childish',
  'agriculture', 'anatomy', 'animals', 'architecture', 'art', 'astronomy',
  'sea', 'botany', 'geography', 'food', 'commerce', 'family', 'physics',
  'war', 'law', 'mathematics', 'medicine', 'music', 'politics', 'religion',
  'crafts', 'sports', 'technology', 'weather', 'transport', 'time'
]);

// ---- Maltese definitions ----
const MT_DEFS = {
  'għeluqija': [
    'Għeluqija: il-kwalità ta\' xi ħaġa li tkun dejqa; id-dejjaq'
  ],
  'għemeż': [
    'Għemeż: fetaħ u għalaq għajnu malajr; għamel sinjal bl-għajn'
  ],
  'għemiż': [
    'Għemiż: l-att li wieħed jagħmeż b\'għajnu; it-tgħammiż',
    'Għemiż: tgħammiża; sinjal bl-għajn'
  ],
  'għen': [
    'Għen: ta l-għajnuna; għamel xi ħaġa ta\' ġid għal xi ħadd; mexxa idejh'
  ],
  'għeneb': [
    'Għeneb: frotta żgħira u tonda li tikber fi gruppi fuq id-dielja, ta\' lewn aħdar, aħmar jew vjola, li tintuża biex isir l-inbid u l-żbib'
  ],
  'għenejqed': [
    'Għenejqed: għanqud żgħir; grupp żgħir ta\' frott jew fjuri'
  ],
  'għenelli': [
    'Għenelli: jidhirli; naħseb; skont l-opinjoni tiegħi'
  ],
  'għens': [
    'Għens: mogħos maskili; mogħa maskili'
  ],
  'għepp': [ // noun
    'Għepp: għajta qasira u ta\' ton għoli, speċjalment ta\' ġeru qabel ma jitgħallem jinbaħ sewwa'
  ],
  // verb għepp shares headword with noun, handled by entry array index
  'għer': [
    'Għer: ħass l-għira jew ir-rgħiba lejn xi ħadd minħabba s-suċċess jew il-possedimenti tiegħu',
    'Għer: xtaq li kellu dak li għandu ħaddieħor'
  ],
  'għera': [
    'Għera: l-istat li wieħed ikun għeri; nuqqas ta\' ħwejjeġ; nudità'
  ],
  'għereq': [
    'Għereq: ħareġ l-għaraq minn ġismu minħabba s-sħana, l-isforz jew il-biża\'',
    'Għereq: nebba\' minn ġismu xi likwidu bħal demm jew ħalib',
    'Għereq: tilef ħajtu fl-ilma minħabba li ma setax jieħu n-nifs',
    'Għereq: mar mal-qiegħ; tilef il-wiċċ (ta\' bastiment)',
    'Għereq: għatta għalkollox bl-ilma; għodos'
  ],
  'għerf': [
    'Għerf: għarfien profond u għaqal akkwistati permezz tal-esperjenza jew l-istudju'
  ],
  'għeri': [
    'Għeri: mingħajr ħwejjeġ; bla libsa; mikxuf'
  ],
  'għerik': [
    'Għerik: l-att tal-għorok; il-ħakk; il-frizzjoni bejn żewġ uċuħ'
  ],
  'għerq': [
    'Għerq: il-parti ta\' pjanta li tikber taħt l-art u tassorbi l-ilma u n-nutrijenti',
    'Għerq: nervatura; ħajja jew fibra fil-ġisem li tħoss l-uġigħ',
    'Għerq: bidu, sors, oriġini ta\' xi ħaġa'
  ],
  'għerusija': [
    'Għerusija: il-perjodu ta\' żmien bejn il-ftehim taż-żwieġ u ż-żwieġ innifsu; l-istat ta\' min ikun għarus jew għarusa'
  ],
  'Għesaw': [
    'Għesaw: isem ta\' raġel mill-Bibbja, iben il-kbir ta\' Iżakk u ħu Ġakobb'
  ],
  'għex': [
    'Għex: baqa\' ħaj; dam ħaj; kellu l-ħajja',
    'Għex: kellu r-residenza permanenti tiegħu f\'post; stabbilixxa',
    'Għex: għadda minn esperjenza; esperjenza xi ħaġa'
  ],
  'għeġubija': [
    'Għeġubija: il-kwalità li tkun tal-għaġeb; l-istat li xi ħaġa tqanqal l-istagħġib',
    'Għeġubija: xi ħaġa li tqanqal l-għaġeb; meravilja',
    'Għeġubija: meravilja; ħaġa tal-għaġeb'
  ],
  'għeżejżen': [
    'Għeżejżen: daqsxejn għażżien; pjuttost għażżien'
  ],
  'għeżubija': [
    'Għeżubija: l-istat ta\' raġel li għadu ma żżewwiġx; ħajja ta\' għażeb'
  ],
  'għid': [
    'Għid: jum ta\' festa jew ċelebrazzjoni, ħafna drabi ta\' natura reliġjuża',
    'Għid: btala; jum ta\' mistrieħ jew ferħ',
    'Għid: ċelebrazzjoni; tiġrifa'
  ],
  'Għid il-Ħamiem': [
    'Għid il-Ħamiem: il-festa Nisranija li tfakkar iż-żjara tal-Maġi lit-tarbija Ġesù, ċċelebrata fis-6 ta\' Jannar; it-Tre Reġija'
  ]
};

// ---- Fixed English definitions (resolve circularity, fix formatting) ----
const FIXED_EN = {
  'għemiż': [
    'winking, blinking',
    'a wink'
  ],
  'għenejqed': [
    'small bunch, small cluster (diminutive of għanqud)'
  ],
  'għerik': [
    'rubbing, friction; verbal noun of għorok'
  ],
  'għeżejżen': [
    'somewhat lazy'
  ],
  'għid': [
    'feast, festival',
    'holiday',
    'celebration'
  ]
};

// ---- De-duplicate definitions (merge duplicate "root" entries) ----
const MERGE_DEFS = {
  'għerq': true
};

// ---- Usage examples ----
const EXAMPLES = {
  'għeluqija': [
    { mt: 'Din it-triq għandha wisq għeluqija.', en: 'This road has too much narrowness.' },
    { mt: 'L-għeluqija tal-kamra tagħmilha skomda.', en: 'The narrowness of the room makes it uncomfortable.' }
  ],
  'għemeż': [
    { mt: 'Għemeżli b\'għajnu biex nifhmu.', en: 'He winked at me to let me know.' },
    { mt: 'Tieqaf tgħameż u isma\' x\'għandi x\'ngħidlek.', en: 'Stop winking and listen to what I have to tell you.' }
  ],
  'għemiż': [
    { mt: 'Għarajtu mill-għemiż li għamilli.', en: 'I recognised him from the wink he gave me.' },
    { mt: 'Il-għemiż kontinwu jista\' jkun sinjal nervuż.', en: 'Continuous winking can be a nervous sign.' }
  ],
  'għen': [
    { mt: 'Għinni nġorr il-basktijiet, jekk jogħġbok.', en: 'Help me carry the bags, please.' },
    { mt: 'Dawn il-mediċini jgħinu kontra l-uġigħ ta\' ras.', en: 'These medicines help against headaches.' }
  ],
  'għeneb': [
    { mt: 'Il-għeneb misjur lest għall-ħsad f\'Settembru.', en: 'The ripe grapes are ready for harvesting in September.' },
    { mt: 'Qegħdin nagħmlu l-inbid mill-għeneb li kabbarna.', en: 'We are making wine from the grapes we grew.' },
    { mt: 'Ixtrajt għenba ħamra mis-suq illum.', en: 'I bought a red grape from the market today.' }
  ],
  'għenejqed': [
    { mt: 'Għenejqed żgħir ta\' għeneb kiber fil-ġnien.', en: 'A small bunch of grapes grew in the garden.' },
    { mt: 'L-għenejqed tal-fjuri kienu sbieħ.', en: 'The small bunches of flowers were beautiful.' }
  ],
  'għenelli': [
    { mt: 'Għenelli li llum se tagħmel ix-xita.', en: 'It seems to me that it will rain today.' },
    { mt: 'Għenelli li mhux se jasal fil-ħin.', en: 'It seems to me that he will not arrive on time.' }
  ],
  'għens': [
    { mt: 'L-għens qabad jitla\' fuq il-blat.', en: 'The billygoat started climbing onto the rocks.' },
    { mt: 'L-għenus jirgħu fil-mergħa.', en: 'The billygoats graze in the pasture.' }
  ],
  'għepp': [ // noun
    { mt: 'Smajna l-għepp tal-ġeru fil-bitħa.', en: 'We heard the yelp of the puppy in the yard.' },
    { mt: 'L-għepp tal-ġriewi jinstema\' mill-bogħod.', en: 'The yelping of the puppies is heard from afar.' }
  ],
  'għer': [
    { mt: 'Kien jgħir għalih għax għandu karozza ġdida.', en: 'He was jealous of him because he has a new car.' },
    { mt: 'Tgħirx għal ħaddieħor; kun kuntent b\'dak li għandek.', en: 'Do not envy others; be happy with what you have.' }
  ],
  'għera': [
    { mt: 'L-għera fil-pittura u l-iskultura hija forma ta\' espressjoni artistika.', en: 'Nudity in painting and sculpture is a form of artistic expression.' },
    { mt: 'L-għera tal-ġisem m\'għandhiex tkun meqjusa bħala xi ħaġa mistħija.', en: 'The nakedness of the body should not be seen as something shameful.' }
  ],
  'għereq': [
    { mt: 'Għereq kollu wara li dam jiġri.', en: 'He was all sweaty after running for a long time.' },
    { mt: 'Il-vapur għereq wara li laqat is-sikka.', en: 'The ship sank after hitting the reef.' },
    { mt: 'Kważi għereq fil-baħar meta kien żgħir.', en: 'He almost drowned in the sea when he was young.' }
  ],
  'għerf': [
    { mt: 'Huwa magħruf għall-għerf tiegħu fil-komunità.', en: 'He is known for his wisdom in the community.' },
    { mt: 'L-għerf jiġi bl-età u l-esperjenza.', en: 'Wisdom comes with age and experience.' }
  ],
  'għeri': [
    { mt: 'It-trabi spiss jibqgħu għerja fis-sajf.', en: 'Babies often stay naked in summer.' },
    { mt: 'Il-mudella kienet għerja għall-pittura.', en: 'The model was naked for the painting.' }
  ],
  'għerik': [
    { mt: 'L-għerik tal-ħabel ħaraqli idejja.', en: 'The rubbing of the rope burnt my hands.' },
    { mt: 'Wara l-għerik kontinwu, it-tajer inqata\'.', en: 'After continuous friction, the tyre burst.' }
  ],
  'għerq': [
    { mt: 'L-għeruq tas-siġra huma fondi.', en: 'The roots of the tree are deep.' },
    { mt: 'L-għerq tal-problema huwa l-komunikazzjoni.', en: 'The root of the problem is communication.' },
    { mt: 'Din il-kelma għandha għeruq Għarab.', en: 'This word has Arabic roots.' }
  ],
  'għerusija': [
    { mt: 'L-għerusija damet sentejn qabel iż-żwieġ.', en: 'The betrothal lasted two years before the wedding.' },
    { mt: 'Iċċelebraw l-għerusija tagħhom b\'festa.', en: 'They celebrated their betrothal with a party.' }
  ],
  'Għesaw': [
    { mt: 'L-istorja ta\' Għesaw u Ġakobb tinsab fil-Ktieb tal-Ġenesi.', en: 'The story of Esau and Jacob is in the Book of Genesis.' },
    { mt: 'Għesaw biegħ il-bikrija tiegħu lil ħuh Ġakobb.', en: 'Esau sold his birthright to his brother Jacob.' }
  ],
  'għex': [
    { mt: 'Għex ħajja twila u kuntenta.', en: 'He lived a long and happy life.' },
    { mt: 'Ngħix f\'Malta minn meta twelidt.', en: 'I have been living in Malta since I was born.' },
    { mt: 'Għex esperjenza diffiċli fiż-żgħożija tiegħu.', en: 'He lived through a difficult experience in his youth.' }
  ],
  'għeġubija': [
    { mt: 'In-natura hija mimlija għeġubijiet.', en: 'Nature is full of wonders.' },
    { mt: 'Il-Piramidi huma waħda mill-għeġubijiet tad-dinja.', en: 'The Pyramids are one of the wonders of the world.' }
  ],
  'għeżejżen': [
    { mt: 'Huwa għeżejżen u ma tantx iħobb jaħdem.', en: 'He is somewhat lazy and does not really like working.' },
    { mt: 'Ibni għeżejżen illum u ma jridx jagħmel id-dmirijiet.', en: 'My son is somewhat lazy today and does not want to do his homework.' }
  ],
  'għeżubija': [
    { mt: 'L-għeżubija tiegħu tatlu l-opportunità jivvjaġġa.', en: 'His bachelorhood gave him the opportunity to travel.' },
    { mt: 'Illum il-ġurnata l-għeżubija hija għażla ta\' ħafna.', en: 'Nowadays bachelorhood is a choice for many.' }
  ],
  'għid': [
    { mt: 'L-Għid il-Kbir huwa l-akbar festa Nisranija.', en: 'Easter is the greatest Christian feast.' },
    { mt: 'F\'Malta, kull raħal jiċċelebra l-għid tal-patrun tiegħu.', en: 'In Malta, every village celebrates its patron saint\'s feast.' }
  ],
  'Għid il-Ħamiem': [
    { mt: 'Għid il-Ħamiem jiġi ċċelebrat fis-6 ta\' Jannar.', en: 'Epiphany is celebrated on the 6th of January.' },
    { mt: 'F\'Malta, Għid il-Ħamiem huwa btala pubblika.', en: 'In Malta, Epiphany is a public holiday.' }
  ]
};

// ---- Handle homographs (same headword, different POS) ----
// For għepp (noun vs verb), we need to use different MT defs and examples
// indexed by their position in the batch (0-based line number)
// Line 9 = noun għepp, Line 10 = verb għepp
const MT_BY_INDEX = {
  8: [ // noun għepp (line 9, 0-indexed = 8)
    'Għepp: għajta qasira u ta\' ton għoli, speċjalment ta\' ġeru qabel ma jitgħallem jinbaħ sewwa'
  ],
  9: [ // verb għepp (line 10, 0-indexed = 9)
    'Għepp: għamel għajta qasira u ta\' ton għoli, speċjalment ta\' ġeru (użat għall-ġriewi)'
  ]
};

const EXAMPLES_BY_INDEX = {
  9: [ // verb għepp
    { mt: 'Il-ġeru beda jgħepp meta ra lil sidu.', en: 'The puppy started yipping when it saw its owner.' },
    { mt: 'Il-ġriewi jgħeppu l-lejl kollu jekk iħossuhom waħedhom.', en: 'The puppies yip all night if they feel lonely.' }
  ]
};

function processEntry(raw, index) {
  const obj = JSON.parse(raw);

  // Remove _scratchpad
  delete obj._scratchpad;

  const entry = obj.entry || obj;
  const hw = entry.headword;

  // ---- Fix text_en (resolve circularity, fix formatting) ----
  if (FIXED_EN[hw]) {
    entry.definitions.forEach((d, i) => {
      if (i < FIXED_EN[hw].length) {
        d.text_en = FIXED_EN[hw][i];
      }
    });
  }

  // ---- Deduplicate definitions (merge duplicate entries) ----
  if (MERGE_DEFS[hw]) {
    const seen = new Set();
    entry.definitions = entry.definitions.filter(d => {
      const key = d.text_en.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ---- Fix trailing comma in text_en (għid: "feast, festival,") ----
  entry.definitions.forEach(d => {
    if (d.text_en) {
      d.text_en = d.text_en.replace(/,\s*$/, '');
    }
  });

  // ---- Fill text_mt ----
  // Check if there's an index-specific mapping first
  let mtDefs = MT_BY_INDEX[index] || null;
  if (!mtDefs) {
    mtDefs = MT_DEFS[hw] || null;
  }

  if (mtDefs) {
    const cleanMt = mtDefs.map(s => s.replace(/;\s*/g, '. ').replace(/\.\s+\./g, '. ').trim());

    // If more MT defs than existing defs, add new def entries
    if (cleanMt.length > entry.definitions.length) {
      for (let i = entry.definitions.length; i < cleanMt.length; i++) {
        entry.definitions.push({
          text_en: '',
          text_mt: null,
          register: '',
          nuance: ''
        });
      }
    }

    cleanMt.forEach((mt, i) => {
      if (i < entry.definitions.length) {
        entry.definitions[i].text_mt = mt;
      }
    });

    // If fewer MT defs than existing defs, fill remaining with generic continuation
    // (shouldn't happen with proper mapping, but handle gracefully)
  }

  // ---- No semicolons in text_en or text_mt ----
  entry.definitions.forEach(d => {
    if (d.text_en && d.text_en.includes(';')) {
      d.text_en = d.text_en.replace(/;/g, '.');
    }
    if (d.text_mt && d.text_mt.includes(';')) {
      d.text_mt = d.text_mt.replace(/;/g, '.');
    }
  });

  // ---- Validate tags ----
  if (obj.tags) {
    // Remove tags not in approved list
    obj.tags = obj.tags.filter(t => {
      const tagName = t.name || t.id;
      if (!APPROVED_TAGS.has(tagName)) {
        return false;
      }

      // No noun tag if pos=noun
      if ((tagName === 'noun' || tagName === 'nouns') && (entry.pos === 'noun')) {
        return false;
      }

      // No loanword if is_loanword=1
      if ((tagName === 'loanword' || tagName === 'loan') && entry.is_loanword === 1) {
        return false;
      }

      // No feminine if gender=feminine
      if ((tagName === 'feminine' || tagName === 'fem') && entry.gender === 'feminine') {
        return false;
      }

      // No semitic if root_consonants exists
      if ((tagName === 'semitic') && entry.root_consonants) {
        return false;
      }

      // No masculine if gender=masculine
      if ((tagName === 'masculine' || tagName === 'masc') && entry.gender === 'masculine') {
        return false;
      }

      return true;
    });
  }

  // Also clean entry_tags
  if (obj.entry_tags) {
    const validTagIds = new Set((obj.tags || []).map(t => t.id));
    obj.entry_tags = obj.entry_tags.filter(et => validTagIds.has(et.tag_id));
  }

  // ---- Add usage examples ----
  let examples = EXAMPLES_BY_INDEX[index] || null;
  if (!examples) {
    examples = EXAMPLES[hw] || null;
  }

  if (examples) {
    entry.usage_examples = examples.map(ex => ({
      maltese: ex.mt,
      english: ex.en
    }));
  }

  return JSON.stringify(obj);
}

// ---- Main ----
let raw = fs.readFileSync(INPUT, 'utf-8');
// Strip BOM if present
if (raw.charCodeAt(0) === 0xFEFF) {
  raw = raw.slice(1);
}
const lines = raw.split('\n').filter(l => l.trim());
const results = [];
const stats = { total: lines.length, modified: 0, errors: 0 };

for (let i = 0; i < lines.length; i++) {
  try {
    const processed = processEntry(lines[i], i);
    results.push(processed);
    stats.modified++;
  } catch (err) {
    console.error(`Error processing line ${i + 1}: ${err.message}`);
    stats.errors++;
    results.push(lines[i]); // keep original
  }
}

const outDir = path.dirname(OUTPUT);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT, results.join('\n') + '\n', 'utf-8');
console.log(JSON.stringify(stats, null, 2));
