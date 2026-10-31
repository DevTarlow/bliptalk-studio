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
| `banner-1920x312.png` | 1920 × 312 | Page banner (section 6) |
| `bg-grid-tile-34px.png` | 34 × 34 | Page background tile (section 6) |
| `bg-grid-tile-34px@2x.png` | 68 × 68 | Page background tile, 2x |
| `bg-grid-tile-strong-34px.png` | 34 × 34 | Page background tile, stronger lines |
| `bg-page-1920x1200.png` | 1920 × 1200 | Page background, full page |

---

## 2. Project fields

itch relabels things occasionally, so match on meaning rather than exact wording.

| Field | Value |
| --- | --- |
| **Title** | `BlipTalk Studio` |
| **Project URL** | `bliptalk-studio` → `tarlow.itch.io/bliptalk-studio` |
| **Classification** | `Tools` |
| **Release status** | `Released` |
| **Pricing** | `$0 or donate` |
| **Uploads** | `bliptalk-studio-itch.zip` |
| **"This file will be played in the browser"** | ✅ checked |
| **Embed viewport** | width `900`, height `900` |
| **Fullscreen button** | ✅ checked |
| **Mobile friendly** | ✅ checked (layout is responsive; it scrolls on phones) |
| **Genre** | leave blank (only applies to Games) |
| **Content warnings / maturity** | none |
| **Comments** | your call; on is friendlier for a tool |

**Why 900 high:** the 1.1.0 layout measures about 885 px tall at 900 px wide,
so 900 gives a clean fit with no scrollbar. Earlier builds fit in 840; the
preset/backup controls and the extra status line need the new height. Saved
presets wrap in the Presets bar, so a browser with several user presets can
grow taller; the embed will scroll in that case. If you change the viewport
later, check for a scrollbar inside the embed.

### Tags

itch allows 10. These are the ones people actually search:

```
tool, audio, sound, chiptune, 8-bit, retro, generator, voice, game-development, rpg
```

---

## 3. Description

Paste this into the description box. The lines in capitals are section titles,
so select them and apply itch's heading style if you want them to stand out.
Keep the live page's bold on the three voice names and the PRESETS label, and
its italic on the preset list and the AI note. This is the live copy plus the
1.1.0 insertions; the existing sentences are kept as they were so the indexed
page does not churn.

```
Turn typed text into retro dialogue sounds, right in your browser. BlipTalk
Studio is a free tool for game makers who need a voice for their characters
without recording one.

Type a line, pick a voice, press play, and save the result as a WAV file for
your game.

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

Every slider also has a number box, so you can type an exact value instead of
dragging it.

Leave punctuation intonation on and questions rise, exclamations lift, and full
stops fall, each with a natural pause.

PRESETS

Cozy Animal, Sarcastic Robot, 8-Bit Hero, Dark Wizard and Fairy Whispers. Load
one, then adjust from there.

Tweak one and use Save current to keep your own copy. The built-ins stay fixed,
and your presets stay in this browser. You can update or delete them. You can
export your presets to a file and import them on another browser.

WHAT YOU GET

Export WAV File saves the whole line as a standard mono WAV file. It works in
Unity, Godot, GameMaker, RPG Maker and anything else that plays WAV.

Export Blip Pack saves five single-character blips you can trigger one at a
time as text types out. The pitched voices give you a five-note scale, and
Animalese gives you the five vowel sounds.

There is a ZIP option too, so you can download all five blips as one file.

GOOD TO KNOW

- Free, no account, works on desktop and mobile browsers.
- Your text never leaves your computer. Everything is generated in the browser.
- Your last line is kept for this tab, so a refresh won't lose it. Your voice
  settings stay in this browser.
- The sounds you make are yours, including in commercial games. No credit needed.
- Made with the Web Audio API.

Made by DevTarlow with ❤️

- Built with React, Vite, Tailwind CSS and the Web Audio API.
- All sound is synthesised at runtime. No samples were used.

* The application code was written with AI assistance. All audio is generated at
runtime by classic DSP synthesis (oscillators, formant filters, noise shaping).
No AI models are used to produce sound or to process anything you type, and no
AI-generated art, music or text is included.
```

### Short description

The short description field takes **1 to 120 characters**. This one is 109:

```
Turn typed text into retro dialogue blips and Animalese voices. Export them as WAV files for your game. Free.
```

Alternates, if you want a different angle. All are within the limit:

| Chars | Text |
| --- | --- |
| 108 | Turn typed text into retro dialogue blips and Animalese voices, then export them as WAV files for your game. |
| 111 | Retro dialogue sound generator for games. Type a line, pick a voice, export a WAV. Free, right in your browser. |
| 113 | Chiptune blips, Animalese voices and robot static for your game. Type a line, export a WAV. Free in your browser. |
| 115 | Type a line, pick a retro voice, export a WAV for your game. Chiptune blips, Animalese chatter, robot static. Free. |

Note that the same text is also a good fit for the `description` meta tag and
for devlog headers, both of which truncate around this length.

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

