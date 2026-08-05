// Batch 001 Refinement Script
// Processes batch_001.jsonl -> refined/batch_001.jsonl
// Run with: node refine_001.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputFile = path.join(__dirname, 'batch_001.jsonl');
const outputFile = path.join(__dirname, 'refined', 'batch_001.jsonl');

// Approved tags list
const APPROVED_TAGS = new Set([
  "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
  "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
  "vulgar", "euphemistic", "figurative", "pejorative", "childish",
  "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
  "sea", "botany", "geography", "food", "commerce", "family", "physics",
  "war", "law", "mathematics", "medicine", "music", "politics", "religion",
  "crafts", "sports", "technology", "weather", "transport", "time",
]);

// ---- MALTESE DEFINITIONS (text_mt) per entry + definition index ----
// Genus + Differentia structure, no headword or variants
const TEXT_MT = {};
TEXT_MT["v-afda"] = [
  "Jemmen li xi ħadd huwa onest, affidabbli u veritier.",
  "Jagħti xi ħaġa importanti lil xi ħadd biex iħaresha u jieħu ħsiebha.",
  "Ma jagħtix kas jew attenzjoni biżżejjed għal dak li qed jagħmel.",
];
TEXT_MT["prep-f"] = [
  "Ġewwa xi post, ħaġa jew sitwazzjoni; jindika l-konfini ta’ spazju.",
];
TEXT_MT["n-fabbiżonju"] = [
  "Oġġetti mqiegħda fuq palċisġeniku biex joħolqu xenarju u jżejnu l-ispettaklu.",
];
TEXT_MT["adj-fabbli"] = [
  "Ġentili, edukat u pjaċevoli fl-imġiba ma’ ħaddieħor.",
];
TEXT_MT["n-fabbrika"] = [
  "Bini jew faċilità kbira fejn isiru prodotti permezz ta’ makkinarju u ħaddiema.",
];
TEXT_MT["adj-fabbrikabbli"] = [
  "Li jista’ jsir jew jiġi prodott permezz ta’ proċess industrijali.",
];
TEXT_MT["n-fabbrikant"] = [
  "Persuna jew kumpanija li tipproduċi oġġetti bl-imnut permezz ta’ makkinarju.",
];
TEXT_MT["n-fabbrikazzjoni"] = [
  "Il-proċess ta’ produzzjoni ta’ oġġetti permezz ta’ makkinarju u ħaddiema.",
];
TEXT_MT["n-fabrika"] = [
  "Bini jew faċilità kbira fejn isiru prodotti permezz ta’ makkinarju u ħaddiema.",
];
TEXT_MT["v-fada"] = [
  "Jemmen li xi ħadd huwa onest, affidabbli u veritier.",
  "Jagħti xi ħaġa importanti lil xi ħadd biex iħaresha u jieħu ħsiebha.",
  "Ma jagħtix kas jew attenzjoni biżżejjed għal dak li qed jagħmel.",
];
TEXT_MT["n-fadal"] = [
  "Dħul finanzjarju li jibqa’ wara li jitnaqqsu l-ispejjeż u t-taxxi.",
];
TEXT_MT["v-fadal"] = [
  "Jibqa’ wara li jittieħed, jintuża jew jitqassam il-bqija.",
];
TEXT_MT["v-faga"] = [
  "Jagħfas il-ġerżuma ta’ xi ħadd biex iwaqqfu milli jieħu n-nifs.",
];
TEXT_MT["n-fagozz"] = [
  "Tip ta’ mina tal-art antikwata li tisplodi meta timxi fuqha.",
];
TEXT_MT["n-fagħal"] = [
  "Attività li persuna tagħmel biex taqla’ l-għajxien jew timla’ l-ħin.",
];
TEXT_MT["v-fagħal"] = [
  "Iwettaq xi azzjoni, kompitu jew attività.",
];
TEXT_MT["v-fajjar"] = [
  "Jitfa’ xi ħaġa b’saħħa u vjolenza.",
  "Jgħid kliem spjaċevoli jew offensiv b’rabja lejn xi ħadd.",
];
TEXT_MT["n-fajl"] = [
  "Għodda tal-kartolerija użata biex iżżomm dokumenti flimkien b’mod organizzat.",
  "Ġabra ta’ dokumenti u informazzjoni organizzati taħt kategorija waħda.",
];
TEXT_MT["v-fakar"] = [
  "Iżomm stampa jew informazzjoni fil-memorja u jsejjaħha lura meta jkollu bżonn.",
];
TEXT_MT["v-fakkar"] = [
  "Iġiegħel lil xi ħadd jiftakar xi ħaġa li kien insejha.",
];
TEXT_MT["n-fakkin"] = [
  "Persuna li tbigħ il-frott u l-ħxejjex f’ħanut jew fis-suq.",
  "Persuna li ġġorr tagħbija għal ħaddieħor bi ħlas, speċjalment fl-ajruporti.",
];
TEXT_MT["n-faktotu"] = [
  "Persuna li tagħmel varjetà kbira ta’ xogħlijiet u ħidmiet differenti.",
];
TEXT_MT["n-faktotum"] = [
  "Persuna li tagħmel varjetà kbira ta’ xogħlijiet u ħidmiet differenti.",
];
TEXT_MT["n-fakultà"] = [
  "Divizjoni akkademika ta’ università li tispeċjalizza f’qasam partikolari ta’ studju.",
];
TEXT_MT["n-falkett"] = [
  "Għasfur tal-priża żgħir li jtajjar malajr ħafna u jiekol insetti u għasafar żgħar.",
];

