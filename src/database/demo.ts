import { db } from './db';
import type { Person, Event, Group } from '../models/types';

// Create a small placeholder SVG directly as a Blob to use as fictional profile photos
function generateDummySvgBlob(color1: string, color2: string, text: string): Blob {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#g)" />
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-weight="bold" font-size="34" fill="#ffffff">${text}</text>
    </svg>
  `;
  return new Blob([svg], { type: 'image/svg+xml' });
}

export async function seedDemoData(): Promise<void> {
  // Clear any existing data first to avoid duplicate keys in a clean session
  await db.transaction('rw', [db.people, db.events, db.groups], async () => {
    await db.people.clear();
    await db.events.clear();
    await db.groups.clear();

    const groupsList: Group[] = [
      { id: 'g-fam', name: 'My Family', color: '#3b82f6', icon: 'Heart' },
      { id: 'g-friends', name: 'Friends', color: '#10b981', icon: 'UserGroup' },
      { id: 'g-work', name: 'Work', color: '#8b5cf6', icon: 'Briefcase' },
    ];

    for (const g of groupsList) {
      await db.groups.put(g);
    }

    const maverickPhoto = generateDummySvgBlob('#f59e0b', '#ef4444', 'M');
    const adalinePhoto = generateDummySvgBlob('#ec4899', '#f43f5e', 'A');
    const mylesPhoto = generateDummySvgBlob('#10b981', '#3b82f6', 'My');

    const people: Person[] = [
      {
        id: 'p-adaline',
        firstName: 'Adaline',
        lastName: 'Shulyak',
        displayName: 'Adaline 🌸',
        profilePhoto: adalinePhoto,
        dob: '2021-03-26',
        dobPrecision: 'full',
        isFavorite: true,
        groups: ['g-fam'],
        tags: ['Birthday', 'High priority'],
        customFields: [
          { id: 'cf-1', label: 'Birth Weight', value: '6.0 lb' },
          { id: 'cf-2', label: 'Birth Length', value: '19.3 in' },
          { id: 'cf-3', label: 'Favorite Color', value: 'Dusty Pink' },
          { id: 'cf-4', label: 'Card Sent', value: 'Yes' },
        ],
        createdDate: Date.now(),
        lastUpdatedDate: Date.now(),
      },
      {
        id: 'p-maverick',
        firstName: 'Maverick',
        lastName: 'Shulyak',
        displayName: 'Maverick ⚡',
        profilePhoto: maverickPhoto,
        dob: '2022-06-16',
        dobPrecision: 'full',
        isFavorite: true,
        groups: ['g-fam'],
        tags: ['Birthday', 'Send card'],
        customFields: [
          { id: 'cf-5', label: 'Birth Weight', value: '6.9 lb' },
          { id: 'cf-6', label: 'Birth Length', value: '20.0 in' },
          { id: 'cf-7', label: 'Favorite Toy', value: 'Tractor' },
        ],
        createdDate: Date.now(),
        lastUpdatedDate: Date.now(),
      },
      {
        id: 'p-myles',
        firstName: 'Myles',
        lastName: 'Shulyak',
        displayName: 'Myles 🎈',
        profilePhoto: mylesPhoto,
        dob: '2024-05-09',
        dobPrecision: 'full',
        isFavorite: false,
        groups: ['g-fam'],
        tags: ['Birthday'],
        customFields: [
          { id: 'cf-8', label: 'Birth Weight', value: '7.3 lb' },
          { id: 'cf-9', label: 'Birth Length', value: '20.5 in' },
        ],
        createdDate: Date.now(),
        lastUpdatedDate: Date.now(),
      },
      {
        id: 'p-ilya',
        firstName: 'Ilya',
        lastName: 'Shulyak',
        displayName: 'Ilya ✔',
        dob: '1997-10-20',
        dobPrecision: 'full',
        isFavorite: false,
        groups: ['g-fam'],
        tags: [],
        customFields: [
          { id: 'cf-10', label: 'Coffee preference', value: 'Cortado' }
        ],
        createdDate: Date.now(),
        lastUpdatedDate: Date.now(),
      },
    ];

    for (const p of people) {
      await db.people.put(p);
    }

    const events: Event[] = [
      {
        id: 'e-wedding',
        eventName: 'Wedding Anniversary',
        eventType: 'anniversary',
        originalDate: '2019-06-21',
        originalDatePrecision: 'full',
        linkedPeopleIds: ['p-ilya'],
        annualRecurrence: true,
        groups: ['g-fam'],
        tags: ['Anniversary', 'High priority'],
        priority: 'high',
        customFields: [
          { id: 'cf-e1', label: 'Venue', value: 'Lakeview Garden' },
        ],
        createdDate: Date.now(),
        lastUpdatedDate: Date.now(),
      },
      {
        id: 'e-grad',
        eventName: 'College Graduation',
        eventType: 'graduation',
        originalDate: '2019-05-18',
        originalDatePrecision: 'full',
        linkedPeopleIds: ['p-ilya'],
        annualRecurrence: false,
        groups: ['g-fam'],
        tags: [],
        priority: 'none',
        customFields: [
          { id: 'cf-e2', label: 'Degree', value: 'B.S. Computer Science' },
        ],
        createdDate: Date.now(),
        lastUpdatedDate: Date.now(),
      },
    ];

    for (const e of events) {
      await db.events.put(e);
    }
  });
}

export async function flushAllAndReset(): Promise<void> {
  await db.transaction('rw', [db.people, db.events, db.groups, db.savedFilters, db.widgets, db.settings], async () => {
    await db.people.clear();
    await db.events.clear();
    await db.groups.clear();
    await db.savedFilters.clear();
    await db.widgets.clear();
    await db.settings.clear();
  });
}
