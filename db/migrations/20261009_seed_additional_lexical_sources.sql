-- Migration: Seed additional authoritative and frequency lexical sources
-- Date: 2026-10-09
-- Adds src-aquilina-1973, src-1000mcw, src-borg-1978, src-borg-1997, src-brincat-2011 to lexical_sources

INSERT OR IGNORE INTO lexical_sources (id, name, full_title, author, year, publisher, reliability_weight, source_type, url) VALUES
  ('src-aquilina-1973', 'Aquilina 1973',      'Maltese Etymological Glossary (Journal of Maltese Studies 8)', 'Joseph Aquilina',            1973, 'Journal of Maltese Studies (University of Malta)', 0.90, 'academic',      NULL),
  ('src-1000mcw',       '1000 MCW',           '1000 Most Common Maltese Words',                         NULL,                               2020, 'Corpus tal-Malti',                               0.70, 'academic',      NULL),
  ('src-borg-1978',     'Borg 1978',          'Historical Aspects of Maltese Phonology',                'Alexander Borg',                   1978, 'Hebrew University of Jerusalem',                 0.88, 'academic',      NULL),
  ('src-borg-1997',     'Borg & AA 1997',     'Maltese: A Functional Grammar for Students',             'Albert Borg & Marie Azzopardi-Alexander', 1997, 'Routledge',                               0.88, 'academic',      NULL),
  ('src-brincat-2011',  'Brincat 2011',       'Maltese and Other Languages: A Linguistic History of Malta', 'Joseph M. Brincat',           2011, 'Midsea Books',                                   0.90, 'academic',      NULL);
