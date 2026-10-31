/** Preset bar — fixed built-in presets plus the user's own saved patches. */

import { useRef, useState } from 'react';
import { DatabaseBackup, Download, Save, Trash2, Upload } from 'lucide-react';

import { MODES } from '../audio/presets.js';
import SavePresetForm from './SavePresetForm.jsx';

const MODE_LABEL = Object.fromEntries(MODES.map((mode) => [mode.id, mode.label]));

function presetTitle(preset) {
  const pitch = preset.patch?.basePitch;
  const speed = preset.patch?.speed;
  const details =
    pitch !== undefined && speed !== undefined ? ` — ${pitch} Hz, ${speed} ms` : '';
  return `${MODE_LABEL[preset.mode] ?? preset.mode}${details}`;
}

function PresetChip({ preset, active, onApply, onDelete }) {
  return (
    <span className="flex items-stretch">
      <button
        type="button"
        className="chip-btn"
        data-active={active}
        title={presetTitle(preset)}
        onClick={() => onApply(preset.id)}
      >
        {preset.name}
      </button>
      {onDelete ? (
        <button
          type="button"
          className="chip-del"
          aria-label={`Delete preset ${preset.name}`}
          title={`Delete preset “${preset.name}”`}
          onClick={() => onDelete(preset)}
        >
          <Trash2 size={10} strokeWidth={2.5} />
        </button>
      ) : null}
    </span>
  );
}

function DeleteConfirm({ preset, onConfirm, onCancel }) {
  return (
    <span
      role="group"
      aria-label={`Delete preset ${preset.name}`}
      className="flex items-center gap-1 border-2 border-rose-900 bg-rose-500/10 px-1.5 py-0.5"
    >
      <span className="min-w-0 break-words text-[9px] font-bold uppercase tracking-[0.08em] text-rose-200">
        Delete “{preset.name}”?
      </span>
      <button type="button" className="chip-confirm chip-confirm-yes" onClick={onConfirm}>
        Yes
      </button>
      <button type="button" className="chip-confirm" onClick={onCancel}>
        No
      </button>
    </span>
  );
}

export default function PresetBar({
  builtIns = [],
  userPresets = [],
  activeId,
  sourcePreset = null,
  onApply,
  onSave,
  onDelete,
  onExportPresets = () => {},
  onImportPresets = () => {},
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileInputRef = useRef(null);

  const updatePreset = userPresets.find((preset) => preset.id === sourcePreset?.id) ?? null;
  const readOnlySourceName = sourcePreset && !updatePreset ? sourcePreset.name : null;

  const handleApply = (id) => {
    setSaveOpen(false);
    setBackupOpen(false);
    setDeleteTarget(null);
    onApply(id);
  };

  const handleDeleteRequest = (preset) => {
    setBackupOpen(false);
    setDeleteTarget(preset);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDelete(deleteTarget.id);
    setDeleteTarget(null);
    setSaveOpen(false);
    setBackupOpen(false);
  };

  const handleSave = (payload) => {
    const result = onSave(payload);
    if (result.ok) setSaveOpen(false);
    return result;
  };

  const openBackup = () => {
    setSaveOpen(false);
    setDeleteTarget(null);
    setBackupOpen(true);
  };

  const handleBackupKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setBackupOpen(false);
    }
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImportPresets(file);
  };

  return (
    <section className="panel panel-accent-amber flex flex-wrap items-center gap-1.5 px-3 py-2">
      <span className="panel-label mr-1 text-amber-500">Presets</span>

      {builtIns.map((preset) => (
        <PresetChip
          key={preset.id}
          preset={preset}
          active={preset.id === activeId}
          onApply={handleApply}
        />
      ))}

      {userPresets.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="mx-1 h-4 w-px bg-slate-800" aria-hidden="true" />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
            Yours
          </span>
          {userPresets.map((preset) =>
            deleteTarget?.id === preset.id ? (
              <DeleteConfirm
                key={preset.id}
                preset={preset}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
              />
            ) : (
              <PresetChip
                key={preset.id}
                preset={preset}
                active={preset.id === activeId}
                onApply={handleApply}
                onDelete={handleDeleteRequest}
              />
            ),
          )}
        </span>
      ) : null}

      <button
        type="button"
        className="chip-btn chip-save"
        title="Save the current patch as one of your own presets"
        onClick={() => {
          setSaveOpen(true);
          setBackupOpen(false);
          setDeleteTarget(null);
        }}
      >
        <Save size={10} strokeWidth={2.5} />
        Save current
      </button>

      <button
        type="button"
        className="chip-btn"
        title="Export or import your presets as a JSON file"
        onClick={openBackup}
      >
        <DatabaseBackup size={10} strokeWidth={2.5} />
        Backup
      </button>

      {activeId === null ? (
        <span className="ml-auto text-[9px] uppercase tracking-[0.12em] text-slate-600">
          custom patch
        </span>
      ) : null}

      {userPresets.length === 0 && !saveOpen && !backupOpen ? (
        <p className="mt-1 w-full text-[9px] leading-relaxed text-slate-600">
          Save the current patch to reuse it later. Presets stay in this browser.
        </p>
      ) : null}

      {backupOpen ? (
        <div
          className="mt-2 w-full border-t-2 border-slate-800 pt-2"
          onKeyDown={handleBackupKeyDown}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Presets file
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onExportPresets}
              disabled={userPresets.length === 0}
              title={
                userPresets.length === 0
                  ? 'Save a preset first'
                  : 'Download your own presets as a JSON file'
              }
            >
              <Download size={12} strokeWidth={2.5} />
              Export JSON
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Import presets from a BlipTalk Studio JSON file"
            >
              <Upload size={12} strokeWidth={2.5} />
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              aria-label="Import presets from a JSON file"
              onChange={handleImportFile}
            />
            <button type="button" className="btn btn-ghost" onClick={() => setBackupOpen(false)}>
              Close
            </button>
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-slate-600">
            Export saves your own presets only. Import merges them and keeps existing names.
          </p>
        </div>
      ) : null}

      {saveOpen ? (
        <SavePresetForm
          key={sourcePreset?.id ?? 'no-source'}
          initialName={updatePreset?.name ?? ''}
          updatePreset={updatePreset}
          readOnlySourceName={readOnlySourceName}
          onSave={handleSave}
          onCancel={() => setSaveOpen(false)}
        />
      ) : null}
    </section>
  );
}
