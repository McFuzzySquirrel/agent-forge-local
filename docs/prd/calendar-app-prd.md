# Calendar Management App

## 1. Overview

**Product Name:** Calendar Management App
**Summary:** A single-page web application for individual users managing personal and light professional schedules. The product provides day, week, and month calendar views; event CRUD workflows; recurring event handling; responsive layouts; and reliable browser-based persistence without a backend.
**Target Platform:** Modern desktop and mobile browsers as a client-side SPA.
**Key Constraints:** No backend, no accounts, no multi-user collaboration, no external calendar sync, no notifications/reminders, browser-only persistence via `localStorage`, and implementation should use current stable versions of the selected front-end stack.

---

## 2. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-08 | Copilot | Expanded the example outline into a full PRD with personas, phased delivery, functional and non-functional requirements, current-stack research, risks, and open questions. |

Track document revisions so readers know what changed and when.

---

## 3. Goals and Non-Goals

### 3.1 Goals
- Deliver a polished reference implementation of a calendar SPA for personal and light professional scheduling.
- Support complete event creation, viewing, editing, and deletion flows.
- Provide usable day, week, and month calendar views with intuitive date navigation.
- Support recurring events without duplicating stored event instances.
- Preserve data across page reloads using browser-only storage.
- Demonstrate responsive design, strong test coverage, and clean front-end architecture suitable for future extension.

### 3.2 Non-Goals
- User accounts, authentication, or user-specific cloud data sync.
- Backend APIs, server persistence, or multi-device data portability.
- Multi-user collaboration, shared calendars, team scheduling, or permissions.
- Notification delivery, reminders, email workflows, or push alerts.
- Third-party calendar integration such as Google Calendar, Outlook, CalDAV, or ICS import/export.
- Enterprise-grade compliance features beyond standard good-practice browser security.

---

## 4. User Stories / Personas

### 4.1 Personas

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| Personal Planner Priya | An individual using the app to manage appointments, errands, workouts, and reminders for daily life. | Fast event entry, easy date navigation, mobile usability, persistent local data. |
| Freelance Organizer Finn | A solo professional balancing client calls, focused work blocks, and personal commitments. | Clear week/day planning, category separation, recurrence support, quick edits. |
| Demo Reviewer Dana | A stakeholder or evaluator reviewing the app as a reference implementation or portfolio-quality sample. | Predictable workflows, visible completeness, responsive behavior, testable architecture. |

### 4.2 User Stories

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|-----------|----------|
| US-01 | Personal Planner Priya | switch between month, week, and day views | I can plan at different time horizons | Must |
| US-02 | Personal Planner Priya | create an event from a day cell or time slot | I can capture plans quickly | Must |
| US-03 | Freelance Organizer Finn | edit or delete an existing event | I can keep my schedule accurate | Must |
| US-04 | Freelance Organizer Finn | assign categories with consistent colors | I can visually scan event types | Must |
| US-05 | Freelance Organizer Finn | create recurring events | I do not need to re-enter repeating commitments | Must |
| US-06 | Personal Planner Priya | return to today from any navigated date | I can recover context quickly | Must |
| US-07 | Demo Reviewer Dana | reload the app without losing data | the product feels complete and trustworthy | Must |
| US-08 | Personal Planner Priya | use the app comfortably on mobile | I can manage my schedule away from my desk | Should |
| US-09 | Demo Reviewer Dana | see clear empty, loading, and validation states | the product feels polished and understandable | Should |
| US-10 | Demo Reviewer Dana | rely on automated tests covering key workflows | the implementation can be changed with confidence | Should |

---

## 5. Research Findings

- The existing sample PRD defined a React 18 + TypeScript + Vite SPA with CSS Modules, `date-fns`, `uuid`, Vitest, and React Testing Library. The user requested that the document be refreshed to current stable versions instead of preserving the older stack as written.
- Current stable package research indicates newer major versions are available across the primary stack: React `19.2.5`, Vite `8.0.7`, TypeScript `6.0.2`, `date-fns` `4.1.0`, `uuid` `13.0.0`, Vitest `4.1.3`, and `@testing-library/react` `16.3.2`.
- Vite 8 raises the Node runtime floor (`^20.19.0 || >=22.12.0`), so the PRD should recommend Node 22 LTS or newer for development consistency.
- `uuid` 13 is ESM-first, which is compatible with a Vite-based SPA, but should be called out so implementation does not assume legacy CommonJS-only usage patterns.
- `date-fns` 4 keeps the project aligned with current maintained date utilities while preserving the original design intent of avoiding Moment.js.

