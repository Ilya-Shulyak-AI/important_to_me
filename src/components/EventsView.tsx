import React, { useState, useId, useEffect } from 'react';
import { 
  Plus, Calendar, MapPin, Eye, Clock, SlidersHorizontal, Trash2, 
  UserPlus, Compass, CalendarCheck, HelpCircle, AlignLeft, Info, Edit, Heart, X, Search, Star, Camera, Image as ImageIcon
} from 'lucide-react';
import { calculateNextAnniversary, formatDateLabel, getOriginalDayOfWeek, calculateExactAge } from '../date-engine/engine';
import type { Person, Event, Group, EventType, CustomField } from '../models/types';
import PhotoCropper from './PhotoCropper';
import { getBlobUrl } from '../database/db';

interface EventsViewProps {
  events: Event[];
  people: Person[];
  groups: Group[];
  onAddEvent: (event: Omit<Event, 'createdDate' | 'lastUpdatedDate'>) => void;
  onUpdateEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onNavigateToEvent: (id: string) => void;
}

const EVENT_TYPES_LIST: Array<{ value: EventType; label: string }> = [
  { value: 'birthday', label: 'Birthday 🎂' },
  { value: 'wedding', label: 'Wedding 💍' },
  { value: 'anniversary', label: 'Anniversary ❤️' },
  { value: 'baptism', label: 'Baptism ⛪' },
  { value: 'graduation', label: 'Graduation 🎓' },
  { value: 'adoption', label: 'Adoption 👶' },
  { value: 'death', label: 'Death 🕯️' },
  { value: 'first_met', label: 'First Meeting 🤝' },
  { value: 'engagement', label: 'Engagement 💎' },
  { value: 'started_job', label: 'Started Job 💼' },
  { value: 'moved', label: 'Moved House 🏠' },
  { value: 'custom', label: 'Custom Life Event ✨' }
];

