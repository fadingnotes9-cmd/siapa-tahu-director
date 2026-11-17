const BEAKED_ANIMAL_REGEX =
  /(paruh|burung|elang|pelatuk|bebek|angsa|penguin|platipus|penyu|kura-kura|pelikan|bangau|flamingo|gagak|hantu|merpati|ayam|kalkun|kasuari|unta|kolibri|rangkong|kakatua|camar|cekakak|rajawali|alap-alap|beak|bird|duck|eagle|owl|woodpecker|toucan|parrot|penguin|turtle|tortoise|platypus|pelican|heron|hummingbird|hornbill|cockatoo|macaw|seagull|ostrich|kiwi|puffin|kingfisher|falcon)/i;

const NON_BEAKED_OVERRIDE_REGEX =
  /(bunglon|buaya|tokek|ular|komodo|kadal|iguana|biawak|katak|kodok|salamander|axolotl|hiu|paus|lumba|ikan|gurita|ubur|cumi|kepiting|udang|lobster|laba-laba|semut|lebah|kumbang|belalang|capung|kupu|kalajengking|kucing|anjing|monyet|gorila|orangutan|harimau|singa|beruang|gajah|jerapah|kuda|sapi|kambing|domba|kelinci|tikus|tupai|kelelawar|landak|trenggiling|chameleon|crocodile|alligator|gecko|snake|lizard|frog|toad|shark|whale|dolphin|fish|octopus|squid|crab|spider|ant|bee|beetle|mantis|scorpion|cat|dog|monkey|tiger|lion|bear|elephant|rabbit|bat|hedgehog|pangolin)/i;

export function applyAntiDriftLock(rawPayload, animalInput) {
  const cleanAnatomy = (rawPayload.step0_physical_desc || '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim();

  const isNonBeakedExplicit =
    NON_BEAKED_OVERRIDE_REGEX.test(animalInput) ||
    NON_BEAKED_OVERRIDE_REGEX.test(cleanAnatomy);

  const isBeaked =
    !isNonBeakedExplicit &&
    (Boolean(rawPayload.is_beaked_animal) ||
      BEAKED_ANIMAL_REGEX.test(animalInput) ||
      BEAKED_ANIMAL_REGEX.test(cleanAnatomy));

  const cartoonFeatures =
    'two symmetrical large white round cartoon googly eyes (black pupils) and thick expressive black cartoon eyebrows';

  const mouthAndCameraRule = isBeaked
    ? 'no cartoon mouth, no teeth, natural beak only, front-facing / front three-quarter view'
    : 'simple expressive black cartoon mouth line, no teeth';

  // Exact locked subject string reused verbatim across Step 0 and Scenes 1-4
  const lockedSubject = `${cleanAnatomy}, ${cartoonFeatures}, ${mouthAndCameraRule}`;
  const subjectLockTag = `[SUBJECT_LOCK: ${lockedSubject}]`;

  const cleanEnv = (
    rawPayload.step0_environment ||
    'natural macro wildlife habitat with soft depth-of-field bokeh and natural rim light'
  )
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim();

  const step0_prompt = `Hyper-realistic wildlife macro nature footage, vertical 9:16 aspect ratio. ${subjectLockTag}. ${cleanEnv}. No text, no subtitles, no watermark.`;

  const buildTimestampedScene = (s0_3, s3_7, s7_10, sfx, fallbackAction) => {
    const clean = (txt) => (txt || '').replace(/\s+/g, ' ').replace(/\.+$/, '').trim();
    const p1 = clean(s0_3) || clean(fallbackAction) || 'Close-up macro reaction with wide cartoon googly eyes';
    const p2 = clean(s3_7) || 'Expressive thick black cartoon eyebrow movement showcasing natural animal behavior';
    const p3 = clean(s7_10) || 'Dramatic macro hold completing the action cleanly';
    const cleanSfx =
      clean(sfx) || 'soft leaf rustle, subtle cartoon eye blink pop, organic macro foley';

    return `Hyper-realistic wildlife macro nature footage, vertical 9:16 aspect ratio. ${subjectLockTag}. 0-3s: ${p1}. 3-7s: ${p2}. 7-10s: ${p3}. Sound effects only: ${cleanSfx}. No text, no subtitles, no watermark, no music, no speech.`;
  };

  return {
    ...rawPayload,
    has_beak_or_sharp_snout: isBeaked,
    anti_drift_meta: {
      locked_subject: subjectLockTag,
      is_beak_or_sharp_snout: isBeaked,
      mouth_rule: mouthAndCameraRule
    },
    step0_prompt,
    scene1: buildTimestampedScene(
      rawPayload.scene1_0_3s,
      rawPayload.scene1_3_7s,
      rawPayload.scene1_7_10s,
      rawPayload.scene1_sfx,
      rawPayload.scene1_action
    ),
    scene2: buildTimestampedScene(
      rawPayload.scene2_0_3s,
      rawPayload.scene2_3_7s,
      rawPayload.scene2_7_10s,
      rawPayload.scene2_sfx,
      rawPayload.scene2_action
    ),
    scene3: buildTimestampedScene(
      rawPayload.scene3_0_3s,
      rawPayload.scene3_3_7s,
      rawPayload.scene3_7_10s,
      rawPayload.scene3_sfx,
      rawPayload.scene3_action
    ),
    scene4: buildTimestampedScene(
      rawPayload.scene4_0_3s,
      rawPayload.scene4_3_7s,
      rawPayload.scene4_7_10s,
      rawPayload.scene4_sfx,
      rawPayload.scene4_action
    )
  };
}
