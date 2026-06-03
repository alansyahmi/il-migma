import sys
from urllib.parse import quote
import re

sys.path.append('scripts')
from scrape_wiktionary_maltese_a import lookup_glosbe_definition

print(f"Testing Glosbe for 'abbatia' (Latin):")
res = lookup_glosbe_definition('Latin', 'abbātia')
print(f"Result: {res}")

print(f"\nTesting Glosbe for 'arsella' (Italian):")
res = lookup_glosbe_definition('Italian', 'arsella')
print(f"Result: {res}")
