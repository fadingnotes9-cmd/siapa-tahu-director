import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Loader2,
  Zap,
  RotateCcw,
  FolderPlus,
  CheckCircle2
} from 'lucide-react';
import { generateEpisodeFactory } from '../utils/gemini.js';
import { getHookCalibration, saveEpisodeToFolder } from '../utils/db.js';
import { writeEpisodeToKontenFolder } from '../utils/exportEpisode.js';
import EpisodeDetailView from './EpisodeDetailView.jsx';

export default function EpisodeFactoryTab({
  apiKey,
  onOpenKeyModal,
  isActive,
  onEpisodeSaved
}) {
  const [animal, setAnimal] = useState(() => localStorage.getItem('last_factory_animal') || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
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
    }
  }, [isActive]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      onOpenKeyModal();
      return;
    }
    if (!animal.trim()) return;

    setLoading(true);
    setError('');
    setSaveNotice('');
    setIsSavedCurrent(false);

    try {
      const data = await generateEpisodeFactory(apiKey, animal);
      setResult(data);
      localStorage.setItem('last_factory_animal', animal.trim());
      localStorage.setItem('last_factory_result', JSON.stringify(data));
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
      setSaveNotice(
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

  const handleClearResult = () => {
    setResult(null);
    setAnimal('');
    setError('');
    setSaveNotice('');
    setIsSavedCurrent(false);
    localStorage.removeItem('last_factory_animal');
    localStorage.removeItem('last_factory_result');
  };

  return (
    <div className="space-y-4">
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

      {/* 1-Word Input Card */}
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
            <span className="text-[11px] text-slate-400">Search Grounded + JSON</span>
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

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Save Action Bar + Output Cards */}
      {result && (
        <div className="space-y-3.5">
          <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/40 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSaveToFolder}
              disabled={saving || isSavedCurrent}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.99] ${
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
              {isSavedCurrent
                ? 'Sudah Tersimpan di Folder Konten'
                : 'Simpan ke Folder Konten (Menu Hasil)'}
            </button>

            {saveNotice && (
              <p className="text-[11px] text-emerald-300 text-center font-medium">
                {saveNotice}
              </p>
            )}
          </div>

          <EpisodeDetailView result={result} />
        </div>
      )}
    </div>
  );
}
