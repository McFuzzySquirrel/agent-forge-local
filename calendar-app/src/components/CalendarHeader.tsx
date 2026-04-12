import { getWeekDays, formatDate } from '../utils/dateHelpers';
import styles from '../styles/CalendarHeader.module.css';

interface CalendarHeaderProps {
  activeView: 'month' | 'week' | 'day';
  activeDate: Date;
  onViewChange: (view: 'month' | 'week' | 'day') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function getDateLabel(activeView: 'month' | 'week' | 'day', activeDate: Date): string {
  if (activeView === 'month') {
    return formatDate(activeDate, 'MMMM yyyy');
  }

  if (activeView === 'week') {
    const weekDays = getWeekDays(activeDate);
    const start = weekDays[0];
    const end = weekDays[6];

    if (formatDate(start, 'yyyy') === formatDate(end, 'yyyy')) {
      if (formatDate(start, 'MMM') === formatDate(end, 'MMM')) {
        return `${formatDate(start, 'MMM d')}–${formatDate(end, 'd, yyyy')}`;
      }

      return `${formatDate(start, 'MMM d')}–${formatDate(end, 'MMM d, yyyy')}`;
    }

    return `${formatDate(start, 'MMM d, yyyy')}–${formatDate(end, 'MMM d, yyyy')}`;
  }

  return formatDate(activeDate, 'EEEE, MMM d, yyyy');
}

export function CalendarHeader({
  activeView,
  activeDate,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  const dateLabel = getDateLabel(activeView, activeDate);

  return (
    <header className={styles.header}>
      <div className={styles.navGroup}>
        <button type="button" className={styles.button} onClick={onToday} aria-label="Jump to today">
          Today
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onPrev}
          aria-label={`Go to previous ${activeView}`}
        >
          &lt;
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onNext}
          aria-label={`Go to next ${activeView}`}
        >
          &gt;
        </button>
      </div>

      <h1 className={styles.currentLabel} aria-live="polite">
        {dateLabel}
      </h1>

      <div className={styles.viewGroup} role="group" aria-label="Calendar view selection">
        <button
          type="button"
          className={`${styles.button} ${activeView === 'month' ? styles.active : ''}`}
          onClick={() => onViewChange('month')}
          aria-label="Switch to month view"
          aria-pressed={activeView === 'month'}
        >
          Month
        </button>
        <button
          type="button"
          className={`${styles.button} ${activeView === 'week' ? styles.active : ''}`}
          onClick={() => onViewChange('week')}
          aria-label="Switch to week view"
          aria-pressed={activeView === 'week'}
        >
          Week
        </button>
        <button
          type="button"
          className={`${styles.button} ${activeView === 'day' ? styles.active : ''}`}
          onClick={() => onViewChange('day')}
          aria-label="Switch to day view"
          aria-pressed={activeView === 'day'}
        >
          Day
        </button>
      </div>
    </header>
  );
}
