# Dataset provenance

All existing presets are classified `illustrative`. The repository does not retain a source table or extraction record establishing that the TP/FP/FN/TN values came from the cited medical papers. Keeping a DOI or a reference review date does not establish numerical provenance. The reference dates are therefore named `referenceLastReviewed`.

Each frozen preset has a `provenance` record: `kind`, `sourceLocation`, `extraction`, `threshold`, `referenceStandard`, `outcome`, `population`, `reviewStatus`, and `note`. Null fields mean evidence has not been retained. Browser warnings, terminal warnings and JSON snapshots carry this distinction; customised cases retain their original source identity and mark their counts modified.

To add a verified empirical case, retain an extraction file in this directory recording:

1. The exact paper version/DOI and table, page or supplementary location.
2. Population, exclusions, sample size, disease outcome and reference standard.
3. Test assay, units, cutoff and positive direction.
4. The four counts, their derivation and reconciliation against the source totals. Separate thresholds/cohorts must never be merged into a single ROC series.
5. Reviewer, review date and an independent check of all four cells.

Link that extraction from `provenance.extraction`, fill the remaining fields, add a regression fixture and update warnings only when the numerical claim is substantiated. No such independent extraction review was performed for the version 5 changes.

Simulated ROC points carry `simulated` provenance; editing them changes it to `edited-simulated`, preserving the qualification on AUC. A reference citation cannot convert a simulated point into an observed threshold.
