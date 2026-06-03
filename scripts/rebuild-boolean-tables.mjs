import { createClient } from '@libsql/client';
import fs from 'fs';

const varsFile = '.dev.vars';
let vars = {};
if (fs.existsSync(varsFile)) {
    vars = fs.readFileSync(varsFile, 'utf-8')
        .split('\n')
        .reduce((acc, line) => {
            const [key, ...vals] = line.split('=');
            if (key && vals) acc[key.trim()] = vals.join('=').trim();
            return acc;
        }, {});
}

const target = process.argv[2] || 'local';
const url = target === 'remote' ? vars.TURSO_URL : 'file:local.db';
const authToken = target === 'remote' ? vars.TURSO_AUTH_TOKEN : undefined;

if (!url) {
    console.error(`URL for ${target} missing`);
    process.exit(1);
}

const client = createClient({ url, authToken });

const TABLES = [
    {
        name: 'stems',
        extraConstraints: [],
    },
    {
        name: 'pattern_applicability',
        extraConstraints: [],
    },
    {
        name: 'entries',
        extraConstraints: [
            "CHECK (gender IN ('masculine','feminine','neutral'))",
        ],
    },
    {
        name: 'noun_morphology',
        extraConstraints: [],
    },
    {
        name: 'adj_morphology',
        extraConstraints: [],
    },
    {
        name: 'participle_morphology',
        extraConstraints: [],
    },
    {
        name: 'audio_files',
        extraConstraints: [
            'CHECK (entry_id IS NOT NULL OR subentry_id IS NOT NULL)',
        ],
    },
    {
        name: 'subscriptions',
        extraConstraints: [],
    },
    {
        name: 'api_keys',
        extraConstraints: [],
    },
];

function quoteIdent(name) {
    return `"${String(name).replace(/"/g, '""')}"`;
}

function parseLiteralDefault(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    if (
        /^'.*'$/.test(text) ||
        /^".*"$/.test(text) ||
        /^-?\d+(?:\.\d+)?$/.test(text) ||
        /^\(.*\)$/.test(text) ||
        /^(true|false|null)$/i.test(text)
    ) {
        return text;
    }
    return `(${text})`;
}

function normalizeBoolValueExpr(columnName) {
    const ident = quoteIdent(columnName);
    return `CASE
            WHEN ${ident} IS NULL THEN 0
            WHEN typeof(${ident}) IN ('integer', 'real') THEN CASE WHEN ${ident} = 0 THEN 0 ELSE 1 END
            WHEN lower(trim(CAST(${ident} AS TEXT))) IN ('', '0', '0.0', 'false', 'no', 'off') THEN 0
            ELSE 1
        END`;
}

async function getTableInfo(tableName) {
    const res = await client.execute(`PRAGMA table_info(${quoteIdent(tableName)})`);
    return res.rows;
}

async function getForeignKeys(tableName) {
    const res = await client.execute(`PRAGMA foreign_key_list(${quoteIdent(tableName)})`);
    return res.rows;
}

async function getUniqueConstraints(tableName) {
    const res = await client.execute(`PRAGMA index_list(${quoteIdent(tableName)})`);
    const uniqueConstraints = [];

    for (const row of res.rows) {
        if (!row.unique) continue;
        if (String(row.origin || '') === 'pk') continue;

        const info = await client.execute(`PRAGMA index_info(${quoteIdent(row.name)})`);
        const cols = info.rows
            .slice()
            .sort((a, b) => Number(a.seqno) - Number(b.seqno))
            .map((r) => quoteIdent(r.name))
            .filter(Boolean);

        if (cols.length > 0) {
            uniqueConstraints.push(`UNIQUE (${cols.join(', ')})`);
        }
    }

    return uniqueConstraints;
}

async function getNonUniqueIndexSql(tableName) {
    const list = await client.execute(`PRAGMA index_list(${quoteIdent(tableName)})`);
    const nonUniqueNames = list.rows
        .filter((row) => !row.unique)
        .map((row) => String(row.name))
        .filter(Boolean);

    if (nonUniqueNames.length === 0) return [];

    const placeholders = nonUniqueNames.map(() => '?').join(', ');
    const res = await client.execute({
        sql: `SELECT sql FROM sqlite_master WHERE type = 'index' AND name IN (${placeholders}) AND sql IS NOT NULL`,
        args: nonUniqueNames,
    });

    return res.rows.map((row) => row.sql).filter(Boolean);
}

function buildForeignKeyClauses(foreignKeys) {
    const grouped = new Map();
    for (const fk of foreignKeys) {
        const id = Number(fk.id);
        if (!grouped.has(id)) grouped.set(id, []);
        grouped.get(id).push(fk);
    }

    const clauses = [];
    for (const rows of grouped.values()) {
        if (rows.length !== 1) continue;
        const fk = rows[0];
        const from = quoteIdent(fk.from);
        const to = quoteIdent(fk.to);
        const parts = [`REFERENCES ${quoteIdent(fk.table)}(${to})`];
        if (fk.on_delete && String(fk.on_delete).toUpperCase() !== 'NO ACTION') {
            parts.push(`ON DELETE ${fk.on_delete}`);
        }
        if (fk.on_update && String(fk.on_update).toUpperCase() !== 'NO ACTION') {
            parts.push(`ON UPDATE ${fk.on_update}`);
        }
        clauses.push({ column: String(fk.from), clause: `${from} ${parts.join(' ')}` });
    }

    return clauses;
}

