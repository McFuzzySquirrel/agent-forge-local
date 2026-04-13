/**
 * Integration tests for src/components/ConfirmDialog.tsx
 * PRD §15 (Testing Strategy), FR-22 (recurrence scope in delete flow),
 * ACC-01–ACC-03 (dialog accessibility and focus)
 */

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { ConfirmDialogProps } from '../../components/ConfirmDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps: ConfirmDialogProps = {
  isOpen: true,
  title: 'Delete this event?',
  message: 'This action cannot be undone.',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

function renderDialog(props: Partial<ConfirmDialogProps> = {}) {
  return render(<ConfirmDialog {...defaultProps} {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe('ConfirmDialog — rendering', () => {
  test('renders title text', () => {
    renderDialog();
    expect(screen.getByText('Delete this event?')).toBeInTheDocument();
  });

  test('renders message text', () => {
    renderDialog();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  test('renders confirm button', () => {
    renderDialog({ confirmLabel: 'Delete event' });
    expect(screen.getByRole('button', { name: /delete event/i })).toBeInTheDocument();
  });

  test('renders cancel button', () => {
    renderDialog({ cancelLabel: 'Keep event' });
    expect(screen.getByRole('button', { name: /keep event/i })).toBeInTheDocument();
  });

  test('is not rendered when isOpen is false', () => {
    renderDialog({ isOpen: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('details text is rendered when provided', () => {
    renderDialog({ details: 'Event: Team Meeting' });
    expect(screen.getByText('Event: Team Meeting')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Non-recurring: no scope picker, confirm calls onConfirm
// ---------------------------------------------------------------------------

describe('non-recurring delete', () => {
  test('scope picker is NOT visible for non-recurring events', () => {
    renderDialog({ isRecurring: false });
    // The fieldset legend "Delete" from scope picker should not appear
    expect(screen.queryByRole('group', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByText('This event')).not.toBeInTheDocument();
    expect(screen.queryByText('All future events')).not.toBeInTheDocument();
  });

  test('confirm button calls onConfirm', () => {
    const onConfirm = vi.fn();
    renderDialog({ isRecurring: false, onConfirm });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('cancel button does NOT call onConfirm', () => {
    const onConfirm = vi.fn();
    renderDialog({ isRecurring: false, onConfirm });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Recurring: scope picker visible, scope controls confirm behavior
// ---------------------------------------------------------------------------

describe('recurring delete — scope picker', () => {
  test('scope picker IS visible when isRecurring is true', () => {
    renderDialog({ isRecurring: true, recurrenceScope: 'this' });
    expect(screen.getByText('This event')).toBeInTheDocument();
    expect(screen.getByText('All future events')).toBeInTheDocument();
  });

  test('"This event" radio is checked when recurrenceScope="this"', () => {
    renderDialog({ isRecurring: true, recurrenceScope: 'this' });
    const thisRadio = screen.getByRole('radio', { name: /this event/i });
    expect(thisRadio).toBeChecked();
  });

  test('"All future events" radio is checked when recurrenceScope="all-future"', () => {
    renderDialog({ isRecurring: true, recurrenceScope: 'all-future' });
    const allFutureRadio = screen.getByRole('radio', { name: /all future events/i });
    expect(allFutureRadio).toBeChecked();
  });

  test('onScopeChange is called with "all-future" when that radio is clicked', () => {
    const onScopeChange = vi.fn();
    renderDialog({ isRecurring: true, recurrenceScope: 'this', onScopeChange });

    fireEvent.click(screen.getByRole('radio', { name: /all future events/i }));

    expect(onScopeChange).toHaveBeenCalledWith('all-future');
  });

  test('onScopeChange is called with "this" when that radio is clicked', () => {
    const onScopeChange = vi.fn();
    renderDialog({ isRecurring: true, recurrenceScope: 'all-future', onScopeChange });

    fireEvent.click(screen.getByRole('radio', { name: /this event/i }));

    expect(onScopeChange).toHaveBeenCalledWith('this');
  });

  test('confirm button calls onConfirm (parent manages scope, dialog just confirms)', () => {
    const onConfirm = vi.fn();
    renderDialog({ isRecurring: true, recurrenceScope: 'this', onConfirm });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe('cancel behavior', () => {
  test('cancel button calls onCancel', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('pressing Escape calls onCancel', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    const dialog = screen.getByRole('alertdialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('clicking backdrop calls onCancel', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    // The backdrop is the parent div; mouseDown on it triggers cancel
    const backdrop = screen.getByRole('alertdialog').parentElement!;
    fireEvent.mouseDown(backdrop);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Focus trap (ACC-02)
// ---------------------------------------------------------------------------

describe('focus trap', () => {
  test('confirm button receives focus on open', async () => {
    renderDialog({ confirmLabel: 'Confirm' });

    await waitFor(() => {
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      expect(document.activeElement).toBe(confirmBtn);
    });
  });

  test('Tab from last focusable element wraps to first', async () => {
    renderDialog({ isRecurring: false });

    const dialog = screen.getByRole('alertdialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    expect(focusable.length).toBeGreaterThan(0);

    const last = focusable[focusable.length - 1];
    const first = focusable[0];

    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });

    // After Tab from last, focus should move to first
    expect(document.activeElement).toBe(first);
  });

  test('Shift+Tab from first focusable element wraps to last', async () => {
    renderDialog({ isRecurring: false });

    const dialog = screen.getByRole('alertdialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(last);
  });
});

// ---------------------------------------------------------------------------
// Accessibility roles and attributes
// ---------------------------------------------------------------------------

describe('accessibility attributes', () => {
  test('dialog has role="alertdialog"', () => {
    renderDialog();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  test('dialog has aria-modal="true"', () => {
    renderDialog();
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
  });

  test('dialog has aria-labelledby pointing to title element', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog');
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();
    // The labelled-by element should contain the title text
    const labelEl = document.getElementById(labelledby!);
    expect(labelEl?.textContent).toContain('Delete this event?');
  });

  test('dialog has aria-describedby pointing to message element', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog');
    const describedby = dialog.getAttribute('aria-describedby');
    expect(describedby).toBeTruthy();
    const descEl = document.getElementById(describedby!);
    expect(descEl?.textContent).toContain('This action cannot be undone.');
  });
});
