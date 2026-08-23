# Cross-Stitch Pattern Generator

A client-side (no backend, no account) web app that turns a photo into a printable cross-stitch
pattern with a DMC thread legend, physical size/thread estimates, and a stash-tracking inventory.
See [README.md](README.md) for the user-facing feature list. Live at
https://korphos.github.io/cross-stitch-pattern-generator/ (deployed manually/externally — `dist/`
is gitignored and there is no deploy step in CI).

## Stack

React 19 + TypeScript + Vite 8 + Tailwind CSS 4, [culori](https://culori.dev/) for color science
(CIELAB ΔE2000 matching), i18next/react-i18next for translations. Vitest for unit tests, oxlint
for linting. Zero runtime dependencies beyond the browser — everything (image decoding, grid
detection, color math, persistence) runs client-side.

```bash
npm run dev     # local dev server
npm run test    # vitest run (unit tests, jsdom-free — see src/lib below)
npm run lint    # oxlint
npm run build   # tsc -b && vite build
```

CI (`.github/workflows/ci.yml`) runs lint, test, and build on every push/PR to `main`.

## Architecture

- **`src/lib/`** — pure, framework-free algorithm/domain layer. Every file here operates on plain
  data (see `types.ts`: `PixelBuffer`, `RGB`, `DetectedGrid`, `PatternProject`, etc.), has zero DOM
  or React dependency, and is unit-tested directly under Vitest's `node` environment
  (`*.test.ts` next to the file it tests). This is where new algorithm work belongs — grid
  detection, color clustering/matching, background masking, symbol assignment, thread estimates,
  project file (de)serialization, settings-share encoding.
- **`src/components/`** — presentational/interactive React components. Receive `project` +
  `dispatch` (the reducer's action dispatcher) as props rather than reaching into global state.
- **`src/App.tsx`** — top-level orchestration: owns the `useReducer(projectReducer, ...)` state,
  wires file upload/drag-drop, undo/redo keyboard shortcuts, persistence (autosave to IndexedDB via
  `lib/persistence.ts`, debounced), the settings-share URL flow, and print handling. Business logic
  that needs to *decide* something (not just render) tends to live here as a `useCallback`, then
  gets dispatched into the reducer.
- **`src/lib/projectReducer.ts`** — the single state machine for `PatternProject`. Almost all
  mutations (grid updates, palette recompute, cell recoloring, undo/redo) flow through this
  reducer's actions rather than ad hoc `useState`.
- **`src/data/`** — static DMC color tables (`dmcColors.ts` standard floss, `dmcSpecialtyColors.ts`
  metallic/satin).
- **`src/i18n/`** — see below.

### Non-destructive editing model

Manual palette edits (recolor, merge, delete, add) are layered on top of the auto-generated
palette and preserved independently across `history.past`/`history.future` (undo/redo stack,
capped at `MAX_HISTORY` in `projectReducer.ts`). Any action that would silently discard those
edits (changing cluster threshold, palette mode, re-detecting the grid, replacing the image, etc.)
must go through `confirmDestructiveEdit(project.history.past.length)`
(`src/lib/confirmDestructive.ts`) first — it's a no-op confirmation when there's nothing to lose.
Follow this pattern for any new action that regenerates `palette`/`cellAssignment` from scratch.

### Grid detection

`src/lib/gridDetection.ts` auto-detects the stitch grid via background/bounding-box detection plus
gradient/peak-based cell-size detection, which assumes a real "interior" between periodic edges.
It falls back to `cellSize: 1` (one source pixel per stitch) when the peak search degenerates
(`cols * rows <= 2`) — this covers already-pixelated tiny source images where every pixel is an
edge and there's no interior to lock onto. `GridControls.tsx`'s "Pixel-perfect grid" section is the
manual escape hatch for the same case (explicit N-pixels-per-stitch, bypassing detection entirely).
Keep both fallbacks in mind if you touch grid sizing.

### Error handling convention

Functions in `src/lib/` throw stable string error *codes* (exported `const`s, e.g.
`IMAGE_DECODE_ERROR` in `imageLoader.ts`), never user-facing prose — they have no access to `t()`.
Callers in `App.tsx` map codes back to translation keys via the `ERROR_CODE_KEYS` table and
`describeError()`. Add new lib-thrown errors the same way: an exported code constant + an entry in
`ERROR_CODE_KEYS` + a translation key in every locale file.

## i18n

- Config: `src/i18n/index.ts`. 12 locales (`en-US` canonical/fallback, `fr-FR`, `es-ES`, `pt-BR`,
  `de-DE`, `it-IT`, `nl-NL`, `pl-PL`, `ru-RU`, `uk-UA`, `tr-TR`, `zh-CN`), listed in
  `SUPPORTED_LANGUAGES`. Detection order: `?lang=` query param → `localStorage` (set when the user
  picks a language manually in Settings) → `navigator` (browser language), fallback `en-US`.
- Every locale file is typed against `en-US.ts` (`const xxYY: typeof enUS = {...}`) — adding a key
  anywhere means adding it to *all twelve* files, or TypeScript will catch the mismatch at build
  time. Keep `en-US.ts` as the source of truth and add there first.
- Plurals use i18next's `_one`/`_other` suffixes uniformly across all locales (a deliberate
  simplification even for languages with richer plural systems — Polish/Russian/Ukrainian have
  more grammatical forms, Turkish/Chinese have none).
- `i18n.on('languageChanged'/'initialized', ...)` listeners **must** be registered before
  `.init()` is called — the language detector resolves and applies the initial language
  synchronously *inside* `init()`, so listeners attached after it miss that first event. See the
  comment in `src/i18n/index.ts`.
- The site is a single-page app with no server routing; SEO for multiple languages is done via the
  `?lang=` query param as a stable per-language URL, `hreflang` alternates in `index.html`,
  `public/sitemap.xml` (Google's `xhtml:link` multi-language-per-URL pattern), and
  `public/robots.txt`. Update all three together if the language list changes.
- Non-React lib code (e.g. `confirmDestructive.ts`) imports `i18n` directly and calls `i18n.t(...)`
  rather than using the `useTranslation()` hook.
