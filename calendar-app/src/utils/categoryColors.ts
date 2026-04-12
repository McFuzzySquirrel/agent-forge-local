import type { EventCategory } from '../types/event';

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  work: '#4A90E2',
  personal: '#7ED321',
  health: '#E86C6C',
  social: '#F5A623',
  other: '#9B9B9B',
};

const FALLBACK_COLOR = '#9B9B9B';

export function getCategoryColor(category: EventCategory): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLOR;
}
