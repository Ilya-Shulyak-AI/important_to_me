import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, HelpCircle, Share2, Smartphone } from 'lucide-react';
import { CANONICAL_APP_URL, SCRIPTABLE_APP_STORE_URL, SCRIPTABLE_ARGS_DOCS_URL, SCRIPTABLE_DOCS_URL, SCRIPTABLE_DOCUMENTPICKER_DOCS_URL, SCRIPTABLE_FILEMANAGER_DOCS_URL, SCRIPTABLE_WIDGET_DOCS_URL } from '../constants';
import type { Event, Group, Person } from '../models/types';
import { buildScriptableWidgetExport, getWidgetParameter, serializeScriptableWidgetExport } from '../features/widgets/scriptablePayload';
import type { ScriptableAccentStyle, ScriptableWidgetMode, ScriptableWidgetPreferences } from '../features/widgets/scriptableTypes';
import { copyWidgetData, copyWidgetScript, copyText, downloadWidgetData, downloadWidgetScript, shareWidgetData, shareWidgetScript } from '../features/widgets/scriptableExporter';

interface WidgetSystemViewProps { people: Person[]; events: Event[]; groups: Group[]; }

const SETUP_STEPS = [
  { id: 'install', label: 'Download Scriptable' },
  { id: 'copyScript', label: 'Copy Widget Script' },
  { id: 'createScript', label: 'Create the Script in Scriptable' },
  { id: 'copyData', label: 'Copy Widget Data' },
  { id: 'importData', label: 'Import or Update from Clipboard' },
  { id: 'addHome', label: 'Add the Widget to the Home Screen' },
] as const;

const CHECKLIST_KEY = 'important-to-me-scriptable-checklist';
const LAST_EXPORT_KEY = 'important-to-me-last-widget-export';

const modes: Array<{value: ScriptableWidgetMode; label: string; help: string}> = [
  { value: 'upcoming', label: 'Combined upcoming list', help: 'Birthdays and events together.' },
  { value: 'birthdays', label: 'Upcoming birthdays', help: 'Only birthdays.' },
  { value: 'events', label: 'Upcoming events', help: 'Only life events.' },
  { value: 'favorites', label: 'Favorites', help: 'Favorite people first.' },
  { value: 'person', label: 'One selected person', help: 'Only one person and their linked events.' },
  { value: 'group', label: 'One selected group', help: 'Only people and events in a group.' },
];

type PresetId = 'this-week' | 'favorites' | 'family';

const presets: Array<{ id: PresetId; label: string; help: string }> = [
  { id: 'this-week', label: 'This week', help: 'Combined upcoming, fewer items.' },
  { id: 'favorites', label: 'Favorites', help: 'Favorite people first.' },
  { id: 'family', label: 'Family', help: 'Uses your Family group when present.' },
];

