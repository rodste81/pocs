export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number, // Kept for signature compatibility but unused
  numChannels: number, // Kept for signature compatibility but unused
): Promise<AudioBuffer> {
  // Header is 00 00 00 00, confirming raw PCM data.
  // Native decodeAudioData fails. Reverting to manual decoding.
  console.log(`Decoding PCM audio data of size: ${data.byteLength} bytes`);

  // Ensure even byte length for Int16Array
  let bufferToUse = data.buffer;
  if (data.byteLength % 2 !== 0) {
    console.warn("Audio data length is odd, padding with one byte.");
    const newBuffer = new Uint8Array(data.byteLength + 1);
    newBuffer.set(data);
    bufferToUse = newBuffer.buffer;
  }

  const dataInt16 = new Int16Array(bufferToUse);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}