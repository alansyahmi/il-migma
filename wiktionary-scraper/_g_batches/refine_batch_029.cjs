const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, 'batch_029.jsonl');
const OUTPUT = path.resolve(__dirname, 'refined', 'batch_029.jsonl');

const APPROVED_TAGS = new Set([
  'common', 'rare', 'archaic', 'neologism', 'purist', 'formal', 'literary',
  'colloquial', 'obsolete', 'technical', 'dialectal', 'gozitan', 'slang',
  'vulgar', 'euphemistic', 'figurative', 'pejorative', 'childish',
  'agriculture', 'anatomy', 'animals', 'architecture', 'art', 'astronomy',
  'sea', 'botany', 'geography', 'food', 'commerce', 'family', 'physics',
  'war', 'law', 'mathematics', 'medicine', 'music', 'politics', 'religion',
  'crafts', 'sports', 'technology', 'weather', 'transport', 'time'
]);

// ---- Maltese definitions (Oxford Maltese, capitalised, no semicolons) ----
// Keys are lowercase headword for headword-level, or lowercase-entry-id for per-id
const MT_DEFS = {};

function addMt(headwordOrId, defs) {
  const key = headwordOrId.toLowerCase();
  MT_DEFS[key] = defs;
}

addMt('ġennien', ['Ġennien: persuna li tieħu ħsieb il-ġonna u l-pjanti']);
addMt('adj-ġenoċida', ['Ġenoċida: li għandu x\'jaqsam mal-ġenoċidju jew li jwettaq ġenoċidju']);
addMt('n-ġenoċida', ['Ġenoċida: persuna li twettaq ġenoċidju']);
addMt('ġenoċidju', ['Ġenoċidju: il-qtil ta\' massa ta\' nies, speċjalment grupp etniku jew nazzjonali']);
addMt('ġens', [
  'Ġens: poplu, nazzjon',
  'Ġens: is-soċjetà ta\' pajjiż jew komunità',
  'Ġens: is-sess maskili jew femminili',
  'Ġens: rank f\'klassifikazzjoni tassonomika',
  'Ġens: il-kategorija grammatikali tas-sess'
]);
addMt('ġeografija', ['Ġeografija: l-istudju xjentifiku tal-art, il-karatteristiċi naturali, u l-fenomeni tad-dinja']);
addMt('ġeografikament', ['Ġeografikament: b\'mod ġeografiku, mil-lat tal-ġeografija']);
addMt('ġeografiku', ['Ġeografiku: relatat mal-ġeografija']);
addMt('ġeografu', ['Ġeografu: persuna li tistudja l-ġeografija']);
addMt('ġeometra', ['Ġeometra: persuna li tkejjel l-art, speċjalment għall-kostruzzjoni']);
addMt('ġeometrija', ['Ġeometrija: il-fergħa tal-matematika li tistudja l-proprjetajiet u r-relazzjonijiet tal-punti, il-linji, l-uċuħ u s-solidi']);
addMt('ġeometrikament', ['Ġeometrikament: b\'mod ġeometriku, mil-lat tal-ġeometrija']);
addMt('ġeometriku', ['Ġeometriku: relatat mal-ġeometrija']);
addMt('ġeometru', ['Ġeometru: persuna li tistudja l-ġeometrija']);
addMt('ġera', [
  'Ġera: mexa malajr, għaġġel',
  'Ġera: nixxa, kif jagħmel il-fluwidu',
  'Ġera: seħħ, okkorra',
  'Ġera: xtered, infirex'
]);
addMt('ġeraħ', [
  'Ġeraħ: weġġa\', iddannja bil-ġrieħi',
  'Ġeraħ: iddannja b\'mod serju u bid-demm'
]);
addMt('ġergħa', ['Ġergħa: l-ammont ta\' likwidu li jinbela\' f\'daqqa']);
addMt('adj-ġermaniż', ['Ġermaniż: relatat mal-Ġermanja, il-poplu Ġermaniż, jew il-lingwa Ġermaniża']);
addMt('n-ġermaniż', [
  'Ġermaniż: persuna mill-Ġermanja',
  'Ġermaniż: il-lingwa Ġermaniża, il-lingwa uffiċjali tal-Ġermanja'
]);
addMt('adj-ġermaniża', ['Ġermaniża: il-forma femminili ta\' Ġermaniż, relatata mal-Ġermanja']);
addMt('n-ġermaniża', ['Ġermaniża: mara mill-Ġermanja']);
addMt('ġermanja', [
  'Ġermanja: pajjiż fl-Ewropa Ċentrali',
  'Isem uffiċjali: Repubblika Federali tal-Ġermanja'
]);
addMt('ġermanju', ['Ġermanju: element kimiku, simbolu Ge, b\'numru atomiku 32']);
addMt('ġerra', [
  'Ġerra: ġiegħel lil xi ħadd jiġri',
  'Ġerra: ipparteċipa f\'tellieqa malajr',
  'Ġerra: saq b\'veloċità kbira',
  'Ġerra: masturba'
]);
addMt('ġerragħ', [
  'Ġerragħ: diġerixxa l-ikel',
  'Ġerragħ: bela\'',
  'Ġerragħ: sofra, aċċetta b\'paċenzja'
]);

