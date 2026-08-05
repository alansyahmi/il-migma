import fs from 'fs';
import path from 'path';

const inputPath = 'c:/Projects/il-migma/wiktionary-scraper/_g_batches/batch_035.jsonl';
const outputPath = 'c:/Projects/il-migma/wiktionary-scraper/_g_batches/refined/batch_035.jsonl';

const approvedTags = new Set([
  'common', 'rare', 'archaic', 'neologism', 'purist', 'formal', 'literary',
  'colloquial', 'obsolete', 'technical', 'dialectal', 'gozitan', 'slang',
  'vulgar', 'euphemistic', 'figurative', 'pejorative', 'childish', 'agriculture',
  'anatomy', 'animals', 'architecture', 'art', 'astronomy', 'sea', 'botany',
  'geography', 'food', 'commerce', 'family', 'physics', 'war', 'law',
  'mathematics', 'medicine', 'music', 'politics', 'religion', 'crafts',
  'sports', 'technology', 'weather', 'transport', 'time'
]);

// Pre-defined Maltese definitions keyed by headword|pos or headword
const mtDefMap = {};

function setMt(headword, pos, defs) {
  const key = pos ? `${headword}|${pos}` : headword;
  mtDefMap[key] = defs;
}

// --- Maltese Definitions ---

// n-ġometra (geometer)
setMt('ġometra', 'noun', [
  'Ġeometru.'
]);

// n-ġometrija (geometry)
setMt('ġometrija', 'noun', [
  'Fergħa tal-matematika li tistudja l-punti, il-linji, il-forom u l-ispazji.'
]);

// adv-ġometrikament (geometrically)
setMt('ġometrikament', 'adverb', [
  'B\'mod ġometriku.'
]);

// adj-ġometriku (geometric)
setMt('ġometriku', 'adjective', [
  'Li għandu x\'jaqsam mal-ġometrija.'
]);

// n-ġommar (European fan palm; broom) – alternative spelling of ġummar
setMt('ġommar', 'noun', [
  'Ortografija alternattiva ta\' \'ġummar\': siġra żgħira tal-palm (Chamaerops humilis).',
  'Ortografija alternattiva ta\' \'ġummar\': għodda tad-dar użata għat-tindif tal-art.'
]);

// n-ġonta (extra piece)
setMt('ġonta', 'noun', [
  'Biċċa żejda jew żieda ma\' xi ħaġa.'
]);

// n-ġonġol (jingle bell) – alternative spelling of ġolġol
setMt('ġonġol', 'noun', [
  'Ortografija alternattiva ta\' \'ġolġol\': qanpiena żgħira li ċċempel.'
]);

// n-Ġordan (Jordan – country and river)
setMt('Ġordan', 'noun', [
  'Pajjiż fil-Lvant Nofsani, fil-Punent tal-Asja. Isem uffiċjali: Renju Ħaxemita tal-Ġordan.',
  'Xmara fil-Lvant Nofsani li tgħaddi fil-Baħar il-Mejjet, u tgħaddi mill-Iżrael, mill-Għolja tal-Golan, mix-Xatt tal-Punent u mill-Ġordan.'
]);

// n-ġorf (giant) – alternative spelling of ġolf
setMt('ġorf', 'noun', [
  'Ortografija alternattiva ta\' \'ġolf\': ġgant.'
]);

// n-ġorġina (dahlia)
setMt('ġorġina', 'noun', [
  'Pjanta tal-ġeneru Dahlia, bi fjuri kkuluriti u zbong.'
]);

// adj-Ġorġjan (Georgian – adjective)
setMt('Ġorġjan', 'adjective', [
  'Li għandu x\'jaqsam mal-Ġeorġja, in-nies tagħha, jew il-lingwa tagħha.'
]);

// n-Ġorġjan (Georgian – person)
setMt('Ġorġjan', 'noun', [
  'Persuna mill-Ġeorġja.',
  'Il-lingwa uffiċjali tal-Ġeorġja.'
]);

// n-ġostra (joust)
setMt('ġostra', 'noun', [
  'Ġostra bejn żewġ kavallieri liebsa l-armatura.'
]);

