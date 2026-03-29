/**
 * scripts/validate_api.mjs
 * Simple validation script to exercise Admin API endpoints.
 * Requires the Pages dev API to be running.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8788/api/admin';
const TOKEN = 'dummy-token-bypass'; // Localhost bypasses Clerk verification

async function testRootAPI() {
    console.log('\n--- Testing Roots API ---');
    const rootData = {
        consonants: 't-s-t',
        strength: 'strong',
        gloss: JSON.stringify([{ en: 'testing', mt: 'jittestja' }]),
        etymology: [],
        tags: ['test', 'validation'],
        synonyms: [{ id: 'k-t-b', headword: 'k-t-b', pos: 'ROOT', gloss_en: 'writing' }]
    };

    // 1. Create
    console.log('1. Creating root t-s-t...');
    const createRes = await fetch(`${BASE_URL}/roots`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(rootData)
    });

    if (createRes.ok) {
        console.log('✅ Root created successfully');
    } else {
        const err = await createRes.text();
        console.error('❌ Root creation failed:', err);
        return;
    }

    // 2. Update
    console.log('2. Updating root t-s-t...');
    const updateRes = await fetch(`${BASE_URL}/roots/t-s-t`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rootData, id: 'root-t-s-t', strength: 'weak' })
    });
    console.log(updateRes.ok ? '✅ Root updated' : '❌ Root update failed');

    // 3. Delete
    console.log('3. Deleting root t-s-t...');
    const delRes = await fetch(`${BASE_URL}/roots?id=root-t-s-t`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    console.log(delRes.ok ? '✅ Root deleted' : '❌ Root delete failed');
}

async function testEntryAPI() {
    console.log('\n--- Testing Entries API ---');
    const entryData = {
        headword: 'testword',
        pos: 'noun',
        gender: 'masculine',
        definitions: [{ text_en: 'a test word', text_mt: 'kelma ta prova' }],
        tags: ['test']
    };

    // 1. Create
    console.log('1. Creating entry testword...');
    const createRes = await fetch(`${BASE_URL}/entries`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
    });

    let createdId = '';
    if (createRes.ok) {
        const json = await createRes.json();
        createdId = json.id;
        console.log('✅ Entry created:', createdId);
    } else {
        const err = await createRes.text();
        console.error('❌ Entry creation failed:', err);
        return;
    }

    // 2. Delete
    console.log('2. Deleting entry:', createdId);
    const delRes = await fetch(`${BASE_URL}/entries?id=${createdId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    console.log(delRes.ok ? '✅ Entry deleted' : '❌ Entry delete failed');
}

async function run() {
    try {
        await testRootAPI();
        await testEntryAPI();
    } catch (e) {
        console.error('Validation script error:', e);
    }
}

run();
