const SAVE_KEY = 'dustfall-trails-save-v1';
const SLOT_KEYS = [
  SAVE_KEY,
  'dustfall-trails-save-v1-slot-2',
  'dustfall-trails-save-v1-slot-3',
];

export const SAVE_SLOTS = [1, 2, 3];

export function createInitialGameState() {
  return {
    money: 90,
    wanted: 1,
    supplies: 4,
    showdown: 0,
    bountyActive: false,
    activeBountyId: null,
    routeProgress: 0,
    preparedSynergy: null,
    nextEncounterId: null,
    tutorial: {
      battleComplete: false,
      townComplete: false,
      active: false,
    },
    items: {
      bandage: 2,
      canteen: 2,
      whiskey: 1,
    },
    party: null,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function saveGame(state) {
  return saveGameSlot(1, state);
}

export function saveGameSlot(slot, state) {
  if (!storageAvailable()) return false;
  const key = SLOT_KEYS[slot - 1] || SLOT_KEYS[0];
  const payload = {
    version: 1,
    slot,
    savedAt: new Date().toISOString(),
    state: clone(state),
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
  return payload;
}

export function loadGame() {
  return loadGameSlot(1);
}

export function loadGameSlot(slot) {
  if (!storageAvailable()) return null;
  const key = SLOT_KEYS[slot - 1] || SLOT_KEYS[0];
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    if (!payload?.state) return null;
    return {
      ...createInitialGameState(),
      ...payload.state,
      items: {
        ...createInitialGameState().items,
        ...(payload.state.items || {}),
      },
      slot,
      savedAt: payload.savedAt,
    };
  } catch {
    return null;
  }
}

export function hasSaveGame() {
  return hasAnySaveGame();
}

export function hasAnySaveGame() {
  return SAVE_SLOTS.some((slot) => Boolean(loadGameSlot(slot)));
}

export function getSaveInfo() {
  return getSaveSlotInfo(1);
}

export function getSaveSlotInfo(slot) {
  const saved = loadGameSlot(slot);
  if (!saved?.savedAt) return null;
  const party = saved.party?.riders || [];
  const crewHealth = party.length
    ? party.map((rider) => `${rider.name.split(' ')[0]} ${rider.hp}/${rider.maxHp}`).join('   ')
    : 'Crew not prepared';
  return {
    slot,
    savedAt: saved.savedAt,
    label: new Date(saved.savedAt).toLocaleString(),
    money: saved.money,
    supplies: saved.supplies,
    wanted: saved.wanted,
    routeProgress: saved.routeProgress || 0,
    bountyActive: Boolean(saved.bountyActive),
    crewHealth,
  };
}

export function getSaveSlotInfos() {
  return SAVE_SLOTS.map((slot) => getSaveSlotInfo(slot));
}
