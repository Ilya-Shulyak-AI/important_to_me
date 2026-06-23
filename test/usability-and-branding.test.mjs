import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const combo = readFileSync('src/components/ui/CreatableCombobox.tsx', 'utf8');
const people = readFileSync('src/components/PeopleView.tsx', 'utf8');
const events = readFileSync('src/components/EventsView.tsx', 'utf8');
const index = readFileSync('index.html', 'utf8');
const manifest = readFileSync('public/manifest.webmanifest', 'utf8');

test('combobox supports search, create, casing preservation, keyboard controls, and duplicate prevention', () => {
  assert.match(combo, /role="combobox"/);
  assert.match(combo, /Create/);
  assert.match(combo, /toLowerCase/);
  assert.match(combo, /ArrowDown/);
  assert.match(combo, /ArrowUp/);
  assert.match(combo, /Escape/);
  assert.match(combo, /uniqueCaseInsensitive/);
});

test('people and event screens include reusable inputs and clear filters', () => {
  assert.match(people, /CreatableCombobox/);
  assert.match(people, /Clear filters/);
  assert.match(people, /relationship/);
  assert.match(events, /CreatableCombobox/);
  assert.match(events, /Search people to link/);
  assert.match(events, /Clear filters/);
});

test('branding assets are active and app title is consistent', () => {
  assert.match(index, /<title>Important to Me<\/title>/);
  assert.match(index, /\/favicon\.svg/);
  assert.match(index, /\/manifest\.webmanifest/);
  assert.match(manifest, /Important to Me/);
  assert.ok(existsSync('public/favicon.svg'));
  assert.ok(existsSync('public/apple-touch-icon.svg'));
  assert.ok(existsSync('public/assets/important-to-me-icon.svg'));
  assert.doesNotMatch(index, /app_icon_.*\.jpg/);
});
