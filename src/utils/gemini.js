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
    label: '🔄 Natural Loop (Kalimat utuh nyambung ke awal, tanpa "padahal...")',
    shortLabel: 'Natural Loop'
  },
  {
    id: 'dilemma',
    label: '💬 Dilemma Comment-Bait (Pilihan absurd 3 detik terakhir)',
    shortLabel: 'Dilemma Comment-Bait'
  },
  {
    id: 'teaser',
    label: '🔥 Curiosity-Gap Teaser (Bocoran fakta gila hewan besok)',
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

const SCENE_ITEM_SCHEMA = {
  type: 'OBJECT',
  properties: {
    vo_segment_id: { type: 'STRING' },
    visual_action_en: { type: 'STRING' },
    sfx_en: { type: 'STRING' }
  },
  required: ['vo_segment_id', 'visual_action_en', 'sfx_en']
};

const EPISODE_V2_SCHEMA = {
  type: 'OBJECT',
  properties: {
    animal_name: { type: 'STRING' },
    is_beaked_animal: { type: 'BOOLEAN' },
    verified_facts: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    subject_lock_en: { type: 'STRING' },
    step0_environment_en: { type: 'STRING' },
    scenes: {
      type: 'ARRAY',
      items: SCENE_ITEM_SCHEMA
    },
    thumbnail_meme_prompt_en: { type: 'STRING' },
    next_teaser_animal: { type: 'STRING' },
    metadata: {
      type: 'OBJECT',
      properties: {
        yt_title_main: { type: 'STRING' },
        yt_title_alt_1: { type: 'STRING' },
        yt_title_alt_2: { type: 'STRING' },
        yt_description: { type: 'STRING' },
        yt_tags_csv: { type: 'STRING' },
        capcut_hook_text: { type: 'STRING' },
        tiktok_caption: { type: 'STRING' },
        tiktok_pinned: { type: 'STRING' },
        ig_caption: { type: 'STRING' },
        ig_pinned: { type: 'STRING' },
        fb_caption: { type: 'STRING' },
        fb_pinned: { type: 'STRING' }
      },
      required: [
        'yt_title_main',
        'yt_title_alt_1',
        'yt_title_alt_2',
        'yt_description',
        'yt_tags_csv',
        'capcut_hook_text',
        'tiktok_caption',
        'tiktok_pinned',
        'ig_caption',
        'ig_pinned',
        'fb_caption',
        'fb_pinned'
      ]
    }
  },
  required: [
    'animal_name',
    'is_beaked_animal',
    'verified_facts',
    'subject_lock_en',
    'step0_environment_en',
    'scenes',
    'thumbnail_meme_prompt_en',
    'next_teaser_animal',
    'metadata'
  ]
};

function normalizeV2EpisodeJson(rawObj, fallbackAnimal, effectiveEndingStyle) {
  const cleanTagsCsv = String(rawObj?.metadata?.yt_tags_csv || '')
    .split(',')
    .map((t) => t.replace(/^#+/, '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');

  const rawScenes = Array.isArray(rawObj?.scenes) ? rawObj.scenes : [];
  const normalizedScenes = [0, 1, 2, 3].map((i) => ({
    vo_segment_id: String(rawScenes[i]?.vo_segment_id || '').trim(),
    visual_action_en: String(rawScenes[i]?.visual_action_en || '').trim(),
    sfx_en: String(rawScenes[i]?.sfx_en || '').trim()
  }));

  const teaserAnimal =
    effectiveEndingStyle === 'teaser'
      ? String(rawObj?.next_teaser_animal || '')
          .replace(/["'.!?]/g, '')
          .trim()
      : '';

  const m = rawObj?.metadata || {};

  return {
    animal_name: String(rawObj?.animal_name || fallbackAnimal).trim(),
    is_beaked_animal: Boolean(rawObj?.is_beaked_animal),
    verified_facts: Array.isArray(rawObj?.verified_facts)
      ? rawObj.verified_facts.map(String).slice(0, 4)
      : [],
    subject_lock_en: String(rawObj?.subject_lock_en || '').trim(),
    step0_environment_en: String(rawObj?.step0_environment_en || '').trim(),
    scenes: normalizedScenes,
    thumbnail_meme_prompt_en: String(rawObj?.thumbnail_meme_prompt_en || '').trim(),
    next_teaser_animal: teaserAnimal,
    metadata: {
      yt_title_main: String(m.yt_title_main || '').trim(),
      yt_title_alt_1: String(m.yt_title_alt_1 || '').trim(),
      yt_title_alt_2: String(m.yt_title_alt_2 || '').trim(),
      yt_description: String(m.yt_description || '').trim(),
      yt_tags_csv: cleanTagsCsv,
      capcut_hook_text: String(m.capcut_hook_text || '').trim(),
      tiktok_caption: String(m.tiktok_caption || '').trim(),
      tiktok_pinned: String(m.tiktok_pinned || '').trim(),
      ig_caption: String(m.ig_caption || '').trim(),
      ig_pinned: String(m.ig_pinned || '').trim(),
      fb_caption: String(m.fb_caption || '').trim(),
      fb_pinned: String(m.fb_pinned || '').trim()
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
      directive: `ENDING STYLE = "loop" (NATURAL LOOP):
   - Kalimat penutup di scene_4.vo_segment_id WAJIB berbentuk kalimat pernyataan utuh yang menyambung mulus secara ritmis dan logis kembali ke kalimat pembuka ("Kalau lo terlahir jadi ${cleanAnimal}...") saat video diputar ulang.
   - DILARANG keras menggunakan kata menggantung palsu seperti "padahal...", "karena...", "soalnya...", dan DILARANG ada kata "Subscribe".
   - Isi field "next_teaser_animal" dengan string kosong "".`
    };
  }

  if (effectiveStyle === 'dilemma') {
    return {
      effectiveStyle,
      directive: `ENDING STYLE = "dilemma" (DILEMMA COMMENT-BAIT):
   - Di 3 detik terakhir (kalimat penutup scene_4.vo_segment_id), lempar pilihan dilema lucu/absurd 2 opsi kepada penonton yang berkaitan dengan nasib ${cleanAnimal} untuk memicu debat komentar (contoh pola: "Mending lo punya [kekuatan gila] tapi [ironi konyol], atau tetap jadi manusia biasa? Pilih di komen!").
   - DILARANG memakai kata menggantung "padahal..." dan DILARANG ada kata "Subscribe".
   - Isi field "next_teaser_animal" dengan string kosong "".`
    };
  }

  return {
    effectiveStyle: 'teaser',
    directive: `ENDING STYLE = "teaser" (CURIOSITY-GAP TEASER):
   - Pilih 1 hewan lain yang punya fakta biologis ekstrem untuk episode besok (misalnya "Kecoa", "Platipus", "Udang Mantis", "Gurita", "Burung Hantu", dll.) dan tulis nama hewan tersebut ke field "next_teaser_animal".
   - Di kalimat penutup scene_4.vo_segment_id, bocorkan 1 fakta paling gila dari hewan tersebut untuk memancing penonton menunggu episode besok TANPA mengemis kata "Subscribe", "Like", atau "Follow".`
  };
}

function buildV2DirectorPrompt(cleanAnimal, effectiveStyle, endingDirective, hookCalibrationNote) {
  return `Kamu adalah Creative Director untuk channel YouTube Shorts "Siapa Tahu". Buatkan paket produksi V2.0 lengkap untuk hewan: ${cleanAnimal}.

ATURAN MUTLAK YANG WAJIB DIPATUHI 100%:

1. SINKRONISASI AUDIO & VISUAL PER-SCENE (ANTI-DESYNC):
   - Array "scenes" WAJIB berisi tepat 4 objek (scene 1 sampai scene 4).
   - Setiap objek memiliki "vo_segment_id" (22-25 kata Bahasa Indonesia) dan "visual_action_en" (Bahasa Inggris).
   - "visual_action_en" WAJIB dibagi ke timestamp persis: "0-3s: ... 3-7s: ... 7-10s: ..." dan 100% menggambarkan kejadian nyata dari "vo_segment_id" di scene tersebut (DILARANG mengarang adegan di luar naskah VO!).
   - Khusus Scene 1 ("0-3s: ..."), wajib langsung menampilkan aksi visual paling ekstrem sejak detik 00:00.
   - "sfx_en" wajib berisi 3 efek suara diegetik spesifik sesuai adegan (Bahasa Inggris, dipisah koma).

2. GAYA BAHASA, HOOK & ANTI-PENGULANGAN:
   - Gunakan sudut pandang orang kedua ("Lo") dengan gaya bahasa Indonesia gaul-cerdas, santai, dan punchy (seperti teman ngobrol cerdas). DILARANG memakai kata "Aku", "Saya", atau bahasa baku dokumenter.
   - Kalimat pertama di Scene 1 "vo_segment_id" WAJIB mengikuti pola hook ekstrem:
     "Kalau lo terlahir jadi ${cleanAnimal}, [kekuatan/fakta gila]. Tapi ada satu [cacat fatal/ironi konyol]."
   - Karena kata "Tapi" sudah dipakai 1 kali di hook pembuka, DILARANG KERAS mengulang kata "Tapi" di sisa naskah Scene 1 hingga Scene 4! Variasikan dengan kata transisi seperti "Masalahnya,", "Sayangnya,", "Anehnya,", atau "Parahnya lagi,".
   - Total gabungan 4 "vo_segment_id" wajib berada di kisaran 90-98 kata (±34-36 detik).
   - ${endingDirective}${hookCalibrationNote}

3. ANATOMI & SUBJECT LOCK (BAHASA INGGRIS):
   - "verified_facts": Array berisi tepat 4 fakta anatomi & mekanika biologis akurat tentang ${cleanAnimal} (Bahasa Indonesia).
   - "is_beaked_animal": Set true HANYA JIKA ${cleanAnimal} berparuh/bermoncong keras (burung, penyu, kura-kura, platipus). Set false jika bukan berparuh (reptil seperti bunglon/buaya/ular, mamalia, ikan, amfibi, serangga).
   - "subject_lock_en": Deskripsi fisik lengkap ${cleanAnimal} dalam Bahasa Inggris yang WAJIB memuat:
     * sudut kamera: "front-facing three-quarter view"
     * mata & alis: "two symmetrical large white round cartoon googly eyes (black pupils) and thick expressive black cartoon eyebrows"
     * JIKA berparuh (is_beaked_animal = true): wajib sertakan "no cartoon mouth, no teeth, natural beak only"
     * JIKA BUKAN berparuh (is_beaked_animal = false): DILARANG menulis "natural beak only", wajib sertakan "simple expressive black cartoon mouth line, no teeth".
   - "step0_environment_en": Deskripsi latar makro National Geographic 9:16 untuk Master Reference Image (Bahasa Inggris).

4. THUMBNAIL MEME & METADATA SIAP UPLOAD:
   - "thumbnail_meme_prompt_en": Prompt gambar vertikal 9:16 hiper-realistis bergaya meme/komedi ekstrem (${cleanAnimal} bermata googly eyes + ekspresi panik/sombong + objek perbandingan manusia/teknologi) untuk sampul TikTok, IG Reels, dan FB Reels.
   - "metadata.yt_title_main": Format wajib "POV: Lo Jadi ${cleanAnimal}—[Hook Singkat 3-4 Kata]! [Emoji]" (maksimal 55 karakter).
   - "metadata.yt_title_alt_1" & "metadata.yt_title_alt_2": 2 opsi judul alternatif bergaya rasa penasaran.
   - "metadata.yt_description": 1 kalimat pembuka POV + 4 bullet point fakta singkat + ajakan Subscribe + "Catatan: Visual dibuat dengan bantuan AI untuk tujuan edukasi dan hiburan." + 6 tagar relevan di baris paling bawah.
   - "metadata.yt_tags_csv": 6 tag SEO dalam huruf kecil dipisahkan koma TANPA tanda pagar (#).
   - "metadata.capcut_hook_text": Teks layar atas 0-2.5 detik maksimal 4 kata huruf kapital + 1 emoji (contoh: "POV: LO JADI ${cleanAnimal.toUpperCase()} 🦎").
   - "metadata.tiktok_caption", "tiktok_pinned", "ig_caption", "ig_pinned", "fb_caption", "fb_pinned": Natural, memicu debat komentar, dan berbeda gaya tiap platform.`;
}

async function callDeepSeekV2Endpoint(deepseekKey, prompt) {
  const systemPrompt = `You are the Creative Director for YouTube Shorts channel "Siapa Tahu".
Respond ONLY with a single valid JSON object matching this exact V2.0 schema:
{
  "animal_name": "string",
  "is_beaked_animal": false,
  "verified_facts": ["fact 1", "fact 2", "fact 3", "fact 4"],
  "subject_lock_en": "string (English physical anatomy + front-facing three-quarter view + two symmetrical large white round cartoon googly eyes (black pupils) and thick expressive black cartoon eyebrows + beak/mouth rule)",
  "step0_environment_en": "string (English National Geographic macro habitat)",
  "scenes": [
    {
      "vo_segment_id": "string (Indonesian 22-25 words, starts with 'Kalau lo terlahir jadi ... Tapi ada satu ...')",
      "visual_action_en": "string (English '0-3s: ... 3-7s: ... 7-10s: ...' matching vo_segment_id 100%)",
      "sfx_en": "string (3 specific diegetic SFX in English, comma-separated)"
    },
    { "vo_segment_id": "string", "visual_action_en": "string", "sfx_en": "string" },
    { "vo_segment_id": "string", "visual_action_en": "string", "sfx_en": "string" },
    { "vo_segment_id": "string", "visual_action_en": "string", "sfx_en": "string" }
  ],
  "thumbnail_meme_prompt_en": "string (English 9:16 hyper-realistic meme comedy cover prompt)",
  "next_teaser_animal": "string (1 animal name if ending is teaser, otherwise empty string)",
  "metadata": {
    "yt_title_main": "POV: Lo Jadi [Hewan]—[Hook 3-4 Kata]! [Emoji]",
    "yt_title_alt_1": "string",
    "yt_title_alt_2": "string",
    "yt_description": "string",
    "yt_tags_csv": "tag1, tag2, tag3, tag4, tag5, tag6",
    "capcut_hook_text": "MAX 4 UPPERCASE WORDS + 1 EMOJI",
    "tiktok_caption": "string",
    "tiktok_pinned": "string",
    "ig_caption": "string",
    "ig_pinned": "string",
    "fb_caption": "string",
    "fb_pinned": "string"
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

async function callGeminiV2Endpoint(apiKey, model, prompt, useSearch) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.75,
      responseMimeType: 'application/json',
      responseSchema: EPISODE_V2_SCHEMA
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

  const prompt = buildV2DirectorPrompt(
    cleanAnimal,
    effectiveStyle,
    endingDirective,
    hookCalibrationNote
  );

  let parsed = null;
  let sources = [];
  let usedModel = '';
  let usedSearch = false;
  let deepseekError = null;

  const shouldTryDeepSeek =
    (provider === 'auto' || provider === 'deepseek') && Boolean(deepseekKey);

  if (shouldTryDeepSeek) {
    try {
      const dsRaw = await callDeepSeekV2Endpoint(deepseekKey, prompt);
      parsed = normalizeV2EpisodeJson(dsRaw, cleanAnimal, effectiveStyle);
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
        successData = await callGeminiV2Endpoint(geminiKey, model, prompt, true);
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
            successData = await callGeminiV2Endpoint(geminiKey, model, prompt, false);
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
    parsed = normalizeV2EpisodeJson(JSON.parse(cleanedJson), cleanAnimal, effectiveStyle);

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
