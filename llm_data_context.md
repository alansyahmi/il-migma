# Database Schema Context

This document contains a token-optimized representation of the database schema for LLM context injection.


Table: attestation_scores


Columns:

- id (TEXT): Primary key
- attestation_id (TEXT): Not null
- source_id (TEXT): Not null
- attested (INTEGER): Not null
- notes (TEXT): 




Table: patterns


Columns:

- id (TEXT): Primary key
- cv_notation (TEXT): Not null
- wizen_notation (TEXT): Not null
- example_word (TEXT): 
- tags (TEXT): 
- created_at (TEXT): Not null
- description (TEXT): 


Relationships:
```text
patterns
 └─ pattern_applicability
 └─ root_pattern_forms
```



Table: root_pattern_forms


Columns:

- id (TEXT): Primary key
- root_id (TEXT): Not null
- pattern_id (TEXT): Not null
- derived_form (TEXT): Not null




Table: subentries


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): Not null
- headword (TEXT): Not null
- pos (TEXT): 
- tags (TEXT): 
- sort_order (INTEGER): Not null


Relationships:
```text
subentries
 └─ audio_files
 └─ phonetics
```



Table: phonetics


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): 
- subentry_id (TEXT): 
- ipa (TEXT): Not null
- dialect (TEXT): 
- notes (TEXT): 




Table: lexical_sources


Columns:

- id (TEXT): Primary key
- name (TEXT): Not null
- full_title (TEXT): Not null
- author (TEXT): 
- year (INTEGER): 
- reliability_weight (REAL): Not null
- source_type (TEXT): Not null
- url (TEXT): 
- publisher (TEXT): 


Relationships:
```text
lexical_sources
 └─ attestation_scores
 └─ entries
   └─ adj_morphology
   └─ alternative_forms
   └─ attestation_reliability
     └─ attestation_scores
   └─ audio_files
   └─ dialect_variants
   └─ entry_relationships
   └─ entry_tags
   └─ phonetics
   └─ subentries
     └─ audio_files
     └─ phonetics
   └─ verb_morphology
```



Table: attestation_reliability


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): Not null
- reliability_index (REAL): Not null
- computed_at (TEXT): Not null


Relationships:
```text
attestation_reliability
 └─ attestation_scores
```



Table: dialect_variants


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): Not null
- region (TEXT): Not null
- variant_form (TEXT): Not null
- notes (TEXT): 




Table: users


Columns:

- id (TEXT): Primary key
- clerk_id (TEXT): Not null
- email (TEXT): Not null
- display_name (TEXT): 
- tier (TEXT): Not null
- ads_disabled (INTEGER): Not null
- audio_unlocked (INTEGER): Not null
- created_at (TEXT): Not null


Relationships:
```text
users
 └─ api_keys
 └─ flashcard_lists
 └─ subscriptions
 └─ suggested_entries
   └─ votes
 └─ votes
```



Table: flashcard_lists


Columns:

- id (TEXT): Primary key
- user_id (TEXT): Not null
- name (TEXT): Not null
- entry_ids (TEXT): Not null
- created_at (TEXT): Not null
- updated_at (TEXT): Not null




Table: suggested_entries


Columns:

- id (TEXT): Primary key
- submitted_by_user_id (TEXT): 
- headword (TEXT): Not null
- notes (TEXT): Not null
- status (TEXT): Not null
- vote_count (INTEGER): Not null
- submitted_at (TEXT): Not null


Relationships:
```text
suggested_entries
 └─ votes
```



Table: votes


Columns:

- id (TEXT): Primary key
- user_id (TEXT): Not null
- suggested_entry_id (TEXT): Not null
- value (INTEGER): Not null
- reason (TEXT): 
- voted_at (TEXT): Not null




Table: blog_posts


Columns:

- id (TEXT): Primary key
- slug (TEXT): Not null
- title (TEXT): Not null
- excerpt (TEXT): 
- content_md (TEXT): Not null
- author (TEXT): Not null
- published_at (TEXT): 
- tags (TEXT): 
- cover_image_url (TEXT): 




