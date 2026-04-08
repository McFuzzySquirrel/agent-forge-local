# Example PRD: React Calendar Management App
#
# A more complex example designed to exercise the full agent swarm.
# Multiple files, cross-cutting concerns, component dependencies, state
# management, and tests give the Planner meaningful work to decompose.
#
# Use this to test the agent-forge-local pipeline:
#   agent-forge-local examples/calendar-app-prd.md -d /tmp/calendar-app -v

## Overview

Build a **React-based calendar management application** that lets users create,
view, edit, and delete events. The app should support day, week, and month
views, recurring events, and colour-coded event categories.

This is a single-page application (SPA) bootstrapped with Vite + React 18 and
written in TypeScript.

---

## Functional Requirements

### 1. Calendar Views

| View   | Description                                              |
|--------|----------------------------------------------------------|
| Month  | Traditional grid showing all days in the current month.  |
| Week   | 7-column grid with hourly time slots (00:00–23:00).      |
| Day    | Single-column with hourly time slots for one day.        |

- Users must be able to switch between views via a tab bar or dropdown.
- Navigation arrows allow moving forward/backward by one unit (day/week/month).
- A "Today" button returns to the current date.

### 2. Event Management (CRUD)

- **Create**: Click on a time slot or day cell to open an "Add Event" modal.
- **Read**: Events render as coloured chips on the calendar grid.
- **Update**: Click an existing event chip to open a pre-filled "Edit Event"
  modal.
- **Delete**: The edit modal includes a "Delete" button with a confirmation
  dialog.

### 3. Event Data Model

Each event has:

| Field         | Type                | Notes                                    |
|---------------|---------------------|------------------------------------------|
| `id`          | `string` (UUID)     | Auto-generated                           |
| `title`       | `string`            | Required, max 120 chars                  |
| `description` | `string`            | Optional, max 500 chars                  |
| `startTime`   | `ISO 8601 datetime` | Required                                 |
| `endTime`     | `ISO 8601 datetime` | Required, must be after `startTime`      |
| `category`    | `enum`              | One of: `work`, `personal`, `health`, `social`, `other` |
| `recurrence`  | `enum \| null`      | `daily`, `weekly`, `monthly`, or `null`  |
| `color`       | `string`            | Hex colour auto-assigned from category   |

### 4. Recurring Events

- When `recurrence` is set, the calendar should generate virtual occurrences
  up to 90 days ahead without duplicating storage.
- Editing a single occurrence should ask "Edit this event only" or "Edit all
  future events".
- Deleting a recurring event should ask "Delete this occurrence" or "Delete
  all".

### 5. Category Colour Mapping

| Category   | Default Colour |
|------------|----------------|
| work       | `#4A90D9`      |
| personal   | `#7B68EE`      |
| health     | `#2ECC71`      |
| social     | `#F39C12`      |
| other      | `#95A5A6`      |

### 6. Persistence

- All data persists in the browser via `localStorage`.
- On load, the app hydrates state from `localStorage`.
- Every mutation (create/update/delete) flushes state to `localStorage`.

### 7. Responsive Layout

- Desktop (≥ 1024 px): full calendar grid with sidebar.
- Tablet (768–1023 px): calendar grid, no sidebar.
- Mobile (< 768 px): day view only with a date picker.

---

## Non-Functional Requirements

- **Accessibility**: all interactive elements must be keyboard-navigable; modals
  trap focus; ARIA labels on calendar cells.
- **Performance**: month view must render < 200 ms for a calendar with 100+
  events (use `React.memo` / `useMemo` where appropriate).
- **Testing**: unit tests for state management, integration tests for the event
  modal flow.

---

## Technical Constraints

- React 18 + TypeScript (strict mode)
- Vite for build tooling
- CSS Modules for styling (no CSS-in-JS libraries)
- `date-fns` for date manipulation (no Moment.js)
- `uuid` for event IDs
- Vitest + React Testing Library for tests
- No backend — purely client-side

---

## Suggested File Structure

```
calendar-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                        — App entry point
│   ├── App.tsx                         — Root component, view routing
│   ├── types/
│   │   └── event.ts                    — Event interface & enums
│   ├── store/
│   │   ├── useEventStore.ts            — Custom hook: CRUD + localStorage sync
│   │   └── recurrence.ts              — Recurring-event expansion logic
│   ├── components/
│   │   ├── CalendarHeader.tsx          — Nav arrows, Today button, view switcher
│   │   ├── MonthView.tsx               — Month grid
│   │   ├── WeekView.tsx                — Week grid with time slots
│   │   ├── DayView.tsx                 — Day grid with time slots
│   │   ├── EventChip.tsx               — Coloured event chip rendered in cells
│   │   ├── EventModal.tsx              — Add / Edit event form modal
│   │   └── ConfirmDialog.tsx           — Reusable confirmation dialog
│   ├── utils/
│   │   ├── dateHelpers.ts              — Wrappers around date-fns
│   │   └── categoryColors.ts           — Category → colour map
│   └── styles/
│       ├── App.module.css
│       ├── CalendarHeader.module.css
│       ├── MonthView.module.css
│       ├── WeekView.module.css
│       ├── DayView.module.css
│       ├── EventChip.module.css
│       ├── EventModal.module.css
│       └── ConfirmDialog.module.css
├── tests/
│   ├── useEventStore.test.ts           — Store CRUD + persistence tests
│   ├── recurrence.test.ts              — Recurring-event expansion tests
│   ├── EventModal.test.tsx             — Modal integration tests
│   └── dateHelpers.test.ts             — Date utility tests
└── README.md
```

---

## Acceptance Criteria (high-level)

1. Running `npm run dev` starts the app on `localhost:5173` with a working
   month-view calendar.
2. Users can create, view, edit, and delete events via the modal.
3. Switching between Day / Week / Month views works without data loss.
4. Recurring events display correctly across multiple weeks/months.
5. All data survives a page refresh (localStorage).
6. `npm run test` passes all unit and integration tests.
7. The app is usable on mobile (< 768 px) without horizontal scrolling.