## 6. Theming the page to match the app

You do **not** need custom CSS for this. itch's built-in theme editor already
handles background images, a banner and colours. (Custom CSS exists, but it has
to be requested from itch support per account, and they ask you to show it
cannot be done with the theme editor first.)

Open the project page and click **Edit Theme** at the top.

### Colours

Taken from `src/index.css`, so the page and the app agree exactly.

| itch field | Value | What it is in the app |
| --- | --- | --- |
| **BG** | `#04070d` | the page background |
| **BG2** | `#0f172a` | the panel colour |
| **BG2 Alpha** | `0.90` | lets the grid show faintly through the content column |
| **Text** | `#cbd5e1` | body text |
| **Link** | `#34d399` | the emerald accent |
| **Buttons** | `#34d399` | the Play button |
| **Headers** | `#34d399` | section titles |

**Set BG2 Alpha to around 0.9.** At 1.0 the content column is fully opaque and
you will only see the grid in the page margins. Between 0.85 and 0.95 is what
the app's own panels look like.

### Background

Upload **`bg-grid-tile-34px.png`** as the background image and set it to
repeat.

It is a 34 x 34 transparent tile, exactly one grid cell, so repeating it
reproduces the app's grid pitch precisely. The transparency is deliberate: the
BG colour shows through, so the grid follows if you change the background
colour later.

| File | When to use it |
| --- | --- |
| `bg-grid-tile-34px.png` | Default. Correct pitch when repeated at natural size. |
| `bg-grid-tile-34px@2x.png` | If the theme editor lets you set a background size, use this at `34px` for sharper lines on high-density screens. |
| `bg-grid-tile-strong-34px.png` | Same tile with the lines at 10% instead of 5%, if the default reads as flat. |
| `bg-page-1920x1200.png` | A full-page version with the emerald glow from the top of the app baked in. Only use it if there is no repeat option, and note it will not cover a very long page. |

### Banner

Upload **`banner-1920x312.png`** as the header image. Its background is
transparent, so the grid runs behind it and it reads as part of the page rather
than a pasted-on block.

Worth knowing: a banner **replaces the page title**, so the project name is no
longer printed above the description. The name still appears in the page
metadata and in listings. Skip the banner if you would rather keep the text
title.

### Font

The app uses a monospace stack. Closest matches available in itch's font
dropdowns:

| Field | Suggestion |
| --- | --- |
| Body text | **Space Mono** |
| Headers | **Space Mono**, or **VT323** for a stronger pixel-terminal look |

Avoid Press Start 2P for body text. It is a faithful 8-bit face, but it is
hard to read in paragraphs.

---

## 7. After publishing

Four things to check on the live page, in order:

1. **Do the export buttons work inside the itch embed?** This is the one real
   risk. itch serves HTML projects inside a sandboxed iframe, and the sandbox
   has to permit downloads for the WAV buttons to fire. Click *Play* first to
   unlock audio, then try **Export WAV File**, **Export Blip Pack**, and the
   **ZIP** button. If downloads are blocked, use the **Fullscreen** button on
   the page and test again there. If they are blocked in both, add a line to the
   description pointing people at the fullscreen view, or host the app
   standalone and link to it.
2. **The embed height is 900.** The 1.1.0 layout uses about 885 px; the old 840
   viewport will show a scrollbar. Raise it to 900 in the project settings.
3. **No scrollbar in the embed.** If one appears with a fresh browser profile,
   raise the viewport height by another 20 px. Saved presets wrap the Presets
   bar and can add height in a returning browser.
4. **Audio unlocks on the first click.** The badge in the top right should
   change from *Click to enable audio* to *Audio ready*.

Published at <https://tarlow.itch.io/bliptalk-studio>. The README links to it.

---

## 8. Launch devlog

Post this from the project page (Dashboard, then **Devlogs**, then **New post**)
so it stays linked to the project. Attach the cover or one of the screenshots.

Title options, pick one:

```
BlipTalk Studio: free retro dialogue blips for your game
BlipTalk Studio is out: retro dialogue sounds you can export as WAV
Making retro dialogue sounds without recording a voice actor
```

Body:

```
BlipTalk Studio is up. It is a free browser tool that turns typed text into the
short voice blips games play while dialogue types into the text box. Type a
line, pick a voice, export a WAV.

Recording a voice actor for "Welcome to my shop, adventurer!" is overkill, and
digging through sound packs for the right bleep gets old. So this generates
them instead.

Three voices to pick from:

- 8-Bit Chiptune. One short tone per character. NES and Game Boy.
- Animalese. Fast chatter, one little syllable per letter. The Animal Crossing
  sound.
- Retro Noise / Robotic. Buzzy and crunchy, for computers, radios and villains.

PUNCTUATION DOES MORE WORK THAN YOU WOULD EXPECT

A question mark lifts the pitch 150 Hz, an exclamation mark 100 Hz, and full
stops and commas drop it slightly. Each one gets a longer pause after it.
Without that you get a string of identical beeps. With it, the line reads like
a sentence. You can switch it off when you want flat delivery for menu blips.

EXPORTS

Export WAV File saves the whole line as a mono 16-bit WAV. It works in Unity,
Godot, GameMaker, RPG Maker, or anything else that takes a WAV.

Export Blip Pack saves five single-character blips, so you can trigger them one
at a time from code as your text types out.

Same line, same settings, same file every time. You can re-export after moving
a slider without your game audio shifting underneath you. The sounds are yours,
commercial projects included, no credit needed.

It is not real text-to-speech. You will not get understandable words, and that
is the point. These are the blips.

No install, no account. Everything runs in your browser, and the text you type
never gets uploaded anywhere.

Give it a go and tell me what is missing. If there is a voice you want that is
not here, say so in the comments.
```

