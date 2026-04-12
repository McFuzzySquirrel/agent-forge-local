# Calendar Management App — Execution Plan

> **Status:** Phase 1 complete — Phase 2 not started  
> **Source:** [docs/prd/calendar-app-prd.md](prd/calendar-app-prd.md) (Section 14: Implementation Phases)  
> **Branch:** `experiment/ghcli-cloud`  
> **Last updated:** 2026-04-12
>
> **Phase 1 verification:** `npm run build` ✅ · `npm test --run` ✅ (exit 0, no failures)

---

## Agent Roster

---

## Completed Tasks

### Phase 1 — Core Calendar Foundation ✅ (2026-04-12)

- [x] **Task 1.1** — `project-architect`: Vite 6 + React 19 + TypeScript 5 strict scaffold
	- Files: `calendar-app/package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/main.tsx`, `src/vite-env.d.ts`, `src/test-setup.ts`, `src/styles/App.module.css`, `.gitignore`, `README.md`
	- Resolved versions: React 19.1.0, Vite 6.4.2, TypeScript 5.8.3, Vitest 3.2.4, date-fns 4.1.0, uuid 11.1.0
- [x] **Task 1.2** — `calendar-domain-engineer`: Event types, utilities, storage, store skeleton
	- Files: `src/types/event.ts`, `src/utils/categoryColors.ts`, `src/utils/dateHelpers.ts`, `src/utils/storage.ts`, `src/store/useEventStore.ts`, `src/store/recurrence.ts`
	- Zero TypeScript errors in domain files
- [x] **Task 1.3** — `react-calendar-engineer`: App composition and calendar view shells
	- Files: `src/App.tsx`, `src/components/CalendarHeader.tsx`, `src/components/MonthView.tsx`, `src/components/WeekView.tsx`, `src/components/DayView.tsx`
	- Styles: `src/styles/CalendarHeader.module.css`, `MonthView.module.css`, `WeekView.module.css`, `DayView.module.css`, `EventChip.module.css`, `EventModal.module.css`, `ConfirmDialog.module.css`
	- Build: ✅ `npm run build` succeeded (223 kB bundle, 0 warnings)
	- Tests: ✅ `npm test --run` exit 0 (no test files yet, expected)

## Current Task

- [ ] Phase 2, Task 2.1 — `calendar-domain-engineer`: Complete store CRUD + validation
	- Status: **not started**

## Remaining

### Phase 2 — Event Workflows and Responsiveness
- [ ] Task 2.1 — `calendar-domain-engineer`: Complete `useEventStore` CRUD (addEvent, updateEvent, deleteEvent) with localStorage flush; inline validation logic; recurrence.ts stub interface
- [ ] Task 2.2 — `event-workflow-engineer`: EventModal, ConfirmDialog, EventChip; delete flow; empty states
- [ ] Task 2.3 — `react-calendar-engineer`: Wire all three views to store + EventChip; responsive breakpoints; App threading for selected-date on cell click

### Phase 3 — Recurrence, Quality, and Polish
- [ ] Task 3.1 — `calendar-domain-engineer`: Full `expandRecurringEvents()` + recurrence-aware edit/delete scoping
- [ ] Task 3.2 — `event-workflow-engineer`: Recurrence scope prompts (this vs. all future) + focus management polish
- [ ] Task 3.3 — `react-calendar-engineer`: Connect views to full expansion; month-view perf optimisation
- [ ] Task 3.4 — `qa-test-engineer`: Full test suite (unit + integration + recurrence + accessibility + performance)

## Blockers
- None

## Notes
- Resolved versions (2026-04-12): React 19.1.0, Vite 6.4.2, TypeScript 5.8.3, Vitest 3.2.4, date-fns 4.1.0, uuid 11.1.0
- `recurrence.ts` is a Phase 1 stub — returns only non-recurring events; full logic deferred to Phase 3
- CSS Module placeholders for EventChip, EventModal, ConfirmDialog exist (empty) — Phase 2 fills content
- `useEventStore` Phase 1 only returns `{ events }` — CRUD methods added in Phase 2

