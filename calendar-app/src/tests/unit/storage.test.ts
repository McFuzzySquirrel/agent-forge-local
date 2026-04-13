/**
 * Unit tests for src/utils/storage.ts
 * PRD §15 (Testing Strategy), §18 (storage corruption risk)
 *
 * Covers:
 *   - round-trip save/load
 *   - corrupt JSON → returns [] and removes key
 *   - non-array JSON → returns [] and removes key
 *   - empty localStorage → returns []
 *   - optional recurrence fields survive round-trip
 *   - corrupt key is absent after loadEventsFromStorage (data-recovery)
 */

import { beforeEach, describe, expect, test } from 'vitest';

import type { CalendarEvent } from '../../types/event';
import { loadEventsFromStorage, saveEventsToStorage } from '../../utils/storage';

const STORAGE_KEY = 'calendar-app-events';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Test Event',
    description: 'A description',
    startTime: '2024-01-15T09:00:00.000Z',
    endTime: '2024-01-15T10:00:00.000Z',
    category: 'work',
    recurrence: 'none',
    color: '#4A90E2',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Empty storage
// ---------------------------------------------------------------------------

describe('loadEventsFromStorage — empty storage', () => {
  test('returns [] when localStorage is empty', () => {
    expect(loadEventsFromStorage()).toEqual([]);
  });

  test('returns [] when the key is explicitly missing', () => {
    localStorage.removeItem(STORAGE_KEY);
    expect(loadEventsFromStorage()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('saveEventsToStorage + loadEventsFromStorage round-trip', () => {
  test('single event survives round-trip', () => {
    const events = [makeEvent()];
    saveEventsToStorage(events);
    const loaded = loadEventsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('evt-1');
    expect(loaded[0].title).toBe('Test Event');
  });

  test('multiple events preserve order and count', () => {
    const events = [
      makeEvent({ id: 'a', title: 'Alpha' }),
      makeEvent({ id: 'b', title: 'Beta' }),
      makeEvent({ id: 'c', title: 'Gamma' }),
    ];
    saveEventsToStorage(events);
    const loaded = loadEventsFromStorage();
    expect(loaded).toHaveLength(3);
    expect(loaded.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  test('empty array round-trips correctly', () => {
    saveEventsToStorage([]);
    expect(loadEventsFromStorage()).toEqual([]);
  });

  test('all core fields are preserved', () => {
    const event = makeEvent({
      description: 'Notes',
      category: 'health',
      recurrence: 'weekly',
      color: '#E86C6C',
    });
    saveEventsToStorage([event]);
    const [loaded] = loadEventsFromStorage();
    expect(loaded.description).toBe('Notes');
    expect(loaded.category).toBe('health');
    expect(loaded.recurrence).toBe('weekly');
    expect(loaded.color).toBe('#E86C6C');
  });
});

// ---------------------------------------------------------------------------
// Optional recurrence fields
// ---------------------------------------------------------------------------

describe('optional recurrence fields survive round-trip', () => {
  test('recurrenceEndDate is preserved', () => {
    const event = makeEvent({
      recurrence: 'daily',
      recurrenceEndDate: '2024-03-01',
    });
    saveEventsToStorage([event]);
    const [loaded] = loadEventsFromStorage();
    expect(loaded.recurrenceEndDate).toBe('2024-03-01');
  });

  test('excludedDates array is preserved', () => {
    const event = makeEvent({
      recurrence: 'daily',
      excludedDates: ['2024-01-20', '2024-01-25'],
    });
    saveEventsToStorage([event]);
    const [loaded] = loadEventsFromStorage();
    expect(loaded.excludedDates).toEqual(['2024-01-20', '2024-01-25']);
  });

  test('exceptions array is preserved', () => {
    const event = makeEvent({
      recurrence: 'weekly',
      exceptions: [
        {
          date: '2024-01-22',
          override: { title: 'Special Meeting' },
        },
      ],
    });
    saveEventsToStorage([event]);
    const [loaded] = loadEventsFromStorage();
    expect(loaded.exceptions).toHaveLength(1);
    expect(loaded.exceptions![0].date).toBe('2024-01-22');
    expect(loaded.exceptions![0].override.title).toBe('Special Meeting');
  });

  test('event with all optional recurrence fields preserves them all', () => {
    const event = makeEvent({
      recurrence: 'monthly',
      recurrenceEndDate: '2024-06-01',
      excludedDates: ['2024-02-15'],
      exceptions: [{ date: '2024-03-15', override: { description: 'Override desc' } }],
    });
    saveEventsToStorage([event]);
    const [loaded] = loadEventsFromStorage();
    expect(loaded.recurrenceEndDate).toBe('2024-06-01');
    expect(loaded.excludedDates).toEqual(['2024-02-15']);
    expect(loaded.exceptions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Corrupt / invalid JSON
// ---------------------------------------------------------------------------

describe('loadEventsFromStorage — corrupt storage', () => {
  test('corrupt JSON string returns []', () => {
    localStorage.setItem(STORAGE_KEY, '{ not valid json :::');
    expect(loadEventsFromStorage()).toEqual([]);
  });

  test('corrupt JSON removes the key from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '{ not valid json :::');
    loadEventsFromStorage();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('non-array JSON (object) returns []', () => {
    localStorage.setItem(STORAGE_KEY, '{"id":"123","title":"Oops"}');
    expect(loadEventsFromStorage()).toEqual([]);
  });

  test('non-array JSON removes the key from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '{"id":"123","title":"Oops"}');
    loadEventsFromStorage();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('null JSON value returns []', () => {
    localStorage.setItem(STORAGE_KEY, 'null');
    expect(loadEventsFromStorage()).toEqual([]);
  });

  test('number JSON value returns []', () => {
    localStorage.setItem(STORAGE_KEY, '42');
    expect(loadEventsFromStorage()).toEqual([]);
  });

  test('array with invalid event objects drops invalid entries', () => {
    // Mix of valid and invalid entries
    const validEvent = makeEvent({ id: 'valid' });
    const raw = JSON.stringify([
      validEvent,
      { broken: true }, // missing required fields
      null,
      'not-an-object',
    ]);
    localStorage.setItem(STORAGE_KEY, raw);
    const loaded = loadEventsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('valid');
  });

  test('event with invalid category is dropped', () => {
    const raw = JSON.stringify([
      { ...makeEvent(), category: 'invalid-category' },
    ]);
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadEventsFromStorage()).toHaveLength(0);
  });

  test('event with invalid recurrence rule is dropped', () => {
    const raw = JSON.stringify([
      { ...makeEvent(), recurrence: 'yearly' },
    ]);
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadEventsFromStorage()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Data-recovery: key removal on corrupt state (§18)
// ---------------------------------------------------------------------------

describe('data recovery after corruption', () => {
  test('after corrupt load, key is absent so next load returns []', () => {
    localStorage.setItem(STORAGE_KEY, 'not json at all');
    loadEventsFromStorage(); // triggers recovery
    // Key should be gone
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // Subsequent load should also return []
    expect(loadEventsFromStorage()).toEqual([]);
  });

  test('after non-array load, key is absent from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ evil: 'object' }));
    loadEventsFromStorage();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