// ---- USAGE EXAMPLES per entry ----
const USAGE_EXAMPLES = {};
USAGE_EXAMPLES["v-afda"] = [
  { mt: "Jekk tafda fija, ma tiddispjaċikx.", en: "If you trust in me, you will not regret it." },
  { mt: "Afda l-ġwejjed tiegħu lil sieħbu qabel siefer.", en: "He entrusted his belongings to his friend before travelling." },
  { mt: "Tafdax f’kull min jiltaqa’ miegħek.", en: "Do not trust everyone you meet." },
];
USAGE_EXAMPLES["prep-f"] = [
  { mt: "Il-ktieb hu f’borża ħdejn il-bieb.", en: "The book is in a bag by the door." },
  { mt: "Jgħix f’dar kbira ħdejn il-baħar.", en: "He lives in a big house near the sea." },
];
USAGE_EXAMPLES["n-fabbiżonju"] = [
  { mt: "Il-fabbiżonju fuq il-palk kien jinkludi siġġu u mejda.", en: "The props on the stage included a chair and a table." },
  { mt: "F’daqqa waħda, il-fabbiżonju waqa’ waqt l-ispettaklu.", en: "Suddenly, one of the props fell down during the performance." },
];
USAGE_EXAMPLES["adj-fabbli"] = [
  { mt: "Il-ġar il-ġdid huwa raġel fabbli ħafna.", en: "The new neighbour is a very affable man." },
  { mt: "B’daqshekk fabbli, ma setgħux ma jħobbuhx.", en: "He was so affable that they could not help but like him." },
];
USAGE_EXAMPLES["n-fabbrika"] = [
  { mt: "Il-fabbrika l-ġdida tiftaħ il-ġimgħa d-dieħla.", en: "The new factory opens next week." },
  { mt: "Jaħdem f’fabbrika tal-ħwejjeġ barra l-belt.", en: "He works in a clothing factory outside the city." },
];
USAGE_EXAMPLES["adj-fabbrikabbli"] = [
  { mt: "Dan id-disinn huwa fabbrikabbli bi prezz baxx.", en: "This design is manufacturable at a low cost." },
  { mt: "Il-materjal il-ġdid huwa faċilment fabbrikabbli.", en: "The new material is easily manufacturable." },
];
USAGE_EXAMPLES["n-fabbrikant"] = [
  { mt: "Il-fabbrikant tal-karozzi ħabbar mudell ġdid.", en: "The car manufacturer announced a new model." },
  { mt: "Bħala fabbrikant, irid jiżgura l-kwalità tal-prodotti.", en: "As a manufacturer, he must ensure the quality of the products." },
];
USAGE_EXAMPLES["n-fabbrikazzjoni"] = [
  { mt: "Il-fabbrikazzjoni tal-azzar hija proċess kumpless.", en: "The manufacturing of steel is a complex process." },
  { mt: "Għadna kemm bdejna l-fabbrikazzjoni tal-prodott il-ġdid.", en: "We have just started the manufacturing of the new product." },
];
USAGE_EXAMPLES["n-fabrika"] = [
  { mt: "Din il-fabrika tipproduċi ħafna prodotti tal-ikel.", en: "This factory produces many food products." },
  { mt: "Fetaħ fabrika ġdida fiż-żona industrijali.", en: "He opened a new factory in the industrial zone." },
];
USAGE_EXAMPLES["v-fada"] = [
  { mt: "Fada f’Alla u ma qtux qalbu.", en: "He trusted in God and did not lose heart." },
  { mt: "Fada lil bintu ma’ oħtu meta kellu jivvjaġġa.", en: "He entrusted his daughter to his sister when he had to travel." },
];
USAGE_EXAMPLES["n-fadal"] = [
  { mt: "Il-fadal ta’ din is-sena kien tajjeb ħafna.", en: "The profit of this year was very good." },
  { mt: "Jinvesti l-fadal kollu f’negozju ġdid.", en: "He invests all the profit in a new business." },
];
USAGE_EXAMPLES["v-fadal"] = [
  { mt: "Fadal ftit ħobż fuq il-mejda.", en: "A little bread was left on the table." },
  { mt: "Jekk jifdal flus, nixtru rigal.", en: "If there is money left over, we will buy a gift." },
];
USAGE_EXAMPLES["v-faga"] = [
  { mt: "Faga lill-għadu sakemm tilef minn sensih.", en: "He choked the enemy until he lost consciousness." },
  { mt: "Kważi faga lilu nnifsu bil-kejbil.", en: "He almost strangled himself with the cable." },
];
USAGE_EXAMPLES["n-fagozz"] = [
  { mt: "Is-suldati skoprew fagozz moħbi fit-triq.", en: "The soldiers discovered a fougasse hidden in the road." },
  { mt: "Iż-żona kienet mimlija fagozzi u nases oħra.", en: "The area was full of fougasses and other traps." },
];
USAGE_EXAMPLES["n-fagħal"] = [
  { mt: "Il-fagħal tiegħu huwa l-biedja.", en: "His occupation is farming." },
  { mt: "X’inhu l-fagħal tiegħek?", en: "What is your occupation?" },
];
USAGE_EXAMPLES["v-fagħal"] = [
  { mt: "Kulħadd għandu jagħmel sehemu fix-xogħol.", en: "Everyone must do their part in the work." },
  { mt: "Fagħal dan il-kompitu b’attenzjoni kbira.", en: "He did this task with great care." },
];
USAGE_EXAMPLES["v-fajjar"] = [
  { mt: "Fajjar il-ballun ‘il bogħod b’saħħa.", en: "He hurled the ball far away with force." },
  { mt: "Beda jfajjar kliem iebes lejn il-ġurnalisti.", en: "He started hurling harsh words at the journalists." },
];
USAGE_EXAMPLES["n-fajl"] = [
  { mt: "Poġġi d-dokumenti fil-fajl fuq l-ixkaffa.", en: "Put the documents in the file on the shelf." },
  { mt: "Għandi bżonn fajl ġdid għall-korrispondenza.", en: "I need a new file for the correspondence." },
  { mt: "Ftaħ fajl elettroniku għal kull klijent.", en: "Open an electronic file for each client." },
];
USAGE_EXAMPLES["v-fakar"] = [
  { mt: "Fakar fil-ġrajjiet ta’ żmien twil ilu.", en: "He remembered the events of long ago." },
];
USAGE_EXAMPLES["v-fakkar"] = [
  { mt: "Fakkartu biex jixtri l-ħalib.", en: "I reminded him to buy the milk." },
  { mt: "Il-vuċi tiegħu fakkritni f’missieri.", en: "His voice reminded me of my father." },
];
USAGE_EXAMPLES["n-fakkin"] = [
  { mt: "Il-fakkin tal-ħaxix għandu frott frisk illum.", en: "The greengrocer has fresh fruit today." },
  { mt: "Iċ-ċorma nġarrbet minn fakkin fl-ajruport.", en: "The luggage was carried by a porter at the airport." },
  { mt: "Il-fakkin fi Triq ir-Repubblika jbigħ l-aqwa tadam.", en: "The greengrocer in Republic Street sells the best tomatoes." },
];
USAGE_EXAMPLES["n-faktotu"] = [
  { mt: "Jaħdem bħala faktotu fl-uffiċċju u jagħmel kollox.", en: "He works as a factotum in the office and does everything." },
];
USAGE_EXAMPLES["n-faktotum"] = [
  { mt: "Il-faktotum tal-lukanda jieħu ħsieb il-bżonnijiet kollha tal-mistednin.", en: "The hotel factotum takes care of all the guests’ needs." },
  { mt: "Għandna bżonn faktotum li jaf jagħmel kollox.", en: "We need a factotum who knows how to do everything." },
];
USAGE_EXAMPLES["n-fakultà"] = [
  { mt: "Il-Fakultà tal-Lingwi tinsab fil-biswit tal-università.", en: "The Faculty of Languages is located next to the university." },
  { mt: "Irreġistra fil-Fakultà tal-Mediċina sena ilu.", en: "He enrolled in the Faculty of Medicine a year ago." },
];
USAGE_EXAMPLES["n-falkett"] = [
  { mt: "Il-falkett huwa għasfur tal-priża rari f’Malta.", en: "The Eurasian hobby is a rare bird of prey in Malta." },
  { mt: "Rajna falkett jtajjar fuq l-għelieqi.", en: "We saw a Eurasian hobby flying over the fields." },
];

