import { useState, useEffect } from 'react';
import { 
  Sparkles, Calendar, Heart, Search, Users, ShieldAlert,
  ArrowRight, Award, Plus, CalendarCheck, Clock, RefreshCw, Star
} from 'lucide-react';
import { calculateExactAge, calculateNextAnniversary } from '../date-engine/engine';
import { getBlobUrl } from '../database/db';
import type { Person, Event, Group } from '../models/types';

interface DashboardViewProps {
  people: Person[];
  events: Event[];
  groups: Group[];
  onNavigateToPerson: (id: string) => void;
  onNavigateToEvent: (id: string) => void;
  onAddPerson: () => void;
  onAddEvent: () => void;
}

export default function DashboardView({
  people,
  events,
  groups,
  onNavigateToPerson,
  onNavigateToEvent,
  onAddPerson,
  onAddEvent
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90 | 365>(30);
  const [rotationIndex, setRotationIndex] = useState(0);

  // Filter people and events matching universal search
  const filteredPeople = searchQuery.trim() === '' ? [] : people.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesName = `${p.firstName} ${p.lastName} ${p.displayName}`.toLowerCase().includes(q);
    const matchesNotes = p.notes?.toLowerCase().includes(q) || false;
    const matchesTag = p.tags.some(t => t.toLowerCase().includes(q));
    const matchesFields = p.customFields.some(f => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q));
    return matchesName || matchesNotes || matchesTag || matchesFields;
  });

  const filteredEvents = searchQuery.trim() === '' ? [] : events.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchesName = e.eventName.toLowerCase().includes(q);
    const matchesNotes = e.notes?.toLowerCase().includes(q) || false;
    const matchesTag = e.tags.some(t => t.toLowerCase().includes(q));
    const matchesLocation = e.location?.toLowerCase().includes(q) || false;
    return matchesName || matchesNotes || matchesTag || matchesLocation;
  });

  // Calculate upcoming birthdays & anniversaries within range
  const now = new Date();
  
  const upcomingBirthdays = people.map(p => {
    const anniv = calculateNextAnniversary(p.dob, now);
    const age = calculateExactAge(p.dob, now);
    return { person: p, anniv, age };
  }).filter(item => item.anniv.daysOnlyRemaining <= rangeDays)
    .sort((a, b) => a.anniv.daysOnlyRemaining - b.anniv.daysOnlyRemaining);

  const upcomingAnniversaries = events.map(e => {
    const anniv = calculateNextAnniversary(e.originalDate, now);
    return { event: e, anniv };
  }).filter(item => item.anniv.daysOnlyRemaining <= rangeDays)
    .sort((a, b) => a.anniv.daysOnlyRemaining - b.anniv.daysOnlyRemaining);

  // Today's events
  const todayEvents = events.filter(e => {
    const anniv = calculateNextAnniversary(e.originalDate, now);
    return anniv.daysOnlyRemaining === 0;
  });

  const todayBirthdays = people.filter(p => {
    const anniv = calculateNextAnniversary(p.dob, now);
    return anniv.daysOnlyRemaining === 0;
  });

  // Smart rotation items (favorites + closest dates)
  const rotationCandidates = people.filter(p => p.isFavorite).concat(
    people.filter(p => !p.isFavorite).map(p => ({
      p,
      days: calculateNextAnniversary(p.dob, now).daysOnlyRemaining
    })).filter(x => x.days < 45).map(x => x.p)
  ).filter((value, index, self) => self.findIndex(y => y.id === value.id) === index); // unique

  // Auto-rotate every 15 seconds
  useEffect(() => {
    if (rotationCandidates.length === 0) return;
    const interval = setInterval(() => {
      setRotationIndex(prev => (prev + 1) % rotationCandidates.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [rotationCandidates.length]);

  const activeRotator = rotationCandidates[rotationIndex];

  return (
    <div className="space-y-8 select-none">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif font-bold italic text-[#5A5A40] tracking-tight">Dashboard</h2>
          <p className="text-[#7A7A7A] text-sm">Welcome to your secure local tracking registry.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onAddPerson}
            className="flex items-center gap-1.5 py-2 px-4 bg-[#5A5A40] hover:bg-opacity-90 text-white font-semibold rounded-2xl text-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Person
          </button>
          <button 
            onClick={onAddEvent}
            className="flex items-center gap-1.5 py-2 px-4 bg-[#8C6A5D] hover:bg-opacity-90 text-white font-semibold rounded-2xl text-sm transition cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4" /> Log Event
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-transparent">
        <div className="bg-white border border-[#E5E0D8] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-[#5A5A40]/10 rounded-2xl text-[#5A5A40]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#2D2D2D]">{people.length}</div>
            <div className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider">Total People</div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E0D8] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-[#8C6A5D]/10 rounded-2xl text-[#8C6A5D]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#2D2D2D]">{events.length}</div>
            <div className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider">Total Events</div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E0D8] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-[#5A5A40]/10 rounded-2xl text-[#5A5A40]">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#2D2D2D]">{people.filter(p => p.isFavorite).length}</div>
            <div className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider">Favorites</div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E0D8] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-700 border border-emerald-100">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-800">{todayEvents.length + todayBirthdays.length}</div>
            <div className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider">Today's Dates</div>
          </div>
        </div>
      </div>

      {/* Smart Rotation Card & Fast Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search & Fast Findings */}
        <div className="lg:col-span-2 bg-white border border-[#E5E0D8] p-6 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-base font-semibold text-[#2D2D2D] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#5A5A40]" /> Universal Search finders
          </h3>
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 text-[#8C8C8C] w-5 h-5 pointer-events-none" />
            <input 
              type="text"
              placeholder="Query names, events, tags, custom fields, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E0D8] rounded-xl pl-11 pr-4 py-3 text-[#2D2D2D] placeholder-[#8C8C8C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-sm"
            />
          </div>

          {searchQuery.trim() !== '' && (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {filteredPeople.length === 0 && filteredEvents.length === 0 ? (
                <div className="text-center py-6 text-[#7A7A7A] text-xs">No matching files or notes found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredPeople.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => onNavigateToPerson(p.id)}
                      className="p-3 bg-[#F5F2ED]/40 hover:bg-[#F5F2ED] border border-[#E5E0D8] rounded-2xl flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        {p.profilePhoto ? (
                          <img 
                            src={getBlobUrl(p.id, p.profilePhoto)} 
                            alt={p.displayName} 
                            className="w-8 h-8 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] text-xs font-bold">
                            {p.firstName[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-[#2D2D2D]">{p.displayName}</div>
                          <div className="text-xs text-[#7A7A7A]">Person • Born {p.dob}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8C8C8C]" />
                    </div>
                  ))}

                  {filteredEvents.map(e => (
                    <div 
                      key={e.id}
                      onClick={() => onNavigateToEvent(e.id)}
                      className="p-3 bg-[#F5F2ED]/40 hover:bg-[#F5F2ED] border border-[#E5E0D8] rounded-2xl flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#2D2D2D]">{e.eventName}</div>
                        <div className="text-xs text-[#7A7A7A]">Event ({e.eventType}) • {e.originalDate}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8C8C8C]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchQuery.trim() === '' && (
            <div className="text-xs text-[#8C8C8C] border-t border-[#E5E0D8] pt-3">
              Type above to filter the database across first names, custom fields, clothing sizes, groups, colors, and notes fields.
            </div>
          )}
        </div>

        {/* Smart Rotation Card */}
        <div className="bg-white border border-[#E5E0D8] p-6 rounded-3xl flex flex-col justify-between relative shadow-sm">
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#F5F2ED] text-[10px] text-[#5A5A40] px-2 py-1 rounded-full border border-[#E5E0D8]">
            <RefreshCw className="w-3 h-3 animate-spin" /> Smart Rotation
          </div>

          {activeRotator ? (
            <div className="space-y-5 h-full flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest flex items-center gap-1 mt-1">
                  <Sparkles className="w-3.5 h-3.5" /> Spotlight Card
                </span>
                
                <div className="flex items-center gap-4 mt-3">
                  {activeRotator.profilePhoto ? (
                    <img 
                      src={getBlobUrl(activeRotator.id, activeRotator.profilePhoto)} 
                      alt={activeRotator.displayName} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#5A5A40]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40] text-lg font-bold border-2 border-[#5A5A40]">
                      {activeRotator.firstName[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-serif font-bold italic text-[#2D2D2D] flex items-center gap-1.5">
                      {activeRotator.displayName}
                      {activeRotator.isFavorite && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    </h4>
                    {activeRotator.relationship && (
                      <span className="text-xs text-[#5A5A40] px-2 py-0.5 bg-[#5A5A40]/10 rounded border border-[#E5E0D8]">
                        {activeRotator.relationship}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {(() => {
                  const age = calculateExactAge(activeRotator.dob, now, activeRotator.birthTime);
                  const nextBday = calculateNextAnniversary(activeRotator.dob, now);
                  return (
                    <>
                      <div className="text-sm text-[#2D2D2D]">
                        Is currently <strong className="text-[#5A5A40] font-bold">{age.years} y, {age.months} m, and {age.days} d</strong> old
                      </div>
                      <div className="text-xs text-[#7A7A7A]">
                        Next birthday is <strong className="text-[#8C6A5D] font-semibold">{nextBday.daysOnlyRemaining}</strong> days from now, will turn <strong className="text-[#2D2D2D] font-bold">{nextBday.anniversaryNumber}</strong>.
                      </div>
                    </>
                  );
                })()}
              </div>

              <button 
                onClick={() => onNavigateToPerson(activeRotator.id)}
                className="w-full mt-4 py-2 px-3 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 text-[#5A5A40] text-xs font-semibold rounded-xl flex items-center justify-center gap-1 border border-[#E5E0D8] cursor-pointer"
              >
                View full bio details <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-8 text-[#7A7A7A] space-y-2">
              <Star className="w-8 h-8 text-[#8C8C8C]" />
              <p className="text-xs">Add standard favorites or high priority people to cycle in the dashboard rotation spotlight panel.</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Special Dates alerts */}
      {(todayEvents.length > 0 || todayBirthdays.length > 0) && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h4 className="font-bold text-emerald-900 font-serif text-lg">Today has active celebrations:</h4>
              <p className="text-xs text-emerald-700/90 font-medium">
                {[
                  ...todayBirthdays.map(p => `${p.displayName}'s Birthday`),
                  ...todayEvents.map(e => e.eventName)
                ].join(', ')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {todayBirthdays.map(p => (
              <button 
                key={p.id}
                onClick={() => onNavigateToPerson(p.id)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Open {p.firstName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Reminders with configurable timer range */}
      <div className="bg-white border border-[#E5E0D8] rounded-3xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#2D2D2D] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#8C6A5D]" />
              Upcoming Anniversaries & Birthdays
            </h3>
            <p className="text-xs text-[#7A7A7A]">Chronological calendar countdown within your selected time interval.</p>
          </div>

          <div className="flex bg-[#F5F2ED] p-1 rounded-xl border border-[#E5E0D8] self-start">
            {([7, 30, 90, 365] as const).map(d => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  rangeDays === d 
                    ? 'bg-[#5A5A40] text-white shadow-sm' 
                    : 'text-[#7A7A7A] hover:bg-[#E5E0D8]/40'
                }`}
              >
                {d === 365 ? '1 Year' : `${d} Days`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Birthdays Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#5A5A40] uppercase tracking-widest flex items-center justify-between">
              <span>Birthdays ({upcomingBirthdays.length})</span>
              <Award className="w-4 h-4" />
            </h4>

            {upcomingBirthdays.length === 0 ? (
              <div className="p-8 border border-dashed border-[#E5E0D8]/85 rounded-2xl text-center text-[#7A7A7A] text-xs">
                No birthdays found in the next {rangeDays} days.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {upcomingBirthdays.map(({ person, anniv, age }) => (
                  <div 
                    key={person.id}
                    onClick={() => onNavigateToPerson(person.id)}
                    className="p-3.5 bg-[#F5F2ED]/40 hover:bg-[#F5F2ED] border border-[#E5E0D8] rounded-2xl flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      {person.profilePhoto ? (
                        <img 
                          src={getBlobUrl(person.id, person.profilePhoto)} 
                          alt={person.displayName} 
                          className="w-10 h-10 rounded-full object-cover border border-[#E5E0D8]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center text-xs font-bold">
                          {person.firstName[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-[#2D2D2D] group-hover:text-[#5A5A40]">{person.displayName}</div>
                        <div className="text-[11px] text-[#7A7A7A]">
                          {person.dobPrecision === 'month-day' ? 'Year unknown' : `Turning ${anniv.anniversaryNumber}`} • {anniv.dayOfWeek}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-[#5A5A40]/10 text-[#5A5A40] font-bold text-xs rounded-lg border border-[#5A5A40]/20">
                        {anniv.daysOnlyRemaining === 0 ? '🎉 Today' : `In ${anniv.daysOnlyRemaining} Days`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other Events/Anniversaries */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#8C6A5D] uppercase tracking-widest flex items-center justify-between">
              <span>Milestones & Anniversaries ({upcomingAnniversaries.length})</span>
              <CalendarCheck className="w-4 h-4" />
            </h4>

            {upcomingAnniversaries.length === 0 ? (
              <div className="p-8 border border-dashed border-[#E5E0D8]/85 rounded-2xl text-center text-[#7A7A7A] text-xs">
                No events found in the next {rangeDays} days.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {upcomingAnniversaries.map(({ event, anniv }) => (
                  <div 
                    key={event.id}
                    onClick={() => onNavigateToEvent(event.id)}
                    className="p-3.5 bg-[#F5F2ED]/40 hover:bg-[#F5F2ED] border border-[#E5E0D8] rounded-2xl flex items-center justify-between cursor-pointer transition group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#2D2D2D] group-hover:text-[#8C6A5D]">{event.eventName}</div>
                      <div className="text-[11px] text-[#7A7A7A] flex items-center gap-1.5">
                        <span className="text-[#8C6A5D] uppercase text-[9px] font-bold">{event.eventType}</span>
                        <span>• {anniv.dayOfWeek}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-[#8C6A5D]/10 text-[#8C6A5D] font-bold text-xs rounded-lg border border-[#8C6A5D]/20">
                        {anniv.daysOnlyRemaining === 0 ? '🔔 Today' : `In ${anniv.daysOnlyRemaining} Days`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