// n-ġove (Jupiter – planet)
setMt('Ġove', 'noun', [
  'Pjaneta l-akbar fis-sistema solari.'
]);

// n-ġrajja (event)
setMt('ġrajja', 'noun', [
  'Avveniment.',
  'Dak li jiġri.',
  'Xi ħaġa li sseħħ.'
]);

// n-ġrigħ (swallowing, digesting)
setMt('ġrigħ', 'noun', [
  'Azzjoni tal-belgħa.',
  'Id-diġestjoni.'
]);

// n-ġriħ (wounding) – verbal noun of ġeraħ
setMt('ġriħ', 'noun', [
  'Ġrieħi: nom verbali ta\' \'ġeraħ\'.'
]);

// n-Ġuba (Juba)
setMt('Ġuba', 'noun', [
  'Belt kapitali tal-Janub is-Sudan.'
]);

// n-ġubban (cheesemonger)
setMt('ġubban', 'noun', [
  'Persuna li tbigħ il-ġobon.'
]);

// n-ġublew (jubilee)
setMt('ġublew', 'noun', [
  'Festa jew ċelebrazzjoni ta\' anniversarju importanti, speċjalment ħamsin sena.'
]);

// n-Ġudaiżmu (Judaism)
setMt('Ġudaiżmu', 'noun', [
  'Reliġjon Lhudija bbażata fuq it-Torah u t-tradizzjonijiet tal-poplu Lhudi.'
]);

// adj-ġudikabbli (justiciable, triable)
setMt('ġudikabbli', 'adjective', [
  'Li jista\' jiġi ġġudikat minn qorti.'
]);

// adj-ġudikant (judging)
setMt('ġudikant', 'adjective', [
  'Li jiġġudika.'
]);

// n-ġudikatur (adjudicator, judger)
setMt('ġudikatur', 'noun', [
  'Persuna li taġixxi bħala mħallef f\'kompetizzjoni jew tilwima.'
]);

// n-ġudikatura (judiciary; female adjucator)
setMt('ġudikatura', 'noun', [
  'Il-korp ta\' mħallfin f\'pajjiż.',
  'Femminil ta\' \'ġudikatur\'.'
]);