// ---- Fix text_en (key = lowercase entry id) ----
const FIXED_EN = {};
function fixEn(id, textEnArr) {
  FIXED_EN[id.toLowerCase()] = textEnArr;
}
fixEn('n-ġermanja', [
  'Germany (a country in Central Europe)',
  'Official name: Repubblika Federali tal-Ġermanja'
]);
fixEn('adj-ġermaniża', ['German (feminine singular)']);

// ---- Usage examples (key = lowercase entry id) ----
const EXAMPLES = {};
function addEx(idOrHw, examples) {
  EXAMPLES[idOrHw.toLowerCase()] = examples;
}
addEx('ġennien', [
  { mt: 'Il-ġennien jieħu ħsieb il-ward fil-ġnien.', en: 'The gardener tends the roses in the garden.' },
  { mt: 'Il-ġennien qala\' l-ħaxix mill-art.', en: 'The gardener picked the vegetables from the ground.' }
]);
addEx('ġenoċidju', [
  { mt: 'Il-ġenoċidju huwa wieħed mill-agħar reati kontra l-umanità.', en: 'Genocide is one of the worst crimes against humanity.' },
  { mt: 'Il-qorti kkundannat lil dawk responsabbli għall-ġenoċidju.', en: 'The court convicted those responsible for the genocide.' }
]);
addEx('ġens', [
  { mt: 'Il-ġens Malti għandu storja twila ta\' kultura u tradizzjonijiet.', en: 'The Maltese people have a long history of culture and traditions.' },
  { mt: 'Il-ġens jista\' jkun maskili jew femminili.', en: 'Gender can be masculine or feminine.' },
  { mt: 'Il-ġens huwa l-ogħla rank fil-klassifikazzjoni tassonomika.', en: 'The genus is the highest rank in taxonomic classification.' }
]);
addEx('ġeografija', [
  { mt: 'Il-ġeografija tistudja l-muntanji, ix-xmajjar u l-ibħra.', en: 'Geography studies mountains, rivers and seas.' },
  { mt: 'It-tifel tiegħi qed jitgħallem il-ġeografija fl-iskola.', en: 'My son is learning geography at school.' }
]);
addEx('ġeografikament', [
  { mt: 'Ġeografikament, Malta tinsab fin-nofs tal-Baħar Mediterran.', en: 'Geographically, Malta is located in the middle of the Mediterranean Sea.' }
]);
addEx('ġeografiku', [
  { mt: 'Il-pożizzjoni ġeografika ta\' Malta hija strateġika.', en: 'Malta\'s geographic position is strategic.' }
]);
addEx('ġeografu', [
  { mt: 'Il-ġeografu ppublika mappa ġdida tar-reġjun.', en: 'The geographer published a new map of the region.' },
  { mt: 'Ħafna ġeografi jistudjaw l-effetti tat-tibdil fil-klima.', en: 'Many geographers study the effects of climate change.' }
]);
addEx('ġeometra', [
  { mt: 'Il-ġeometra kejjel l-art għall-bini l-ġdid.', en: 'The surveyor measured the land for the new building.' }
]);
addEx('ġeometrija', [
  { mt: 'Il-ġeometrija hija waħda mill-eqdem fergħat tal-matematika.', en: 'Geometry is one of the oldest branches of mathematics.' },
  { mt: 'It-tfal jitgħallmu l-ġeometrija bażika fl-iskola primarja.', en: 'Children learn basic geometry in primary school.' }
]);
addEx('ġeometrikament', [
  { mt: 'Il-kwadru huwa forma ġeometrikament perfetta.', en: 'The square is a geometrically perfect shape.' }
]);
addEx('ġeometriku', [
  { mt: 'It-tpinġija turi forom ġeometriċi bħal ċrieki u trijangoli.', en: 'The drawing shows geometric shapes like circles and triangles.' }
]);
addEx('ġeometru', [
  { mt: 'Il-ġeometru uża formula biex ikkalkula l-erja taċ-ċirku.', en: 'The geometer used a formula to calculate the area of the circle.' }
]);
addEx('ġera', [
  { mt: 'It-tifel ġera malajr lejn l-iskola.', en: 'The boy ran quickly towards school.' },
  { mt: 'L-ilma ġera mill-vit bis-sħiħ.', en: 'The water flowed from the tap at full force.' },
  { mt: 'X\'ġara lbieraħ fil-laqgħa?', en: 'What happened yesterday at the meeting?' }
]);
addEx('ġeraħ', [
  { mt: 'Il-ġellied ġeraħ lil sieħbu bis-sejf.', en: 'The fighter wounded his companion with the sword.' },
  { mt: 'Huwa ġeraħ idejh waqt li kien jaħdem mal-ħġieġ.', en: 'He injured his hand while working with glass.' }
]);
addEx('ġergħa', [
  { mt: 'Xrob l-ilma b\'ġergħa waħda.', en: 'I drank the water in one gulp.' },
  { mt: 'Ġergħa ilma kiesħa kienet biżżejjed biex tirkupra.', en: 'A gulp of cold water was enough to recover.' }
]);
addEx('adj-ġermaniż', [
  { mt: 'Il-karozzi Ġermaniżi huma magħrufa għall-kwalità tagħhom.', en: 'German cars are known for their quality.' }
]);
addEx('n-ġermaniż', [
  { mt: 'Il-Ġermaniżi huma magħrufa għall-puntwalità tagħhom.', en: 'Germans are known for their punctuality.' },
  { mt: 'Il-Ġermaniż huwa l-lingwa uffiċjali tal-Ġermanja, tal-Awstrija u tal-Iżvizzera.', en: 'German is the official language of Germany, Austria and Switzerland.' }
]);
addEx('adj-ġermaniża', [
  { mt: 'Il-kultura Ġermaniża hija sinjura fl-istorja.', en: 'German culture is rich in history.' }
]);
addEx('n-ġermaniża', [
  { mt: 'Iltaqa\' ma\' Ġermaniża waqt il-vaganza tiegħu.', en: 'He met a German woman during his holiday.' }
]);
addEx('ġermanja', [
  { mt: 'Il-Ġermanja hija l-ikbar ekonomija fl-Ewropa.', en: 'Germany is the largest economy in Europe.' },
  { mt: 'Żort Berlin, il-kapitali tal-Ġermanja, is-sena l-oħra.', en: 'I visited Berlin, the capital of Germany, last year.' }
]);
addEx('ġermanju', [
  { mt: 'Il-ġermanju jintuża fil-manifattura ta\' transisters.', en: 'Germanium is used in the manufacture of transistors.' }
]);
addEx('ġerra', [
  { mt: 'Il-bidwi ġerra ż-żiemel madwar ir-razzett.', en: 'The farmer made the horse run around the farm.' },
  { mt: 'Huwa ġerra l-karozza tiegħu tul l-awtostrada.', en: 'He drove his car fast along the motorway.' }
]);
addEx('ġerragħ', [
  { mt: 'Wara l-ikel, huwa ġerragħ kollox sew.', en: 'After the meal, he digested everything well.' },
  { mt: 'Ma nistax niġerragħ iktar din l-umiljazzjoni.', en: 'I cannot bear this humiliation any longer.' }
]);

