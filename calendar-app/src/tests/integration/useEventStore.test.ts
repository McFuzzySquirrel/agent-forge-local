/**
 * Integration tests for src/store/useEventStore.ts
 * PRD §15 (Testing Strategy), FR-13–FR-17 (CRUD), FR-21–FR-22 (recurrence mutations)
 *
 * Uses renderHook from @testing-library/react with jsdom localStorage.
 * localStorage is cleared before each test to ensure isolation.
 */

import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import type { CalendarEvent } from '../../types/event';
import { useEventStore } from '../../store/useEventStore';
import type { EventDraft } from '../../store/useEventStore';
import { loadEventsFromStorage } from '../../utils/storage';

const STORAGE_KEY = 'calendar-app-events';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validDraft: EventDraft = {
  title: 'Team Meeting',
  description: 'Weekly sync',
  startTime: '2024-01-15T09:00:00.000Z',
  endTime: '2024-01-15T10:00:00.000Z',
  category: 'work',
  recurrence: 'none',
};

const dailyDraft: EventDraft = {
  title: 'Daily Standup',
  description: '',
  startTime: '2024-01-15T09:00:00.000Z',
  endTime: '2024-01-15T09:30:00.000Z',
  category: 'work',
  recurrence: 'daily',
};

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// addEvent
// ---------------------------------------------------------------------------

