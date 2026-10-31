/** Inline form for naming, saving and updating user presets. */

import { useId, useState } from 'react';

import { MAX_PRESET_NAME_LENGTH } from '../audio/presetStore.js';

export default function SavePresetForm({
  initialName = '',
  updatePreset = null,
  readOnlySourceName = null,
  onSave,
  onCancel,
}) {
  const inputId = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const trimmed = name.trim();

  const submit = (target) => {
    const result = onSave({ name: trimmed, target });
    if (!result.ok) setError(result.error || 'Could not save that preset.');
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <form
      className="mt-2 w-full border-t-2 border-slate-800 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) submit({ kind: 'new' });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          handleCancel();
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={inputId} className="min-w-[180px] flex-1">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Preset name
          </span>
          <input
            id={inputId}
            type="text"
            className="retro-input"
            value={name}
            maxLength={MAX_PRESET_NAME_LENGTH}
            placeholder="Name this patch…"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError('');
            }}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={!trimmed}>
          Save as new
        </button>

        {updatePreset ? (
          <button
            type="button"
            className="btn btn-amber"
            disabled={!trimmed}
            title={`Save your changes to “${updatePreset.name}”`}
            onClick={() => submit({ kind: 'user', id: updatePreset.id })}
          >
            Update “{updatePreset.name}”
          </button>
        ) : null}

        <button type="button" className="btn btn-ghost" onClick={handleCancel}>
          Cancel
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-[10px] leading-relaxed text-rose-300">
          {error}
        </p>
      ) : null}
      <p className="mt-1 text-[9px] leading-relaxed text-slate-600">
        {readOnlySourceName
          ? `Built-in presets are read-only — saving creates your own copy of “${readOnlySourceName}”. `
          : ''}
        Stored in this browser only — never uploaded. Stock built-in names are reserved.
      </p>
    </form>
  );
}
