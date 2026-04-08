# Team and Skills

This document summarizes the custom GitHub Copilot agents and reusable skills generated from `docs/prd/calendar-app-prd.md` for the Calendar Management App.

## Team Summary

The generated team uses five specialist agents with clear ownership boundaries:

| Agent | File | Purpose | Primary Focus |
|---|---|---|---|
| `project-architect` | `.github/agents/project-architect.md` | Establishes the project foundation and tooling. | Vite/React/TypeScript bootstrap, dependency management, root setup, README guidance |
| `calendar-domain-engineer` | `.github/agents/calendar-domain-engineer.md` | Owns the app's core data and state logic. | Event model, validation, recurrence, date helpers, `localStorage` persistence |
| `react-calendar-engineer` | `.github/agents/react-calendar-engineer.md` | Builds the visible calendar UI and layout behavior. | App composition, header/navigation, month/week/day views, responsive event rendering |
| `event-workflow-engineer` | `.github/agents/event-workflow-engineer.md` | Owns event CRUD interactions and destructive workflows. | Modal form UX, inline validation display, confirmation dialogs, recurrence-scope prompts |
| `qa-test-engineer` | `.github/agents/qa-test-engineer.md` | Verifies the implementation against the PRD. | Unit/integration coverage, manual QA, accessibility checks, responsive checks, performance spot checks |

## Agent Details

### `project-architect`

- **When to use:** For project setup and foundation work.
- **Key responsibilities:** Scaffold the Vite + React + TypeScript app, configure strict TypeScript, set up scripts and root files, and document local setup expectations.
- **Owns:** `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, and project-level README updates.
- **Collaborates with:** `react-calendar-engineer`, `calendar-domain-engineer`, `qa-test-engineer`.

### `calendar-domain-engineer`

- **When to use:** For non-UI business logic and data behavior.
- **Key responsibilities:** Define the canonical event model, implement validation rules, manage persistence boundaries, expand recurring events virtually, and recover safely from malformed stored data.
- **Owns:** `src/types/event.ts`, `src/store/useEventStore.ts`, `src/store/recurrence.ts`, `src/utils/dateHelpers.ts`, `src/utils/storage.ts`, and shared category mapping utilities.
- **Collaborates with:** `react-calendar-engineer`, `event-workflow-engineer`, `qa-test-engineer`.

### `react-calendar-engineer`

- **When to use:** For building or refining the main calendar interface.
- **Key responsibilities:** Compose calendar state into the app shell, implement month/week/day views, render event chips/blocks consistently, and deliver responsive layouts without horizontal scrolling on mobile.
- **Owns:** `src/App.tsx`, `src/components/CalendarHeader.tsx`, `src/components/MonthView.tsx`, `src/components/WeekView.tsx`, `src/components/DayView.tsx`, `src/components/EventChip.tsx`, and matching CSS Modules.
- **Collaborates with:** `project-architect`, `calendar-domain-engineer`, `event-workflow-engineer`, `qa-test-engineer`.

### `event-workflow-engineer`

- **When to use:** For create/edit/delete flows and dialog behavior.
- **Key responsibilities:** Implement event modal flows, show inline validation errors, require explicit destructive confirmation, support recurrence-aware edit/delete decisions, and manage keyboard/focus behavior in dialogs.
- **Owns:** `src/components/EventModal.tsx`, `src/components/ConfirmDialog.tsx`, and their matching CSS Modules.
- **Collaborates with:** `react-calendar-engineer`, `calendar-domain-engineer`, `qa-test-engineer`.

### `qa-test-engineer`

- **When to use:** For verification, regression coverage, and quality gates.
- **Key responsibilities:** Translate PRD requirements into tests, cover recurrence/persistence/validation scenarios, run responsive and accessibility checks, and report failures back to the owning specialist.
- **Owns:** `tests/useEventStore.test.ts`, `tests/recurrence.test.ts`, `tests/EventModal.test.tsx`, `tests/CalendarViews.test.tsx`, `tests/dateHelpers.test.ts`, plus manual QA artifacts as needed.
- **Collaborates with:** All implementation agents and `project-orchestrator`.

## Reusable Skills

The generated skill set captures repeated implementation patterns across the calendar app:

| Skill | File | Purpose | Typical Users |
|---|---|---|---|
| `implement-calendar-view` | `.github/skills/implement-calendar-view/SKILL.md` | Standardizes the process for building month, week, or day calendar views. | `react-calendar-engineer` |
| `wire-event-workflow` | `.github/skills/wire-event-workflow/SKILL.md` | Standardizes event create/edit/delete and recurrence-scope interaction wiring. | `react-calendar-engineer`, `event-workflow-engineer` |
| `create-calendar-test-suite` | `.github/skills/create-calendar-test-suite/SKILL.md` | Standardizes requirement-driven test planning and implementation. | `qa-test-engineer` |

## Skill Details

### `implement-calendar-view`

- **When to use:** When creating or refining a month, week, or day view.
- **What it covers:** View contract design, component/CSS Module pairing, event rendering, create/edit entry points, accessibility details, and responsive verification.
- **Best fit:** Repeated calendar-surface work where consistent structure matters more than one-off component tweaks.

### `wire-event-workflow`

- **When to use:** When connecting calendar interactions to event forms and confirmations.
- **What it covers:** Workflow state design, modal wiring, validation flow, destructive confirmation, and recurrence-scope handling.
- **Best fit:** Multi-step event UX changes that span calendar views, dialogs, and domain callbacks.

### `create-calendar-test-suite`

- **When to use:** When adding or extending quality coverage for new or changed behavior.
- **What it covers:** Requirement-to-test mapping, choosing the right test layer, reusable fixtures, regression-prone scenarios, and failure routing by ownership boundary.
- **Best fit:** Any milestone that needs traceable coverage against the PRD's Must requirements and known risk areas.

## Coverage Model

This team was intentionally kept compact because the PRD does **not** include:

- backend APIs
- authentication or accounts
- external calendar sync
- notifications/reminders
- infrastructure or deployment-specific scope

That means the generated team focuses on front-end architecture, domain logic, UI workflows, and QA only.

## Related Files

- PRD: `docs/prd/calendar-app-prd.md`
- Agents: `.github/agents/`
- Skills: `.github/skills/`
- Orchestrator: `.github/agents/project-orchestrator.md`
