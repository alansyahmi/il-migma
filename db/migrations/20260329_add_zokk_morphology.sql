-- Add stem-linked morphology payload for loanword / Zokk entries.
ALTER TABLE entries ADD COLUMN zokk_morphology TEXT;