function buildCreateSql(tableName, columns, foreignKeys, uniqueConstraints, extraConstraints) {
    const fkClauses = buildForeignKeyClauses(foreignKeys);
    const fkByColumn = new Map(fkClauses.map((item) => [item.column, item.clause]));

    const columnClauses = columns.map((column) => {
        const name = String(column.name);
        const quotedName = quoteIdent(name);
        const isBool = name.startsWith('is_');
        const type = isBool ? 'BOOLEAN' : (String(column.type || '').trim() || 'TEXT');
        const parts = [quotedName, type];

        if (column.pk) parts.push('PRIMARY KEY');
        if (column.notnull) parts.push('NOT NULL');

        const fkClause = fkByColumn.get(name);
        if (fkClause) {
            parts.push(fkClause.slice(quotedName.length).trim());
        }

        const defaultValue = parseLiteralDefault(column.dflt_value);
        if (isBool) {
            parts.push('DEFAULT false');
        } else if (defaultValue !== null) {
            parts.push(`DEFAULT ${defaultValue}`);
        }

        return parts.join(' ');
    });

    const tableClauses = [...columnClauses, ...uniqueConstraints, ...extraConstraints];
    return `CREATE TABLE ${quoteIdent(`${tableName}_new`)} (\n  ${tableClauses.join(',\n  ')}\n)`;
}

async function rebuildEntriesFts() {
    await client.execute('DROP TRIGGER IF EXISTS entries_ai');
    await client.execute('DROP TRIGGER IF EXISTS entries_ad');
    await client.execute('DROP TRIGGER IF EXISTS entries_au');
    await client.execute('DROP TABLE IF EXISTS entries_fts');
    await client.execute(`CREATE VIRTUAL TABLE entries_fts USING fts5(headword, content='entries', content_rowid='rowid')`);
    await client.execute(`INSERT INTO entries_fts(entries_fts) VALUES('rebuild')`);
    await client.execute(`CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END`);
    await client.execute(`CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); END`);
    await client.execute(`CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN INSERT INTO entries_fts(entries_fts, rowid, headword) VALUES('delete', old.rowid, old.headword); INSERT INTO entries_fts(rowid, headword) VALUES (new.rowid, new.headword); END`);
}

async function rebuildTable(spec) {
    const tableName = spec.name;
    const columns = await getTableInfo(tableName);
    if (columns.length === 0) {
        console.warn(`Skipping ${tableName}: table does not exist.`);
        return;
    }

    const foreignKeys = await getForeignKeys(tableName);
    const uniqueConstraints = await getUniqueConstraints(tableName);
    const indexSql = await getNonUniqueIndexSql(tableName);
    const createSql = buildCreateSql(tableName, columns, foreignKeys, uniqueConstraints, spec.extraConstraints);
    const insertColumns = columns.map((column) => quoteIdent(String(column.name))).join(', ');
    const selectColumns = columns.map((column) => {
        const name = String(column.name);
        if (name.startsWith('is_')) {
            return `${normalizeBoolValueExpr(name)} AS ${quoteIdent(name)}`;
        }
        return quoteIdent(name);
    }).join(', ');
    const newTableName = `${tableName}_new`;

    console.log(`Rebuilding ${tableName}...`);
    await client.execute(`DROP TABLE IF EXISTS ${quoteIdent(newTableName)}`);
    try {
        await client.execute(createSql);
    } catch (err) {
        console.error(`Failed CREATE for ${tableName}:`);
        console.error(createSql);
        throw err;
    }
    await client.execute(`INSERT INTO ${quoteIdent(newTableName)} (${insertColumns}) SELECT ${selectColumns} FROM ${quoteIdent(tableName)}`);
    await client.execute(`DROP TABLE ${quoteIdent(tableName)}`);
    await client.execute(`ALTER TABLE ${quoteIdent(newTableName)} RENAME TO ${quoteIdent(tableName)}`);

    for (const sql of indexSql) {
        await client.execute(sql);
    }

    if (tableName === 'entries') {
        await rebuildEntriesFts();
    }
}

async function verifyTable(spec) {
    const info = await client.execute(`PRAGMA table_info(${quoteIdent(spec.name)})`);
    const mismatches = info.rows
        .filter((row) => String(row.name || '').startsWith('is_'))
        .filter((row) => String(row.type || '').toUpperCase() !== 'BOOLEAN');

    if (mismatches.length > 0) {
        throw new Error(`Boolean normalization failed for ${spec.name}: ${mismatches.map((row) => row.name).join(', ')}`);
    }
}

async function run() {
    console.log(`Rebuilding boolean tables on ${target} (${url})...`);
    await client.execute('PRAGMA foreign_keys = OFF');

    for (const spec of TABLES) {
        await rebuildTable(spec);
    }

    await client.execute('PRAGMA foreign_keys = ON');

    for (const spec of TABLES) {
        await verifyTable(spec);
    }

    console.log('Boolean table rebuild complete.');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