Optional: if you want a line about why you built it, it fits after the second
paragraph. Something specific beats something general ("I needed shopkeeper
blips for a jam game and could not find a generator that did Animalese").

### Why this shape

- The title carries the tool name plus the terms people actually search:
  retro, dialogue, blips, WAV.
- Engine names in the body (Unity, Godot, GameMaker, RPG Maker) are how people
  search for audio they can drop in.
- "Not real text-to-speech" heads off the most likely wrong expectation while
  still containing the phrase people type.
- Concrete numbers (150 Hz, 100 Hz, five blips, 16-bit) do more for credibility
  than adjectives, and they are all true of the build.

---

## 9. Release post for social

Fits 280 characters with room spare. Counts shown are raw length, then what X
charges once it shortens the link to 23 characters.

Recommended, 192 characters (177 on X):

```
BlipTalk Studio is out. Type a line of dialogue, pick a chiptune, Animalese or robot voice, and export it as a WAV for your game. Free, in your browser.

https://tarlow.itch.io/bliptalk-studio
```

Alternates:

```
Made a thing. BlipTalk Studio turns typed text into retro dialogue blips you can export as WAV. Chiptune, Animalese or robot voice. Free, no install.

https://tarlow.itch.io/bliptalk-studio
```
189 characters (174 on X). The most casual of the set.

```
Need dialogue blips for your game but don't want to record anyone? Type a line, pick a voice, export a WAV. BlipTalk Studio is free and runs in your browser.

https://tarlow.itch.io/bliptalk-studio
```
197 characters (182 on X). Leads with the problem, which tends to draw more replies.

```
BlipTalk Studio is out: a free browser tool that turns typed text into retro dialogue blips for your game. Chiptune, Animalese and robot voices, exported as WAV.

https://tarlow.itch.io/bliptalk-studio

#gamedev #chiptune
```
221 characters (206 on X). The hashtags help on Mastodon and Bluesky more than
they do on X.

### Image

Attach **`itch-assets/social-card-1200x630.png`** to the post. That is the
standard card size, so it will not be cropped by X, Facebook, LinkedIn or
Discord. Posts with an image get considerably more reach than text alone, and
the card already carries the name, the three voices and the export line, so
the post text does not have to repeat all of it.

---

## 10. v1.1.0 devlog

Post this after the 1.1.0 build is uploaded. Title field:

```
BlipTalk Studio 1.1 - Save Your Presets, Keep Your Line
```

Body:

```
I put BlipTalk Studio on itch.io last month. The first version did the main job: type a line, pick a voice, export a WAV.

This update is about the work around that job.

What does that mean in practice?

It means exact values, presets you can keep, and a line that survives a refresh.

## Type the number you want

Every slider now has a number box. Why drag at all? Type 620 instead of dragging until the readout lands on it, and the value snaps to the slider step and clamps to the range, so a stray digit does not break the voice.

## Keep your own presets

The five built-ins stay fixed. Tweak one, hit Save current, and it becomes yours. You can update it, rename it, or delete it. You can keep up to 40.

## Take them with you

Presets used to live and die in one browser, which meant a cleared cache, a new laptop, or a different browser wiped out every voice you had tuned. Now you can export them to a JSON file and import them on another machine. What if you move to another browser? Import adds to what is already there and skips names you have used, so nothing is overwritten, and if you move from a laptop to a desktop, or clear site data by accident, the file is there.

## One file instead of five

Export Blip Pack still gives you the five WAVs. There is also a ZIP button that puts the same five files in one download. If your browser asks permission for every one of those WAVs, the ZIP is the easier path, and the five-file export stays there for anyone who wants each blip as its own file.

## Pick up where you left off

Your voice settings are remembered in the browser. Your last line is kept for the tab, so a refresh does not lose it. The line is session-only on purpose, so closing the tab clears it, but an accidental reload keeps it exactly where you left it.

## A few fixes

The Play button now restarts the line while it is playing. Space still stops and plays. Space no longer hijacks a focused button. The script panel now shows the estimated line length next to the character count, so you can see whether a line will fit before you export it. But the main change is simple: the button now does what its label says.

Give it a go, and keep building.
```

Attach the cover or one of the existing screenshots. No new asset is required.
