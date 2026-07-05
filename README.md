# Cross-Stitch Pattern Generator

A client-side web app that turns any photo into a printable cross-stitch pattern with a DMC thread legend, physical size/thread estimates, and a shopping-friendly thread inventory — all running entirely in the browser, no backend, no account.

**Live app: [korphos.github.io/cross-stitch-pattern-generator](https://korphos.github.io/cross-stitch-pattern-generator/)**

## What it does

1. **Upload a photo.** The app auto-detects a stitch grid over the image (adjustable by dragging handles if the detection isn't quite right) and lets you flip it horizontally in place.
2. **Build a palette.** Each cell is sampled and matched to the closest real DMC thread color using perceptual color distance, with similar colors optionally merged to keep the palette manageable. Background color can be detected and excluded from the design.
3. **Fine-tune.** Recolor, merge, or delete any color in the palette; add a color manually; edit individual cells. Every destructive operation asks for confirmation first. Undo/redo.
4. **Track your stash.** Mark which DMC threads you already own; the palette can be restricted to "only my threads," and unowned colors are called out separately. A compact settings page (built for checking your stash on your phone in a craft store) can share your inventory across devices via a self-contained link — no account, no server round-trip.
5. **Get the numbers you need.** Physical finished size and estimated skeins per color, computed from fabric count (stitches per inch) and strand count.
6. **Export, save, print.** Save/load a project as a portable `.xstitch` file (JSON, includes the source image and every manual edit) to resume later or share with someone else. Print a clean pattern + legend directly from the browser.

## Technical points

- **Perceptually accurate color matching.** DMC has ~490 standard colors plus metallic/satin specialty finishes; matching is done in CIELAB via ΔE2000 rather than RGB Euclidean distance, because RGB distance systematically picks visually-wrong matches for some hues (this is the actual reason two colors can look similar to the eye but score far apart, or vice versa).
- **Background detection that understands topology, not just color.** A background-colored pixel deep inside the subject (e.g. a white highlight in gray hair) isn't background — only cells *reachable from the canvas edge* through other background-colored cells are treated as background.
- **Non-destructive editing model.** Manual palette edits (recolors, merges, added colors) are preserved independently of the auto-clustering pass, with a `useReducer` history stack for undo/redo, and every operation that would discard those edits (changing cluster threshold, palette mode, grid dimensions, etc.) is gated behind a confirmation that's automatically skipped once there's nothing to lose.
- **Symbol assignment for print legibility.** Pattern symbols are auto-assigned from a pool that excludes visually confusable characters (`0/O/Q`, `1/I/L/l`).
- **Zero backend.** Everything — image decoding, grid detection, color science, palette computation, project persistence — runs client-side. Projects are portable JSON files; settings can be shared via a compact, hand-rolled binary encoding packed into a URL fragment.

## Tech stack

React 19 + TypeScript, Vite 8, Tailwind CSS 4, [culori](https://culori.dev/) for color science. Vitest for unit tests, oxlint for linting.

## Development

```bash
npm install
npm run dev       # local dev server
npm run test      # unit tests (vitest)
npm run lint      # oxlint
npm run build     # typecheck + production build
npm run preview   # preview the production build
```

No environment variables or external services are required — the app is entirely static.

## License

GPL-3.0 — see [LICENSE](LICENSE).
