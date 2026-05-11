const sfx = {
  step: [120, 0.025, 'square', 0.025],
  menu: [440, 0.04, 'triangle', 0.03],
  item: [680, 0.08, 'sine', 0.04],
  valve: [260, 0.1, 'sawtooth', 0.035],
  success: [740, 0.16, 'triangle', 0.05],
  battle: [90, 0.2, 'sawtooth', 0.04],
  ready: [520, 0.08, 'square', 0.035],
  hit: [170, 0.08, 'square', 0.04],
  enemy: [110, 0.1, 'sawtooth', 0.04],
  heal: [620, 0.12, 'sine', 0.04],
  error: [80, 0.09, 'square', 0.035],
};

const sfxCooldowns = {
  error: 420,
  menu: 70,
  step: 90,
  ready: 120,
};

export function playSfx(scene, type) {
  if (scene.settingsState?.muted) return;
  const audioContext = scene.sound?.context;
  const settings = sfx[type];
  if (!audioContext || audioContext.state === 'closed' || !settings) return;

  scene.sfxLastPlayed ??= {};
  const now = scene.time?.now ?? performance.now();
  const cooldown = sfxCooldowns[type] || 0;
  if (cooldown && now - (scene.sfxLastPlayed[type] || 0) < cooldown) return;
  scene.sfxLastPlayed[type] = now;

  const [frequency, duration, wave, gainValue] = settings;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(gainValue, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}
