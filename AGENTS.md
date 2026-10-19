# AGENTS.md — diagcalc

Read `DESIGN.md` before changing the browser interface; it owns the Probability Rail visual system and its tokens. Read `PRODUCT.md` for product truth.

## Architecture and running

The static browser, plain CLI and Blessed TUI share `lib/` UMD modules. Browser assets load directly from `index.html`, including via `file://`, without compilation or runtime dependencies. Node 22+ is required for terminal/development tools. Blessed is the only runtime npm dependency.

- `lib/diagcalc-core.js`: validation and numeric calculation; `calculateResults` returns data, `calculateMetrics` is the presentation compatibility adapter.
- `lib/diagcalc-presentation.js`: metric labels/notes in English and pt-PT.
- `lib/diagcalc-i18n.js`: browser translation tables, DOM application and relocalisation.
- `lib/diagcalc-case.js`, `diagcalc-meta.js`: versioned snapshots and explicit exceptional-number encoding.
- `lib/diagcalc-datasets.js`: frozen teaching scenarios and provenance; consult `docs/PROVENANCE.md`.
- `lib/diagcalc-storage.js`, `diagcalc-geometry.js`: safe preference storage and pure chart geometry.
- `script.js`: browser state/events and tab navigation; `web/results.js`, `web/charts.js` and `web/rail.js`: rendering and lifecycle. `web/rail.css` owns the Probability Rail design layer; `web/fonts/` holds the self-hosted IBM Plex files.
- `bin/diagcalc.js`: strict CLI; `tui/`: terminal interaction, presentation and reports.

Keep DOM/terminal access out of shared calculation modules. Preserve CommonJS and browser-global loading. Do not introduce a browser bundler.

## Checks

```bash
npm ci
npx playwright install chromium firefox webkit
npm run check
```

Individual commands: `npm test`, `npm run typecheck`, `npm run test:browser`. Browser tests prepare `public/` automatically. Unix terminal tests require Python 3; Windows skips them. Artifact tests execute the packed CLI outside this checkout. CI runs Node 22/24 and three browsers before Pages deployment. `npm run prepare:site` includes only browser assets, `lib/`, `web/` and `CNAME`; Pages must use GitHub Actions as its source.

## Style and robustness

Use vanilla ES6+, two spaces, double quotes, semicolons, trailing commas in multiline literals, `const` when possible and named helper functions. New documentation/comments default to English; maintain existing pt-PT localisation. Use camelCase for JavaScript, snake_case for new dataset keys and kebab-case for CSS classes/custom properties. Add JSDoc for shared APIs and keep `lib/diagcalc-types.d.ts` aligned.

Validate before action and return `{ valid, message }` for user errors. Use strict complete-string parsers and `Number.isFinite`/`Number.isNaN`. Preserve undefined versus infinity and full precision; never clamp undefined statistical results into plausible values. Surface browser feedback through the existing polite live region. Treat stored history as untrusted, bound/schema-check it and render labels with `textContent`. Access storage only through the guarded adapter.

Use semantic markup, labelled sections, accessible canvas labels and `rel="noopener noreferrer"` on external links. Colours come from CSS custom properties, no box shadows. Use flat responsive selectors and reduced-motion overrides. Canvas updates must use the shared DPR-aware scheduler, read theme colours at draw time, and redraw on opening/resizing/theme changes.

## Versions and evidence

Keep the semantic version aligned in `package.json`, root `package-lock.json` metadata, `lib/diagcalc-meta.js` and the HTML version chip; a test enforces this. Update `CHANGELOG.md` with ISO dates and Portuguese headings (`Adicionado`, `Alterado`, `Corrigido`, `Técnico`). Record JSON compatibility changes explicitly. Never claim illustrative dataset counts are extracted study results without a retained and reviewed extraction.
