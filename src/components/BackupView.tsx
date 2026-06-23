import React, { useState, useEffect, useId } from 'react';
import { 
  Download, Upload, ShieldAlert, CheckCircle, Database, AlertCircle,
  Play, Trash2, HelpCircle, Loader2, RefreshCw, FileText, Share2, Star
} from 'lucide-react';
import { checkAndRequestPersistence } from '../database/db';
import { seedDemoData, flushAllAndReset } from '../database/demo';
import { exportBackup, parseAndPreviewBackup, executeImport, type ImportPreview } from '../features/backup/backupService';

interface BackupViewProps {
  onRefreshData: () => void;
}

export default function BackupView({ onRefreshData }: BackupViewProps) {
  const [persistenceGranted, setPersistenceGranted] = useState(false);
  const [diskUsage, setDiskUsage] = useState<number>(0);
  const [diskQuota, setDiskQuota] = useState<number>(1);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [selectedResolutions, setSelectedResolutions] = useState<{ [id: string]: 'use-incoming' | 'keep-existing' }>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fileInputId = useId();

  useEffect(() => {
    loadStorageMetrics();
  }, []);

  const loadStorageMetrics = async () => {
    try {
      const stats = await checkAndRequestPersistence();
      setPersistenceGranted(stats.granted);
      setDiskUsage(stats.usage);
      setDiskQuota(stats.quota);
    } catch (e) {
      console.warn('Storage assessment failed', e);
    }
  };

  const handleExportBackup = async (includePhotos: boolean) => {
    try {
      setExporting(true);
      const backupBlob = await exportBackup(includePhotos);
      
      // Trigger native browser download
      const url = URL.createObjectURL(backupBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ImportantDates-Backup-${new Date().toISOString().slice(0, 10)}.importantdates`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatusMessage({ type: 'ok', text: 'Backup downloaded successfully! Store it safely.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setExporting(false);
    }
  };

  const handleFileImportSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setImporting(true);
      setStatusMessage(null);
      const preview = await parseAndPreviewBackup(files[0]);
      setImportPreview(preview);
      
      // Pre-set conflicts default as keeping existing
      const initialResolutions: { [id: string]: 'use-incoming' | 'keep-existing' } = {};
      preview.duplicates.people.forEach(dup => {
        initialResolutions[dup.incoming.id] = 'keep-existing';
      });
      preview.duplicates.events.forEach(dup => {
        initialResolutions[dup.incoming.id] = 'keep-existing';
      });
      setSelectedResolutions(initialResolutions);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Parse error: ${err.message}` });
    } finally {
      setImporting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview) return;
    
    try {
      setImporting(true);
      const results = await executeImport(importPreview, importMode, selectedResolutions);
      setStatusMessage({
        type: 'ok',
        text: `Successfully imported ${results.peopleSaved} people profiles and ${results.eventsSaved} history events!`
      });
      setImportPreview(null);
      onRefreshData();
      loadStorageMetrics();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Import failed: ${err.message}` });
    } finally {
      setImporting(false);
    }
  };

  // Seeding/Flushing actions
  const handleSeedMockData = () => {
    setShowSeedConfirm(true);
  };

  const handleClearDatabase = () => {
    setShowClearConfirm(true);
  };

  const megabytesUsed = (diskUsage / (1024 * 1024)).toFixed(2);
  const megabytesQuota = (diskQuota / (1024 * 1024)).toFixed(0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto select-none">
      <div>
        <h2 className="text-4xl font-serif font-bold italic text-[#5A5A40] tracking-tight">Backups</h2>
        <p className="text-[#7A7A7A] text-sm">Review browser storage usage and export or restore local backups.</p>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
          statusMessage.type === 'ok' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-[#8C6A5D]'
        }`}>
          {statusMessage.type === 'ok' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p>{statusMessage.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Persistence and storage metrics column */}
        <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-serif font-bold italic text-[#2D2D2D] flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#8C6A5D]" /> Space & Quota metrics
          </h3>

          <div className="space-y-3">
            <div className="p-4 bg-[#F5F2ED]/40 rounded-xl border border-[#E5E0D8] text-center">
              <span className="text-2xl font-serif font-bold text-[#2D2D2D]">{megabytesUsed} MB</span>
              <span className="block text-[10px] text-[#7A7A7A] uppercase font-bold tracking-wider mt-1">Estimated storage used</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#2D2D2D]">
                <span>Persistent storage:</span>
                <span className={`font-bold ${persistenceGranted ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {persistenceGranted ? 'Persistence requested' : 'Best effort'}
                </span>
              </div>
              <p className="text-[10px] text-[#7A7A7A] leading-normal">
                Browser storage can still be cleared by browser settings or device cleanup. Export regular backups to protect your data.
              </p>
            </div>
          </div>
        </div>

        {/* Import / Export center column */}
        <div className="md:col-span-2 bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-5 shadow-sm">
          <h3 className="text-sm font-serif font-bold italic text-[#2D2D2D]">Backup and Restore</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export box */}
            <div className="bg-[#F5F2ED]/40 p-5 rounded-xl border border-[#E5E0D8] space-y-4 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#2D2D2D]">Export Backup</h4>
                <p className="text-xs text-[#7A7A7A] leading-normal">Exports records and photos into a `.importantdates` backup file.</p>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => handleExportBackup(true)}
                  disabled={exporting}
                  className="w-full py-2.5 px-4 bg-[#5A5A40] hover:bg-opacity-95 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-none border-0"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Preparing Backup...' : 'Download Full Backup (with photos)'}
                </button>
                <button 
                  onClick={() => handleExportBackup(false)}
                  disabled={exporting}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#F5F2ED] text-[#5A5A40] text-xs font-bold rounded-xl transition border border-[#E5E0D8] cursor-pointer disabled:opacity-50"
                >
                  Download Lightweight Backup (JSON only)
                </button>
              </div>
            </div>

            {/* Import box */}
            <div className="bg-[#F5F2ED]/40 p-5 rounded-xl border border-[#E5E0D8] space-y-4 flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#2D2D2D]">Import Backup</h4>
                <p className="text-xs text-[#7A7A7A] leading-normal">Choose a backup file, preview its contents, and import with merge or replace behavior.</p>
              </div>

              <div>
                <button 
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  disabled={importing}
                  className="w-full py-2.5 px-4 bg-[#8C6A5D] hover:opacity-95 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Select Backup File
                </button>
                <input 
                  id={fileInputId}
                  type="file" 
                  accept=".importantdates,.zip" 
                  className="hidden" 
                  onChange={handleFileImportSelected}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collision resolution overlay / preview section */}
      {importPreview && (
        <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-3">
            <div>
              <h3 className="text-base font-serif font-bold italic text-[#2D2D2D] flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-[#8C6A5D]" />
                Upload Review: '{importPreview.metadata.timestamp.slice(0, 10)}'
              </h3>
              <p className="text-xs text-[#7A7A7A]">Manifest: version {importPreview.metadata.appVersion} • {importPreview.metadata.peopleCount} profiles, {importPreview.metadata.eventCount} milestones.</p>
            </div>
            <button 
              onClick={() => setImportPreview(null)}
              className="py-1.5 px-3 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] rounded-xl text-xs text-[#5A5A40] font-bold cursor-pointer"
            >
              Cancel Import
            </button>
          </div>

          {/* Mode choose replace vs merge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#7A7A7A]">Import Strategy Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    importMode === 'merge' 
                      ? 'bg-[#5A5A40]/10 border-[#5A5A40] text-[#5A5A40]' 
                      : 'bg-white border-[#E5E0D8] text-[#7A7A7A]'
                  }`}
                >
                  <span>Merge into current entries</span>
                  <p className="text-[10px] text-[#7A7A7A] font-normal mt-0.5 text-center">Keeps current profiles and selectively overwrites conflicts.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    importMode === 'replace' 
                      ? 'bg-[#8C6A5D]/10 border-[#8C6A5D] text-[#8C6A5D]' 
                      : 'bg-white border-[#E5E0D8] text-[#7A7A7A]'
                  }`}
                >
                  <span>Wipe & replace everything</span>
                  <p className="text-[10px] text-[#7A7A7A] font-normal mt-0.5 text-center">Deletes current local registries, replacing fully from backup file.</p>
                </button>
              </div>
            </div>

            {/* Conflicts resolution options mapper */}
            {importMode === 'merge' && (
              <div className="bg-[#F5F2ED]/40 p-4 rounded-xl border border-[#E5E0D8] space-y-4 max-h-56 overflow-y-auto">
                <h4 className="text-xs font-bold uppercase text-[#2D2D2D]">Overlapping Conflicts Found ({importPreview.duplicates.people.length + importPreview.duplicates.events.length})</h4>
                
                {importPreview.duplicates.people.length === 0 && importPreview.duplicates.events.length === 0 ? (
                  <p className="text-xs text-[#7A7A7A]">No overlapping biography keys. Ready to merge safely.</p>
                ) : (
                  <div className="space-y-3">
                    {importPreview.duplicates.people.map(dup => (
                      <div key={dup.incoming.id} className="flex justify-between items-center bg-white p-2.5 rounded border border-[#E5E0D8] text-xs">
                        <div>
                          <span className="font-bold text-[#2D2D2D] block">{dup.incoming.displayName}</span>
                          <span className="text-[10px] text-[#7A7A7A]">Birthdate: {dup.incoming.dob}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedResolutions(prev => ({ ...prev, [dup.incoming.id]: 'use-incoming' }))}
                            className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition cursor-pointer ${
                              selectedResolutions[dup.incoming.id] === 'use-incoming'
                                ? 'bg-[#5A5A40] text-white border-0'
                                : 'bg-[#F5F2ED] text-[#7A7A7A]'
                            }`}
                          >
                            Use Backup
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedResolutions(prev => ({ ...prev, [dup.incoming.id]: 'keep-existing' }))}
                            className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition cursor-pointer ${
                              selectedResolutions[dup.incoming.id] === 'keep-existing'
                                ? 'bg-[#5A5A40] text-white border-0'
                                : 'bg-[#F5F2ED] text-[#7A7A7A]'
                            }`}
                          >
                            Keep mine
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={handleCommitImport}
            className="w-full py-3 bg-[#5A5A40] text-white text-sm font-bold rounded-xl cursor-pointer"
          >
            Authorize Data Restoration
          </button>
        </div>
      )}

      {/* Diagnostics / Tester controls (Seeding/Teardown) */}
      <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-serif font-bold italic text-[#2D2D2D] flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Demo Sandbox Utilities
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F5F2ED]/40 rounded-xl border border-[#E5E0D8] flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#2D2D2D]">Load Mock Characters</span>
              <p className="text-[11px] text-[#7A7A7A] leading-normal">Immediately registers fictional diagnostic entries with custom variables (Maverick, Myles, Adaline) to live preview widgets and lists.</p>
            </div>
            <button 
              onClick={handleSeedMockData}
              className="mt-4 w-full py-2 px-3 bg-white hover:bg-[#F5F2ED] text-[#5A5A40] font-bold text-xs rounded-lg transition border border-[#E5E0D8] cursor-pointer"
            >
              Seed Fictional Dataset
            </button>
          </div>

          <div className="p-4 bg-[#F5F2ED]/40 rounded-xl border border-[#E5E0D8] flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#8C6A5D]">Teardown/Purge Directory</span>
              <p className="text-[11px] text-[#7A7A7A] leading-normal">Erases local records, groups, photos, settings, and widget payloads from this browser.</p>
            </div>
            <button 
              onClick={handleClearDatabase}
              className="mt-4 w-full py-2 px-3 bg-[#8C6A5D] hover:opacity-90 text-white font-bold text-xs rounded-lg transition cursor-pointer border-0"
            >
              Flush All Device Data
            </button>
          </div>
        </div>
      </div>

      {showSeedConfirm && (
        <div className="fixed inset-0 z-50 bg-[#2D2D2D]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-serif font-bold italic text-[#2D2D2D]">Seed Mock Data?</h3>
            <p className="text-xs text-[#7A7A7A] leading-relaxed">
              Populate database with demo coordinates? Fictional characters (Maverick, Adaline, Myles) will be registered into your directory.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={() => setShowSeedConfirm(false)}
                className="flex-1 py-2 px-4 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] text-[#5A5A40] text-xs font-bold uppercase rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setShowSeedConfirm(false);
                  await seedDemoData();
                  onRefreshData();
                  loadStorageMetrics();
                  setStatusMessage({ type: 'ok', text: 'Loaded fictional demo dataset!' });
                }}
                className="flex-1 py-2 px-4 bg-[#5A5A40] hover:bg-opacity-95 text-white text-xs font-bold uppercase rounded-xl transition cursor-pointer border-0"
              >
                Seed Data
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-[#2D2D2D]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-serif font-bold italic text-[#2D2D2D]">Clear Database?</h3>
            <p className="text-xs text-[#7A7A7A] leading-relaxed">
              Warning! This clears all offline database logs, files, custom criteria, and configurations from this device cache permanently and irreversibly.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 px-4 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] text-[#5A5A40] text-xs font-bold uppercase rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setShowClearConfirm(false);
                  await flushAllAndReset();
                  onRefreshData();
                  loadStorageMetrics();
                  setStatusMessage({ type: 'ok', text: 'Database cache cleared successfully.' });
                }}
                className="flex-1 py-2 px-4 bg-[#8C6A5D] hover:opacity-95 text-white text-xs font-bold uppercase rounded-xl transition cursor-pointer border-0"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
