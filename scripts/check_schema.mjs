import { createClient } from '@libsql/client';

async function check() {
    const c = createClient({ url: 'file:local.db' });
    try {
        const r1 = await c.execute('PRAGMA table_info(patterns)');
        console.log('--- patterns ---');
        console.table(r1.rows);
        
        const r2 = await c.execute('PRAGMA table_info(pattern_applicability)');
        console.log('--- pattern_applicability ---');
        console.table(r2.rows);
    } catch (e) {
        console.error(e);
    } finally {
        c.close();
    }
}
check();