### Technology Decision Summary

| Area | Original Draft | Current Recommendation | Why |
|------|----------------|------------------------|-----|
| UI framework | React 18 | React 19.2.x | Current stable release with long-lived ecosystem support. |
| Build tool | Vite | Vite 8.0.x | Current stable release; fast DX; aligns with modern React workflows. |
| Language | TypeScript strict mode | TypeScript 6.0.x strict mode | Current compiler improvements and long-term maintainability. |
| Date utilities | `date-fns` | `date-fns` 4.1.x | Maintained, modular, and aligned with original no-Moment constraint. |
| ID generation | `uuid` | `uuid` 13.0.x | Current maintained release; suitable for local entity IDs. |
| Test runner | Vitest | Vitest 4.1.x | Strong Vite integration and good front-end testing ergonomics. |
| Component testing | React Testing Library | `@testing-library/react` 16.3.x | Current maintained compatibility with modern React. |

### Best-Practice Notes

- Treat recurrence as a virtual expansion concern layered on top of canonical stored events.
- Keep persistence boundaries simple: state store owns read/write to `localStorage`, UI components remain declarative.
- Prefer explicit validation and deterministic date calculations over permissive parsing.
- Provide clear modal and confirmation flows to avoid accidental destructive edits.

---

## 6. Concept

### 6.1 Core Loop / Workflow

1. User opens the app and the calendar hydrates from `localStorage`.
2. User lands on the current date in the last-used or default view.
3. User navigates the calendar using previous/next controls, view switching, and a Today shortcut.
4. User selects a day cell or time slot to open the event modal.
5. User enters event details, category, and optional recurrence, then saves.
6. The app validates input, persists the canonical event model, and re-renders visible occurrences.
7. User later selects an existing event to edit or delete it, with recurrence-specific confirmation when applicable.
8. Changes persist immediately and survive refresh.

Text flow:

`Load app -> hydrate state -> browse calendar -> create/edit/delete event -> persist to localStorage -> re-render visible calendar -> repeat`

### 6.2 Success / Completion Criteria

- A user can manage a personal schedule entirely inside the SPA without server support.
- Key flows work consistently across day, week, and month views.
- Recurring events appear correctly for visible ranges and can be edited or deleted with clear user intent.
- The app remains understandable and responsive on desktop and mobile.
- Automated tests cover the most important logic and workflows.

---

## 7. Technical Architecture

### 7.1 Technology Stack

| Component | Technology | Version Notes |
|-----------|------------|---------------|
| Runtime | Node.js | Recommend Node 22 LTS+ for local development because Vite 8 requires `^20.19.0 || >=22.12.0`. |
| Front-end framework | React | Use current stable React 19.2.x. Original sample used React 18. |
| Language | TypeScript | Use TypeScript 6.0.x in strict mode. |
| Build tooling | Vite | Use Vite 8.0.x for SPA dev/build workflows. |
| Styling | CSS Modules | Preserve original styling constraint; no CSS-in-JS required. |
| Date utilities | `date-fns` | Use 4.1.x. |
| ID generation | `uuid` | Use 13.0.x; account for ESM-first packaging. |
| Testing | Vitest | Use 4.1.x for unit/integration tests. |
| Component testing | React Testing Library | Use 16.3.x. |
| Persistence | Browser `localStorage` | No server-side data storage in v1. |

### 7.2 Project Structure

```text
calendar-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── event.ts
│   ├── store/
│   │   ├── useEventStore.ts
│   │   └── recurrence.ts
│   ├── components/
│   │   ├── CalendarHeader.tsx
│   │   ├── MonthView.tsx
│   │   ├── WeekView.tsx
│   │   ├── DayView.tsx
│   │   ├── EventChip.tsx
│   │   ├── EventModal.tsx
│   │   └── ConfirmDialog.tsx
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   ├── categoryColors.ts
│   │   └── storage.ts
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
│   ├── useEventStore.test.ts
│   ├── recurrence.test.ts
│   ├── EventModal.test.tsx
│   ├── CalendarViews.test.tsx
│   └── dateHelpers.test.ts
└── README.md
```

### 7.3 Key APIs / Interfaces

| Interface / API | Purpose |
|-----------------|---------|
| `CalendarEvent` | Canonical event model containing title, description, time range, category, recurrence, and ID. |
| `useEventStore()` | Front-end state hook handling CRUD operations, validation orchestration, and persistence sync. |
| `expandRecurringEvents()` | Converts canonical recurring events into visible occurrences for the active date range. |
| `saveEventsToStorage()` / `loadEventsFromStorage()` | Isolates serialization and storage-key behavior. |
| `CalendarHeader` props contract | Drives date navigation, view switching, and Today action. |
| `EventModal` props contract | Supports create/edit mode, validation feedback, and recurrence-aware actions. |

