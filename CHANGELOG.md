# Changelog

All notable changes to BlipTalk Studio are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
semantic versioning.

## [1.1.0] - 2026-10-31

### Added

- Save your own presets alongside the five built-ins, with update, rename and
  delete. User presets stay in this browser under `bliptalk-studio:presets:v1`.
- Editable number boxes beside every slider. Typed values snap to the slider
  step and clamp to the range.
- Preset backup and restore as a portable JSON file. Export writes your own
  presets only; import merges them, skips duplicate names, and respects the
  40-preset limit.
- Last-session restore. Voice settings are remembered in the browser; the
  current line is kept for the tab so a refresh does not lose it.
- One-file ZIP export for the blip pack. The existing five-WAV export is
  unchanged.
- Estimated line duration beside the script character count.
- Visible app version in the footer.
- Mode-specific hints on the two controls that do not apply to every voice.

### Fixed

- The primary transport button now restarts the line while it is playing,
  matching its Restart label. Spacebar still toggles play/stop.
- Spacebar no longer hijacks a focused button, input, link, or other interactive
  control.
- Status messages are announced with `role="status"` and `aria-live="polite"`.
- The itch packaging script now removes the previous archive before zipping, so
  a rebuild cannot upload stale hashed assets.

### Documentation

- README covers preset backup, tab-scoped draft recovery, ZIP export, and the
  new keyboard behavior.
- ITCH.md carries the live description plus the 1.1.0 insertions and a new
  v1.1.0 devlog draft.

## [1.0.0] - 2026-10-24

Initial release: 8-Bit Chiptune, Animalese, and Retro Noise/Robotic voices;
punctuation intonation; five built-in presets; WAV line export; five-file blip
pack export; browser-only synthesis with no samples or network calls.
