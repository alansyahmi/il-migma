/**
 * SQLite case-folding helpers for Maltese.
 *
 * SQLite/libSQL's built-in LOWER() only folds ASCII A-Z and leaves
 * Maltese capitals (Ċ, Ġ, Ħ, Ż) and accented vowels (À, È, Ì, Ò, Ù) untouched.
 */

const MALTESE_UPPER_TO_LOWER = [
    ['Ċ', 'ċ'],
    ['Ġ', 'ġ'],
    ['Ħ', 'ħ'],
    ['Ż', 'ż'],
    ['À', 'à'],
    ['È', 'è'],
    ['Ì', 'ì'],
    ['Ò', 'ò'],
    ['Ù', 'ù'],
];

/**
 * Lowercase a JS string using full Unicode + NFC normalization to match malteseLowerSql().
 * @param {unknown} value
 * @returns {string}
 */
export function malteseLower(value) {
    return String(value ?? '').normalize('NFC').toLowerCase();
}

/**
 * Wrap a SQLite expression so both ASCII and Maltese non-ASCII uppercase letters are lowercased.
 * @param {string} expr
 * @returns {string}
 */
export function malteseLowerSql(expr) {
    let sql = `LOWER(${expr})`;
    for (const [upper, lower] of MALTESE_UPPER_TO_LOWER) {
        sql = `REPLACE(${sql}, '${upper}', '${lower}')`;
    }
    return sql;
}