Table: admin_config


Columns:

- id (TEXT): Primary key
- category (TEXT): Not null
- key (TEXT): Not null
- value (TEXT): Not null
- sort_order (INTEGER): 
- created_at (TEXT): 
- updated_at (TEXT): 




Table: roots


Columns:

- id (TEXT): Primary key
- consonants (TEXT): Not null
- consonant_array (TEXT): Not null
- notes (TEXT): 
- created_at (TEXT): Not null
- updated_at (TEXT): Not null
- strength (TEXT): 
- weak_class (TEXT): 
- gloss (TEXT): 
- etymology (TEXT): 
- source (TEXT): 
- vowel_set_perf (TEXT): 
- vowel_set_impf (TEXT): 
- vowel_set_imp (TEXT): 
- is_geminate (INTEGER): 
- synonyms (TEXT): 
- antonyms (TEXT): 
- related_entries (TEXT): 
- tags (TEXT): 
- is_imala_blocked (BOOLEAN): 




Table: entry_diminutives


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): Not null
- pos (TEXT): Not null
- gender (TEXT): 
- form (TEXT): Not null
- pattern (TEXT): 
- sort_order (INTEGER): Not null
- is_preferred (INTEGER): Not null
- created_at (TEXT): Not null
- updated_at (TEXT): Not null




Table: site_submissions


Columns:

- id (TEXT): Primary key
- kind (TEXT): Not null
- category (TEXT): Not null
- subject (TEXT): Not null
- email (TEXT): 
- message (TEXT): 
- page_path (TEXT): 
- page_url (TEXT): 
- referer (TEXT): 
- user_agent (TEXT): 
- status (TEXT): Not null
- created_at (TEXT): Not null
- updated_at (TEXT): Not null




Table: suffix_catalog


Columns:

- id (TEXT): Primary key
- kind (TEXT): Not null
- suffix (TEXT): Not null
- label (TEXT): Not null
- sort_order (INTEGER): Not null
- created_at (TEXT): Not null
- updated_at (TEXT): Not null




Table: suffix_catalog_seed_state


Columns:

- id (INTEGER): Primary key
- seeded_at (TEXT): Not null




Table: verb_morphology


Columns:

- entry_id (TEXT): Primary key
- form (TEXT): 
- class (TEXT): 
- weak_class (TEXT): 
- transitivity (TEXT): 
- perfective_3sgm (TEXT): 
- imperfective_3sgm (TEXT): 
- verbal_noun (TEXT): 
- active_participle (TEXT): 
- passive_participle (TEXT): 
- vowel_set_perf (TEXT): 
- vowel_set_impf (TEXT): 
- vowel_set_impv (TEXT): 
- type (TEXT): 
- created_at (TEXT): Not null
- updated_at (TEXT): Not null
- is_imala_blocked (BOOLEAN): 




Table: numeral_morphology


Columns:

- entry_id (TEXT): Primary key
- numeral_type (TEXT): 
- form_attributive_short (TEXT): 
- form_attributive_long (TEXT): 
- ordinal_form (TEXT): 
- adverbial_form (TEXT): 
- fractional_form (TEXT): 
- multiplier_form (TEXT): 
- distributive_form (TEXT): 
- created_at (TEXT): 
- updated_at (TEXT): 
- is_inflectable (TEXT): 
- form_plural_pattern (TEXT): 
- vowel_set_sg (TEXT): 
- vowel_set_pl (TEXT): 
- vowel_set_opp (TEXT): 
- vowel_set_dual (TEXT): 
- plural_forms (TEXT): 
- form_attributive_short_pattern (TEXT): 
- feminine_form (TEXT): 
- masculine_form (TEXT): 




Table: entry_relationships


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): Not null
- target_entry_id (TEXT): Not null
- relationship_type (TEXT): Not null
- sort_order (INTEGER): Not null
- created_at (TEXT): Not null




