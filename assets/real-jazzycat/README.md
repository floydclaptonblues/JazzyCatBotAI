# Real JazzyCat Counterpart Assets

Drop the photo-style JazzyCat counterpart assets in this folder.

## Required filenames

- `jazzycat-photo-center.png` — seated cute center pose, transparent PNG
- `jazzycat-photo-trumpet-left.png` — trumpet-playing frame with the trumpet/bell pointing left, transparent PNG
- `jazzycat-photo-trumpet-right.png` — trumpet-playing frame with the trumpet/bell pointing right, transparent PNG

## Optional filename

- `jazzycat-photo-loop.gif` — finished animated GIF. If this exists and `manifest.json` sets `mode` to `gif`, the page can use it instead of cycling PNG frames.

## Notes

Keep these images on transparent backgrounds with no checkerboard baked into the actual image pixels. The live wrapper will try to load these assets quietly; if a file is missing, it will hide the counterpart instead of showing a broken image.
