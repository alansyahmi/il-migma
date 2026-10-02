export const POS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
  'conjunction', 'interjection', 'article', 'particle', 'numeral',
  'participle', 'interrogative', 'suffix',
]);

const LEGACY_FIELDS = {
  verb: [['form', 'verb_form'], ['class', 'verb_class'], ['weak_class', 'verb_weak_class'],
    ['vowel_set_perf', 'verb_vowel_perf'], ['vowel_set_impf', 'verb_vowel_impf'], ['vowel_set_impv', 'verb_vowel_impv']],
};

export function normalizeEntryValue(value) {
  if (value == null) return null;
  const normalized = String(value).normalize('NFC').trim();
  return normalized || null;
}

export function normalizeJsonValue(value) {
  const text = normalizeEntryValue(value);
  if (text == null) return null;
  const parsed = JSON.parse(text);
  return JSON.stringify(parsed);
}

export function buildFormattingPatch(entry) {
  const patch = {};
  for (const field of ['headword', 'pos', 'gender', 'root_consonants', 'stem', 'source_language', 'source_citation', 'source_title', 'source_year', 'source_page', 'source_publisher']) {
    if (!(field in entry)) continue;
    const value = normalizeEntryValue(entry[field]);
    if (value !== (entry[field] ?? null)) patch[field] = value;
  }
  for (const field of ['definitions', 'usage_examples', 'etymology_chain']) {
    if (!(field in entry) || entry[field] == null || entry[field] === '') continue;
    try {
      const normalized = normalizeJsonValue(entry[field]);
      if (normalized !== entry[field]) patch[field] = normalized;
    } catch { /* auditEntry reports malformed JSON; no patch is emitted */ }
  }
  return patch;
}

function issue(code, severity, field, message, extra = {}) {
  return { code, severity, field, message, ...extra };
}

function parseJson(value, field, issues) {
  try {
    return value == null || value === '' ? [] : JSON.parse(value);
  } catch {
    issues.push(issue(`invalid_${field}_json`, 'error', field, `${field} is not valid JSON.`));
    return null;
  }
}

function auditMorphology(entry, issues) {
  const pos = entry.pos;
  const row = entry[`${pos === 'adjective' ? 'adj' : pos}_morphology`];
  if (['verb', 'noun', 'adjective', 'participle', 'numeral'].includes(pos) && !row) {
    issues.push(issue('missing_morphology_row', 'error', `${pos}_morphology`, `No ${pos} morphology row exists.`));
    return;
  }
  if (pos === 'verb') {
    for (const field of ['form', 'class']) {
      if (!normalizeEntryValue(row?.[field])) issues.push(issue(`missing_verb_${field}`, 'warning', field, `Verb ${field} is missing.`));
    }
    if (!normalizeEntryValue(row?.vowel_set_perf) && !normalizeEntryValue(entry.verb_vowel_perf)) {
      issues.push(issue('missing_verb_vowel_set', 'warning', 'vowel_set_perf', 'No perfect vowel set is recorded.'));
    }
  }
  if (pos === 'noun' && !normalizeEntryValue(row?.gender ?? entry.gender)) {
    issues.push(issue('missing_noun_gender', 'warning', 'gender', 'Noun gender is missing.'));
  }
  if (pos === 'numeral' && !normalizeEntryValue(row?.numeral_type)) {
    issues.push(issue('missing_numeral_type', 'warning', 'numeral_type', 'Numeral type is missing.'));
  }
}

function auditConflicts(entry, issues) {
  for (const [canonical, legacy] of LEGACY_FIELDS[entry.pos] || []) {
    const canonicalValue = normalizeEntryValue(entry[`${entry.pos}_morphology`]?.[canonical]);
    const legacyValue = normalizeEntryValue(entry[legacy]);
    if (canonicalValue && legacyValue && canonicalValue !== legacyValue) {
      issues.push(issue('legacy_normalized_conflict', 'warning', canonical,
        `Normalized ${canonical} conflicts with legacy ${legacy}.`, {
          currentValue: canonicalValue, legacyValue,
        }));
    }
  }
}

export function auditEntry(entry) {
  const issues = [];
  const recommendations = entry.engineRecommendations || [];
  if (!normalizeEntryValue(entry.headword)) issues.push(issue('blank_headword', 'error', 'headword', 'Headword is blank.'));
  if (!POS.has(normalizeEntryValue(entry.pos))) issues.push(issue('unsupported_pos', 'error', 'pos', 'POS is missing or unsupported.'));
  const definitions = parseJson(entry.definitions, 'definitions', issues);
  if (Array.isArray(definitions) && !definitions.some((d) => normalizeEntryValue(d?.text_en) || normalizeEntryValue(d?.text_mt))) {
    issues.push(issue('missing_definition', 'warning', 'definitions', 'No meaningful definition is present.'));
  }
  parseJson(entry.usage_examples, 'usage_examples', issues);
  if (entry.etymology_chain) parseJson(entry.etymology_chain, 'etymology_chain', issues);
  auditMorphology(entry, issues);
  auditConflicts(entry, issues);
  for (const relationship of entry.relationships || []) {
    if (['synonym', 'antonym'].includes(relationship.type) && relationship.reciprocal === false) {
      issues.push(issue('non_reciprocal_relationship', 'warning', 'relationships',
        `${relationship.type} relationship is not reciprocal.`, { targetEntryId: relationship.targetEntryId }));
    }
  }
  return {
    entryId: entry.id,
    headword: normalizeEntryValue(entry.headword),
    pos: normalizeEntryValue(entry.pos),
    issues,
    recommendations,
  };
}
