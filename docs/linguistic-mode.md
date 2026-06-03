# Linguistic Modes (Standard vs Arabised)

The *Il-Miġma'* application supports two primary linguistic modes that change how morphological data and UI terminology are presented to the user.

- **Standard (CV)**: Uses modern European linguistic terminology and CV (Consonant-Vowel) notation for patterns (e.g., `CaCaC`).
- **Arabised (Wiżen)**: Uses traditional Semitic/Arabic grammarian terminology and the Wiżen (وزن) notation for patterns (e.g., `Fagħal`).

---

## 1. Technical Implementation

The system is driven by the hardcoded terminology map in `src/lib/terminology.ts`.

### 1.1 `LinguisticModeContext`
The `LinguisticModeProvider` manages the global state:
- `mode`: `'standard' | 'arabised'`
- `language`: `'en' | 'mt'`
- `term(key)`: The primary function used throughout the UI to resolve a label.

### 1.2 The Resolution Pipeline
When `term('verb')` is called, the following priority is used:
1. **Hardcoded Map**: Uses the `TERMINOLOGY` map in `src/lib/terminology.ts`.
2. **Identity**: Returns the key as-is if no match is found.

Terms can include named placeholders such as `{name}` or `{count}`. When you call `term('welcome-admin', { name: 'Ava' })`, the placeholder is filled at render time. Placeholders may also reference other term keys, so phrases can stay modular without duplicating full sentences.

### 1.3 Admin Registry Transforms
The `ADMIN_REGISTRY` (`src/lib/adminCategoryRegistry.ts`) uses the `transformOption` and `getRegistryOptions` functions to drive dropdowns:
- **Patterns**: Choose between displaying the `cv` field or the `wizen` field.
- **Labels**: Use mode-aware resolution for POS, Genders, and Dialects.

---

## 2. Admin Workflow Impact

The linguistic mode significantly affects how data is managed in the Admin Dashboard.

### 2.1 Pattern Management
Morphological patterns (Plural, Feminine, CV/Wizen) are stored as canonical objects containing **both** notations:
```json
{
  "cv": "CaCaC",
  "wizen": "Fagħal",
  "stress": 2,
  "pos_types": ["verb"]
}
```
**Impact**: Admins only need to create a pattern once. The UI will automatically switch between showing "CaCaC" and "Fagħal" based on the user's current mode.

### 2.2 Terminology Workflow
All UI terminology now lives in source control.
- Categories like "Parts of Speech" or "Genders" are registry-driven.
- Adding or changing a UI term means editing `src/lib/terminology.ts` and rebuilding.

### 2.3 Context-Aware Helpers
Helpers like `getRegistryOptions` ensure that when an admin is selecting a "Verb Class" or "Noun Type", they see the terminology they expect (e.g., "Sħiħ" in Standard vs. "Sħiħ" in Arabised, or "Nom" vs "Isem").

---

## 3. Developer Guide

### Adding a New Mode-Aware Term
1. Add the term to `src/lib/terminology.ts`.

### Using Terms in Components
Always use the `term` function from `useLinguisticMode`:
```tsx
const { term } = useLinguisticMode();
return <span>{term('verb')}</span>; // Automatically handles Standard/Arabised/English
```

### Registry Options in Dropdowns
When building a custom editor that needs localized options:
```tsx
const options = items.map(item => getRegistryOptions(category, item, mode, language));
```
