import { saveAnalyticsEntry, setHookCalibration } from './db.js';

const MODEL_NAME = 'gemini-2.5-flash';

function fileToInlineData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64 = dataUrl.split(',')[1];
        resolve({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64
          },
          previewUrl: dataUrl
        });
      };
      img.onerror = () => reject(new Error('Gagal memproses file gambar.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

const VISUAL_QC_SCHEMA = {
  type: 'OBJECT',
  properties: {
    eye_symmetry_ok: { type: 'BOOLEAN' },
    eye_symmetry_note: { type: 'STRING' },
    no_double_mouth_ok: { type: 'BOOLEAN' },
    mouth_anatomy_note: { type: 'STRING' },
    scroll_stop_score: { type: 'INTEGER' },
    verdict_summary: { type: 'STRING' },
    fix_prompt: { type: 'STRING' }
  },
  required: [
    'eye_symmetry_ok',
    'eye_symmetry_note',
    'no_double_mouth_ok',
    'mouth_anatomy_note',
    'scroll_stop_score',
    'verdict_summary',
    'fix_prompt'
  ]
};

const ANALYTICS_DOCTOR_SCHEMA = {
  type: 'OBJECT',
  properties: {
    video_topic: { type: 'STRING' },
    views: { type: 'STRING' },
    stayed_to_watch_pct: { type: 'NUMBER' },
    avg_watch_duration: { type: 'STRING' },
    sharp_diagnosis: { type: 'STRING' },
    next_hook_directive: { type: 'STRING' }
  },
  required: [
    'video_topic',
    'views',
    'stayed_to_watch_pct',
    'avg_watch_duration',
    'sharp_diagnosis',
    'next_hook_directive'
  ]
};

export async function runVisualQC(apiKey, imageFile) {
  if (!apiKey) throw new Error('API Key Gemini belum diisi.');
  if (!imageFile) throw new Error('Pilih gambar Master atau Frame 00:00 dulu.');

  const { inlineData, previewUrl } = await fileToInlineData(imageFile);

  const prompt = `Kamu adalah Quality Control (QC) Director untuk video vertikal edukasi hewan fotorealistis dengan mata kartun 3D googly eyes ("Siapa Tahu").

Audit gambar frame 00:00 / Master Image ini secara ketat:
1. eye_symmetry_ok & eye_symmetry_note: Apakah ada tepat 2 mata kartun 3D yang simetris, menempel alami di posisi anatomi mata hewan, dan tidak juling/meleleh/jumlahnya 3+?
2. no_double_mouth_ok & mouth_anatomy_note: Apakah hewan bebas dari bug "mulut ganda" (misal paruh asli tetap utuh tanpa mulut kartun tambahan di bawahnya, atau moncong tidak berlipat aneh)?
3. scroll_stop_score (angka bulat 1-10): Nilai daya henti scroll di detik 00:00 (kontras subjek vs background, ekspresi mata kartun mencolok, ketajaman makro, dan framing vertikal 9:16).
4. verdict_summary: Ringkasan evaluasi QC 1-2 kalimat tajam dalam Bahasa Indonesia.
5. fix_prompt: Jika scroll_stop_score < 8 (atau ada cacat mata/mulut), tulis prompt perbaikan Bahasa Inggris lengkap siap copy untuk Google Flow (perbaiki posisi 2 mata kartun simetris, kunci kamera front-facing, sertakan "no cartoon mouth, no teeth, natural beak only" jika relevan, dan tingkatkan kontras makro). Jika skor >= 8, tulis prompt penyempurnaan opsional singkat.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }, { inlineData }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: VISUAL_QC_SCHEMA
        }
      })
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status} dari Gemini Vision`);

  const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
  const parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());
  return { ...parsed, previewUrl };
}

export async function runAnalyticsDoctor(apiKey, imageFile) {
  if (!apiKey) throw new Error('API Key Gemini belum diisi.');
  if (!imageFile) throw new Error('Upload screenshot Analytics YT Studio dulu.');

  const { inlineData, previewUrl } = await fileToInlineData(imageFile);

  const prompt = `Kamu adalah Retention & Algorithm Doctor spesialis YouTube Shorts.
Baca screenshot halaman Analytics YT Studio ini dan ekstrak datanya ke JSON:
1. video_topic: Judul atau topik hewan yang terlihat di screenshot (jika tidak terlihat tulis "Episode Shorts").
2. views: Angka Penayangan / Views persis seperti tertulis (misal "12.4K" atau "1.850").
3. stayed_to_watch_pct: Angka persentase "Tetap menonton" / "Stayed to watch" dalam bentuk angka desimal/bulat saja tanpa tanda % (misal 68.5). Jika tidak terlihat, estimasi dari grafik retensi atau isi 0.
4. avg_watch_duration: Rata-rata durasi tonton / Average view duration persis seperti tertulis (misal "0:34" atau "38 detik").
5. sharp_diagnosis: 1 diagnosa tajam dan spesifik (maksimal 2 kalimat Bahasa Indonesia) tentang di mana penonton kabur (detik 0-3 hook atau drop di tengah).
6. next_hook_directive: 1 instruksi teknis konkret (Bahasa Indonesia, 1 kalimat tegas) yang akan otomatis disuntikkan ke generator naskah episode berikutnya untuk memperbaiki metrik ini (contoh: "Buka detik 00:00 dengan pertanyaan kontras anatomi ekstrem dalam 5 kata pertama dan gerakan zoom-in mata kartun kaget").`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }, { inlineData }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: ANALYTICS_DOCTOR_SCHEMA
        }
      })
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status} dari Gemini Vision`);

  const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
  const parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());

  await saveAnalyticsEntry({
    video_topic: parsed.video_topic,
    views: parsed.views,
    stayed_to_watch_pct: parsed.stayed_to_watch_pct,
    avg_watch_duration: parsed.avg_watch_duration,
    sharp_diagnosis: parsed.sharp_diagnosis
  });

  await setHookCalibration({
    directive: parsed.next_hook_directive,
    sourceTopic: parsed.video_topic,
    stayedPct: parsed.stayed_to_watch_pct
  });

  return { ...parsed, previewUrl };
}
