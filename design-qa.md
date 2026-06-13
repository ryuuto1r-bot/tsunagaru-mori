# Design QA

final result: passed

## Source

- source visual truth path: `/Users/user/Downloads/生成画像3.png`
- implementation screenshot path: `/tmp/tsunagaru-quest-full-final2.png`
- viewport: `500 x 1200` Chrome capture, mobile app layout constrained to phone width
- state: task tab, quest home screen, default persisted sample/local tasks
- full-view comparison evidence: source and implementation both use a full-bleed realistic bonsai hero, translucent HUD cards, a dark forest quest panel, parent task rows with fruit slots, and a bottom app navigation bar.
- focused region comparison evidence: hero HUD and quest panel were inspected separately in `/tmp/tsunagaru-quest-final.png` and `/tmp/tsunagaru-quest-full-final2.png`.

## Findings

- No actionable P0/P1/P2 issues remain.

## Required Fidelity Surfaces

- Fonts and typography: Japanese system sans is used with heavy weights to match the app-like game UI. Title, HUD numerals, quest names, and small labels maintain clear hierarchy without negative letter spacing.
- Spacing and layout rhythm: The hero, HUD cards, tree badge, scope pill, quest panel, and bottom nav follow the same stacked mobile rhythm as the reference. Bottom padding prevents the fixed nav from blocking the add flow in normal use.
- Colors and visual tokens: The palette matches the reference direction: dark forest greens, warm moss/yellow accents, translucent glass borders, and muted cream text.
- Image quality and asset fidelity: The bonsai hero, bark rail, and three fruit types are raster assets, not CSS-drawn placeholders. Fruit assets are optimized to 180px transparent PNGs for UI performance.
- Copy and content: Japanese copy follows the reference structure: `つながる森`, `今日のクエスト`, `今日の木`, `今日/今月/すべて`, quest rows, and bottom tabs.

## Patches Made

- Rebuilt the task tab as a game-like quest home screen from the provided visual.
- Added realistic bonsai, bark, and fruit image assets under `public/assets`.
- Connected parent tasks to quest rows and child/completed tasks to fruit slots.
- Added add-quest dialog and verified task creation.
- Fixed dialog overlay pointer events so completed-fruit clicks work after closing.
- Verified `npm run build`, task add, and task complete.

## Follow-up Polish

- P3: The generated bonsai asset is close but not identical to the exact reference tree. A future pass could generate a tighter pot/table crop if the user wants pixel-level fidelity.
- P3: The bottom nav intentionally stays fixed for app usability, so full-page screenshots show it over content; in actual use the content scrolls behind it.
