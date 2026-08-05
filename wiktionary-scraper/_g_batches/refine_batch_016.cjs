const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, 'batch_016.jsonl');
const OUTPUT = path.resolve(__dirname, 'refined', 'batch_016.jsonl');

const APPROVED_TAGS = new Set([
  'common', 'rare', 'archaic', 'neologism', 'purist', 'formal', 'literary',
  'colloquial', 'obsolete', 'technical', 'dialectal', 'gozitan', 'slang',
  'vulgar', 'euphemistic', 'figurative', 'pejorative', 'childish',
  'agriculture', 'anatomy', 'animals', 'architecture', 'art', 'astronomy',
  'sea', 'botany', 'geography', 'food', 'commerce', 'family', 'physics',
  'war', 'law', 'mathematics', 'medicine', 'music', 'politics', 'religion',
  'crafts', 'sports', 'technology', 'weather', 'transport', 'time',
  'astrology', 'alternative-form'
]);

// ---- Maltese definitions (Oxford Maltese style, capitalised, no circularity) ----
const MT_DEFS = {
  'għaraq': [
    'Għaraq: likwidu mielaħ li l-ġisem joħroġ mill-ġilda meta wieħed ikun qed jaħdem iebes, ikollu deni, jew ikun nervuż'
  ],
  'Għarb': [
    'Għarb: villaġġ u kunsill lokali fir-Reġjun ta\' Għawdex, Malta'
  ],
  'għarbel': [
    'Għarbel: għadda xi ħaġa minn għarbiel biex ifred il-partiċelli fini minn dawk oħxon',
    'Għarbel: fittex bir-reqqa u eżamina għal difetti jew impuritajiet',
    'Għarbel: eżamina b\'mod sistematiku u dettaljat',
    'Għarbel: għamel eżami kritiku ta\' xi ħaġa',
    'Għarbel: staqsa lil xi ħadd bosta mistoqsijiet biex jikseb informazzjoni',
    'Għarbel: eżamina lil xi ħadd b\'mistoqsijiet ripetuti'
  ],
  'Għarbi': null, // handled per POS
  'għarbiel': [
    'Għarbiel: għodda magħmula minn xibka mwaħħla ma\' qafas, użata biex tifred il-partiċelli fini minn dawk oħxon',
    'Għarbiel: eżami dettaljat u bir-reqqa ta\' xi ħaġa'
  ],
  'għaref': [
    'Għaref: li għandu fehim profond u esperjenza kbira, għaqli'
  ],
  'għarfien': [
    'Għarfien: dak li wieħed jaf dwar xi ħaġa, informazzjoni u ħiliet miksuba permezz ta\' esperjenza jew edukazzjoni',
    'Għarfien: kuxjenza tal-eżistenza, tal-importanza jew tal-identità ta\' xi ħaġa',
    'Għarfien: l-azzjoni ta\' min jagħraf jew jidentifika xi ħaġa wara li jkun raha jew semgħet jitkellem dwarha'
  ],
  'għargħar': null, // handled per POS
  'Għargħuri': [
    'Għargħuri: ta\' minn, jew relatat ma\' Għargħur'
  ],
  'għarib': null, // handled per POS
  'għariem': [
    'Għariem: ta\' lewn skur u kemmxejn kannella skur, ta\' kulur mudlama'
  ],
  'għarik': [
    'Għarik: l-azzjoni ta\' min jgħorok'
  ],
  'għarix': [
    'Għarix: binja żgħira u sempliċi, ġeneralment magħmula mill-injam jew mill-qasab, użata bħala kenn'
  ],
  'għarma': [
    'Għarma: ammont ta\' xi ħaġa mġemgħet flimkien, munzell',
    'Għarma: munzell ta\' ramel magħmul mir-riħ, ġeneralment ħdejn il-baħar'
  ],
  'għarnuq': [
    'Għarnuq: għasfur għoli b\'saqajn u għonq twal, ta\' lewn griż jew abjad, tal-familja Gruidae'
  ],
  'għarqab': [
    'Għarqab: ta daqqiet ta\' saqajh mal-art bil-qawwa, ġeneralment bi rabja jew bi biki'
  ],
  'għarqan': [
    'Għarqan: mgħotti bl-għaraq, mimli għaraq'
  ],
  'għarqeb': [
    'Għarqeb: ta daqqiet ta\' saqajh mal-art bil-qawwa, ġeneralment bi rabja jew bi biki'
  ],
  'Għarqub': [
    'Għarqub: grupp ta\' kwiekeb fil-forma ta\' skorpjun, viżibbli mis-sema',
    'Għarqub: is-sinjal taż-żodijaku assoċjat mal-perjodu bejn tlieta u għoxrin ta\' Ottubru u wieħed u għoxrin ta\' Novembru'
  ],
  'għarqun': [
    'Għarqun: ortografija alternattiva ta\' għarnuq, għasfur għoli b\'saqajn u għonq twal'
  ],
  'għarr': [
    'Għarr: li għandu natura ħażina, malizzjuż'
  ],
  'għarraf': [
    'Għarraf: wassal informazzjoni lil xi ħadd, għamel xi ħaġa magħrufa lil ħaddieħor',
    'Għarraf: għamel lil xi ħadd jaf xi ħaġa',
    'Għarraf: kixef sigriet jew informazzjoni moħbija'
  ]
};