// ---- ADDITIONAL TAGS per entry ----
const ADDITIONAL_TAGS = {};
ADDITIONAL_TAGS["n-fagozz"] = ["war"];
ADDITIONAL_TAGS["n-falkett"] = ["animals"];

// ---- MAIN PROCESSING ----
const input = fs.readFileSync(inputFile, "utf-8");
const lines = input.trim().split("\n").filter(l => l.trim());

let entriesProcessed = 0;
let textMtFilled = 0;
let usageExamplesGenerated = 0;

const outputLines = [];

for (const line of lines) {
  const obj = JSON.parse(line);
  const entry = obj.entry;
  const entryId = entry.id;

  // 1. Remove _scratchpad
  delete obj._scratchpad;

  // 2. Fill text_mt where null
  const mtDefs = TEXT_MT[entryId] || [];
  if (entry.definitions) {
    for (let i = 0; i < entry.definitions.length; i++) {
      const def = entry.definitions[i];
      if (def.text_mt === null && mtDefs[i]) {
        def.text_mt = mtDefs[i];
        textMtFilled++;
      }
    }
  }

  // 3. Fill usage examples
  const examples = USAGE_EXAMPLES[entryId] || [];
  if (examples.length > 0) {
    entry.usage_examples = examples;
    usageExamplesGenerated += examples.length;
  }

  // 4. Tag validation - remove non-approved tags
  if (obj.tags) {
    obj.tags = obj.tags.filter(t => APPROVED_TAGS.has(t.name));
  }
  if (obj.entry_tags && entry.id) {
    const tagIdsToRemove = new Set();
    for (const et of obj.entry_tags) {
      const tagObj = obj.tags.find(t => t.id === et.tag_id);
      if (!tagObj) {
        const tagName = et.tag_id.replace("tag-", "");
        if (!APPROVED_TAGS.has(tagName)) {
          tagIdsToRemove.add(et.tag_id);
        }
      }
    }
    obj.entry_tags = obj.entry_tags.filter(et => !tagIdsToRemove.has(et.tag_id));
  }

  // 5. Add additional tags
  const extraTagNames = ADDITIONAL_TAGS[entryId] || [];
  for (const tagName of extraTagNames) {
    const existing = obj.tags.find(t => t.name === tagName);
    if (!existing) {
      const tagId = `tag-${tagName}`;
      obj.tags.push({
        id: tagId,
        name: tagName,
        category: "Usage",
        description: null,
      });
      obj.entry_tags.push({
        entry_id: entry.id,
        tag_id: tagId,
      });
    }
  }

  // 6. Check for semicolons in text_en (split if needed)
  if (entry.definitions) {
    const newDefs = [];
    for (const def of entry.definitions) {
      if (def.text_en && def.text_en.includes(";")) {
        const enParts = def.text_en.split(";").map(s => s.trim()).filter(s => s);
        const mtParts = def.text_mt ? def.text_mt.split(";").map(s => s.trim()).filter(s => s) : [];
        for (let i = 0; i < enParts.length; i++) {
          newDefs.push({
            text_en: enParts[i],
            text_mt: mtParts[i] || null,
            register: def.register || "",
            nuance: def.nuance || "",
          });
        }
      } else {
        newDefs.push(def);
      }
    }
    entry.definitions = newDefs;
  }

  outputLines.push(JSON.stringify(obj));
  entriesProcessed++;
}

// Write output
fs.writeFileSync(outputFile, outputLines.join("\n") + "\n", "utf-8");

console.log(`Entries processed: ${entriesProcessed}`);
console.log(`text_mt fields filled: ${textMtFilled}`);
console.log(`Usage examples generated: ${usageExamplesGenerated}`);
