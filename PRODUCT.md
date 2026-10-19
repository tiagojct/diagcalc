# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: healthcare students and educators using the calculator to learn, teach and demonstrate diagnostic test performance and Bayesian reasoning. Typical situations are a classroom or teaching session, supervised self-study, and preparation of worked examples. Clinicians and terminal users remain supported but are not the primary audience for this redesign.

## Product Purpose

DIAGCALC turns a 2×2 confusion matrix into diagnostic performance measures (sensitivity, specificity, PPV, NPV, likelihood ratios, DOR, NNS, confidence intervals) and shows how a test result updates pre-test probability. It exists to make the maths explicit and verifiable during teaching and self-study. Success means a learner can enter or load a case, understand why the numbers follow from the matrix, and explain the post-test shift without trusting a black box.

## Positioning

The same transparent calculation engine powers the browser, TUI and CLI, with full-precision results and explicit handling of undefined and infinite values. Presets are labelled as illustrative teaching scenarios rather than verified published estimates, and provenance is visible wherever a citation appears. A neighbouring calculator could copy the formulas, but not the combined teaching workflow, bilingual explanation layer, terminal parity and provenance discipline.

## Operating Context

The browser app is used in classrooms, demonstrations and independent study, often on a laptop and increasingly on a phone or tablet. Users may compare scenarios, inspect how prevalence changes predictive values, chain a second test, explore decision thresholds, edit ROC cutoffs, and keep a short local calculation history. The terminal app supports keyboard-first and SSH use. There is no account system, backend or server-side calculation.

## Capabilities and Constraints

- Confusion-matrix input with strict validation; pre-test probability; Wilson intervals; log-normal LR/DOR intervals; explicit finite/infinite/undefined encoding.
- Teaching presets with illustrative provenance, interpreted metrics, Fagan nomogram, prevalence explorer, chained testing, decision thresholds, threshold explorer, ROC scaffolding, Cohen's kappa companion and local history.
- Browser app currently loads as static plain HTML/CSS/vanilla JavaScript with UMD shared modules and no build step. Whether this stack and architecture remain binding is an open decision for the redesign.
- English and European Portuguese localisation; no third-party runtime scripts since 5.1.1.
- Session-only fallback when storage is unavailable; history and preferences never leave the device.
- The redesign is explicitly whole-web-app and may reorganise navigation, page structure, educational content and workflows, and may reconsider features or the relationship between browser and terminal products. It must not fabricate verified study counts, clinical claims, testimonials or outcomes.
- Existing calculation, dataset, CLI/TUI and JSON compatibility contracts are evidence of current behaviour, not yet confirmed as immutable during the redesign.

## Brand Commitments

- Name: DIAGCALC.
- Educational, evidence-first voice; no marketing claims or clinical advice.
- MIT licensed.
- No binding visual identity, palette, typography or imagery has been confirmed. The incumbent look is evidence, not a brand commitment.

## Evidence on Hand

- Working browser, TUI and CLI implementations with shared calculation engine under `lib/`.
- Sixteen illustrative presets with citations and provenance records (`lib/diagcalc-datasets.js`, `docs/PROVENANCE.md`).
- Test suites covering calculations, CLI, real terminal sessions, browser workflows, accessibility and packaged artifacts.
- No retained source-table extraction for preset counts; no testimonials, customer logos, benchmarks or verified outcome claims exist.

## Product Principles

1. Show the reasoning, not just the result: every headline number must remain traceable to the matrix, prior and formula.
2. Teach across prevalence settings: the same test should be understandable in screening, case-control and specialist contexts.
3. Be honest about evidence: illustrative data and uncertainty are labelled, never smoothed into false certainty.
4. Reward exploration: scenarios, prevalence, thresholds and chained tests should be safe to manipulate and easy to compare.
5. Keep the tool fast and dependable in a classroom: no account, no network dependency for calculations, and no dead ends.

## Accessibility & Inclusion

The redesign must preserve keyboard operation, screen-reader labelling, clear focus, reduced-motion support and WCAG 2.1 AA contrast. Both English and European Portuguese are required. Numeric and chart content must have accessible text equivalents, and the mobile experience must remain usable in one hand during teaching.
