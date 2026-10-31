/**
 * BlipTalk Studio — portable preset bundles.
 *
 * Pure data/storage helpers, no React. A bundle carries only the user's own
 * presets: built-ins ship with the app and are never exported or overwritten.
 * Names are the portable identity here; IDs are regenerated on import so a
 * bundle can be restored on another browser without ID collisions.
 */

import { DEFAULT_CONFIG, normalizeConfig } from './intonation.js';
import {
  MAX_USER_PRESETS,
  addUserPreset,
  isPresetNameTaken,
  sanitizePresetName,
} from './presetStore.js';

export const PRESET_BUNDLE_APP = 'bliptalk-studio';
export const PRESET_BUNDLE_KIND = 'bliptalk-presets';
export const PRESET_BUNDLE_VERSION = 1;
/** Generous for 40 presets, small enough to reject a pasted novel. */
export const MAX_IMPORT_BYTES = 256 * 1024;

/** Build the JSON object written by "Export presets". */
export function createPresetBundle(userPresets = [], { exportedAt = new Date().toISOString() } = {}) {
  return {
    app: PRESET_BUNDLE_APP,
    kind: PRESET_BUNDLE_KIND,
    version: PRESET_BUNDLE_VERSION,
    exportedAt,
    presets: userPresets.map(({ name, mode, patch }) => ({
      name,
      mode,
      patch: { ...patch },
    })),
  };
}

/** Pretty-print a bundle with a trailing newline so the file is diff-friendly. */
export function serializePresetBundle(bundle) {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

/** Filename for a backup, e.g. `bliptalk-presets-2026-10-31.json`. */
export function presetBundleFilename(date = new Date()) {
  const safe = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return `bliptalk-presets-${safe.toISOString().slice(0, 10)}.json`;
}

/**
 * Parse a backup file. Accepts the canonical object or a bare array of
 * presets, which makes hand-edited files easier to support.
 *
 * @returns {{ok:true, presets:object[]} | {ok:false, error:string}}
 */
export function parsePresetBundle(rawText) {
  const text = String(rawText ?? '');
  if (text.length === 0) return { ok: false, error: 'That file is empty.' };
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'Backup is too large (max 256 KB).' };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Could not read that file. It is not valid JSON.' };
  }

  if (Array.isArray(parsed)) {
    return { ok: true, presets: parsed };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'That file is not a BlipTalk preset backup.' };
  }

  if (parsed.app !== undefined && parsed.app !== PRESET_BUNDLE_APP) {
    return { ok: false, error: 'That backup was made by a different app.' };
  }
  if (parsed.kind !== undefined && parsed.kind !== PRESET_BUNDLE_KIND) {
    return { ok: false, error: 'That file is not a BlipTalk preset backup.' };
  }
  if (
    parsed.version !== undefined &&
    (!Number.isInteger(parsed.version) || parsed.version > PRESET_BUNDLE_VERSION)
  ) {
    return { ok: false, error: 'That backup was made by a newer version of BlipTalk Studio.' };
  }
  if (!Array.isArray(parsed.presets)) {
    return { ok: false, error: 'That backup does not contain a preset list.' };
  }

  return { ok: true, presets: parsed.presets };
}

/** Build a normalised config from one imported `{mode, patch}` record. */
function configFromEntry(entry) {
  const patch =
    entry.patch && typeof entry.patch === 'object' && !Array.isArray(entry.patch)
      ? entry.patch
      : {};
  return normalizeConfig({
    ...DEFAULT_CONFIG,
    ...patch,
    mode: entry.mode ?? DEFAULT_CONFIG.mode,
  });
}

/**
 * Merge imported presets into the current store.
 *
 * Merge-only by design: existing presets are never replaced or deleted, and
 * built-in names stay reserved. Entries are added in file order until the
 * 40-preset cap is reached.
 */
export function mergePresetBundle(store, rawPresets) {
  let nextStore =
    store && typeof store === 'object' && Array.isArray(store.userPresets)
      ? store
      : { userPresets: [] };
  let imported = 0;
  let skippedDuplicate = 0;
  let skippedInvalid = 0;
  let limitReached = false;

  if (!Array.isArray(rawPresets)) {
    return { store: nextStore, imported, skippedDuplicate, skippedInvalid: 1, limitReached };
  }

  for (const entry of rawPresets) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      skippedInvalid += 1;
      continue;
    }

    const name = sanitizePresetName(entry.name);
    if (!name) {
      skippedInvalid += 1;
      continue;
    }

    if (nextStore.userPresets.length >= MAX_USER_PRESETS) {
      limitReached = true;
      break;
    }

    if (isPresetNameTaken(name, nextStore)) {
      skippedDuplicate += 1;
      continue;
    }

    nextStore = addUserPreset(nextStore, { name, config: configFromEntry(entry) });
    imported += 1;
  }

  return { store: nextStore, imported, skippedDuplicate, skippedInvalid, limitReached };
}
