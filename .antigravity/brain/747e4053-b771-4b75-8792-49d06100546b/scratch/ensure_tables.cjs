const { createClient } = require('@libsql/client');
const { ensureNounMorphologyTable } = require('./src/lib/nounMorphology.cjs');
const { ensureAdjMorphologyTable } = require('./src/lib/adjMorphology.cjs');

const url = 'file:local.db';
const client = createClient({ url });

async function run() {
    console.log('Ensuring noun morphology table...');
    await ensureNounMorphologyTable(client);
    console.log('Ensuring adjective morphology table...');
    await ensureAdjMorphologyTable(client);
    console.log('Done.');
    process.exit(0);
}

run();
