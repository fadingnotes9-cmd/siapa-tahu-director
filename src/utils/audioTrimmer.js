function audioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = String(dataUrl).split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Gagal mengonversi WAV ke Base64.'));
    reader.readAsDataURL(blob);
  });
}

export async function trimSilenceForLoop(file, options = {}) {
  const thresholdDb = options.thresholdDb ?? -36;
  const targetGapSec = 0.05; // Fixed 0.05s pause between sentences

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const sampleRate = decoded.sampleRate;
    const numChannels = decoded.numberOfChannels;
    const totalSamples = decoded.length;
    const originalDuration = decoded.duration;

    // Build mono envelope for RMS analysis
    const mono = new Float32Array(totalSamples);
    for (let ch = 0; ch < numChannels; ch++) {
      const chData = decoded.getChannelData(ch);
      for (let i = 0; i < totalSamples; i++) {
        mono[i] += Math.abs(chData[i]) / numChannels;
      }
    }

    const frameSize = Math.max(1, Math.floor(sampleRate * 0.01)); // 10ms window
    const numFrames = Math.ceil(totalSamples / frameSize);
    const linearThreshold = Math.pow(10, thresholdDb / 20);

    const isSpeechFrame = new Uint8Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      const start = f * frameSize;
      const end = Math.min(totalSamples, start + frameSize);
      let sumSq = 0;
      for (let i = start; i < end; i++) {
        const v = mono[i];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, end - start));
      if (rms >= linearThreshold) {
        isSpeechFrame[f] = 1;
      }
    }

    // Pad speech frames (30ms before, 40ms after) so consonants stay crisp
    const prePadFrames = 3;
    const postPadFrames = 4;
    const paddedSpeech = new Uint8Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      if (isSpeechFrame[f]) {
        const from = Math.max(0, f - prePadFrames);
        const to = Math.min(numFrames - 1, f + postPadFrames);
        for (let k = from; k <= to; k++) {
          paddedSpeech[k] = 1;
        }
      }
    }

    // Extract contiguous speech intervals
    const rawSegments = [];
    let segStart = null;
    for (let f = 0; f < numFrames; f++) {
      if (paddedSpeech[f] && segStart === null) {
        segStart = f * frameSize;
      } else if (!paddedSpeech[f] && segStart !== null) {
        rawSegments.push({ start: segStart, end: Math.min(totalSamples, f * frameSize) });
        segStart = null;
      }
    }
    if (segStart !== null) {
      rawSegments.push({ start: segStart, end: totalSamples });
    }

    // Fallback if audio is completely below threshold
    if (rawSegments.length === 0) {
      rawSegments.push({ start: 0, end: totalSamples });
    }

    // Merge segments separated by < 90ms (natural intra-word stops like p/t/k)
    const minPauseSamples = Math.floor(sampleRate * 0.09);
    const mergedSegments = [rawSegments[0]];
    for (let i = 1; i < rawSegments.length; i++) {
      const prev = mergedSegments[mergedSegments.length - 1];
      const curr = rawSegments[i];
      if (curr.start - prev.end < minPauseSamples) {
        prev.end = curr.end;
      } else {
        mergedSegments.push(curr);
      }
    }

    // Calculate output length: tight 15ms loop edges + exact 0.05s gap between sentences
    const edgePadSamples = Math.floor(sampleRate * 0.015);
    const gapSamples = Math.floor(sampleRate * targetGapSec);
    const fadeSamples = Math.max(1, Math.floor(sampleRate * 0.003)); // 3ms anti-click fade

    let speechSamplesTotal = 0;
    for (const seg of mergedSegments) {
      speechSamplesTotal += seg.end - seg.start;
    }

    const totalOutSamples =
      edgePadSamples * 2 +
      speechSamplesTotal +
      Math.max(0, mergedSegments.length - 1) * gapSamples;

    const outBuffer = audioCtx.createBuffer(numChannels, totalOutSamples, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const src = decoded.getChannelData(ch);
      const dst = outBuffer.getChannelData(ch);
      let writeCursor = edgePadSamples;

      mergedSegments.forEach((seg, idx) => {
        const segLen = seg.end - seg.start;
        for (let i = 0; i < segLen; i++) {
          let gain = 1;
          if (i < fadeSamples) {
            gain = i / fadeSamples;
          } else if (i > segLen - fadeSamples) {
            gain = (segLen - i) / fadeSamples;
          }
          dst[writeCursor + i] = src[seg.start + i] * gain;
        }
        writeCursor += segLen;
        if (idx < mergedSegments.length - 1) {
          writeCursor += gapSamples; // Exact 0.05s silence gap
        }
      });
    }

    const wavBlob = audioBufferToWav(outBuffer);
    const base64Data = await blobToBase64(wavBlob);
    const previewUrl = URL.createObjectURL(wavBlob);
    const trimmedDuration = outBuffer.duration;

    return {
      wavBlob,
      base64Data,
      previewUrl,
      originalDuration,
      trimmedDuration,
      savedSeconds: Math.max(0, originalDuration - trimmedDuration),
      cutsCount: Math.max(0, mergedSegments.length - 1)
    };
  } finally {
    await audioCtx.close().catch(() => {});
  }
}
