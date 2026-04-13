import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

import type {
  CalendarEvent,
  EventCategory,
  RecurrenceException,
  RecurrenceRule,
  ValidationResult,
} from '../types/event';
import { getCategoryColor } from '../utils/categoryColors';
import { isAfter, parseISO } from '../utils/dateHelpers';
import { loadEventsFromStorage, saveEventsToStorage } from '../utils/storage';

const VALID_CATEGORIES: EventCategory[] = ['work', 'personal', 'health', 'social', 'other'];

export interface EventDraft {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  recurrence: RecurrenceRule;
}

export interface EventMutationResult extends ValidationResult {
  event?: CalendarEvent;
}

export interface EventStore {
  events: CalendarEvent[];
  validationErrors: ValidationResult['errors'];
  addEvent: (draft: EventDraft) => EventMutationResult;
  updateEvent: (eventId: string, draft: EventDraft) => EventMutationResult;
  updateEventOccurrence: (
    eventId: string,
    occurrenceDate: Date,
    draft: EventDraft,
    scope: 'this' | 'all-future'
  ) => EventMutationResult;
  deleteEvent: (eventId: string) => void;
  deleteEventOccurrence: (
    eventId: string,
    occurrenceDate: Date,
    scope: 'this' | 'all-future'
  ) => void;
  clearValidationErrors: () => void;
  validateEvent: (draft: EventDraft) => ValidationResult;
}

function sanitizeEventDraft(draft: EventDraft): EventDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
  };
}

function isValidDateValue(value: string): boolean {
  return !Number.isNaN(parseISO(value).getTime());
}