---

## 8. Functional Requirements

### 8.1 Calendar Navigation and Views

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | The system must provide month, week, and day calendar views. | Must |
| FR-02 | The user must be able to switch views through an obvious control such as tabs or a segmented switcher. | Must |
| FR-03 | The system must support previous and next navigation relative to the active view granularity. | Must |
| FR-04 | The system must provide a Today action that returns the user to the current date context. | Must |
| FR-05 | The active date and active view must remain internally consistent when navigating or switching views. | Must |

### 8.2 Event Creation and Editing

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-06 | The user must be able to create an event by selecting a relevant day cell or time slot. | Must |
| FR-07 | The system must open a modal form for event creation and editing. | Must |
| FR-08 | The edit flow must preload the selected event's current values. | Must |
| FR-09 | The user must be able to delete an event from the edit experience. | Must |
| FR-10 | Destructive actions must require explicit confirmation. | Must |

### 8.3 Event Data Model and Validation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-11 | Each event must include `id`, `title`, `description`, `startTime`, `endTime`, `category`, `recurrence`, and derived display color. | Must |
| FR-12 | Event IDs must be generated automatically and remain stable after creation. | Must |
| FR-13 | `title` must be required and limited to 120 characters. | Must |
| FR-14 | `description` must be optional and limited to 500 characters. | Must |
| FR-15 | `endTime` must be later than `startTime`. | Must |
| FR-16 | `category` must be one of `work`, `personal`, `health`, `social`, or `other`. | Must |
| FR-17 | Validation errors must be shown inline in the modal before save completion. | Should |

### 8.4 Recurring Events

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-18 | The system must support `daily`, `weekly`, `monthly`, and non-recurring events. | Must |
| FR-19 | Recurring events must be expanded virtually for visible rendering instead of duplicating stored instances. | Must |
| FR-20 | Virtual recurrence expansion must cover at least 90 days ahead from the relevant viewing window. | Must |
| FR-21 | Editing a recurring event must present options to update only the selected occurrence or all future occurrences where supported by the chosen implementation design. | Should |
| FR-22 | Deleting a recurring event must present options to delete only the selected occurrence or all future occurrences where supported by the chosen implementation design. | Should |

### 8.5 Visual Categorization and Layout

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-23 | Events must render as colored chips or blocks in the calendar grid. | Must |
| FR-24 | Categories must map to consistent default colors across all views. | Must |
| FR-25 | Desktop layout must support a full calendar experience at widths of 1024 px and above. | Must |
| FR-26 | Tablet layout must retain a usable calendar grid without a desktop-only sidebar dependency. | Must |
| FR-27 | Mobile layout must optimize for day-first scheduling and avoid horizontal scrolling. | Must |

### 8.6 Persistence and State

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-28 | The application must load event data from `localStorage` on startup. | Must |
| FR-29 | Every successful create, update, or delete action must write the new canonical event state to `localStorage`. | Must |
| FR-30 | The application should gracefully recover from missing or invalid stored data by resetting to a safe empty state with user-visible messaging. | Should |

---

## 9. Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NF-01 | Month view should render in under 200 ms for datasets of 100 or more visible events on typical modern hardware. | Should |
| NF-02 | Code should be organized into focused components, reusable utilities, and testable state logic. | Must |
| NF-03 | The application must use TypeScript strict mode. | Must |
| NF-04 | The UI should remain responsive during calendar navigation and event CRUD flows. | Must |
| NF-05 | The solution should be understandable as a reference implementation and suitable for future feature extension. | Must |
| NF-06 | The product should support current stable versions of its core dependencies at the time of implementation. | Must |

---

## 10. Security and Privacy

| ID | Requirement | Priority |
|----|-------------|----------|
| SP-01 | The product must operate without authentication or authorization because v1 is strictly local-only. | Must |
| SP-02 | The product must store data only in the browser's `localStorage` and must not transmit event data to a server in v1. | Must |
| SP-03 | The product should clearly imply local-only persistence so users do not assume cross-device backup or sync. | Should |
| SP-04 | The implementation should avoid unsafe HTML rendering and should treat event content as plain text. | Must |
| SP-05 | The implementation should validate and sanitize persisted data read from storage before use. | Should |

Documented privacy posture: no special compliance requirements were provided; the product handles user-entered schedule information locally in the browser only and does not introduce account data, payment data, or regulated-health workflows.

---

