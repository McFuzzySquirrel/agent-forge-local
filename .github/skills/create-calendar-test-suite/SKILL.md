---
name: create-calendar-test-suite
description: >
  Create or extend requirement-driven test coverage for the Calendar Management App.
  Use this skill when translating PRD requirements into unit, integration, exploratory,
  accessibility, and performance checks.
---

# Skill: Create Calendar Test Suite

Use this skill to map Calendar Management App requirements to concrete automated and manual test coverage.

---

## Process

### Step 1: Build a Requirement-to-Test Matrix

List the requirements or scenarios under test and group them by behavior area:

- Navigation and views
- Event CRUD and validation
- Recurrence
- Persistence and recovery
- Responsive and accessibility behavior

Prioritize Must requirements first, then the highest-risk Should requirements.

### Step 2: Choose the Right Test Layer

Select the lightest test layer that still proves the behavior:

- **Unit** for helpers, validation, storage parsing, and recurrence expansion
- **Integration** for view switching, modal workflows, persistence, and recurrence decisions
- **Manual / exploratory** for browser quirks, responsive layout, keyboard polish, and performance spot checks

### Step 3: Create Reusable Test Fixtures and Harnesses

Set up deterministic event fixtures and helper utilities so the suite stays readable:

```ts
const recurringWeeklyWorkEvent = {
  id: "evt-work-1",
  title: "Client call",
  category: "work",
  recurrence: "weekly",
};
```

Prefer scenario-focused naming that makes failures obvious to the owning agent.

### Step 4: Cover Regression-Prone Paths

Always include checks for:

1. Invalid event data being rejected
2. Persisted events surviving reload
3. Corrupted storage recovering safely
4. Recurring events rendering across visible ranges
5. Mobile and keyboard flows staying usable after feature changes

### Step 5: Report Results by Ownership Boundary

When the suite finds failures, report them with:

- The requirement or scenario that failed
- The test layer where it failed
- The likely owning agent or component area

This keeps fixes routed to the correct specialist.

---

## Reference

See [docs/prd/calendar-app-prd.md](../../../docs/prd/calendar-app-prd.md) for the full specification:

- **Section 9** - Non-functional quality requirements
- **Section 11** - Accessibility expectations
- **Section 14** - Implementation phases and quality milestones
- **Section 15** - Testing strategy and core scenarios
- **Section 16** - Success metrics tied to reliability and responsiveness
- **Section 17** - Acceptance criteria that require automated coverage
- **Section 18** - Risk areas that deserve regression protection