export function validateEvent(draft: EventDraft): ValidationResult {
  const sanitizedDraft = sanitizeEventDraft(draft);
  const errors: ValidationResult['errors'] = {};

  if (sanitizedDraft.title.length === 0) {
    errors.title = 'Title is required.';
  } else if (sanitizedDraft.title.length > 120) {
    errors.title = 'Title must be 120 characters or fewer.';
  }

  if (sanitizedDraft.description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.';
  }

  if (!VALID_CATEGORIES.includes(sanitizedDraft.category)) {
    errors.category = 'Please choose a valid category.';
  }

  if (!isValidDateValue(sanitizedDraft.startTime)) {
    errors.startTime = 'Start time is required.';
  }

  if (!isValidDateValue(sanitizedDraft.endTime)) {
    errors.endTime = 'End time is required.';
  } else if (
    !errors.startTime &&
    !isAfter(parseISO(sanitizedDraft.endTime), parseISO(sanitizedDraft.startTime))
  ) {
    errors.endTime = 'End time must be after start time.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function buildCalendarEvent(draft: EventDraft, eventId: string): CalendarEvent {
  const sanitizedDraft = sanitizeEventDraft(draft);

  return {
    ...sanitizedDraft,
    id: eventId,
    color: getCategoryColor(sanitizedDraft.category),
  };
}

export function useEventStore(): EventStore {
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEventsFromStorage());
  const [validationErrors, setValidationErrors] = useState<ValidationResult['errors']>({});

  const addEvent = (draft: EventDraft): EventMutationResult => {
    const validationResult = validateEvent(draft);
    setValidationErrors(validationResult.errors);

    if (!validationResult.valid) {
      return validationResult;
    }

    const event = buildCalendarEvent(draft, uuidv4());
    setEvents((currentEvents) => {
      const nextEvents = [...currentEvents, event];
      saveEventsToStorage(nextEvents);
      return nextEvents;
    });
    setValidationErrors({});

    return {
      valid: true,
      errors: {},
      event,
    };
  };

  const updateEvent = (eventId: string, draft: EventDraft): EventMutationResult => {
    const validationResult = validateEvent(draft);

    if (!validationResult.valid) {
      setValidationErrors(validationResult.errors);
      return validationResult;
    }

    const existingEvent = events.find((event) => event.id === eventId);

    if (!existingEvent) {
      const missingEventResult: EventMutationResult = {
        valid: false,
        errors: {
          id: 'Event not found.',
        },
      };

      setValidationErrors(missingEventResult.errors);
      return missingEventResult;
    }

    const updatedEvent = buildCalendarEvent(draft, existingEvent.id);
    const nextEvents = events.map((event) => (event.id === eventId ? updatedEvent : event));

    setEvents(nextEvents);
    saveEventsToStorage(nextEvents);
    setValidationErrors({});

    return {
      valid: true,
      errors: {},
      event: updatedEvent,
    };
  };

  const deleteEvent = (eventId: string) => {
    setEvents((currentEvents) => {
      const nextEvents = currentEvents.filter((event) => event.id !== eventId);
      saveEventsToStorage(nextEvents);
      return nextEvents;
    });
    setValidationErrors({});
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  // -------------------------------------------------------------------------
  // Recurrence-aware edit (FR-21)
  // -------------------------------------------------------------------------

  /**
   * Edit a single occurrence or all future occurrences of a recurring event.
   *
   * scope 'all-future': mutates the canonical event record (same as updateEvent).
   *   All occurrences from now onward reflect the new draft.
   *
   * scope 'this': stores a per-occurrence exception override in event.exceptions.
   *   The recurrence rule stays intact; only this occurrence displays the
   *   overridden fields during expansion.
   */
  const updateEventOccurrence = (
    eventId: string,
    occurrenceDate: Date,
    draft: EventDraft,
    scope: 'this' | 'all-future'
  ): EventMutationResult => {
    const validationResult = validateEvent(draft);

    if (!validationResult.valid) {
      setValidationErrors(validationResult.errors);
      return validationResult;
    }

    const existingEvent = events.find((event) => event.id === eventId);

    if (!existingEvent) {
      const missingResult: EventMutationResult = {
        valid: false,
        errors: { id: 'Event not found.' },
      };
      setValidationErrors(missingResult.errors);
      return missingResult;
    }

    let updatedEvent: CalendarEvent;

    if (scope === 'all-future') {
      // Behaves identically to updateEvent: replace the canonical record.
      updatedEvent = buildCalendarEvent(draft, existingEvent.id);
    } else {
      // scope === 'this': store an exception override for this occurrence date.
      const dateKey = format(occurrenceDate, 'yyyy-MM-dd');
      const sanitized = sanitizeEventDraft(draft);

      const newException: RecurrenceException = {
        date: dateKey,
        override: {
          title: sanitized.title,
          description: sanitized.description,
          startTime: sanitized.startTime,
          endTime: sanitized.endTime,
          category: sanitized.category,
        },
      };

      // Replace any existing exception for the same date.
      const existingExceptions = existingEvent.exceptions ?? [];
      const filteredExceptions = existingExceptions.filter((ex) => ex.date !== dateKey);

      updatedEvent = {
        ...existingEvent,
        exceptions: [...filteredExceptions, newException],
      };
    }

    const nextEvents = events.map((event) => (event.id === eventId ? updatedEvent : event));
    setEvents(nextEvents);
    saveEventsToStorage(nextEvents);
    setValidationErrors({});

    return { valid: true, errors: {}, event: updatedEvent };
  };

  // -------------------------------------------------------------------------
  // Recurrence-aware delete (FR-22)
  // -------------------------------------------------------------------------

  /**
   * Delete a single occurrence or all future occurrences of a recurring event.
   *
   * scope 'all-future': sets event.recurrenceEndDate to the occurrence date so
   *   expansion stops before generating that occurrence onward.
   *
   * scope 'this': adds the occurrence date to event.excludedDates so expansion
   *   skips it while leaving the recurrence rule intact.
   */
  const deleteEventOccurrence = (
    eventId: string,
    occurrenceDate: Date,
    scope: 'this' | 'all-future'
  ): void => {
    setEvents((currentEvents) => {
      const existingEvent = currentEvents.find((event) => event.id === eventId);

      if (!existingEvent) return currentEvents;

      let updatedEvent: CalendarEvent;

      if (scope === 'all-future') {
        // Expansion stops before this occurrence date.
        updatedEvent = {
          ...existingEvent,
          recurrenceEndDate: format(occurrenceDate, 'yyyy-MM-dd'),
        };
      } else {
        // scope === 'this': exclude only this occurrence date.
        const dateKey = format(occurrenceDate, 'yyyy-MM-dd');
        const existingExcluded = existingEvent.excludedDates ?? [];

        // Avoid duplicate entries.
        if (existingExcluded.includes(dateKey)) return currentEvents;

        updatedEvent = {
          ...existingEvent,
          excludedDates: [...existingExcluded, dateKey],
        };
      }

      const nextEvents = currentEvents.map((event) =>
        event.id === eventId ? updatedEvent : event
      );
      saveEventsToStorage(nextEvents);
      return nextEvents;
    });

    setValidationErrors({});
  };

  return {
    events,
    validationErrors,
    addEvent,
    updateEvent,
    updateEventOccurrence,
    deleteEvent,
    deleteEventOccurrence,
    clearValidationErrors,
    validateEvent,
  };
}
