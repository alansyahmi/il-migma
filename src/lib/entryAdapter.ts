/**
 * Compatibility wrapper for the shared entry bridge.
 */

import { INITIAL_FORM_STATE, entryToForm, buildLoadedEntryPatch, formToPayload } from './entryBridge.ts';

export { INITIAL_FORM_STATE, entryToForm, buildLoadedEntryPatch, formToPayload };
export type AdminForm = typeof INITIAL_FORM_STATE;