## 11. Accessibility

| ID | Requirement | Priority |
|----|-------------|----------|
| ACC-01 | Core interactions should be usable via keyboard, including opening modals, navigating controls, and confirming or cancelling actions. | Should |
| ACC-02 | Modals should manage focus predictably and return focus to the invoking element on close. | Should |
| ACC-03 | Interactive controls should have accessible names and labels. | Should |
| ACC-04 | Calendar cells and event items should expose meaningful semantics where practical for a reference SPA. | Should |
| ACC-05 | Color should not be the only mechanism for understanding event category when reasonable supplemental text or labels can be provided. | Could |

Accessibility target: best-effort accessibility rather than formal certification. Even so, the design should follow good front-end accessibility practice and avoid preventable barriers.

---

## 12. User Interface / Interaction Design

- The primary layout includes a header with current date context, previous/next navigation, Today shortcut, and view selector.
- Month view uses a traditional grid of days with visible event chips.
- Week view uses a 7-column layout with hourly slots.
- Day view uses a single-column timeline optimized for dense scheduling and mobile readability.
- Event chips should display the title and use category color mapping.
- The event modal should support create and edit modes with clear validation messaging, save/cancel actions, and delete availability in edit mode only.
- Confirmation dialogs should be used for destructive actions and recurrence-scope decisions.
- Mobile behavior should prioritize legibility and tap targets over feature density.

---

## 13. System States / Lifecycle

1. **Initial Load:** App starts, reads persisted data, initializes current date/view.
2. **Empty State:** No events exist; the UI encourages event creation.
3. **Viewing State:** Calendar renders current range and visible events.
4. **Creating State:** User opens create modal and enters event details.
5. **Editing State:** User opens edit modal for an existing event.
6. **Validation Error State:** Save is blocked and inline guidance is shown.
7. **Confirming Destructive Action:** User must confirm delete or recurrence-scope operation.
8. **Persisting State:** Store updates in memory and flushes canonical state to `localStorage`.
9. **Recovery State:** Invalid persisted data is detected and reset safely if needed.

State transition summary:

`Initial Load -> Empty/Viewing -> Creating/Editing -> Validation Error or Persisting -> Viewing`

---

## 14. Implementation Phases

### Phase 1: Core Calendar Foundation
- [ ] Scaffold the Vite + React + TypeScript application with strict configuration and CSS Modules.
- [ ] Implement event types, category colors, date helpers, and storage utilities.
- [ ] Build the calendar header and month/week/day navigation framework.
- [ ] Add `localStorage` hydration and persistence plumbing.

### Phase 2: Event Workflows and Responsiveness
- [ ] Implement event create, edit, and delete flows with modal and confirmation dialog support.
- [ ] Render events across month, week, and day views with category-based styling.
- [ ] Deliver responsive layouts for desktop, tablet, and mobile behavior.
- [ ] Add empty states, validation messaging, and destructive-action safeguards.

### Phase 3: Recurrence, Quality, and Polish
- [ ] Implement recurring-event expansion and recurrence-aware edit/delete decisions.
- [ ] Optimize visible rendering behavior for larger event counts.
- [ ] Add comprehensive unit and integration tests for store logic, recurrence, modal flows, and core view behavior.
- [ ] Refine accessibility, edge-case handling, and developer documentation.

---

## 15. Testing Strategy

| Level | Scope | Tools / Approach |
|-------|-------|------------------|
| Unit Tests | Date helpers, category mapping, storage utilities, validation helpers, recurrence expansion logic | Vitest |
| Integration Tests | Event modal create/edit/delete flows, store persistence behavior, recurrence decisions, view switching | Vitest + React Testing Library |
| Manual / Exploratory | Responsiveness, UX polish, keyboard interactions, edge-case flows | Browser-based exploratory QA |
| Performance | Month-view rendering with large sample datasets | Lightweight browser profiling and timed render checks |
| Cross-Platform | Modern desktop and mobile browsers | Manual matrix for Chromium, Firefox, and Safari-class browsers |

Key test scenarios:

1. Create an event from month, week, and day entry points.
2. Reject saves when title is missing or end time is not after start time.
3. Persist events to `localStorage` and restore them after refresh.
4. Switch views without losing event data or date context.
5. Render recurring events correctly across visible ranges.
6. Confirm delete flows and recurrence-scope choices behave as expected.
7. Verify mobile layout avoids horizontal overflow.
8. Verify keyboard operation for modal open, close, submit, and destructive confirmation.
9. Recover safely from invalid or corrupted stored payloads.

---