function processEntry(raw) {
  const obj = JSON.parse(raw);

  // Remove _scratchpad
  delete obj._scratchpad;

  const entry = obj.entry || obj;
  const hw = entry.headword;
  const id = entry.id || (entry.pos ? `${entry.pos}-${hw}` : `n-${hw}`);
  const idLower = id.toLowerCase();
  const hwLower = hw.toLowerCase();
  const defs = entry.definitions;

  // 1. Fix text_en (lookup by entry id lowercase)
  if (FIXED_EN[idLower]) {
    const fixed = FIXED_EN[idLower];
    if (Array.isArray(fixed)) {
      defs.forEach((d, i) => {
        if (i < fixed.length) {
          d.text_en = fixed[i];
        }
      });
    } else if (typeof fixed === 'string') {
      if (defs.length > 0) defs[0].text_en = fixed;
    }
  }

  // 2. Fill text_mt (lookup by entry id lowercase, then headword lowercase)
  let mtDefs = MT_DEFS[idLower] || MT_DEFS[hwLower];

  if (mtDefs) {
    // Remove semicolons from MT definitions
    const cleanMt = mtDefs.map(s => s.replace(/;\s*/g, '. ').replace(/\.\s*\./g, '.').trim());

    // If more MT defs than existing defs, add new def entries
    if (cleanMt.length > defs.length) {
      for (let i = defs.length; i < cleanMt.length; i++) {
        defs.push({
          text_en: '',
          text_mt: null,
          register: '',
          nuance: ''
        });
      }
    }

    cleanMt.forEach((mt, i) => {
      if (i < defs.length) {
        defs[i].text_mt = mt;
      }
    });
  }

  // 3. No semicolons in text_en or text_mt
  defs.forEach(d => {
    if (d.text_en && d.text_en.includes(';')) {
      d.text_en = d.text_en.replace(/;/g, '.');
    }
    if (d.text_mt && d.text_mt.includes(';')) {
      d.text_mt = d.text_mt.replace(/;/g, '.');
    }
  });

  // 4. Validate tags
  if (obj.tags) {
    const originalTagCount = obj.tags.length;
    obj.tags = obj.tags.filter(t => {
      const tagName = typeof t === 'string' ? t : (t.name || t.id.replace(/^tag-/, ''));

      // Must be in approved list
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

      return true;
    });
  }

  // Also clean entry_tags
  if (obj.entry_tags) {
    const validTagIds = new Set((obj.tags || []).map(t => t.id));
    obj.entry_tags = obj.entry_tags.filter(et => validTagIds.has(et.tag_id));
  }

  // 5. Add usage examples (lookup by id lowercase, then headword lowercase)
  let examples = EXAMPLES[idLower] || EXAMPLES[hwLower];
  if (examples) {
    entry.usage_examples = examples.map(ex => ({
      maltese: ex.mt,
      english: ex.en
    }));
  }

  return JSON.stringify(obj);
}

// ---- Main ----
let fileContent = fs.readFileSync(INPUT, 'utf-8');
if (fileContent.charCodeAt(0) === 0xFEFF) {
  fileContent = fileContent.slice(1);
}
const lines = fileContent.split('\n').filter(l => l.trim());
const results = [];
const stats = { total: lines.length, modified: 0, errors: 0 };

for (const line of lines) {
  try {
    const processed = processEntry(line);
    results.push(processed);
    stats.modified++;
  } catch (err) {
    console.error(`Error processing line: ${err.message}`);
    stats.errors++;
    results.push(line);
  }
}

const outDir = path.dirname(OUTPUT);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT, results.join('\n') + '\n', 'utf-8');
console.log(JSON.stringify(stats, null, 2));
