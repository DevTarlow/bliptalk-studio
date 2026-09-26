# itch.io project setup

Everything needed to create the BlipTalk Studio page on itch.io. Copy the text
straight out of the fenced blocks.

---

## 1. Before you start

Build and package the upload:

```bash
npm run package:itch
```

This writes `bliptalk-studio-itch.zip` (about 292 KB) with `index.html` at the
zip root. itch.io requires that layout for HTML projects.

Artwork is in `itch-assets/`:

| File | Size | Used for |
| --- | --- | --- |
| `cover-630x500.png` | 1260 × 1000 | Cover image (required) |
| `screenshot-1-interface.png` | 1800 × 1668 | Screenshot 1 |
| `screenshot-2-playback.png` | 1800 × 1668 | Screenshot 2 |
| `screenshot-3-animalese.png` | 1800 × 1668 | Screenshot 3 |

---

## 2. Project fields

itch relabels things occasionally, so match on meaning rather than exact wording.

| Field | Value |
| --- | --- |
| **Title** | `BlipTalk Studio` |
| **Project URL** | `bliptalk-studio` → `devtarlow.itch.io/bliptalk-studio` |
| **Classification** | `Tools` |
| **Release status** | `Released` |
| **Pricing** | `$0 or donate` |
| **Uploads** | `bliptalk-studio-itch.zip` |
| **"This file will be played in the browser"** | ✅ checked |
| **Embed viewport** | width `900`, height `840` |
| **Fullscreen button** | ✅ checked |
| **Mobile friendly** | ✅ checked (layout is responsive; it scrolls on phones) |
| **Genre** | leave blank (only applies to Games) |
| **Content warnings / maturity** | none |
| **Comments** | your call; on is friendlier for a tool |

**Why 840 high:** the app's content measures exactly 834 px tall at 900 px wide,
so 840 gives a clean fit with no scrollbar. If you change the viewport later,
check for a scrollbar inside the embed.

### Tags

itch allows 10. These are the ones people actually search:

```
tool, audio, sound, chiptune, 8-bit, retro, generator, voice, game-development, rpg
```

---

## 3. Description

Paste this into the description box. The lines in capitals are section titles,
so select them and apply itch's heading style if you want them to stand out.

```
Turn typed text into retro dialogue sounds, right in your browser.

BlipTalk Studio is a free tool for game makers who need a voice for their
characters without recording one. Type a line, pick a voice, press play, and
save the result as a WAV file for your game.

It runs in your browser. Nothing to install, and the text you type is never
uploaded anywhere.

THREE VOICES

8-Bit Chiptune - Classic NES and Game Boy bleeps. One short, pitched tone per
character. For RPG text boxes, retro menus and arcade games.

Animalese - Fast chatter that copies the rhythm of speech, one small syllable
per letter. For cute and life-sim characters.

Retro Noise / Robotic - Buzzy, crunchy and metallic, like a voice coming
through a broken speaker. For robots, computers and villains.

These are not real text-to-speech, so you will not get understandable words.
They are the short voice blips games play while dialogue types onto the screen.

HOW TO USE IT

1. Type a line into the script box.
2. Pick one of five presets, or tune the sliders yourself.
3. Press Play, or hit the Spacebar, and watch the line type itself out.
4. Export the line as a WAV file, or export a pack of single blips for your game
   code to trigger.

WHAT YOU CAN CHANGE

Base pitch, speed, pitch variation, volume, note length, tone and waveform.
Leave punctuation intonation on and questions rise, exclamations lift, and full
stops fall, each with a natural pause.

PRESETS

Cozy Animal, Sarcastic Robot, 8-Bit Hero, Dark Wizard and Fairy Whispers. Load
one, then adjust from there.

WHAT YOU GET

Export WAV File saves the whole line as a standard mono WAV file. It works in
Unity, Godot, GameMaker, RPG Maker and anything else that plays WAV.

Export Blip Pack saves five single-character blips you can trigger one at a
time as text types out. The pitched voices give you a five-note scale, and
Animalese gives you the five vowel sounds.

GOOD TO KNOW

- Free, no account, works on desktop and mobile browsers.
- Your text never leaves your computer. Everything is generated in the browser.
- The sounds you make are yours, including in commercial games. No credit needed.
- Made with the Web Audio API. No samples, no plugins, no server.
```

### Short blurb

For social previews, devlogs or anywhere that wants one line:

```
Type a line of dialogue, pick a retro voice, and export it as a WAV file for
your game. Chiptune blips, Animalese chatter and robotic static, all generated
in your browser.
```

---

## 4. Credits

The Credits field is optional but worth filling:

```
Made by DevTarlow.
Built with React, Vite, Tailwind CSS and the Web Audio API.
All sound is synthesised at runtime. No samples were used.
```

---

## 5. AI content disclosure

itch asks whether a project contains AI-generated content. The honest position
here, and the wording if you enable the flag:

```
The application code was written with AI assistance. All audio is generated at
runtime by classic DSP synthesis (oscillators, formant filters, noise shaping).
No AI models are used to produce sound or to process anything you type, and no
AI-generated art, music or text is included.
```

The sounds themselves are produced by deterministic signal processing routines,
not by a generative model, so nothing in the output is AI-generated.

---

## 6. After publishing

Three things to check on the live page, in order:

1. **Do the export buttons work inside the itch embed?** This is the one real
   risk. itch serves HTML projects inside a sandboxed iframe, and the sandbox
   has to permit downloads for the WAV buttons to fire. Click *Play* first to
   unlock audio, then try **Export WAV File** and **Export Blip Pack**.
   If downloads are blocked, use the **Fullscreen** button on the page and test
   again there. If they are blocked in both, add a line to the description
   pointing people at the fullscreen view, or host the app standalone and link
   to it.
2. **No scrollbar in the embed.** If one appears, raise the viewport height by
   20 px.
3. **Audio unlocks on the first click.** The badge in the top right should
   change from *Click to enable audio* to *Audio ready*.

Also worth doing once it is live: paste the published URL into the README,
where there is a marked placeholder waiting for it.
