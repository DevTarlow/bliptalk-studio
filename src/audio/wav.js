/**
 * BlipTalk Studio — inline WAV encoder.
 *
 * Zero dependencies. Renders an AudioBuffer to a canonical RIFF/WAVE file
 * using 16-bit LPCM (the format every game engine, DAW and itch.io uploader
 * accepts without argument).
 */

const HEADER_BYTES = 44;
const BITS_PER_SAMPLE = 16;
const WAV_FORMAT_PCM = 1;
/** 1 LSB in normalised float terms — the reference scale for TPDF dither. */
const LSB = 1 / 32768;

/** Write an ASCII string into a DataView without touching the byte order. */
function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * TPDF (triangular probability density) dither at exactly 1 LSB peak-to-peak.
 * Quantising a float mix to 16-bit integer without this produces correlated
 * truncation distortion — audible as a gritty "digital" haze on quiet blips.
 */
function tpdf() {
  return (Math.random() - Math.random()) * LSB;
}

/**
 * Encode an AudioBuffer as 16-bit LPCM WAV bytes.
 *
 * Channels are interleaved, values are hard-clamped (the engine's soft
 * limiter means this should never actually engage) and dithered.
 *
 * @param {AudioBuffer} audioBuffer
 * @returns {ArrayBuffer} complete RIFF/WAVE file
 */
export function encodeWavBytes(audioBuffer) {
  const numChannels = Math.max(1, audioBuffer.numberOfChannels);
  const numFrames = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const blockAlign = numChannels * (BITS_PER_SAMPLE / 8);
  const dataBytes = numFrames * blockAlign;
  const out = new ArrayBuffer(HEADER_BYTES + dataBytes);
  const view = new DataView(out);

  // ---- RIFF container -----------------------------------------------------
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true); // chunk size = file size - 8
  writeAscii(view, 8, 'WAVE');

  // ---- fmt chunk ----------------------------------------------------------
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk is always 16 bytes
  view.setUint16(20, WAV_FORMAT_PCM, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // ---- data chunk ---------------------------------------------------------
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  const channels = [];
  for (let c = 0; c < numChannels; c += 1) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = HEADER_BYTES;
  for (let frame = 0; frame < numFrames; frame += 1) {
    for (let c = 0; c < numChannels; c += 1) {
      let sample = channels[c][frame] + tpdf();
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;

      // Symmetric scaling by 32768 on both sides of zero, then clamp: the
      // decode convention is `int16 / 32768`, so scaling positives by 32767
      // instead would add up to a full LSB of level error at full scale.
      // Math.round matters too — DataView.setInt16 truncates toward zero,
      // which on its own would add another half LSB of correlated distortion.
      let int16 = Math.round(sample * 32768);
      if (int16 > 32767) int16 = 32767;
      else if (int16 < -32768) int16 = -32768;

      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return out;
}

/**
 * Encode an AudioBuffer as a downloadable `audio/wav` Blob.
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob}
 */
export function encodeWav(audioBuffer) {
  return new Blob([encodeWavBytes(audioBuffer)], { type: 'audio/wav' });
}

/** Peak absolute sample across every channel — used for sanity checks/logging. */
export function peakAmplitude(audioBuffer) {
  let peak = 0;
  for (let c = 0; c < audioBuffer.numberOfChannels; c += 1) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i += 1) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }
  return peak;
}

/** Human-readable byte size, e.g. "184 KB". */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
