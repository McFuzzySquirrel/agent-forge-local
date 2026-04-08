---
name: wire-event-workflow
description: >
  Implement or refine the Calendar Management App's event create, edit, delete, and
  recurrence-scope flows. Use this skill when connecting view interactions, modal forms,
  validation feedback, and destructive confirmations into a single user workflow.
---

# Skill: Wire Event Workflow

Use this skill to connect calendar interactions to the event modal, validation flow, and confirmation dialogs without blurring domain and UI responsibilities.

---

## Process

### Step 1: Identify the Workflow Variant

Clarify which workflow you are building:

- Create from a month/day cell or week/day time slot
- Edit an existing event
- Delete an existing event
- Apply a recurrence-scoped action such as "this occurrence" or "all future"

Confirm which requirement IDs the workflow needs to satisfy before changing any code.

### Step 2: Define the Callback and State Model

Map the minimum shared state needed between the calendar surface, modal, and confirmation layer:

```ts
type EventWorkflowState = {
  mode: "create" | "edit";
  selectedEventId?: string;
  selectedOccurrenceDate?: string;
  pendingConfirmation?: "delete" | "edit-scope" | "delete-scope";
};
```

Keep domain rules in the store/domain layer and let the workflow layer orchestrate presentation state and user decisions.

### Step 3: Implement Form and Confirmation Behavior

Build the modal and confirmation sequence so that it:

- Opens with the correct initial data
- Shows inline validation before save completion
- Distinguishes between cancel, save, delete, and recurrence-scope actions
- Returns focus safely when dialogs close

### Step 4: Handle Recurrence and Destructive Decisions Explicitly

For recurring events:

1. Ask the user to choose scope only when the action requires it
2. Use the domain layer's supported behavior rather than inventing extra recurrence semantics
3. Make destructive confirmation explicit and understandable

For non-recurring events, skip unnecessary recurrence prompts.

### Step 5: Verify the Workflow End to End

Validate the following cases:

1. Create flow from each supported entry point
2. Edit flow with existing values preloaded
3. Delete flow requiring explicit confirmation
4. Validation failures staying inline and blocking save
5. Recurrence-aware actions following the supported scope behavior

---

## Reference

See [docs/prd/calendar-app-prd.md](../../../docs/prd/calendar-app-prd.md) for the full specification:

- **Section 6.1** - Core app workflow
- **Section 7.3** - Event modal and confirmation contracts
- **Section 8.2** - Event create/edit/delete requirements
- **Section 8.3** - Validation and field constraints
- **Section 8.4** - Recurrence-scope expectations
- **Section 11** - Keyboard and focus expectations
- **Section 12** - Modal and confirmation interaction design
- **Section 13** - Creating, editing, validation, and confirmation states
- **Section 15** - Key test scenarios for modal and destructive flows
- **Section 17** - Acceptance criteria for event workflows
