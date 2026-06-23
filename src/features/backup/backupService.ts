import JSZip from 'jszip';
import { db } from '../../database/db';
import type { Person, Event, Group, SavedFilter, WidgetConfig } from '../../models/types';

export interface BackupMetadata {
  appVersion: string;
  schemaVersion: number;
  timestamp: string;
  peopleCount: number;
  eventCount: number;
  photoCount: number;
  integrityHash: string;
}

export interface BackupData {
  people: Array<Omit<Person, 'profilePhoto'>>;
  events: Array<Omit<Event, 'photo'>>;
  groups: Group[];
  savedFilters: SavedFilter[];
  widgets: WidgetConfig[];
}

export interface ImportPreview {
  metadata: BackupMetadata;
  data: BackupData;
  photos: { [id: string]: Blob };
  duplicates: {
    people: Array<{ incoming: any; existing: any }>;
    events: Array<{ incoming: any; existing: any }>;
  };
}

// Generate an elegant, portable backup file
export async function exportBackup(includePhotos: boolean = true): Promise<Blob> {
  const zip = new JSZip();

  // 1. Gather database state
  const people = await db.people.toArray();
  const events = await db.events.toArray();
  const groups = await db.groups.toArray();
  const savedFilters = await db.savedFilters.toArray();
  const widgets = await db.widgets.toArray();

  // Create clean data representations without inline Blobs
  const backupPeople = people.map(({ profilePhoto, profilePhotoUrl, ...rest }) => rest);
  const backupEvents = events.map(({ photo, photoUrl, ...rest }) => rest);

  const backupData: BackupData = {
    people: backupPeople,
    events: backupEvents,
    groups,
    savedFilters,
    widgets,
  };

  // 2. Separate all photo Blobs into photos/ directory
  let photoCount = 0;
  if (includePhotos) {
    const photosFolder = zip.folder('photos');
    for (const person of people) {
      if (person.profilePhoto instanceof Blob) {
        photosFolder?.file(`${person.id}.jpg`, person.profilePhoto);
        photoCount++;
      }
    }
  }

  // 3. Create manifest
  const metadata: BackupMetadata = {
    appVersion: '1.0.0',
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    peopleCount: backupPeople.length,
    eventCount: backupEvents.length,
    photoCount,
    integrityHash: btoa(JSON.stringify({
      p: backupPeople.length,
      e: backupEvents.length,
      t: Date.now()
    })),
  };

  zip.file('manifest.json', JSON.stringify(metadata, null, 2));
  zip.file('data.json', JSON.stringify(backupData, null, 2));

  // 4. Build blob zip package
  return await zip.generateAsync({ type: 'blob' });
}

// Validate and parse an incoming backup file
export async function parseAndPreviewBackup(file: File): Promise<ImportPreview> {
  const loadedZip = await JSZip.loadAsync(file);

  const manifestFile = loadedZip.file('manifest.json');
  const dataFile = loadedZip.file('data.json');

  if (!manifestFile || !dataFile) {
    throw new Error('Invalid backup file: manifest.json or data.json is missing.');
  }

  const manifestText = await manifestFile.async('text');
  const dataText = await dataFile.async('text');

  const metadata = JSON.parse(manifestText) as BackupMetadata;
  const data = JSON.parse(dataText) as BackupData;

  // Basic validation check
  if (!Array.isArray(data.people) || !Array.isArray(data.events)) {
    throw new Error('Unsupported JSON database formats.');
  }

  // Extract photos
  const photos: { [id: string]: Blob } = {};
  const photosFolder = loadedZip.folder('photos');
  
  if (photosFolder) {
    for (const person of data.people) {
      const photoFile = loadedZip.file(`photos/${person.id}.jpg`);
      if (photoFile) {
        const pBlob = await photoFile.async('blob');
        photos[person.id] = pBlob;
      }
    }
  }

  // Detect duplicates on matching database keys or names
  const duplicates = {
    people: [] as Array<{ incoming: any; existing: any }>,
    events: [] as Array<{ incoming: any; existing: any }>,
  };

  for (const incomingP of data.people) {
    const existingP = await db.people.get(incomingP.id);
    if (existingP) {
      duplicates.people.push({ incoming: incomingP, existing: existingP });
    } else {
      // Find matching display name + birthday matches
      const fuzzyMatch = await db.people
        .where('displayName')
        .equals(incomingP.displayName)
        .filter(p => p.dob === incomingP.dob)
        .first();
      if (fuzzyMatch) {
        duplicates.people.push({ incoming: incomingP, existing: fuzzyMatch });
      }
    }
  }

  for (const incomingE of data.events) {
    const existingE = await db.events.get(incomingE.id);
    if (existingE) {
      duplicates.events.push({ incoming: incomingE, existing: existingE });
    }
  }

  return {
    metadata,
    data,
    photos,
    duplicates,
  };
}

// Write the backup data into IndexDB
export async function executeImport(
  preview: ImportPreview,
  mode: 'replace' | 'merge',
  selectedConflictResolutions: { [id: string]: 'use-incoming' | 'keep-existing' } = {}
): Promise<{ peopleSaved: number; eventsSaved: number }> {
  const { data, photos } = preview;

  let peopleSaved = 0;
  let eventsSaved = 0;

  await db.transaction('rw', [db.people, db.events, db.groups, db.savedFilters, db.widgets], async () => {
    if (mode === 'replace') {
      await db.people.clear();
      await db.events.clear();
      await db.groups.clear();
      await db.savedFilters.clear();
      await db.widgets.clear();
    }

    // Process groups
    for (const group of data.groups || []) {
      await db.groups.put(group);
    }

    // Process saved filters
    for (const filter of data.savedFilters || []) {
      await db.savedFilters.put(filter);
    }

    // Process widgets
    for (const widget of data.widgets || []) {
      await db.widgets.put(widget);
    }

    // Process People
    for (const person of data.people) {
      const existing = await db.people.get(person.id);
      
      let chooseIncoming = true;
      if (existing) {
        if (mode === 'merge') {
          const resolution = selectedConflictResolutions[person.id];
          if (resolution === 'keep-existing') {
            chooseIncoming = false;
          }
        }
      }

      if (chooseIncoming) {
        const fullPerson: Person = {
          ...person,
          // Re-attach photo blob if extracted
          profilePhoto: photos[person.id] || undefined,
          createdDate: person.createdDate || Date.now(),
          lastUpdatedDate: Date.now(),
        };
        await db.people.put(fullPerson);
        peopleSaved++;
      }
    }

    // Process Events
    for (const event of data.events) {
      const existing = await db.events.get(event.id);

      let chooseIncoming = true;
      if (existing && mode === 'merge') {
        const resolution = selectedConflictResolutions[event.id];
        if (resolution === 'keep-existing') {
          chooseIncoming = false;
        }
      }

      if (chooseIncoming) {
        const fullEvent: Event = {
          ...event,
          createdDate: event.createdDate || Date.now(),
          lastUpdatedDate: Date.now(),
        };
        await db.events.put(fullEvent);
        eventsSaved++;
      }
    }
  });

  return { peopleSaved, eventsSaved };
}
