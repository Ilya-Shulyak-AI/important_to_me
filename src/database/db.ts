import './sandbox-shield';
import Dexie, { type Table } from 'dexie';
import type { Person, Event, Group, SavedFilter, WidgetConfig } from '../models/types';

// Helper to convert Blob to Base64 (async)
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to convert Base64 string back to a Blob
function base64ToBlob(base64: string, contentType: string = ''): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

// In-Memory Table Mock for high-security sandboxed iframes (prevents Script errors)
// Augumented with LocalStorage fallback synchronization for persistent iframe states
class InMemoryTable<T extends { id: any }> {
  private data = new Map<string, T>();
  private storageKey: string | null = null;

  constructor(initialData: T[] = [], storageKey: string | null = null) {
    this.storageKey = storageKey;
    
    let loadedData = initialData;
    if (this.storageKey && typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            loadedData = parsed.map((item: any) => {
              const cleaned = { ...item };
              if (cleaned._profilePhotoBase64) {
                cleaned.profilePhoto = base64ToBlob(cleaned._profilePhotoBase64, cleaned._profilePhotoType || 'image/jpeg');
                delete cleaned._profilePhotoBase64;
                delete cleaned._profilePhotoType;
              }
              if (cleaned._photoBase64) {
                cleaned.photo = base64ToBlob(cleaned._photoBase64, cleaned._photoType || 'image/jpeg');
                delete cleaned._photoBase64;
                delete cleaned._photoType;
              }
              return cleaned;
            });
          }
        }
      } catch (e) {
        console.warn('LocalStorage state recovery failed for key:', this.storageKey, e);
      }
    }

    for (const item of loadedData) {
      if (item && item.id) {
        this.data.set(String(item.id), item);
      }
    }
  }

  private async saveToStorage(): Promise<void> {
    if (!this.storageKey || typeof window === 'undefined' || !window.localStorage) return;
    try {
      const items = Array.from(this.data.values());
      const serializable = await Promise.all(items.map(async (item: any) => {
        const copy = { ...item };
        if (copy.profilePhoto instanceof Blob) {
          copy._profilePhotoBase64 = await blobToBase64(copy.profilePhoto);
          copy._profilePhotoType = copy.profilePhoto.type;
          delete copy.profilePhoto;
        }
        if (copy.photo instanceof Blob) {
          copy._photoBase64 = await blobToBase64(copy.photo);
          copy._photoType = copy.photo.type;
          delete copy.photo;
        }
        return copy;
      }));
      window.localStorage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (e) {
      console.warn('LocalStorage backup sync crashed for key:', this.storageKey, e);
    }
  }

  async toArray(): Promise<T[]> {
    return Array.from(this.data.values());
  }

  async put(item: T): Promise<any> {
    const id = item.id || Math.random().toString(36).substring(2, 11);
    const itemWithId = { ...item, id };
    this.data.set(String(id), itemWithId as any);
    await this.saveToStorage();
    return id;
  }

  async get(key: any): Promise<T | undefined> {
    return this.data.get(String(key));
  }

  async delete(key: any): Promise<void> {
    this.data.delete(String(key));
    await this.saveToStorage();
  }

  async clear(): Promise<void> {
    this.data.clear();
    await this.saveToStorage();
  }

  where(indexName: string) {
    return {
      equalsIgnoreCase: (value: string) => {
        return {
          first: async (): Promise<T | undefined> => {
            const items = Array.from(this.data.values());
            const lowerVal = (value || '').toLowerCase();
            return items.find((item: any) => {
              const itemVal = item[indexName];
              return typeof itemVal === 'string' && itemVal.toLowerCase() === lowerVal;
            });
          }
        };
      },
      equals: (value: any) => {
        let filteredItems = Array.from(this.data.values()).filter((item: any) => {
          const itemVal = item[indexName];
          return itemVal === value;
        });

        const filterChain = {
          filter: (fn: (item: T) => boolean) => {
            filteredItems = filteredItems.filter(fn);
            return filterChain;
          },
          first: async (): Promise<T | undefined> => {
            return filteredItems[0];
          }
        };

        return filterChain;
      }
    };
  }
}

