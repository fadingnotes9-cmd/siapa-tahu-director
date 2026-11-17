import { applyAntiDriftLock } from './antiDrift.js';
import { getHookCalibration } from './db.js';

export const AVAILABLE_MODELS = [
  { id: 'auto', label: 'Auto (Smart Fallback)' },
  { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
  { id: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
  { id: 'gemini-3.8-flash-lite', label: 'gemini-3.8-flash-lite (Hemat Kuota)' },
  { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (Free Tier)' }
];

export const ENDING_OPTIONS = [
  {
    id: 'auto',
    label: '🎲 Auto-Rotasi Cerdas (Rekomendasi)',
    shortLabel: 'Auto-Rotasi'
  },
  {
    id: 'loop',
    label: '🔄 Natural Loop (Nyambung ke awal, tanpa "padahal...")',
    shortLabel: 'Natural Loop'
  },
  {
    id: 'dilemma',
    label: '💬 Dilemma Comment-Bait (Pilihan absurd 3s terakhir)',
    shortLabel: 'Dilemma Comment-Bait'
  },
  {
    id: 'teaser',
    label: '🔥 Curiosity-Gap Teaser (Bocoran fakta hewan besok)',
    shortLabel: 'Curiosity-Gap Teaser'
  }
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
    is_beaked_animal: { type: 'BOOLEAN' },
    verified_facts: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    step0_physical_desc: { type: 'STRING' },
    step0_environment: { type: 'STRING' },
    scene1_0_3s: { type: 'STRING' },
    scene1_3_7s: { type: 'STRING' },
    scene1_7_10s: { type: 'STRING' },
    scene1_sfx: { type: 'STRING' },
    scene2_0_3s: { type: 'STRING' },
    scene2_3_7s: { type: 'STRING' },
    scene2_7_10s: { type: 'STRING' },
    scene2_sfx: { type: 'STRING' },
    scene3_0_3s: { type: 'STRING' },
    scene3_3_7s: { type: 'STRING' },
    scene3_7_10s: { type: 'STRING' },
    scene3_sfx: { type: 'STRING' },
    scene4_0_3s: { type: 'STRING' },
    scene4_3_7s: { type: 'STRING' },
    scene4_7_10s: { type: 'STRING' },
    scene4_sfx: { type: 'STRING' },
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
    'is_beaked_animal',
    'verified_facts',
    'step0_physical_desc',
    'step0_environment',
    'scene1_0_3s',
    'scene1_3_7s',
    'scene1_7_10s',
    'scene1_sfx',
    'scene2_0_3s',
    'scene2_3_7s',
    'scene2_7_10s',
    'scene2_sfx',
    'scene3_0_3s',
    'scene3_3_7s',
    'scene3_7_10s',
    'scene3_sfx',
    'scene4_0_3s',
    'scene4_3_7s',
    'scene4_7_10s',
    'scene4_sfx',
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

  const cleanTags = Array.isArray(rawObj?.seo_tags)
    ? rawObj.seo_tags
        .map((t) => String(t).replace(/^#+/, '').trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return {
    animal_name: String(rawObj?.animal_name || fallbackAnimal),
    is_beaked_animal: Boolean(rawObj?.is_beaked_animal),
    verified_facts: Array.isArray(rawObj?.verified_facts)
      ? rawObj.verified_facts.map(String)
      : [],
    step0_physical_desc: String(rawObj?.step0_physical_desc || ''),
    step0_environment: String(rawObj?.step0_environment || ''),
    scene1_0_3s: String(rawObj?.scene1_0_3s || ''),
    scene1_3_7s: String(rawObj?.scene1_3_7s || ''),
    scene1_7_10s: String(rawObj?.scene1_7_10s || ''),
    scene1_sfx: String(rawObj?.scene1_sfx || ''),
    scene2_0_3s: String(rawObj?.scene2_0_3s || ''),
    scene2_3_7s: String(rawObj?.scene2_3_7s || ''),
    scene2_7_10s: String(rawObj?.scene2_7_10s || ''),
    scene2_sfx: String(rawObj?.scene2_sfx || ''),
    scene3_0_3s: String(rawObj?.scene3_0_3s || ''),
    scene3_3_7s: String(rawObj?.scene3_3_7s || ''),
    scene3_7_10s: String(rawObj?.scene3_7_10s || ''),
    scene3_sfx: String(rawObj?.scene3_sfx || ''),
    scene4_0_3s: String(rawObj?.scene4_0_3s || ''),
    scene4_3_7s: String(rawObj?.scene4_3_7s || ''),
    scene4_7_10s: String(rawObj?.scene4_7_10s || ''),
    scene4_sfx: String(rawObj?.scene4_sfx || ''),
    vo_script: String(rawObj?.vo_script || ''),
    title: String(rawObj?.title || ''),
    description_ai_label: String(rawObj?.description_ai_label || ''),
    seo_tags: cleanTags,
    social_captions: {
      yt_shorts: safeSocial(rawObj?.social_captions?.yt_shorts),
      tiktok: safeSocial(rawObj?.social_captions?.tiktok),
      ig_reels: safeSocial(rawObj?.social_captions?.ig_reels),
      fb_reels: safeSocial(rawObj?.social_captions?.fb_reels)
    }
  };
}

function resolveEndingInstruction(endingType, cleanAnimal) {
  const pool = ['loop', 'dilemma', 'teaser'];
  const effectiveStyle =
    endingType === 'auto' || !pool.includes(endingType)
      ? pool[Math.floor(Math.random() * pool.length)]
      : endingType;

  if (effectiveStyle === 'loop') {
    return {
      effectiveStyle,
      directive: `GAYA ENDING WAJIB — NATURAL LOOP:
   - Kalimat terakhir naskah WAJIB berbentuk pernyataan utuh yang mengalir mulus dan nyambung secara logis/ritmis kembali ke kalimat pembuka ("Kalau lo terlahir jadi ${cleanAnimal}...") saat video berulang otomatis.
   - DILARANG KERAS memakai kata menggantung palsu seperti "padahal...", "karena...", "soalnya...", atau ajakan "Subscribe".`
    };
  }

  if (effectiveStyle === 'dilemma') {
    return {
      effectiveStyle,
      directive: `GAYA ENDING WAJIB — DILEMMA COMMENT-BAIT:
   - Di 3 detik terakhir (kalimat penutup), lempar pertanyaan pilihan absurd/dilema ekstrem yang berkaitan langsung dengan nasib ${cleanAnimal} untuk memancing penonton berdebat di kolom komentar (contoh pola: "Mending punya [kekuatan gila] tapi [ironi apes], atau hidup normal aja? Tulis pilihan lo!").
   - DILARANG memakai kata menggantung palsu seperti "padahal..." atau ajakan "Subscribe".`
    };
  }

  return {
    effectiveStyle: 'teaser',
    directive: `GAYA ENDING WAJIB — CURIOSITY-GAP TEASER:
   - Di 3 detik terakhir (kalimat penutup), berikan bocoran singkat 1 kalimat tentang fakta gila hewan lain untuk episode besok guna memancing rasa penasaran penonton agar pantengin channel (contoh pola: "Besok kita bahas hewan yang [fakta ekstrem bikin penasaran]—jangan sampai kelewatan!").
   - DILARANG KERAS mengemis kata "Subscribe", "Like", atau "Follow", dan DILARANG memakai kata "padahal...".`
  };
}

async function callDeepSeekEpisodeEndpoint(deepseekKey, prompt) {
  const systemPrompt = `You are the Creative Director for YouTube Shorts channel "Siapa Tahu".
Respond ONLY with a valid JSON object matching this exact schema:
{
  "animal_name": "string",
  "is_beaked_animal": false,
  "verified_facts": ["fact 1", "fact 2", "fact 3"],
  "step0_physical_desc": "string (English physical anatomy only: skin/fur/scale texture, color, proportions)",
  "step0_environment": "string (English natural macro habitat)",
  "scene1_0_3s": "string (English visual action 0-3s)",
  "scene1_3_7s": "string (English visual action 3-7s)",
  "scene1_7_10s": "string (English visual action 7-10s)",
  "scene1_sfx": "string (3 specific realistic SFX in English, comma-separated)",
  "scene2_0_3s": "string",
  "scene2_3_7s": "string",
  "scene2_7_10s": "string",
  "scene2_sfx": "string (3 specific realistic SFX in English, comma-separated)",
  "scene3_0_3s": "string",
  "scene3_3_7s": "string",
  "scene3_7_10s": "string",
  "scene3_sfx": "string (3 specific realistic SFX in English, comma-separated)",
  "scene4_0_3s": "string",
  "scene4_3_7s": "string",
  "scene4_7_10s": "string",
  "scene4_sfx": "string (3 specific realistic SFX in English, comma-separated)",
  "vo_script": "string (Indonesian, 85-98 words, POV 'Lo', starts with 'Kalau lo terlahir jadi [Hewan], ...', NO 'Aku/Saya', NO 'padahal...', NO 'Subscribe')",
  "title": "POV: Lo Jadi [Hewan]—[Hook 3-4 Kata]! [Emoji]",
  "description_ai_label": "string (Indonesian SEO description + AI synthetic content disclosure)",
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
      temperature: 0.75,
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
      temperature: 0.75,
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

export async function generateEpisodeFactory(
  keysOrGeminiKey,
  animalName,
  endingType = 'auto'
) {
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
  const hookCalibrationNote = calibratedHook?.directive
    ? `\n   - KALIBRASI TAMBAHAN DARI ANALYTICS DOCTOR: "${calibratedHook.directive}".`
    : '';

  const { effectiveStyle, directive: endingDirective } = resolveEndingInstruction(
    endingType,
    cleanAnimal
  );

  const prompt = `Kamu adalah Creative Director untuk channel YouTube Shorts "Siapa Tahu". Buatkan paket produksi lengkap untuk hewan: ${cleanAnimal}.

ATURAN MUTLAK YANG WAJIB DIPATUHI:
1. GAYA BAHASA & POV:
   - WAJIB menggunakan sudut pandang orang kedua ("Lo") dengan bahasa Indonesia gaul-cerdas, punchy, dan to-the-point (seperti teman ngobrol cerdas).
   - DILARANG KERAS menggunakan kata "Aku", "Saya", "Kita" yang kaku, atau bahasa baku dokumenter.
2. HOOK 0-2.5 DETIK:
   - Kalimat pertama vo_script WAJIB langsung menghantam dengan ironi atau fakta ekstrem mengikuti pola persis:
     "Kalau lo terlahir jadi ${cleanAnimal}, [kekuatan/fakta gila]. Tapi ada satu [cacat fatal/ironi konyol]."
3. DURASI & ENDING NASKAH VO (85-98 KATA):
   - Total panjang vo_script WAJIB antara 85 sampai 98 kata (±33-36 detik). Hitung jumlah katanya dengan presisi!
   - ${endingDirective}${hookCalibrationNote}
4. ATURAN VISUAL & ANATOMI (Bahasa Inggris):
   - is_beaked_animal: Cek secara akurat apakah ${cleanAnimal} punya paruh/moncong keras seperti burung, penyu/kura-kura, atau platipus (set true). Jika reptil (bunglon/buaya/ular/tokek), mamalia, ikan, amfibi, atau serangga, wajib set false.
   - step0_physical_desc (Bahasa Inggris, 25-40 kata): Deskripsi anatomi fisik nyata ${cleanAnimal} (warna, tekstur kulit/bulu/sisik, bentuk tubuh). JANGAN masukkan mata kartun, mulut, aksi, atau latar tempat karena sistem akan menyuntikkan [SUBJECT_LOCK] otomatis.
   - step0_environment (Bahasa Inggris, 12-20 kata): Latar habitat makro alami dengan depth-of-field tajam.
   - Untuk setiap Scene 1 sampai Scene 4 (klip 10 detik):
     * sceneX_0_3s: Aksi visual & ekspresi mata/alis kartun di detik 0-3s (Bahasa Inggris).
     * sceneX_3_7s: Aksi utama & gerakan kamera makro di detik 3-7s (Bahasa Inggris).
     * sceneX_7_10s: Klimaks reaksi di detik 7-10s (Bahasa Inggris).
     * sceneX_sfx: Daftar tepat 3 efek suara SFX spesifik sesuai adegan dalam Bahasa Inggris, dipisahkan koma (tanpa musik/ucapan).
5. FORMAT METADATA SIAP UPLOAD:
   - title: WAJIB pola "POV: Lo Jadi ${cleanAnimal}—[Hook Singkat 3-4 Kata]! [Emoji]" (maksimal 55 karakter).
   - description_ai_label: Deskripsi singkat SEO Bahasa Indonesia + keterangan wajib konten AI ("Dibuat dengan bantuan AI / Altered or synthetic content").
   - seo_tags: Tepat 6 Tag SEO relevan dalam huruf kecil TANPA tanda pagar (#), contoh: ["${cleanAnimal.toLowerCase()}", "fakta ${cleanAnimal.toLowerCase()}", "fakta unik hewan", "edukasi hewan", "pov hewan", "siapa tahu"].
   - social_captions: Siapkan Caption dan Pinned Comment yang BERBEDA gaya serta natural untuk masing-masing platform:
     * yt_shorts (pancing diskusi singkat & pertanyaan klik komentar)
     * tiktok (gaya FYP santai, relasi kehidupan sehari-hari, hashtag relevan)
     * ig_reels (hook visual estetik + ajakan share ke teman)
     * fb_reels (gaya bercerita ringan untuk audiens luas Facebook)`;

  let parsed = null;
  let sources = [];
  let usedModel = '';
  let usedSearch = false;
  let deepseekError = null;

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
    }
  } else if (provider === 'deepseek' && !deepseekKey) {
    throw new Error('Mode DeepSeek dipilih, tetapi DeepSeek API Key belum diisi.');
  }

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
    ending_type_selected: endingType,
    ending_style_applied: effectiveStyle,
    grounding_sources: sources,
    calibrated_hook_used: calibratedHook?.directive || null,
    model_used: usedModel,
    search_grounded_used: usedSearch
  };
}
