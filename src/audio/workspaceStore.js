/**
 * BlipTalk Studio — last-session workspace.
 *
 * Two stores on purpose:
 *   - voice state (config + source preset) in localStorage, because it is not
 *     sensitive and is useful across sessions;
 *   - the typed line in sessionStorage, because dialogue can be unreleased
 *     story text and itch.io serves HTML games from a shared origin.
 *
 * Both are best-effort: blocked or full storage degrades to defaults without
 * throwing. Pure data/storage helpers, no React.
 */

import { DEFAULT_CONFIG, normalizeConfig } from './intonation.js';
import {
  DEFAULT_PRESET_ID,
  DEFAULT_TEXT,
  MAX_TEXT_LENGTH,
  configFromPreset,
  findPreset,
  presetConfig,
} from './presets.js';

export const WORKSPACE_STORE_KEY = 'bliptalk-studio:workspace:v1';
export const DRAFT_STORE_KEY = 'bliptalk-studio:draft:v1';
export const WORKSPACE_VERSION = 1;

const CONFIG_KEYS = Object.keys(DEFAULT_CONFIG);

/** Default state for a first visit. */
export function defaultWorkspaceState() {
  return {
    text: DEFAULT_TEXT,
    config: presetConfig(DEFAULT_PRESET_ID),
    presetId: DEFAULT_PRESET_ID,
    customized: false,
  };
}

/** Compare two normalised configs field by field. */
export function configsEqual(a, b) {
  return CONFIG_KEYS.every((key) => a?.[key] === b?.[key]);
}

function getStorage(kind) {
  try {
    return kind === 'session'
      ? globalThis.sessionStorage ?? null
      : globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function versionOk(raw) {
  return raw?.version === undefined || (Number.isInteger(raw.version) && raw.version <= WORKSPACE_VERSION);
}

function sanitizeConfigState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.config || typeof raw.config !== 'object' || Array.isArray(raw.config)) return null;
  return {
    config: normalizeConfig(raw.config),
    presetId: typeof raw.presetId === 'string' ? raw.presetId : null,
    customized: raw.customized === true,
  };
}

function sanitizeDraft(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.text !== 'string') return null;
  return { text: Array.from(raw.text).slice(0, MAX_TEXT_LENGTH).join('') };
}

/**
 * Read both stores. Returns null when neither contains usable data, otherwise
 * `{ configState, draft }` with each part independently nullable.
 */
export function loadWorkspace(
  local = getStorage('local'),
  session = getStorage('session'),
) {
  const rawConfig = readJson(local, WORKSPACE_STORE_KEY);
  const rawDraft = readJson(session, DRAFT_STORE_KEY);
  const configState = versionOk(rawConfig) ? sanitizeConfigState(rawConfig) : null;
  const draft = versionOk(rawDraft) ? sanitizeDraft(rawDraft) : null;

  if (!configState && !draft) return null;
  return { configState, draft };
}

/**
 * Turn stored parts into the values App should start with. A stale preset ID
 * becomes a custom patch; a config that no longer matches its source preset is
 * marked custom so the preset bar stays honest.
 */
export function hydrateWorkspace(raw, presets) {
  const defaults = defaultWorkspaceState();
  if (!raw) {
    return { ...defaults, restoredText: false, restoredConfig: false };
  }

  const text = raw.draft ? raw.draft.text : defaults.text;
  let config = raw.configState ? raw.configState.config : defaults.config;
  let presetId = raw.configState ? raw.configState.presetId : defaults.presetId;
  let customized = raw.configState ? raw.configState.customized : defaults.customized;

  if (presetId) {
    const preset = findPreset(presetId, presets);
    if (preset) {
      config = normalizeConfig(config);
      customized = !configsEqual(config, configFromPreset(preset));
    } else {
      presetId = null;
      customized = true;
    }
  }

  const restoredText = Boolean(raw.draft) && text !== defaults.text;
  const restoredConfig =
    Boolean(raw.configState) &&
    (!configsEqual(config, defaults.config) ||
      (presetId !== null && presetId !== defaults.presetId));

  return { text, config, presetId, customized, restoredText, restoredConfig };
}

/**
 * Write both halves. Failures are independent: a blocked localStorage must not
 * stop the tab draft, and vice versa. Never throws.
 */
export function persistWorkspace(
  workspace,
  local = getStorage('local'),
  session = getStorage('session'),
) {
  const configState = {
    version: WORKSPACE_VERSION,
    config: normalizeConfig(workspace?.config ?? DEFAULT_CONFIG),
    presetId: typeof workspace?.presetId === 'string' ? workspace.presetId : null,
    customized: workspace?.customized === true,
  };
  const draft = {
    version: WORKSPACE_VERSION,
    text: Array.from(String(workspace?.text ?? '')).slice(0, MAX_TEXT_LENGTH).join(''),
  };

  let configStored = false;
  let textStored = false;

  try {
    if (local) {
      local.setItem(WORKSPACE_STORE_KEY, JSON.stringify(configState));
      configStored = true;
    }
  } catch {
    configStored = false;
  }

  try {
    if (session) {
      session.setItem(DRAFT_STORE_KEY, JSON.stringify(draft));
      textStored = true;
    }
  } catch {
    textStored = false;
  }

  return { configStored, textStored };
}