describe('addEvent', () => {
  test('event appears in store after addEvent', () => {
    const { result } = renderHook(() => useEventStore());

    act(() => {
      result.current.addEvent(validDraft);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].title).toBe('Team Meeting');
  });

  test('event is persisted to localStorage after addEvent', () => {
    const { result } = renderHook(() => useEventStore());

    act(() => {
      result.current.addEvent(validDraft);
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CalendarEvent[];
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('Team Meeting');
  });

  test('addEvent returns valid:true for a valid draft', () => {
    const { result } = renderHook(() => useEventStore());

    let mutationResult: ReturnType<typeof result.current.addEvent>;
    act(() => {
      mutationResult = result.current.addEvent(validDraft);
    });

    expect(mutationResult!.valid).toBe(true);
    expect(mutationResult!.event).toBeDefined();
  });

  test('addEvent assigns an id to the created event', () => {
    const { result } = renderHook(() => useEventStore());

    act(() => {
      result.current.addEvent(validDraft);
    });

    expect(result.current.events[0].id).toBeTruthy();
    expect(typeof result.current.events[0].id).toBe('string');
  });

  test('addEvent sets color from category', () => {
    const { result } = renderHook(() => useEventStore());

    act(() => {
      result.current.addEvent(validDraft); // category: 'work'
    });

    expect(result.current.events[0].color).toBe('#4A90E2'); // work color
  });

  test('addEvent with missing title returns valid:false', () => {
    const { result } = renderHook(() => useEventStore());

    let mutationResult: ReturnType<typeof result.current.addEvent>;
    act(() => {
      mutationResult = result.current.addEvent({ ...validDraft, title: '' });
    });

    expect(mutationResult!.valid).toBe(false);
    expect(mutationResult!.errors.title).toBeDefined();
  });

  test('addEvent with empty title does not add event to store', () => {
    const { result } = renderHook(() => useEventStore());

    act(() => {
      result.current.addEvent({ ...validDraft, title: '' });
    });

    expect(result.current.events).toHaveLength(0);
  });

  test('addEvent with endTime ≤ startTime returns valid:false', () => {
    const { result } = renderHook(() => useEventStore());

    let mutationResult: ReturnType<typeof result.current.addEvent>;
    act(() => {
      mutationResult = result.current.addEvent({
        ...validDraft,
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T09:00:00.000Z', // end before start
      });
    });

    expect(mutationResult!.valid).toBe(false);
    expect(mutationResult!.errors.endTime).toBeDefined();
  });

  test('addEvent with endTime equal to startTime returns valid:false', () => {
    const { result } = renderHook(() => useEventStore());

    let mutationResult: ReturnType<typeof result.current.addEvent>;
    act(() => {
      mutationResult = result.current.addEvent({
        ...validDraft,
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T09:00:00.000Z',
      });
    });

    expect(mutationResult!.valid).toBe(false);
  });

  test('multiple events accumulate in the store', () => {
    const { result } = renderHook(() => useEventStore());

    act(() => {
      result.current.addEvent(validDraft);
      result.current.addEvent({ ...validDraft, title: 'Second Event' });
    });

    expect(result.current.events).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------

describe('updateEvent', () => {
  test('updated event reflects in the store', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(validDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.updateEvent(eventId!, { ...validDraft, title: 'Updated Meeting' });
    });

    expect(result.current.events[0].title).toBe('Updated Meeting');
  });

  test('updated event is persisted to localStorage', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(validDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.updateEvent(eventId!, { ...validDraft, title: 'Updated Meeting' });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CalendarEvent[];
    expect(stored[0].title).toBe('Updated Meeting');
  });

  test('updateEvent with invalid title returns valid:false', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(validDraft);
      eventId = r.event!.id;
    });

    let mutationResult: ReturnType<typeof result.current.updateEvent>;
    act(() => {
      mutationResult = result.current.updateEvent(eventId!, { ...validDraft, title: '' });
    });

    expect(mutationResult!.valid).toBe(false);
  });

  test('updateEvent with unknown eventId returns valid:false', () => {
    const { result } = renderHook(() => useEventStore());

    let mutationResult: ReturnType<typeof result.current.updateEvent>;
    act(() => {
      mutationResult = result.current.updateEvent('non-existent', validDraft);
    });

    expect(mutationResult!.valid).toBe(false);
  });

  test('event count stays the same after update', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(validDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.updateEvent(eventId!, { ...validDraft, title: 'Changed' });
    });

    expect(result.current.events).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------

describe('deleteEvent', () => {
  test('event removed from store after deleteEvent', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(validDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.deleteEvent(eventId!);
    });

    expect(result.current.events).toHaveLength(0);
  });

  test('deleted event is removed from localStorage', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(validDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.deleteEvent(eventId!);
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CalendarEvent[];
    expect(stored).toHaveLength(0);
  });

  test('only the specified event is deleted when multiple exist', () => {
    const { result } = renderHook(() => useEventStore());
    let firstId: string;

    act(() => {
      const r = result.current.addEvent(validDraft);
      firstId = r.event!.id;
      result.current.addEvent({ ...validDraft, title: 'Keep This' });
    });

    act(() => {
      result.current.deleteEvent(firstId!);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].title).toBe('Keep This');
  });
});

// ---------------------------------------------------------------------------
// Hydration from localStorage
// ---------------------------------------------------------------------------

describe('hydration from localStorage', () => {
  test('store loads events from localStorage on mount', () => {
    // Pre-populate localStorage before mounting the hook
    const preloaded: CalendarEvent[] = [
      {
        id: 'pre-1',
        title: 'Pre-loaded Event',
        description: '',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T10:00:00.000Z',
        category: 'personal',
        recurrence: 'none',
        color: '#7ED321',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preloaded));

    const { result } = renderHook(() => useEventStore());

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('pre-1');
    expect(result.current.events[0].title).toBe('Pre-loaded Event');
  });

  test('store starts empty when localStorage has corrupt data', () => {
    localStorage.setItem(STORAGE_KEY, '{ not json }');
    const { result } = renderHook(() => useEventStore());
    expect(result.current.events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateEventOccurrence
// ---------------------------------------------------------------------------

describe('updateEventOccurrence — scope: this', () => {
  test('adds exception to the canonical event, canonical title unchanged', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    const occurrenceDate = new Date('2024-01-16T09:00:00.000Z');
    act(() => {
      result.current.updateEventOccurrence(
        eventId!,
        occurrenceDate,
        { ...dailyDraft, title: 'Override Title' },
        'this'
      );
    });

    const event = result.current.events.find((e) => e.id === eventId!);
    // Canonical title unchanged
    expect(event?.title).toBe('Daily Standup');
    // Exception was stored
    expect(event?.exceptions).toHaveLength(1);
    expect(event?.exceptions![0].date).toBe('2024-01-16');
    expect(event?.exceptions![0].override.title).toBe('Override Title');
  });

  test('scope:this is persisted to localStorage', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.updateEventOccurrence(
        eventId!,
        new Date('2024-01-16T09:00:00.000Z'),
        { ...dailyDraft, title: 'Saved Override' },
        'this'
      );
    });

    const stored = loadEventsFromStorage();
    const event = stored.find((e) => e.id === eventId!);
    expect(event?.exceptions).toHaveLength(1);
    expect(event?.exceptions![0].override.title).toBe('Saved Override');
  });
});

describe('updateEventOccurrence — scope: all-future', () => {
  test('canonical event is updated with the new draft', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.updateEventOccurrence(
        eventId!,
        new Date('2024-01-16T09:00:00.000Z'),
        { ...dailyDraft, title: 'All Future Title' },
        'all-future'
      );
    });

    const event = result.current.events.find((e) => e.id === eventId!);
    expect(event?.title).toBe('All Future Title');
  });

  test('scope:all-future is persisted to localStorage', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.updateEventOccurrence(
        eventId!,
        new Date('2024-01-16T09:00:00.000Z'),
        { ...dailyDraft, title: 'Persisted Future Title' },
        'all-future'
      );
    });

    const stored = loadEventsFromStorage();
    const event = stored.find((e) => e.id === eventId!);
    expect(event?.title).toBe('Persisted Future Title');
  });
});

