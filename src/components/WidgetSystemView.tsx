import React, { useState, useId } from 'react';
import { 
  Sparkles, Smartphone, Copy, Check, Code, BookOpen, Layers, 
  Settings, User, Flame, Info, RotateCw, Lightbulb, Play, AlertCircle, Heart
} from 'lucide-react';
import { SWIFT_WIDGET_CODE } from '../features/widgets/iosWidgetExporter';
import type { Person, Group } from '../models/types';

interface WidgetSystemViewProps {
  people: Person[];
  groups: Group[];
}

export default function WidgetSystemView({ people, groups }: WidgetSystemViewProps) {
  const [selectedStyle, setSelectedStyle] = useState<'photo-countdown' | 'compact-name-age' | 'upcoming-list' | 'birthday-card'>('photo-countdown');
  const [targetPersonId, setTargetPersonId] = useState<string>('');
  const [rotationFreq, setRotationFreq] = useState<number>(30); // minutes
  const [priorityWeight, setPriorityWeight] = useState<number>(75);
  const [upcomingWeight, setUpcomingWeight] = useState<number>(90);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'designer' | 'swift' | 'docs'>('designer');

  const personSelectId = useId();
  const widgetStyleId = useId();
  const rotationFreqId = useId();
  const priorityWeightId = useId();
  const upcomingWeightId = useId();

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(SWIFT_WIDGET_CODE);
        setCopiedStatus(true);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = SWIFT_WIDGET_CODE;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedStatus(true);
      }
    } catch (e) {
      console.warn('Clipboard write restricted by security rules:', e);
      setCopiedStatus(true);
    }
    setTimeout(() => {
      setCopiedStatus(false);
    }, 2000);
  };

  // Safe selection fallback
  const focusedPerson = people.find(p => p.id === targetPersonId) || people[0];

  return (
    <div className="space-y-6 select-none">
      <div>
        <h2 className="text-4xl font-serif font-bold italic text-[#5A5A40] tracking-tight flex items-center gap-2">
          <Smartphone className="text-[#8C6A5D] w-8 h-8" /> Widget Center
        </h2>
        <p className="text-[#7A7A7A] text-sm">Design in-app widget slots or export files to launch authentic iOS Home Screen Widgets.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#F5F2ED] p-1 rounded-xl border border-[#E5E0D8] self-start max-w-md">
        <button 
          onClick={() => setActiveTab('designer')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition ${
            activeTab === 'designer' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-[#7A7A7A] hover:text-[#5A5A40]'
          }`}
        >
          Widget Designer
        </button>
        <button 
          onClick={() => setActiveTab('swift')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition ${
            activeTab === 'swift' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-[#7A7A7A] hover:text-[#5A5A40]'
          }`}
        >
          SwiftUI Widget Source
        </button>
        <button 
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition ${
            activeTab === 'docs' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-[#7A7A7A] hover:text-[#5A5A40]'
          }`}
        >
          Xcode Build guide
        </button>
      </div>

      {activeTab === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel left */}
          <div className="lg:col-span-1 bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-serif font-bold italic text-[#2D2D2D] flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-[#8C6A5D]" /> Designer parameters
            </h3>

            {/* Selector targets */}
            <div className="space-y-4">
              <div>
                <label htmlFor={personSelectId} className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Focus Target Person</label>
                <select
                  id={personSelectId}
                  value={targetPersonId}
                  onChange={(e) => setTargetPersonId(e.target.value)}
                  className="w-full bg-white border border-[#E5E0D8] text-[#2D2D2D] p-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                >
                  <option value="">-- Choose Profile --</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={widgetStyleId} className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">Display Card Style Layout</label>
                <select
                  id={widgetStyleId}
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as any)}
                  className="w-full bg-white border border-[#E5E0D8] text-[#2D2D2D] p-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                >
                  <option value="photo-countdown">Photo with Days Countdown</option>
                  <option value="compact-name-age">Compact Profile metadata</option>
                  <option value="birthday-card">Warm Clay Birthday Card</option>
                  <option value="upcoming-list">Upcoming timeline list</option>
                </select>
              </div>
            </div>

            {/* Smart rotation weights adjustments */}
            <div className="border-t border-[#E5E0D8] pt-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-[#5A5A40]" /> Rotate Algorithms
              </h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label htmlFor={rotationFreqId} className="text-xs text-[#2D2D2D] font-medium">Rotation frequency (mins)</label>
                    <span className="text-[11px] font-semibold text-[#5A5A40]">{rotationFreq}m</span>
                  </div>
                  <input 
                    id={rotationFreqId}
                    type="range" 
                    min="5" 
                    max="180" 
                    step="5" 
                    value={rotationFreq} 
                    onChange={(e) => setRotationFreq(Number(e.target.value))}
                    className="w-full accent-[#5A5A40] bg-[#F5F2ED] h-1.5 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label htmlFor={priorityWeightId} className="text-xs text-[#2D2D2D] font-medium">Favorite Spotlight weight</label>
                    <span className="text-[11px] font-semibold text-[#5A5A40]">x{priorityWeight}%</span>
                  </div>
                  <input 
                    id={priorityWeightId}
                    type="range" 
                    min="0" 
                    max="100" 
                    value={priorityWeight} 
                    onChange={(e) => setPriorityWeight(Number(e.target.value))}
                    className="w-full accent-[#5A5A40] bg-[#F5F2ED] h-1.5 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label htmlFor={upcomingWeightId} className="text-xs text-[#2D2D2D] font-medium">Urgency countdown buffer</label>
                    <span className="text-[11px] font-semibold text-[#5A5A40]">w{upcomingWeight}%</span>
                  </div>
                  <input 
                    id={upcomingWeightId}
                    type="range" 
                    min="0" 
                    max="100" 
                    value={upcomingWeight} 
                    onChange={(e) => setUpcomingWeight(Number(e.target.value))}
                    className="w-full accent-[#5A5A40] bg-[#F5F2ED] h-1.5 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive visual layout previews right */}
          <div className="lg:col-span-2 bg-white border border-[#E5E0D8] rounded-[24px] p-6 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#8C6A5D] uppercase tracking-wider flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Homescreen preview widget
              </span>
              <p className="text-xs text-[#7A7A7A]">Below renders simulated visuals showing how these compile onto actual screens.</p>
            </div>

            {/* Widget render zone */}
            <div className="flex flex-col items-center justify-center p-8 bg-[#F5F2ED]/40 rounded-2xl border border-[#E5E0D8]">
              {focusedPerson ? (
                <>
                  {selectedStyle === 'photo-countdown' && (
                    <div className="w-56 h-56 bg-white border border-[#E5E0D8] rounded-3xl p-5 shadow-lg flex flex-col justify-between relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8C6A5D] font-extrabold uppercase tracking-widest">WIDGET</span>
                        <Heart className="w-3.5 h-3.5 text-[#8C6A5D] fill-[#8C6A5D]" />
                      </div>
                      
                      <div className="space-y-1 mt-4">
                        <h4 className="text-[#2D2D2D] font-serif font-bold italic text-base">{focusedPerson.displayName}</h4>
                        <p className="text-[10.5px] text-[#7A7A7A]">Next birthday: {focusedPerson.dob}</p>
                      </div>

                      <div className="bg-[#F5F2ED]/40 border border-[#E5E0D8] p-3 rounded-2xl mt-4 flex items-center justify-between">
                        <div className="text-3xl font-serif font-extrabold text-[#8C6A5D]">
                          12
                        </div>
                        <span className="block text-[8px] font-bold uppercase text-[#7A7A7A] tracking-wider">Days Left</span>
                      </div>
                    </div>
                  )}

                  {selectedStyle === 'compact-name-age' && (
                    <div className="w-72 h-36 bg-white border border-[#E5E0D8] rounded-3xl p-4 shadow-lg flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#F5F2ED] flex items-center justify-center text-[#7A7A7A] font-bold text-lg border-2 border-[#5A5A40]/10 font-serif italic">
                        {focusedPerson.firstName[0]}
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="text-[#2D2D2D] font-serif font-bold italic text-base">{focusedPerson.displayName}</h4>
                        <div className="text-xs text-[#7A7A7A]">Celebrated: {focusedPerson.dob}</div>
                        <div className="text-[10px] uppercase font-bold text-[#8C6A5D]">BIRTHDAY IN 22 DAYS</div>
                      </div>
                    </div>
                  )}

                  {selectedStyle === 'birthday-card' && (
                    <div className="w-64 h-64 bg-rose-50/50 border-2 border-[#8C6A5D]/20 rounded-[32px] p-6 shadow-md flex flex-col justify-between text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-[#8C6A5D]/15 py-1 px-3 text-[9px] font-bold tracking-widest text-[#8C6A5D] rounded-bl-xl border-l border-b border-[#8C6A5D]/20">
                        TURNING 5!
                      </div>
                      
                      <div className="flex flex-col items-center mt-3">
                        <div className="w-16 h-16 rounded-full bg-[#8C6A5D]/10 border-2 border-[#8C6A5D]/30 flex items-center justify-center font-bold text-[#8C6A5D] text-lg">
                          🎉
                        </div>
                        <h4 className="text-[#8C6A5D] font-serif font-bold italic text-lg mt-3">{focusedPerson.displayName}</h4>
                        <p className="text-[10px] text-[#8C6A5D]/80 uppercase font-bold tracking-wider mt-1">Birthday Celebration</p>
                      </div>

                      <div className="text-xs text-[#7A7A7A] border-t border-[#E5E0D8] pt-3">
                        CELEBRATED IN 4 DAYS!
                      </div>
                    </div>
                  )}

                  {selectedStyle === 'upcoming-list' && (
                    <div className="w-80 bg-white border border-[#E5E0D8] rounded-3xl p-5 shadow-lg space-y-3">
                      <div className="text-xs font-bold text-[#5A5A40] uppercase tracking-widest flex items-center justify-between border-b border-[#E5E0D8] pb-2">
                        <span>Upcoming calendar</span>
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      
                      <div className="divide-y divide-[#E5E0D8] space-y-2">
                        <div className="flex justify-between items-center text-xs py-1.5">
                          <span className="text-[#2D2D2D] font-semibold">{focusedPerson.displayName} • Birthday</span>
                          <span className="text-[#8C6A5D] font-bold border border-[#8C6A5D]/25 px-1.5 py-0.5 rounded text-[10px] bg-[#8C6A5D]/10">In 4d</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5">
                          <span className="text-[#2D2D2D] font-semibold">Wedding Anniversary</span>
                          <span className="text-[#5A5A40] font-bold border border-[#5A5A40]/25 px-1.5 py-0.5 rounded text-[10px] bg-[#5A5A40]/10">In 12d</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[#7A7A7A] text-xs text-center py-6">
                  Log people first to view design card compositions.
                </div>
              )}
            </div>

            <div className="bg-[#F5F2ED]/40 p-4 border border-[#E5E0D8] rounded-xl flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#8C6A5D] shrink-0 mt-0.5" />
              <p className="text-xs text-[#7A7A7A] leading-relaxed">
                Smart Rotation incorporates user favorited tags, urgency values, and periodic cycle randomizers to ensure slot content stays fresh without manual profile adjustments.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'swift' && (
        <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-3">
            <div>
              <h3 className="text-sm font-serif font-bold italic text-[#2D2D2D]">SwiftUI Widget Timeline code</h3>
              <p className="text-xs text-[#7A7A7A]">Ready to copy and paste directly into your target Xcode Widget Extension template.</p>
            </div>
            <button 
              onClick={handleCopyCode}
              className="py-1.5 px-3 bg-[#5A5A40] hover:bg-opacity-95 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer border-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedStatus ? 'Copied Swift code!' : 'Copy Swift code'}
            </button>
          </div>

          <pre className="p-4 bg-[#F5F2ED]/45 border border-[#E5E0D8] rounded-xl text-[10.5px] font-mono text-slate-800 overflow-x-auto max-h-96 custom-scrollbar leading-relaxed">
            {SWIFT_WIDGET_CODE}
          </pre>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-5 shadow-sm">
          <h3 className="text-lg font-serif font-bold italic text-[#2D2D2D] border-b border-[#E5E0D8] pb-2">Xcode WidgetKit Compile instructions</h3>
          
          <div className="space-y-4 text-sm text-[#7A7A7A] leading-relaxed list-decimal pl-1">
            <div className="flex gap-3">
              <span className="font-bold text-[#5A5A40] text-base">1.</span>
              <p>
                <strong>Install Capacitor iOS:</strong> Run Native capacitor integrations on your directory project root <code>npm install @capacitor/ios</code> then synchronize <code>npx cap add ios</code>.
              </p>
            </div>

            <div className="flex gap-3 border-t border-[#E5E0D8] pt-3">
              <span className="font-bold text-[#5A5A40] text-base">2.</span>
              <p>
                <strong>Create App Group:</strong> Within Apple developer portal or Xcode Targets settings, configure App Group <code>"group.com.importantdates.widgets"</code> on both the main Container App and the WidgetExtension Target. This allows sandbox read-write access to native disk buffers!
              </p>
            </div>

            <div className="flex gap-3 border-t border-[#E5E0D8] pt-3">
              <span className="font-bold text-[#5A5A40] text-base">3.</span>
              <p>
                <strong>Implement Swift serialization bridge:</strong> Save the compiled minimized JSON widget payload to the UserDefaults database suite mapped above using Capacitor local writing. On the iOS side, SwiftUI Provider decodes this payload inside the <code>Provider.getTimeline()</code> callback sequence.
              </p>
            </div>

            <div className="bg-[#8C6A5D]/5 border border-[#8C6A5D]/20 p-4 rounded-xl flex items-start gap-3 mt-4">
              <AlertCircle className="w-5 h-5 text-[#8C6A5D] shrink-0 mt-0.5" />
              <p className="text-xs text-[#7A7A7A] leading-relaxed">
                Notice: Safari-installed web PWAs cannot launch authentic native WidgetKit accessories on iOS homescreens directly due to WebKit sandbox containment constraints. To enjoy authentic iOS desktop widgets, compile using capacitor wrapper targets as detailed above!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