let useInMemoryBackup = false;

// Safe global sandbox listeners to proactively capture and suppress uncaught storage exceptions
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('unhandledrejection', (event) => {
      const msg = String(event.reason?.message || event.reason?.stack || event.reason || '').toLowerCase();
      if (
        msg.includes('security') || 
        msg.includes('database') || 
        msg.includes('indexeddb') || 
        msg.includes('sandbox') ||
        msg.includes('dexie')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    window.addEventListener('error', (event) => {
      const msg = String(event.message || event.error?.message || '').toLowerCase();
      if (
        msg.includes('security') || 
        msg.includes('database') || 
        msg.includes('indexeddb') || 
        msg.includes('sandbox') ||
        msg.includes('dexie')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  } catch (err) {
    // Ignore issues setting up global error listeners
  }
}

try {
  if (typeof window === 'undefined') {
    useInMemoryBackup = true;
  } else {
    let localStorageSupported = true;
    try {
      if (!window.localStorage) {
        localStorageSupported = false;
      } else {
        window.localStorage.setItem('__sandbox_probe_ls__', 'probe');
        window.localStorage.removeItem('__sandbox_probe_ls__');
      }
    } catch (err) {
      localStorageSupported = false;
    }

    let indexedDbSupported = true;
    try {
      if (!window.indexedDB) {
        indexedDbSupported = false;
      } else {
        const check = window.indexedDB.open('__sandbox_probe_db__', 1);
        check.onerror = () => {};
      }
    } catch (err) {
      indexedDbSupported = false;
    }

    if (!indexedDbSupported) {
      useInMemoryBackup = true;
    }
  }
} catch (e) {
  useInMemoryBackup = true;
}

const inMemoryTables: { [tableName: string]: InMemoryTable<any> } = {
  people: new InMemoryTable<Person>([], 'important_dates_fallback_people'),
  events: new InMemoryTable<Event>([], 'important_dates_fallback_events'),
  groups: new InMemoryTable<Group>([
    { id: 'g-fam', name: 'My Family', color: '#db2777', icon: 'Heart' },
    { id: 'g-friends', name: 'Friends', color: '#10b981', icon: 'UserGroup' },
    { id: 'g-work', name: 'Work', color: '#6366f1', icon: 'Briefcase' }
  ], 'important_dates_fallback_groups'),
  savedFilters: new InMemoryTable<SavedFilter>([], 'important_dates_fallback_filters'),
  widgets: new InMemoryTable<WidgetConfig>([], 'important_dates_fallback_widgets'),
  settings: new InMemoryTable<any>([], 'important_dates_fallback_settings')
};

// Pure in-memory standalone database structure that completely bypasses Dexie/IndexedDB calls when unsupported
class ImportantDatesInMemoryDatabase {
  people = inMemoryTables.people;
  events = inMemoryTables.events;
  groups = inMemoryTables.groups;
  savedFilters = inMemoryTables.savedFilters;
  widgets = inMemoryTables.widgets;
  settings = inMemoryTables.settings;

  async transaction(mode: any, tables: any, callback: any): Promise<any> {
    return callback();
  }

  async open(): Promise<any> {
    return this;
  }
}

export class ImportantDatesDatabase extends Dexie {
  constructor() {
    super('ImportantDatesDatabase');
    
    // Define database schema
    try {
      this.version(1).stores({
        people: 'id, firstName, lastName, displayName, dob, isFavorite, *groups, *tags, createdDate',
        events: 'id, eventName, eventType, originalDate, priority, *linkedPeopleIds, *groups, *tags, createdDate',
        groups: 'id, name, color, icon, parentId',
        savedFilters: 'id, name',
        widgets: 'id, title, style, sourceType',
        settings: 'key'
      });
    } catch (e) {
      console.warn('Dexie store setup failed, using in-memory mode:', e);
      useInMemoryBackup = true;
    }
  }

  get people(): Table<Person, string> {
    if (useInMemoryBackup) return inMemoryTables.people as any;
    try {
      return super.table('people') as any;
    } catch {
      useInMemoryBackup = true;
      return inMemoryTables.people as any;
    }
  }

  get events(): Table<Event, string> {
    if (useInMemoryBackup) return inMemoryTables.events as any;
    try {
      return super.table('events') as any;
    } catch {
      useInMemoryBackup = true;
      return inMemoryTables.events as any;
    }
  }

  get groups(): Table<Group, string> {
    if (useInMemoryBackup) return inMemoryTables.groups as any;
    try {
      return super.table('groups') as any;
    } catch {
      useInMemoryBackup = true;
      return inMemoryTables.groups as any;
    }
  }

  get savedFilters(): Table<SavedFilter, string> {
    if (useInMemoryBackup) return inMemoryTables.savedFilters as any;
    try {
      return super.table('savedFilters') as any;
    } catch {
      useInMemoryBackup = true;
      return inMemoryTables.savedFilters as any;
    }
  }

  get widgets(): Table<WidgetConfig, string> {
    if (useInMemoryBackup) return inMemoryTables.widgets as any;
    try {
      return super.table('widgets') as any;
    } catch {
      useInMemoryBackup = true;
      return inMemoryTables.widgets as any;
    }
  }

  get settings(): Table<{ key: string; value: any }, string> {
    if (useInMemoryBackup) return inMemoryTables.settings as any;
    try {
      return super.table('settings') as any;
    } catch {
      useInMemoryBackup = true;
      return inMemoryTables.settings as any;
    }
  }

  // @ts-ignore
  async transaction(mode: any, tables: any, callback: any): Promise<any> {
    if (useInMemoryBackup) {
      return callback();
    }
    try {
      return await super.transaction(mode, tables, callback);
    } catch (err) {
      console.warn('Transaction failed, falling back to in-memory mode', err);
      useInMemoryBackup = true;
      return callback();
    }
  }

  // @ts-ignore
  async open(): Promise<any> {
    if (useInMemoryBackup) return this;
    try {
      return await super.open();
    } catch (e) {
      console.warn('IndexedDB blocked or failed to open. Falling back to in-memory storage.', e);
      useInMemoryBackup = true;
      return this;
    }
  }
}

export let db: any;

try {
  if (useInMemoryBackup) {
    db = new ImportantDatesInMemoryDatabase();
  } else {
    db = new ImportantDatesDatabase();
  }
} catch (e) {
  console.warn('Failing over to standalone sandbox-compliant database mode:', e);
  db = new ImportantDatesInMemoryDatabase();
}

// Utility helper to request persistent storage
export async function checkAndRequestPersistence(): Promise<{
  granted: boolean;
  usage: number; // bytes
  quota: number; // bytes
}> {
  try {
    let granted = false;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persisted().catch(() => false);
      if (persisted) {
        granted = true;
      } else if (navigator.storage.persist) {
        granted = await navigator.storage.persist().catch(() => false);
      }
    }

    let usage = 0;
    let quota = 0;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate().catch(() => ({ usage: 0, quota: 0 }));
      usage = estimate.usage || 0;
      quota = estimate.quota || 0;
    }

    return { granted, usage, quota };
  } catch (e) {
    console.warn('Storage assessment failed due to secure sandbox boundary:', e);
    return { granted: false, usage: 0, quota: 0 };
  }
}

// Global hook/cache for URLs created from blobs to prevent memory leaks
const objectUrlMap = new Map<string, { url: string; blob: Blob }>();

export function getBlobUrl(id: string, blob: Blob | undefined): string | undefined {
  if (!blob) return undefined;
  
  const existing = objectUrlMap.get(id);
  if (existing && existing.blob === blob) {
    return existing.url;
  }
  
  if (existing) {
    URL.revokeObjectURL(existing.url);
  }
  
  const newUrl = URL.createObjectURL(blob);
  objectUrlMap.set(id, { url: newUrl, blob });
  return newUrl;
}

export function revokeBlobUrl(id: string) {
  const existing = objectUrlMap.get(id);
  if (existing) {
    URL.revokeObjectURL(existing.url);
    objectUrlMap.delete(id);
  }
}
