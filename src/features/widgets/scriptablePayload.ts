import { APP_NAME, CANONICAL_APP_URL } from '../../constants';
import type { Event, Group, Person } from '../../models/types';
import type { ScriptableWidgetExport, ScriptableWidgetPreferences } from './scriptableTypes';

export const DEFAULT_SCRIPTABLE_PREFERENCES: ScriptableWidgetPreferences = {
  mode: 'upcoming',
  maxItems: 5,
  accentStyle: 'olive',
};

const unique = (values: string[] = []) => Array.from(new Map(values.filter(Boolean).map(v => [v.toLocaleLowerCase(), v])).values());

export function buildScriptableWidgetExport(
  people: Person[],
  events: Event[],
  groups: Group[],
  preferences: Partial<ScriptableWidgetPreferences> = {},
  exportedAt = new Date().toISOString(),
): ScriptableWidgetExport {
  const prefs = { ...DEFAULT_SCRIPTABLE_PREFERENCES, ...preferences };
  return {
    schemaVersion: 1,
    appName: APP_NAME,
    appUrl: CANONICAL_APP_URL,
    exportedAt,
    preferences: {
      mode: prefs.mode,
      selectedPersonId: prefs.selectedPersonId || undefined,
      selectedGroupId: prefs.selectedGroupId || undefined,
      maxItems: Math.min(12, Math.max(1, Number(prefs.maxItems) || 5)),
      accentStyle: prefs.accentStyle || 'olive',
    },
    people: [...people]
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
      .map((p) => ({
        id: p.id,
        firstName: p.firstName,
        displayName: p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' '),
        dob: p.dob,
        dobPrecision: p.dobPrecision,
        isFavorite: Boolean(p.isFavorite),
        relationship: p.relationship || undefined,
        groupIds: unique(p.groups || []),
        tags: unique(p.tags || []),
      })),
    events: [...events]
      .sort((a, b) => a.eventName.localeCompare(b.eventName) || a.id.localeCompare(b.id))
      .map((event) => ({
        id: event.id,
        eventName: event.eventName,
        eventType: event.eventType,
        customEventType: event.customEventType || undefined,
        originalDate: event.originalDate,
        originalDatePrecision: event.originalDatePrecision,
        annualRecurrence: Boolean(event.annualRecurrence),
        linkedPeopleIds: unique(event.linkedPeopleIds || []),
        groupIds: unique(event.groups || []),
        tags: unique(event.tags || []),
        priority: event.priority || 'none',
      })),
    groups: [...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({ id: g.id, name: g.name })),
  };
}

export function serializeScriptableWidgetExport(data: ScriptableWidgetExport): string {
  return JSON.stringify(data, null, 2);
}

export function getWidgetParameter(preferences: ScriptableWidgetPreferences): string {
  if (preferences.mode === 'person' && preferences.selectedPersonId) return `person:${preferences.selectedPersonId}`;
  if (preferences.mode === 'group' && preferences.selectedGroupId) return `group:${preferences.selectedGroupId}`;
  return preferences.mode;
}
