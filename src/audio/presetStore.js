/**
 * BlipTalk Studio — persisted user presets.
 *
 * Pure data/storage helpers, no React. Only presets the user creates are
 * stored. The shipped presets in `PRESETS` are read-only: an earlier build
 * stored `builtInOverrides` / `deletedBuiltIns`, and those legacy keys are
 * ignored here (and dropped on the next successful write).
 */

import { DEFAULT_CONFIG, normalizeConfig } from './intonation.js';
import { PRESETS } from './presets.js';

export const PRESET_STORE_KEY = 'bliptalk-studio:presets:v1';
export const MAX_USER_PRESETS = 40;
export const MAX_PRESET_NAME_LENGTH = 40;

const BUILT_IN_IDS = new Set(PRESETS.map((preset) => preset.id));
const STOCK_NAMES = PRESETS.map((preset) => preset.name.toLowerCase());

/** Empty store — also the fallback when storage is unavailable or corrupt. */
export function emptyPresetStore() {
  return { userPresets: [] };
}

/** Coerce a partial/raw store into the shape we expect. */
function asStore(store) {
  const userPresets =
    store && typeof store === 'object' && Array.isArray(store.userPresets)
      ? store.userPresets
      : [];
  return { userPresets };
}

/** Trim, collapse internal whitespace and cap at the character limit. */
export function sanitizePresetName(raw) {
  if (typeof raw !== 'string') return '';
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  return Array.from(collapsed).slice(0, MAX_PRESET_NAME_LENGTH).join('').trim();
}

function makePresetId(existingIds = new Set()) {
  const base = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let id = base;
  let suffix = 1;
  while (existingIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function isUserId(value) {
  return typeof value === 'string' && /^user-[a-z0-9-]+$/i.test(value);
}

/** Normalize a config into the `{name, mode, patch}` record we persist. */
function createPresetRecord({ name, config }) {
  const normalized = normalizeConfig(config);
  const { mode, ...patch } = normalized;
  return { name: sanitizePresetName(name), mode, patch };
}

/** Build a new user preset, optionally with an explicit id (used by tests). */
export function createUserPreset({ name, config, id, existingIds } = {}) {
  const ids = existingIds instanceof Set ? existingIds : new Set();
  return {
    id: isUserId(id) && !ids.has(id) ? id : makePresetId(ids),
    ...createPresetRecord({ name, config }),
  };
}

/** Shipped presets in their fixed order, followed by the user's presets. */
export function resolvePresets(store) {
  return [...PRESETS, ...asStore(store).userPresets];
}

/** Case-insensitive uniqueness across stock built-in names and user names. */
export function isPresetNameTaken(name, store, excludeId = null) {
  const clean = sanitizePresetName(name).toLowerCase();
  if (!clean) return false;

  const excluded = new Set(excludeId ? [excludeId] : []);
  const taken = [
    ...PRESETS.map((preset) => preset.name),
    ...asStore(store)
      .userPresets.filter((preset) => !excluded.has(preset.id))
      .map((preset) => preset.name),
  ];

  return taken.some((entry) => entry.toLowerCase() === clean);
}

/** Append a new user preset. */
export function addUserPreset(store, { name, config, id } = {}) {
  const safe = asStore(store);
  const existingIds = new Set([...BUILT_IN_IDS, ...safe.userPresets.map((preset) => preset.id)]);
  const preset = createUserPreset({ name, config, id, existingIds });
  return { ...safe, userPresets: [...safe.userPresets, preset] };
}

/** Replace a user preset in place, keeping its position. */
export function updateUserPreset(store, id, { name, config } = {}) {
  const safe = asStore(store);
  return {
    ...safe,
    userPresets: safe.userPresets.map((preset) =>
      preset.id === id ? { id, ...createPresetRecord({ name, config }) } : preset,
    ),
  };
}

/** Remove a user preset. Built-in presets cannot be deleted. */
export function deleteUserPreset(store, id) {
  const safe = asStore(store);
  return {
    ...safe,
    userPresets: safe.userPresets.filter((preset) => preset.id !== id),
  };
}

/**
 * Repair whatever localStorage returned. Bad user presets are dropped and
 * legacy built-in override/deletion keys are ignored. Never throws.
 */
export function sanitizePresetStore(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyPresetStore();
  }

  const users = [];
  const userIds = new Set();
  const usedNames = new Set(STOCK_NAMES);
  const rawUsers = Array.isArray(raw.userPresets) ? raw.userPresets : [];

  for (const entry of rawUsers) {
    if (users.length >= MAX_USER_PRESETS) break;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

    const name = sanitizePresetName(entry.name);
    if (!name) continue;
    const nameKey = name.toLowerCase();
    if (usedNames.has(nameKey)) continue;

    let id = isUserId(entry.id) ? entry.id : null;
    if (!id || userIds.has(id) || BUILT_IN_IDS.has(id)) {
      id = makePresetId(new Set([...userIds, ...BUILT_IN_IDS]));
    }

    const normalized = normalizeConfig({
      ...DEFAULT_CONFIG,
      ...(entry.patch && typeof entry.patch === 'object' && !Array.isArray(entry.patch)
        ? entry.patch
        : {}),
      mode: entry.mode ?? DEFAULT_CONFIG.mode,
    });
    const { mode, ...patch } = normalized;

    users.push({ id, name, mode, patch });
    userIds.add(id);
    usedNames.add(nameKey);
  }

  return { userPresets: users };
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Read + sanitize the store. Missing/corrupt/blocked storage yields defaults. */
export function loadPresetStore(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(PRESET_STORE_KEY);
    if (!raw) return emptyPresetStore();
    return sanitizePresetStore(JSON.parse(raw));
  } catch {
    return emptyPresetStore();
  }
}

/** Persist the store. Returns false on quota/security/availability errors. */
export function persistPresetStore(store, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(PRESET_STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
