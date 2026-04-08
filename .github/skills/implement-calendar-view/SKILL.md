---
name: implement-calendar-view
description: >
  Build or refine a month, week, or day calendar view for the Calendar Management App.
  Use this skill when creating a new calendar surface or bringing an existing view into
  alignment with the PRD's navigation, layout, rendering, and accessibility requirements.
---

# Skill: Implement Calendar View

Use this skill to create a consistent calendar view component and matching CSS Module for the Calendar Management App.

---

## Process

### Step 1: Read the Target View Context

Identify whether the task is for month, week, or day view and confirm:

- The visible date range and granularity the view must represent
- Which entry points should open event creation or editing
- Which responsive constraints apply most strongly at this breakpoint
- Which existing shared contracts already exist for navigation and rendered event data

### Step 2: Define the View Contract

Write down the props and rendering responsibilities before coding. At minimum, establish:

```ts
type CalendarViewProps = {
  activeDate: Date;
  events: CalendarOccurrence[];
  onCreateEvent: (slot: CalendarSelection) => void;
  onSelectEvent: (eventId: string, occurrenceDate?: string) => void;
};
```

Confirm that the component consumes domain outputs rather than recalculating recurrence or persistence rules inside the UI.

### Step 3: Build the Component and Style Pair

Create or update:

- The React component under `src/components/`
- The matching CSS Module under `src/styles/`

While implementing:

- Keep the layout aligned with the PRD's month grid, week columns, or day timeline expectations
- Render event chips/blocks using the shared category color mapping
- Preserve obvious navigation context and tap/click targets

### Step 4: Add Interaction and Accessibility Details

Ensure the view:

- Supports the required create/edit entry points for cells or time slots
- Exposes accessible names or semantics for interactive controls and event items
- Avoids horizontal scrolling on mobile where the PRD forbids it
- Coordinates with the event workflow layer instead of embedding modal logic directly

### Step 5: Verify Against the View Checklist

Check the implementation against this list:

1. View renders the correct date range for the active date
2. Navigation keeps date/view state consistent
3. Event colors and labels are consistent with shared contracts
4. Create/edit entry points are available from the expected surfaces
5. Responsive layout remains usable at desktop, tablet, and mobile widths relevant to the view

---

## Reference

See [docs/prd/calendar-app-prd.md](../../../docs/prd/calendar-app-prd.md) for the full specification:

- **Section 7.2** - Project structure and target component file layout
- **Section 7.3** - Calendar header and event-display contracts
- **Section 8.1** - Calendar navigation and view requirements
- **Section 8.5** - Event rendering and responsive layout expectations
- **Section 11** - Accessibility expectations
- **Section 12** - UI and interaction design details
- **Section 15** - Test scenarios relevant to view behavior
- **Section 17** - Acceptance criteria for functioning views
