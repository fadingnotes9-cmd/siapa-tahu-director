import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export function formatEpisodeAsText(ep) {
  const tags = (ep.seo_tags || []).map((t) => `#${t.replace(/^#/, '')}`).join(' ');
  const facts = (ep.verified_facts || []).map((f, i) => `${i + 1}. ${f}`).join('\n');

  return [
    `====================================================`,
    `SIAPA TAHU DIRECTOR — PAKET PRODUKSI EPISODE`,
    `Hewan : ${ep.animal_name || '-'}`,
    `Judul : ${ep.title || '-'}`,
    `Waktu : ${new Date(ep.savedAt || Date.now()).toLocaleString('id-ID')}`,
    `====================================================`,
    ``,
    `[FAKTA ANATOMI TERVERIFIKASI]`,
    facts || '-',
    ``,
    `[STEP 0 • MASTER REFERENCE IMAGE]`,
    ep.step0_prompt || '-',
    ``,
    `[SCENE 1 • 00:00 - 00:10 (HOOK)]`,
    ep.scene1 || '-',
    ``,
    `[SCENE 2 • 00:10 - 00:20 (BUILD)]`,
    ep.scene2 || '-',
    ``,
    `[SCENE 3 • 00:20 - 00:30 (TWIST)]`,
    ep.scene3 || '-',
    ``,
    `[SCENE 4 • 00:30 - 00:40 (LOOP)]`,
    ep.scene4 || '-',
    ``,
    `[NASKAH VO SEAMLESS LOOP]`,
    ep.vo_script || '-',
    ``,
    `[DESKRIPSI + LABEL AI]`,
    ep.description_ai_label || '-',
    ``,
    `[6 TAG SEO]`,
    tags || '-',
    ``,
    `[YT SHORTS]`,
    `Caption: ${ep.social_captions?.yt_shorts?.caption || '-'}`,
    `Pinned : ${ep.social_captions?.yt_shorts?.pinned_comment || '-'}`,
    ``,
    `[TIKTOK]`,
    `Caption: ${ep.social_captions?.tiktok?.caption || '-'}`,
    `Pinned : ${ep.social_captions?.tiktok?.pinned_comment || '-'}`,
    ``,
    `[IG REELS]`,
    `Caption: ${ep.social_captions?.ig_reels?.caption || '-'}`,
    `Pinned : ${ep.social_captions?.ig_reels?.pinned_comment || '-'}`,
    ``,
    `[FB REELS]`,
    `Caption: ${ep.social_captions?.fb_reels?.caption || '-'}`,
    `Pinned : ${ep.social_captions?.fb_reels?.pinned_comment || '-'}`
  ].join('\n');
}

export async function writeEpisodeToKontenFolder(ep, triggerBrowserDownload = false) {
  const safeAnimal = (ep.animal_name || 'episode')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `${safeAnimal}_${stamp}_${Date.now().toString().slice(-4)}.txt`;
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
