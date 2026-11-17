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

function normalizeEpisodeJson(rawObj, fallbackAnimal) {
  const safeSocial = (platformObj) => ({
    caption: String(platformObj?.caption || ''),
    pinned_comment: String(platformObj?.pinned_comment || '')
  });

  return {
    animal_name: String(rawObj?.animal_name || fallbackAnimal),
    has_beak_or_sharp_snout: Boolean(rawObj?.has_beak_or_sharp_snout),
    verified_facts: Array.isArray(rawObj?.verified_facts)
      ? rawObj.verified_facts.map(String)
      : [],
    step0_physical_desc: String(rawObj?.step0_physical_desc || ''),
    step0_environment: String(rawObj?.step0_environment || ''),
    scene1_action: String(rawObj?.scene1_action || ''),
    scene2_action: String(rawObj?.scene2_action || ''),
    scene3_action: String(rawObj?.scene3_action || ''),
    scene4_action: String(rawObj?.scene4_action || ''),
    vo_script: String(rawObj?.vo_script || ''),
    title: String(rawObj?.title || ''),
    description_ai_label: String(rawObj?.description_ai_label || ''),
    seo_tags: Array.isArray(rawObj?.seo_tags)
      ? rawObj.seo_tags.map(String).slice(0, 6)
      : [],
    social_captions: {
      yt_shorts: safeSocial(rawObj?.social_captions?.yt_shorts),
      tiktok: safeSocial(rawObj?.social_captions?.tiktok),
      ig_reels: safeSocial(rawObj?.social_captions?.ig_reels),
      fb_reels: safeSocial(rawObj?.social_captions?.fb_reels)
    }
  };
}