// Per-POS overrides for headwords with multiple POS entries
const MT_DEFS_BY_POS = {
  'Għarbi': {
    'adjective': [
      'Għarbi: tal-Arabja jew tal-poplu Għarbi, relatat mal-kultura, mal-lingwa jew man-nies Għarab'
    ],
    'noun': [
      'Għarbi: persuna mill-poplu Għarbi, bin il-poplu Għarbi',
      'Għarbi: il-lingwa mitkellma mill-Għarab'
    ]
  },
  'għarib': {
    'adjective': [
      'Għarib: li hu minn pajjiż ieħor, barrani',
      'Għarib: li mhuwiex tas-soltu, stramb u mhux familjari'
    ],
    'noun': [
      'Għarib: persuna minn pajjiż ieħor, barrani'
    ]
  },
  'għargħar': {
    'noun': [
      'Għargħar: ammont kbir ta\' ilma li jgħatti art li normalment tkun niexfa',
      'Għargħar: siġra indiġena ta\' Malta li tagħti reżina aromatika, Tetraclinis articulata'
    ],
    'verb': [
      'Għargħar: mgħatta b\'ammont kbir ta\' ilma, għereq bl-ilma',
      'Għargħar: għamel ħoss bħal ta\' ilma li jgħaddi minn ġo flixkun'
    ]
  },
  'għarqun': {
    'noun': [
      'Għarqun: ortografija alternattiva ta\' għarnuq'
    ]
  }
};

