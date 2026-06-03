import re

rel_pattern = r'(?:Borrowed|Ultimately|Inherited|Derived|From|Cognate|Related|Of|Via|Through)\b(?:\s+(?:from|to|with|of|in))?'
junction_pattern = r'\b(?:and/or|or|and)\b|,'
lang_list = ['Arabic', 'Italian', 'Sicilian', 'Latin']
lang_pattern = '|'.join(lang_list)

term = "abbati and/or Italian abbate"
internal_pattern = fr'\s*({junction_pattern})\s+({lang_pattern})\b\s*(.*)$'
print(f"Pattern: {internal_pattern}")
m = re.search(internal_pattern, term, flags=re.I)
if m:
    print(f"Found: {m.group(1)}, {m.group(2)}, {m.group(3)}")
else:
    print("Not found")
