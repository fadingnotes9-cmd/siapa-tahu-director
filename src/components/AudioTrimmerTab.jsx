import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Upload,
  Share2,
  Download,
  Loader2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Volume2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { trimSilenceForLoop } from '../utils/audioTrimmer.js';

export default function AudioTrimmerTab() {
  const [sourceFile, setSourceFile] = useState(null);
  const [thresholdDb, setThresholdDb] = useState(-36);
  const [processing, setProcessing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (result?.previewUrl) {
        URL.revokeObjectURL(result.previewUrl);
      }
    };
  }, [result]);

  const processAudio = async (file, dbVal) => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setShareStatus('');

    try {
      const trimmed = await trimSilenceForLoop(file, { thresholdDb: dbVal });
      setResult((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return trimmed;
      });
    } catch (err) {
      setError(err.message || 'Gagal memproses audio. Pastikan format MP3/WAV valid.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setSourceFile(file);
    processAudio(file, thresholdDb);
  };

  const handleThresholdCommit = () => {
    if (sourceFile) {
      processAudio(sourceFile, thresholdDb);
    }
  };

  const handleShareToCapCut = async () => {
    if (!result) return;
    setSharing(true);
    setError('');
    setShareStatus('');

    const cleanBaseName = (sourceFile?.name || 'vo_siapa_tahu')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const outFileName = `${cleanBaseName}_loop005s.wav`;

    try {
      if (Capacitor.isNativePlatform()) {
        const saved = await Filesystem.writeFile({
          path: outFileName,
          data: result.base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: outFileName,
          text: 'Audio VO Seamless Loop (0.05s gap) - Siapa Tahu Director',
          url: saved.uri,
          dialogTitle: 'Share ke CapCut'
        });
        setShareStatus('Intent Share terbuka! Pilih CapCut di menu bagikan Android.');
      } else if (navigator.canShare && navigator.share) {
        const wavFile = new File([result.wavBlob], outFileName, { type: 'audio/wav' });
        if (navigator.canShare({ files: [wavFile] })) {
          await navigator.share({
            files: [wavFile],
            title: outFileName
          });
          setShareStatus('Berhasil membuka Share Sheet.');
        } else {
          throw new Error('Browser tidak mendukung share file langsung.');
        }
      } else {
        const link = document.createElement('a');
        link.href = result.previewUrl;
        link.download = outFileName;
        link.click();
        setShareStatus('Mode Web: File WAV diunduh langsung.');
      }
    } catch (err) {
      if (!String(err?.message || '').toLowerCase().includes('cancel')) {
        setError(err.message || 'Gagal membagikan file audio.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Upload Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Instant Loop Audio Trimmer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pangkas otomatis jeda hening antar kalimat menjadi <strong className="text-white">0.05 detik</strong> (Web Audio API murni).
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shrink-0">
            0.05s Gap
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/70 flex flex-col items-center justify-center gap-2 transition active:scale-[0.99]"
        >
          {processing ? (
            <>
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              <span className="text-xs font-semibold text-emerald-300">
                Memangkas jeda hening AudioBuffer...
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">
                {sourceFile ? sourceFile.name : 'Upload Rekaman / TTS (MP3 / WAV)'}
              </span>
              <span className="text-[11px] text-slate-500">
                Tap untuk memilih file suara VO
              </span>
            </>
          )}
        </button>

        {/* Sensitivity Slider */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 inline-flex items-center gap-1">
              <Sliders className="w-3 h-3 text-emerald-400" /> Ambang Senyap (Threshold)
            </span>
            <span className="font-mono font-bold text-emerald-300">{thresholdDb} dB</span>
          </div>
          <input
            type="range"
            min="-48"
            max="-24"
            step="1"
            value={thresholdDb}
            onChange={(e) => setThresholdDb(Number(e.target.value))}
            onMouseUp={handleThresholdCommit}
            onTouchEnd={handleThresholdCommit}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-48 dB (Suara pelan)</span>
            <span>-36 dB (Standar)</span>
            <span>-24 dB (Ruangan ramai)</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Processed Result Card */}
      {result && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Scissors className="w-4 h-4" />
              Audio Loop Siap Pakai
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {result.cutsCount} jeda dipangkas
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Asli</p>
              <p className="text-sm font-bold text-slate-300 mt-0.5">
                {result.originalDuration.toFixed(2)}s
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-center">
              <p className="text-[10px] text-emerald-400 uppercase">Hasil Loop</p>
              <p className="text-sm font-black text-emerald-400 mt-0.5">
                {result.trimmedDuration.toFixed(2)}s
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Hemat</p>
              <p className="text-sm font-bold text-amber-300 mt-0.5">
                -{result.savedSeconds.toFixed(2)}s
              </p>
            </div>
          </div>

          {/* Native Audio Preview */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Preview Hasil Pemotongan (16-bit WAV)
            </div>
            <audio
              controls
              src={result.previewUrl}
              className="w-full h-10 rounded-lg"
            />
          </div>

          {/* Direct Share to CapCut CTA */}
          <div className="flex gap-2">
            <button
              onClick={handleShareToCapCut}
              disabled={sharing}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              Share Langsung ke CapCut
            </button>

            <a
              href={result.previewUrl}
              download="siapa_tahu_loop_005s.wav"
              className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition"
              title="Simpan WAV"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>

          {shareStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{shareStatus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
