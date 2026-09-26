# BlipTalk Studio

**Turn typed text into retro dialogue sounds — right in your browser.**

BlipTalk Studio is a free tool for game makers who need a voice for their
characters without recording one. Type a line, pick a voice, press play, and
export the result as a WAV file you can drop straight into your game.

No install, no account, no sign-up — and nothing you type ever leaves your
computer.

![BlipTalk Studio](screenshot.png)

---

## Play it now

<!-- TODO: paste the itch.io link here once the page is live -->

Open BlipTalk Studio in your browser and start typing.

---

## Make your first sound

1. **Type a line** into *Your Script* — or keep the one that's already there.
2. **Pick a preset** from the bar near the bottom (try **8-Bit Hero**).
3. **Press Play Dialogue**, or just hit the **Spacebar**.
   The text types itself out in the preview box, one blip per character.
4. **Export WAV File** to download the sound, or **Export Blip Pack** if you
   want individual blips to trigger from your game code.

That's the whole loop. Everything below is optional fine-tuning.

---

## The three voices

Switch anytime with the tabs at the top — the sound changes instantly, so it's
worth clicking through all three with the same line.

| Voice | What it sounds like | Good for |
| --- | --- | --- |
| **8-Bit Chiptune** | Classic NES / Game Boy bleeps. One short, pitched tone per character. | RPG text boxes, retro menus, arcade games — the *Undertale* / *Pokémon* feel. |
| **Animalese** | Fast chatter that mimics the rhythm of speech. Every letter is a tiny syllable with a consonant tick in front of it. | Cute and life-sim characters — the *Animal Crossing* feel. |
| **Retro Noise/Robotic** | Buzzy, crunchy and metallic, like a voice coming through a broken speaker. | Robots, computers, radios, villains, announcements. |

None of these are real text-to-speech — you won't get understandable words.
They're stylised "voice blips", the sounds games use while dialogue types
itself onto the screen.

---

## The controls, explained

You don't need to touch any of these to get a good result, but this is what
each one actually does.

| Control | What it does | Try this |
| --- | --- | --- |
| **Base Pitch** | How high or low the voice sits. In Animalese it changes the whole character of the voice, from a growly bear to a squeaky fairy. | 120–250 Hz for big monsters, 500–700 Hz for heroes, 900 Hz+ for tiny creatures. |
| **Speed / Interval** | How long each character lasts, in milliseconds. Lower = faster talking. | 30–45 ms is brisk, 60–80 ms is relaxed, 100 ms+ is slow and dramatic. |
| **Pitch Variation** | How much the pitch wanders randomly from character to character. At 0 the voice is flat and machine-like; higher values make it sound alive and a bit nervous. | 10–20 Hz for a steady hero, 40–70 Hz for a chatty character, 150 Hz+ for panic. |
| **Volume** | Output level of both playback and exports. | Leave it around 80% and control the final volume inside your game. |
| **Envelope Decay** | How long each blip rings on for, in milliseconds. Short = crisp ticks, long = smooth and blended. | 40–80 ms for crisp retro blips, 200–400 ms for a spooky, echoing voice. |
| **Formant / Crush** | Voice colour. In Animalese it shifts the vowel sound from deep to bright; in Robotic it sets how crunchy the distortion is. | ~0.7 for deep and muffled, 1.0 for neutral, 1.6+ for bright and thin. |
| **Waveform** | The flavour of the buzz: Square, Triangle, Saw, Sine or Noise. In Animalese it changes how bright the vowels are. | Square for classic 8-bit, Triangle/Sine for soft and pretty, Saw for harsh, Noise for static. |
| **Punctuation Intonation** | When on, `?` rises 150 Hz, `!` rises 100 Hz, and `.` `,` fall slightly — with a longer pause after each. Turn it off for flat, even delivery. | Keep it on for dialogue, turn it off for menu ticks and robotic voices. |

Two of these are mode-specific, so don't be surprised if they seem to do
nothing:

- **Envelope Decay** doesn't affect Animalese — there, blip length follows
  **Speed** instead.
- **Formant / Crush** doesn't affect 8-Bit Chiptune. It's a formant control in
  Animalese and a distortion control in Robotic.

---

## Presets

