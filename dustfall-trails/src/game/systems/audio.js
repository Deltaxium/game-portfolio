import { getAudioSettings } from './settings.js';

let audioContext = null;
let cachedStanceVoice = null;
let voicesPrimed = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  return audioContext;
}

export function unlockAudio() {
  const context = getAudioContext();
  if (!context) return Promise.resolve(null);
  if (context.state === 'suspended') return context.resume().then(() => context).catch(() => context);
  return Promise.resolve(context);
}

function makeGain(context, destination, volume, start, end, duration) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(start, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, end), context.currentTime + duration);
  gain.connect(destination);
  gain.gain.value = volume;
  return gain;
}

function tone({ frequency = 440, duration = 0.08, type = 'sine', volume = 0.08, start = 0.6, end = 0.001, delay = 0, destination = null }) {
  const context = getAudioContext();
  if (!context) return;
  volume *= getAudioSettings().sfx;
  if (volume <= 0) return;
  const output = destination || context.destination;
  const oscillator = context.createOscillator();
  const gain = makeGain(context, output, volume, start, end, duration);
  const startTime = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.connect(gain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function bentTone({ frequency = 440, endFrequency = frequency, duration = 0.08, type = 'sine', volume = 0.08, delay = 0 }) {
  const context = getAudioContext();
  if (!context) return;
  volume *= getAudioSettings().sfx;
  if (volume <= 0) return;
  const oscillator = context.createOscillator();
  const gain = makeGain(context, context.destination, volume, 0.7, 0.001, duration);
  const startTime = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startTime + duration);
  oscillator.connect(gain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function noise({ duration = 0.08, volume = 0.08, filter = 1200, delay = 0 }) {
  const context = getAudioContext();
  if (!context) return;
  volume *= getAudioSettings().sfx;
  if (volume <= 0) return;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  const source = context.createBufferSource();
  const filterNode = context.createBiquadFilter();
  const gain = makeGain(context, context.destination, volume, 0.7, 0.001, duration);
  filterNode.type = 'bandpass';
  filterNode.frequency.value = filter;
  filterNode.Q.value = 0.8;
  source.buffer = buffer;
  source.connect(filterNode);
  filterNode.connect(gain);
  const startTime = context.currentTime + delay;
  source.start(startTime);
  source.stop(startTime + duration);
}

export function playSfx(name) {
  const effects = {
    'button-town': () => {
      tone({ frequency: 420, duration: 0.07, type: 'triangle', volume: 0.12 });
      tone({ frequency: 620, duration: 0.06, type: 'sine', volume: 0.09, delay: 0.035 });
      tone({ frequency: 260, duration: 0.08, type: 'square', volume: 0.035, delay: 0.012 });
    },
    'button-battle': () => {
      tone({ frequency: 210, duration: 0.055, type: 'square', volume: 0.075 });
      tone({ frequency: 310, duration: 0.07, type: 'triangle', volume: 0.09, delay: 0.025 });
    },
    item: () => {
      tone({ frequency: 540, duration: 0.08, type: 'sine', volume: 0.045 });
      tone({ frequency: 760, duration: 0.12, type: 'triangle', volume: 0.035, delay: 0.05 });
      noise({ duration: 0.09, volume: 0.018, filter: 2200, delay: 0.02 });
    },
    rifle: () => {
      noise({ duration: 0.055, volume: 0.11, filter: 2300 });
      bentTone({ frequency: 180, endFrequency: 72, duration: 0.18, type: 'sawtooth', volume: 0.052 });
      tone({ frequency: 980, duration: 0.025, type: 'square', volume: 0.022, delay: 0.012 });
    },
    shotgun: () => {
      noise({ duration: 0.18, volume: 0.18, filter: 430 });
      noise({ duration: 0.09, volume: 0.09, filter: 1300, delay: 0.035 });
      bentTone({ frequency: 92, endFrequency: 46, duration: 0.22, type: 'sawtooth', volume: 0.07 });
    },
    revolver: () => {
      noise({ duration: 0.05, volume: 0.095, filter: 1700 });
      tone({ frequency: 360, duration: 0.035, type: 'square', volume: 0.045 });
      bentTone({ frequency: 180, endFrequency: 110, duration: 0.09, type: 'triangle', volume: 0.032, delay: 0.018 });
    },
    throwable: () => {
      bentTone({ frequency: 520, endFrequency: 180, duration: 0.12, type: 'triangle', volume: 0.04 });
      noise({ duration: 0.16, volume: 0.09, filter: 520, delay: 0.06 });
      bentTone({ frequency: 130, endFrequency: 52, duration: 0.2, type: 'sawtooth', volume: 0.052, delay: 0.07 });
    },
    melee: () => {
      noise({ duration: 0.07, volume: 0.06, filter: 380 });
      tone({ frequency: 180, duration: 0.075, type: 'triangle', volume: 0.045 });
    },
    move: () => {
      noise({ duration: 0.06, volume: 0.045, filter: 760 });
      tone({ frequency: 220, duration: 0.06, type: 'triangle', volume: 0.04, delay: 0.02 });
    },
    mount: () => {
      tone({ frequency: 180, duration: 0.08, type: 'triangle', volume: 0.08 });
      noise({ duration: 0.08, volume: 0.055, filter: 900, delay: 0.03 });
      tone({ frequency: 330, duration: 0.06, type: 'sine', volume: 0.055, delay: 0.07 });
    },
    dismount: () => {
      noise({ duration: 0.09, volume: 0.06, filter: 520 });
      tone({ frequency: 150, duration: 0.08, type: 'triangle', volume: 0.055, delay: 0.025 });
    },
    'horse-charge': () => {
      noise({ duration: 0.11, volume: 0.11, filter: 620 });
      bentTone({ frequency: 140, endFrequency: 70, duration: 0.2, type: 'sawtooth', volume: 0.075 });
      tone({ frequency: 420, duration: 0.05, type: 'square', volume: 0.04, delay: 0.08 });
    },
    'horse-ride-by': () => {
      noise({ duration: 0.075, volume: 0.075, filter: 1150 });
      bentTone({ frequency: 360, endFrequency: 180, duration: 0.14, type: 'triangle', volume: 0.055 });
    },
    'horse-trample': () => {
      noise({ duration: 0.18, volume: 0.13, filter: 360 });
      tone({ frequency: 95, duration: 0.16, type: 'square', volume: 0.07 });
      tone({ frequency: 140, duration: 0.08, type: 'triangle', volume: 0.055, delay: 0.08 });
    },
    combo: () => {
      tone({ frequency: 220, duration: 0.08, type: 'triangle', volume: 0.07 });
      tone({ frequency: 440, duration: 0.08, type: 'sine', volume: 0.07, delay: 0.06 });
      noise({ duration: 0.16, volume: 0.1, filter: 800, delay: 0.08 });
      bentTone({ frequency: 180, endFrequency: 68, duration: 0.22, type: 'sawtooth', volume: 0.075, delay: 0.1 });
    },
  };
  const effect = effects[name] || effects['button-town'];
  unlockAudio().then((context) => {
    if (!context || context.state !== 'running') return;
    effect();
  });
}

function stanceLine(stance) {
  const lines = {
    Gunslinger: 'Gunslinger!',
    Sharpshooter: 'Sharpshooter!',
    Wrangler: 'Wrangler!',
    Outlaw: 'Outlaw!',
    'Iron Rider': 'Iron Rider!',
  };
  return lines[stance] || `${stance}!`;
}

function primeVoices() {
  if (voicesPrimed || typeof window === 'undefined' || !window.speechSynthesis) return;
  voicesPrimed = true;
  window.speechSynthesis.getVoices?.();
  window.speechSynthesis.onvoiceschanged ||= () => {
    cachedStanceVoice = null;
  };
}

function femaleVoiceScore(voice) {
  const name = `${voice.name} ${voice.voiceURI || ''}`.toLowerCase();
  const lang = (voice.lang || '').toLowerCase();
  let score = /^en[-_]/.test(lang) ? 20 : 0;
  if (/female|woman|girl/.test(name)) score += 100;
  if (/samantha|victoria|zira|karen|serena|susan|ava|allison|joanna|salli|kimberly|kendra|amy|emma|olivia|tessa|moira|fiona|veena|martha|hazel|aria|jenny|natasha|sonia/.test(name)) score += 90;
  if (/google us english/.test(name) && /female/.test(name)) score += 70;
  if (/male|man|guy|david|mark|daniel|alex|fred|tom|george|arthur|james|brian|gordon|ralph|bruce/.test(name)) score -= 140;
  if (voice.localService) score += 5;
  return score;
}

function getFemaleStanceVoice() {
  if (cachedStanceVoice) return cachedStanceVoice;
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (!voices.length) return null;
  const savedName = window.localStorage?.getItem('dustfallStanceVoiceName');
  const saved = savedName ? voices.find((voice) => voice.name === savedName) : null;
  if (saved && femaleVoiceScore(saved) > 0) {
    cachedStanceVoice = saved;
    return cachedStanceVoice;
  }
  const ranked = [...voices].sort((a, b) => femaleVoiceScore(b) - femaleVoiceScore(a));
  cachedStanceVoice = ranked.find((voice) => femaleVoiceScore(voice) >= 80)
    || ranked.find((voice) => femaleVoiceScore(voice) > 0)
    || null;
  if (cachedStanceVoice) window.localStorage?.setItem('dustfallStanceVoiceName', cachedStanceVoice.name);
  return cachedStanceVoice;
}

export function speakStance(stance) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  primeVoices();
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(stanceLine(stance));
  const preferred = getFemaleStanceVoice();
  if (preferred) utterance.voice = preferred;
  utterance.lang = preferred?.lang || 'en-US';
  utterance.rate = 1.12;
  utterance.pitch = 1.55;
  utterance.volume = 0.95 * getAudioSettings().sfx;
  synth.cancel();
  synth.speak(utterance);
}

primeVoices();
