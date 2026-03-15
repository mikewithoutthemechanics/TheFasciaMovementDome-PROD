
import { Class, Venue, User } from './types';

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

// Calculate end time from start time and duration (in minutes)
export function getEndTime(dateStr: string, durationMinutes: number): string {
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() + durationMinutes);
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

// Calculate end time with reset buffer (30 min for dome venues)
export function getEndTimeWithReset(dateStr: string, durationMinutes: number, hasResetBuffer: boolean, allowOverride?: boolean): { endTime: string; hasBuffer: boolean; nextAvailable: string } {
  const d = new Date(dateStr);
  const resetBuffer = hasResetBuffer && !allowOverride ? 30 : 0;
  d.setMinutes(d.getMinutes() + durationMinutes + resetBuffer);
  
  return {
    endTime: d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
    hasBuffer: resetBuffer > 0,
    nextAvailable: d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })
  };
}

// Check if venue name suggests it's a dome venue
export function isDomeVenue(venueName?: string): boolean {
  if (!venueName) return false;
  return venueName.toLowerCase().includes('dome');
}

export function spotsLeft(cls: Class): number {
  return cls.capacity - cls.registered;
}

export function isFull(cls: Class): boolean {
  return cls.registered >= cls.capacity;
}

export function getVenue(id: string, venues: Venue[]): Venue | undefined {
  return venues.find(v => v.id === id);
}

/**
 * SECURITY: Escapes HTML special characters to prevent XSS injection.
 * All user-controlled or database-sourced values must pass through this
 * before being substituted into templates that may render as HTML.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function renderTemplate(templateBody: string, cls: Class, venue?: Venue, user?: User): string {
  // SECURITY: user.id used in URL — restrict to alphanumeric/hyphen to prevent
  // URL injection. Falls back to "demo" if the ID contains unexpected characters.
  const safeUserId = /^[\w\-]+$/.test(user?.id || '') ? user!.id : 'demo';
  const link = `https://app.pausefmd.co.za/invite/${encodeURIComponent(cls.slug)}?ref=${encodeURIComponent(safeUserId)}`;

  // SECURITY: All values from user input or the database are HTML-escaped before
  // substitution. formatDate/formatTime output is locale-formatted and safe,
  // but escaped here too for defence in depth.
  const referrerName = escapeHtml(user?.name || 'A friend');
  const referrerFirstName = escapeHtml(user?.name?.split(' ')[0] || 'A friend');

  return templateBody
    .replace(/{{class_name}}/g, escapeHtml(cls.title))
    .replace(/{{class_date}}/g, escapeHtml(formatDate(cls.dateTime)))
    .replace(/{{class_time}}/g, escapeHtml(formatTime(cls.dateTime)))
    .replace(/{{venue_name}}/g, escapeHtml(venue?.name || ''))
    .replace(/{{venue_address}}/g, escapeHtml(venue?.address || ''))
    .replace(/{{invite_link}}/g, link)
    .replace(/{{spots_remaining}}/g, String(spotsLeft(cls)))
    .replace(/{{referrer_name}}/g, referrerName)
    .replace(/{{referrer_first_name}}/g, referrerFirstName);
}
