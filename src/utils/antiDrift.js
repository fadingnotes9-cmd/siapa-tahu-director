const BEAKED_ANIMAL_REGEX =
  /(paruh|burung|elang|pelatuk|bebek|angsa|penguin|platipus|penyu|kura-kura|pelikan|bangau|flamingo|gagak|hantu|merpati|ayam|kalkun|kasuari|unta|kolibri|rangkong|kakatua|camar|cekakak|rajawali|alap-alap|beak|bird|duck|eagle|owl|woodpecker|toucan|parrot|penguin|turtle|tortoise|platypus|pelican|heron|hummingbird|hornbill|cockatoo|macaw|seagull|ostrich|kiwi|puffin|kingfisher|falcon)/i;

const NON_BEAKED_OVERRIDE_REGEX =
  /(bunglon|buaya|tokek|ular|komodo|kadal|iguana|biawak|katak|kodok|salamander|axolotl|hiu|paus|lumba|ikan|gurita|ubur|cumi|kepiting|udang|lobster|laba-laba|semut|lebah|kumbang|belalang|capung|kupu|kalajengking|kecoa|nyamuk|lalat|kucing|anjing|monyet|gorila|orangutan|harimau|singa|beruang|gajah|jerapah|kuda|sapi|kambing|domba|kelinci|tikus|tupai|kelelawar|landak|trenggiling|chameleon|crocodile|alligator|gecko|snake|lizard|frog|toad|shark|whale|dolphin|fish|octopus|squid|crab|spider|ant|bee|beetle|mantis|scorpion|cockroach|mosquito|fly|cat|dog|monkey|tiger|lion|bear|elephant|rabbit|bat|hedgehog|pangolin)/i;

function ensureTerminalPeriod(str) {
  const cleaned = String(str || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

export function enforceSubjectLockEn(rawSubjectLock, animalInput, isBeakedFlag) {
  let desc = String(rawSubjectLock || '').replace(/\s+/g, ' ').trim();

  const isNonBeakedExplicit =
    NON_BEAKED_OVERRIDE_REGEX.test(animalInput) ||
    NON_BEAKED_OVERRIDE_REGEX.test(desc);

  const isBeaked =
    !isNonBeakedExplicit &&
    (Boolean(isBeakedFlag) ||
      BEAKED_ANIMAL_REGEX.test(animalInput) ||
      BEAKED_ANIMAL_REGEX.test(desc));

  // Strip conflicting mouth clauses first
  desc = desc
    .replace(/no cartoon mouth,\s*no teeth,\s*natural beak only/gi, '')
    .replace(/natural beak only/gi, '')
    .replace(/simple expressive black cartoon mouth line,\s*no teeth/gi, '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ',')
    .replace(/\.+$/, '')
    .trim();

  if (!desc) {
    desc = `Hyper-realistic ${animalInput} with intricate natural skin and body texture`;
  }

  const requiredCamera = 'front-facing three-quarter view';
  const requiredEyes =
    'two symmetrical large white round cartoon googly eyes (black pupils) and thick expressive black cartoon eyebrows';
  const requiredMouth = isBeaked
    ? 'no cartoon mouth, no teeth, natural beak only'
    : 'simple expressive black cartoon mouth line, no teeth';

  if (!/front-facing three-quarter view/i.test(desc)) {
    desc = `${desc}, ${requiredCamera}`;
  }
  if (!/cartoon googly eyes/i.test(desc)) {
    desc = `${desc}, ${requiredEyes}`;
  }
  desc = `${desc}, ${requiredMouth}`;

  return {
    subject_lock_en: ensureTerminalPeriod(desc),
    is_beaked: isBeaked,
    mouth_rule: requiredMouth
  };
}

export function applyAntiDriftLock(rawPayload, animalInput) {
  const { subject_lock_en, is_beaked, mouth_rule } = enforceSubjectLockEn(
    rawPayload.subject_lock_en,
    animalInput,
    rawPayload.is_beaked_animal
  );

  const step0_environment_en = ensureTerminalPeriod(
    rawPayload.step0_environment_en ||
      'Perched in its natural macro habitat with rich foliage and soft atmospheric background bokeh.'
  );

  // 1. Hardcoded Step 0 Master Image Prompt
  const step0_prompt = `Hyper-realistic wildlife macro photography, vertical 9:16, shallow depth of field. ${subject_lock_en} ${step0_environment_en} Crisp focus, cinematic lighting, no text, no watermark.`;

  // 2. Hardcoded Scene 1-4 Prompts paired with vo_segment_id
  const rawScenes = Array.isArray(rawPayload.scenes) ? rawPayload.scenes : [];
  const pairedScenes = [0, 1, 2, 3].map((idx) => {
    const item = rawScenes[idx] || {};
    const voSeg = String(item.vo_segment_id || '').replace(/\s+/g, ' ').trim();
    const visualAction = ensureTerminalPeriod(
      item.visual_action_en ||
        '0-3s: Extreme macro close-up with wide startled googly eyes. 3-7s: Expressive eyebrow movement showcasing natural biological action. 7-10s: Dramatic macro hold for transition.'
    );
    const sfxClean = String(
      item.sfx_en || 'soft organic rustling, subtle cartoon eye blink pop, natural habitat foley'
    )
      .replace(/\s+/g, ' ')
      .replace(/\.+$/, '')
      .trim();

    const flowPrompt = `Hyper-realistic wildlife macro nature footage, vertical 9:16, shallow depth of field. ${subject_lock_en} ${visualAction} Sound effects only: ${sfxClean}. No text, no subtitles, no watermark, no music, no speech.`;

    return {
      scene_number: idx + 1,
      vo_segment_id: voSeg,
      visual_action_en: visualAction,
      sfx_en: sfxClean,
      flow_prompt: flowPrompt
    };
  });

  // 3. Combined Full VO Script + Real-time Word & Duration Calculation
  const full_vo_script = pairedScenes
    .map((s) => s.vo_segment_id)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const vo_word_count = full_vo_script
    ? full_vo_script.split(/\s+/).filter(Boolean).length
    : 0;
  const vo_estimated_seconds = Number((vo_word_count / 2.6).toFixed(1));

  return {
    ...rawPayload,
    schema_version: '2.0',
    is_beaked_animal: is_beaked,
    subject_lock_en,
    step0_environment_en,
    anti_drift_meta: {
      locked_subject: subject_lock_en,
      is_beak_or_sharp_snout: is_beaked,
      mouth_rule
    },
    step0_prompt,
    scenes: pairedScenes,
    scene1: pairedScenes[0]?.flow_prompt || '',
    scene2: pairedScenes[1]?.flow_prompt || '',
    scene3: pairedScenes[2]?.flow_prompt || '',
    scene4: pairedScenes[3]?.flow_prompt || '',
    full_vo_script,
    vo_script: full_vo_script,
    vo_word_count,
    vo_estimated_seconds
  };
}