// ---- Usage examples ----
const EXAMPLES = {
  'għaraq': [
    { mt: 'Kien mgħotti bl-għaraq wara li ġera għal siegħa.', en: 'He was covered in sweat after running for an hour.' },
    { mt: 'L-għaraq niżel minn fuq wiċċu waqt li kien jaħdem fil-kampanja.', en: 'Sweat dripped from his face while he worked in the fields.' },
    { mt: 'L-għaraq jgħin biex il-ġisem iżomm it-temperatura tiegħu.', en: 'Sweat helps the body maintain its temperature.' }
  ],
  'Għarb': [
    { mt: 'Għarb huwa wieħed mill-isbaħ villaġġi f\'Għawdex.', en: 'Għarb is one of the most beautiful villages in Gozo.' },
    { mt: 'Immur Għarb biex nara l-Madonna tat-Ta\' Pinu.', en: 'I go to Għarb to see the Ta\' Pinu Basilica.' }
  ],
  'għarbel': [
    { mt: 'Ommi għarblet id-dqiq qabel ma għamlet il-ħobż.', en: 'My mother sifted the flour before making the bread.' },
    { mt: 'Il-pulizija għarblet l-evidenza kollha biex issib il-ħati.', en: 'The police examined all the evidence to find the culprit.' },
    { mt: 'Għarbilna bosta mistoqsijiet qabel ma ħallewna nidħlu.', en: 'They riddled us with questions before letting us enter.' }
  ],
  'Għarbi': {
    'adjective': [
      { mt: 'Il-lingwa Għarbija hija waħda mill-eqdem lingwi fid-dinja.', en: 'The Arabic language is one of the oldest languages in the world.' },
      { mt: 'Il-kċina Għarbija għandha ħafna togħmiet Delicious.', en: 'Arabic cuisine has many delicious flavours.' }
    ],
    'noun': [
      { mt: 'Ħafna Għarab jgħixu f\'Malta u jaħdmu f\'diversi oqsma.', en: 'Many Arabs live in Malta and work in various fields.' },
      { mt: 'Qed nitgħallem nitkellem bl-Għarbi.', en: 'I am learning to speak Arabic.' }
    ]
  },
  'għarbiel': [
    { mt: 'Użajt l-għarbiel biex infred il-qamħ mit-tiben.', en: 'I used the sieve to separate the wheat from the straw.' },
    { mt: 'Wara għarbiel bir-reqqa, sabu l-iżball fir-rapport.', en: 'After a careful check, they found the error in the report.' }
  ],
  'għaref': [
    { mt: 'Raġel għaref jaf meta jżomm kliemu għalih.', en: 'A wise man knows when to keep his words to himself.' },
    { mt: 'Hija mara għarfa li dejjem tagħti pariri siewja.', en: 'She is a wise woman who always gives valuable advice.' }
  ],
  'għarfien': [
    { mt: 'L-għarfien huwa l-bażi ta\' kull soċjetà progressiva.', en: 'Knowledge is the foundation of every progressive society.' },
    { mt: 'Huwa wera għarfien kbir tal-istorja Maltija.', en: 'He showed great knowledge of Maltese history.' },
    { mt: 'L-għarfien tal-periklu wasal tard wisq.', en: 'The awareness of the danger came too late.' }
  ],
  'għargħar': {
    'noun': [
      { mt: 'L-għargħar għereq ir-raba\' kollu fil-wied.', en: 'The flood submerged all the fields in the valley.' },
      { mt: 'L-għargħar huwa siġra indiġena ta\' Malta.', en: 'The sandarac tree is a native tree of Malta.' }
    ],
    'verb': [
      { mt: 'Ix-xita qawwija għargħret it-toroq tal-belt.', en: 'The heavy rain flooded the streets of the city.' },
      { mt: 'L-ilma għargħar fil-flixkun hekk kif tbattilna.', en: 'The water gurgled in the bottle as we emptied it.' }
    ]
  },
  'Għargħuri': [
    { mt: 'Il-kejk Għargħuri huwa famuż f\'Malta kollha.', en: 'The Għargħuri cake is famous throughout Malta.' },
    { mt: 'Huma Għargħurin minn żmien twil ilu.', en: 'They have been from Għargħur for a long time.' }
  ],
  'għarib': {
    'adjective': [
      { mt: 'Raġel għarib resaq lejna fit-triq.', en: 'A strange man approached us in the street.' },
      { mt: 'Din l-imġieba hija għariba u mhux tas-soltu.', en: 'This behaviour is odd and unusual.' }
    ],
    'noun': [
      { mt: 'Kull għarib li jasal fir-raħal jingħata merħba sħuna.', en: 'Every stranger who arrives in the village is given a warm welcome.' },
      { mt: 'Huwa ħassu għarib f\'art barranija.', en: 'He felt like a stranger in a foreign land.' }
    ]
  },
  'għariem': [
    { mt: 'L-irġiel kollha fil-festa libsu libsa ħamra u għariema.', en: 'All the men at the festival wore red and dark-skinned costumes.' }
  ],
  'għarik': [
    { mt: 'L-għarik tal-ġilda kkawżalu ħmura.', en: 'The rubbing of the skin caused him redness.' }
  ],
  'għarix': [
    { mt: 'Il-bidwi jorqod fl-għarix waqt l-istaġun tal-ħsad.', en: 'The farmer sleeps in the hut during the harvest season.' },
    { mt: 'Bnejna għarix mal-baħar bl-injam u l-qasab.', en: 'We built a cottage by the sea with wood and reeds.' }
  ],
  'għarma': [
    { mt: 'Il-ħaddiema għamlu għarma ta\' ġebel fil-ġnien.', en: 'The workers made a pile of stones in the garden.' },
    { mt: 'L-għaram tar-ramel testiċċaw matul is-snin.', en: 'The sand dunes shifted over the years.' }
  ],
  'għarnuq': [
    { mt: 'L-għarnuq jgħix fil-mistagħdra u jiekol il-ħut u ż-żgħar annimali.', en: 'The crane lives in wetlands and eats fish and small animals.' },
    { mt: 'Rajna grupp ta\' għerienaq jtiru lejn in-nofsinhar.', en: 'We saw a group of cranes flying south.' }
  ],
  'għarqab': [
    { mt: 'It-tifel għarqab b\'saqajh mal-art għax kien irrabjat.', en: 'The boy stamped his feet on the ground because he was angry.' }
  ],
  'għarqan': [
    { mt: 'Kont għarqan kollni wara li tlajt it-taraġ kollu.', en: 'I was soaking with sweat after climbing all the stairs.' },
    { mt: 'Wara l-isports, kien għarqan u għajjien.', en: 'After sport, he was sweaty and tired.' }
  ],
  'għarqeb': [
    { mt: 'Il-pubbliku għarqeb b\'saqajh biex juri l-apprezzament tiegħu.', en: 'The audience stamped their feet to show their appreciation.' }
  ],
  'Għarqub': [
    { mt: 'L-Għarqub huwa wieħed mill-kostellazzjonijiet l-aktar magħrufa.', en: 'Scorpius is one of the best-known constellations.' },
    { mt: 'In-nies immexxijin mill-Għarqub huma magħrufa bħala passjonati.', en: 'People ruled by Scorpio are known as passionate.' }
  ],
  'għarqun': [
    { mt: 'Għarqun huwa kitba differenti ta\' għarnuq.', en: 'Għarqun is a different spelling of għarnuq.' }
  ],
  'għarr': [
    { mt: 'Raġel għarr ma jħossux ħasra għal ħadd.', en: 'A wicked man feels no pity for anyone.' }
  ],
  'għarraf': [
    { mt: 'Għarrafni meta tasal biex niġi nilqagħek.', en: 'Let me know when you arrive so I can pick you up.' },
    { mt: 'Il-ministru għarraf lill-pubbliku bil-pjanijiet il-ġodda.', en: 'The minister informed the public about the new plans.' },
    { mt: 'Fl-aħħar għarraf il-verità wara ħafna snin ta\' mistoqsijiet.', en: 'Finally disclosed the truth after many years of questions.' }
  ]
};

