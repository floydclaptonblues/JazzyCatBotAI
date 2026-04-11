# BMC JazzyCat GitHub Pages Repo — Retooled

This repository is a static GitHub Pages bundle for the rebuilt Balcony Music Club JazzyCat page.

## What changed

- Mardi Gras color palette with marquee lighting and pixel-poster styling
- Moving JazzyCat sprite cats around the page and in the corners
- Dedicated local assets folder for poster, background, icon, and sprite sheet
- Expanded local knowledge file with more BMC answers and Thursday happy hour support
- Schedule cards and faster quick-ask actions wired into the page

## Files

- `index.html` — landing page and launch screen for JazzyCat
- `jazzycat.html` — main JazzyCat experience
- `assets/jazzycat-bg-wide.webp` — wide page background
- `assets/jazzycat-poster.webp` — vertical poster art
- `assets/jazzycat-icon.png` — small JazzyCat icon
- `assets/jazzycat-sprite-sheet.png` — animated cat sprite sheet
- `data/jazzycat-knowledge.json` — venue facts, FAQs, contacts, recurring programming, UI copy
- `data/jazzycat-current-schedule.json` — public schedule snapshot loaded by the page
- `data/jazzycat-artists.json` — artist metadata, genres, and links when verified
- `.nojekyll` — disables Jekyll processing so GitHub Pages serves the repo as plain static files

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
Edit:

- `data/jazzycat-current-schedule.json`

### Artist genres and links
Edit:

- `data/jazzycat-artists.json`

## Important note

This repo is still static. JazzyCat answers only from the local JSON files in this project. If something has not been entered in the JSON yet, the page is designed to say so clearly instead of inventing details.
