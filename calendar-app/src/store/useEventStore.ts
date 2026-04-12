import { useEffect, useState } from 'react';

import type { CalendarEvent } from '../types/event';
import { loadEventsFromStorage } from '../utils/storage';

export interface EventStore {
  events: CalendarEvent[];
}

export function useEventStore(): EventStore {
  const [events] = useState<CalendarEvent[]>(() => loadEventsFromStorage());

  useEffect(() => {
    // Phase 2 will add CRUD actions and write-through persistence behavior.
  }, [events]);

  return { events };
}
