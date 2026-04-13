/**
 * Integration tests for src/components/EventModal.tsx
 * PRD §15 (Testing Strategy), FR-13–FR-17 (CRUD modals), FR-21 (recurrence edit scope)
 * ACC-01–ACC-03 (accessibility within form)
 */

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EventModal } from '../../components/EventModal';
import type { EventModalProps } from '../../components/EventModal';
import { validateEvent } from '../../store/useEventStore';
import type { CalendarEvent } from '../../types/event';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps: EventModalProps = {
  isOpen: true,
  mode: 'create',
  validateEvent,
  onSave: vi.fn().mockReturnValue({ valid: true, errors: {} }),
  onClose: vi.fn(),
};

const sampleEvent: CalendarEvent = {
  id: 'evt-1',
  title: 'Team Meeting',
  description: 'Weekly sync',
  startTime: '2024-01-15T09:00:00.000Z',
  endTime: '2024-01-15T10:00:00.000Z',
  category: 'work',
  recurrence: 'none',
  color: '#4A90E2',
};

const recurringEvent: CalendarEvent = {
  ...sampleEvent,
  id: 'evt-2',
  title: 'Daily Standup',
  recurrence: 'daily',
};

function renderModal(props: Partial<EventModalProps> = {}) {
  return render(<EventModal {...defaultProps} {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Create mode — basic rendering
// ---------------------------------------------------------------------------

describe('create mode', () => {
  test('renders the modal with an empty title input', () => {
    renderModal({ mode: 'create' });
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    expect(titleInput).toBeInTheDocument();
    expect((titleInput as HTMLInputElement).value).toBe('');
  });

  test('renders a "Save event" submit button', () => {
    renderModal({ mode: 'create' });
    expect(screen.getByRole('button', { name: /save event/i })).toBeInTheDocument();
  });

  test('renders a "Cancel" button', () => {
    renderModal({ mode: 'create' });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('does not render a Delete button in create mode', () => {
    renderModal({ mode: 'create' });
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  test('renders form fields: title, description, start, end, category, repeats', () => {
    renderModal({ mode: 'create' });
    // These are inside label elements
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Repeats')).toBeInTheDocument();
  });

  test('save with valid data calls onSave with the draft', async () => {
    const onSave = vi.fn().mockReturnValue({ valid: true, errors: {} });
    renderModal({ mode: 'create', onSave });

    const titleInput = screen.getByRole('textbox', { name: /title/i });
    await userEvent.type(titleInput, 'New Event');

    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Event', recurrence: 'none' })
    );
  });

  test('successful save calls onClose', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockReturnValue({ valid: true, errors: {} });
    renderModal({ mode: 'create', onSave, onClose });

    await userEvent.type(screen.getByRole('textbox', { name: /title/i }), 'Event');
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Edit mode — pre-filled form
// ---------------------------------------------------------------------------

describe('edit mode', () => {
  test('renders pre-filled title from the event', () => {
    renderModal({ mode: 'edit', event: sampleEvent });
    const titleInput = screen.getByRole('textbox', { name: /title/i }) as HTMLInputElement;
    expect(titleInput.value).toBe('Team Meeting');
  });

  test('renders pre-filled description from the event', () => {
    renderModal({ mode: 'edit', event: sampleEvent });
    const desc = screen.getByRole('textbox', { name: /description/i }) as HTMLTextAreaElement;
    expect(desc.value).toBe('Weekly sync');
  });

  test('renders "Save changes" button in edit mode', () => {
    renderModal({ mode: 'edit', event: sampleEvent });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  test('renders Delete button in edit mode when onDelete is provided', () => {
    renderModal({ mode: 'edit', event: sampleEvent, onDelete: vi.fn() });
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation — empty title
// ---------------------------------------------------------------------------

describe('validation: empty title', () => {
  test('submitting with empty title does not call onSave', () => {
    const onSave = vi.fn().mockReturnValue({ valid: true, errors: {} });
    renderModal({ mode: 'create', onSave });

    // Title is empty by default in create mode
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    expect(onSave).not.toHaveBeenCalled();
  });

  test('submitting with empty title shows the title error', () => {
    renderModal({ mode: 'create' });
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  test('error summary appears when there are validation errors', () => {
    renderModal({ mode: 'create' });
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    // There should be an error summary with role="alert"
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation — endTime before startTime
// ---------------------------------------------------------------------------

describe('validation: endTime before startTime', () => {
  test('submitting with endTime before startTime does not call onSave', async () => {
    const onSave = vi.fn().mockReturnValue({ valid: true, errors: {} });
    renderModal({ mode: 'create', onSave });

    // Fill in title first so it doesn't trigger a title error
    await userEvent.type(screen.getByRole('textbox', { name: /title/i }), 'My Event');

    // Query datetime-local inputs by type (there are exactly two: start and end)
    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    const [startInput, endInput] = Array.from(datetimeInputs) as HTMLInputElement[];

    // Set start AFTER end to create invalid state
    fireEvent.change(startInput, { target: { value: '2024-01-15T10:00' } });
    fireEvent.change(endInput, { target: { value: '2024-01-15T09:00' } });

    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    // onSave should NOT be called because validation fails
    expect(onSave).not.toHaveBeenCalled();
  });

  test('shows endTime error when end is before start', async () => {
    renderModal({ mode: 'create' });

    await userEvent.type(screen.getByRole('textbox', { name: /title/i }), 'Event');

    // Find datetime-local inputs
    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    const [startInput, endInput] = Array.from(datetimeInputs) as HTMLInputElement[];

    if (startInput && endInput) {
      fireEvent.change(startInput, { target: { value: '2024-01-15T10:00' } });
      fireEvent.change(endInput, { target: { value: '2024-01-15T08:00' } });
    }

    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() => {
      expect(screen.getByText(/end time must be after/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Recurrence scope picker — edit mode, recurring event
// ---------------------------------------------------------------------------

describe('recurrence scope picker', () => {
  test('scope picker renders when event is recurring and occurrenceDate is provided', () => {
    renderModal({
      mode: 'edit',
      event: recurringEvent,
      occurrenceDate: new Date('2024-01-16T09:00:00.000Z'),
      onSaveOccurrence: vi.fn().mockReturnValue({ valid: true, errors: {} }),
    });

    expect(screen.getByText(/apply changes to/i)).toBeInTheDocument();
    expect(screen.getByText('This event')).toBeInTheDocument();
    expect(screen.getByText('All future events')).toBeInTheDocument();
  });

  test('scope picker NOT rendered for non-recurring edit', () => {
    renderModal({ mode: 'edit', event: sampleEvent });

    expect(screen.queryByText(/apply changes to/i)).not.toBeInTheDocument();
  });

  test('scope picker NOT rendered when occurrenceDate is absent', () => {
    renderModal({
      mode: 'edit',
      event: recurringEvent,
      // No occurrenceDate — isRecurringEdit = false
    });

    expect(screen.queryByText(/apply changes to/i)).not.toBeInTheDocument();
  });

  test('"This event" scope calls onSaveOccurrence with scope="this"', async () => {
    const onSaveOccurrence = vi.fn().mockReturnValue({ valid: true, errors: {} });
    renderModal({
      mode: 'edit',
      event: recurringEvent,
      occurrenceDate: new Date('2024-01-16T09:00:00.000Z'),
      onSaveOccurrence,
    });

    // 'This event' radio is checked by default — just click save
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSaveOccurrence).toHaveBeenCalledWith(expect.any(Object), 'this');
    });
  });

  test('"All future events" scope calls onSaveOccurrence with scope="all-future"', async () => {
    const onSaveOccurrence = vi.fn().mockReturnValue({ valid: true, errors: {} });
    renderModal({
      mode: 'edit',
      event: recurringEvent,
      occurrenceDate: new Date('2024-01-16T09:00:00.000Z'),
      onSaveOccurrence,
    });

    // Select "All future events"
    const allFutureRadio = screen.getByRole('radio', { name: /all future events/i });
    fireEvent.click(allFutureRadio);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSaveOccurrence).toHaveBeenCalledWith(expect.any(Object), 'all-future');
    });
  });
});

// ---------------------------------------------------------------------------
// Cancel button
// ---------------------------------------------------------------------------

describe('cancel button', () => {
  test('clicking Cancel calls onClose', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('clicking Cancel does not call onSave', () => {
    const onSave = vi.fn();
    renderModal({ onSave });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onSave).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Close button
// ---------------------------------------------------------------------------

describe('close button', () => {
  test('close button has an accessible aria-label', () => {
    renderModal();
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
  });

  test('clicking close button calls onClose', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Focus — first input receives focus on open (ACC-02)
// ---------------------------------------------------------------------------

describe('focus management', () => {
  test('title input receives focus when modal opens', async () => {
    renderModal({ isOpen: true });

    await waitFor(() => {
      const titleInput = screen.getByRole('textbox', { name: /title/i });
      expect(document.activeElement).toBe(titleInput);
    });
  });
});

// ---------------------------------------------------------------------------
// Closed modal
// ---------------------------------------------------------------------------

describe('isOpen: false', () => {
  test('modal is not rendered when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
