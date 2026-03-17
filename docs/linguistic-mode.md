# Linguistic Modes (Standard vs Arabised)

The *Il-Miġma'* application supports two primary linguistic modes that change how morphological data and UI terminology are presented to the user.

- **Standard (CV)**: Uses modern European linguistic terminology and CV (Consonant-Vowel) notation for patterns (e.g., `CaCaC`).
- **Arabised (Wiżen)**: Uses traditional Semitic/Arabic grammarian terminology and the Wiżen (وزن) notation for patterns (e.g., `Fagħal`).

---

## 1. Technical Implementation

The system is split into **Hardcoded Terminology** and **Dynamic Configuration**.

### 1.1 `LinguisticModeContext`
The `LinguisticModeProvider` manages the global state:
- `mode`: `'standard' | 'arabised'`
- `language`: `'en' | 'mt'`
- `term(key)`: The primary function used throughout the UI to resolve a label.

### 1.2 The Resolution Pipeline
When `term('verb')` is called, the following priority is used:
1. **Dynamic Overrides**: Checks the `admin_config` table (category `ui_terminology`) for a key matching `verb`. This allows admins to change UI labels without code changes.
2. **Hardcoded Map**: Falls back to the `TERMINOLOGY` map in `src/lib/terminology.ts`.
3. **Identity**: Returns the key as-is if no match is found.

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

### 2.2 Terminology Overrides
The **UI Terminology** section in Admin Settings allows customizing any system term.
- Categories like "Parts of Speech" or "Genders" are now registry-driven.
- Adding a new POS in the admin panel immediately makes it available as a filter and a display label, with mode-aware resolution if provided.

### 2.3 Context-Aware Helpers
Helpers like `getRegistryOptions` ensure that when an admin is selecting a "Verb Class" or "Noun Type", they see the terminology they expect (e.g., "Sħiħ" in Standard vs. "Sħiħ" in Arabised, or "Nom" vs "Isem").

---

## 3. Developer Guide

### Adding a New Mode-Aware Term
1. Add the term to `src/lib/terminology.ts`.
2. OR (Preferred for dynamic labels) Add a new entry to the `admin_config` table under the relevant category.

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
