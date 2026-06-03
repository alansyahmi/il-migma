-- Migration: Add missing pattern and vowel set columns to morphology tables
-- Date: 2026-04-27

-- Noun Morphology
ALTER TABLE noun_morphology ADD COLUMN form_plural_pattern TEXT;
ALTER TABLE noun_morphology ADD COLUMN form_fem_pattern TEXT;
ALTER TABLE noun_morphology ADD COLUMN form_masc_pattern TEXT;
ALTER TABLE noun_morphology ADD COLUMN vowel_set_sg TEXT;
ALTER TABLE noun_morphology ADD COLUMN vowel_set_pl TEXT;
ALTER TABLE noun_morphology ADD COLUMN vowel_set_opp TEXT;
ALTER TABLE noun_morphology ADD COLUMN vowel_set_dual TEXT;
ALTER TABLE noun_morphology ADD COLUMN is_inflectable_singular BOOLEAN DEFAULT false;
ALTER TABLE noun_morphology ADD COLUMN is_inflectable_plural BOOLEAN DEFAULT false;

-- Adjective Morphology
ALTER TABLE adj_morphology ADD COLUMN form_plural_pattern TEXT;
ALTER TABLE adj_morphology ADD COLUMN form_fem_pattern TEXT;
ALTER TABLE adj_morphology ADD COLUMN form_masc_pattern TEXT;
ALTER TABLE adj_morphology ADD COLUMN vowel_set_sg TEXT;
ALTER TABLE adj_morphology ADD COLUMN vowel_set_pl TEXT;
ALTER TABLE adj_morphology ADD COLUMN vowel_set_opp TEXT;

-- Participle Morphology
ALTER TABLE participle_morphology ADD COLUMN form_plural_pattern TEXT;
ALTER TABLE participle_morphology ADD COLUMN form_fem_pattern TEXT;
ALTER TABLE participle_morphology ADD COLUMN form_masc_pattern TEXT;

-- Numeral Morphology
ALTER TABLE numeral_morphology ADD COLUMN form_plural_pattern TEXT;
ALTER TABLE numeral_morphology ADD COLUMN form_fem_pattern TEXT;
ALTER TABLE numeral_morphology ADD COLUMN form_masc_pattern TEXT;
ALTER TABLE numeral_morphology ADD COLUMN vowel_set_sg TEXT;
ALTER TABLE numeral_morphology ADD COLUMN vowel_set_pl TEXT;
ALTER TABLE numeral_morphology ADD COLUMN vowel_set_opp TEXT;
ALTER TABLE numeral_morphology ADD COLUMN vowel_set_dual TEXT;
