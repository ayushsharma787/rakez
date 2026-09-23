# Building photographs (drop-in slot)

The scorecard's scroll-driven backdrop cross-fades one image per section. The
manifest is `SCENES` in `src/data.js`; the loader is `usePhotos()` in
`src/scenes.jsx`, which globs `src/assets/photos/*.{jpg,jpeg,png,webp}`.

This session could not fetch photographs: the environment's network policy
denied `commons.wikimedia.org` and `upload.wikimedia.org`, so the app ships
with generated skyline plates labelled "Illustration".

To show real buildings:

1. Save a photograph for each scene under the file name in the manifest:
   `corniche.jpg`, `al-hamra.jpg`, `business-zone.jpg`, `industrial.jpg`,
   `academic.jpg`, `mountains.jpg` (1600×900 or larger, landscape, < 400 KB).
2. Set that scene's `credit` in `src/data.js` to the photographer and licence,
   e.g. `'Photo: A. Example · CC BY-SA 4.0'`. The credit shows in the scene
   caption and in the footer; only use images RAKEZ is licensed to display.
3. Rebuild (`npm run build`). Scenes without a file keep the illustration.
