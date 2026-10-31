# BlipTalk Studio

**Turn typed text into retro dialogue sounds, right in your browser.**

BlipTalk Studio is a free tool for game makers who need a voice for their
characters without recording one. Type a line, pick a voice, press play, and
save the result as a WAV file you can drop into your game.

It runs entirely in your browser. The text you type is never uploaded anywhere.

![BlipTalk Studio](screenshot.png)

---

## Play it now

**[Play BlipTalk Studio on itch.io](https://tarlow.itch.io/bliptalk-studio)**

Free, and it runs in your browser. Nothing to install.

---

## Make your first sound

1. **Type a line** into *Your Script*, or keep the one that is already there.
2. **Pick a preset** from the bar near the bottom. Try **8-Bit Hero**.
3. **Press Play Dialogue**, or hit the **Spacebar**. The text types itself out
   in the preview box, one blip per character.
4. **Export WAV File** to save the sound, or **Export Blip Pack** if you want
   individual blips to trigger from your game code.

Everything after this section is optional.

---

## The three voices

Switch tabs at the top to hear the same line in each one.

| Voice | What it sounds like | Good for |
| --- | --- | --- |
| **8-Bit Chiptune** | Classic NES or Game Boy bleeps. One short, pitched tone per character. | RPG text boxes, retro menus, arcade games. The *Undertale* or *Pokémon* feel. |
| **Animalese** | Fast chatter that copies the rhythm of speech. Every letter is a short syllable with a small tick in front of it. | Cute and life-sim characters. The *Animal Crossing* feel. |
| **Retro Noise/Robotic** | Buzzy, crunchy and metallic, like a voice coming through a broken speaker. | Robots, computers, radios, villains, announcements. |

These are not real text-to-speech, so you will not get understandable words.
They are the short voice blips games play while dialogue types onto the screen.

---

## The controls

You can ignore all of these and still get a usable sound. Here is what each one
does.

Every slider also has a number box beside it. Type a value and press **Enter**
(or click away) to jump straight to it. Typed values snap to the slider's step
and clamp to its range, so `123` on Base Pitch becomes 125 Hz and `9999`
becomes 1200 Hz. Invalid text simply reverts to the previous value.

| Control | What it does | Try this |
| --- | --- | --- |
| **Base Pitch** | How high or low the voice sits. In Animalese it changes the voice completely, from a growly bear to a squeaky fairy. | 120–250 Hz for big monsters, 500–700 Hz for heroes, 900 Hz and up for tiny creatures. |
| **Speed / Interval** | How long each character lasts, in milliseconds. Lower is faster. | 30–45 ms is brisk, 60–80 ms is relaxed, 100 ms and up is slow and dramatic. |
| **Pitch Variation** | How much the pitch wanders from one character to the next. At 0 the voice is flat and machine-like. Higher values sound more alive. | 10–20 Hz for a steady hero, 40–70 Hz for a chatty character, 150 Hz and up for panic. |
| **Volume** | Output level, for both playback and exports. | Leave it near 80% and set the final volume in your game. |
| **Envelope Decay** | How long each blip rings on for, in milliseconds. Short is crisp, long is smooth and blended. | 40–80 ms for crisp retro blips, 200–400 ms for a spooky, echoing voice. |
| **Formant / Crush** | Changes the tone. In Animalese it makes the vowel sound deeper or brighter. In Robotic it sets how harsh the distortion is. | 0.7 for deep and muffled, 1.0 for neutral, 1.6 and up for bright and thin. |
| **Waveform** | The shape of the tone: Square, Triangle, Saw, Sine or Noise. In Animalese it changes how bright the vowels sound. | Square for classic 8-bit, Triangle or Sine for soft, Saw for harsh, Noise for static. |
| **Punctuation Intonation** | When on, `?` rises 150 Hz, `!` rises 100 Hz, and `.` and `,` fall slightly, with a longer pause after each. | Keep it on for dialogue. Turn it off for menu ticks and robotic voices. |

Two of these only apply to certain voices:

- **Envelope Decay** does nothing in Animalese. There, blip length follows
  **Speed** instead.
- **Formant / Crush** does nothing in 8-Bit Chiptune. In Animalese it changes
  the vowel sound, and in Robotic it changes the distortion.

---

## Presets

Five built-in presets ship with the app. Each one sets every slider at once and
switches to the matching voice. They are read-only: once you change any control
the bar reads *custom patch*, and the built-in itself stays unchanged.

| Preset | Voice | Character |
| --- | --- | --- |
| **Cozy Animal** | Animalese | Warm, mid-pitched, friendly. The shopkeeper. |
| **Sarcastic Robot** | Robotic | Low, slow, distorted. Deadpan. |
| **8-Bit Hero** | Chiptune | Bright, fast, crisp. The classic RPG protagonist. |
| **Dark Wizard** | Chiptune | Very low and slow, with harsh, long-ringing notes. |
| **Fairy Whispers** | Animalese | Very high, very fast, soft. Small and magical. |

### Your own presets

Open **Save current**, type a name, and choose **Save as new**. Your preset
appears under **Yours** in the Presets bar. Load it, tweak it, and choose
**Update “…”** to save the changes, or rename it in the same box. The trash
button deletes it. You can keep up to 40 of your own presets.

If a built-in preset is loaded, **Save current** saves a new copy of it — the
built-in itself cannot be edited or deleted.

Your presets are stored in this browser only (localStorage). They stay on this
device and browser, are never uploaded, and disappear if you clear the site's
data. Built-in preset names are reserved, so pick a name that is not already in
the bar. Use **Backup** if you want to move them somewhere else.

### Backing up your presets

Open **Backup** in the Presets bar and choose **Export JSON**. The file holds
your own presets only; the five built-ins always ship with the app. To restore,
choose **Backup → Import JSON**. Import adds presets to what is already there
and skips names already in use, so nothing is overwritten. The file stays on
your computer, the same as everything else here.

### Your last line

The voice settings you last used are remembered in this browser. The current
line is kept for the tab, so a refresh does not lose it. Closing the tab clears
the line. Neither is uploaded anywhere.

---

## Saving your sounds

### Export WAV File

Downloads **`dialogue_blip.wav`**: the line you just heard, as a standard mono
WAV file. It works in Unity, Godot, GameMaker, RPG Maker and anything else that
plays WAV.

The file includes the pauses that punctuation creates, so it lines up with the
text typing on screen. For a tighter file, turn **Punctuation Intonation** off
and export again.

The same line with the same settings always sounds the same, so you can
re-export without the sound changing underneath you.

### Export Blip Pack

Downloads five WAV files, one per character, for triggering blips from your own
code as text types out. Which five you get depends on the voice:

| Voice | The five files |
| --- | --- |
| 8-Bit Chiptune / Robotic | A five-note scale: `blip_1_root`, `blip_2_second`, `blip_3_third`, `blip_4_fifth`, `blip_5_sixth`. Play them in order for a rising menu cursor, or use just the root for typing. |
| Animalese | The five vowel sounds: `blip_1_a`, `blip_2_e`, `blip_3_i`, `blip_4_o`, `blip_5_u`. Play one per character for a simple Animalese effect in your engine. |

Your browser will probably ask permission to download multiple files the first
time. Allow it and all five will arrive.

If you would rather not deal with the permission prompt, click **ZIP** beside
**Export Blip Pack**. It downloads `bliptalk-blip-pack.zip`, a single archive
containing the same five WAVs.

### Using the sounds in your game

Use them in anything you like, including commercial games. No credit needed.

---

## Recipes

Load a preset, then change the slider listed.

- **Friendly shopkeeper**: *Cozy Animal*, Pitch Variation up to about 35 Hz.
- **Retro RPG hero**: *8-Bit Hero*, no changes needed.
- **Terrifying final boss**: *Dark Wizard*, drop Base Pitch to about 120 Hz and
  raise Envelope Decay to about 400 ms.
- **Broken robot**: *Sarcastic Robot*, pull Formant/Crush down to about 0.5.
- **Menu cursor ticks**: 8-Bit Chiptune, Speed about 20 ms, Envelope Decay
  about 40 ms. Then Export Blip Pack and play one blip per cursor move.
- **Calm narrator**: Triangle waveform, Pitch Variation 0, Envelope Decay
  about 200 ms, Speed about 70 ms.
- **Panicking character**: Pitch Variation 150–200 Hz, Speed about 25 ms.

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play or stop the line. Ignored while you are typing in the text box or when another button has keyboard focus. |
| `Esc` | Stop. While editing a number box or a preset name, cancels the edit instead. |

The main Play button reads **Restart** while a line is playing and starts the
line again from the beginning. `Space` still toggles play and stop.

---

## Common questions

**I pressed Play but there is no sound.**
Browsers block audio until you interact with the page. Click anywhere on the
page once, then press Play again. The badge in the top-right corner changes
from *Click to enable audio* to *Audio ready* when it works.

**Only one file downloaded from the blip pack.**
Your browser asks permission before allowing multiple downloads. Allow it, then
click Export Blip Pack again. Or click **ZIP** to download the same five WAVs
as one archive.

**The exported file sounds wrong or too quiet.**
Check the Volume slider first, since it applies to exports as well as playback.
Then make sure the sliders match what you were listening to.

**Why is the text limited to 600 characters?**
It is built for single lines of dialogue, not paragraphs. Short lines also
export faster.

**Is my text uploaded anywhere?**
No. Everything is generated inside your browser, and the app works offline once
the page has loaded.

**Is my last line saved?**
The current line is kept in this tab's session storage, so a refresh does not
lose it. Closing the tab clears it. Your voice settings are kept in this
browser. Neither is uploaded.

**Where are my saved presets?**
In this browser's local storage. They are not tied to an account and do not
travel between browsers or devices unless you use **Backup**.

**Can I move my presets to another browser?**
Yes. Open **Backup → Export JSON** in the Presets bar, then use **Backup →
Import JSON** in the other browser. Import merges with what is already there
and skips names already in use.

**Can I edit the built-in presets?**
No. The five stock presets are fixed. Load one, tune it, then use **Save
current → Save as new** to keep your own version. From then on you can update
or delete your copy under **Yours**.

**Which browsers work?**
Chrome, Edge, Firefox and Safari. Anything from the last few years should work.
On iPhone and iPad you have to tap the page once before sound will play.

**Can I use this in a commercial game?**
Yes. The tool is free and the sounds you make with it are yours.

---

## License

MIT. See [LICENSE](LICENSE) for the full text.
