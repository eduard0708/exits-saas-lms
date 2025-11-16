# Loanflow Style Budget Review

_Last updated: 2025-11-16_

## Existing Angular budgets

| Budget type           | Warning | Error | Notes |
| --------------------- | ------- | ----- | ----- |
| Initial bundle size   | 2 MB    | 5 MB  | Applies to the aggregated application bundle emitted during production builds. |
| Any component styles  | 64 kB   | 96 kB | Protects the per-component SCSS bundles from bloating after the compact UI refresh. |

The budgets are defined inside `loanflow/angular.json` under the production build configuration and therefore automatically enforced for every `npm run build` (which now uses the filtered wrapper).

## Latest production build check

Command: `npm run build` (production by default)

| Output artifact            | Size (raw) | Budget headroom |
| -------------------------- | ---------- | --------------- |
| Initial chunks total       | 1.63 MB    | ~19% below the 2 MB warning threshold |
| `styles-BCCHJD3T.css`      | 50.51 kB   | ~21% below the 64 kB warning threshold |

No bundle or component style exceeded the configured budgets, so the build is clean and no action is required right now.

## Guidance for future changes

1. When adding large visual features, keep shared styles within `src/global.scss` and page-level styles scoped to the component to prevent duplication.
2. If a component approaches 60 kB of compiled CSS, consider splitting it into sub-components or moving repeated declarations into mixins.
3. Leave the current budgets untouched unless there is a sustained, justified need for larger bundles; any change should include a rationale in pull requests referencing this document.
4. Re-run `npm run build -- --statsJson` when auditing deeper; the generated `www/stats.json` can be inspected via `ng build --stats-json` viewers for granular insights.

Documenting the current state keeps the compact UI effort sustainable and gives reviewers a quick reference when investigating future warnings.