function loadChecklist(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadLastExport(): { at: string; dataFingerprint: string } | null {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function dataFingerprint(people: Person[], events: Event[], groups: Group[]): string {
  const latest = Math.max(
    0,
    ...people.map((p) => p.lastUpdatedDate || 0),
    ...events.map((e) => e.lastUpdatedDate || 0),
    groups.length,
  );
  return `${people.length}:${events.length}:${groups.length}:${latest}`;
}

export default function WidgetSystemView({ people, events, groups }: WidgetSystemViewProps) {
  const [mode, setMode] = useState<ScriptableWidgetMode>('upcoming');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [maxItems, setMaxItems] = useState(5);
  const [accentStyle, setAccentStyle] = useState<ScriptableAccentStyle>('olive');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [message, setMessage] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => loadChecklist());
  const [lastExport, setLastExport] = useState(() => loadLastExport());

  const preferences: ScriptableWidgetPreferences = { mode, selectedPersonId: selectedPersonId || undefined, selectedGroupId: selectedGroupId || undefined, maxItems, accentStyle };
  const exportJson = useMemo(() => serializeScriptableWidgetExport(buildScriptableWidgetExport(people, events, groups, preferences)), [people, events, groups, mode, selectedPersonId, selectedGroupId, maxItems, accentStyle]);
  const parameter = getWidgetParameter(preferences);
  const filteredPeople = people.filter(p => `${p.firstName} ${p.middleName || ''} ${p.lastName} ${p.displayName} ${p.relationship || ''} ${(p.tags || []).join(' ')}`.toLowerCase().includes(personQuery.toLowerCase()));
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(groupQuery.toLowerCase()));
  const fingerprint = dataFingerprint(people, events, groups);
  const exportStale = Boolean(lastExport && lastExport.dataFingerprint !== fingerprint);

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist));
  }, [checklist]);

  const markStep = (id: string, done = true) => setChecklist((prev) => ({ ...prev, [id]: done }));

  const recordExport = () => {
    const payload = { at: new Date().toISOString(), dataFingerprint: fingerprint };
    localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(payload));
    setLastExport(payload);
    markStep('copyData', true);
  };

  const action = async (label: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      setMessage(label);
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setMessage('Something went wrong — try Copy or Download instead.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const applyPreset = (id: PresetId) => {
    if (id === 'this-week') {
      setMode('upcoming');
      setMaxItems(4);
      setAccentStyle('olive');
      setSelectedPersonId('');
      setSelectedGroupId('');
    } else if (id === 'favorites') {
      setMode('favorites');
      setMaxItems(5);
      setAccentStyle('bronze');
      setSelectedPersonId('');
      setSelectedGroupId('');
    } else {
      const family = groups.find((g) => /family/i.test(g.name));
      setMode(family ? 'group' : 'upcoming');
      setSelectedGroupId(family?.id || '');
      setMaxItems(6);
      setAccentStyle('charcoal');
      setSelectedPersonId('');
    }
    setMessage(`Preset applied: ${presets.find((p) => p.id === id)?.label}`);
    setTimeout(() => setMessage(''), 2500);
  };

  const previewItems = people.slice(0, 2).map(p => p.displayName).concat(events.slice(0, 2).map(e => e.eventName)).slice(0, size === 'small' ? 2 : size === 'large' ? 6 : 4);

  return <div className="space-y-6 select-none max-w-6xl mx-auto">
    <div className="space-y-2">
      <h2 className="text-4xl font-serif font-bold italic text-[#5A5A40] tracking-tight flex items-center gap-2"><Smartphone className="w-8 h-8" /> iPhone Widgets</h2>
      <p className="text-[#7A7A7A] text-sm">Home Screen cards via the free Scriptable app — not a native Apple widget (that would need an App Store / Xcode app).</p>
      <p className="text-[#7A7A7A] text-sm">Important to Me stores data in this browser. Scriptable cannot read that storage, so you export a small data package to your iPhone.</p>
      {message && <div role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><Check className="w-4 h-4" />{message}</div>}
      <div className={`rounded-xl border px-3 py-2 text-xs ${exportStale ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-[#E5E0D8] bg-[#F9F8F6] text-[#7A7A7A]'}`}>
        {lastExport
          ? <>Last exported: <strong>{new Date(lastExport.at).toLocaleString()}</strong>{exportStale ? ' — people or events changed since then; export again.' : ' — up to date with current records.'}</>
          : 'No widget data exported yet from this browser.'}
      </div>
    </div>

    <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm space-y-3">
        <h3 className="font-serif font-bold italic text-lg text-[#2D2D2D]">What the Widget Shows</h3>
        <p className="text-xs text-[#7A7A7A]">Upcoming birthdays and events, favorites, one person, or one group.</p>
        <div className={`rounded-[28px] border border-[#D8C7A6] bg-[#F4EFE5] p-4 shadow-inner ${size === 'small' ? 'max-w-48 min-h-48' : size === 'large' ? 'max-w-md min-h-72' : 'max-w-sm min-h-44'}`}>
          <div className="text-xs font-bold text-[#5A5A40] mb-3">Important to Me</div>
          {previewItems.length === 0 ? <p className="text-xs text-[#776F63]">No widget data yet. Add people or events, then copy widget data.</p> : previewItems.map((item, i) => <div key={item} className="flex justify-between gap-3 border-t border-[#D8C7A6]/60 py-2 text-xs"><span className="font-semibold text-[#2D2D2D] truncate">{item}</span><span className="text-[#8C6A2F] font-bold">in {i + 3}d</span></div>)}
          <div className="text-[10px] text-[#776F63] mt-3">Updated from local export</div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm space-y-4">
        <h3 className="font-serif font-bold italic text-lg text-[#2D2D2D]">Set Up Your Widget</h3>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {SETUP_STEPS.map((step, i) => (
            <li key={step.id} className="rounded-2xl bg-[#F9F8F6] border border-[#E5E0D8] p-3 flex gap-3 items-start">
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(checklist[step.id])}
                onChange={(e) => markStep(step.id, e.target.checked)}
                aria-label={`Mark done: ${step.label}`}
              />
              <span><strong>{i + 1}. {step.label}</strong></span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <a href={SCRIPTABLE_APP_STORE_URL} target="_blank" rel="noreferrer" onClick={() => markStep('install')} className="inline-flex items-center gap-1 rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white"><ExternalLink className="w-4 h-4" />Download Scriptable</a>
          <button onClick={() => action('Widget script copied.', async () => { await copyWidgetScript(); markStep('copyScript'); })} className="inline-flex items-center gap-1 rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white"><Copy className="w-4 h-4" />Copy Widget Script</button>
          <button onClick={() => action('Widget script downloaded.', () => { downloadWidgetScript(); markStep('copyScript'); })} className="inline-flex items-center gap-1 rounded-xl border border-[#E5E0D8] px-4 py-2 text-xs font-bold text-[#5A5A40]"><Download className="w-4 h-4" />Download Widget Script</button>
          <button onClick={() => action('Shared widget script.', async () => { const r = await shareWidgetScript(); markStep('copyScript'); if (r === 'copied') setMessage('Share unavailable — script copied instead.'); })} className="inline-flex items-center gap-1 rounded-xl border border-[#E5E0D8] px-4 py-2 text-xs font-bold text-[#5A5A40]"><Share2 className="w-4 h-4" />Share Script</button>
          <button onClick={() => action('Widget data copied.', async () => { await copyWidgetData(exportJson); recordExport(); })} className="inline-flex items-center gap-1 rounded-xl bg-[#8C6A2F] px-4 py-2 text-xs font-bold text-white"><Copy className="w-4 h-4" />Copy Widget Data</button>
          <button onClick={() => action('Widget data downloaded.', () => { downloadWidgetData(exportJson); recordExport(); })} className="inline-flex items-center gap-1 rounded-xl border border-[#E5E0D8] px-4 py-2 text-xs font-bold text-[#5A5A40]"><Download className="w-4 h-4" />Download Widget Data</button>
          <button onClick={() => action('Shared widget data.', async () => { const r = await shareWidgetData(exportJson); recordExport(); if (r === 'copied') setMessage('Share unavailable — data copied instead.'); })} className="inline-flex items-center gap-1 rounded-xl border border-[#E5E0D8] px-4 py-2 text-xs font-bold text-[#5A5A40]"><Share2 className="w-4 h-4" />Share Data</button>
        </div>
        <p className="text-[11px] text-[#7A7A7A]">After copying data, open Scriptable, run <strong>Important to Me</strong>, and choose <strong>Import or Update from Clipboard</strong>.</p>
      </div>
    </section>

    <section className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm space-y-3">
      <h3 className="font-serif font-bold italic text-lg text-[#2D2D2D]">Quick presets</h3>
      <p className="text-xs text-[#7A7A7A]">Apply a starting point, then Copy or Share Widget Data.</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p.id} type="button" title={p.help} onClick={() => applyPreset(p.id)} className="rounded-xl border border-[#E5E0D8] bg-[#F9F8F6] px-4 py-2 text-xs font-bold text-[#5A5A40] hover:bg-white">
            {p.label}
          </button>
        ))}
      </div>
    </section>

    <section className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm space-y-4">
      <h3 className="font-serif font-bold italic text-lg text-[#2D2D2D]">Customize</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="text-xs font-bold uppercase text-[#7A7A7A]">What to show<select value={mode} onChange={e=>setMode(e.target.value as ScriptableWidgetMode)} className="mt-1 w-full rounded-xl border border-[#E5E0D8] p-2 text-sm normal-case text-[#2D2D2D]">{modes.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        <label className="text-xs font-bold uppercase text-[#7A7A7A]">Maximum items<input type="number" min={1} max={12} value={maxItems} onChange={e=>setMaxItems(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-[#E5E0D8] p-2 text-sm normal-case text-[#2D2D2D]" /></label>
        <label className="text-xs font-bold uppercase text-[#7A7A7A]">Preview size<select value={size} onChange={e=>setSize(e.target.value as 'small' | 'medium' | 'large')} className="mt-1 w-full rounded-xl border border-[#E5E0D8] p-2 text-sm normal-case text-[#2D2D2D]"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
        <label className="text-xs font-bold uppercase text-[#7A7A7A]">Neutral accent style<select value={accentStyle} onChange={e=>setAccentStyle(e.target.value as ScriptableAccentStyle)} className="mt-1 w-full rounded-xl border border-[#E5E0D8] p-2 text-sm normal-case text-[#2D2D2D]"><option value="olive">Deep olive</option><option value="bronze">Muted bronze</option><option value="charcoal">Charcoal</option></select></label>
      </div>
      {mode === 'person' && <div><label className="text-xs font-bold uppercase text-[#7A7A7A]">Search person<input value={personQuery} onChange={e=>setPersonQuery(e.target.value)} placeholder="Search names, relationships, tags" className="mt-1 mb-2 w-full rounded-xl border border-[#E5E0D8] p-2 text-sm normal-case text-[#2D2D2D]" /></label><select value={selectedPersonId} onChange={e=>setSelectedPersonId(e.target.value)} className="w-full rounded-xl border border-[#E5E0D8] p-2 text-sm"><option value="">Choose person</option>{filteredPeople.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select></div>}
      {mode === 'group' && <div><label className="text-xs font-bold uppercase text-[#7A7A7A]">Search group<input value={groupQuery} onChange={e=>setGroupQuery(e.target.value)} placeholder="Search groups" className="mt-1 mb-2 w-full rounded-xl border border-[#E5E0D8] p-2 text-sm normal-case text-[#2D2D2D]" /></label><select value={selectedGroupId} onChange={e=>setSelectedGroupId(e.target.value)} className="w-full rounded-xl border border-[#E5E0D8] p-2 text-sm"><option value="">Choose group</option>{filteredGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div>}
      <div className="rounded-2xl border border-[#E5E0D8] bg-[#F9F8F6] p-3 text-xs text-[#7A7A7A]"><strong className="text-[#2D2D2D]">Widget parameter:</strong> <code className="px-2 py-1 bg-white rounded-lg">{parameter}</code> <button className="ml-2 underline font-bold text-[#5A5A40]" onClick={() => action('Widget parameter copied.', () => copyText(parameter))}>Copy Parameter</button><p className="mt-1">Paste this into the Scriptable widget&apos;s <strong>Parameter</strong> field only if you want a custom configuration.</p></div>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm space-y-2">
        <h3 className="font-serif font-bold italic text-lg">Update Widget Data</h3>
        <p className="text-sm text-[#7A7A7A]">Re-export when people, events, groups, or preferences change. Countdowns recalculate in Scriptable; iOS controls Home Screen refresh timing.</p>
        <p className="text-sm text-[#7A7A7A]"><strong>Weekly reminder (Shortcuts):</strong> create an Apple Shortcut that runs weekly and shows “Open Important to Me → iPhone Widgets → Copy Widget Data, then import in Scriptable.”</p>
      </div>
      <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm"><h3 className="font-serif font-bold italic text-lg flex items-center gap-2"><HelpCircle className="w-5 h-5" />Troubleshooting</h3><ul className="mt-2 text-sm text-[#7A7A7A] list-disc pl-5 space-y-1"><li>No widget data: copy data here, run the script, and choose Import or Update from Clipboard.</li><li>Script not found: edit the iPhone widget and select the script named Important to Me.</li><li>Outdated widget: export and import data again, then preview in Scriptable.</li></ul></div>
    </section>

    <section className="bg-white border border-[#E5E0D8] rounded-[24px] p-5 shadow-sm text-xs text-[#7A7A7A] space-y-2">
      <h3 className="font-serif font-bold italic text-lg text-[#2D2D2D]">Helpful links</h3>
      <p><a className="underline" href={CANONICAL_APP_URL}>Open Important to Me</a> · <a className="underline" href={SCRIPTABLE_DOCS_URL}>Scriptable docs</a> · <a className="underline" href={SCRIPTABLE_WIDGET_DOCS_URL}>widgets</a> · <a className="underline" href={SCRIPTABLE_FILEMANAGER_DOCS_URL}>files</a> · <a className="underline" href={SCRIPTABLE_DOCUMENTPICKER_DOCS_URL}>document picker</a> · <a className="underline" href={SCRIPTABLE_ARGS_DOCS_URL}>parameters</a></p>
    </section>
  </div>;
}
