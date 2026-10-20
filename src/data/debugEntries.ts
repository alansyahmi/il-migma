/**
 * src/data/debugEntries.ts
 *
 * Local debug entries dataset for offline development and fallback testing
 * when the remote database is unreachable or rate-limited.
 *
 * Covers:
 * - Root f-għ-l and Romance stem aġi
 * - Semitic verbs Forms I–X for root f-għ-l
 * - Romance verb aġixxa (-ir ending)
 * - Active participles (Form I *fiegħel, Form II *fagħgħiel, Form III *fagħiel) with vowel reduction
 * - Passive participles (Forms I–X adjectives)
 * - Verbal nouns (Msoodir) for Forms I–X with singulative (nom ta' darba) and sound/broken plurals
 * - Derived nominal & adjectival patterns from Section E of README.md
 * - Nomi Mimmati (broken-only plurals)
 * - Romance stem derivatives (aġir, azzjoni, aġent, aġili, aġitat, aġitazzjoni)
 */

import type { Entry, Root, SearchResult } from '../types';
import type { StemApiItem, SearchResponse } from '../lib/api';

export const DEBUG_ROOTS: Root[] = [
    {
        id: 'root-f-gh-l',
        consonants: 'f-għ-l',
        consonant_array: ['f', 'għ', 'l'],
        gloss_en: 'to do, to act, to make',
        gloss_mt: 'għamel, wettaq',
        type: 'Semitic',
        strength: 'strong',
        weak_class: 'none',
        vowel_set_perf: 'a-a',
        vowel_set_impf: 'a-a',
        vowel_set_imp: 'a-a',
        is_imala_blocked: false,
        gloss: 'to do / act / make',
        etymology: 'From Arabic ف-ع-ل (f-ʕ-l), standard root representing action and morphological templating.',
    },
];

export const DEBUG_STEMS: StemApiItem[] = [
    {
        id: 'stem-agi',
        stem_string: 'aġi',
        class_type: 'ir',
        is_hybrid: false,
        root: null,
        agentive_suffix: null,
        tags: ['romance', 'verb_ir', 'debug'],
        source: 'Sicilian/Italian agire',
        glosses: [{ en: 'to act / perform an action / behave', mt: 'għamel azzjoni / ġab ruħu' }],
        entry_ids: [
            'v-agixxa',
            'n-agir',
            'adj-agili',
            'adj-agitat',
            'n-azzjoni',
            'n-agenta',
            'n-agitazzjoni',
        ],
    },
];

