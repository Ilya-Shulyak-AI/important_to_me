// Storage capability checks belong in the database layer.
//
// This module intentionally avoids replacing browser storage APIs or swallowing
// global errors. Overriding localStorage, sessionStorage, or IndexedDB can hide
// real failures and can make successfully stored data appear to disappear.

export interface StorageCapabilities {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
}

function canUseStorage(storage: Storage | undefined, probeKey: string): boolean {
  if (!storage) return false;

  try {
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function getStorageCapabilities(): StorageCapabilities {
  if (typeof window === 'undefined') {
    return {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
    };
  }

  let localStorage: Storage | undefined;
  let sessionStorage: Storage | undefined;

  try {
    localStorage = window.localStorage;
  } catch {
    localStorage = undefined;
  }

  try {
    sessionStorage = window.sessionStorage;
  } catch {
    sessionStorage = undefined;
  }

  return {
    localStorage: canUseStorage(localStorage, '__important_dates_ls_probe__'),
    sessionStorage: canUseStorage(sessionStorage, '__important_dates_ss_probe__'),
    indexedDB: typeof window.indexedDB !== 'undefined',
  };
}
