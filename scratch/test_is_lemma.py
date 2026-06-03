import re

def is_non_lemma_definition(text: str) -> bool:
    if not text:
        return True
    text_clean = text.lower()
    non_lemma_patterns = [
        r'\binflection of\b', r'\bimperative of\b', r'\bperson singular\b',
        r'\bperson plural\b', r'\bperson dual\b', r'\bparticiple of\b',
        r'\bpast participle of\b', r'\bpresent participle of\b',
    ]
    if ':' in text_clean:
        parts = text.split(':', 1)
        if len(parts[1].strip().split()) >= 1:
            return False
    for p in non_lemma_patterns:
        if re.search(p, text_clean):
            return True
    return False

print(f"'second-person...': {is_non_lemma_definition('second-person singular imperative of għaqar')}")
print(f"'alternative form...: abacus': {is_non_lemma_definition('alternative form of abbaku: abacus')}")
