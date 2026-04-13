/**
 * Unit tests for src/utils/categoryColors.ts
 * PRD §15 (Testing Strategy) — utility-level coverage
 */

import { describe, test, expect } from 'vitest';

import type { EventCategory } from '../../types/event';
import { CATEGORY_COLORS, getCategoryColor } from '../../utils/categoryColors';

const KNOWN_CATEGORIES: EventCategory[] = ['work', 'personal', 'health', 'social', 'other'];

// ---------------------------------------------------------------------------
// CATEGORY_COLORS map
// ---------------------------------------------------------------------------

describe('CATEGORY_COLORS', () => {
  test('defines a color for every known category', () => {
    for (const category of KNOWN_CATEGORIES) {
      expect(CATEGORY_COLORS[category]).toBeDefined();
      expect(typeof CATEGORY_COLORS[category]).toBe('string');
      expect(CATEGORY_COLORS[category].length).toBeGreaterThan(0);
    }
  });

  test('work maps to a blue-family hex color', () => {
    expect(CATEGORY_COLORS.work).toBe('#4A90E2');
  });

  test('personal maps to a green-family hex color', () => {
    expect(CATEGORY_COLORS.personal).toBe('#7ED321');
  });

  test('health maps to a red-family hex color', () => {
    expect(CATEGORY_COLORS.health).toBe('#E86C6C');
  });

  test('social maps to an orange-family hex color', () => {
    expect(CATEGORY_COLORS.social).toBe('#F5A623');
  });

  test('other maps to a grey hex color', () => {
    expect(CATEGORY_COLORS.other).toBe('#9B9B9B');
  });

  test('all colors are valid CSS hex strings', () => {
    const hexRegex = /^#[0-9A-Fa-f]{3,8}$/;
    for (const category of KNOWN_CATEGORIES) {
      expect(CATEGORY_COLORS[category]).toMatch(hexRegex);
    }
  });
});

// ---------------------------------------------------------------------------
// getCategoryColor
// ---------------------------------------------------------------------------

describe('getCategoryColor', () => {
  test.each(KNOWN_CATEGORIES)('returns defined string for category "%s"', (category) => {
    const color = getCategoryColor(category);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  test('returns the correct color for "work"', () => {
    expect(getCategoryColor('work')).toBe(CATEGORY_COLORS.work);
  });

  test('returns the correct color for "personal"', () => {
    expect(getCategoryColor('personal')).toBe(CATEGORY_COLORS.personal);
  });

  test('returns the correct color for "health"', () => {
    expect(getCategoryColor('health')).toBe(CATEGORY_COLORS.health);
  });

  test('returns the correct color for "social"', () => {
    expect(getCategoryColor('social')).toBe(CATEGORY_COLORS.social);
  });

  test('returns the correct color for "other"', () => {
    expect(getCategoryColor('other')).toBe(CATEGORY_COLORS.other);
  });

  test('returns a non-empty fallback for an unknown category without throwing', () => {
    // Cast unknown value to exercise the ?? fallback path
    const color = getCategoryColor('unknown' as EventCategory);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  test('returns a non-empty fallback for undefined without throwing', () => {
    const color = getCategoryColor(undefined as unknown as EventCategory);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  test('fallback color matches the "other" grey (same visual style)', () => {
    const fallback = getCategoryColor('unknown' as EventCategory);
    // The fallback is defined as '#9B9B9B' matching the "other" category
    expect(fallback).toBe('#9B9B9B');
  });
});
