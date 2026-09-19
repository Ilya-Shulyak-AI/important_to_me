import type { Event, Person } from '../../models/types';
import { calculateNextAnniversary } from '../../date-engine/engine';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export interface UpcomingCalendarItem {
  uid: string;
  title: string;
  date: Date;
  description?: string;
}

export function collectUpcomingCalendarItems(
  people: Person[],
  events: Event[],
  withinDays = 365,
): UpcomingCalendarItem[] {
  const now = new Date();
  const items: UpcomingCalendarItem[] = [];

  for (const person of people) {
    try {
      const anniv = calculateNextAnniversary(person.dob, now);
      if (anniv.daysOnlyRemaining < 0 || anniv.daysOnlyRemaining > withinDays) continue;
      items.push({
        uid: `bday-${person.id}@important-to-me`,
        title: `${person.displayName}'s birthday`,
        date: anniv.date,
        description: person.relationship ? `Relationship: ${person.relationship}` : undefined,
      });
    } catch {
      // skip unparsable
    }
  }

  for (const event of events) {
    try {
      const anniv = calculateNextAnniversary(event.originalDate, now);
      if (anniv.daysOnlyRemaining < 0 || anniv.daysOnlyRemaining > withinDays) continue;
      items.push({
        uid: `event-${event.id}@important-to-me`,
        title: event.eventName,
        date: anniv.date,
        description: event.eventType,
      });
    } catch {
      // skip
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function buildIcsCalendar(items: UpcomingCalendarItem[], calendarName = 'Important to Me'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Important to Me//EN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const item of items) {
    const day = formatIcsDate(item.date);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.uid}`,
      `DTSTAMP:${day}T120000Z`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${escapeText(item.title)}`,
    );
    if (item.description) lines.push(`DESCRIPTION:${escapeText(item.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