// --- Usage Examples keyed by entry ID ---
const examplesMap = {
  'n-ġometra': [
    { mt: 'Il-ġometra kejjel l-angoli kollha tal-forma ġeometrika.', en: 'The geometer measured all the angles of the geometric shape.' },
    { mt: 'Ewlidi kien ġometra rinomat li kiteb bosta kotba.', en: 'Euclid was a renowned geometer who wrote many books.' }
  ],
  'n-ġometrija': [
    { mt: 'Il-ġometrija hija waħda mill-fergħat fundamentali tal-matematika.', en: 'Geometry is one of the fundamental branches of mathematics.' },
    { mt: 'Tgħallimna l-ġometrija Ewklidja fl-iskola sekondarja.', en: 'We learned Euclidean geometry in secondary school.' }
  ],
  'adv-ġometrikament': [
    { mt: 'Il-problema ġiet solvuta ġometrikament.', en: 'The problem was solved geometrically.' },
    { mt: 'Din il-forma tista\' tiġi deskritta ġometrikament.', en: 'This shape can be described geometrically.' }
  ],
  'adj-ġometriku': [
    { mt: 'Id-disinn kellu forom ġometriċi differenti.', en: 'The design had different geometric shapes.' },
    { mt: 'Il-problema ġometrika kienet diffiċli ħafna għall-istudenti.', en: 'The geometric problem was very difficult for the students.' }
  ],
  'n-ġommar': [
    { mt: 'Il-ġommar jikber selvaġġ fil-veġetazzjoni Maltija.', en: 'The European fan palm grows wild in Maltese vegetation.' },
    { mt: 'Uża l-ġommar biex tiknes l-art tal-kċina.', en: 'Use the broom to sweep the kitchen floor.' }
  ],
  'n-ġonta': [
    { mt: 'Ippruvajt inżid ġonta oħra mal-kejbil biex nasal sa fejn ridt.', en: 'I tried adding another extra piece to the cable to reach where I wanted.' },
    { mt: 'Il-ġonta fil-ħajt kienet tidher ċara wara ż-żebgħa.', en: 'The extra piece in the wall was clearly visible after the paint.' }
  ],
  'n-ġonġol': [
    { mt: 'Iċ-ċekċik tal-ġonġol instema\' mill-bogħod.', en: 'The jingle of the little bell was heard from afar.' },
    { mt: 'Mal-wasla tiegħu, il-qniepen żgħar bħal ġonġol bdew idoqqu.', en: 'Upon his arrival, the small bells like jingle bells began to ring.' }
  ],
  'n-ġordan': [
    { mt: 'Il-Ġordan huwa pajjiż fil-Lvant Nofsani mal-fruntiera tal-Palestina.', en: 'Jordan is a country in the Middle East on the border with Palestine.' },
    { mt: 'Ix-xmara Ġordan tgħaddi fil-Baħar il-Mejjet.', en: 'The Jordan River flows into the Dead Sea.' }
  ],
  'n-ġorf': [
    { mt: 'Kien raġel ta\' bini ġgantesk, kważi ġorf minn ħrafa.', en: 'He was a man of gigantic build, almost a giant from a legend.' },
    { mt: 'Il-ġorfa kienu jgħixu fil-muntanji skond l-istejjer antiki.', en: 'Giants used to live in the mountains according to ancient stories.' }
  ],
  'n-ġorġina': [
    { mt: 'Il-ġorġini jiffjorixxu fl-aħħar tas-sajf u l-ħarifa.', en: 'Dahlias bloom in late summer and autumn.' },
    { mt: 'Pjantajt diversi ġorġini fil-ġnien warajna.', en: 'I planted several dahlias in the garden behind us.' }
  ],
  'adj-ġorġjan': [
    { mt: 'Il-lingwa Ġorġjana għandha l-alfabett uniku tagħha.', en: 'The Georgian language has its own unique alphabet.' },
    { mt: 'L-arkitettura Ġorġjana hija rikonoxxuta mad-dinja kollha.', en: 'Georgian architecture is recognised worldwide.' }
  ],
  'n-ġorġjan': [
    { mt: 'Il-Ġorġjani huma magħrufa għall-ospitalità sħuna tagħhom.', en: 'Georgians are known for their warm hospitality.' },
    { mt: 'Il-Ġorġjan huwa l-lingwa uffiċjali tal-Ġeorġja.', en: 'Georgian is the official language of Georgia.' }
  ],
  'n-ġostra': [
    { mt: 'Il-ġostra kienet spettaklu popolari fil-Medju Evu.', en: 'Jousting was a popular spectacle in the Middle Ages.' },
    { mt: 'Iż-żewġ kavallieri ltaqgħu f\'ġostra qawwija.', en: 'The two knights met in a powerful joust.' }
  ],
  'n-ġove': [
    { mt: 'Il-Ġove hija l-akbar pjaneta fis-sistema solari tagħna.', en: 'Jupiter is the largest planet in our solar system.' },
    { mt: 'Il-Ġove għandha ħafna qamar, inkluż il-qamar il-kbir Ganimede.', en: 'Jupiter has many moons, including the large moon Ganymede.' }
  ],
  'n-ġrajja': [
    { mt: 'Dik kienet ġrajja importanti fl-istorja ta\' Malta.', en: 'That was an important event in the history of Malta.' },
    { mt: 'Ma nistax niftakar kull ġrajja li ġrat dakinhar.', en: 'I cannot remember every occurrence that happened that day.' }
  ],
  'n-ġrigħ': [
    { mt: 'Il-ġrigħ tal-ikel huwa proċess importanti għas-saħħa.', en: 'Swallowing food is an important process for health.' },
    { mt: 'Il-ġrigħ huwa l-ewwel pass fid-diġestjoni.', en: 'Swallowing is the first step in digestion.' }
  ],
  'n-ġriħ': [
    { mt: 'Il-ġriħ jista\' jkun perikoluż jekk ma jiġix ikkurat.', en: 'Wounding can be dangerous if left untreated.' },
    { mt: 'Il-ġriħ ta\' ġismu kien jeħtieġ kura immedjata.', en: 'The wounding of his body required immediate treatment.' }
  ],
  'n-ġuba': [
    { mt: 'Il-Ġuba tinsab fuq ix-xmara Nila l-Bajda.', en: 'Juba is located on the White Nile river.' },
    { mt: 'Il-Ġuba saret il-kapitali tal-Janub is-Sudan fl-2011.', en: 'Juba became the capital of South Sudan in 2011.' }
  ],
  'n-ġubban': [
    { mt: 'Il-ġubban mar is-suq biex ibigħ il-ġobon frisk.', en: 'The cheesemonger went to the market to sell fresh cheese.' },
    { mt: 'Il-ġubbana kienet magħrufa għall-ġobon tan-nagħaġ li kienet tagħmel.', en: 'The cheesemonger was known for the sheep\'s cheese she made.' }
  ],
  'n-ġublew': [
    { mt: 'Il-familja ċċelebrat il-ġublew tal-ħamsin sena taż-żwieġ.', en: 'The family celebrated the golden jubilee of their marriage.' },
    { mt: 'Il-ġublew kien okkażjoni ta\' ferħ u ċelebrazzjoni kbira.', en: 'The jubilee was an occasion of great joy and celebration.' }
  ],
  'n-ġudaiżmu': [
    { mt: 'Il-Ġudaiżmu huwa reliġjon monoteista antika.', en: 'Judaism is an ancient monotheistic religion.' },
    { mt: 'Il-Ġudaiżmu għandu l-għeruq tiegħu fil-Lvant Nofsani.', en: 'Judaism has its roots in the Middle East.' }
  ],
  'adj-ġudikabbli': [
    { mt: 'Il-każ kien ġudikabbli fil-qorti ċivili.', en: 'The case was justiciable in the civil court.' },
    { mt: 'Mhux kull tilwima hija ġudikabbli.', en: 'Not every dispute is triable.' }
  ],
  'adj-ġudikant': [
    { mt: 'Il-bord ġudikant ta s-sentenza finali.', en: 'The judging panel delivered the final sentence.' },
    { mt: 'Il-korp ġudikant kellu jiddeċiedi dwar il-każ diffiċli.', en: 'The judging body had to decide on the difficult case.' }
  ],
  'n-ġudikatur': [
    { mt: 'Il-ġudikatur iddeċieda favur ir-rikorrent.', en: 'The adjudicator decided in favour of the applicant.' },
    { mt: 'Il-ġudikaturi kienu imparzjali fil-ġudizzju tagħhom.', en: 'The adjudicators were impartial in their judgment.' }
  ],
  'n-ġudikatura': [
    { mt: 'Il-ġudikatura hija waħda mit-tliet fergħat tal-istat.', en: 'The judiciary is one of the three branches of the state.' },
    { mt: 'Il-ġudikatura għandha s-setgħa li tinterpreta l-liġi.', en: 'The judiciary has the power to interpret the law.' }
  ]
};

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const rawText = fs.readFileSync(inputPath, 'utf-8');
// Strip BOM if present
const cleaned = rawText.charCodeAt(0) === 0xFEFF ? rawText.slice(1) : rawText;
const lines = cleaned.split('\n').filter(l => l.trim());