Table: alternative_forms


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): Not null
- headword (TEXT): Not null
- type (TEXT): 
- sort_order (INTEGER): Not null
- created_at (TEXT): Not null




Table: tags


Columns:

- id (TEXT): Primary key
- name (TEXT): Not null
- category (TEXT): 
- description (TEXT): 
- created_at (TEXT): Not null
- updated_at (TEXT): Not null


Relationships:
```text
tags
 └─ entry_tags
```



Table: entry_tags


Columns:

- entry_id (TEXT): Primary key, Not null
- tag_id (TEXT): Primary key, Not null




Table: stems


Columns:

- stem_string (TEXT): Primary key
- class_type (TEXT): Not null
- is_hybrid (BOOLEAN): Not null
- root (TEXT): 
- agentive_suffix (TEXT): 
- tags (TEXT): 
- source (TEXT): 
- glosses (TEXT): 
- etymology (TEXT): 
- synonyms (TEXT): 
- antonyms (TEXT): 
- related_stems (TEXT): 
- created_at (TEXT): Not null
- updated_at (TEXT): Not null




Table: pattern_applicability


Columns:

- id (TEXT): Primary key
- pattern_id (TEXT): 
- category (TEXT): 
- pos (TEXT): 
- stress (INTEGER): 
- is_active (BOOLEAN): 
- sort_order (INTEGER): 
- created_at (DATETIME): 
- updated_at (DATETIME): 
- linguistic_role (TEXT): 
- target_gender (TEXT): 
- gender (TEXT): 
- metadata (TEXT): 




Table: entries


Columns:

- id (TEXT): Primary key
- headword (TEXT): Not null
- pos (TEXT): Not null
- gender (TEXT): 
- root_consonants (TEXT): 
- stem (TEXT): 
- is_loanword (BOOLEAN): Not null
- is_inflectable (BOOLEAN): Not null
- source_language (TEXT): 
- source_id (TEXT): 
- source_citation (TEXT): 
- source_title (TEXT): 
- source_year (TEXT): 
- source_page (TEXT): 
- source_publisher (TEXT): 
- etymology_chain (TEXT): 
- etymology_notes (TEXT): 
- created_at (TEXT): Not null
- updated_at (TEXT): Not null
- cv_pattern (TEXT): 
- definitions (TEXT): Not null
- usage_examples (TEXT): Not null
- verb_class (TEXT): 
- verb_transitivity (TEXT): 
- verb_perfective_3sgm (TEXT): 
- verb_imperfective_3sgm (TEXT): 
- verb_verbal_noun (TEXT): 
- verb_vowel_perf (TEXT): 
- verb_vowel_impf (TEXT): 
- verb_vowel_impv (TEXT): 
- verb_active_ptcp (TEXT): 
- verb_passive_ptcp (TEXT): 
- verb_form (TEXT): 
- verb_type (TEXT): 
- verb_weak_class (TEXT): 
- elative_form (TEXT): 
- participle_type (TEXT): 
- numeral_type (TEXT): 
- form_attributive_short (TEXT): 
- form_attributive_long (TEXT): 
- numeral_ordinal (TEXT): 
- numeral_adverbial (TEXT): 
- numeral_fractional (TEXT): 
- numeral_multiplier (TEXT): 
- numeral_distributive (TEXT): 
- source_display (TEXT): 
- source_tooltip (TEXT): 
- morph_pattern (TEXT): 
- sound_suffix (TEXT): 
- zokk_morphology (TEXT): 
- zokk_class (TEXT): 
- zokk_is_hybrid (TEXT): 
- zokk_agentive_suffix (TEXT): 


Relationships:
```text
entries
 └─ adj_morphology
 └─ alternative_forms
 └─ attestation_reliability
   └─ attestation_scores
 └─ audio_files
 └─ dialect_variants
 └─ entry_relationships
 └─ entry_tags
 └─ phonetics
 └─ subentries
   └─ audio_files
   └─ phonetics
 └─ verb_morphology
```



