# 🔄 Shared Libraries Utilization & Refactor Plan

Updated: 2025-11-16

This note captures where the shared libraries (`@shared/models`, `@shared/api`, `@shared/ui`) are already in play, and where the next refactors will deliver the most value across the **web** and **loanflow** apps.

## Progress Log

- **2025-11-16** – ✅ Loanflow now consumes the shared models and API services directly. We dropped the duplicated files in `loanflow/src/app/shared/{models,api}` and updated `loanflow/tsconfig.json` so the aliases point exclusively to `../libs/shared-*`. `npm run build:prod` passes, so there’s a single source of truth again.
- **2025-11-16** – ✅ Web cashier dashboard now renders its KPIs with `<shared-stat-card>` and the legacy `app-stat-card` wrapper simply re-exports the shared component. Documentation has been updated so new work references `@shared/ui` examples.
- **2025-11-16** – ✅ Cashier dashboard quick actions now use `<shared-button>` variants (`primary`, `warning`, `info`), and the shared UI guide documents the button API to keep CTA styling consistent across apps.

## Current Snapshot

- **Shared Models** live in `libs/shared-models/src/index.ts` and mirror the data contracts returned by the money-loan backend.
- **Shared API Services** (cash float + grace extension) plus utility formatters sit in `libs/shared-api/src/index.ts`.
- **Shared UI Components** (stat card, status badge, button) are exported from `libs/shared-ui/src` and styled with Tailwind-compatible tokens.
- Both apps have TypeScript/Vite aliases for `@shared/*`, but **loanflow** still keeps older in-app copies that shadow the shared packages.

### Adoption Matrix

| Shared asset | Web app usage | Loanflow usage | Notes |
| --- | --- | --- | --- |
| `@shared/models` | Used throughout `web/src/app/features/platforms/money-loan/**` (cashier dashboards, balance monitor, etc.). | Alias resolves to `src/app/shared/models/index.ts` first, so every feature still consumes the duplicated local interfaces. | Removing the local file + alias is the cleanest win. |
| `@shared/api` | All cashier admin widgets already import `CashFloatApiService` & format helpers from the shared package. | Same duplication issue as models—`src/app/shared/api/index.ts` is still the default source. | Loanflow currently ships 1:1 copies of the shared services + util functions. |
| `@shared/ui` | Web cashier dashboard now uses `shared-stat-card` plus `shared-button` for quick actions; other admin pages still lean on inline badges/bespoke CTAs. | Loanflow's collector cash float flow uses `StatCard`, `StatusBadge`, `SharedButton`. | Most remaining screens still have handcrafted Tailwind blocks—next targets are other collector routes and admin widgets. |

## High-Impact Opportunities

### 1. Delete Loanflow duplicates for models & API (Foundational) ✅

- **Files involved:**
  - `loanflow/src/app/shared/models/index.ts`
  - `loanflow/src/app/shared/api/index.ts`
  - `loanflow/tsconfig.json` aliases currently list the local paths before the shared packages.
- **Why:** The files are byte-for-byte copies of the shared packages, so fixes must be applied twice and risk diverging. Removing them simplifies builds for both Ionic and web targets.
- **Steps:**
  1. Update `loanflow/tsconfig.json` so each `@shared/{models,api}` alias points only to `../libs/...`.
  2. Delete the duplicated files and rely on the library exports.
  3. Run the Ionic build to ensure path resolution still works. No component code should change because imports already reference `@shared/...`.

_Status:_ Completed on 2025-11-16 via `npm run build:prod` in `loanflow/`.

### 2. Expand Shared UI adoption inside Loanflow collector flows (Quick wins)

- **Current state:** Only `collector/cash-float.page.ts|html` brings in shared UI. The other high-traffic screens (`cash-handover.page.html`, `grace-extension.page.html`, `route.page.html`, and `customer/customer_dashboard.page.ts`) still render stat blocks, badges, and CTAs with bespoke Ionic markup + SCSS.
- **Targets:**
  - Swap `<ion-button>` blocks used for CTA cards (e.g., the submit section in `cash-handover.page.html` and `grace-extension.page.html`) with `<shared-button>` so the sizing + loading UI stays consistent.
  - Replace hard-coded stat cards in `customer_dashboard.page.ts` (look for `.stat-card` classes around line 140) with `<shared-stat-card>` instances, which removes ~800 lines of local CSS.
  - Use `<shared-status-badge>` for state pills (float confirmed/day closed badges, variance alerts) so the color system matches the web app.
