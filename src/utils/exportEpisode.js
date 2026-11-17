import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export function formatEpisodeAsText(ep) {
  const meta = ep.metadata || {};
  const ytTitleMain = meta.yt_title_main || ep.title || '-';
  const ytTitleAlt1 = meta.yt_title_alt_1 || '-';
  const ytTitleAlt2 = meta.yt_title_alt_2 || '-';
  const ytDescription = meta.yt_description || ep.description_ai_label || '-';
  const ytTagsCsv =
    meta.yt_tags_csv ||
    (ep.seo_tags || [])
      .map((t) => String(t).replace(/^#+/, '').trim())
      .filter(Boolean)
      .join(', ');
  const capcutHook = meta.capcut_hook_text || '-';

  const fullVo = ep.full_vo_script || ep.vo_script || '-';
  const wordCount =
    ep.vo_word_count ??
    (fullVo !== '-' ? fullVo.trim().split(/\s+/).filter(Boolean).length : 0);
  const estSec = ep.vo_estimated_seconds ?? Number((wordCount / 2.6).toFixed(1));

  const facts = (ep.verified_facts || [])
    .map((f, i) => `${i + 1}. ${f}`)
    .join('\n');

  const scenesBlock =
    Array.isArray(ep.scenes) && ep.scenes.length > 0
      ? ep.scenes
          .map(
            (sc, idx) =>
              `[SCENE ${sc.scene_number || idx + 1} • GOOGLE FLOW 10S]\n` +
              `VO Segmen : ${sc.vo_segment_id || '-'}\n` +
              `Prompt    : ${sc.flow_prompt || ep[`scene${idx + 1}`] || '-'}`
          )
          .join('\n\n')
      : [
          `[SCENE 1]\n${ep.scene1 || '-'}`,
          `[SCENE 2]\n${ep.scene2 || '-'}`,
          `[SCENE 3]\n${ep.scene3 || '-'}`,
          `[SCENE 4]\n${ep.scene4 || '-'}`
        ].join('\n\n');

  const ttCap = meta.tiktok_caption || ep.social_captions?.tiktok?.caption || '-';
  const ttPin = meta.tiktok_pinned || ep.social_captions?.tiktok?.pinned_comment || '-';
  const igCap = meta.ig_caption || ep.social_captions?.ig_reels?.caption || '-';
  const igPin = meta.ig_pinned || ep.social_captions?.ig_reels?.pinned_comment || '-';
  const fbCap = meta.fb_caption || ep.social_captions?.fb_reels?.caption || '-';
  const fbPin = meta.fb_pinned || ep.social_captions?.fb_reels?.pinned_comment || '-';

  return [
    `============================================================`,
    `SIAPA TAHU DIRECTOR V2.0 — PAKET PRODUKSI SIAP UPLOAD`,
    `Hewan          : ${ep.animal_name || '-'}`,
    `Gaya Ending    : ${ep.ending_style_applied || 'loop'}`,
    `Next Teaser    : ${ep.next_teaser_animal || '-'}`,
    `Waktu Produksi : ${new Date(ep.savedAt || Date.now()).toLocaleString('id-ID')}`,
    `============================================================`,
    ``,
    `[SUBJECT LOCK EN]`,
    ep.subject_lock_en || ep.anti_drift_meta?.locked_subject || '-',
    ``,
    `[4 FAKTA ANATOMI & BIOLOGIS]`,
    facts || '-',
    ``,
    `[STEP 0 • MASTER REFERENCE IMAGE]`,
    ep.step0_prompt || '-',
    ``,
    scenesBlock,
    ``,
    `[THUMBNAIL MEME PROMPT 9:16 (TT / IG / FB)]`,
    ep.thumbnail_meme_prompt_en || '-',
    ``,
    `[NASKAH VO UTUH (${wordCount} KATA • ~${estSec} DETIK)]`,
    fullVo,
    ``,
    `[TEKS LAYAR ATAS CAPCUT (0 - 2.5 DETIK)]`,
    capcutHook,
    ``,
    `[METADATA YOUTUBE SHORTS]`,
    `Judul Utama       : ${ytTitleMain}`,
    `Judul Alternatif 1: ${ytTitleAlt1}`,
    `Judul Alternatif 2: ${ytTitleAlt2}`,
    ``,
    `Deskripsi YouTube:`,
    ytDescription,
    ``,
    `6 Tag SEO (CSV):`,
    ytTagsCsv || '-',
    ``,
    `[TIKTOK]`,
    `Caption: ${ttCap}`,
    `Pinned : ${ttPin}`,
    ``,
    `[INSTAGRAM REELS]`,
    `Caption: ${igCap}`,
    `Pinned : ${igPin}`,
    ``,
    `[FACEBOOK REELS]`,
    `Caption: ${fbCap}`,
    `Pinned : ${fbPin}`
  ].join('\n');
}

export async function writeEpisodeToKontenFolder(ep, triggerBrowserDownload = false) {
  const safeAnimal = (ep.animal_name || 'episode')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `${safeAnimal}_v2_${stamp}_${Date.now().toString().slice(-4)}.txt`;
  const content = formatEpisodeAsText(ep);

  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: `SiapaTahu_Konten/${fileName}`,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true
      });
      return { savedToDevice: true, path: `Documents/SiapaTahu_Konten/${fileName}` };
    } catch {
      return { savedToDevice: false, path: null };
    }
  } else if (triggerBrowserDownload) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return { savedToDevice: true, path: fileName };
  }

  return { savedToDevice: false, path: null };
}
