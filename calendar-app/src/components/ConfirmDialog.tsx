import { useEffect, useId, useRef } from 'react';

import styles from '../styles/ConfirmDialog.module.css';

/** Trap Tab / Shift+Tab focus inside the given dialog element (ACC-02). */
function trapFocus(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab') return;

  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  details?: string;
  /** When true, shows a recurrence-scope radio group (FR-22). */
  isRecurring?: boolean;
  /** Controlled scope value — 'this' or 'all-future'. */
  recurrenceScope?: 'this' | 'all-future';
  /** Called when the user changes the scope selection. */
  onScopeChange?: (scope: 'this' | 'all-future') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  details,
  isRecurring = false,
  recurrenceScope = 'this',
  onScopeChange,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const scopeGroupId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      wasOpenRef.current = true;

      const timer = window.setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    if (wasOpenRef.current) {
      previousFocusRef.current?.focus();
      wasOpenRef.current = false;
    }

    return undefined;
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          } else {
            trapFocus(event);
          }
        }}
      >
        <div className={styles.content}>
          <p className={styles.eyebrow}>Please confirm</p>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p id={descriptionId} className={styles.message}>
            {message}
          </p>

          {/* Recurrence scope picker — only for recurring-event deletes (FR-22) */}
          {isRecurring ? (
            <fieldset className={styles.scopePicker}>
              <legend className={styles.scopePickerLegend}>Delete</legend>
              <label className={styles.scopeOption}>
                <input
                  type="radio"
                  className={styles.scopeOptionInput}
                  name={scopeGroupId}
                  value="this"
                  checked={recurrenceScope === 'this'}
                  onChange={() => onScopeChange?.('this')}
                />
                This event
              </label>
              <label className={styles.scopeOption}>
                <input
                  type="radio"
                  className={styles.scopeOptionInput}
                  name={scopeGroupId}
                  value="all-future"
                  checked={recurrenceScope === 'all-future'}
                  onChange={() => onScopeChange?.('all-future')}
                />
                All future events
              </label>
            </fieldset>
          ) : null}

          {details ? <p className={styles.details}>{details}</p> : null}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={tone === 'danger' ? styles.dangerButton : styles.primaryButton}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
