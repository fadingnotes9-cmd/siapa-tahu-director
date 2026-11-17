import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Search,
  Trash2,
  ArrowLeft,
  FileDown,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { getSavedEpisodes, deleteSavedEpisode } from '../utils/db.js';
import { writeEpisodeToKontenFolder } from '../utils/exportEpisode.js';
import EpisodeDetailView from './EpisodeDetailView.jsx';

export default function SavedResultsTab({ refreshSignal, onCountChange }) {
  const [episodes, setEpisodes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [exportStatus, setExportStatus] = useState('');

  const loadEpisodes = async () => {
    const list = await getSavedEpisodes();
    setEpisodes(list);
    if (onCountChange) onCountChange(list.length);
  };

  useEffect(() => {
    loadEpisodes();
  }, [refreshSignal]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteSavedEpisode(id);
    if (selectedEpisode?.id === id) {
      setSelectedEpisode(null);
    }
    await loadEpisodes();
  };

  const handleExportTxt = async (e, ep) => {
    e.stopPropagation();
    const res = await writeEpisodeToKontenFolder(ep, true);
    setExportStatus(
      res.savedToDevice
        ? `Diekspor ke ${res.path}`
        : 'File TXT berhasil disiapkan.'
    );
    setTimeout(() => setExportStatus(''), 3000);
  };

  const filtered = episodes.filter((ep) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (ep.animal_name || '').toLowerCase().includes(q) ||
      (ep.title || '').toLowerCase().includes(q)
    );
  });

  if (selectedEpisode) {
    return (
      <div className="space-y-3.5">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedEpisode(null);
              setExportStatus('');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Folder Konten
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => handleExportTxt(e, selectedEpisode)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              Export TXT
            </button>
            <button
              type="button"
              onClick={(e) => handleDelete(e, selectedEpisode.id)}
              className="p-1.5 rounded-lg bg-rose-950/50 text-rose-400 border border-rose-500/30 hover:bg-rose-900/50"
              title="Hapus Episode"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {exportStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportStatus}</span>
          </div>
        )}

        <div className="px-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Arsip Produksi • {new Date(selectedEpisode.savedAt).toLocaleString('id-ID')}
          </span>
          <h2 className="text-base font-extrabold text-white capitalize mt-0.5">
            {selectedEpisode.animal_name} — {selectedEpisode.title}
          </h2>
        </div>

        <EpisodeDetailView result={selectedEpisode} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Folder Konten */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Folder Konten & Hasil
              </h2>
              <p className="text-[11px] text-slate-400">
                Documents/SiapaTahu_Konten • {episodes.length} episode
              </p>
            </div>
          </div>
        </div>

        {episodes.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama hewan atau judul..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {exportStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportStatus}</span>
          </div>
        )}
      </div>

      {/* List Saved Episodes */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">
            {episodes.length === 0
              ? 'Folder Konten Masih Kosong'
              : 'Episode tidak ditemukan'}
          </p>
          <p className="text-[11px] text-slate-500">
            {episodes.length === 0
              ? 'Generate episode di Tab Factory lalu tekan "Simpan ke Folder Konten".'
              : 'Coba kata kunci hewan lain.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((ep) => {
            const words = (ep.vo_script || '').trim().split(/\s+/).filter(Boolean).length;
            return (
              <div
                key={ep.id}
                onClick={() => setSelectedEpisode(ep)}
                className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-emerald-400 uppercase">
                        {ep.animal_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                        {words} kata VO
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white mt-1 line-clamp-1">
                      {ep.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleExportTxt(e, ep)}
                      className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800"
                      title="Export ke TXT"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, ep.id)}
                      className="p-2 rounded-lg bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/70">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(ep.savedAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-emerald-400/80 font-medium">Tap untuk buka & copy →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
