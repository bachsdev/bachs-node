# Tutorial recorder

Records real screen sessions for the "Build it with Bachs" tutorials without a
local machine: VS Code (code-server) in a headless browser, captured as 4K frames
straight from the browser's compositor, then rebuilt as smooth 30 fps video.

Why it works this way:

- **4K capture, 1080p delivery.** The page is laid out at 1920x1080 and painted at
  2x, so the edit can zoom in 2x and text stays sharp.
- **Slow-motion recording.** Without a GPU the browser paints about 6 frames a
  second at 4K, so `record.mjs` runs the session 3x slower than real life and
  `assemble.py` plays it back at normal speed from the paint timestamps. Every
  keystroke gets its own frame.
- **Scripted input.** Typing is human-paced with small random variation, never
  has typos, and can be re-run whenever the SDK changes.
- **Everything real.** Commands run in a real shell (the npm install in the sample
  is a real install); with a sandbox key, payments run against the Bachs sandbox.

Setup (once per machine): download code-server, start it with the settings in
`vscode-user/` (light theme, Geist Mono, no popups, no auto-closing brackets),
then run:

```sh
node record.mjs <workdir>     # writes <workdir>/frames, frames.json, events.json
python3 assemble.py <workdir> # writes <workdir>/take.mkv (3840x2160, 30 fps)
```

`events.json` marks when each step happens; `src/tutorial/Sample.tsx` uses it to
time camera moves and step captions.
