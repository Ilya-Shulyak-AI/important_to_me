export type ScriptableWidgetMode = 'upcoming' | 'birthdays' | 'events' | 'favorites' | 'person' | 'group';
export type ScriptableAccentStyle = 'olive' | 'bronze' | 'charcoal';

export interface ScriptableWidgetPreferences {
  mode: ScriptableWidgetMode;
  selectedPersonId?: string;
  selectedGroupId?: string;
  maxItems: number;
  accentStyle: ScriptableAccentStyle;
}

export interface ScriptableWidgetPerson {
  id: string;
  firstName: string;
  displayName: string;
  dob: string;
  dobPrecision: string;
  isFavorite: boolean;
  relationship?: string;
  groupIds: string[];
  tags: string[];
}

export interface ScriptableWidgetEvent {
  id: string;
  eventName: string;
  eventType: string;
  customEventType?: string;
  originalDate: string;
  originalDatePrecision: string;
  annualRecurrence: boolean;
  linkedPeopleIds: string[];
  groupIds: string[];
  tags: string[];
  priority: string;
}

export interface ScriptableWidgetGroup { id: string; name: string; }

export interface ScriptableWidgetExport {
  schemaVersion: 1;
  appName: 'Important to Me';
  appUrl: string;
  exportedAt: string;
  preferences: ScriptableWidgetPreferences;
  people: ScriptableWidgetPerson[];
  events: ScriptableWidgetEvent[];
  groups: ScriptableWidgetGroup[];
}
