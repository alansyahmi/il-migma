
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE IF NOT EXISTS entry_relationships (
    entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    target_entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    PRIMARY KEY (entry_id, target_entry_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS alternative_forms (
    id TEXT PRIMARY KEY,
    entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    headword TEXT NOT NULL,
    type TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS example_sentences (
    id TEXT PRIMARY KEY,
    entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    maltese TEXT NOT NULL,
    english TEXT,
    source TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS stems (
    stem_string TEXT PRIMARY KEY,
    class_type TEXT,
    is_hybrid BOOLEAN DEFAULT false,
    root TEXT,
    agentive_suffix TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
