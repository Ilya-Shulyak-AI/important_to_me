# Important to Me

[Open Important to Me](https://ai.studio/apps/c3dda66e-fc84-4a5f-8ccd-33292b78197b)

Important to Me is a local-first browser app for remembering important people, birthdays, anniversaries, milestones, groups, notes, and backups.

## Features

- People profiles with names, dates, relationships, groups, tags, custom fields, favorites, notes, and optional cropped profile photos.
- Event tracking for recurring and one-time milestones with linked people, location, tags, groups, priority, notes, and optional photos.
- Dashboard summaries for upcoming birthdays and events.
- Search, filtering, reusable dropdown suggestions, and clear filter controls for larger lists.
- Local backup and restore with full backups, lightweight backups, preview, merge/replace import, duplicate handling, and compatibility with older photo backup paths.
- iPhone Home Screen widgets through Scriptable without accounts, an app server, Xcode, or an Apple developer account.

## Local-First Storage

Important to Me stores application data locally in this browser using IndexedDB. It does not add accounts, subscriptions, advertising, analytics, a cloud database, or an unnecessary backend. Data does not automatically sync between devices. Clearing browser data, switching browsers, or browser storage eviction can delete local records.

## Backup and Restore

- **Full backups** include people, events, groups, saved filters, widgets, profile photos, and event photos.
- **Lightweight backups** include records but skip photo blobs to keep files smaller.
- **Merge import** keeps existing records unless you choose to replace a duplicate.
- **Replace import** clears current local records before importing the backup.
- Older person-photo backup paths are still recognized for compatibility.

Store exported backups somewhere safe. Backup files can contain sensitive names, dates, notes, custom fields, and photos. Backups are not encrypted by this app.

## iPhone Widgets

Important to Me can display upcoming birthdays and events on your iPhone Home Screen through the free Scriptable app.

1. Install Scriptable from the [App Store](https://apps.apple.com/us/app/scriptable/id1405459188).
2. Open Important to Me and go to **iPhone Widgets**.
3. Tap **Copy Widget Script** and paste it into Scriptable.
4. Choose what the widget should show, then tap **Copy Widget Data**.
5. Run the Scriptable script and import the data.
6. Add a Scriptable widget to your Home Screen and select the `Important to Me` script.

See the complete step-by-step guide: [Set Up iPhone Widgets](docs/SCRIPTABLE_WIDGET_SETUP.md).

Widget data is exported manually. The script recalculates countdowns from stored dates, but you need to re-export/import when people, events, groups, or widget preferences change. iOS controls the exact Home Screen widget refresh schedule.

## Widget Privacy

The widget export is created locally and is not uploaded by Important to Me. Scriptable stores imported data locally by default. The export includes names and dates needed for the widget and intentionally excludes notes, photos, custom private fields, and birth locations. Anyone with access to the unlocked phone or exported JSON file may be able to read it; this is not encryption. Delete downloaded widget-data files you no longer need.

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Dexie and IndexedDB
- JSZip for backup packages
- Lucide React icons

The app is a static Vite application and does not require a backend or Gemini API key.

## Local Development

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:3000`.

## Available Scripts

- `npm run dev` - start the Vite development server.
- `npm run build` - create a production build in `dist/`.
- `npm run preview` - preview the production build locally.
- `npm run lint` - run TypeScript validation with `tsc --noEmit`.
- `npm run check` - run TypeScript validation and a production build.
- `npm test` - run automated regression tests.
- `npm run clean` - remove generated build/server artifacts.

## Testing

```bash
npm test
npm run lint
npm run build
npm run check
npm audit
```

Automated tests cover backup/photo compatibility, Scriptable widget export privacy and sorting, Scriptable source safety, reusable dropdown behavior, search/filter source behavior, and active branding assets.

## Known Limitations

- Data is local to the current browser profile unless you export and import backups manually.
- There is no automatic cloud sync.
- Clearing browser data may erase records.
- Image support depends on browser support for JPEG, PNG, and WebP file decoding/canvas export.
- iPhone widgets depend on Scriptable and manual data transfer after app changes.
- iOS may delay widget refreshes.
- Widget photos are intentionally not exported by default.

## Origin

The first version was prototyped with Google AI Studio. The project has since been normalized as a local-first React/Vite application without requiring Gemini or AI Studio services.