let stats = { total: 0, textMtFilled: 0, examplesAdded: 0, tagsRemoved: 0, textEnFixed: 0 };
const outputLines = [];

for (const line of lines) {
  const record = JSON.parse(line);

  // Task 3: Delete _scratchpad
  delete record._scratchpad;

  const entry = record.entry;

  // Determine lookup key
  const lookupKey = entry.pos ? `${entry.headword}|${entry.pos}` : entry.headword;

  // Task 1: Fill text_mt
  const mtDefs = mtDefMap[lookupKey] || mtDefMap[entry.headword];
  if (mtDefs && entry.definitions) {
    for (let i = 0; i < entry.definitions.length; i++) {
      if (entry.definitions[i].text_mt === null && mtDefs[i] !== undefined) {
        entry.definitions[i].text_mt = mtDefs[i];
        stats.textMtFilled++;
      }
    }
  }

  // Task 5: Check for semicolons in text_en and fix broken parentheses
  const newDefs = [];
  if (entry.definitions) {
    let definitionsChanged = false;

    // Fix: merge broken parentheses across adjacent definitions
    const mergedDefs = [];
    for (let i = 0; i < entry.definitions.length; i++) {
      const def = entry.definitions[i];
      // Special case: Ġordan entry has a definition broken across two objects
      if (entry.headword === 'Ġordan' && def.text_en && def.text_en.startsWith('official name:')) {
        if (mergedDefs.length > 0) {
          const prev = mergedDefs[mergedDefs.length - 1];
          const openInPrev = (prev.text_en.match(/\(/g) || []).length;
          const closeInPrev = (prev.text_en.match(/\)/g) || []).length;
          if (openInPrev > closeInPrev) {
            prev.text_en = prev.text_en.replace(/\(?\s*$/, '').trim() + ', officially the Hashemite Kingdom of Jordan)';
            definitionsChanged = true;
            continue;
          }
        }
      }

      mergedDefs.push({ ...def });
    }

    // Special case: n-Ġorġjan should have two definitions (person + language) like n-gallegjan
    if (entry.headword === 'Ġorġjan' && entry.pos === 'noun' && mergedDefs.length === 1) {
      mergedDefs.push({
        text_en: 'Georgian (language)',
        text_mt: 'Il-lingwa uffiċjali tal-Ġeorġja.',
        register: '',
        nuance: ''
      });
      definitionsChanged = true;
    }

    for (const def of mergedDefs) {
      if (def.text_en && def.text_en.includes(';')) {
        definitionsChanged = true;
        const parts = def.text_en.split(';').map(s => s.trim()).filter(s => s);
        for (const part of parts) {
          newDefs.push({
            text_en: part.charAt(0).toUpperCase() + part.slice(1),
            text_mt: null,
            register: def.register || '',
            nuance: def.nuance || ''
          });
        }
      } else {
        newDefs.push({ ...def });
      }
    }
    if (definitionsChanged) {
      entry.definitions = newDefs;
      stats.textEnFixed++;
      // Re-fill text_mt for modified definitions
      if (mtDefs) {
        for (let i = 0; i < entry.definitions.length; i++) {
          if (entry.definitions[i].text_mt === null && mtDefs[i] !== undefined) {
            entry.definitions[i].text_mt = mtDefs[i];
          }
        }
      }
    }
  }

  // Task 2: Add usage examples
  const exArray = examplesMap[entry.id];
  if (exArray && (!entry.usage_examples || entry.usage_examples.length === 0)) {
    entry.usage_examples = exArray.map(ex => ({
      text_mt: ex.mt,
      text_en: ex.en,
      register: '',
      nuance: '',
      source: null
    }));
    stats.examplesAdded += exArray.length;
  }

  // Task 4: Tag validation — remove tags not in approved list
  const validTagIds = new Set();
  const validTags = [];

  if (record.tags) {
    for (const tag of record.tags) {
      if (approvedTags.has(tag.name)) {
        validTagIds.add(tag.id);
        validTags.push(tag);
      } else {
        stats.tagsRemoved++;
      }
    }
  }
  record.tags = validTags;

  if (record.entry_tags) {
    record.entry_tags = record.entry_tags.filter(et => validTagIds.has(et.tag_id));
  }

  stats.total++;
  outputLines.push(JSON.stringify(record));
}

fs.writeFileSync(outputPath, outputLines.join('\n') + '\n', 'utf-8');

console.log('=== Refinement Complete ===');
console.log(`Total entries processed: ${stats.total}`);
console.log(`text_mt fields filled: ${stats.textMtFilled}`);
console.log(`Usage examples added: ${stats.examplesAdded}`);
console.log(`Non-approved tags removed: ${stats.tagsRemoved}`);
console.log(`text_en definitions fixed: ${stats.textEnFixed}`);
console.log(`Output: ${outputPath}`);
