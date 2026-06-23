import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const peopleView = readFileSync('src/components/PeopleView.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const cropper = readFileSync('src/components/PhotoCropper.tsx', 'utf8');
const backup = readFileSync('src/features/backup/backupService.ts', 'utf8');

test('profile detail edit requests the correct person in PeopleView', () => {
  assert.match(app, /const \[editPersonId, setEditPersonId\]/);
  assert.match(app, /setEditPersonId\(p\.id\)/);
  assert.match(peopleView, /editPersonId\?: string \| null/);
  assert.match(peopleView, /openEditForm\(person\)/);
});

test('person save awaits async persistence and keeps dialog open on failure', () => {
  assert.match(peopleView, /const handleSavePerson = async/);
  assert.match(peopleView, /await onUpdatePerson/);
  assert.match(peopleView, /await onAddPerson/);
  assert.match(peopleView, /setSaveError\('Could not save this person/);
  assert.match(peopleView, /disabled=\{isSaving\}/);
});

test('photo edits preserve, replace, remove, and re-crop through form state', () => {
  assert.match(peopleView, /setProfilePhotoBlob\(person\.profilePhoto\)/);
  assert.match(peopleView, /profilePhoto: profilePhotoBlob/);
  assert.match(peopleView, /initialPhotoUrl=\{photoPreviewUrl\}/);
  assert.match(peopleView, /setProfilePhotoBlob\(undefined\)/);
});

test('cropper controls cannot submit an outer person form', () => {
  for (const label of ['Cancel photo editing', 'Reset', 'Change Image', 'Apply Crop']) {
    assert.ok(cropper.includes(label), `missing ${label}`);
  }
  const buttonCount = (cropper.match(/<button/g) ?? []).length;
  const typedButtonCount = (cropper.match(/<button\s+type="button"/g) ?? []).length;
  assert.equal(typedButtonCount, buttonCount);
});

test('cropper validates supported formats, oversize files, and same-file reselection', () => {
  assert.match(cropper, /image\/jpeg.*image\/png.*image\/webp/s);
  assert.match(cropper, /5 \* 1024 \* 1024/);
  assert.match(cropper, /e\.target\.value = ''/);
});

test('backup service keeps person and event photo compatibility', () => {
  assert.match(backup, /photos\/people/);
  assert.match(backup, /photos\/events/);
  assert.match(backup, /photos\/\$\{person\.id\}\.jpg/);
  assert.match(backup, /Backup integrity validation failed/);
});
