// sandbox-shield.ts
// This module runs first in the import chain to shield against SecurityErrors
// thrown by restricted iframe sandboxes when accessing window storage APIs (IndexedDB, LocalStorage, SessionStorage).

if (typeof window !== 'undefined') {
  // 1. Instantly register global error and rejection listeners to swallow security rejections
  try {
    window.addEventListener('unhandledrejection', (event) => {
      const msg = String(event.reason?.message || event.reason?.stack || event.reason || '').toLowerCase();
      if (
        msg.includes('security') || 
        msg.includes('database') || 
        msg.includes('indexeddb') || 
        msg.includes('sandbox') ||
        msg.includes('dexie') ||
        msg.includes('access is denied') ||
        msg.includes('script error')
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
        msg.includes('dexie') ||
        msg.includes('access is denied') ||
        msg.includes('script error')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  } catch (err) {}

  // 2. Helper to safely redefine properties on window / globalThis / prototypes
  const safeDefine = (obj: any, prop: string, value: any) => {
    if (!obj) return;
    try {
      Object.defineProperty(obj, prop, {
        get: () => value,
        set: () => {},
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto) {
          Object.defineProperty(proto, prop, {
            get: () => value,
            set: () => {},
            configurable: true,
            enumerable: true
          });
        }
      } catch (err) {}
    }
  };

  let shouldDisableIndexedDB = false;
  
  // We do NOT disable IndexedDB pre-emptively just because we are in an iframe.
  // We will instead evaluate if actual sandbox storage APIs work via execution checks below.

  // 3. Check if localStorage and sessionStorage are blocked
  let lsBlocked = false;
  try {
    const test = window.localStorage;
    if (!test) {
      lsBlocked = true;
    } else {
      window.localStorage.setItem('__sandbox_test_ls__', '1');
      window.localStorage.removeItem('__sandbox_test_ls__');
    }
  } catch (e) {
    lsBlocked = true;
  }

  let ssBlocked = false;
  try {
    const test = window.sessionStorage;
    if (!test) {
      ssBlocked = true;
    } else {
      window.sessionStorage.setItem('__sandbox_test_ss__', '1');
      window.sessionStorage.removeItem('__sandbox_test_ss__');
    }
  } catch (e) {
    ssBlocked = true;
  }

  if (shouldDisableIndexedDB || lsBlocked || ssBlocked) {
    shouldDisableIndexedDB = true; // Cascade to block IndexedDB as well if local storage is restricted
    
    // Create fully isolated mock state stores
    const createMockStore = () => {
      const store: Record<string, string> = {};
      return {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => { store[key] = String(value); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { for (const k in store) { delete store[k]; } },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() { return Object.keys(store).length; }
      };
    };

    const lsMock = createMockStore();
    const ssMock = createMockStore();

    // Redefine across every potential property scope to ensure absolute coverage
    try {
      safeDefine(window, 'localStorage', lsMock);
      safeDefine(globalThis, 'localStorage', lsMock);
    } catch (e) {}

    try {
      safeDefine(window, 'sessionStorage', ssMock);
      safeDefine(globalThis, 'sessionStorage', ssMock);
    } catch (e) {}

    try {
      if (typeof Window !== 'undefined' && Window.prototype) {
        safeDefine(Window.prototype, 'localStorage', lsMock);
        safeDefine(Window.prototype, 'sessionStorage', ssMock);
      }
    } catch (e) {}
  }

  // 4. Proactively test and/or mock indexedDB
  if (!shouldDisableIndexedDB) {
    try {
      if (!window.indexedDB) {
        shouldDisableIndexedDB = true;
      } else {
        const check = window.indexedDB.open('__sandbox_probe_db__', 1);
        check.onerror = () => {};
      }
    } catch (err) {
      shouldDisableIndexedDB = true;
    }
  }

  if (shouldDisableIndexedDB) {
    try {
      safeDefine(window, 'indexedDB', undefined);
      safeDefine(globalThis, 'indexedDB', undefined);
    } catch (e) {}

    try {
      if (typeof Window !== 'undefined' && Window.prototype) {
        safeDefine(Window.prototype, 'indexedDB', undefined);
      }
    } catch (e) {}
  }
}
