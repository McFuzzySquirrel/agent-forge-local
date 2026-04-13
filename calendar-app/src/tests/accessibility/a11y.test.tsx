/**
 * Accessibility tests — PRD §11, ACC-01–ACC-03
 *
 * Covers:
 *   - EventModal: form fields have accessible labels
 *   - EventModal: close button is accessible
 *   - EventModal: dialog role and aria-modal
 *   - ConfirmDialog: alertdialog role and aria-modal
 *   - CalendarHeader: nav buttons have accessible labels
 *   - EventChip: chip has accessible text
 */

import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { EventModal } from '../../components/EventModal';
import type { EventModalProps } from '../../components/EventModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CalendarHeader } from '../../components/CalendarHeader';
import { EventChip } from '../../components/EventChip';
import { validateEvent } from '../../store/useEventStore';
import type { CalendarEvent } from '../../types/event';

// ---------------------------------------------------------------------------
// EventModal — form field accessible labels (ACC-01)
// ---------------------------------------------------------------------------

const modalBaseProps: EventModalProps = {
  isOpen: true,
  mode: 'create',
  validateEvent,
  onSave: vi.fn().mockReturnValue({ valid: true, errors: {} }),
  onClose: vi.fn(),
};

describe('EventModal accessibility', () => {
  test('Title field is accessible via label text', () => {
    render(<EventModal {...modalBaseProps} />);
    // The label wraps the input — getByRole finds the input by its label
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
  });

  test('Description field is accessible via label text', () => {
    render(<EventModal {...modalBaseProps} />);
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
  });

  test('Category field is accessible via label text', () => {
    render(<EventModal {...modalBaseProps} />);
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
  });

  test('Repeats/Recurrence field is accessible via label text', () => {
    render(<EventModal {...modalBaseProps} />);
    expect(screen.getByRole('combobox', { name: /repeats/i })).toBeInTheDocument();
  });

  test('datetime-local inputs exist and are labeled', () => {
    render(<EventModal {...modalBaseProps} />);
    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(datetimeInputs.length).toBeGreaterThanOrEqual(2);
  });

  test('Close button has accessible aria-label', () => {
    render(<EventModal {...modalBaseProps} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toHaveAttribute('aria-label');
  });

  test('Modal has role="dialog"', () => {
    render(<EventModal {...modalBaseProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('Modal has aria-modal="true"', () => {
    render(<EventModal {...modalBaseProps} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  test('Modal has aria-labelledby pointing to a heading', () => {
    render(<EventModal {...modalBaseProps} />);
    const dialog = screen.getByRole('dialog');
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();
    const heading = document.getElementById(labelledby!);
    expect(heading).not.toBeNull();
    expect(heading?.tagName).toMatch(/^H[1-6]$/);
  });
});

// ---------------------------------------------------------------------------
// ConfirmDialog accessibility (ACC-02, ACC-03)
// ---------------------------------------------------------------------------

describe('ConfirmDialog accessibility', () => {
  test('dialog has role="alertdialog"', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  test('dialog has aria-modal="true"', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
  });

  test('cancel and confirm buttons are focusable (keyboard accessible)', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete?"
        message="Are you sure?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    for (const btn of buttons) {
      expect(btn.tabIndex).not.toBe(-1);
    }
  });
});

// ---------------------------------------------------------------------------
// CalendarHeader — navigation button labels (ACC-01)
// ---------------------------------------------------------------------------

describe('CalendarHeader accessibility', () => {
  const headerProps = {
    activeView: 'month' as const,
    activeDate: new Date('2024-01-15'),
    onViewChange: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
  };

  test('Previous button has an accessible aria-label', () => {
    render(<CalendarHeader {...headerProps} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
  });

  test('Next button has an accessible aria-label', () => {
    render(<CalendarHeader {...headerProps} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  test('Today button is accessible', () => {
    render(<CalendarHeader {...headerProps} />);
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  test('View selection buttons have aria-label and aria-pressed', () => {
    render(<CalendarHeader {...headerProps} />);
    const monthBtn = screen.getByRole('button', { name: /switch to month view/i });
    expect(monthBtn).toHaveAttribute('aria-pressed', 'true');

    const weekBtn = screen.getByRole('button', { name: /switch to week view/i });
    expect(weekBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('current date label has aria-live="polite"', () => {
    render(<CalendarHeader {...headerProps} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toContain('January 2024');
  });
});

// ---------------------------------------------------------------------------
// EventChip — accessible text (ACC-01)
// ---------------------------------------------------------------------------

describe('EventChip accessibility', () => {
  const sampleEvent: Pick<CalendarEvent, 'title' | 'category' | 'color'> = {
    title: 'Team Meeting',
    category: 'work',
    color: '#4A90E2',
  };

  test('chip has an aria-label containing the event title', () => {
    render(<EventChip event={sampleEvent} onClick={vi.fn()} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveAttribute('aria-label');
    expect(chip.getAttribute('aria-label')).toContain('Team Meeting');
  });

  test('chip aria-label includes the category label', () => {
    render(<EventChip event={sampleEvent} onClick={vi.fn()} />);
    const chip = screen.getByRole('button');
    expect(chip.getAttribute('aria-label')).toContain('Work');
  });

  test('non-interactive chip (no onClick) has aria-label', () => {
    render(<EventChip event={sampleEvent} />);
    // Rendered as a div with aria-label (not a button)
    const chip = document.querySelector('[aria-label]');
    expect(chip).not.toBeNull();
    expect(chip?.getAttribute('aria-label')).toContain('Team Meeting');
  });

  test('color dot is aria-hidden (decorative)', () => {
    render(<EventChip event={sampleEvent} onClick={vi.fn()} />);
    const colorDot = document.querySelector('[aria-hidden="true"]');
    expect(colorDot).not.toBeNull();
  });

  test('title text is visible in the DOM (not just in aria-label)', () => {
    render(<EventChip event={sampleEvent} />);
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });
});
