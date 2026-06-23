import React, { useMemo, useState } from 'react';

export interface CreatableComboboxProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowCreate?: boolean;
}

export function uniqueCaseInsensitive(values: string[]): string[] {
  const map = new Map<string, string>();
  values.filter(v => v && v.trim()).forEach(v => { if (!map.has(v.trim().toLowerCase())) map.set(v.trim().toLowerCase(), v.trim()); });
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}

export default function CreatableCombobox({ label, value, options, onChange, placeholder, allowCreate = true }: CreatableComboboxProps) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const allOptions = useMemo(() => uniqueCaseInsensitive(options), [options]);
  const matches = allOptions.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const exact = allOptions.find(o => o.toLowerCase() === query.trim().toLowerCase());
  const entries = allowCreate && query.trim() && !exact ? [`Create “${query.trim()}”`, ...matches] : matches;
  const commit = (entry: string) => { const next = entry.startsWith('Create “') ? query.trim() : entry; onChange(next); setQuery(next); setOpen(false); };
  return <div className="relative">
    <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-1.5">{label}</label>
    <input role="combobox" aria-expanded={open} aria-autocomplete="list" value={query} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(0); }} onKeyDown={e => { if(e.key==='ArrowDown'){ e.preventDefault(); setOpen(true); setActive(a => Math.min(a+1, Math.max(entries.length-1,0))); } if(e.key==='ArrowUp'){ e.preventDefault(); setActive(a => Math.max(a-1,0)); } if(e.key==='Enter' && open && entries.length){ e.preventDefault(); commit(entries[active]); } if(e.key==='Escape'){ setOpen(false); setQuery(value); } }} className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm" />
    {open && entries.length > 0 && <div role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#E5E0D8] bg-white shadow-lg p-1">
      {entries.map((entry, i) => <button type="button" role="option" aria-selected={i===active} key={`${entry}-${i}`} onMouseDown={e => e.preventDefault()} onClick={() => commit(entry)} className={`block w-full text-left rounded-lg px-3 py-2 text-xs ${i===active?'bg-[#F5F2ED] text-[#5A5A40]':'text-[#2D2D2D]'}`}>{entry}</button>)}
    </div>}
  </div>;
}
