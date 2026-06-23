import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const payloadSource = readFileSync('src/features/widgets/scriptablePayload.ts', 'utf8');
const scriptSource = readFileSync('public/scriptable/important-to-me-widget.js', 'utf8');
const widgetScreen = readFileSync('src/components/WidgetSystemView.tsx', 'utf8');

test('Scriptable export schema is versioned and excludes private fields', () => {
  assert.match(payloadSource, /schemaVersion: 1/);
  assert.match(payloadSource, /appName: APP_NAME/);
  assert.doesNotMatch(payloadSource, /notes:/);
  assert.doesNotMatch(payloadSource, /profilePhoto:/);
  assert.doesNotMatch(payloadSource, /birthLocation:/);
  assert.doesNotMatch(payloadSource, /customFields:/);
});

test('Scriptable source uses Scriptable APIs and no browser-only APIs', () => {
  for (const token of ['ListWidget', 'Script.setWidget', 'Script.complete', 'config.runsInApp', 'config.runsInWidget', 'config.widgetFamily', 'DocumentPicker.openFile', 'FileManager.local']) {
    assert.match(scriptSource, new RegExp(token.replace('.', '\\.')));
  }
  for (const forbidden of ['document', 'window', 'localStorage', 'indexedDB']) {
    assert.doesNotMatch(scriptSource, new RegExp(`\\b${forbidden}\\b`));
  }
  assert.match(scriptSource, /person:/);
  assert.match(scriptSource, /group:/);
  assert.match(scriptSource, /February 29|month===2&&day===29|isLeapYear/);
});

test('copied and downloadable Scriptable script share the same canonical implementation', () => {
  const ts = readFileSync('src/features/widgets/scriptableWidgetSource.ts', 'utf8');
  assert.match(ts, /SCRIPTABLE_WIDGET_SOURCE/);
  assert.match(ts, /Important to Me - Scriptable iPhone widget/);
  assert.equal((ts.match(/Important to Me - Scriptable iPhone widget/g) || []).length, 1);
});

test('widget screen exposes real setup, data, script, and parameter actions', () => {
  for (const label of ['Copy Widget Script', 'Download Widget Script', 'Copy Widget Data', 'Download Widget Data', 'Copy Parameter', 'Import or Update from Clipboard']) {
    assert.match(widgetScreen, new RegExp(label));
  }
  assert.match(widgetScreen, /iPhone Widgets/);
  assert.doesNotMatch(widgetScreen, /SwiftUI Widget Timeline code|Xcode WidgetKit Compile instructions|Urgency countdown buffer|Favorite Spotlight weight/);
});
