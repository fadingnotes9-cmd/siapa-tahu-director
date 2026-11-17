import { applyAntiDriftLock } from './antiDrift.js';
import { getHookCalibration } from './db.js';

const MODEL_NAME = 'gemini-3.8-flash';

const EPISODE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    animal_name: { type: 'STRING' },
    has_beak_or_sharp_snout: { type: 'BOOLEAN' },
    verified_facts: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    step0_physical_desc: { type: 'STRING' },
    step0_environment: { type: 'STRING' },
    scene1_action: { type: 'STRING' },
    scene2_action: { type: 'STRING' },
    scene3_action: { type: 'STRING' },
    scene4_action: { type: 'STRING' },
    vo_script: { type: 'STRING' },
    title: { type: 'STRING' },
    description_ai_label: { type: 'STRING' },
    seo_tags: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    social_captions: {
      type: 'OBJECT',
      properties: {
        yt_shorts: {
          type: 'OBJECT',
          properties: {
            caption: { type: 'STRING' },
            pinned_comment: { type: 'STRING' }
          },
          required: ['caption', 'pinned_comment']
        },
        tiktok: {
          type: 'OBJECT',
          properties: {
            caption: { type: 'STRING' },
            pinned_comment: { type: 'STRING' }
          },
          required: ['caption', 'pinned_comment']
        },
        ig_reels: {
          type: 'OBJECT',
          properties: {
            caption: { type: 'STRING' },
            pinned_comment: { type: 'STRING' }
          },
          required: ['caption', 'pinned_comment']
        },
        fb_reels: {
          type: 'OBJECT',
          properties: {
            caption: { type: 'STRING' },
            pinned_comment: { type: 'STRING' }
          },
          required: ['caption', 'pinned_comment']
        }
      },
      required: ['yt_shorts', 'tiktok', 'ig_reels', 'fb_reels']
    }
  },
  required: [
    'animal_name',
    'has_beak_or_sharp_snout',
    'verified_facts',
    'step0_physical_desc',
    'step0_environment',
    'scene1_action',
    'scene2_action',
    'scene3_action',
    'scene4_action',
    'vo_script',
    'title',
    'description_ai_label',
    'seo_tags',
    'social_captions'
  ]
};

export async function generateEpisodeFactory(apiKey, animalName) {
  if (!apiKey) throw new Error('API Key Gemini belum diisi.');
  const cleanAnimal = animalName.trim();
  if (!cleanAnimal) throw new Error('Masukkan nama hewan terlebih dahulu.');

  const calibratedHook = await getHookCalibration();
  const hookInstruction = calibratedHook?.directive
    ? `KALIBRASI HOOK AKTIF DARI ANALYTICS DOCTOR: "${calibratedHook.directive}". Terapkan aturan ini secara ketat pada 3 detik pertama vo_script dan visual scene1_action.`
    : `HOOK STANDAR RETENTION TINGGI: Buka detik 00:00 dengan kontras visual mengejutkan atau POV langsung dari sudut pandang hewan tanpa basa-basi.`;

  const prompt = `Kamu adalah Creative Director untuk channel edukasi hewan vertikal "Siapa Tahu" (gaya visual: hewan fotorealistis makro dengan mata kartun 3D googly eyes yang ekspresif, narasi POV/edukasi witty Bahasa Indonesia).

TUGAS UTAMA:
Gunakan Google Search Grounding untuk memverifikasi fakta anatomi dan perilaku nyata dari hewan: "${cleanAnimal}".

ATURAN KETAT OUTPUT JSON:
1. has_beak_or_sharp_snout: Set true jika hewan memiliki paruh, moncong panjang/tajam, atau struktur mulut memanjang (misal burung, platipus, bunglon, buaya, trenggiling, kura-kura, hiu).
2. step0_physical_desc (Bahasa Inggris, 35-55 kata): Deskripsi fisik ultra-konsisten dari "${cleanAnimal}" (warna, tekstur kulit/bulu/sisik akurat hasil riset, proporsi tubuh, dan sepasang mata kartun 3D googly eyes besar dengan pupil hitam ekspresif menempel alami di kepalanya). Jangan masukkan aksi atau latar tempat di field ini.
3. step0_environment (Bahasa Inggris, 15-25 kata): Latar habitat alami makro untuk Master Reference Image.
4. scene1_action sampai scene4_action (Bahasa Inggris, masing-masing 20-35 kata): Aksi spesifik dan gerakan kamera untuk klip Google Flow 10 detik (total 40 detik). Hanya tulis aksi, ekspresi mata kartun, dan gerakan kamera—jangan ulangi deskripsi fisik dasar karena akan disuntikkan otomatis oleh sistem.
5. vo_script (Bahasa Indonesia):
   - WAJIB berjumlah tepat antara 90 sampai 98 kata (hitung dengan cermat!).
   - ${hookInstruction}
   - DILARANG KERAS menulis kata "Subscribe", "Like", "Follow", atau ajakan tombol di akhir naskah.
   - WAJIB SEAMLESS LOOP: Kalimat terakhir naskah harus menggantung/menyambung secara gramatikal dan logis langsung ke kata pertama di awal naskah saat video diputar ulang!
6. title: Judul YouTube Shorts klik-bait edukatif maksimal 58 karakter.
7. description_ai_label: Deskripsi singkat SEO + wajib sertakan keterangan transparansi konten AI ("Dibuat dengan bantuan AI / Altered or synthetic content").
8. seo_tags: Tepat 6 tag SEO relevan tanpa tanda #.
9. social_captions: Caption dan Pinned Comment pemancing diskusi untuk yt_shorts, tiktok, ig_reels, dan fb_reels.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: EPISODE_SCHEMA
        }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status} dari Gemini API`);
  }

  const rawText = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!rawText) {
    throw new Error('Respons kosong dari Gemini 2.5 Flash.');
  }

  const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleanedJson);

  const groundingChunks =
    data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .map((c) => c.web)
    .filter(Boolean)
    .slice(0, 3);

  const lockedResult = applyAntiDriftLock(parsed, cleanAnimal);
  return {
    ...lockedResult,
    grounding_sources: sources,
    calibrated_hook_used: calibratedHook?.directive || null
  };
}
