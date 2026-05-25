const AUDIO_SETTINGS_KEY = 'dustfallAudioSettings';

const DEFAULT_AUDIO_SETTINGS = {
  music: 1,
  sfx: 1,
};

let previewAudioSettings = null;

function clampVolume(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
}

export function getAudioSettings() {
  if (previewAudioSettings) return { ...previewAudioSettings };
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const saved = JSON.parse(window.localStorage?.getItem(AUDIO_SETTINGS_KEY) || '{}');
    return {
      music: clampVolume(saved.music ?? DEFAULT_AUDIO_SETTINGS.music),
      sfx: clampVolume(saved.sfx ?? DEFAULT_AUDIO_SETTINGS.sfx),
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings) {
  const next = {
    music: clampVolume(settings.music),
    sfx: clampVolume(settings.sfx),
  };
  if (typeof window !== 'undefined') {
    window.localStorage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next));
  }
  return next;
}

export function setPreviewAudioSettings(settings) {
  previewAudioSettings = {
    music: clampVolume(settings.music),
    sfx: clampVolume(settings.sfx),
  };
  return { ...previewAudioSettings };
}

export function clearPreviewAudioSettings() {
  previewAudioSettings = null;
}