// ---- Fixes for text_en ----
const FIXED_EN = {
  'għarik': [
    'verbal noun of għorok: the act of rubbing or chafing'
  ]
};

function getMtDefs(entry) {
  const hw = entry.headword;
  const pos = entry.pos;

  // Check for per-POS override first
  if (MT_DEFS_BY_POS[hw] && MT_DEFS_BY_POS[hw][pos]) {
    return MT_DEFS_BY_POS[hw][pos];
  }

  // Check for main MT_DEFS
  if (MT_DEFS[hw]) {
    return MT_DEFS[hw];
  }

  return null;
}

function getExamples(entry) {
  const hw = entry.headword;
  const pos = entry.pos;

  if (EXAMPLES[hw] && !Array.isArray(EXAMPLES[hw])) {
    // Per-POS examples
    return EXAMPLES[hw][pos] || null;
  }

  if (EXAMPLES[hw] && Array.isArray(EXAMPLES[hw])) {
    return EXAMPLES[hw];
  }

  return null;
}

function processEntry(raw, lineNum) {
  const obj = JSON.parse(raw);

  // Remove _scratchpad
  delete obj._scratchpad;

  const entry = obj.entry || obj;
  const hw = entry.headword;
  const defs = entry.definitions;

  // 1. Fix text_en if needed
  if (FIXED_EN[hw]) {
    defs.forEach((d, i) => {
      if (i < FIXED_EN[hw].length) {
        d.text_en = FIXED_EN[hw][i];
      }
    });
  }

  // 2. Fill text_mt
  const mtDefs = getMtDefs(entry);
  if (mtDefs) {
    const cleanMt = mtDefs.map(s => s.replace(/;/g, '. ').replace(/\.\s*\./g, '.').trim());

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

  // 4. Validate tags - remove non-approved and redundant tags
  if (obj.tags) {
    obj.tags = obj.tags.filter(t => {
      const tagName = t.name || t.id;
      const tagId = t.id || '';

      // Extract the actual tag name from tag-id
      const actualName = tagName || tagId.replace(/^tag-/, '');

      if (!APPROVED_TAGS.has(actualName)) {
        return false;
      }

      // Redundancy checks
      if ((actualName === 'noun') && (entry.pos === 'noun')) return false;
      if ((actualName === 'loanword' || actualName === 'loan') && entry.is_loanword === 1) return false;
      if ((actualName === 'feminine' || actualName === 'fem') && entry.gender === 'feminine') return false;
      if ((actualName === 'masculine' || actualName === 'masc') && entry.gender === 'masculine') return false;
      if ((actualName === 'semitic') && entry.root_consonants) return false;

      // No tag for plural if it's not relevant
      if (actualName === 'plural' && (!entry.plural_forms || entry.plural_forms.length === 0)) return false;

      return true;
    });
  }

  // Also clean entry_tags
  if (obj.entry_tags) {
    const validTagIds = new Set((obj.tags || []).map(t => t.id));
    obj.entry_tags = obj.entry_tags.filter(et => validTagIds.has(et.tag_id));
  }

  // 5. Add usage examples
  const examples = getExamples(entry);
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
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const lines = raw.split('\n').filter(l => l.trim());
const results = [];
const stats = { total: lines.length, modified: 0, errors: 0, skipped: 0 };

for (let i = 0; i < lines.length; i++) {
  try {
    const processed = processEntry(lines[i], i + 1);
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
