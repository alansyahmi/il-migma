const ROOT_COMPAT_COLUMNS = [
    { name: 'vowel_set_perf', type: 'TEXT' },
    { name: 'vowel_set_impf', type: 'TEXT' },
    { name: 'vowel_set_imp', type: 'TEXT' },
    { name: 'is_imala_blocked', type: 'BOOLEAN DEFAULT false' },
];

export async function ensureRootCompatibilityColumns(client) {
    const info = await client.execute("PRAGMA table_info(roots)");
    const existing = new Set(info.rows.map((row) => row.name));

    for (const column of ROOT_COMPAT_COLUMNS) {
        if (existing.has(column.name)) continue;
        try {
            await client.execute(`ALTER TABLE roots ADD COLUMN ${column.name} ${column.type}`);
        } catch (error) {
            const message = String(error?.message || error || '').toLowerCase();
            if (!message.includes('duplicate column name') && !message.includes('already exists')) {
                throw error;
            }
        }
    }
}