---


| Agent | Domain |
|---|---|
| `project-architect` | Vite/React/TypeScript bootstrap, config, entrypoints, dependencies |
| `calendar-domain-engineer` | Event model, types, store, recurrence logic, date helpers, persistence |
| `react-calendar-engineer` | React UI composition, calendar views, navigation, responsive layout |
| `event-workflow-engineer` | Event modal, inline validation, confirmation dialogs, recurrence-scope UX |
| `qa-test-engineer` | Vitest + RTL tests, accessibility checks, performance spot-checks |

---

## Phase 1 — Core Calendar Foundation

**Goal:** Produce a runnable app skeleton with data plumbing, calendar navigation, and persistent storage — no events workflow yet.

**PRD refs:** §7 (Architecture), §8.1 (Navigation/Views), §8.3 (Data Model), §8.6 (Persistence), §14 Phase 1

### Agents and Tasks

#### `project-architect`

1. Scaffold `calendar-app/` using Vite 8 + React 19 + TypeScript 6 strict mode (PRD §7.1, NF-03).
2. Configure `vite.config.ts`, `tsconfig.json`, and `package.json` with exact PRD-specified dependency versions.
3. Set up CSS Modules support and the top-level `src/` structure per PRD §7.2.
4. Configure the `vitest` test runner (empty test pass, no test files yet).
5. Author `README.md` with local dev instructions (`npm run dev`, `npm test`).

#### `calendar-domain-engineer` _(depends on: project-architect completing scaffold)_

6. Define `src/types/event.ts` — `CalendarEvent` interface covering `id`, `title`, `description`, `startTime`, `endTime`, `category`, `recurrence` (FR-11, FR-12, FR-16, FR-18).
7. Implement `src/utils/categoryColors.ts` — deterministic `category → color` map (FR-24).
8. Implement `src/utils/dateHelpers.ts` — range helpers, comparison utilities, and week/month boundary calculations to support all three views.
9. Implement `src/utils/storage.ts` — `saveEventsToStorage()` / `loadEventsFromStorage()` with safe parse/reset on corrupt data (FR-28, FR-29, FR-30, SP-02, SP-05).
10. Implement `src/store/useEventStore.ts` skeleton — hydrates from `localStorage` on mount, exposes state shape (create/update/delete stubs for Phase 2).

#### `react-calendar-engineer` _(depends on: project-architect scaffold + calendar-domain-engineer types)_

11. Implement `src/App.tsx` — root composition with view-state and active-date state; connects `CalendarHeader`.
12. Implement `src/components/CalendarHeader.tsx` — view switcher (month/week/day), prev/next navigation, Today button (FR-01 – FR-05).
13. Implement structural shells for `MonthView.tsx`, `WeekView.tsx`, and `DayView.tsx` — correct grid layout and date-range rendering, events list empty (FR-01, §12).
14. Add `src/styles/` CSS Modules for all Phase 1 components (FR-25, FR-26, FR-27).

### Phase 1 Exit Criteria

- `npm run dev` starts the app without errors.
- Calendar header renders with working view/nav controls and today button.
- Month, week, and day views render the correct date grid.
- `localStorage` hydration runs on startup without errors.
- `npm test` runs with no failures (minimal test count is acceptable).

### Phase 1 Dependencies

```
[project-architect] ──► [calendar-domain-engineer]
[project-architect] ──► [react-calendar-engineer]
[calendar-domain-engineer: types] ──► [react-calendar-engineer: components]
```

---

## Phase 2 — Event Workflows and Responsiveness

**Goal:** Full event CRUD surfaced in the UI, events visible in all three views, responsive layouts, and empty/validation/confirmation states.

