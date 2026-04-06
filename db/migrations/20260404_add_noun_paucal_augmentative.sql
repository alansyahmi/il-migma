-- Migration: add noun paucal and augmentative forms
-- Run with: turso db shell <db-name> < db/migrations/20260404_add_noun_paucal_augmentative.sql

ALTER TABLE entries ADD COLUMN paucal_form TEXT;
ALTER TABLE entries ADD COLUMN augmentative_form TEXT;
ALTER TABLE entries ADD COLUMN paucal_pattern TEXT;
ALTER TABLE entries ADD COLUMN augmentative_pattern TEXT;
