
import { createClient } from '@libsql/client';
import { ensureNounMorphologyTable } from './src/lib/nounMorphology.ts';
import { ensureAdjMorphologyTable } from './src/lib/adjMorphology.ts';
import { ensureVerbMorphologyTable } from './src/lib/verbMorphology.js';
import { ensureParticipleMorphologyTable } from './src/lib/participleMorphology.ts';
import { ensureNumeralMorphologyTable } from './src/lib/numeralMorphology.ts';
import { ensureTagsTable } from './src/lib/entryTags.ts';
import { ensureEntryRelationshipsTable } from './src/lib/entryRelationships.ts';
import { ensureAlternativeFormsTable } from './src/lib/alternativeForms.ts';
import { ensureExampleSentencesTable } from './src/lib/exampleSentences.ts';
import { ensureStemsTable } from './src/lib/stemMorphology.ts';

async function main() {
    const client = createClient({ url: 'file:local.db' });
    
    console.log("Ensuring morphology tables...");
    await ensureNounMorphologyTable(client);
    await ensureAdjMorphologyTable(client);
    await ensureVerbMorphologyTable(client);
    await ensureParticipleMorphologyTable(client);
    await ensureNumeralMorphologyTable(client);
    
    console.log("Ensuring relational tables...");
    await ensureTagsTable(client);
    await ensureEntryRelationshipsTable(client);
    await ensureAlternativeFormsTable(client);
    await ensureExampleSentencesTable(client);
    await ensureStemsTable(client);
    
    console.log("All tables ensured.");
}

main().catch(console.error);