**PRD refs:** §8.2 (Create/Edit), §8.3 (Validation), §8.5 (Visual/Responsive), §8.6 (Persistence), §13 (States), §14 Phase 2

### Agents and Tasks

#### `calendar-domain-engineer` _(depends on: Phase 1 complete)_

1. Complete `useEventStore.ts` CRUD — `addEvent()`, `updateEvent()`, `deleteEvent()` with immediate `localStorage` flush (FR-06, FR-09, FR-29).
2. Add inline validation logic — enforce `title` required/120 chars, `description` 500 chars, `endTime > startTime`, `category` enum (FR-13 – FR-16).
3. Implement `src/store/recurrence.ts` stub — `expandRecurringEvents()` interface defined, non-recurring events only (Phase 3 fills the full expansion).

#### `event-workflow-engineer` _(depends on: calendar-domain-engineer store CRUD)_

4. Implement `src/components/EventModal.tsx` — create and edit modes, field preloading, inline validation errors, save/cancel actions (FR-06 – FR-09, FR-17, §12).
5. Implement `src/components/ConfirmDialog.tsx` — reusable confirmation UI for destructive actions (FR-10).
6. Wire delete confirmation flow from edit modal → ConfirmDialog → store delete (FR-09, FR-10).
7. Implement `src/components/EventChip.tsx` — event token with title and category color for use inside views (FR-23, FR-24).
8. Implement empty-state feedback in EventModal and calendar views (§13 Empty State).

#### `react-calendar-engineer` _(depends on: calendar-domain-engineer types + event-workflow-engineer EventChip)_

9. Connect `MonthView.tsx` to store — render `EventChip` per event in each day cell; cell click opens create modal (FR-06, FR-23).
10. Connect `WeekView.tsx` to store — render events in hourly time slots; time slot click opens create modal (FR-06, FR-23).
11. Connect `DayView.tsx` to store — single-column timeline for visible events; slot click opens create modal (FR-06, FR-23).
12. Apply responsive CSS breakpoints — desktop ≥1024 px full grid, tablet usable grid, mobile day-first with no horizontal scroll (FR-25 – FR-27, §12).
13. Wire `App.tsx` to thread selected-date into EventModal on cell/slot click.

### Phase 2 Exit Criteria

- Events can be created, edited, and deleted from the UI.
- All three views render events with correct category colors.
- Validation blocks saves and shows inline errors.
- Delete requires explicit confirmation.
- Data survives a page refresh (`localStorage` round-trip).
- Layout is usable on desktop, tablet, and mobile.

### Phase 2 Dependencies

```
[Phase 1: complete] ──► all Phase 2 agents
[calendar-domain-engineer: store CRUD] ──► [event-workflow-engineer: EventModal]
[event-workflow-engineer: EventChip] ──► [react-calendar-engineer: view connections]
[calendar-domain-engineer: recurrence stub] ──► [react-calendar-engineer: expandRecurringEvents call site]
```

---

## Phase 3 — Recurrence, Quality, and Polish

**Goal:** Full recurring-event support, comprehensive test coverage, performance validation, accessibility improvements, and documentation completeness.

**PRD refs:** §8.4 (Recurring Events), §9 (NFR), §11 (Accessibility), §15 (Testing Strategy), §14 Phase 3

### Agents and Tasks

#### `calendar-domain-engineer` _(depends on: Phase 2 complete)_

1. Complete `src/store/recurrence.ts` — `expandRecurringEvents()` for `daily`, `weekly`, `monthly` rules, expanding at least 90 days ahead from the viewing window (FR-18 – FR-20).
2. Add recurrence-aware edit support — scoping to "this occurrence" vs. "all future occurrences" (FR-21).
3. Add recurrence-aware delete support — scoping to "this occurrence" vs. "all future occurrences" (FR-22).
4. Validate and safely reset corrupted `localStorage` payloads (FR-30, SP-05).

#### `event-workflow-engineer` _(depends on: calendar-domain-engineer recurrence store)_