## 16. Analytics / Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Feature completeness | All Must requirements implemented | Manual acceptance review against this PRD |
| Test reliability | All automated tests passing in CI/local runs | Test runner results |
| Responsiveness | Acceptable interaction speed for 100+ visible events | Manual profiling and benchmark spot-checks |
| Usability | Core scheduling tasks completed without guidance by a reviewer | Exploratory review and qualitative feedback |

No telemetry is planned for v1. Success will be evaluated through implementation completeness, test results, and qualitative review of the user experience.

---

## 17. Acceptance Criteria

1. `npm run dev` starts the app locally with a functioning calendar UI.
2. Users can create, view, edit, and delete events in the UI.
3. Day, week, and month views all function correctly and preserve state.
4. Category color mapping is applied consistently across views.
5. Recurring events render correctly without duplicating canonical storage records.
6. Event data survives a page refresh through `localStorage`.
7. The app remains usable on mobile without horizontal scrolling.
8. Validation prevents invalid event data from being saved.
9. Automated tests cover the store, recurrence logic, calendar interaction flows, and modal workflows.
10. The final implementation remains within the declared non-goals for v1.

---

## 18. Dependencies and Risks

### 18.1 Dependencies

| Dependency | Type | Risk if Unavailable | Mitigation |
|------------|------|---------------------|------------|
| React | npm | Core UI cannot be implemented as planned | Replace with another SPA framework only through explicit scope change |
| Vite | npm / tooling | Slower or reworked project bootstrap/build flow | Fall back to another maintained bundler only if required |
| `date-fns` | npm | Date math becomes more error-prone and verbose | Wrap date operations behind helpers so library swap is localized |
| `uuid` | npm | ID generation logic must be reimplemented | Substitute with Web Crypto UUID support where appropriate |
| Vitest + React Testing Library | npm / testing | Reduced confidence in behavior | Fall back to alternate test tooling with equivalent coverage |
| Browser `localStorage` | Web platform | Persistence unavailable in restrictive environments | Degrade gracefully to session-only behavior if needed, while documenting limitations |

### 18.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Recurrence logic becomes complex for edit/delete edge cases | Medium | High | Keep canonical model simple and document scope for recurrence exceptions clearly |
| `localStorage` payload corruption breaks startup | Medium | Medium | Validate and safely reset malformed stored data |
| Mobile calendar density harms usability | Medium | Medium | Prioritize day view on small screens and test responsive layouts early |
| Updating to newer major package versions introduces migration friction | Medium | Medium | Lock versions explicitly and validate assumptions against current docs during implementation |
| Best-effort accessibility leaves discoverable usability gaps | Medium | Medium | Include keyboard and focus behavior in definition-of-done and manual QA |

---

## 19. Future Considerations

| Item | Description | Potential Version |
|------|-------------|-------------------|
| Cloud sync | Persist events across devices and sessions | v2 |
| User accounts | Enable identity, personalized storage, and preferences | v2 |
| Shared calendars | Support collaboration, invitations, and visibility controls | v3 |
| Notifications and reminders | Add scheduled alerts and reminder workflows | v2 |
| Calendar import/export | Support ICS or external calendar interoperability | v3 |
| Advanced recurrence rules | Add exceptions, custom intervals, and richer recurrence editing | v2 |

---

## 20. Open Questions

| # | Question | Default Assumption |
|---|----------|--------------------|
| 1 | Should recurrence edits/deletes support full exception modeling or a simpler "split series" behavior? | Implement the simplest understandable approach that supports "this occurrence" vs. "all future" without full enterprise recurrence semantics. |
| 2 | Which exact browser support matrix is required? | Target current stable versions of major Chromium, Firefox, and Safari-class browsers. |
| 3 | Should the app remember the user's last active view and date between sessions? | Default to loading the current date and a reasonable default view unless persistence of view state is added during implementation. |
| 4 | Is drag-and-drop event rescheduling desired? | Exclude from v1. |
| 5 | How much empty/loading polish is needed for a reference sample? | Include clear empty states and lightweight loading/recovery messaging, but avoid overbuilding transitions. |

---

## 21. Glossary

| Term | Definition |
|------|------------|
| Canonical event | The single stored record representing an event before recurrence expansion. |
| Recurring occurrence | A rendered instance derived from a canonical recurring event for a specific date/time. |
| Day view | Calendar layout focused on a single day's hourly schedule. |
| Week view | Calendar layout showing a seven-day time-grid schedule. |
| Month view | Calendar layout showing all days in the selected month. |
| `localStorage` | Browser-provided key-value storage used for local persistence in this product. |
| SPA | Single-page application. |
