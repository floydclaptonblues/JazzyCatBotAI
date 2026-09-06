# BMC JazzyCat GitHub Pages Repo — Retooled

This repository is a static GitHub Pages bundle for the rebuilt Balcony Music Club JazzyCat page.

## What changed

- Mardi Gras color palette with marquee lighting and pixel-poster styling
- Moving JazzyCat sprite cats around the page and in the corners
- Dedicated local assets folder for poster, background, icon, and sprite sheet
- Added optional photo-style Real JazzyCat counterpart wrapper and drop-in asset folder
- Expanded local knowledge file with more BMC answers and Thursday happy hour support
- Schedule cards and faster quick-ask actions wired into the page

## Files

- `index.html` — landing page and launch screen for JazzyCat; redirects into the photo counterpart wrapper
- `photo-jazzycat.html` — wrapper that opens the standard JazzyCat page and overlays the optional photo-style counterpart
- `jazzycat.html` — main JazzyCat experience
- `assets/jazzycat-bg-wide.webp` — wide page background
- `assets/jazzycat-poster.webp` — vertical poster art
- `assets/jazzycat-icon.png` — small JazzyCat icon
- `assets/jazzycat-sprite-sheet.png` — animated cat sprite sheet
- `assets/real-jazzycat/manifest.json` — controls the photo counterpart animation cycle
- `assets/real-jazzycat/real-jazzycat.js` — optional photo counterpart loader
- `assets/real-jazzycat/README.md` — drop-folder notes for the photo counterpart assets
- `data/jazzycat-knowledge.json` — venue facts, FAQs, contacts, recurring programming, UI copy
- `data/jazzycat-current-schedule.json` — public schedule snapshot loaded by the page
- `data/jazzycat-artists.json` — artist metadata, genres, and links when verified
- `.nojekyll` — disables Jekyll processing so GitHub Pages serves the repo as plain static files

## Real JazzyCat counterpart asset drop folder

Drop photo-style counterpart assets here:

- `assets/real-jazzycat/`

Use these exact filenames:

- `assets/real-jazzycat/jazzycat-photo-center.png`
- `assets/real-jazzycat/jazzycat-photo-trumpet-left.png`
- `assets/real-jazzycat/jazzycat-photo-trumpet-right.png`

Optional finished GIF:

- `assets/real-jazzycat/jazzycat-photo-loop.gif`

The current default uses the three PNG frames and cycles left trumpet → cute center → right trumpet → cute center. If you later want the single GIF instead, edit `assets/real-jazzycat/manifest.json` and change `"mode"` from `"frames"` to `"gif"`.

## Quick publish steps

1. Upload every file from this folder to the root of your GitHub repository.
2. Open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Choose **main** and **/(root)**.
5. Save and wait for Pages to publish.

## Updating content later

### Club facts, FAQs, recurring specials, UI copy
Edit:

- `data/jazzycat-knowledge.json`

### Current schedule snapshot
The wrapper runtime fetches `floydclaptonblues/UpcomingShows/main/shows.json` first.
`data/jazzycat-current-schedule.json` is the local fallback and must mirror the canonical schedule from its declared
`coverage_start` (September 1, 2026) onward. August has been removed from the fallback
and is filtered from live schedule answers. Answers select relevant dates in `America/Chicago`.

The current fallback mirrors source commit `68504d87ebb1731f0f8a26a1e3bd0a29d8c8a4ae`,
last updated August 27, 2026: 40 acts across 16 September dates.
Keep artist names and times exactly as published and update `last_updated`,
`source_note`, and `source_commit` whenever refreshing the snapshot.

Run from the repository root:

```sh
node --check assets/jazzycat-schedule-runtime.js
node --test tests/schedule-runtime.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
python scripts/validate_schedule_sync.py
```

The validator checks ordered row equality within the declared coverage window, update-date equality, the authority URL,
venue timezone, real calendar dates and weekdays, nonempty days and acts, artist fields,
valid same-day clock ranges, duplicate dates, chronological order and overlapping acts.
Freshness means the source still contains a date on or after today in Chicago, not an
arbitrary maximum age for the management posting. An expired source fails even when
the fallback matches it. The validator currently rejects cross-year headings and
overnight act ranges; those require an explicit schema/runtime change.

For reproducible historical checks, use `--today YYYY-MM-DD` and
`--canonical tests/fixtures/upcoming-shows-2026-08-27.json`. CI uses the live canonical
source and actual venue date. The frozen fixture records the source commit above;
update it and the date-specific regression expectations when refreshing future schedules.

### Artist genres and links
Edit:

- `data/jazzycat-artists.json`

### Real JazzyCat counterpart behavior
Edit:

- `assets/real-jazzycat/manifest.json`

## Important note

This repo is still static. Schedule answers in the wrappers use UpcomingShows first and local JSON as a fail-safe; other answers use the local knowledge files. If something has not been entered in the JSON yet, the page is designed to say so clearly instead of inventing details. The Real JazzyCat counterpart is optional and fail-safe: if its assets are missing, the page should hide that layer instead of showing broken images.

