import { getDbClient } from '../../lib/dbClient.js';
import { ensureNounMorphologyTable } from '../../../src/lib/nounMorphology.ts';
import { ensureAdjMorphologyTable } from '../../../src/lib/adjMorphology.ts';
import { ensureParticipleMorphologyTable } from '../../../src/lib/participleMorphology.ts';
import { ensureNumeralMorphologyTable } from '../../../src/lib/numeralMorphology.ts';
import { ensureVerbMorphologyTable } from '../../../src/lib/verbMorphology.ts';

export async function onRequestPost({ request, env }) {
    try {
        const client = getDbClient(env);
        
        await ensureNounMorphologyTable(client, { backfill: true });
        await ensureAdjMorphologyTable(client, { backfill: true });
        await ensureParticipleMorphologyTable(client, { backfill: true });
        await ensureNumeralMorphologyTable(client, { backfill: true });
        await ensureVerbMorphologyTable(client, { backfill: true });
        
        return new Response(JSON.stringify({ success: true, message: 'Morphology tables synchronized' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
