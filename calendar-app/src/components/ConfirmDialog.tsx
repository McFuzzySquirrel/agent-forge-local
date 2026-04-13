import { useEffect, useId, useRef } from 'react';

import styles from '../styles/ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  details?: string;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
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
