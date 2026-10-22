# Bachs SDK launch video

A 53-second, 1080p/30fps announcement film for `@bachs/sdk`, built with [Remotion](https://www.remotion.dev).
It follows the SnapKit demo storefront from `npm install` to a paid checkout and into the Bachs dashboard.

```sh
npm install
npm run studio        # live preview with a timeline scrubber
npm run render        # -> out/bachs-sdk-launch.mp4
```

## Where things live

| Path | What |
| --- | --- |
| `src/timeline.json` | Scene order, start frames, durations, and the checkout click beats |
| `src/scenes.tsx` | The eight scenes: intro, SnapKit, install, code, checkout, dashboard, languages, outro |
| `src/SnapKitSite.tsx` | A rebuild of snapkit.bachs.io so it can scroll and be clicked frame by frame |
| `src/code.tsx` | The SDK snippet and the typing cadence (bursty, seeded, so every render matches) |
| `src/components.tsx` | Captions, browser frame, cursor, background, grain, scene transitions |
| `public/shots/` | Dashboard and checkout screenshots from `bachs-docs/images` |
| `public/brand/`, `public/fonts/` | Bachs logos and the Geist family from `bachs-landing-astro` |

## Sound

`public/audio/mix.wav` is the licensed track "Proceed" by 1000 Handz (CC BY 4.0, see
`public/audio/licensed/CREDITS.md`), cut to the video in `public/audio/sdk-music.wav`,
plus quiet, unpitched UI sounds (keys, clicks, soft taps) placed on the frames where
they happen on screen. Scene timings in `src/timeline.json` are set so the drums come in
as the intro lands on "for you" and the payment succeeds on the bar where the bass returns.
After changing timing, rebuild the mix:

```sh
npx tsx scripts/cues.ts && python3 scripts/make_audio.py
```