Five starting points, each one a full recipe you can then tweak. Loading a
preset also switches to its voice automatically. As soon as you move any
slider the bar shows *custom patch* — your tweaks are never overwritten.

| Preset | Voice | Character |
| --- | --- | --- |
| **Cozy Animal** | Animalese | Warm, mid-pitched, friendly. The shopkeeper. |
| **Sarcastic Robot** | Robotic | Low, slow, distorted. Deadpan delivery. |
| **8-Bit Hero** | Chiptune | Bright, fast, crisp. The classic RPG protagonist. |
| **Dark Wizard** | Chiptune | Very low, slow, harsh, long ringing notes. |
| **Fairy Whispers** | Animalese | Very high, very fast, soft. Small and magical. |

---

## Exporting

### Export WAV File

Downloads **`dialogue_blip.wav`** — the exact line you just heard, as a mono
16-bit PCM WAV at your browser's sample rate (44.1 or 48 kHz). Drop it into
Unity, Godot, GameMaker, RPG Maker, or anything else that plays WAV.

The file includes the pauses that punctuation creates, so it lines up with the
text typing on screen. If you want a tighter file, turn **Punctuation
Intonation** off and export again.

Exporting the same line twice gives you the same file, so it's safe to
re-export after a tweak without your game's audio changing at random.

### Export Blip Pack

Downloads **five separate one-character WAVs** — the raw building blocks for
triggering blips from your own code, one per character as your text types out.
The five files change depending on the voice:

| Voice | The five blips |
| --- | --- |
| 8-Bit Chiptune / Robotic | A five-note scale: `blip_1_root`, `blip_2_second`, `blip_3_third`, `blip_4_fifth`, `blip_5_sixth`. Play them in order for a rising menu cursor, or use just the root for typing. |
| Animalese | The five vowel sounds: `blip_1_a`, `blip_2_e`, `blip_3_i`, `blip_4_o`, `blip_5_u`. Pick one per character for a cheap Animalese effect in your engine. |

Your browser will probably ask permission to download multiple files the first
time — allow it and all five will land.

### Using the sounds in your game

The sounds you generate are yours: use them in commercial and non-commercial
projects, no attribution needed.

---

## Recipes

Copy these by loading a preset, then adjusting the slider mentioned.

- **Friendly shopkeeper** — *Cozy Animal*, Pitch Variation up to ~35 Hz.
- **Retro RPG hero** — *8-Bit Hero*, leave it alone.
- **Terrifying final boss** — *Dark Wizard*, drop Base Pitch to ~120 Hz and
  push Envelope Decay to ~400 ms.
- **Broken robot** — *Sarcastic Robot*, pull Formant/Crush down to ~0.5.
- **Menu cursor ticks** — 8-Bit Chiptune, Speed ~20 ms, Interval very short,
  Envelope Decay ~40 ms, then Export Blip Pack and play one blip per cursor
  move.
- **Calm narrator** — Triangle waveform, Pitch Variation 0, Envelope Decay
  ~200 ms, Speed ~70 ms.
- **Panicking character** — Pitch Variation 150–200 Hz, Speed ~25 ms.

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / stop the line (ignored while you're typing in the text box) |
| `Esc` | Stop |

---

## Questions

**I pressed Play but there's no sound.**
Browsers block audio until you interact with the page. Click anywhere on the
page once — the badge in the top-right corner should switch from *Click to
enable audio* to *Audio ready*. Then press Play again.

**Only one file downloaded from the blip pack.**
Your browser asks for permission before allowing multiple downloads; allow it
and click Export Blip Pack again.

**The exported file sounds wrong / too quiet.**
Check the Volume slider — it applies to exports too. And make sure you're
exporting the same settings you were just listening to.

**The text is limited to 600 characters.**
That's deliberate. This is built for single lines of dialogue, not paragraphs —
a shorter line is also much quicker to export.

**Does this send my text anywhere?**
No. Everything is generated locally by your browser's audio engine, and the app
works offline once the page has loaded.

**Which browsers work?**
Chrome, Edge, Firefox and Safari — anything from the last few years. On iPhone
and iPad you need to tap the page once before sound will play.

**Can I use this for a commercial game?**
Yes. The tool is free and the sounds you make with it are yours.

---

## License

MIT. See the repository for details.
