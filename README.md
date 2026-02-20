# language-games-demo

Winter Chill — simple demo

Files added/changed:
- `index.html` — main page (snow canvas + UI)
- `styles.css` — visual styles
- `script.js` — snow animation + WebAudio ambient generator + file input
 - `script.js` — snow animation + generated WebAudio ambient (pads, wind, chimes)

How to run
1. Open `index.html` in your browser (double-click or use a local static server).

Notes about audio
- Browsers require a user gesture to start audio. Click "Start Ambient" to begin.
- You can also load your own audio file using the "Load your audio" control; it will play looped and bypass the generated synth.
- If you want to use a local file by default, create an `assets` folder and drop a file named `chill.mp3`, then modify `index.html` to add an `<audio>` tag or update the script to auto-load it.
- Audio is generated procedurally by the page (no file required). Use the "Start Ambient" button to begin.
 - If you prefer to use your own track, you can still add an `<audio>` element and wire it into the audio graph in `script.js`.

Customization ideas
- Swap background gradient colors in `styles.css`.
- Tweak snow density in `script.js` (the flake count is roughly `innerWidth/12`).
- Replace the simple synth with an imported track for a richer soundtrack.

Enjoy!