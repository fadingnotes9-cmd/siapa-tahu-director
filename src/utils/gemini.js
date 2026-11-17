import { applyAntiDriftLock } from './antiDrift.js';
import { getHookCalibration } from './db.js';

export const AVAILABLE_MODELS = [
  { id: 'auto', label: 'Auto (Smart Fallback)' },
  { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
  { id: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
  { id: 'gemini-3.8-flash-lite', label: 'gemini-3.8-flash-lite (Hemat Kuota)' },
  { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (Free Tier)' }
];

export const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-3.8-flash-lite',
  'gemini-2.5-flash-lite'
];

export function getModelsQueue() {
  const preferred = localStorage.getItem('gemini_model') || 'auto';
  if (preferred === 'auto') return [...FALLBACK_MODELS];
  return [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];
}

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

async function callGeminiEpisodeEndpoint(apiKey, model, prompt, useSearch) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: EPISODE_SCHEMA
    }
  };
  if (useSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

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
Verifikasi fakta anatomi dan perilaku nyata dari hewan: "${cleanAnimal}".

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

  const models = getModelsQueue();
  let lastError = null;
  let successData = null;
  let usedModel = '';
  let usedSearch = false;

  for (const model of models) {
    // Attempt 1: With Google Search Grounding
    try {
      successData = await callGeminiEpisodeEndpoint(apiKey, model, prompt, true);
      usedModel = model;
      usedSearch = true;
      break;
    } catch (err) {
      lastError = err;
      if (err.status === 401 || err.status === 403) {
        throw new Error('API Key tidak valid atau ditolak. Cek kembali key di pojok kanan atas.');
      }
      // Attempt 2: Same model without Search Grounding (in case Search quota is 0 on Free Tier)
      if (err.status === 429 || err.status === 400) {
        try {
          successData = await callGeminiEpisodeEndpoint(apiKey, model, prompt, false);
          usedModel = model;
          usedSearch = false;
          break;
        } catch (errNoSearch) {
          lastError = errNoSearch;
          continue; // Move to next model in fallback chain
        }
      }
    }
  }

  if (!successData) {
    throw new Error(
      `Semua model mencapai batas kuota Free Tier (${lastError?.message || '429'}). Tunggu reset menit berikutnya atau cek AI Studio.`
    );
  }

  const rawText = successData?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!rawText) {
    throw new Error('Respons kosong dari Gemini API.');
  }

  const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleanedJson);

  const groundingChunks =
    successData?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .map((c) => c.web)
    .filter(Boolean)
    .slice(0, 3);

  const lockedResult = applyAntiDriftLock(parsed, cleanAnimal);
  return {
    ...lockedResult,
    grounding_sources: sources,
    calibrated_hook_used: calibratedHook?.directive || null,
    model_used: usedModel,
    search_grounded_used: usedSearch
  };
}