async function callDeepSeekEpisodeEndpoint(deepseekKey, prompt) {
  const systemPrompt = `You are a strict JSON generator for a vertical wildlife educational channel ("Siapa Tahu").
You MUST respond ONLY with a valid JSON object matching this exact schema:
{
  "animal_name": "string",
  "has_beak_or_sharp_snout": true,
  "verified_facts": ["fact 1", "fact 2", "fact 3"],
  "step0_physical_desc": "string (English, 35-55 words)",
  "step0_environment": "string (English, 15-25 words)",
  "scene1_action": "string (English, 20-35 words)",
  "scene2_action": "string (English, 20-35 words)",
  "scene3_action": "string (English, 20-35 words)",
  "scene4_action": "string (English, 20-35 words)",
  "vo_script": "string (Indonesian, strictly 90-98 words, seamless loop, NO Subscribe/Like/Follow)",
  "title": "string (Indonesian, max 58 chars)",
  "description_ai_label": "string (Indonesian SEO + AI synthetic content disclosure)",
  "seo_tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "social_captions": {
    "yt_shorts": { "caption": "string", "pinned_comment": "string" },
    "tiktok": { "caption": "string", "pinned_comment": "string" },
    "ig_reels": { "caption": "string", "pinned_comment": "string" },
    "fb_reels": { "caption": "string", "pinned_comment": "string" }
  }
}`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deepseekKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.error?.message || `DeepSeek HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const rawText = data?.choices?.[0]?.message?.content?.trim();
  if (!rawText) throw new Error('Respons kosong dari DeepSeek API.');
  const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleanedJson);
}

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

export async function generateEpisodeFactory(keysOrGeminiKey, animalName) {
  const geminiKey =
    typeof keysOrGeminiKey === 'string'
      ? keysOrGeminiKey
      : keysOrGeminiKey?.geminiKey || '';
  const deepseekKey =
    typeof keysOrGeminiKey === 'object' ? keysOrGeminiKey?.deepseekKey || '' : '';
  const provider =
    typeof keysOrGeminiKey === 'object'
      ? keysOrGeminiKey?.provider || 'auto'
      : 'auto';

  if (!deepseekKey && !geminiKey) {
    throw new Error('Isi minimal satu API Key (DeepSeek atau Gemini) di pengaturan.');
  }

  const cleanAnimal = animalName.trim();
  if (!cleanAnimal) throw new Error('Masukkan nama hewan terlebih dahulu.');

  const calibratedHook = await getHookCalibration();
  const hookInstruction = calibratedHook?.directive
    ? `KALIBRASI HOOK AKTIF DARI ANALYTICS DOCTOR: "${calibratedHook.directive}". Terapkan aturan ini secara ketat pada 3 detik pertama vo_script dan visual scene1_action.`
    : `HOOK STANDAR RETENTION TINGGI: Buka detik 00:00 dengan kontras visual mengejutkan atau POV langsung dari sudut pandang hewan tanpa basa-basi.`;

  const prompt = `Kamu adalah Creative Director untuk channel edukasi hewan vertikal "Siapa Tahu" (gaya visual: hewan fotorealistis makro dengan mata kartun 3D googly eyes yang ekspresif, narasi POV/edukasi witty Bahasa Indonesia).

TUGAS UTAMA:
Verifikasi fakta anatomi dan perilaku nyata yang akurat dari hewan: "${cleanAnimal}".

ATURAN KETAT OUTPUT JSON:
1. has_beak_or_sharp_snout: Set true jika hewan memiliki paruh, moncong panjang/tajam, atau struktur mulut memanjang (misal burung, platipus, bunglon, buaya, trenggiling, kura-kura, hiu).
2. verified_facts: 3 fakta biologi/anatomi unik & akurat tentang "${cleanAnimal}" dalam Bahasa Indonesia.
3. step0_physical_desc (Bahasa Inggris, 35-55 kata): Deskripsi fisik ultra-konsisten dari "${cleanAnimal}" (warna, tekstur kulit/bulu/sisik akurat hasil riset, proporsi tubuh, dan sepasang mata kartun 3D googly eyes besar dengan pupil hitam ekspresif menempel alami di kepalanya). Jangan masukkan aksi atau latar tempat di field ini.
4. step0_environment (Bahasa Inggris, 15-25 kata): Latar habitat alami makro untuk Master Reference Image.
5. scene1_action sampai scene4_action (Bahasa Inggris, masing-masing 20-35 kata): Aksi spesifik dan gerakan kamera untuk klip Google Flow 10 detik (total 40 detik). Hanya tulis aksi, ekspresi mata kartun, dan gerakan kamera—jangan ulangi deskripsi fisik dasar karena akan disuntikkan otomatis oleh sistem.
6. vo_script (Bahasa Indonesia):
   - WAJIB berjumlah tepat antara 90 sampai 98 kata (hitung dengan cermat!).
   - ${hookInstruction}
   - DILARANG KERAS menulis kata "Subscribe", "Like", "Follow", atau ajakan tombol di akhir naskah.
   - WAJIB SEAMLESS LOOP: Kalimat terakhir naskah harus menggantung/menyambung secara gramatikal dan logis langsung ke kata pertama di awal naskah saat video diputar ulang!
7. title: Judul YouTube Shorts klik-bait edukatif maksimal 58 karakter.
8. description_ai_label: Deskripsi singkat SEO + wajib sertakan keterangan transparansi konten AI ("Dibuat dengan bantuan AI / Altered or synthetic content").
9. seo_tags: Tepat 6 tag SEO relevan tanpa tanda #.
10. social_captions: Caption dan Pinned Comment pemancing diskusi untuk yt_shorts, tiktok, ig_reels, dan fb_reels.`;

  let parsed = null;
  let sources = [];
  let usedModel = '';
  let usedSearch = false;
  let deepseekError = null;

  // 1. Try DeepSeek first if provider is 'auto' or 'deepseek' and key is present
  const shouldTryDeepSeek =
    (provider === 'auto' || provider === 'deepseek') && Boolean(deepseekKey);

  if (shouldTryDeepSeek) {
    try {
      const dsRaw = await callDeepSeekEpisodeEndpoint(deepseekKey, prompt);
      parsed = normalizeEpisodeJson(dsRaw, cleanAnimal);
      usedModel = 'deepseek-chat';
      usedSearch = false;
    } catch (err) {
      deepseekError = err;
      if (provider === 'deepseek') {
        throw new Error(`DeepSeek Error: ${err.message}`);
      }
      // If provider === 'auto', fall through to Gemini if geminiKey exists
    }
  } else if (provider === 'deepseek' && !deepseekKey) {
    throw new Error('Mode DeepSeek dipilih, tetapi DeepSeek API Key belum diisi.');
  }

  // 2. Fallback or primary Gemini execution
  if (!parsed) {
    if (!geminiKey) {
      throw new Error(
        deepseekError
          ? `DeepSeek gagal (${deepseekError.message}) dan Gemini API Key belum diisi.`
          : 'Gemini API Key belum diisi.'
      );
    }

    const models = getModelsQueue();
    let lastError = null;
    let successData = null;

    for (const model of models) {
      try {
        successData = await callGeminiEpisodeEndpoint(geminiKey, model, prompt, true);
        usedModel = model;
        usedSearch = true;
        break;
      } catch (err) {
        lastError = err;
        if (err.status === 401 || err.status === 403) {
          throw new Error('Gemini API Key tidak valid atau ditolak.');
        }
        if (err.status === 429 || err.status === 400) {
          try {
            successData = await callGeminiEpisodeEndpoint(geminiKey, model, prompt, false);
            usedModel = model;
            usedSearch = false;
            break;
          } catch (errNoSearch) {
            lastError = errNoSearch;
            continue;
          }
        }
      }
    }

    if (!successData) {
      throw new Error(
        `Semua model mencapai batas kuota (${lastError?.message || '429'}). Isi DeepSeek API Key untuk jalur tanpa limit.`
      );
    }

    const rawText = successData?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('')
      .trim();

    if (!rawText) throw new Error('Respons kosong dari Gemini API.');

    const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = normalizeEpisodeJson(JSON.parse(cleanedJson), cleanAnimal);

    const groundingChunks =
      successData?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    sources = groundingChunks
      .map((c) => c.web)
      .filter(Boolean)
      .slice(0, 3);
  }

  const lockedResult = applyAntiDriftLock(parsed, cleanAnimal);
  return {
    ...lockedResult,
    grounding_sources: sources,
    calibrated_hook_used: calibratedHook?.directive || null,
    model_used: usedModel,
    search_grounded_used: usedSearch
  };
}