export const DEBUG_ENTRIES: Entry[] = [
    // ═════════════════════════════════════════════════════════════════════════
    // 1. VERBS (f-għ-l Forms I–X & Romance aġixxa)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'v-faghal',
        headword: 'fagħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'I',
        verb_weak_class: 'none',
        verb_vowel_perf: 'a-a',
        verb_vowel_impf: 'a-a',
        verb_vowel_impv: 'a-a',
        definitions: [
            {
                id: 'def-v-faghal-1',
                text_en: 'to do, to act, to perform, to make',
                text_mt: 'għamel, wettaq, aġixxa',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-faghal', ipa: '/ˈfɐ.ɐl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'I',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            vowel_set_perf: 'a-a',
            vowel_set_impf: 'a-a',
            vowel_set_impv: 'a-a',
            perfective_3sgm: 'fagħal',
            imperfective_3sgm: 'jifgħal',
            imperative_sg: 'ifgħal',
            verbal_noun: 'fagħl',
            active_participle: '*fiegħel',
            passive_participle: 'mifgħul',
        },
        tags: ['verb', 'form_I', 'semitic', 'strong', 'debug'],
    },
    {
        id: 'v-faghghal',
        headword: '*fagħgħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-faghghal-1',
                text_en: 'to activate, to cause someone to do, to make happen (theoretical)',
                text_mt: 'ġiegħel jagħmel, attiva (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-faghghal', ipa: '/fɐːˈɐːl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'II',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*fagħgħal',
            imperfective_3sgm: '*jfagħgħal',
            imperative_sg: '*fagħgħal',
            verbal_noun: '*tifgħil',
            active_participle: '*fagħgħiel',
            passive_participle: '*mfagħgħal',
        },
        tags: ['verb', 'form_II', 'semitic', 'causative', 'theoretical', 'debug'],
    },
    {
        id: 'v-fieghal',
        headword: '*fiegħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-fieghal-1',
                text_en: 'to interact with, to act together with (theoretical)',
                text_mt: 'aġixxa ma / flimkien ma (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-fieghal', ipa: '/ˈfɪː.ɐl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'III',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*fiegħal',
            imperfective_3sgm: '*jfiegħal',
            imperative_sg: '*fiegħal',
            verbal_noun: '*fgħiel',
            active_participle: '*fagħiel',
            passive_participle: '*mfiegħal',
        },
        tags: ['verb', 'form_III', 'semitic', 'theoretical', 'debug'],
    },
    {
        id: 'v-tfaghghal',
        headword: '*tfagħgħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-tfaghghal-1',
                text_en: 'to become activated, to undergo intensive action (theoretical)',
                text_mt: 'sar attiv / ġie attivat (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-tfaghghal', ipa: '/tfɐːˈɐːl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'V',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*tfagħgħal',
            imperfective_3sgm: '*jitfagħgħal',
            imperative_sg: '*tfagħgħal',
            verbal_noun: '*tfagħgħil',
            passive_participle: '*mitfagħgħal',
        },
        tags: ['verb', 'form_V', 'semitic', 'reflexive', 'theoretical', 'debug'],
    },
    {
        id: 'v-tfieghal',
        headword: '*tfiegħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-tfieghal-1',
                text_en: 'to reciprocate, to act mutually with one another (theoretical)',
                text_mt: 'aġixxew ma xulxin reċiprokament (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-tfieghal', ipa: '/ˈtfɪː.ɐl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'VI',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*tfiegħal',
            imperfective_3sgm: '*jitfiegħal',
            imperative_sg: '*tfiegħal',
            verbal_noun: '*tfiegħil',
            passive_participle: '*mitfiegħal',
        },
        tags: ['verb', 'form_VI', 'semitic', 'reciprocal', 'theoretical', 'debug'],
    },
    {
        id: 'v-nfaghal',
        headword: '*nfagħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-nfaghal-1',
                text_en: 'to be done, to be performed (passive of Form I) (theoretical)',
                text_mt: 'sar, saritlu l-azzjoni (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-nfaghal', ipa: '/ˈnfɐ.ɐl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'VII',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*nfagħal',
            imperfective_3sgm: '*jinfagħal',
            imperative_sg: '*nfagħal',
            verbal_noun: '*nfigħil',
            passive_participle: '*minfagħal',
        },
        tags: ['verb', 'form_VII', 'semitic', 'passive', 'theoretical', 'debug'],
    },
    {
        id: 'v-ftaghal',
        headword: '*ftagħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-ftaghal-1',
                text_en: 'to act on oneself, to operate internally (theoretical)',
                text_mt: 'aġixxa għalih innifsu (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-ftaghal', ipa: '/ˈftɐ.ɐl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'VIII',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*ftagħal',
            imperfective_3sgm: '*jiftagħal',
            imperative_sg: '*ftagħal',
            verbal_noun: '*ftagħil',
            passive_participle: '*miftagħal',
        },
        tags: ['verb', 'form_VIII', 'semitic', 'middle', 'theoretical', 'debug'],
    },
    {
        id: 'v-fghiel',
        headword: '*fgħiel',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-fghiel-1',
                text_en: 'to take on the state/color of action, to become active (theoretical)',
                text_mt: 'ħa l-karatteristika tal-azzjoni (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-fghiel', ipa: '/fɪːl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'IX',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*fgħiel',
            imperfective_3sgm: '*jifgħiel',
            imperative_sg: '*fgħiel',
            verbal_noun: '*fgħiel',
            passive_participle: '*mufgħiel',
        },
        tags: ['verb', 'form_IX', 'semitic', 'inchoative', 'theoretical', 'debug'],
    },
    {
        id: 'v-stafghal',
        headword: '*stafgħal',
        pos: 'verb',
        source_language: 'Semitic',
        is_loanword: false,
        is_inflectable: true,
        root_consonants: 'f-għ-l',
        verb_class: 'strong',
        verb_weak_class: 'none',
        definitions: [
            {
                id: 'def-v-stafghal-1',
                text_en: 'to seek action, to request or deem done (theoretical)',
                text_mt: 'fittex l-azzjoni, talab li ssir (teoretiku)',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-stafghal', ipa: '/ˈstɐf.ɐl/', dialect: 'Standard' }],
        verb_morphology: {
            form: 'Xa',
            class: 'strong',
            verb_class: 'strong',
            weak_class: 'none',
            perfective_3sgm: '*stafgħal',
            imperfective_3sgm: '*jistafgħal',
            imperative_sg: '*stafgħal',
            verbal_noun: '*stafgħil',
            passive_participle: '*mistafgħal',
        },
        tags: ['verb', 'form_X', 'semitic', 'estimative', 'theoretical', 'debug'],
    },
    {
        id: 'v-agixxa',
        headword: 'aġixxa',
        pos: 'verb',
        source_language: 'Romance',
        is_loanword: true,
        is_inflectable: true,
        zokk_class: 'ir',
        definitions: [
            {
                id: 'def-v-agixxa-1',
                text_en: 'to act, to behave, to take steps/action',
                text_mt: 'ħa azzjoni, ġab ruħu, wettaq għemil',
                sense_number: 1,
            },
        ],
        phonetics: [{ id: 'ph-agixxa', ipa: '/ɐˈd͡ʒɪʃ.ʃɐ/', dialect: 'Standard' }],
        zokk_morphology: {
            stem_string: 'aġi',
            class_type: 'ir',
            is_hybrid: false,
        },
        verb_morphology: {
            form: 'romance',
            class: 'ir',
            verb_class: 'ir',
            perfective_3sgm: 'aġixxa',
            imperfective_3sgm: 'jaġixxi',
            imperative_sg: 'aġixxi',
            verbal_noun: 'aġir',
            passive_participle: 'aġit',
        },
        tags: ['verb', 'romance', 'stem_ir', 'debug'],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 2. ACTIVE PARTICIPLES (with shortened plural vowels fegħlin, fagħgħelin, fagħelin)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'part-fieghel',
        headword: '*fiegħel',
        pos: 'participle',
        gender: 'masculine',
        form_fem: '*fiegħla',
        form_plural_pattern: '*fegħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: '1ie2e3',
        participle_type: 'active',
        participle_gender: 'masculine',
        definitions: [
            {
                id: 'def-part-fieghel-1',
                text_en: 'doing, performing, acting (active participle Form I)',
                text_mt: 'li qiegħed jagħmel jew jaġixxi',
            },
        ],
        phonetics: [{ id: 'ph-fieghel', ipa: '/ˈfɪː.ɐl/', dialect: 'Standard' }],
        participle_morphology: {
            id: 'pm-fieghel',
            entry_id: 'part-fieghel',
            participle_type: 'active',
            verbal_form: 'I',
            gender: 'masculine',
            form_masc: '*fiegħel',
            form_fem: '*fiegħla',
            form_plural_pattern: '*fegħlin',
        },
        tags: ['participle', 'active_participle', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'part-faghghiel',
        headword: '*fagħgħiel',
        pos: 'participle',
        gender: 'masculine',
        form_fem: '*fagħgħiela',
        form_plural_pattern: '*fagħgħelin',
        root_consonants: 'f-għ-l',
        cv_pattern: '1a22ie3',
        participle_type: 'active',
        participle_gender: 'masculine',
        definitions: [
            {
                id: 'def-part-faghghiel-1',
                text_en: 'activating agent, active doer (active participle Form II / agent noun)',
                text_mt: 'aġent li jattiva jew iwettaq',
            },
        ],
        phonetics: [{ id: 'ph-faghghiel', ipa: '/fɐːˈɪːl/', dialect: 'Standard' }],
        participle_morphology: {
            id: 'pm-faghghiel',
            entry_id: 'part-faghghiel',
            participle_type: 'active',
            verbal_form: 'II',
            gender: 'masculine',
            form_masc: '*fagħgħiel',
            form_fem: '*fagħgħiela',
            form_plural_pattern: '*fagħgħelin',
        },
        tags: ['participle', 'agent_noun', 'active_participle', 'form_II', 'semitic', 'debug'],
    },
    {
        id: 'part-faghiel',
        headword: '*fagħiel',
        pos: 'participle',
        gender: 'masculine',
        form_fem: '*fagħiela',
        form_plural_pattern: '*fagħelin',
        root_consonants: 'f-għ-l',
        cv_pattern: '1a2ie3',
        participle_type: 'active',
        participle_gender: 'masculine',
        definitions: [
            {
                id: 'def-part-faghiel-1',
                text_en: 'interacting participant (active participle Form III)',
                text_mt: 'li qed jaġixxi flimkien ma ħaddieħor',
            },
        ],
        phonetics: [{ id: 'ph-faghiel', ipa: '/fɐˈɪːl/', dialect: 'Standard' }],
        participle_morphology: {
            id: 'pm-faghiel',
            entry_id: 'part-faghiel',
            participle_type: 'active',
            verbal_form: 'III',
            gender: 'masculine',
            form_masc: '*fagħiel',
            form_fem: '*fagħiela',
            form_plural_pattern: '*fagħelin',
        },
        tags: ['participle', 'active_participle', 'form_III', 'semitic', 'debug'],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 3. PASSIVE PARTICIPLES (Forms I–X, all Adjectives)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'adj-mifghul',
        headword: 'mifgħul',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: 'mifgħula',
        form_plural_pattern: 'mifgħulin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mi12u3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-mifghul-1',
                text_en: 'done, performed, acted upon (passive participle Form I)',
                text_mt: 'magħmul, imwettaq',
            },
        ],
        phonetics: [{ id: 'ph-mifghul', ipa: '/mɪfˈʊːl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'mifgħul',
            form_fem: 'mifgħula',
            plural_form: 'mifgħulin',
            pattern: 'mi12u3',
        },
        participle_morphology: {
            id: 'pm-mifghul',
            entry_id: 'adj-mifghul',
            participle_type: 'passive',
            verbal_form: 'I',
            gender: 'masculine',
            form_masc: 'mifgħul',
            form_fem: 'mifgħula',
            form_plural_pattern: 'mifgħulin',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'adj-mfaghghal',
        headword: '*mfagħgħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*mfagħgħla',
        form_plural_pattern: '*mfagħgħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'm1a22a3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-mfaghghal-1',
                text_en: 'activated, caused to be done (passive participle Form II)',
                text_mt: 'attiv, magħmul b’mod intensiv (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-mfaghghal', ipa: '/mfɐːˈɐːl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*mfagħgħal',
            form_fem: '*mfagħgħla',
            plural_form: '*mfagħgħlin',
            pattern: 'm1a22a3',
        },
        participle_morphology: {
            id: 'pm-mfaghghal',
            entry_id: 'adj-mfaghghal',
            participle_type: 'passive',
            verbal_form: 'II',
            gender: 'masculine',
            form_masc: '*mfagħgħal',
            form_fem: '*mfagħgħla',
            form_plural_pattern: '*mfagħgħlin',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_II', 'semitic', 'debug'],
    },
    {
        id: 'adj-mfieghal',
        headword: '*mfiegħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*mfiegħla',
        form_plural_pattern: '*mfiegħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'm1ie2a3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-mfieghal-1',
                text_en: 'interacted with, engaged reciprocally (passive participle Form III)',
                text_mt: 'li saritlu l-interazzjoni (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-mfieghal', ipa: '/ˈmfɪː.ɐl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*mfiegħal',
            form_fem: '*mfiegħla',
            plural_form: '*mfiegħlin',
            pattern: 'm1ie2a3',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_III', 'semitic', 'debug'],
    },
    {
        id: 'adj-mitfaghghal',
        headword: '*mitfagħgħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*mitfagħgħla',
        form_plural_pattern: '*mitfagħgħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mit1a22a3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-mitfaghghal-1',
                text_en: 'fully activated, engaged (passive participle Form V)',
                text_mt: 'li ġie attivat għal kollox (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-mitfaghghal', ipa: '/mɪtfɐːˈɐːl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*mitfagħgħal',
            form_fem: '*mitfagħgħla',
            plural_form: '*mitfagħgħlin',
            pattern: 'mit1a22a3',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_V', 'semitic', 'debug'],
    },
    {
        id: 'adj-mitfieghal',
        headword: '*mitfiegħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*mitfiegħla',
        form_plural_pattern: '*mitfiegħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mit1ie2a3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-mitfieghal-1',
                text_en: 'mutually engaged, reciprocally enacted (passive participle Form VI)',
                text_mt: 'imwettaq b’mod reċiproku (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-mitfieghal', ipa: '/mɪtˈfɪː.ɐl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*mitfiegħal',
            form_fem: '*mitfiegħla',
            plural_form: '*mitfiegħlin',
            pattern: 'mit1ie2a3',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_VI', 'semitic', 'debug'],
    },
    {
        id: 'adj-minfaghal',
        headword: '*minfagħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*minfagħla',
        form_plural_pattern: '*minfagħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'min1a2a3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-minfaghal-1',
                text_en: 'performed, undergone (passive participle Form VII)',
                text_mt: 'li sar jew intgħamel (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-minfaghal', ipa: '/mɪnˈfɐ.ɐl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*minfagħal',
            form_fem: '*minfagħla',
            plural_form: '*minfagħlin',
            pattern: 'min1a2a3',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_VII', 'semitic', 'debug'],
    },
    {
        id: 'adj-miftaghal',
        headword: '*miftagħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*miftagħla',
        form_plural_pattern: '*miftagħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mift1a2a3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-miftaghal-1',
                text_en: 'internally enacted, accomplished (passive participle Form VIII)',
                text_mt: 'imwettaq ġewwa fih innifsu (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-miftaghal', ipa: '/mɪfˈtɐ.ɐl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*miftagħal',
            form_fem: '*miftagħla',
            plural_form: '*miftagħlin',
            pattern: 'mift1a2a3',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_VIII', 'semitic', 'debug'],
    },
    {
        id: 'adj-mufghiel',
        headword: '*mufgħiel',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*mufgħiela',
        form_plural_pattern: '*mufgħelin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mu12ie3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-mufghiel-1',
                text_en: 'rendered active, colored by action (passive participle Form IX)',
                text_mt: 'li ħa l-karatteristika attiva (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-mufghiel', ipa: '/mʊfˈɪːl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*mufgħiel',
            form_fem: '*mufgħiela',
            plural_form: '*mufgħelin',
            pattern: 'mu12ie3',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_IX', 'semitic', 'debug'],
    },
    {
        id: 'adj-mistafghal',
        headword: '*mistafgħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: '*mistafgħla',
        form_plural_pattern: '*mistafgħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mista12a3',
        participle_type: 'passive',
        definitions: [
            {
                id: 'def-adj-mistafghal-1',
                text_en: 'sought after, deemed completed (passive participle Form X)',
                text_mt: 'mitlub li jsir / mistenni (teoretiku)',
            },
        ],
        phonetics: [{ id: 'ph-mistafghal', ipa: '/mɪsˈtɐf.ɐl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: '*mistafgħal',
            form_fem: '*mistafgħla',
            plural_form: '*mistafgħlin',
            pattern: 'mista12a3',
        },
        tags: ['adjective', 'participle', 'passive_participle', 'form_X', 'semitic', 'debug'],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 4. VERBAL NOUNS (Msoodir Forms I–X with singulatives & plurals)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'n-faghl',
        headword: 'fagħl',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'fagħla',
        plural_pattern: 'fgħiel',
        root_consonants: 'f-għ-l',
        cv_pattern: '1a23',
        definitions: [
            {
                id: 'def-n-faghl-1',
                text_en: 'action, act, doing, deed (verbal noun Form I)',
                text_mt: 'għemil, għemil ta’ darba (fagħla), azzjoni',
            },
        ],
        phonetics: [{ id: 'ph-faghl', ipa: '/fɐːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'I',
            singular_form: 'fagħl',
            singulative_form: 'fagħla',
            plural_forms: ['fagħliet', 'fagħlijiet', 'fgħiel', 'fgħul', 'ifgħla'],
            pattern: '1a23',
        },
        tags: ['noun', 'verbal_noun', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'n-feghl',
        headword: 'fegħl',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'fegħla',
        plural_pattern: 'fgħiel',
        root_consonants: 'f-għ-l',
        cv_pattern: '1e23',
        definitions: [
            {
                id: 'def-n-feghl-1',
                text_en: 'state of acting, state of performance (verbal noun Form I)',
                text_mt: 'stat ta’ għemil jew azzjoni',
            },
        ],
        phonetics: [{ id: 'ph-feghl', ipa: '/fɛːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'I',
            singular_form: 'fegħl',
            singulative_form: 'fegħla',
            plural_forms: ['fegħliet', 'fegħlijiet', 'fgħiel', 'fgħul'],
            pattern: '1e23',
        },
        tags: ['noun', 'verbal_noun', 'state', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'n-foghol',
        headword: 'fogħol',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'fogħla',
        plural_pattern: 'fogħul',
        root_consonants: 'f-għ-l',
        cv_pattern: '1o2o3',
        definitions: [
            {
                id: 'def-n-foghol-1',
                text_en: 'quality of action, abstract activity (verbal noun Form I)',
                text_mt: 'kwalità ta’ azzjoni',
            },
        ],
        phonetics: [{ id: 'ph-foghol', ipa: '/ˈfɔ.ɔl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'I',
            singular_form: 'fogħol',
            singulative_form: 'fogħla',
            plural_forms: ['fogħliet', 'fogħlijiet', 'fogħul'],
            pattern: '1o2o3',
        },
        tags: ['noun', 'verbal_noun', 'quality', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'n-fghiel-masdar',
        headword: 'fgħiel',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'fgħiela',
        plural_pattern: 'fwiegħel',
        root_consonants: 'f-għ-l',
        cv_pattern: '12â3',
        definitions: [
            {
                id: 'def-n-fghiel-masdar-1',
                text_en: 'process, outcome of doing (verbal noun Form I)',
                text_mt: 'riżultat jew proċess ta’ azzjoni',
            },
        ],
        phonetics: [{ id: 'ph-fghiel-masdar', ipa: '/fɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'I',
            singular_form: 'fgħiel',
            singulative_form: 'fgħiela',
            plural_forms: ['fgħielijiet', 'fwiegħel'],
            pattern: '12â3',
        },
        tags: ['noun', 'verbal_noun', 'result', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'n-fghul',
        headword: 'fgħul',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'fgħula',
        plural_pattern: 'fgħajjel',
        root_consonants: 'f-għ-l',
        cv_pattern: '12u3',
        definitions: [
            {
                id: 'def-n-fghul-1',
                text_en: 'act of carrying out, accomplishment (verbal noun Form I)',
                text_mt: 'twettiq, eżekuzzjoni ta’ ħaġa',
            },
        ],
        phonetics: [{ id: 'ph-fghul', ipa: '/fʊːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'I',
            singular_form: 'fgħul',
            singulative_form: 'fgħula',
            plural_forms: ['fgħulijiet', 'fgħuliet', 'fgħajjel'],
            pattern: '12u3',
        },
        tags: ['noun', 'verbal_noun', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'n-fghil',
        headword: 'fgħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'fgħila',
        plural_pattern: 'fogħla',
        root_consonants: 'f-għ-l',
        cv_pattern: '12i3',
        definitions: [
            {
                id: 'def-n-fghil-1',
                text_en: 'manner of doing, practice (verbal noun Form I)',
                text_mt: 'manjiera jew prattika ta’ azzjoni',
            },
        ],
        phonetics: [{ id: 'ph-fghil', ipa: '/fɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'I',
            singular_form: 'fgħil',
            singulative_form: 'fgħila',
            plural_forms: ['fgħiliet', 'fogħla'],
            pattern: '12i3',
        },
        tags: ['noun', 'verbal_noun', 'form_I', 'semitic', 'debug'],
    },
    {
        id: 'n-tifghil',
        headword: '*tifgħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*tifgħila',
        plural_pattern: '*tfagħiel',
        root_consonants: 'f-għ-l',
        cv_pattern: 'ti12i3',
        definitions: [
            {
                id: 'def-n-tifghil-1',
                text_en: 'activation, actuation (verbal noun Form II)',
                text_mt: 'attivazzjoni, tħaddim (masdar Forma II)',
            },
        ],
        phonetics: [{ id: 'ph-tifghil', ipa: '/tɪfˈɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'II',
            singular_form: '*tifgħil',
            singulative_form: '*tifgħila',
            plural_forms: ['*tifgħiliet', '*tfagħiel'],
            pattern: 'ti12i3',
        },
        tags: ['noun', 'verbal_noun', 'form_II', 'semitic', 'debug'],
    },
    {
        id: 'n-fieghil',
        headword: '*fgħiel',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*fgħiela',
        plural_pattern: '*fwiegħel',
        root_consonants: 'f-għ-l',
        cv_pattern: '12ie3',
        definitions: [
            {
                id: 'def-n-fieghil-1',
                text_en: 'interaction, cooperative engagement (verbal noun Form III)',
                text_mt: 'interazzjoni flimkien (masdar Forma III)',
            },
        ],
        phonetics: [{ id: 'ph-fieghil', ipa: '/fɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'III',
            singular_form: '*fgħiel',
            singulative_form: '*fgħiela',
            plural_forms: ['*fgħielijiet', '*fwiegħel'],
            pattern: '12ie3',
        },
        tags: ['noun', 'verbal_noun', 'form_III', 'semitic', 'debug'],
    },
    {
        id: 'n-tfaghghil',
        headword: '*tfagħgħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*tfagħgħila',
        root_consonants: 'f-għ-l',
        cv_pattern: 't1a22i3',
        definitions: [
            {
                id: 'def-n-tfaghghil-1',
                text_en: 'becoming activated, self-activation (verbal noun Form V)',
                text_mt: 'il-proċess li ssir attiv (masdar Forma V)',
            },
        ],
        phonetics: [{ id: 'ph-tfaghghil', ipa: '/tfɐːˈɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'V',
            singular_form: '*tfagħgħil',
            singulative_form: '*tfagħgħila',
            plural_forms: ['*tfagħgħiliet'],
            pattern: 't1a22i3',
        },
        tags: ['noun', 'verbal_noun', 'form_V', 'semitic', 'debug'],
    },
    {
        id: 'n-tfieghil',
        headword: '*tfiegħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*tfiegħila',
        root_consonants: 'f-għ-l',
        cv_pattern: 't1ie2i3',
        definitions: [
            {
                id: 'def-n-tfieghil-1',
                text_en: 'mutual interaction, reciprocity (verbal noun Form VI)',
                text_mt: 'interazzjoni reċiproka (masdar Forma VI)',
            },
        ],
        phonetics: [{ id: 'ph-tfieghil', ipa: '/ˈtfɪː.ɪl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'VI',
            singular_form: '*tfiegħil',
            singulative_form: '*tfiegħila',
            plural_forms: ['*tfiegħiliet'],
            pattern: 't1ie2i3',
        },
        tags: ['noun', 'verbal_noun', 'form_VI', 'semitic', 'debug'],
    },
    {
        id: 'n-nfighil',
        headword: '*nfigħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*nfigħila',
        root_consonants: 'f-għ-l',
        cv_pattern: 'n1a2i3',
        definitions: [
            {
                id: 'def-n-nfighil-1',
                text_en: 'submission to action, being performed (verbal noun Form VII)',
                text_mt: 'li tiġi mwettaq (masdar Forma VII)',
            },
        ],
        phonetics: [{ id: 'ph-nfighil', ipa: '/nfɪˈɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'VII',
            singular_form: '*nfigħil',
            singulative_form: '*nfigħila',
            plural_forms: ['*nfigħiliet'],
            pattern: 'n1a2i3',
        },
        tags: ['noun', 'verbal_noun', 'form_VII', 'semitic', 'debug'],
    },
    {
        id: 'n-ftaghil',
        headword: '*ftagħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*ftagħila',
        root_consonants: 'f-għ-l',
        cv_pattern: 'ft1a2i3',
        definitions: [
            {
                id: 'def-n-ftaghil-1',
                text_en: 'internal operation, self-accomplishment (verbal noun Form VIII)',
                text_mt: 'operazzjoni interna (masdar Forma VIII)',
            },
        ],
        phonetics: [{ id: 'ph-ftaghil', ipa: '/ftɐˈɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'VIII',
            singular_form: '*ftagħil',
            singulative_form: '*ftagħila',
            plural_forms: ['*ftagħiliet', '*ftegħiliet'],
            pattern: 'ft1a2i3',
        },
        tags: ['noun', 'verbal_noun', 'form_VIII', 'semitic', 'debug'],
    },
    {
        id: 'n-stafghil',
        headword: '*stafgħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*stafgħila',
        root_consonants: 'f-għ-l',
        cv_pattern: 'sta12i3',
        definitions: [
            {
                id: 'def-n-stafghil-1',
                text_en: 'requesting action, deliberation (verbal noun Form Xa)',
                text_mt: 'tfittxija ta’ azzjoni (masdar Forma Xa)',
            },
        ],
        phonetics: [{ id: 'ph-stafghil', ipa: '/stɐfˈɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'Xa',
            singular_form: '*stafgħil',
            singulative_form: '*stafgħila',
            plural_forms: ['*stafgħiliet'],
            pattern: 'sta12i3',
        },
        tags: ['noun', 'verbal_noun', 'form_X', 'semitic', 'debug'],
    },
    {
        id: 'n-stafaghghil',
        headword: '*stafagħgħil',
        pos: 'noun',
        gender: 'masculine',
        form_fem: '*stafagħgħila',
        root_consonants: 'f-għ-l',
        cv_pattern: 'st1a22i3',
        definitions: [
            {
                id: 'def-n-stafaghghil-1',
                text_en: 'intensive request of action (verbal noun Form Xb)',
                text_mt: 'talba qawwija ta’ azzjoni (masdar Forma Xb)',
            },
        ],
        phonetics: [{ id: 'ph-stafaghghil', ipa: '/stɐfɐːˈɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            verbal_form: 'Xb',
            singular_form: '*stafagħgħil',
            singulative_form: '*stafagħgħila',
            plural_forms: ['*stafagħgħiliet'],
            pattern: 'st1a22i3',
        },
        tags: ['noun', 'verbal_noun', 'form_X', 'semitic', 'debug'],
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 5. SECTION 7: NON-VERB DERIVATIVES & NOMI MIMMATI (Broken-only plurals)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'n-faghal-concrete',
        headword: 'fagħal',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'fagħla',
        plural_pattern: 'fgħiel',
        root_consonants: 'f-għ-l',
        cv_pattern: '1v2v3',
        definitions: [
            {
                id: 'def-n-faghal-concrete-1',
                text_en: 'concrete act, entity of action (like ġebel)',
                text_mt: 'oġġett konkret ta’ azzjoni',
            },
        ],
        phonetics: [{ id: 'ph-faghal-concrete', ipa: '/ˈfɐ.ɐl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            singular_form: 'fagħal',
            feminine_form: 'fagħla',
            plural_forms: ['fgħiel', 'fgħula', 'ifgħla'],
            pattern: '1v2v3',
        },
        tags: ['noun', 'concrete_noun', 'semitic', 'debug'],
    },
    {
        id: 'adj-feghel',
        headword: 'fegħel',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: 'fegħla',
        plural_pattern: 'fagħel',
        root_consonants: 'f-għ-l',
        cv_pattern: '1e2e3',
        definitions: [
            {
                id: 'def-adj-feghel-1',
                text_en: 'active, capable of acting (adjective of state)',
                text_mt: 'attiv, f’qagħda li jaġixxi',
            },
        ],
        phonetics: [{ id: 'ph-feghel', ipa: '/ˈfɛ.ɛl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'fegħel',
            form_fem: 'fegħla',
            plural_form: 'fegħlin',
            plural_forms: ['fegħlin', 'fagħel'],
            pattern: '1e2e3',
        },
        tags: ['adjective', 'state', 'semitic', 'debug'],
    },
    {
        id: 'n-fghala',
        headword: 'fgħala',
        pos: 'noun',
        gender: 'feminine',
        plural_pattern: 'fgħajjel',
        root_consonants: 'f-għ-l',
        cv_pattern: '12â3a',
        definitions: [
            {
                id: 'def-n-fghala-1',
                text_en: 'profession, vocational action (like btala)',
                text_mt: 'professjoni, xogħol, vokazzjoni',
            },
        ],
        phonetics: [{ id: 'ph-fghala', ipa: '/ˈfɐː.lɐ/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'feminine',
            singular_form: 'fgħala',
            plural_forms: ['fgħâliet', 'fgħajjel', 'fgħali'],
            pattern: '12â3a',
        },
        tags: ['noun', 'profession', 'semitic', 'debug'],
    },
    {
        id: 'n-fghiela',
        headword: 'fgħiela',
        pos: 'noun',
        gender: 'feminine',
        plural_pattern: 'fgħieli',
        root_consonants: 'f-għ-l',
        cv_pattern: '12â3a',
        definitions: [
            {
                id: 'def-n-fghiela-1',
                text_en: 'craft, occupation, regular activity',
                text_mt: 'sengħa, okkupazzjoni, attività kontinwa',
            },
        ],
        phonetics: [{ id: 'ph-fghiela', ipa: '/ˈfɪː.lɐ/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'feminine',
            singular_form: 'fgħiela',
            plural_forms: ['fgħieliet', 'fgħieli', 'fgħajjel'],
            pattern: '12â3a',
        },
        tags: ['noun', 'occupation', 'semitic', 'debug'],
    },
    {
        id: 'adj-faghil',
        headword: 'fagħil',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: 'fagħila',
        plural_pattern: 'fgħal',
        root_consonants: 'f-għ-l',
        cv_pattern: '1a2i3',
        definitions: [
            {
                id: 'def-adj-faghil-1',
                text_en: 'habitual doer, effective (like ħabib)',
                text_mt: 'dak li jwettaq b’mod effettiv',
            },
        ],
        phonetics: [{ id: 'ph-faghil', ipa: '/fɐˈɪːl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'fagħil',
            form_fem: 'fagħila',
            plural_form: 'fagħilin',
            plural_forms: ['fagħilin', 'fgħal'],
            pattern: '1a2i3',
        },
        tags: ['adjective', 'noun', 'semitic', 'debug'],
    },
    {
        id: 'adj-faghlieni',
        headword: 'fagħlieni',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: 'fagħlienija',
        form_plural_pattern: 'fagħlenin',
        root_consonants: 'f-għ-l',
        cv_pattern: '1v23îni',
        definitions: [
            {
                id: 'def-adj-faghlieni-1',
                text_en: 'disposed to action, energetic, industrious',
                text_mt: 'bżonnjuż jew imħeġġeġ għall-azzjoni, mimli enerġija',
            },
        ],
        phonetics: [{ id: 'ph-faghlieni', ipa: '/fɐːˈlɪː.nɪ/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'fagħlieni',
            form_fem: 'fagħlienija',
            plural_form: 'fagħlenin',
            pattern: '1v23îni',
        },
        tags: ['adjective', 'nisba', 'property', 'semitic', 'debug'],
    },
    {
        id: 'adj-faghli',
        headword: 'fagħli',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: 'fagħlija',
        form_plural_pattern: 'fagħlin',
        root_consonants: 'f-għ-l',
        cv_pattern: '1v23i',
        definitions: [
            {
                id: 'def-adj-faghli-1',
                text_en: 'pertaining to action or deeds (nisba adjective)',
                text_mt: 'li għandu x’jaqsam mal-għemil',
            },
        ],
        phonetics: [{ id: 'ph-faghli', ipa: '/ˈfɐː.lɪ/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'fagħli',
            form_fem: 'fagħlija',
            plural_form: 'fagħlin',
            pattern: '1v23i',
        },
        tags: ['adjective', 'nisba', 'semitic', 'debug'],
    },
    {
        id: 'adj-afghal',
        headword: 'afgħal',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: 'fagħla',
        plural_pattern: 'fogħol',
        root_consonants: 'f-għ-l',
        cv_pattern: 'a12a3',
        definitions: [
            {
                id: 'def-adj-afghal-1',
                text_en: 'more active / comparative color & quality (like akbar, aħdar)',
                text_mt: 'aktar attiv; forma komparattiva',
            },
        ],
        phonetics: [{ id: 'ph-afghal', ipa: '/ˈɐf.ɐl/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'afgħal',
            form_fem: 'fagħla',
            plural_form: 'fogħol',
            plural_forms: ['fogħol', 'fgħiel'],
            elative_form: 'afgħal',
            has_elative: true,
            pattern: 'a12a3',
        },
        tags: ['adjective', 'comparative', 'color', 'semitic', 'debug'],
    },

    // ── Nomi Mimmati (Broken-only plurals) ────────────────────────────────────
    {
        id: 'n-mifghel',
        headword: 'mifgħel',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'mifgħla',
        plural_pattern: 'mfagħel',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mi12e3',
        definitions: [
            {
                id: 'def-n-mifghel-1',
                text_en: 'place of action, workshop / tool (Nom Mimmat, like miġles, mibred)',
                text_mt: 'post jew għodda ta’ azzjoni (Nom Mimmat)',
            },
        ],
        phonetics: [{ id: 'ph-mifghel', ipa: '/ˈmɪf.ɛl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            singular_form: 'mifgħel',
            feminine_form: 'mifgħla',
            plural_forms: ['mfagħel'],
            plural_pattern: 'mfagħel',
            pattern: 'mi12e3',
        },
        tags: ['noun', 'nom_mimmat', 'place_noun', 'tool_noun', 'semitic', 'debug'],
    },
    {
        id: 'n-mafghal',
        headword: 'mafgħal',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'mafagħla',
        plural_pattern: 'mfagħal',
        root_consonants: 'f-għ-l',
        cv_pattern: 'ma12a3',
        definitions: [
            {
                id: 'def-n-mafghal-1',
                text_en: 'facility, location of operation (Nom Mimmat, like madħal, matfgħa)',
                text_mt: 'lokalità jew impjant ta’ operazzjoni',
            },
        ],
        phonetics: [{ id: 'ph-mafghal', ipa: '/ˈmɐf.ɐl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            singular_form: 'mafgħal',
            feminine_form: 'mafagħla',
            plural_forms: ['mfagħal', 'mfagħel'],
            plural_pattern: 'mfagħal',
            pattern: 'ma12a3',
        },
        tags: ['noun', 'nom_mimmat', 'place_noun', 'semitic', 'debug'],
    },
    {
        id: 'n-mufghiel',
        headword: 'mufgħiel',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'mufgħiela',
        plural_pattern: 'mfagħiel',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mu12â3',
        definitions: [
            {
                id: 'def-n-mufghiel-1',
                text_en: 'instrument, apparatus (Nom Mimmat, like musbieħ, muftieħ)',
                text_mt: 'strument kbir jew għodda ta’ azzjoni',
            },
        ],
        phonetics: [{ id: 'ph-mufghiel', ipa: '/mʊfˈɪːl/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            singular_form: 'mufgħiel',
            feminine_form: 'mufgħiela',
            plural_forms: ['mfagħiel', 'mfagħel'],
            plural_pattern: 'mfagħiel',
            pattern: 'mu12â3',
        },
        tags: ['noun', 'nom_mimmat', 'tool_noun', 'semitic', 'debug'],
    },
    {
        id: 'n-mifighla',
        headword: 'mifigħla',
        pos: 'noun',
        gender: 'feminine',
        plural_pattern: 'mfagħel',
        root_consonants: 'f-għ-l',
        cv_pattern: 'mi1v23a',
        definitions: [
            {
                id: 'def-n-mifighla-1',
                text_en: 'hand tool, instrument (Nom Mimmat feminine, like mikinsa)',
                text_mt: 'għodda tal-idejn (Nom Mimmat femminili)',
            },
        ],
        phonetics: [{ id: 'ph-mifighla', ipa: '/mɪˈfɪː.lɐ/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'feminine',
            singular_form: 'mifigħla',
            plural_forms: ['mfagħel', 'mfagħiel'],
            plural_pattern: 'mfagħel',
            pattern: 'mi1v23a',
        },
        tags: ['noun', 'nom_mimmat', 'tool_noun', 'semitic', 'debug'],
    },

    // ── Romance Stem aġi- Derivatives ─────────────────────────────────────────
    {
        id: 'n-agir',
        headword: 'aġir',
        pos: 'noun',
        gender: 'masculine',
        source_language: 'Romance',
        is_loanword: true,
        definitions: [
            {
                id: 'def-n-agir-1',
                text_en: 'behavior, conduct, way of acting (Romance verbal noun)',
                text_mt: 'kondotta, mod kif wieħed iġib ruħu',
            },
        ],
        phonetics: [{ id: 'ph-agir', ipa: '/ɐˈd͡ʒɪːr/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            singular_form: 'aġir',
            plural_forms: ['aġirijiet'],
        },
        zokk_morphology: { stem_string: 'aġi', class_type: 'ir', is_hybrid: false },
        tags: ['noun', 'romance', 'verbal_noun', 'debug'],
    },
    {
        id: 'n-azzjoni',
        headword: 'azzjoni',
        pos: 'noun',
        gender: 'feminine',
        source_language: 'Romance',
        is_loanword: true,
        definitions: [
            {
                id: 'def-n-azzjoni-1',
                text_en: 'action, operation, deed',
                text_mt: 'għemil, mossa, operazzjoni',
            },
        ],
        phonetics: [{ id: 'ph-azzjoni', ipa: '/ɐtˈt͡sjoː.nɪ/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'feminine',
            singular_form: 'azzjoni',
            plural_forms: ['azzjonijiet'],
            sound_plural: 'azzjonijiet',
        },
        zokk_morphology: { stem_string: 'aġi', class_type: 'ir', is_hybrid: false },
        tags: ['noun', 'romance', 'debug'],
    },
    {
        id: 'n-agenta',
        headword: 'aġent',
        pos: 'noun',
        gender: 'masculine',
        form_fem: 'aġenta',
        source_language: 'Romance',
        is_loanword: true,
        definitions: [
            {
                id: 'def-n-agenta-1',
                text_en: 'agent, representative, actor',
                text_mt: 'persuna li taġixxi f’isem ħaddieħor',
            },
        ],
        phonetics: [{ id: 'ph-agenta', ipa: '/ɐˈd͡ʒɛnt/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'masculine',
            singular_form: 'aġent',
            feminine_form: 'aġenta',
            plural_forms: ['aġenti'],
        },
        zokk_morphology: { stem_string: 'aġi', class_type: 'ir', is_hybrid: false },
        tags: ['noun', 'agent_noun', 'romance', 'debug'],
    },
    {
        id: 'adj-agili',
        headword: 'aġili',
        pos: 'adjective',
        gender: 'common',
        source_language: 'Romance',
        is_loanword: true,
        definitions: [
            {
                id: 'def-adj-agili-1',
                text_en: 'agile, nimble, quick in action',
                text_mt: 'ħafif fil-moviment, veloċi',
            },
        ],
        phonetics: [{ id: 'ph-agili', ipa: '/ɐˈd͡ʒɪː.lɪ/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'aġili',
            form_fem: 'aġili',
            plural_form: 'aġili',
            plural_forms: ['aġili', 'aġlin'],
        },
        zokk_morphology: { stem_string: 'aġi', class_type: 'ir', is_hybrid: false },
        tags: ['adjective', 'romance', 'debug'],
    },
    {
        id: 'adj-agitat',
        headword: 'aġitat',
        pos: 'adjective',
        gender: 'masculine',
        form_fem: 'aġitata',
        source_language: 'Romance',
        is_loanword: true,
        definitions: [
            {
                id: 'def-adj-agitat-1',
                text_en: 'agitated, excited, perturbed (past participle / adjective)',
                text_mt: 'imqanqal, inkwetat, eċitat',
            },
        ],
        phonetics: [{ id: 'ph-agitat', ipa: '/ɐ.d͡ʒɪˈtɐːt/', dialect: 'Standard' }],
        adjective_morphology: {
            form_masc: 'aġitat',
            form_fem: 'aġitata',
            plural_form: 'aġitati',
        },
        zokk_morphology: { stem_string: 'aġi', class_type: 'ir', is_hybrid: false },
        tags: ['adjective', 'participle', 'romance', 'debug'],
    },
    {
        id: 'n-agitazzjoni',
        headword: 'aġitazzjoni',
        pos: 'noun',
        gender: 'feminine',
        source_language: 'Romance',
        is_loanword: true,
        definitions: [
            {
                id: 'def-n-agitazzjoni-1',
                text_en: 'agitation, turmoil, restlessness',
                text_mt: 'stat ta’ qawmien, inkwiet jew moviment qawwi',
            },
        ],
        phonetics: [{ id: 'ph-agitazzjoni', ipa: '/ɐ.d͡ʒɪ.tɐtˈt͡sjoː.nɪ/', dialect: 'Standard' }],
        noun_morphology: {
            gender: 'feminine',
            singular_form: 'aġitazzjoni',
            plural_forms: ['aġitazzjonijiet'],
        },
        zokk_morphology: { stem_string: 'aġi', class_type: 'ir', is_hybrid: false },
        tags: ['noun', 'romance', 'debug'],
    },
];

// ═════════════════════════════════════════════════════════════════════════
// 6. HELPER FUNCTIONS FOR LOCAL SEARCH AND LOOKUP
// ═════════════════════════════════════════════════════════════════════════

function normalizeText(str: string): string {
    return str
        .toLowerCase()
        .replace(/[*-]/g, '')
        .replace(/għ/g, 'gh')
        .replace(/ċ/g, 'c')
        .replace(/ġ/g, 'g')
        .replace(/ħ/g, 'h')
        .replace(/ż/g, 'z')
        .trim();
}

export function getDebugEntry(id: string): Entry | null {
    const direct = DEBUG_ENTRIES.find((e) => e.id === id);
    if (direct) return direct;

    const normId = normalizeText(id);
    return DEBUG_ENTRIES.find((e) => normalizeText(e.id) === normId || normalizeText(e.headword) === normId) || null;
}

export function getDebugRoot(idOrConsonants: string): Root | null {
    const norm = normalizeText(idOrConsonants);
    return (
        DEBUG_ROOTS.find(
            (r) =>
                r.id === idOrConsonants ||
                normalizeText(r.consonants) === norm ||
                normalizeText(r.id) === norm,
        ) || null
    );
}

export function getDebugStem(idOrStem: string): StemApiItem | null {
    const norm = normalizeText(idOrStem);
    return (
        DEBUG_STEMS.find(
            (s) =>
                s.id === idOrStem ||
                normalizeText(s.stem_string) === norm ||
                normalizeText(s.id) === norm,
        ) || null
    );
}

export function searchDebugEntries(q: string, opts: Record<string, any> = {}): SearchResponse {
    const normalizedQ = normalizeText(q || '');

    const filtered = DEBUG_ENTRIES.filter((entry) => {
        if (opts.pos && entry.pos?.toLowerCase() !== opts.pos.toLowerCase()) {
            return false;
        }
        if (opts.register) {
            const regTarget = opts.register.toLowerCase();
            const hasRegister = entry.definitions?.some(d => {
                if (!d.register) return false;
                if (typeof d.register === 'string') return d.register.toLowerCase() === regTarget;
                return (
                    d.register.key?.toLowerCase() === regTarget ||
                    d.register.en?.toLowerCase() === regTarget ||
                    d.register.mt?.toLowerCase() === regTarget
                );
            });
            if (!hasRegister) return false;
        }
        if (opts.root_id) {
            const normParam = normalizeText(opts.root_id).replace(/^root/, '');
            const entryRootNorm = entry.root_consonants ? normalizeText(entry.root_consonants).replace(/^root/, '') : '';
            if (entryRootNorm !== normParam) {
                return false;
            }
        }

        if (!normalizedQ) return true;

        const headwordNorm = normalizeText(entry.headword);
        const rootNorm = entry.root_consonants ? normalizeText(entry.root_consonants) : '';
        const idNorm = normalizeText(entry.id);
        const defsEn = entry.definitions?.map((d) => d.text_en.toLowerCase()).join(' ') || '';
        const defsMt = entry.definitions?.map((d) => (d.text_mt || '').toLowerCase()).join(' ') || '';

        return (
            headwordNorm.includes(normalizedQ) ||
            rootNorm.includes(normalizedQ) ||
            idNorm.includes(normalizedQ) ||
            defsEn.includes(normalizedQ) ||
            defsMt.includes(normalizedQ)
        );
    });

    const results: SearchResult[] = filtered.map((entry) => ({
        ...entry,
        score: 1.0,
        gloss_en: entry.definitions?.[0]?.text_en,
        gloss_mt: entry.definitions?.[0]?.text_mt || undefined,
        definition_en: entry.definitions?.[0]?.text_en,
        definition_mt: entry.definitions?.[0]?.text_mt || undefined,
    })) as unknown as SearchResult[];

    return {
        results,
        total: results.length,
        query: q,
    };
}
