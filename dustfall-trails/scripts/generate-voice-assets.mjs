import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const outDir = path.resolve('src/game/assets/audio');

const callouts = {
  gunslinger: {
    file: 'stance-gunslinger.wav',
    parts: [
      { vowel: 'ah', duration: 0.17, pitch: 265, noise: 0.22 },
      { vowel: 'ih', duration: 0.15, pitch: 292, noise: 0.08 },
      { vowel: 'er', duration: 0.23, pitch: 245, noise: 0.12 },
    ],
  },
  sharpshooter: {
    file: 'stance-sharpshooter.wav',
    parts: [
      { vowel: 'ah', duration: 0.2, pitch: 286, noise: 0.24 },
      { vowel: 'oo', duration: 0.16, pitch: 318, noise: 0.06 },
      { vowel: 'er', duration: 0.22, pitch: 272, noise: 0.11 },
    ],
  },
  wrangler: {
    file: 'stance-wrangler.wav',
    parts: [
      { vowel: 'ae', duration: 0.2, pitch: 276, noise: 0.12 },
      { vowel: 'uh', duration: 0.13, pitch: 306, noise: 0.05 },
      { vowel: 'er', duration: 0.22, pitch: 252, noise: 0.12 },
    ],
  },
  outlaw: {
    file: 'stance-outlaw.wav',
    parts: [
      { vowel: 'ow', duration: 0.25, pitch: 275, noise: 0.1 },
      { vowel: 'aw', duration: 0.24, pitch: 315, noise: 0.08 },
    ],
  },
  ironRider: {
    file: 'stance-iron-rider.wav',
    parts: [
      { vowel: 'ai', duration: 0.18, pitch: 262, noise: 0.05 },
      { vowel: 'uh', duration: 0.14, pitch: 295, noise: 0.04 },
      { vowel: 'ai', duration: 0.18, pitch: 320, noise: 0.05 },
      { vowel: 'er', duration: 0.22, pitch: 268, noise: 0.11 },
    ],
  },
};

const formants = {
  ah: [720, 1240, 2500],
  ae: [660, 1720, 2410],
  ai: [520, 1850, 2550],
  aw: [640, 1120, 2350],
  er: [480, 1350, 1690],
  ih: [390, 1990, 2550],
  oo: [300, 870, 2240],
  ow: [500, 900, 2400],
  uh: [520, 1190, 2390],
};

function envelope(progress) {
  const attack = Math.min(1, progress / 0.12);
  const release = Math.min(1, (1 - progress) / 0.18);
  return Math.sin(Math.PI * Math.min(attack, release, 1) * 0.5);
}

function voicedSample(time, pitch, vowel, noiseAmount) {
  const vibrato = Math.sin(time * Math.PI * 2 * 5.7) * 5.5;
  const fundamental = pitch + vibrato;
  const harmonic =
    Math.sin(time * Math.PI * 2 * fundamental) * 0.58
    + Math.sin(time * Math.PI * 2 * fundamental * 2) * 0.24
    + Math.sin(time * Math.PI * 2 * fundamental * 3) * 0.11
    + Math.sin(time * Math.PI * 2 * fundamental * 4) * 0.05;
  const [f1, f2, f3] = formants[vowel];
  const shaped =
    Math.sin(time * Math.PI * 2 * f1) * 0.13
    + Math.sin(time * Math.PI * 2 * f2) * 0.09
    + Math.sin(time * Math.PI * 2 * f3) * 0.04;
  const breath = (Math.random() * 2 - 1) * noiseAmount;
  return harmonic * 0.72 + shaped + breath;
}

function renderCallout({ parts }) {
  const samples = [];
  const preBreath = Math.floor(sampleRate * 0.025);
  for (let i = 0; i < preBreath; i += 1) samples.push((Math.random() * 2 - 1) * 0.015);

  parts.forEach((part, partIndex) => {
    const count = Math.floor(sampleRate * part.duration);
    for (let index = 0; index < count; index += 1) {
      const progress = index / count;
      const time = index / sampleRate;
      const emphasis = partIndex === 0 ? 1.08 : partIndex === parts.length - 1 ? 1.16 : 1;
      samples.push(voicedSample(time, part.pitch, part.vowel, part.noise) * envelope(progress) * 0.35 * emphasis);
    }
    const gap = Math.floor(sampleRate * 0.018);
    for (let index = 0; index < gap; index += 1) samples.push(0);
  });

  const tail = Math.floor(sampleRate * 0.08);
  for (let index = 0; index < tail; index += 1) samples.push(0);
  return samples;
}

function writeWav(filename, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * 2);
  });
  fs.writeFileSync(path.join(outDir, filename), buffer);
}

fs.mkdirSync(outDir, { recursive: true });
Object.values(callouts).forEach((callout) => {
  writeWav(callout.file, renderCallout(callout));
});

console.log(`Generated ${Object.keys(callouts).length} stance voice assets in ${outDir}`);
