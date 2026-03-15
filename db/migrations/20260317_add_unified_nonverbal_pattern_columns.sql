-- Ensure unified non-verbal pattern placement columns exist on entries.
-- Safe for DBs already migrated away from legacy columns.

ALTER TABLE entries ADD COLUMN vowel_set_opp TEXT;
ALTER TABLE entries ADD COLUMN vowel_set_dual TEXT;
ALTER TABLE entries ADD COLUMN lemma_pattern TEXT;
ALTER TABLE entries ADD COLUMN form_fem_pattern TEXT;
ALTER TABLE entries ADD COLUMN form_masc_pattern TEXT;
ALTER TABLE entries ADD COLUMN form_plural_pattern TEXT;
ALTER TABLE entries ADD COLUMN dual_pattern TEXT;
