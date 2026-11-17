import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Loader2,
  Zap,
  RotateCcw,
  FolderPlus,
  CheckCircle2,
  FileDown,
  Flame
} from 'lucide-react';
import { generateEpisodeFactory, ENDING_OPTIONS } from '../utils/gemini.js';
import { getHookCalibration, saveEpisodeToFolder } from '../utils/db.js';
import { writeEpisodeToKontenFolder } from '../utils/exportEpisode.js';
import EpisodeDetailView from './EpisodeDetailView.jsx';

export default function EpisodeFactoryTab({
  apiKey,
  deepseekKey,
  factoryProvider,
  onOpenKeyModal,
  isActive,
  onEpisodeSaved
}) {
  const [animal, setAnimal] = useState(() => localStorage.getItem('last_factory_animal') || '');
  const [endingType, setEndingType] = useState(
    () => localStorage.getItem('last_factory_ending_type') || 'auto'
  );
  const [nextTeaser, setNextTeaser] = useState(
    () => localStorage.getItem('next_teaser') || ''
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [isSavedCurrent, setIsSavedCurrent] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(() => {
    try {
      const saved = localStorage.getItem('last_factory_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeCalibration, setActiveCalibration] = useState(null);

  useEffect(() => {
    if (isActive) {
      getHookCalibration().then(setActiveCalibration);
      setNextTeaser(localStorage.getItem('next_teaser') || '');
    }
  }, [isActive]);

  const handleEndingChange = (e) => {
    const val = e.target.value;
    setEndingType(val);
    localStorage.setItem('last_factory_ending_type', val);
  };

  const handleApplyTeaser = () => {
    if (!nextTeaser) return;
    setAnimal(nextTeaser);
    localStorage.removeItem('next_teaser');
    setNextTeaser('');
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!apiKey && !deepseekKey) {
      onOpenKeyModal();
      return;
    }
    if (!animal.trim()) return;

    setLoading(true);
    setError('');
    setActionNotice('');
    setIsSavedCurrent(false);

    try {
      const data = await generateEpisodeFactory(
        { geminiKey: apiKey, deepseekKey, provider: factoryProvider },
        animal,
        endingType
      );
      setResult(data);
      localStorage.setItem('last_factory_animal', animal.trim());
      localStorage.setItem('last_factory_ending_type', endingType);
      localStorage.setItem('last_factory_result', JSON.stringify(data));

      if (data.next_teaser_animal && data.next_teaser_animal.trim()) {
        const cleanTeaser = data.next_teaser_animal.trim();
        localStorage.setItem('next_teaser', cleanTeaser);
        setNextTeaser(cleanTeaser);
      }
    } catch (err) {
      setError(err.message || 'Gagal menghasilkan paket episode.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToFolder = async () => {
    if (!result || saving) return;
    setSaving(true);
    setError('');

    try {
      const savedRecord = await saveEpisodeToFolder(result);
      const fileExport = await writeEpisodeToKontenFolder(savedRecord, false);
      setIsSavedCurrent(true);
      setActionNotice(
        fileExport.savedToDevice
          ? `Tersimpan ke Menu Hasil & ${fileExport.path}`
          : 'Tersimpan ke Folder Konten (Menu Hasil)!'
      );
      if (onEpisodeSaved) onEpisodeSaved();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan episode ke Folder Konten.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTxt = async () => {
    if (!result) return;
    const res = await writeEpisodeToKontenFolder(result, true);
    setActionNotice(
      res.savedToDevice
        ? `File TXT diekspor ke ${res.path}`
        : 'File TXT siap!'
    );
  };

  const handleClearResult = () => {
    setResult(null);
    setAnimal('');
    setError('');
    setActionNotice('');
    setIsSavedCurrent(false);
    localStorage.removeItem('last_factory_animal');
    localStorage.removeItem('last_factory_result');
  };

  const engineBadge =
    factoryProvider === 'deepseek' || (factoryProvider === 'auto' && deepseekKey)
      ? 'DeepSeek-Chat • V2.0'
      : 'Gemini • V2.0';

  return (
    <div className="space-y-4">
      {/* Smart Teaser Memory Banner */}
      {nextTeaser && (
        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-100 truncate">
              Hutang Teaser Episode Kemarin:{' '}
              <strong className="text-amber-300">{nextTeaser}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyTeaser}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 transition active:scale-95"
          >
            Isi Otomatis
          </button>
        </div>
      )}

      {/* Active Hook Calibration Banner */}
      {activeCalibration?.directive && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
              Analytics Doctor Hook Active
            </p>
            <p className="text-xs text-slate-300 mt-0.5">{activeCalibration.directive}</p>
          </div>
        </div>
      )}

      {/* 1-Word Input + Gaya Ending Form Card */}
      <form
        onSubmit={handleGenerate}
        className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
      >
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            1-Word Episode Factory
          </label>
          {result ? (
            <button
              type="button"
              onClick={handleClearResult}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-300 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">{engineBadge}</span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={animal}
            onChange={(e) => setAnimal(e.target.value)}
            placeholder="Ketik 1 hewan (cth: Bunglon)"
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !animal.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-1.5 transition shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Riset...' : 'Generate'}
          </button>
        </div>

        {/* Dropdown Gaya Ending */}
        <div className="space-y-1">
          <label
            htmlFor="endingTypeSelect"
            className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
          >
            Gaya Ending
          </label>
          <select
            id="endingTypeSelect"
            value={endingType}
            onChange={handleEndingChange}
            disabled={loading}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            {ENDING_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Save & Download TXT Action Bar + Output Cards */}
      {result && (
        <div className="space-y-3.5">
          <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveToFolder}
                disabled={saving || isSavedCurrent}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99] ${
                  isSavedCurrent
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSavedCurrent ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <FolderPlus className="w-4 h-4" />
                )}
                {isSavedCurrent ? 'Tersimpan di Hasil' : 'Simpan ke Hasil'}
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition active:scale-95 shrink-0"
              >
                <FileDown className="w-4 h-4" />
                Download .TXT
              </button>
            </div>

            {actionNotice && (
              <p className="text-[11px] text-emerald-300 text-center font-medium">
                {actionNotice}
              </p>
            )}
          </div>

          <EpisodeDetailView result={result} />
        </div>
      )}
    </div>
  );
}
