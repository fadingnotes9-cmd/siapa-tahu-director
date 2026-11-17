import React, { useState } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Globe,
  MessageSquare,
  Hash,
  Sparkles,
  Image as ImageIcon,
  Type,
  Clock
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
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition active:scale-95 shrink-0 ${
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

const ENDING_BADGE_MAP = {
  loop: '🔄 Natural Loop',
  dilemma: '💬 Dilemma Comment-Bait',
  teaser: '🔥 Curiosity-Gap Teaser'
};

export default function EpisodeDetailView({ result }) {
  const [activePlatform, setActivePlatform] = useState('tiktok');

  if (!result) return null;

  // Support both V2.0 and legacy V1.1 records seamlessly
  const fullVo = result.full_vo_script || result.vo_script || '';
  const wordCount =
    result.vo_word_count ??
    (fullVo ? fullVo.trim().split(/\s+/).filter(Boolean).length : 0);
  const estSeconds =
    result.vo_estimated_seconds ?? Number((wordCount / 2.6).toFixed(1));

  const scenesList = Array.isArray(result.scenes) && result.scenes.length > 0
    ? result.scenes
    : [
        { scene_number: 1, vo_segment_id: '', flow_prompt: result.scene1 },
        { scene_number: 2, vo_segment_id: '', flow_prompt: result.scene2 },
        { scene_number: 3, vo_segment_id: '', flow_prompt: result.scene3 },
        { scene_number: 4, vo_segment_id: '', flow_prompt: result.scene4 }
      ];

  const meta = result.metadata || {};
  const ytTitleMain = meta.yt_title_main || result.title || '';
  const ytTitleAlt1 = meta.yt_title_alt_1 || '';
  const ytTitleAlt2 = meta.yt_title_alt_2 || '';
  const ytDescription = meta.yt_description || result.description_ai_label || '';
  const ytTagsCsv =
    meta.yt_tags_csv ||
    (result.seo_tags || [])
      .map((t) => String(t).replace(/^#+/, '').trim())
      .filter(Boolean)
      .join(', ');
  const capcutHookText = meta.capcut_hook_text || '';

  const socialMap = {
    tiktok: {
      caption: meta.tiktok_caption || result.social_captions?.tiktok?.caption || '',
      pinned: meta.tiktok_pinned || result.social_captions?.tiktok?.pinned_comment || ''
    },
    ig_reels: {
      caption: meta.ig_caption || result.social_captions?.ig_reels?.caption || '',
      pinned: meta.ig_pinned || result.social_captions?.ig_reels?.pinned_comment || ''
    },
    fb_reels: {
      caption: meta.fb_caption || result.social_captions?.fb_reels?.caption || '',
      pinned: meta.fb_pinned || result.social_captions?.fb_reels?.pinned_comment || ''
    }
  };

  const endingLabel =
    ENDING_BADGE_MAP[result.ending_style_applied] || '🔄 Natural Loop';

  const platforms = [
    { id: 'tiktok', name: 'TikTok' },
    { id: 'ig_reels', name: 'IG Reels' },
    { id: 'fb_reels', name: 'FB Reels' }
  ];

  const sceneTags = [
    '00:00 - 00:10 (Hook)',
    '00:10 - 00:20 (Build)',
    '00:20 - 00:30 (Twist)',
    '00:30 - 00:40 (Ending)'
  ];

  return (
    <div className="space-y-3.5">
      {/* 1. Anti-Drift Lock & 4 Verified Facts */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Subject Lock V2.0
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              result.anti_drift_meta?.is_beak_or_sharp_snout
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {result.anti_drift_meta?.is_beak_or_sharp_snout
              ? 'BEAKED • NATURAL BEAK'
              : 'NON-BEAKED • CARTOON MOUTH'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
          {result.model_used && (
            <span>
              Engine: <span className="text-emerald-300 font-mono">{result.model_used}</span>
              {result.search_grounded_used ? ' • Search Grounded' : ''}
            </span>
          )}
          {result.next_teaser_animal && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
              Next Teaser: {result.next_teaser_animal}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono leading-relaxed">
          {result.anti_drift_meta?.locked_subject || result.subject_lock_en}
        </p>

        {result.verified_facts?.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              4 Fakta Biologis Terverifikasi:
            </p>
            <ul className="space-y-1">
              {result.verified_facts.map((fact, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
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

      {/* 2. Step 0 Master Image */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Step 0 • Master Reference Image
          </h3>
          <CopyButton text={result.step0_prompt} label="Copy Step 0" />
        </div>
        <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
          {result.step0_prompt}
        </p>
      </div>

      {/* 3. Paired Scene 1 - 4 (VO Segment + Google Flow 10s) */}
      <div className="space-y-2.5">
        {scenesList.map((sc, idx) => {
          const num = sc.scene_number || idx + 1;
          const flowText = sc.flow_prompt || result[`scene${num}`] || '';
          return (
            <div
              key={num}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-400">
                    Scene {num} • Google Flow 10s
                  </span>
                  <span className="ml-2 text-[10px] text-slate-400">
                    {sceneTags[idx] || ''}
                  </span>
                </div>
                <CopyButton text={flowText} label={`Copy Scene ${num}`} compact />
              </div>

              {sc.vo_segment_id && (
                <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                    Segmen VO Scene {num}:
                  </span>
                  <p className="text-xs text-slate-100 leading-relaxed">
                    "{sc.vo_segment_id}"
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                {flowText}
              </p>
            </div>
          );
        })}
      </div>

      {/* 4. Thumbnail Meme Prompt 9:16 */}
      {result.thumbnail_meme_prompt_en && (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              Thumbnail Meme 9:16 (TT / IG / FB)
            </h3>
            <CopyButton text={result.thumbnail_meme_prompt_en} label="Copy Thumb" compact />
          </div>
          <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
            {result.thumbnail_meme_prompt_en}
          </p>
        </div>
      )}

      {/* 5. Naskah VO Utuh + Word Count & Estimated Duration */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Naskah VO Utuh
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                wordCount >= 85 && wordCount <= 102
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {wordCount} kata
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-slate-700 font-semibold">
              <Clock className="w-2.5 h-2.5" />~{estSeconds} dtk
            </span>
          </div>
          <CopyButton text={fullVo} label="Copy VO Utuh" />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-medium">
            {endingLabel}
            {result.ending_type_selected === 'auto' ? ' (Auto)' : ''}
          </span>
        </div>

        <p className="text-sm text-slate-100 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-line">
          {fullVo}
        </p>
      </div>

      {/* 6. Teks Layar CapCut 0-2.5s */}
      {capcutHookText && (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider inline-flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              Teks Layar Atas CapCut (0–2.5s)
            </h3>
            <CopyButton text={capcutHookText} label="Copy Hook Text" compact />
          </div>
          <p className="text-sm font-black tracking-wide text-amber-300 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            {capcutHookText}
          </p>
        </div>
      )}

      {/* 7. Metadata YouTube Shorts (Judul Utama + 2 Alternatif, Deskripsi, 6 Tag CSV) */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Metadata YouTube Shorts
        </h3>

        {/* Judul Utama */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-300">
              Judul Utama ({ytTitleMain.length}/55)
            </span>
            <CopyButton text={ytTitleMain} label="Copy Judul" compact />
          </div>
          <p className="text-xs font-bold text-white bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            {ytTitleMain}
          </p>
        </div>

        {/* 2 Judul Alternatif */}
        {ytTitleAlt1 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-400">
                Judul Alternatif 1
              </span>
              <CopyButton text={ytTitleAlt1} label="Copy Alt 1" compact />
            </div>
            <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {ytTitleAlt1}
            </p>
          </div>
        )}

        {ytTitleAlt2 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-400">
                Judul Alternatif 2
              </span>
              <CopyButton text={ytTitleAlt2} label="Copy Alt 2" compact />
            </div>
            <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {ytTitleAlt2}
            </p>
          </div>
        )}

        {/* Deskripsi YouTube */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Deskripsi YouTube (+ AI Disclosure & Tagar)
            </span>
            <CopyButton text={ytDescription} label="Copy Deskripsi" compact />
          </div>
          <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 whitespace-pre-line leading-relaxed">
            {ytDescription}
          </p>
        </div>

        {/* 6 Tag SEO CSV */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase inline-flex items-center gap-1">
              <Hash className="w-3 h-3 text-emerald-400" /> 6 Tag SEO (Siap Paste YT Studio)
            </span>
            <CopyButton text={ytTagsCsv} label="Copy 6 Tag" compact />
          </div>
          <p className="text-xs text-emerald-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono">
            {ytTagsCsv}
          </p>
        </div>
      </div>

      {/* 8. Multi-Platform Social Kit (TikTok, IG Reels, FB Reels) */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Distribusi TikTok, IG & FB Reels
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
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

        {socialMap[activePlatform] && (
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Caption</span>
                <CopyButton
                  text={socialMap[activePlatform].caption}
                  label="Copy Caption"
                  compact
                />
              </div>
              <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800 whitespace-pre-line">
                {socialMap[activePlatform].caption}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-emerald-400" /> Pinned Comment
                </span>
                <CopyButton
                  text={socialMap[activePlatform].pinned}
                  label="Copy Pinned"
                  compact
                />
              </div>
              <p className="text-xs text-emerald-200 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                {socialMap[activePlatform].pinned}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
