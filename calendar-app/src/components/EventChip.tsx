import type { CSSProperties } from 'react';

import type { CalendarEvent, EventCategory } from '../types/event';
import styles from '../styles/EventChip.module.css';

const CATEGORY_LABELS: Record<EventCategory, string> = {
  work: 'Work',
  personal: 'Personal',
  health: 'Health',
  social: 'Social',
  other: 'Other',
};

export interface EventChipProps {
  event: Pick<CalendarEvent, 'title' | 'category' | 'color'>;
  className?: string;
  onClick?: () => void;
}

export function EventChip({ event, className, onClick }: EventChipProps) {
  const chipClassName = [styles.chip, onClick ? styles.buttonChip : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  const chipStyle = {
    '--event-chip-color': event.color,
  } as CSSProperties;

  const content = (
    <>
      <span className={styles.colorDot} aria-hidden="true" />
      <span className={styles.title}>{event.title}</span>
      <span className={styles.category}>{CATEGORY_LABELS[event.category]}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={chipClassName}
        style={chipStyle}
        onClick={onClick}
        aria-label={`${event.title} (${CATEGORY_LABELS[event.category]})`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={chipClassName}
      style={chipStyle}
      aria-label={`${event.title} (${CATEGORY_LABELS[event.category]})`}
    >
      {content}
    </div>
  );
}