// ---------------------------------------------------------------------------
// deleteEventOccurrence
// ---------------------------------------------------------------------------

describe('deleteEventOccurrence — scope: this', () => {
  test('adds occurrence date to excludedDates', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.deleteEventOccurrence(
        eventId!,
        new Date('2024-01-16T09:00:00.000Z'),
        'this'
      );
    });

    const event = result.current.events.find((e) => e.id === eventId!);
    expect(event?.excludedDates).toContain('2024-01-16');
  });

  test('canonical event remains in the store', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.deleteEventOccurrence(
        eventId!,
        new Date('2024-01-16T09:00:00.000Z'),
        'this'
      );
    });

    expect(result.current.events).toHaveLength(1);
  });

  test('excluded date is persisted to localStorage', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.deleteEventOccurrence(
        eventId!,
        new Date('2024-01-16T09:00:00.000Z'),
        'this'
      );
    });

    const stored = loadEventsFromStorage();
    const event = stored.find((e) => e.id === eventId!);
    expect(event?.excludedDates).toContain('2024-01-16');
  });
});

describe('deleteEventOccurrence — scope: all-future', () => {
  test('sets recurrenceEndDate on the canonical event', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.deleteEventOccurrence(
        eventId!,
        new Date('2024-01-18T09:00:00.000Z'),
        'all-future'
      );
    });

    const event = result.current.events.find((e) => e.id === eventId!);
    expect(event?.recurrenceEndDate).toBe('2024-01-18');
  });

  test('recurrenceEndDate is persisted to localStorage', () => {
    const { result } = renderHook(() => useEventStore());
    let eventId: string;

    act(() => {
      const r = result.current.addEvent(dailyDraft);
      eventId = r.event!.id;
    });

    act(() => {
      result.current.deleteEventOccurrence(
        eventId!,
        new Date('2024-01-18T09:00:00.000Z'),
        'all-future'
      );
    });

    const stored = loadEventsFromStorage();
    const event = stored.find((e) => e.id === eventId!);
    expect(event?.recurrenceEndDate).toBe('2024-01-18');
  });
});
