# Important to Me

A local-first important dates and people tracker.

## Overview

Important to Me helps you keep track of important people and life events in one private browser-based app. It supports birthdays, anniversaries, weddings, baptisms, graduations, adoptions, deaths, engagements, first meetings, job starts, moves, and custom events. You can store notes, groups, tags, custom fields, profile photos, event photos, exact elapsed time, upcoming anniversaries, countdowns, and local backup files.

## Key Features

- People profiles with names, birth dates, optional birth details, relationships, notes, groups, tags, custom fields, favorites, and cropped profile photos.
- Event tracking for recurring and one-time life events with linked people, photos, notes, groups, tags, priorities, and custom fields.
- Dashboard summaries for upcoming dates, favorites, and countdowns.
- Local backup and restore with full backups that include photos and lightweight backups without photos.
- Backup preview, merge or replace import modes, duplicate handling, and integrity validation.
- Widget payload export helpers for projects that wrap the app with native iOS WidgetKit integration.

## Privacy and Data Storage

Important to Me stores application data locally in this browser using IndexedDB. The app does not automatically sync data between devices. Clearing browser data, switching browsers, or browser storage eviction can delete local records.

Export regular backups and store them somewhere safe. Backup files can contain sensitive personal information, including names, dates, notes, custom fields, and photos. Local browser storage is not the same as application-level encryption, and backup integrity validation is not encryption. Backups are not encrypted by this app.

## Backup and Restore

- **Full backups** include people, events, groups, saved filters, widgets, profile photos, and event photos.
- **Lightweight backups** include records but skip photo blobs to keep files smaller.
- **Merge import** keeps existing records unless you choose to replace a duplicate.
- **Replace import** clears current local records before importing the backup.
- Older person-photo backup paths are still recognized for compatibility.

Store exported backups in a secure location you control, especially if they contain photos or private notes.

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

## Production Build

```bash
npm run build
```

The generated `dist/` directory can be hosted as static files.

## Testing

```bash
npm test
npm run check
```

The automated tests cover the repaired profile-photo editing flow, cropper form-safety checks, edit navigation, and backup photo compatibility at the source level.

## Project Structure

- `src/App.tsx` - top-level app state, navigation, settings, and database handlers.
- `src/components/` - screens and reusable UI components.
- `src/database/` - Dexie database setup and local storage resilience helpers.
- `src/features/backup/` - backup export, preview, validation, and import logic.
- `src/features/widgets/` - optional native widget payload export helpers.
- `src/date-engine/` - date, age, and anniversary calculations.
- `src/models/` - shared TypeScript models.
- `test/` - automated regression tests.

## Known Limitations

- Data is local to the current browser profile unless you export and import backups manually.
- There is no automatic cloud sync.
- Clearing browser data may erase records.
- Image support depends on browser support for JPEG, PNG, and WebP file decoding/canvas export.
- Native iOS widgets require additional wrapper/native integration; the web app alone cannot install WidgetKit home-screen widgets.

## Origin

The first version was prototyped with Google AI Studio. The project has since been normalized as a local-first React/Vite application without requiring Gemini or AI Studio services.