export default function EventsView({
  events,
  people,
  groups,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onNavigateToEvent
}: EventsViewProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'days-remaining' | 'chronological' | 'priority'>('days-remaining');

  // Dialog additions
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Event form states
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<EventType>('anniversary');
  const [customEventType, setCustomEventType] = useState('');
  const [originalDate, setOriginalDate] = useState('');
  const [originalDatePrecision, setOriginalDatePrecision] = useState<'full' | 'month-day' | 'year'>('full');
  const [exactTime, setExactTime] = useState('');
  const [timezone, setTimezone] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedPeopleIds, setLinkedPeopleIds] = useState<string[]>([]);
  const [annualRecurrence, setAnnualRecurrence] = useState(true);
  const [customRecurrence, setCustomRecurrence] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'none'>('none');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Photo state
  const [eventPhotoBlob, setEventPhotoBlob] = useState<Blob | undefined>(undefined);
  const [eventPhotoUrl, setEventPhotoUrl] = useState<string | undefined>(undefined);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  useEffect(() => {
    if (eventPhotoBlob) {
      const url = URL.createObjectURL(eventPhotoBlob);
      setEventPhotoUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setEventPhotoUrl(undefined);
    }
  }, [eventPhotoBlob]);

  // Helpers
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [tagInput, setTagInput] = useState('');

  const searchInputId = useId();
  const typeFilterId = useId();
  const personFilterId = useId();
  const sortSelectId = useId();

  const openAddForm = () => {
    setEditingEvent(null);
    setEventName('');
    setEventType('anniversary');
    setCustomEventType('');
    setOriginalDate('');
    setOriginalDatePrecision('full');
    setExactTime('');
    setTimezone('');
    setLocation('');
    setNotes('');
    setLinkedPeopleIds([]);
    setAnnualRecurrence(true);
    setCustomRecurrence('');
    setSelectedGroups([]);
    setSelectedTags([]);
    setPriority('none');
    setCustomFields([]);
    setEventPhotoBlob(undefined);
    setIsFormOpen(true);
  };

  const openEditForm = (event: Event) => {
    setEditingEvent(event);
    setEventName(event.eventName);
    setEventType(event.eventType);
    setCustomEventType(event.customEventType || '');
    setOriginalDate(event.originalDate);
    setOriginalDatePrecision(event.originalDatePrecision as any);
    setExactTime(event.exactTime || '');
    setTimezone(event.timezone || '');
    setLocation(event.location || '');
    setNotes(event.notes || '');
    setLinkedPeopleIds(event.linkedPeopleIds);
    setAnnualRecurrence(event.annualRecurrence);
    setCustomRecurrence(event.customRecurrence || '');
    setSelectedGroups(event.groups);
    setSelectedTags(event.tags);
    setPriority(event.priority);
    setCustomFields(event.customFields);
    setEventPhotoBlob(event.photo);
    setIsFormOpen(true);
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;
    setCustomFields(prev => [
      ...prev,
      { id: `cf-e-${Date.now()}`, label: newFieldLabel.trim(), value: newFieldValue.trim() }
    ]);
    setNewFieldLabel('');
    setNewFieldValue('');
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed]);
      setTagInput('');
    }
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !originalDate) return;

    const eventPayload = {
      id: editingEvent ? editingEvent.id : `e-${Date.now()}`,
      eventName: eventName.trim(),
      eventType,
      customEventType: eventType === 'custom' ? customEventType.trim() : undefined,
      originalDate,
      originalDatePrecision,
      exactTime: exactTime || undefined,
      timezone: timezone || undefined,
      location: location || undefined,
      notes: notes || undefined,
      linkedPeopleIds,
      annualRecurrence,
      customRecurrence: customRecurrence || undefined,
      groups: selectedGroups,
      tags: selectedTags,
      priority,
      customFields,
      photo: eventPhotoBlob,
    };

    if (editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        ...eventPayload,
        lastUpdatedDate: Date.now()
      });
    } else {
      onAddEvent(eventPayload);
    }

    setIsFormOpen(false);
  };

  const handleToggleLinkPerson = (personId: string) => {
    if (linkedPeopleIds.includes(personId)) {
      setLinkedPeopleIds(prev => prev.filter(id => id !== personId));
    } else {
      setLinkedPeopleIds(prev => [...prev, personId]);
    }
  };

  // Compile calendar calculations for display lists
  const now = new Date();
  
  const processedEvents = events.map(event => {
    const nextAnniv = calculateNextAnniversary(event.originalDate, now);
    return { event, nextAnniv };
  });

  // Filter list
  const filtered = processedEvents.filter(({ event }) => {
    const q = searchQuery.toLowerCase();
    const nameMatches = event.eventName.toLowerCase().includes(q) || event.notes?.toLowerCase().includes(q);
    const matchesType = selectedEventType === 'all' || event.eventType === selectedEventType;
    const matchesPerson = selectedPersonFilter === 'all' || event.linkedPeopleIds.includes(selectedPersonFilter);
    return nameMatches && matchesType && matchesPerson;
  });

  // Sort lists
  filtered.sort((a, b) => {
    if (sortBy === 'days-remaining') {
      return a.nextAnniv.daysOnlyRemaining - b.nextAnniv.daysOnlyRemaining;
    }
    if (sortBy === 'chronological') {
      return new Date(a.event.originalDate).getTime() - new Date(b.event.originalDate).getTime();
    }
    if (sortBy === 'priority') {
      const priorityWeights = { high: 3, medium: 2, low: 1, none: 0 };
      return priorityWeights[b.event.priority] - priorityWeights[a.event.priority];
    }
    return 0;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Search Header Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif font-bold italic text-[#5A5A40] tracking-tight">Events Tracker</h2>
          <p className="text-[#7A7A7A] text-sm">Chronicle weddings, graduations, family milestones, and adoptions.</p>
        </div>
        <button 
          onClick={openAddForm}
          className="flex items-center gap-1 bg-[#5A5A40] hover:bg-opacity-95 text-white py-2.5 px-4 rounded-2xl text-sm font-semibold transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Log New Milestone
        </button>
      </div>

      {/* Directory filters line */}
      <div className="bg-white border border-[#E5E0D8] p-4 rounded-[24px] flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-[#8C8C8C] w-4 h-4" />
          <input 
            id={searchInputId}
            type="text"
            placeholder="Search milestones, venues, custom notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E5E0D8] rounded-xl pl-9 pr-4 py-2 text-[#2D2D2D] placeholder-[#8C8C8C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
          <div className="flex items-center gap-1.5 min-w-[120px]">
            <label htmlFor={typeFilterId} className="sr-only">Type</label>
            <select
              id={typeFilterId}
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="bg-white border border-[#E5E0D8] text-[#2D2D2D] py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none w-full"
            >
              <option value="all">All Types</option>
              {EVENT_TYPES_LIST.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 min-w-[120px]">
            <label htmlFor={personFilterId} className="sr-only">Linked Person</label>
            <select
              id={personFilterId}
              value={selectedPersonFilter}
              onChange={(e) => setSelectedPersonFilter(e.target.value)}
              className="bg-white border border-[#E5E0D8] text-[#2D2D2D] py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none w-full"
            >
              <option value="all">All Linked People</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 min-w-[120px]">
            <label htmlFor={sortSelectId} className="sr-only">Sort By</label>
            <select
              id={sortSelectId}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-[#E5E0D8] text-[#2D2D2D] py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none w-full"
            >
              <option value="days-remaining">Closest Countdown</option>
              <option value="chronological">History Date</option>
              <option value="priority">Priority Level</option>
            </select>
          </div>

          <div className="flex bg-[#F5F2ED] p-1 rounded-xl border border-[#E5E0D8] h-9 shrink-0">
            <button 
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-lg text-xs font-bold transition uppercase tracking-wider px-2.5 cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-[#8C8C8C]'
              }`}
            >
              Timeline
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition uppercase tracking-wider px-2.5 cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-[#8C8C8C]'
              }`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Elements list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-12 text-center text-[#7A7A7A] max-w-lg mx-auto space-y-3 shadow-sm">
          <Info className="w-12 h-12 text-[#8C6A5D] opacity-60 mx-auto" />
          <h4 className="text-[#2D2D2D] font-serif font-bold italic text-lg">No recorded milestones detected</h4>
          <p className="text-xs">Select other event parameters or click the 'Log New Milestone' button to seed details.</p>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="relative border-l-2 border-[#E5E0D8] ml-4 pl-6 space-y-8 py-2">
          {filtered.map(({ event, nextAnniv }) => {
            const daysLeft = nextAnniv.daysOnlyRemaining;
            const weekday = getOriginalDayOfWeek(event.originalDate);
            return (
              <div key={event.id} className="relative group">
                {/* Node symbol marker */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#5A5A40] group-hover:bg-[#5A5A40] transition" />
                
                <div 
                  onClick={() => onNavigateToEvent(event.id)}
                  className="bg-white border border-[#E5E0D8] hover:border-[#8C6A5D]/50 p-5 rounded-[24px] cursor-pointer transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 w-full">
                    {event.photo && (
                      <img 
                        src={getBlobUrl(event.id, event.photo)} 
                        alt="" 
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E5E0D8]" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider bg-[#5A5A40]/10 text-[#5A5A40] px-2.5 py-0.5 rounded font-bold border border-[#5A5A40]/20">
                          {event.eventType}
                        </span>
                        <h3 className="text-base font-serif font-bold italic text-[#2D2D2D] group-hover:text-[#5A5A40] transition truncate">
                          {event.eventName}
                        </h3>
                        {event.priority === 'high' && (
                          <span className="text-[9px] bg-[#8C6A5D]/10 text-[#8C6A5D] font-bold px-1.5 py-0.5 rounded border border-[#8C6A5D]/20">
                            HIGH PRIORITY
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-[#7A7A7A]">
                        Original date: <span className="text-[#2D2D2D] font-semibold">{formatDateLabel(event.originalDate, 'full')}</span> ({weekday})
                      </p>

                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-[#7A7A7A]">
                          <MapPin className="w-3.5 h-3.5 text-[#8C6A5D]" />
                          <span>Venue: {event.location}</span>
                        </div>
                      )}

                      {/* Linked people inline avatar row */}
                      {event.linkedPeopleIds.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-[#7A7A7A]">Linked to:</span>
                           <div className="flex flex-wrap gap-1">
                            {event.linkedPeopleIds.map(pId => {
                              const p = people.find(item => item.id === pId);
                              if (!p) return null;
                              return (
                                <span key={pId} className="text-[10px] bg-[#F5F2ED] px-2 py-0.5 border border-[#E5E0D8] text-[#5A5A40] rounded font-bold">
                                  {p.displayName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end gap-2 shrink-0 w-full md:w-auto border-t md:border-t-0 border-[#E5E0D8] pt-3 md:pt-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#8C6A5D]">
                        {daysLeft === 0 ? 'Today 🎉' : `In ${daysLeft} days`}
                      </div>
                      <div className="text-[10px] text-[#7A7A7A]">
                        Date: {nextAnniv.dateStr}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditForm(event); }}
                      className="ml-auto md:ml-0 text-xs px-2.5 py-1.5 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 rounded-xl border border-[#E5E0D8] text-[#5A5A40] transition font-bold cursor-pointer"
                    >
                      Edit Link
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Event grid display cards format */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(({ event, nextAnniv }) => (
            <div 
              key={event.id}
              onClick={() => onNavigateToEvent(event.id)}
              className="bg-white border border-[#E5E0D8] p-5 rounded-[24px] hover:border-[#8C6A5D]/50 transition cursor-pointer flex flex-col justify-between space-y-4 shadow-sm overflow-hidden"
            >
              {event.photo && (
                <div className="-mx-5 -mt-5 mb-2 h-32 overflow-hidden border-b border-[#E5E0D8]">
                  <img 
                    src={getBlobUrl(event.id, event.photo)} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#5A5A40] tracking-wider">
                    {event.eventType}
                  </span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditForm(event); }}
                      className="p-1.5 px-2.5 bg-[#F5F2ED] text-[#5A5A40] font-bold border border-[#E5E0D8] hover:bg-opacity-80 rounded-lg text-xs cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <h3 className="font-serif font-bold italic text-[#2D2D2D] text-base mt-2">{event.eventName}</h3>
                <p className="text-xs text-[#7A7A7A] mt-1">Happened {formatDateLabel(event.originalDate, 'full')}</p>
                {event.notes && <p className="text-xs text-[#7A7A7A] mt-2 line-clamp-2">{event.notes}</p>}
              </div>

              <div className="bg-[#F5F2ED]/40 p-3 rounded-xl border border-[#E5E0D8] space-y-1">
                <span className="text-xs text-[#2D2D2D] block font-semibold">Anniversary Countdown:</span>
                <span className="text-xs font-bold text-[#8C6A5D] block">
                  Celebrated {nextAnniv.daysOnlyRemaining === 0 ? 'Today 🎉!' : `in ${nextAnniv.daysOnlyRemaining} Days`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Log milestones Form */}
      {isFormOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E0D8] rounded-[32px] w-full max-w-2xl text-[#2D2D2D] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-[#E5E0D8] flex justify-between items-center bg-[#F9F8F6]/85">
              <h3 className="text-lg font-serif font-bold italic text-[#5A5A40]">
                {editingEvent ? 'Modify Milestone Details' : 'Log New Milestone Event'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-[#E5E0D8]/40 text-[#8C8C8C] rounded-full hover:text-[#2D2D2D] transition cursor-pointer"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-3 border-b border-[#E5E0D8] pb-5">
                <div className="relative">
                  {eventPhotoBlob && eventPhotoUrl ? (
                    <img 
                      src={eventPhotoUrl} 
                      alt="Event preview" 
                      className="w-40 h-24 rounded-2xl object-cover border-4 border-[#5A5A40]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-40 h-24 rounded-2xl bg-[#F5F2ED] flex items-center justify-center border-4 border-[#E5E0D8] text-[#8C8C8C]">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => setIsCropperOpen(true)}
                    className="absolute bottom-1 right-1 p-1.5 bg-[#5A5A40] text-white rounded-full shadow-md text-xs cursor-pointer border-0"
                    aria-label="Upload event photo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setIsCropperOpen(true)}
                      className="text-xs text-[#5A5A40] hover:underline font-semibold cursor-pointer border-0 bg-transparent"
                    >
                      {eventPhotoBlob ? 'Re-crop event photo' : 'Upload & Crop Photo'}
                    </button>
                    {eventPhotoBlob && (
                      <>
                        <span className="text-[#8C8C8C] text-xs">•</span>
                        <button 
                          type="button" 
                          onClick={() => setEventPhotoBlob(undefined)}
                          className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer border-0 bg-transparent"
                        >
                          Remove Photo
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8C8C8C] mt-0.5 font-sans animate-fade-in">Upload an anniversary image, banner or milestone memory offline.</p>
                </div>
              </div>

              {/* Photo Cropper Nested Dialog Overlay */}
              {isCropperOpen && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
                  <PhotoCropper 
                    onPhotoSelected={(blob) => {
                      setEventPhotoBlob(blob);
                      setIsCropperOpen(false);
                    }}
                    onCancel={() => setIsCropperOpen(false)}
                  />
                </div>
              )}

              {/* Event descriptors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Milestone Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Grandma's Wedding Anniversary"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Milestone Category</label>
                  <select 
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    {EVENT_TYPES_LIST.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {eventType === 'custom' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Custom Event Type Name</label>
                  <input 
                    type="text" 
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value)}
                    placeholder="e.g. First Steps, Baptism, Family reunion"
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              )}

              {/* Dates & Time parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Original History Date *</label>
                  <input 
                    type="date" 
                    required
                    value={originalDate}
                    onChange={(e) => setOriginalDate(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Time of Day (Optional)</label>
                  <input 
                    type="time" 
                    value={exactTime}
                    onChange={(e) => setExactTime(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Priority Urgency Indicator</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    <option value="none">Normal / No Priority Badge</option>
                    <option value="low">Low priority indicator</option>
                    <option value="medium">Medium priority scale</option>
                    <option value="high">High priority warning</option>
                  </select>
                </div>
              </div>

              {/* Venue details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Physical Location / Venue Coordinates</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sacramento Municipal Cathedral, California"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Timezone Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. America/Los_Angeles"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>

              {/* Linked People Multi check checkboxes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-2 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-[#5A5A40]" /> Link and associate with People *
                </label>
                {people.length === 0 ? (
                  <p className="text-xs text-[#8C8C8C] italic">No bios available. Add people first to associate this milestone with them.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#F5F2ED]/40 p-4 rounded-xl border border-[#E5E0D8]">
                    {people.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-xs text-[#2D2D2D] font-bold">
                        <input 
                          type="checkbox"
                          checked={linkedPeopleIds.includes(p.id)}
                          onChange={() => handleToggleLinkPerson(p.id)}
                          className="rounded border-[#E5E0D8] accent-[#5A5A40]"
                        />
                        <span>{p.displayName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Recurrence Settings Toggle */}
              <div className="flex items-center justify-between bg-[#F5F2ED]/40 p-4 rounded-xl border border-[#E5E0D8]">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D2D2D]">Celebrate and Recur Annually</h4>
                  <p className="text-[10px] text-[#7A7A7A]">Uncheck if this event represents a unique, one-time life bookmark (e.g. baptism).</p>
                </div>
                <input 
                  type="checkbox"
                  checked={annualRecurrence}
                  onChange={(e) => setAnnualRecurrence(e.target.checked)}
                  className="w-5 h-5 rounded border-[#E5E0D8] accent-[#5A5A40]"
                />
              </div>

              {/* Custom Fields (unlimited) */}
              <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A7A7A]">Log unlimited custom variables</h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Field Name (e.g. Ceremony Minister)"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D] focus:outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="Details Value..."
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2D2D] focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddCustomField}
                    className="py-1.5 px-3 bg-[#8C6A5D] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Insert
                  </button>
                </div>

                {customFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 bg-[#F5F2ED]/40 p-3 rounded-xl border border-[#E5E0D8]">
                    {customFields.map(f => (
                      <div key={f.id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg text-xs border border-[#E5E0D8]">
                        <span className="text-[#2D2D2D]">{f.label}: <strong className="text-[#5A5A40]">{f.value}</strong></span>
                        <button type="button" onClick={() => setCustomFields(prev => prev.filter(item => item.id !== f.id))} className="text-[#8C6A5D] hover:opacity-80 transition cursor-pointer" aria-label={`Remove field ${f.label}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5 font-bold">Personal Notes / Incident details</label>
                <textarea 
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record custom details, family attendees, keepsake lists, gift recommendations..."
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-[#F5F2ED] text-[#7A7A7A] border border-[#E5E0D8] text-sm font-semibold rounded-xl cursor-pointer hover:bg-opacity-80 text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#5A5A40] text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-opacity-95 text-center"
                >
                  Save Log entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
