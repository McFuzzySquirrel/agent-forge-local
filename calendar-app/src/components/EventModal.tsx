import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';

import type { EventDraft, EventMutationResult } from '../store/useEventStore';
import type { CalendarEvent, EventCategory, RecurrenceRule, ValidationResult } from '../types/event';
import { formatDate } from '../utils/dateHelpers';
import { ConfirmDialog } from './ConfirmDialog';
import styles from '../styles/EventModal.module.css';

const CATEGORY_OPTIONS: Array<{ value: EventCategory; label: string }> = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const RECURRENCE_OPTIONS: Array<{ value: RecurrenceRule; label: string }> = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface EventFormState {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  recurrence: RecurrenceRule;
}

export interface EventModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  event?: CalendarEvent;
  selectedDate?: Date;
  validationErrors?: ValidationResult['errors'];
  validateEvent: (draft: EventDraft) => ValidationResult;
  onSave: (draft: EventDraft) => EventMutationResult;
  onClose: () => void;
  onDelete?: (eventId: string) => void;
  onClearValidationErrors?: () => void;
}

function addMinutes(date: Date, minutes: number): Date {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateTimeLocalValue(date: Date): string {
  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`,
  ].join('T');
}

function toIsoString(value: string): string {
  return value ? new Date(value).toISOString() : '';
}

function createDefaultStart(selectedDate?: Date): Date {
  const baseDate = selectedDate ? new Date(selectedDate) : new Date();
  const isDateOnlySelection =
    baseDate.getHours() === 0 &&
    baseDate.getMinutes() === 0 &&
    baseDate.getSeconds() === 0 &&
    baseDate.getMilliseconds() === 0;

  if (isDateOnlySelection) {
    baseDate.setHours(9, 0, 0, 0);
  }

  return baseDate;
}

function buildFormState(mode: 'create' | 'edit', event?: CalendarEvent, selectedDate?: Date): EventFormState {
  if (mode === 'edit' && event) {
    return {
      title: event.title,
      description: event.description,
      startTime: toDateTimeLocalValue(new Date(event.startTime)),
      endTime: toDateTimeLocalValue(new Date(event.endTime)),
      category: event.category,
      recurrence: event.recurrence,
    };
  }

  const startDate = createDefaultStart(selectedDate);
  const endDate = addMinutes(startDate, 60);

  return {
    title: '',
    description: '',
    startTime: toDateTimeLocalValue(startDate),
    endTime: toDateTimeLocalValue(endDate),
    category: 'other',
    recurrence: 'none',
  };
}

function toDraft(formState: EventFormState): EventDraft {
  return {
    title: formState.title,
    description: formState.description,
    startTime: toIsoString(formState.startTime),
    endTime: toIsoString(formState.endTime),
    category: formState.category,
    recurrence: formState.recurrence,
  };
}

export function EventModal({
  isOpen,
  mode,
  event,
  selectedDate,
  validationErrors,
  validateEvent,
  onSave,
  onClose,
  onDelete,
  onClearValidationErrors,
}: EventModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const titleErrorId = useId();
  const descriptionErrorId = useId();
  const startErrorId = useId();
  const endErrorId = useId();
  const categoryErrorId = useId();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const [formState, setFormState] = useState<EventFormState>(() => buildFormState(mode, event, selectedDate));
  const [errors, setErrors] = useState<ValidationResult['errors']>({});
  const [shouldValidateLive, setShouldValidateLive] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(buildFormState(mode, event, selectedDate));
    setErrors(validationErrors ?? {});
    setShouldValidateLive(false);
    setIsDeleteConfirmOpen(false);
    onClearValidationErrors?.();
  }, [event, isOpen, mode, onClearValidationErrors, selectedDate, validationErrors]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wasOpenRef.current = true;

    const timer = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !wasOpenRef.current) {
      return;
    }

    previousFocusRef.current?.focus();
    wasOpenRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && validationErrors) {
      setErrors(validationErrors);
    }
  }, [isOpen, validationErrors]);

  const helperMessage = useMemo(() => {
    if (mode === 'edit' && !event) {
      return 'No event is selected. Close this dialog and choose an event to edit.';
    }

    if (mode === 'edit' && event?.recurrence !== 'none') {
      return 'Phase 2 edits and deletes recurring events for the full series. Per-occurrence scope arrives in Phase 3.';
    }

    if (selectedDate) {
      return `Selected date: ${formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}.`;
    }

    return 'Fill in the details below to save a new event.';
  }, [event, mode, selectedDate]);

  const handleFieldChange = <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
    const nextState = { ...formState, [field]: value };
    setFormState(nextState);

    if (shouldValidateLive) {
      setErrors(validateEvent(toDraft(nextState)).errors);
    }
  };

  const handleClose = () => {
    setErrors({});
    setShouldValidateLive(false);
    setIsDeleteConfirmOpen(false);
    onClearValidationErrors?.();
    onClose();
  };

  const handleSubmit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    const draft = toDraft(formState);
    const validationResult = validateEvent(draft);
    setShouldValidateLive(true);
    setErrors(validationResult.errors);

    if (!validationResult.valid) {
      return;
    }

    const mutationResult = onSave(draft);

    if (mutationResult.valid) {
      handleClose();
      return;
    }

    setErrors(mutationResult.errors);
  };

  const handleDeleteConfirmed = () => {
    if (!event || !onDelete) {
      return;
    }

    onDelete(event.id);
    setIsDeleteConfirmOpen(false);
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <div
        className={styles.backdrop}
        onMouseDown={(eventObject) => {
          if (eventObject.target === eventObject.currentTarget && !isDeleteConfirmOpen) {
            handleClose();
          }
        }}
      >
        <section
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onKeyDown={(eventObject) => {
            if (eventObject.key === 'Escape' && !isDeleteConfirmOpen) {
              eventObject.preventDefault();
              handleClose();
            }
          }}
        >
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>{mode === 'edit' ? 'Edit event' : 'Create event'}</p>
              <h2 id={titleId} className={styles.title}>
                {mode === 'edit' ? 'Update event details' : 'Add a new event'}
              </h2>
            </div>
            <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Close event form">
              ×
            </button>
          </div>

          <p id={descriptionId} className={styles.helperText}>
            {helperMessage}
          </p>

          {mode === 'edit' && !event ? (
            <div className={styles.emptyState}>
              <p>No event details are available yet.</p>
              <button type="button" className={styles.secondaryButton} onClick={handleClose}>
                Close
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {hasErrors ? (
                <div className={styles.errorSummary} role="alert" aria-live="assertive">
                  Please fix the highlighted fields before saving.
                </div>
              ) : null}

              <label className={styles.field}>
                <span className={styles.labelRow}>
                  <span className={styles.label}>Title</span>
                  <span className={styles.meta}>{formState.title.length}/120</span>
                </span>
                <input
                  ref={titleInputRef}
                  className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                  type="text"
                  value={formState.title}
                  onChange={(eventObject) => handleFieldChange('title', eventObject.target.value)}
                  placeholder="Weekly planning session"
                  maxLength={120}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? titleErrorId : undefined}
                />
                {errors.title ? (
                  <span id={titleErrorId} className={styles.errorText}>
                    {errors.title}
                  </span>
                ) : null}
              </label>

              <label className={styles.field}>
                <span className={styles.labelRow}>
                  <span className={styles.label}>Description</span>
                  <span className={styles.meta}>{formState.description.length}/500</span>
                </span>
                <textarea
                  className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                  value={formState.description}
                  onChange={(eventObject) => handleFieldChange('description', eventObject.target.value)}
                  placeholder="Optional notes for this event"
                  maxLength={500}
                  rows={4}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? descriptionErrorId : undefined}
                />
                {errors.description ? (
                  <span id={descriptionErrorId} className={styles.errorText}>
                    {errors.description}
                  </span>
                ) : null}
              </label>

              <div className={styles.twoColumnRow}>
                <label className={styles.field}>
                  <span className={styles.label}>Start</span>
                  <input
                    className={`${styles.input} ${errors.startTime ? styles.inputError : ''}`}
                    type="datetime-local"
                    value={formState.startTime}
                    onChange={(eventObject) => handleFieldChange('startTime', eventObject.target.value)}
                    aria-invalid={Boolean(errors.startTime)}
                    aria-describedby={errors.startTime ? startErrorId : undefined}
                  />
                  {errors.startTime ? (
                    <span id={startErrorId} className={styles.errorText}>
                      {errors.startTime}
                    </span>
                  ) : null}
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>End</span>
                  <input
                    className={`${styles.input} ${errors.endTime ? styles.inputError : ''}`}
                    type="datetime-local"
                    value={formState.endTime}
                    onChange={(eventObject) => handleFieldChange('endTime', eventObject.target.value)}
                    aria-invalid={Boolean(errors.endTime)}
                    aria-describedby={errors.endTime ? endErrorId : undefined}
                  />
                  {errors.endTime ? (
                    <span id={endErrorId} className={styles.errorText}>
                      {errors.endTime}
                    </span>
                  ) : null}
                </label>
              </div>

              <div className={styles.twoColumnRow}>
                <label className={styles.field}>
                  <span className={styles.label}>Category</span>
                  <select
                    className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
                    value={formState.category}
                    onChange={(eventObject) =>
                      handleFieldChange('category', eventObject.target.value as EventCategory)
                    }
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={errors.category ? categoryErrorId : undefined}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.category ? (
                    <span id={categoryErrorId} className={styles.errorText}>
                      {errors.category}
                    </span>
                  ) : null}
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Repeats</span>
                  <select
                    className={styles.select}
                    value={formState.recurrence}
                    onChange={(eventObject) =>
                      handleFieldChange('recurrence', eventObject.target.value as RecurrenceRule)
                    }
                  >
                    {RECURRENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {formState.recurrence !== 'none' ? (
                <p className={styles.recurrenceNote}>
                  Recurring events are stored canonically. In Phase 2, edits and deletes apply to the entire series.
                </p>
              ) : null}

              <div className={styles.actions}>
                <div className={styles.leadingActions}>
                  {mode === 'edit' && event && onDelete ? (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      Delete event
                    </button>
                  ) : null}
                </div>

                <div className={styles.trailingActions}>
                  <button type="button" className={styles.secondaryButton} onClick={handleClose}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.primaryButton}>
                    {mode === 'edit' ? 'Save changes' : 'Save event'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete this event?"
        message={
          event?.recurrence !== 'none'
            ? 'This recurring event will be deleted for the full series in Phase 2.'
            : 'This action cannot be undone.'
        }
        details={
          event ? `Event: ${event.title}` : 'This event will be removed from your local calendar immediately.'
        }
        confirmLabel="Delete event"
        cancelLabel="Keep event"
        tone="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </>
  );
}
