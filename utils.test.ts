import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, getEndTime, getEndTimeWithReset, isDomeVenue, spotsLeft, isFull, getVenue, renderTemplate } from './utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const result = formatDate('2024-06-15T10:00:00.000Z');
    expect(result).toContain('June');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatTime', () => {
  it('should format time correctly', () => {
    const result = formatTime('2024-06-15T10:30:00.000Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('getEndTime', () => {
  it('should calculate end time correctly', () => {
    const result = getEndTime('2024-06-15T10:00:00.000Z', 90);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('getEndTimeWithReset', () => {
  it('should add 30 min buffer for dome venues', () => {
    const result = getEndTimeWithReset('2024-06-15T10:00:00.000Z', 60, true, false);
    expect(result.hasBuffer).toBe(true);
  });

  it('should not add buffer when override is allowed', () => {
    const result = getEndTimeWithReset('2024-06-15T10:00:00.000Z', 60, true, true);
    expect(result.hasBuffer).toBe(false);
  });

  it('should not add buffer for non-dome venues', () => {
    const result = getEndTimeWithReset('2024-06-15T10:00:00.000Z', 60, false, false);
    expect(result.hasBuffer).toBe(false);
  });
});

describe('isDomeVenue', () => {
  it('should return true for dome venues', () => {
    expect(isDomeVenue('The Dome')).toBe(true);
    expect(isDomeVenue('Fascia Dome')).toBe(true);
    expect(isDomeVenue('DOME')).toBe(true);
  });

  it('should return false for non-dome venues', () => {
    expect(isDomeVenue('Studio A')).toBe(false);
    expect(isDomeVenue('Main Hall')).toBe(false);
  });

  it('should handle undefined input', () => {
    expect(isDomeVenue(undefined)).toBe(false);
  });
});

describe('spotsLeft', () => {
  it('should calculate spots remaining', () => {
    const cls = { registered: 5, capacity: 15 };
    expect(spotsLeft(cls as any)).toBe(10);
  });
});

describe('isFull', () => {
  it('should return true when class is full', () => {
    const cls = { registered: 15, capacity: 15 };
    expect(isFull(cls as any)).toBe(true);
  });

  it('should return false when class has spots', () => {
    const cls = { registered: 10, capacity: 15 };
    expect(isFull(cls as any)).toBe(false);
  });
});

describe('getVenue', () => {
  it('should find venue by id', () => {
    const venues = [{ id: 'v1', name: 'Dome' }];
    const result = getVenue('v1', venues as any);
    expect(result?.name).toBe('Dome');
  });

  it('should return undefined for unknown id', () => {
    const venues = [{ id: 'v1', name: 'Dome' }];
    const result = getVenue('unknown', venues as any);
    expect(result).toBeUndefined();
  });
});

describe('renderTemplate', () => {
  it('should replace class name placeholder', () => {
    const cls = { title: 'Yoga', slug: 'yoga', dateTime: '2024-06-15T10:00:00.000Z', capacity: 15, registered: 5, price: 100, id: 'c1' };
    const result = renderTemplate('Welcome to {{class_name}}', cls as any);
    expect(result).toContain('Yoga');
  });

  it('should replace invite link placeholder', () => {
    const cls = { title: 'Yoga', slug: 'yoga', dateTime: '2024-06-15T10:00:00.000Z', capacity: 15, registered: 5, price: 100, id: 'c1' };
    const result = renderTemplate('Link: {{invite_link}}', cls as any);
    expect(result).toContain('https://app.pausefmd.co.za/invite/yoga');
  });

  it('should replace referrer variables', () => {
    const cls = { title: 'Yoga', slug: 'yoga', dateTime: '2024-06-15T10:00:00.000Z', capacity: 15, registered: 5, price: 100, id: 'c1' };
    const user = { id: 'u1', name: 'John Doe', email: 'john@test.com' };
    const result = renderTemplate('From: {{referrer_name}}', cls as any, undefined, user as any);
    expect(result).toContain('John Doe');
  });
});