5. Add recurrence-scope prompt to EventModal edit flow — present "this event" vs. "all future events" choice when editing a recurring event (FR-21, §12).
6. Add recurrence-scope prompt to ConfirmDialog delete flow — same scope choice for delete (FR-22, §12).
7. Polish focus management — return focus to invoking element on modal close, trap focus inside open modal (ACC-02).

#### `react-calendar-engineer` _(depends on: calendar-domain-engineer expandRecurringEvents complete)_

8. Connect all three views to `expandRecurringEvents()` — replace stub with full virtual expansion per visible date range (FR-19, FR-20).
9. Optimize month-view rendering — profile and address render hotspots for 100+ visible events (NF-01).

#### `qa-test-engineer` _(depends on: Phase 2 + Phase 3 recurrence features)_

10. Unit tests — `dateHelpers.ts`, `categoryColors.ts`, `storage.ts`, `recurrence.ts` (FR-13 – FR-20, §15 Unit).
11. Integration tests — `useEventStore` CRUD + persistence round-trip, `EventModal` create/edit/delete flows, view switching while preserving event data (§15 Integration, scenarios 1–6).
12. Recurrence tests — expand daily/weekly/monthly over correct ranges, edit/delete scope decisions (scenarios 5–6).
13. Accessibility checks — keyboard operation for modal open/close/submit/confirm, focus return, accessible labels (ACC-01 – ACC-03, scenario 8).
14. Performance spot-check — month-view render time with 100+ events (NF-01, scenario 7).
15. Data recovery test — corrupt `localStorage` payload resets safely (FR-30, scenario 9).

### Phase 3 Exit Criteria

- All 17 Acceptance Criteria from PRD §17 pass.
- All Must-priority functional and non-functional requirements implemented.
- Automated tests cover store, recurrence, modal flows, and calendar view behavior.
- No horizontal scroll on mobile layout.
- Focus management confirmed for keyboard users.
- `npm test` passes with no failures.

### Phase 3 Dependencies

```
[Phase 2: complete] ──► all Phase 3 agents
[calendar-domain-engineer: expandRecurringEvents] ──► [react-calendar-engineer: view wiring]
[calendar-domain-engineer: recurrence store] ──► [event-workflow-engineer: scope prompts]
[Phase 2 + Phase 3 features: all] ──► [qa-test-engineer: full test suite]
```

---

## Inter-Phase Dependency Summary

```
Phase 1 ──────────────────────────────► Phase 2 ──────────────────────► Phase 3
│                                        │                                 │
│ project-architect scaffolds            │ calendar-domain-engineer         │ calendar-domain-engineer
│ → enables all other agents             │   completes CRUD store           │   completes recurrence
│                                        │   → enables event-workflow       │   → enables view wiring
│ calendar-domain-engineer types         │                                  │   and scope UX
│ → enables react-calendar-engineer      │ event-workflow-engineer          │
│                                        │   delivers EventChip             │ qa-test-engineer
│                                        │   → enables view connections     │   tests all features
```

---

## Risk Watchpoints (from PRD §18.2)

| Risk | Phase Most Exposed | Mitigation |
|---|---|---|
| Recurrence edge cases (edit/delete scoping) | Phase 3 | Keep canonical model simple; document scope exceptions |
| `localStorage` corruption on startup | Phase 1, Phase 3 | Validate + safe reset in `storage.ts` |
| Mobile calendar density | Phase 2 | Test responsive layouts early; prioritize day view on small screens |
| Package version migration friction | Phase 1 | Lock versions in `package.json`; validate against current docs |
| Accessibility gaps | Phase 3 | Include keyboard + focus in definition-of-done; QA checks each phase |

---

## Deferred (Post-v1)

Items explicitly out of scope for this execution per PRD §3.2 and §19:
cloud sync, user accounts, shared calendars, notifications, ICS import/export, advanced recurrence rules.
