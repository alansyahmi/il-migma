-- Migration 008: Alternative Forms Enhancements
-- Support orthographic and variant forms that do not necessarily need separate lemma entries.

ALTER TABLE alternative_forms ADD COLUMN notes TEXT;
ALTER TABLE alternative_forms ADD COLUMN target_entry_id TEXT;

CREATE INDEX IF NOT EXISTS idx_alt_forms_headword ON alternative_forms(headword COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_alt_forms_target ON alternative_forms(target_entry_id);