- **Benefit:** Aligns Ionic + Angular look & feel with zero duplicated Tailwind tokens, and makes future theming updates centralized.

### 3. Introduce shared UI components to Money-Loan admin pages on the web app (Consistency)

- **Current state:** Components such as `web/src/app/features/platforms/money-loan/admin/cashier/*.component.ts` render cards and badges by hand:
  - Stat summaries in `pending-confirmations.component.ts` and `balance-monitor.component.ts` use repeated `<div class="bg-white rounded-lg shadow p-4">` markup.
  - Status tags are ad-hoc `<span class="inline-flex ...">` elements.
  - Primary actions rely on raw `<button class="bg-blue-600 ...">` definitions.
- **Plan:**
  - Import `StatCardComponent`, `StatusBadgeComponent`, and `SharedButtonComponent` from `@shared/ui` into each standalone component (Angular Standalone makes this a one-line addition per file).
  - Replace the four-card grids with `<shared-stat-card>` and pass the existing numbers through inputs (`title`, `value`, `variant`, `trendLabel`).
  - Use `<shared-status-badge>` inside the tables/grids for collector states (“Active”, “Pending”, “Inactive”) to drop ~30 lines of class juggling and keep semantic parity with loanflow.
  - Wrap CTA buttons (Back, Refresh, Approve) with `<shared-button>` + `variant` props so typography and spacing match the collector app.

### 4. Retire the web-only `app-stat-card` component ✅

- **File:** `web/src/app/shared/components/ui/stat-card.component.ts`
- **Issue:** This component now overlaps entirely with `libs/shared-ui/src/stat-card.component.ts`. Maintaining both fragments defeats the reuse goal and confuses designers.
- **Approach:**
  - Replace all `app-stat-card` usages (see `REUSABLE-UI-COMPONENTS.md` and the `StatCardComponent` exports in `web/src/app/shared/components/ui/index.ts`) with the shared version. ✅ `cashier-dashboard` now consumes `<shared-stat-card>` directly.
  - Once no references remain, delete the file and update `index.ts` exports. ✅ The local file now simply re-exports `StatCardComponent` from `@shared/ui`, so there’s a single implementation.
  - The shared component already supports icon slots, variants, and subtitle/trend fields, so migration is mechanical.

### 5. Normalize action buttons across customer-facing flows

- **Loanflow:** `customer_dashboard.page.ts` (quick actions + empty states) and `collector` tools still hand-roll gradient buttons. Importing `SharedButtonComponent` lets us manage hover/disabled/loading behaviors centrally and shrink the template noise.
- **Web:** Files such as `pending-handovers.component.ts` and `pending-confirmations.component.ts` include inline `<button class="bg-blue-600 ...">`. Moving to `<shared-button variant="primary" size="md">` keeps brand colors consistent and exposes the loading spinner API when async work is happening.

## Suggested Rollout Order

1. **Foundation (Day 1)** – Remove loanflow duplicates + update `tsconfig`. This unblocks consuming future shared API/model updates without double edits.
2. **Collector Visual Refresh (Day 2-3)** – Apply Shared UI components to `cash-handover`, `grace-extension`, `route`, and dashboard stat areas. Iterate fast because they already live in Ionic templates.
3. **Web Cashier Toolkit (Day 4-5)** – Convert the money-loan admin pages to shared UI components, then delete the legacy `app-stat-card`.
4. **Customer & Remaining Screens (Ongoing)** – Migrate customer dashboards and reusable layout components once the patterns settle.

## Risks & Mitigations

- **Path alias fallout:** Changing loanflow aliases could break Jest/esbuild caches. Run `npm run build` inside `loanflow/` right after the switch and push CI to ensure the Ionic build pipeline sees the same resolution.
- **Styling regressions:** Shared UI uses Tailwind classes; verify Ionic global styles import the same Tailwind base (loanflow already uses Tailwind for the new cash-float page). For legacy screens, wrap the shared button inside `<div class="ion-padding">` to preserve spacing.
- **Stand-alone imports:** Every Angular standalone component must list the shared UI component in its `imports:` array. Track this inside the PR checklist to avoid `NG0302` template errors.

With these steps, both applications can rely on one source of truth for contracts, network calls, and UI building blocks—making future iterations dramatically faster.
