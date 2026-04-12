import { useMemo, useState } from 'react';

import { CalendarHeader } from './components/CalendarHeader';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { useEventStore } from './store/useEventStore';
import {
  addDays,
  addMonths,
  addWeeks,
  subDays,
  subMonths,
  subWeeks,
} from './utils/dateHelpers';
import styles from './styles/App.module.css';

export type CalendarView = 'month' | 'week' | 'day';

export default function App() {
  const [activeView, setActiveView] = useState<CalendarView>('month');
  const [activeDate, setActiveDate] = useState<Date>(new Date());
  const { events } = useEventStore();

  const handlePrev = () => {
    setActiveDate((current) => {
      if (activeView === 'month') {
        return subMonths(current, 1);
      }

      if (activeView === 'week') {
        return subWeeks(current, 1);
      }

      return subDays(current, 1);
    });
  };

  const handleNext = () => {
    setActiveDate((current) => {
      if (activeView === 'month') {
        return addMonths(current, 1);
      }

      if (activeView === 'week') {
        return addWeeks(current, 1);
      }

      return addDays(current, 1);
    });
  };

  const handleToday = () => {
    setActiveDate(new Date());
  };

  const activeViewContent = useMemo(() => {
    if (activeView === 'month') {
      return (
        <MonthView
          activeDate={activeDate}
          events={events}
          onDayClick={() => {
            // Phase 2 wires day click to modal creation flow.
          }}
        />
      );
    }

    if (activeView === 'week') {
      return (
        <WeekView
          activeDate={activeDate}
          events={events}
          onTimeSlotClick={() => {
            // Phase 2 wires slot click to modal creation flow.
          }}
        />
      );
    }

    return (
      <DayView
        activeDate={activeDate}
        events={events}
        onTimeSlotClick={() => {
          // Phase 2 wires slot click to modal creation flow.
        }}
      />
    );
  }, [activeDate, activeView, events]);

  return (
    <div className={styles.app}>
      <CalendarHeader
        activeView={activeView}
        activeDate={activeDate}
        onViewChange={setActiveView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />
      <main className={styles.viewContainer}>{activeViewContent}</main>
    </div>
  );
}