Table: noun_morphology


Columns:

- entry_id (TEXT): Primary key
- gender (TEXT): 
- noun_type (TEXT): 
- singular_form (TEXT): 
- plural_forms (TEXT): 
- sound_plural (TEXT): 
- dual_form (TEXT): 
- diminutive_form (TEXT): 
- collective_form (TEXT): 
- singulative_form (TEXT): 
- paucal_form (TEXT): 
- augmentative_form (TEXT): 
- paucal_pattern (TEXT): 
- augmentative_pattern (TEXT): 
- feminine_form (TEXT): 
- masculine_form (TEXT): 
- is_collective (BOOLEAN): 
- is_singulative (BOOLEAN): 
- created_at (TEXT): 
- updated_at (TEXT): 
- vowel_set_sg (TEXT): 
- vowel_set_opp (TEXT): 
- vowel_set_dual (TEXT): 
- vowel_set_pl (TEXT): 
- form_plural_pattern (TEXT): 
- form_fem_pattern (TEXT): 
- form_masc_pattern (TEXT): 
- dual_pattern (TEXT): 
- diminutive_pattern (TEXT): 
- morph_pattern (TEXT): 
- is_inflectable_singular (BOOLEAN): 
- is_inflectable_plural (BOOLEAN): 
- verbal_form (TEXT): 




Table: adj_morphology


Columns:

- entry_id (TEXT): Primary key
- masculine_form (TEXT): 
- feminine_form (TEXT): 
- plural_form (TEXT): 
- elative_form (TEXT): 
- elative_pattern (TEXT): 
- gender (TEXT): 
- created_at (TEXT): Not null
- updated_at (TEXT): Not null
- form_plural_pattern (TEXT): 
- form_fem_pattern (TEXT): 
- form_masc_pattern (TEXT): 
- vowel_set_sg (TEXT): 
- vowel_set_pl (TEXT): 
- vowel_set_opp (TEXT): 
- pattern (TEXT): 
- has_elative (INTEGER): Not null
- is_inflectable (BOOLEAN): 
- dual_form (TEXT): 
- dual_pattern (TEXT): 
- vowel_set_dual (TEXT): 
- diminutive_form (TEXT): 
- diminutive_pattern (TEXT): 




Table: participle_morphology


Columns:

- entry_id (TEXT): Primary key
- type (TEXT): 
- gender (TEXT): 
- is_inflectable (BOOLEAN): 
- created_at (TEXT): 
- updated_at (TEXT): 
- form_plural_pattern (TEXT): 
- form_fem_pattern (TEXT): 
- form_masc_pattern (TEXT): 
- verbal_form (TEXT): 




Table: audio_files


Columns:

- id (TEXT): Primary key
- entry_id (TEXT): 
- subentry_id (TEXT): 
- r2_object_key (TEXT): Not null
- dialect (TEXT): 
- is_ai_generated (BOOLEAN): Not null
- duration_seconds (REAL): 
- generated_at (TEXT): Not null




Table: subscriptions


Columns:

- id (TEXT): Primary key
- user_id (TEXT): Not null
- tier (TEXT): Not null
- started_at (TEXT): Not null
- expires_at (TEXT): 
- stripe_subscription_id (TEXT): 
- is_lifetime (BOOLEAN): Not null




Table: api_keys


Columns:

- id (TEXT): Primary key
- user_id (TEXT): Not null
- name (TEXT): Not null
- key_hash (TEXT): Not null
- key_prefix (TEXT): Not null
- usage_count (INTEGER): Not null
- rate_limit_per_month (INTEGER): Not null
- is_active (BOOLEAN): Not null
- created_at (TEXT): Not null
- last_used_at (TEXT): 






Common User Journeys:

Users → SuggestedEntries

Users → SuggestedEntries → Votes

Users → FlashcardLists

