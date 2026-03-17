
import sqlite3
import json

db_path = 'c:/Projects/il-migma/local.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def get_config_all():
    cursor.execute("SELECT category, value FROM configs")
    rows = cursor.fetchall()
    config = {}
    for cat, val_str in rows:
        if cat not in config: config[cat] = set()
        try:
            val = json.loads(val_str)
            if isinstance(val, dict) and 'cv' in val:
                config[cat].add(val['cv'])
            elif isinstance(val, str):
                config[cat].add(val)
        except:
            pass
    return config

def get_db_patterns_table():
    cursor.execute("SELECT cv_notation FROM patterns")
    rows = cursor.fetchall()
    return set(row[0] for row in rows)

def get_actual_usage_patterns():
    columns = [
        'lemma_pattern', 'form_fem_pattern', 'form_masc_pattern',
        'form_plural_pattern', 'dual_pattern', 'diminutive_pattern', 'elative_pattern'
    ]
    usage = set()
    for col in columns:
        cursor.execute(f"SELECT DISTINCT {col} FROM entries WHERE {col} IS NOT NULL AND {col} != ''")
        rows = cursor.fetchall()
        for r in rows: usage.add(r[0])
    return usage

config = get_config_all()
db_patterns = get_db_patterns_table()
usage_patterns = get_actual_usage_patterns()

all_presets = set()
for cat in ['cv_wizen_pattern', 'broken_pattern', 'adjective_pattern']:
    all_presets.update(config.get(cat, set()))

print(f"Total entries in 'patterns' table: {len(db_patterns)}")
print(f"Total presets in 'configs' table (pattern categories): {len(all_presets)}")
print(f"Total patterns actually used in 'entries' (extra columns): {len(usage_patterns)}")

missing_from_presets = db_patterns - all_presets
if missing_from_presets:
    print(f"\nPatterns in 'patterns' table but MISSING from presets: {missing_from_presets}")
else:
    print("\nAll entries in 'patterns' table have matching presets.")

unused_presets = all_presets - db_patterns
if unused_presets:
    print(f"\nPresets that ARE NOT in 'patterns' table: {unused_presets}")

# Check if there are patterns used in entries that aren't in 'patterns' table
missing_from_db_table = usage_patterns - db_patterns
if missing_from_db_table:
    print(f"\nPatterns used in 'entries' but MISSING from 'patterns' table: {missing_from_db_table}")

conn.close()
