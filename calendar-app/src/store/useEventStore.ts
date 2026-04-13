import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type {
  CalendarEvent,
  EventCategory,
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
  deleteEvent: (eventId: string) => void;
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

  return {
    events,
    validationErrors,
    addEvent,
    updateEvent,
    deleteEvent,
    clearValidationErrors,
    validateEvent,
  };
}
