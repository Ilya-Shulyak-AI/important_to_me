import JSZip from 'jszip';
import { db } from '../../database/db';
import type { Person, Event, Group, SavedFilter, WidgetConfig } from '../../models/types';

const APP_VERSION = '0.1.0';
const SCHEMA_VERSION = 2;
const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const MAX_RECORDS_PER_COLLECTION = 50_000;

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
  people: Array<Omit<Person, 'profilePhoto' | 'profilePhotoUrl'>>;
  events: Array<Omit<Event, 'photo' | 'photoUrl'>>;
  groups: Group[];
  savedFilters: SavedFilter[];
  widgets: WidgetConfig[];
}

export interface ImportPreview {
  metadata: BackupMetadata;
  data: BackupData;
  personPhotos: Record<string, Blob>;
  eventPhotos: Record<string, Blob>;
  duplicates: {
    people: Array<{ incoming: Person; existing: Person }>;
    events: Array<{ incoming: Event; existing: Event }>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid backup: ${field} must be an array.`);
  }
  if (value.length > MAX_RECORDS_PER_COLLECTION) {
    throw new Error(`Invalid backup: ${field} contains too many records.`);
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid backup: ${field} must be a non-empty string.`);
  }
  return value;
}

function validateBackupData(value: unknown): BackupData {
  if (!isRecord(value)) {
    throw new Error('Invalid backup: data.json must contain an object.');
  }

  const people = requireArray(value.people, 'people');
  const events = requireArray(value.events, 'events');
  const groups = requireArray(value.groups ?? [], 'groups');
  const savedFilters = requireArray(value.savedFilters ?? [], 'savedFilters');
  const widgets = requireArray(value.widgets ?? [], 'widgets');

  const seenPersonIds = new Set<string>();
  for (const person of people) {
    if (!isRecord(person)) throw new Error('Invalid backup: malformed person record.');
    const id = requireString(person.id, 'person.id');
    requireString(person.displayName, `person ${id}.displayName`);
    requireString(person.dob, `person ${id}.dob`);
    if (seenPersonIds.has(id)) throw new Error(`Invalid backup: duplicate person ID ${id}.`);
    seenPersonIds.add(id);
  }

  const seenEventIds = new Set<string>();
  for (const event of events) {
    if (!isRecord(event)) throw new Error('Invalid backup: malformed event record.');
    const id = requireString(event.id, 'event.id');
    requireString(event.eventName, `event ${id}.eventName`);
    requireString(event.originalDate, `event ${id}.originalDate`);
    if (seenEventIds.has(id)) throw new Error(`Invalid backup: duplicate event ID ${id}.`);
    seenEventIds.add(id);
  }

  return {
    people: people as BackupData['people'],
    events: events as BackupData['events'],
    groups: groups as Group[],
    savedFilters: savedFilters as SavedFilter[],
    widgets: widgets as WidgetConfig[],
  };
}

