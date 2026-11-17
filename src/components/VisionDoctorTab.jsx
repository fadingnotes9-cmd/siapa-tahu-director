import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Activity,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  History
} from 'lucide-react';
import { runVisualQC, runAnalyticsDoctor } from '../utils/visionGemini.js';
import { getAnalyticsHistory, getHookCalibration } from '../utils/db.js';

export default function VisionDoctorTab({ apiKey, onOpenKeyModal }) {
  const [mode, setMode] = useState('qc'); // 'qc' | 'analytics'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qcResult, setQcResult] = useState(null);
  const [docResult, setDocResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeRule, setActiveRule] = useState(null);
  const [copiedFix, setCopiedFix] = useState(false);
  const fileInputRef = useRef(null);

  const refreshStoredData = async () => {
    const [hist, rule] = await Promise.all([getAnalyticsHistory(), getHookCalibration()]);
    setHistory(hist);
    setActiveRule(rule);
  };

  useEffect(() => {
    refreshStoredData();
  }, []);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!apiKey) {
      onOpenKeyModal();
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'qc') {
        const res = await runVisualQC(apiKey, file);
        setQcResult(res);
      } else {
        const res = await runAnalyticsDoctor(apiKey, file);
        setDocResult(res);
        await refreshStoredData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menganalisis gambar dengan Gemini Vision.');
    } finally {
      setLoading(false);
    }
  };

  const copyFixPrompt = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            setMode('qc');
            setError('');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mode === 'qc'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          Mode A: Visual QC
        </button>
        <button
          onClick={() => {
            setMode('analytics');
            setError('');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mode === 'analytics'
              ? 'bg-emerald-500 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Mode B: YT Doctor
        </button>
      </div>

      {/* Upload Box */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div>
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            {mode === 'qc'
              ? 'Audit Frame 00:00 / Master Image'
              : 'Bedah Screenshot Analytics YT Studio'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'qc'
              ? 'Cek simetri 2 mata kartun, deteksi bug mulut ganda, dan skor scroll-stop detik 00:00.'
              : 'Ekstrak Views, % Tetap Menonton & Durasi ke IndexedDB + auto-kalibrasi hook Tab 1.'}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/70 flex flex-col items-center justify-center gap-2 transition active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              <span className="text-xs font-semibold text-emerald-300">
                Gemini Vision sedang mengaudit...
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">
                {mode === 'qc'
                  ? 'Upload Hasil Google Flow (PNG/JPG)'
                  : 'Upload Screenshot YT Studio Analytics'}
              </span>
              <span className="text-[11px] text-slate-500">Tap untuk pilih gambar dari galeri</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* MODE A OUTPUT: VISUAL QC */}
      {mode === 'qc' && qcResult && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
          <div className="flex items-center gap-3">
            <img
              src={qcResult.previewUrl}
              alt="QC Preview"
              className="w-16 h-24 object-cover rounded-xl border border-slate-700 shrink-0"
            />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Skor Scroll-Stop 00:00
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-sm font-black ${
                    qcResult.scroll_stop_score >= 8
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {qcResult.scroll_stop_score}/10
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{qcResult.verdict_summary}</p>
            </div>
          </div>

          {/* 2 Checklist Items */}
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              {qcResult.eye_symmetry_ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-bold text-white">
                  1. Simetri 2 Mata Kartun:{' '}
                  <span className={qcResult.eye_symmetry_ok ? 'text-emerald-400' : 'text-rose-400'}>
                    {qcResult.eye_symmetry_ok ? 'LOLOS' : 'GAGAL'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{qcResult.eye_symmetry_note}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
              {qcResult.no_double_mouth_ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-bold text-white">
                  2. Bebas Bug Mulut Ganda:{' '}
                  <span
                    className={qcResult.no_double_mouth_ok ? 'text-emerald-400' : 'text-rose-400'}
                  >
                    {qcResult.no_double_mouth_ok ? 'BERSIH' : 'TERDETEKSI BUG'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{qcResult.mouth_anatomy_note}</p>
              </div>
            </div>
          </div>

          {/* Auto Fix Prompt if score < 8 */}
          {qcResult.scroll_stop_score < 8 ? (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">
                  Skor &lt; 8 • Auto-Fix Prompt Siap Copy
                </span>
                <button
                  onClick={() => copyFixPrompt(qcResult.fix_prompt)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500 text-white active:scale-95 transition"
                >
                  {copiedFix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedFix ? 'Copied!' : 'Copy Fix'}
                </button>
              </div>
              <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-rose-500/20 font-mono leading-relaxed">
                {qcResult.fix_prompt}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300">
                Frame lolos QC! Siap lanjut render/upload.
              </span>
              <button
                onClick={() => copyFixPrompt(qcResult.fix_prompt)}
                className="text-[11px] text-emerald-400 underline"
              >
                {copiedFix ? 'Copied!' : 'Copy Polish'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE B OUTPUT: ANALYTICS DOCTOR */}
      {mode === 'analytics' && (
        <div className="space-y-3.5">
          {docResult && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">
                  Hasil Bedah: {docResult.video_topic}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  Tersimpan ke IndexedDB
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase">Views</p>
                  <p className="text-sm font-black text-white mt-0.5">{docResult.views}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase">Tetap Nonton</p>
                  <p
                    className={`text-sm font-black mt-0.5 ${
                      docResult.stayed_to_watch_pct >= 70 ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {docResult.stayed_to_watch_pct}%
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 uppercase">Avg Durasi</p>
                  <p className="text-sm font-black text-white mt-0.5">
                    {docResult.avg_watch_duration}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-[11px] font-bold text-amber-300 uppercase">1 Diagnosa Tajam</p>
                <p className="text-xs text-slate-200 leading-relaxed">{docResult.sharp_diagnosis}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <p className="text-[11px] font-bold text-emerald-300 uppercase inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Parameter Hook Tab 1 Diperbarui
                </p>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {docResult.next_hook_directive}
                </p>
              </div>
            </div>
          )}

          {/* Active Calibrated Rule */}
          {activeRule?.directive && !docResult && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-1">
              <p className="text-[11px] font-bold text-emerald-400 uppercase">
                Aturan Hook Aktif Saat Ini
              </p>
              <p className="text-xs text-slate-300">{activeRule.directive}</p>
            </div>
          )}

          {/* IndexedDB Analytics History */}
          {history.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                Riwayat Audit IndexedDB ({history.length})
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {item.video_topic}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{item.sharp_diagnosis}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {item.stayed_to_watch_pct}%
                      </span>
                      <span className="text-[10px] text-slate-500">{item.views} views</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
