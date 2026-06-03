-- Migration: Drop legacy etymologies table
-- Date: 2026-04-27
-- Canonical etymology data now lives on `entries.etymology_chain` and `entries.etymology_notes`.
-- This migration removes the old standalone table after data has been migrated.

DROP TABLE IF EXISTS etymologies;
