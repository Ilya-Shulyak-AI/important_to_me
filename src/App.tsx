import React, { useState, useEffect } from 'react';
import { 
  Heart, Calendar, Users, Smartphone, Database, ShieldCheck, 
  Terminal, Settings, ChevronRight, X, Plus, Trash2, HeartPulse, Shield, Star, Loader2
} from 'lucide-react';
import { db } from './database/db';
import { syncWidgetPayloadToCapacitorBridge } from './features/widgets/iosWidgetExporter';
import { runAllDiagnostics, type TestResult } from './tests/runner';
import type { Person, Event, Group } from './models/types';

// Import our modular screens
import DashboardView from './components/DashboardView';
import PeopleView from './components/PeopleView';
import EventsView from './components/EventsView';
import PersonProfileView from './components/PersonProfileView';
import WidgetSystemView from './components/WidgetSystemView';
import BackupView from './components/BackupView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'people' | 'events' | 'widgets' | 'backups' | 'settings'>('dashboard');
  
  // Database data states
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile detail overlay navigator state
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Group creation helper
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');
  const [newGroupIcon, setNewGroupIcon] = useState('Heart');
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  // Diagnostics states
  const [diagnosticResults, setDiagnosticResults] = useState<TestResult[]>([]);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  // Load IndexedDB states
  const loadDatabaseState = async () => {
    try {
      const pList = await db.people.toArray();
      const eList = await db.events.toArray();
      const gList = await db.groups.toArray();

      setPeople(pList);
      setEvents(eList);
      setGroups(gList);
    } catch (e) {
      console.warn('Error fetching DB state:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseState();
  }, []);

  // Update native widget payloads whenever data changes
  useEffect(() => {
    if (!loading) {
      syncWidgetPayloadToCapacitorBridge();
    }
  }, [people, events, loading]);

  // People handlers
  const handleAddPerson = async (newP: Omit<Person, 'createdDate' | 'lastUpdatedDate'>) => {
    const payload: Person = {
      ...newP,
      createdDate: Date.now(),
      lastUpdatedDate: Date.now()
    };
    await db.people.put(payload);
    await loadDatabaseState();
  };

  const handleUpdatePerson = async (updatedP: Person) => {
    await db.people.put(updatedP);
    await loadDatabaseState();
  };

  const handleDeletePerson = async (id: string) => {
    await db.people.delete(id);
    await loadDatabaseState();
  };

  // Events handlers
  const handleAddEvent = async (newEvent: Omit<Event, 'createdDate' | 'lastUpdatedDate'>) => {
    const payload: Event = {
      ...newEvent,
      createdDate: Date.now(),
      lastUpdatedDate: Date.now()
    };
    await db.events.put(payload);
    await loadDatabaseState();
  };

  const handleUpdateEvent = async (updatedEvent: Event) => {
    await db.events.put(updatedEvent);
    await loadDatabaseState();
  };

  const handleDeleteEvent = async (id: string) => {
    await db.events.delete(id);
    await loadDatabaseState();
  };

  // Group creation handler
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newG: Group = {
      id: `g-${Date.now()}`,
      name: newGroupName.trim(),
      color: newGroupColor,
      icon: newGroupIcon
    };

    await db.groups.put(newG);
    setNewGroupName('');
    await loadDatabaseState();
  };

  const handleDeleteGroup = (id: string) => {
    setGroupToDelete(id);
  };

  const confirmDeleteGroup = async () => {
    if (groupToDelete) {
      await db.groups.delete(groupToDelete);
      setGroupToDelete(null);
      await loadDatabaseState();
    }
  };

  // Run diagnostics suite
  const handleTriggerDiagnostics = async () => {
    setRunningDiagnostics(true);
    const results = await runAllDiagnostics();
    setDiagnosticResults(results);
    setRunningDiagnostics(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#2D2D2D] flex flex-col md:flex-row antialiased font-sans">
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-[#E5E0D8] p-6 space-y-8 justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img 
              src="/src/assets/images/app_icon_filling_frame_1782217863679.jpg" 
              alt="Important Dates Logo" 
              className="w-11 h-11 rounded-2xl object-cover shadow-sm border border-[#E5E0D8]/60"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-lg font-serif font-bold italic text-[#5A5A40] tracking-tight leading-none">Important Dates</h1>
              <p className="text-[9px] uppercase font-bold text-[#8C8C8C] mt-1 tracking-widest">Local-First Storage</p>
            </div>
          </div>

          <nav className="space-y-1" aria-label="Desktop Main Navigation">
            {([
              { id: 'dashboard', label: 'Dashboard', icon: Heart },
              { id: 'people', label: 'People Registry', icon: Users },
              { id: 'events', label: 'Events Tracker', icon: Calendar },
              { id: 'widgets', label: 'Widget Center', icon: Smartphone },
              { id: 'backups', label: 'Security & Backup', icon: Database },
              { id: 'settings', label: 'Utilities', icon: Settings }
            ] as const).map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id && !selectedPersonId;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setSelectedPersonId(null); setActiveTab(tab.id); }}
                  className={`w-full flex items-center justify-between py-2 px-3.5 rounded-2xl text-xs font-medium cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#F5F2ED] text-[#5A5A40]'
                      : 'text-[#7A7A7A] hover:bg-[#F9F8F6] hover:text-[#2D2D2D]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40 text-[#AFAFAF]" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tiny local sandbox safety warning footer */}
        <div className="p-4 bg-[#F5F2ED]/60 rounded-2xl border border-[#E5E0D8] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#5A5A40] shrink-0" />
          <div className="text-[10px] text-[#7A7A7A] font-medium leading-tight">
            100% Secure & offline. Encryption active.
          </div>
        </div>
      </aside>

      {/* Main Panel Content Frame */}
      <main className="flex-1 flex flex-col min-h-0 bg-[#F5F2ED] md:p-8 p-4 pb-20 md:pb-8 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#7A7A7A]">
            <svg className="animate-spin h-8 w-8 text-[#5A5A40]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xs font-semibold">Decrypting local database sandboxes...</p>
          </div>
        ) : selectedPersonId ? (
          <PersonProfileView 
            personId={selectedPersonId}
            people={people}
            events={events}
            groups={groups}
            onBack={() => setSelectedPersonId(null)}
            onEdit={(p) => {
              setSelectedPersonId(null);
              // Simple redirect to list to force edit pop up triggers
              setActiveTab('people');
            }}
            onDelete={handleDeletePerson}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                people={people}
                events={events}
                groups={groups}
                onNavigateToPerson={(id) => setSelectedPersonId(id)}
                onNavigateToEvent={(id) => {
                  setActiveTab('events');
                }}
                onAddPerson={() => setActiveTab('people')}
                onAddEvent={() => setActiveTab('events')}
              />
            )}

            {activeTab === 'people' && (
              <PeopleView
                people={people}
                groups={groups}
                onAddPerson={handleAddPerson}
                onUpdatePerson={handleUpdatePerson}
                onDeletePerson={handleDeletePerson}
                onNavigateToPerson={(id) => setSelectedPersonId(id)}
              />
            )}

            {activeTab === 'events' && (
              <EventsView
                events={events}
                people={people}
                groups={groups}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onNavigateToEvent={(id) => {
                  // Simply stay in page list timeline
                }}
              />
            )}

            {activeTab === 'widgets' && (
              <WidgetSystemView 
                people={people}
                groups={groups}
              />
            )}

            {activeTab === 'backups' && (
              <BackupView 
                onRefreshData={loadDatabaseState}
              />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div>
                  <h2 className="text-4xl font-serif font-bold italic text-[#5A5A40] tracking-tight flex items-center gap-2">
                    <Settings className="w-8 h-8 text-[#5A5A40]" /> Utilities console
                  </h2>
                  <p className="text-[#7A7A7A] text-sm">Configure database tags, execution logs, and sandbox tests.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Group Categories Customization Box */}
                  <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-4 shadow-sm">
                    <h3 className="text-base font-bold text-[#2D2D2D]">Custom Group Categories</h3>
                    
                    <form onSubmit={handleAddGroup} className="flex gap-2">
                      <input 
                        type="text"
                        required
                        placeholder="Group Name (e.g. My Children)"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] placeholder-[#8C8C8C]"
                      />
                      <input 
                        type="color"
                        value={newGroupColor}
                        onChange={(e) => setNewGroupColor(e.target.value)}
                        className="w-10 h-8 rounded bg-transparent border-0 cursor-pointer"
                        title="Group color"
                      />
                      <button 
                        type="submit"
                        className="py-1.5 px-3 bg-[#5A5A40] hover:bg-opacity-90 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Add Group
                      </button>
                    </form>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {groups.length === 0 ? (
                        <p className="text-xs text-[#7A7A7A] italic">No groups created yet. Group profiles from directory catalog.</p>
                      ) : (
                        groups.map(g => (
                          <div key={g.id} className="flex justify-between items-center bg-[#F5F2ED]/60 border border-[#E5E0D8] px-3.5 py-2 rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: g.color }} />
                              <span className="text-[#2D2D2D] font-semibold">{g.name}</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteGroup(g.id)}
                              className="text-[#8C6A5D] hover:text-opacity-80 transition-colors cursor-pointer"
                              aria-label={`Delete custom group ${g.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Private Cryptography and Privacy Screen */}
                  <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-4 shadow-sm">
                    <h3 className="text-base font-bold text-[#2D2D2D] flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#5A5A40]" /> Secure Local-First Trust Promise
                    </h3>
                    
                    <div className="space-y-3.5 text-xs text-[#7A7A7A] leading-relaxed bg-[#F5F2ED]/40 p-4 rounded-xl border border-[#E5E0D8]">
                      <p>
                        This application is built as a complete **Local-First sandboxed system**. All data items, including cropped JPEG photos, logged anniversaries, custom fields, notes, and metrics remain encrypted exclusively inside the browser's persistent IndexedDB storage engine.
                      </p>
                      <p>
                        The application has **zero telemetry, zero analytics tracking, absolutely no paywalls, subscriptions or advertising, and performs no remote network queries**. Your database can only leave your device if you manually compile and export its backup file.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Diagnostics Suite verification */}
                <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#2D2D2D]">Deterministic Diagnostic Suite</h3>
                      <p className="text-xs text-[#7A7A7A]">Run automatic deterministic unit tests over age bounds, year-boundary leap rules, and transactions.</p>
                    </div>
                    <button 
                      onClick={handleTriggerDiagnostics}
                      disabled={runningDiagnostics}
                      className="py-2 px-4 bg-[#5A5A40] hover:bg-opacity-90 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      {runningDiagnostics ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                      {runningDiagnostics ? 'Evaluating assertions...' : 'Execute Diagnostic Tests'}
                    </button>
                  </div>

                  {diagnosticResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {diagnosticResults.map((res, i) => (
                        <div 
                          key={i}
                          className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
                            res.status === 'passed' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : 'bg-[#8C6A5D]/10 border-[#8C6A5D]/20 text-[#8C6A5D]'
                          }`}
                        >
                          <span className="font-bold">{res.status === 'passed' ? '✓' : '✖'}</span>
                          <div>
                            <strong className="block text-[#2D2D2D]">{res.title}</strong>
                            <span className="text-[10px] text-[#7A7A7A]">{res.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Tab Navigation - Mobile navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E0D8] p-2.5 flex justify-around items-center z-40" aria-label="Mobile Bottom Navigation">
        {([
          { id: 'dashboard', label: 'Dashboard', icon: Heart },
          { id: 'people', label: 'People', icon: Users },
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'widgets', label: 'Widgets', icon: Smartphone },
          { id: 'backups', label: 'Backups', icon: Database },
          { id: 'settings', label: 'Utilities', icon: Settings }
        ] as const).map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id && !selectedPersonId;
          return (
            <button
              key={tab.id}
              onClick={() => { setSelectedPersonId(null); setActiveTab(tab.id); }}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold transition cursor-pointer ${
                isSelected ? 'text-[#5A5A40]' : 'text-[#8C8C8C]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {groupToDelete && (
        <div className="fixed inset-0 z-50 bg-[#2D2D2D]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-serif font-bold italic text-[#2D2D2D]">Delete Group Category?</h3>
            <p className="text-xs text-[#7A7A7A] leading-relaxed">
              Are you sure you want to delete this group category? Associated people profiles will remain fully intact.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={() => setGroupToDelete(null)}
                className="flex-1 py-2 px-4 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] text-[#5A5A40] text-xs font-bold uppercase rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteGroup}
                className="flex-1 py-2 px-4 bg-[#8C6A5D] hover:opacity-95 text-white text-xs font-bold uppercase rounded-xl transition cursor-pointer border-0"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