async function sha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) return '';
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function validateMetadata(value: unknown): BackupMetadata {
  if (!isRecord(value)) throw new Error('Invalid backup: malformed manifest.');

  const schemaVersion = Number(value.schemaVersion);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Unsupported backup schema version: ${String(value.schemaVersion)}.`);
  }

  const timestamp = requireString(value.timestamp, 'manifest.timestamp');
  if (Number.isNaN(Date.parse(timestamp))) throw new Error('Invalid backup: malformed timestamp.');

  return {
    appVersion: typeof value.appVersion === 'string' ? value.appVersion : 'unknown',
    schemaVersion,
    timestamp,
    peopleCount: Number(value.peopleCount) || 0,
    eventCount: Number(value.eventCount) || 0,
    photoCount: Number(value.photoCount) || 0,
    integrityHash: typeof value.integrityHash === 'string' ? value.integrityHash : '',
  };
}

export async function exportBackup(includePhotos = true): Promise<Blob> {
  const zip = new JSZip();

  const people: Person[] = await db.people.toArray();
  const events: Event[] = await db.events.toArray();
  const groups: Group[] = await db.groups.toArray();
  const savedFilters: SavedFilter[] = await db.savedFilters.toArray();
  const widgets: WidgetConfig[] = await db.widgets.toArray();

  const backupPeople = people.map(({ profilePhoto, profilePhotoUrl, ...rest }) => rest);
  const backupEvents = events.map(({ photo, photoUrl, ...rest }) => rest);
  const backupData: BackupData = { people: backupPeople, events: backupEvents, groups, savedFilters, widgets };
  const dataText = JSON.stringify(backupData);

  let photoCount = 0;
  if (includePhotos) {
    for (const person of people) {
      if (person.profilePhoto instanceof Blob) {
        zip.file(`photos/people/${encodeURIComponent(person.id)}`, person.profilePhoto);
        photoCount += 1;
      }
    }
    for (const event of events) {
      if (event.photo instanceof Blob) {
        zip.file(`photos/events/${encodeURIComponent(event.id)}`, event.photo);
        photoCount += 1;
      }
    }
  }

  const metadata: BackupMetadata = {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    peopleCount: backupPeople.length,
    eventCount: backupEvents.length,
    photoCount,
    integrityHash: await sha256(dataText),
  };

  zip.file('manifest.json', JSON.stringify(metadata, null, 2));
  zip.file('data.json', dataText);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function parseAndPreviewBackup(file: File): Promise<ImportPreview> {
  if (file.size <= 0) throw new Error('The selected backup file is empty.');
  if (file.size > MAX_BACKUP_BYTES) throw new Error('The selected backup exceeds the 100 MB safety limit.');

  let loadedZip: JSZip;
  try {
    loadedZip = await JSZip.loadAsync(file, { checkCRC32: true });
  } catch {
    throw new Error('The selected file is not a valid or intact backup package.');
  }

  const manifestFile = loadedZip.file('manifest.json');
  const dataFile = loadedZip.file('data.json');
  if (!manifestFile || !dataFile) {
    throw new Error('Invalid backup: manifest.json or data.json is missing.');
  }

  let metadataRaw: unknown;
  let dataRaw: unknown;
  let dataText: string;
  try {
    const manifestText = await manifestFile.async('text');
    dataText = await dataFile.async('text');
    metadataRaw = JSON.parse(manifestText);
    dataRaw = JSON.parse(dataText);
  } catch {
    throw new Error('Invalid backup: manifest or data JSON could not be parsed.');
  }

  const metadata = validateMetadata(metadataRaw);
  const data = validateBackupData(dataRaw);

  if (metadata.peopleCount !== data.people.length || metadata.eventCount !== data.events.length) {
    throw new Error('Invalid backup: manifest record counts do not match the data.');
  }

  if (metadata.integrityHash) {
    const calculatedHash = await sha256(dataText);
    if (calculatedHash && calculatedHash !== metadata.integrityHash) {
      throw new Error('Backup integrity validation failed. The file may be damaged or modified.');
    }
  }

  const personPhotos: Record<string, Blob> = {};
  const eventPhotos: Record<string, Blob> = {};

  for (const person of data.people) {
    const encodedId = encodeURIComponent(person.id);
    const photoFile = loadedZip.file(`photos/people/${encodedId}`) ?? loadedZip.file(`photos/${person.id}.jpg`);
    if (photoFile) personPhotos[person.id] = await photoFile.async('blob');
  }

  for (const event of data.events) {
    const photoFile = loadedZip.file(`photos/events/${encodeURIComponent(event.id)}`);
    if (photoFile) eventPhotos[event.id] = await photoFile.async('blob');
  }

  const duplicates: ImportPreview['duplicates'] = { people: [], events: [] };

  for (const incoming of data.people) {
    const incomingPerson = incoming as Person;
    const existingById = await db.people.get(incomingPerson.id);
    if (existingById) {
      duplicates.people.push({ incoming: incomingPerson, existing: existingById });
      continue;
    }

    const matchingName = await db.people
      .where('displayName')
      .equals(incomingPerson.displayName)
      .filter((person: Person) => person.dob === incomingPerson.dob)
      .first();
    if (matchingName) duplicates.people.push({ incoming: incomingPerson, existing: matchingName });
  }

  for (const incoming of data.events) {
    const incomingEvent = incoming as Event;
    const existing = await db.events.get(incomingEvent.id);
    if (existing) duplicates.events.push({ incoming: incomingEvent, existing });
  }

  return { metadata, data, personPhotos, eventPhotos, duplicates };
}

export async function executeImport(
  preview: ImportPreview,
  mode: 'replace' | 'merge',
  selectedConflictResolutions: Record<string, 'use-incoming' | 'keep-existing'> = {},
): Promise<{ peopleSaved: number; eventsSaved: number }> {
  const { data, personPhotos, eventPhotos } = preview;
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

    for (const group of data.groups) await db.groups.put(group);
    for (const filter of data.savedFilters) await db.savedFilters.put(filter);
    for (const widget of data.widgets) await db.widgets.put(widget);

    for (const person of data.people) {
      const existing = await db.people.get(person.id);
      if (existing && mode === 'merge' && selectedConflictResolutions[person.id] === 'keep-existing') continue;

      await db.people.put({
        ...person,
        profilePhoto: personPhotos[person.id],
        createdDate: person.createdDate || Date.now(),
        lastUpdatedDate: Date.now(),
      } as Person);
      peopleSaved += 1;
    }

    for (const event of data.events) {
      const existing = await db.events.get(event.id);
      if (existing && mode === 'merge' && selectedConflictResolutions[event.id] === 'keep-existing') continue;

      await db.events.put({
        ...event,
        photo: eventPhotos[event.id],
        createdDate: event.createdDate || Date.now(),
        lastUpdatedDate: Date.now(),
      } as Event);
      eventsSaved += 1;
    }
  });

  return { peopleSaved, eventsSaved };
}
