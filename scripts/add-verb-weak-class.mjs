import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:local.db' });

try {
    await db.execute('ALTER TABLE entries ADD COLUMN verb_weak_class TEXT');
    console.log('✅ Added verb_weak_class column to entries');
} catch (e) {
    if (e.message?.includes('duplicate column')) {
        console.log('ℹ️  verb_weak_class already exists, skipping');
    } else {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    }
}

process.exit(0);
