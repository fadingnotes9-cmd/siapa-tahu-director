const BEAK_OR_SNOUT_REGEX =
  /(paruh|burung|elang|pelatuk|bebek|angsa|penguin|platipus|buaya|trenggiling|bunglon|tokek|kura-kura|penyu|hiu|lumba|pelikan|bangau|flamingo|gagak|hantu|merpati|ayam|kolibri|rangkong|beak|bill|snout|bird|chameleon|platypus|crocodile|alligator|duck|eagle|owl|woodpecker|toucan|parrot|penguin|turtle|tortoise|shark|dolphin|anteater|pelican|heron|hummingbird|hornbill)/i;

export function applyAntiDriftLock(rawPayload, animalInput) {
  const cleanPhysicalDesc = (rawPayload.step0_physical_desc || '')
    .replace(/\s+/g, ' ')
    .trim();

  const isBeakOrSharpSnout =
    Boolean(rawPayload.has_beak_or_sharp_snout) ||
    BEAK_OR_SNOUT_REGEX.test(animalInput) ||
    BEAK_OR_SNOUT_REGEX.test(cleanPhysicalDesc);

  const negativeConstraint = isBeakOrSharpSnout
    ? 'no cartoon mouth, no teeth, natural beak only'
    : 'no extra mouths, symmetrical cartoon eyes, clean anatomy';

  const cameraLock = isBeakOrSharpSnout
    ? 'front-facing'
    : 'eye-level macro framing';

  // Step 0 Master Image embeds the exact locked physical description block
  const step0_prompt = [
    `[SUBJECT_LOCK: ${cleanPhysicalDesc}]`,
    `Camera: ${cameraLock}, vertical 9:16 aspect ratio, photorealistic National Geographic macro wildlife photography.`,
    `${rawPayload.step0_environment || 'Clean natural habitat background with soft bokeh, crisp studio rim lighting.'}`,
    `Negative constraints: ${negativeConstraint}, blurry, deformed eyes, watermark, text.`
  ].join(' ');

  // Extract the exact locked physical string directly from step0_prompt
  const lockMatch = step0_prompt.match(/\[SUBJECT_LOCK:\s*(.*?)\]/);
  const lockedPhysicalFromStep0 = lockMatch ? lockMatch[1] : cleanPhysicalDesc;

  const buildLockedScene = (sceneAction, sceneIndex) => {
    const cleanAction = (sceneAction || '').replace(/\s+/g, ' ').trim();
    return [
      `[SUBJECT_LOCK: ${lockedPhysicalFromStep0}]`,
      `Scene ${sceneIndex} (10s Google Flow, 9:16 vertical, ${cameraLock}): ${cleanAction}`,
      `Consistent lighting, photorealistic wildlife texture with expressive 3D cartoon googly eyes.`,
      `Negative constraints: ${negativeConstraint}, character drift, morphing anatomy.`
    ].join(' ');
  };

  return {
    ...rawPayload,
    anti_drift_meta: {
      locked_subject: lockedPhysicalFromStep0,
      is_beak_or_sharp_snout: isBeakOrSharpSnout,
      camera_lock: cameraLock,
      negative_constraint: negativeConstraint
    },
    step0_prompt,
    scene1: buildLockedScene(rawPayload.scene1_action, 1),
    scene2: buildLockedScene(rawPayload.scene2_action, 2),
    scene3: buildLockedScene(rawPayload.scene3_action, 3),
    scene4: buildLockedScene(rawPayload.scene4_action, 4)
  };
}
