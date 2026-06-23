export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface Person {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  profilePhoto?: Blob; // Stored as Blob in IndexedDB
  profilePhotoUrl?: string; // Revocable object URL for runtime rendering
  photoCrop?: {
    x: number; // percentage source x
    y: number; // percentage source y
    scale: number; // scale multiplier
  };
  dob: string; // YYYY-MM-DD or MM-DD or YYYY (we will parse and support precision)
  dobPrecision: 'full' | 'month-day' | 'year' | 'approximate';
  birthTime?: string; // HH:MM
  birthTimezone?: string;
  birthLocation?: string;
  sexOrGender?: string;
  hideSexOrGender?: boolean;
  relationship?: string;
  notes?: string;
  isFavorite: boolean;
  groups: string[]; // Group IDs
  tags: string[]; // Tag names
  customFields: CustomField[];
  createdDate: number;
  lastUpdatedDate: number;
}

export type EventType =
  | 'birthday'
  | 'wedding'
  | 'anniversary'
  | 'baptism'
  | 'graduation'
  | 'adoption'
  | 'death'
  | 'first_met'
  | 'engagement'
  | 'started_job'
  | 'moved'
  | 'custom';

export interface Event {
  id: string;
  eventName: string;
  eventType: EventType;
  customEventType?: string;
  originalDate: string; // YYYY-MM-DD or MM-DD or YYYY
  originalDatePrecision: 'full' | 'month-day' | 'year' | 'approximate';
  exactTime?: string; // HH:MM
  timezone?: string;
  location?: string;
  notes?: string;
  photo?: Blob;
  photoUrl?: string; // Revocable URL
  linkedPeopleIds: string[]; // Linked Person IDs
  annualRecurrence: boolean;
  customRecurrence?: string; // e.g., 'every-2-years'
  groups: string[]; // Group IDs
  tags: string[]; // Tag names
  priority: 'low' | 'medium' | 'high' | 'none';
  customFields: CustomField[];
  createdDate: number;
  lastUpdatedDate: number;
}

export interface Group {
  id: string;
  name: string;
  color: string; // Hex code or Tailwind color group name
  icon: string; // Name of Lucide icon
  parentId?: string; // Nested groups support
}

export interface SavedFilter {
  id: string;
  name: string;
  searchQuery?: string;
  peopleIds?: string[];
  eventTypes?: EventType[];
  groupIds?: string[];
  tags?: string[];
  isFavoriteOnly?: boolean;
}

export interface WidgetConfig {
  id: string;
  title: string;
  style: 'photo-countdown' | 'compact-name-age' | 'upcoming-list' | 'birthday-card' | 'anniversary-card' | 'timeline' | 'minimal-text' | 'large-photo' | 'multi-profile';
  sourceType: 'person' | 'multiple-people' | 'group' | 'tag' | 'event-type' | 'saved-filter' | 'upcoming' | 'smart-rotation';
  sourceId?: string; // Person ID, Group ID, etc.
  sourceIds?: string[]; // Multiple person IDs
  rotationFrequencyMinutes: number;
  priorityStrength: number; // 0 to 100
  upcomingWeight: number; // 0 to 100
  randomnessWeight: number; // 0 to 100
}
