import React, { useState } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Globe,
  MessageSquare,
  Hash
} from 'lucide-react';

export function CopyButton({ text, label = 'Copy', compact = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition active:scale-95 ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      } ${
        copied
          ? 'bg-emerald-500 text-slate-950 font-semibold'
          : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

export default function EpisodeDetailView({ result }) {
  const [activePlatform, setActivePlatform] = useState('yt_shorts');

  if (!result) return null;

  const wordCount = result?.vo_script
    ? result.vo_script.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const platforms = [
    { id: 'yt_shorts', name: 'YT Shorts' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'ig_reels', name: 'IG Reels' },
    { id: 'fb_reels', name: 'FB Reels' }
  ];

  return (
    <div className="space-y-3.5">
      {/* Anti-Drift Lock Status */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Anti-Drift Physical Lock
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              result.anti_drift_meta?.is_beak_or_sharp_snout
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {result.anti_drift_meta?.is_beak_or_sharp_snout
              ? 'BEAK + FRONT-FACING'
              : 'STANDARD MACRO'}
          </span>
        </div>
        {result.model_used && (
          <p className="text-[10px] text-slate-400">
            Engine: <span className="text-emerald-300 font-mono">{result.model_used}</span>
            {result.search_grounded_used ? ' • Search Grounded' : ''}
          </p>
        )}
        <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono leading-relaxed">
          {result.anti_drift_meta?.locked_subject}
        </p>
        {result.verified_facts?.length > 0 && (
          <ul className="space-y-1 pt-1">
            {result.verified_facts.map((fact, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        )}
        {result.grounding_sources?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Globe className="w-3 h-3 text-slate-400" />
            {result.grounding_sources.map((src, i) => (
              <a
                key={i}
                href={src.uri}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-400/90 underline truncate max-w-[140px]"
              >
                {src.title || 'Sumber Riset'}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Step 0 Master Image */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Step 0 • Master Reference Image
          </h3>
          <CopyButton text={result.step0_prompt} label="Copy Step 0" />
        </div>
        <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
          {result.step0_prompt}
        </p>
      </div>

      {/* Scene 1 - 4 Google Flow */}
      <div className="space-y-2.5">
        {[
          { num: 1, text: result.scene1, tag: '00:00 - 00:10 (Hook)' },
          { num: 2, text: result.scene2, tag: '00:10 - 00:20 (Build)' },
          { num: 3, text: result.scene3, tag: '00:20 - 00:30 (Twist)' },
          { num: 4, text: result.scene4, tag: '00:30 - 00:40 (Loop)' }
        ].map((sc) => (
          <div
            key={sc.num}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400">
                  Scene {sc.num} • Google Flow 10s
                </span>
                <span className="ml-2 text-[10px] text-slate-400">{sc.tag}</span>
              </div>
              <CopyButton text={sc.text} label={`Scene ${sc.num}`} compact />
            </div>
            <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
              {sc.text}
            </p>
          </div>
        ))}
      </div>

      {/* Naskah VO Seamless Loop */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Naskah VO Seamless Loop
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                wordCount >= 88 && wordCount <= 102
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {wordCount} kata
            </span>
          </div>
          <CopyButton text={result.vo_script} label="Copy VO" />
        </div>
        <p className="text-sm text-slate-100 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-line">
          {result.vo_script}
        </p>
      </div>

      {/* Metadata SEO */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Judul</span>
            <CopyButton text={result.title} label="Copy Judul" compact />
          </div>
          <p className="text-xs font-semibold text-white bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            {result.title}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Deskripsi + Label AI
            </span>
            <CopyButton text={result.description_ai_label} label="Copy Deskripsi" compact />
          </div>
          <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 whitespace-pre-line">
            {result.description_ai_label}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase inline-flex items-center gap-1">
              <Hash className="w-3 h-3 text-emerald-400" /> 6 Tag SEO
            </span>
            <CopyButton
              text={(result.seo_tags || []).join(', ')}
              label="Copy Tags"
              compact
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(result.seo_tags || []).map((tag, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300"
              >
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Platform Captions & Pinned Comments */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Distribusi Multi-Platform
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {platforms.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`py-1.5 rounded-lg text-[11px] font-semibold transition ${
                activePlatform === p.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {result.social_captions?.[activePlatform] && (
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Caption</span>
                <CopyButton
                  text={result.social_captions[activePlatform].caption}
                  label="Copy Caption"
                  compact
                />
              </div>
              <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800 whitespace-pre-line">
                {result.social_captions[activePlatform].caption}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-emerald-400" /> Pinned Comment
                </span>
                <CopyButton
                  text={result.social_captions[activePlatform].pinned_comment}
                  label="Copy Pinned"
                  compact
                />
              </div>
              <p className="text-xs text-emerald-200 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                {result.social_captions[activePlatform].pinned_comment}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
