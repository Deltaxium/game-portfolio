import Phaser from 'phaser';
import './styles.css';
import { BIOME_MAPS } from './maps/biomeMaps.js';
import { ITEM_BY_ID, ITEM_CATALOG, createRunInventory, getXpToNextLevel, isXpRelic } from './items/itemCatalog.js';

const WORLD_SCALE = 1.25;
const GAME_WIDTH = 1800;
const GAME_HEIGHT = 1000;
const TITLE_WORLD_WIDTH = 1440;
const TITLE_WORLD_HEIGHT = 800;
const TITLE_SCALE = Math.min(GAME_WIDTH / TITLE_WORLD_WIDTH, GAME_HEIGHT / TITLE_WORLD_HEIGHT);
const TITLE_OFFSET_X = (GAME_WIDTH - TITLE_WORLD_WIDTH * TITLE_SCALE) / 2;
const TITLE_OFFSET_Y = (GAME_HEIGHT - TITLE_WORLD_HEIGHT * TITLE_SCALE) / 2;
const TITLE_CENTER_X = TITLE_WORLD_WIDTH / 2;
const TITLE_SHIFT_X = TITLE_CENTER_X - 480;
const TILE_SIZE = 64 * WORLD_SCALE;
const MAP_COLS = 18;
const MAP_ROWS = 12;
const MAP_PIXEL_WIDTH = MAP_COLS * TILE_SIZE;
const MAP_PIXEL_HEIGHT = MAP_ROWS * TILE_SIZE;
const WORLD_WIDTH = Math.max(GAME_WIDTH, MAP_PIXEL_WIDTH);
const WORLD_HEIGHT = Math.max(GAME_HEIGHT, MAP_PIXEL_HEIGHT);
const WORLD_OFFSET_X = (WORLD_WIDTH - MAP_PIXEL_WIDTH) / 2;
const WORLD_OFFSET_Y = (WORLD_HEIGHT - MAP_PIXEL_HEIGHT) / 2;
const PLAYER_SHOT_DAMAGE = 25;
const ENEMY_SHOT_DAMAGE = 5;
const RICOCHET_SHOT_RANGE_MS = 900;
const ENEMY_SPRITE_SIZE = 88;
const ENEMY_FIRE_INTERVAL_MS = 1650;
const ENEMY_FIRST_FIRE_DELAY_MS = 1800;
const ENEMY_SHOTS_PER_SALVO = 2;
const BASE_PLAYER_MAX_HP = 100;
const BASE_PLAYER_MAX_ENERGY = 100;
const BASE_PLAYER_SHOT_SPEED = 560 * WORLD_SCALE;
const RELIC_XP_PER_KILL = 1;
const AUTO_SAVE_KEY = 'stormwake-isles-autosave-v2';
const SAVE_SLOT_KEYS = [
  'stormwake-isles-save-v2-slot-1',
  'stormwake-isles-save-v2-slot-2',
  'stormwake-isles-save-v2-slot-3',
];
const AUDIO_SETTINGS_KEY = 'stormwake-isles-audio-settings-v1';
const DEFAULT_AUDIO_SETTINGS = { music: 1, sfx: 1 };
const BASE_DRAG = 0.82;
const BASE_MAX_VELOCITY = 230 * WORLD_SCALE;
const BASE_THRUST = 190 * WORLD_SCALE;
const BOOST_THRUST = 280 * WORLD_SCALE;
const PORTAL_TRIGGER_RADIUS = 48 * WORLD_SCALE;
const PORTAL_PROMPT_RADIUS = 150 * WORLD_SCALE;
const CORRIDOR_LENGTH = 520 * WORLD_SCALE;
const CORRIDOR_TRIGGER_RADIUS = 58 * WORLD_SCALE;
const CORRIDOR_EXIT_RADIUS = 46 * WORLD_SCALE;
const HIDDEN_PUZZLE_TIER = 3;
const MYTHIC_PUZZLE_TIER = 5;
const MYTHIC_PUZZLE_ROOM = 5;
const LEVEL_ROOM_MIN = 6;
const LEVEL_ROOM_MAX = 9;
const MAX_RELIC_SLOTS = 5;
const POWERUP_STRENGTH_BY_RARITY = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
};

const HIGH_TIER_ENCOUNTERS = {
  'starter-sky': [['Trade-Wind Corsair', '#e0ba67'], ['Veteran Cloud Manta', '#a3ead7'], ['Royal Smuggler Wing', '#d66b62']],
  'storm-fields': [['Overcharged Strider', '#74fff1'], ['Ball Lightning Choir', '#c8f6ff'], ['Storm Regent Guard', '#f7f3af']],
  'ash-isles': [['Lavawake Marauder', '#ff9d3f'], ['Pyre Vent Engine', '#ff6b26'], ['Charred Cinder Kite', '#ff8738']],
  'crystal-reefs': [['Shard Oracle', '#b57cff'], ['Crystal Lance Ray', '#9eefff'], ['Ancient Facet Choir', '#68ffe0']],
  'frozen-heights': [['Rime Serpent', '#d9fbff'], ['Imperial Icecrown Patrol', '#f5fbff'], ['Frostbite Manta', '#93cadd']],
  'jungle-islands': [['Venom Brood Glider', '#d2e878'], ['Elder Cloud Serpent', '#78cbd7'], ['Canopy Broodmother', '#c9e870']],
  'industrial-ruins': [['Titan Defense Grid', '#46d3c6'], ['Overclocked Foundry Core', '#ff8e3c'], ['Clockwork Leviathan Ray', '#78d7ca']],
  'pirate-dens': [['Redwake Broadside', '#c23b45'], ['Powder Baron Kite', '#f2b05e'], ['Hookwing Captain', '#f05b63']],
  'floating-temples': [['Aether Sentinel', '#75eaff'], ['Ancient Bell Choir', '#f3df85'], ['Rune Warden Ray', '#66f2ff']],
  'black-cloud-region': [['Nightmare Gate', '#8a2b53'], ['Corrupted Horizon Engine', '#35d0a8'], ['Void Reaver Wing', '#9d4d75']],
};

const TILE_STYLE = {
  '.': { label: '', fill: 0x72b8c6, alpha: 0.1 },
  C: { label: '', fill: 0xf2f7f4, alpha: 0.28 },
  I: { label: '', fill: 0x2d5d70, alpha: 0.95 },
  R: { label: '', fill: 0x375c73, alpha: 0.88 },
  F: { label: '', fill: 0x236558, alpha: 0.88 },
  M: { label: '', fill: 0x4b5666, alpha: 0.9 },
  V: { label: '', fill: 0xc34842, alpha: 0.92 },
  K: { label: '', fill: 0x5ae0d2, alpha: 0.86 },
  P: { label: '', fill: 0x714c8c, alpha: 0.9 },
  T: { label: '', fill: 0xffc857, alpha: 0.88 },
  B: { label: '', fill: 0x151826, alpha: 0.95 },
  S: { label: '', fill: 0x496a86, alpha: 0.7 },
  L: { label: '', fill: 0x8df0ff, alpha: 0.8 },
  X: { label: '', fill: 0xcfd8dc, alpha: 0.82 },
  A: { label: '', fill: 0xff6f59, alpha: 0.88 },
};

const titleColors = {
  deep: 0x071622,
  sky: 0x14384b,
  reef: 0x1d6f7b,
  aqua: 0x62d7d9,
  mint: 0xb9f6d6,
  coral: 0xff6f59,
  amber: 0xffc857,
  ink: 0x0d1b2a,
  panel: 0x102536,
};

const ENCOUNTER_VARIANTS = {
  'starter-sky': [
    ['Merchant Drift', '#d7aa54'], ['Pirate Skiff', '#aa2f38'], ['Salvage Cache', '#77985c'], ['Storm Bird', '#52bdd8'],
    ['Compass Kite', '#7ec9d8'], ['Brass Glider', '#d0a64c'], ['Cloud Manta', '#8dd7c4'], ['Smuggler Skiff', '#c65d50'],
  ],
  'storm-fields': [
    ['Lightning Cell', '#39d8ff'], ['Automaton Drone', '#42c6b8'], ['Storm Ray', '#7288a6'], ['Elite Tempest', '#f7f3af'],
    ['Thunder Wisp', '#8df0ff'], ['Coil Strider', '#46d3c6'], ['Static Diver', '#a7f4ff'], ['Volt Reaver', '#dbe97c'],
  ],
  'ash-isles': [
    ['Ash Raider', '#b3312b'], ['Volcanic Vent', '#ff6b26'], ['Burnt Wreck', '#7c6b62'], ['Elite Cinderlord', '#ffb347'],
    ['Ember Kite', '#ff8738'], ['Cinder Skiff', '#c34842'], ['Smoke Manta', '#9b6a5c'], ['Magma Sloop', '#ff9d3f'],
  ],
  'crystal-reefs': [
    ['Crystal Vault', '#74f7de'], ['Cult Relicship', '#f4da87'], ['Sky Jellyfish', '#b57cff'], ['Ancient Prism', '#44d6ff'],
    ['Facet Warden', '#68ffe0'], ['Prism Ray', '#9eefff'], ['Quartz Skiff', '#a36cff'], ['Relic Diver', '#f3df85'],
  ],
  'frozen-heights': [
    ['Imperial Patrol', '#dfe7ef'], ['Frozen Cache', '#9ed4e5'], ['Cloud Serpent', '#bfd7df'], ['Elite Icebreaker', '#6788a0'],
    ['Rime Cutter', '#c9eef8'], ['Frost Glider', '#f5fbff'], ['Ice Manta', '#93cadd'], ['Snow Corsair', '#b9d5e2'],
  ],
  'jungle-islands': [
    ['Storm Bird Nest', '#5ca75a'], ['Jungle Wreck', '#9a7148'], ['Cloud Serpent', '#78cbd7'], ['Elite Broodmother', '#c9e870'],
    ['Spore Drifter', '#99c45f'], ['Canopy Skiff', '#5ea868'], ['Vine Ray', '#87d199'], ['Feral Glider', '#d2e878'],
  ],
  'industrial-ruins': [
    ['Defense Grid', '#46d3c6'], ['Imperial Claim Team', '#dce2e8'], ['Gear Vault', '#bf8946'], ['Elite Foundry Core', '#ff8e3c'],
    ['Steam Drone', '#c6bd9f'], ['Rivet Cutter', '#ba8e46'], ['Scrap Sloop', '#8a8270'], ['Clockwork Ray', '#78d7ca'],
  ],
  'pirate-dens': [
    ['Raider Dock', '#b8323a'], ['Cannon Nest', '#8d6240'], ['Loot Vault', '#d0a64c'], ['Elite Dread Captain', '#f05b63'],
    ['Boarding Skiff', '#d64b53'], ['Powder Kite', '#b86d42'], ['Hookwing', '#f2b05e'], ['Redwake Sloop', '#c23b45'],
  ],
  'floating-temples': [
    ['Cloud Shrine', '#f0d77d'], ['Cult Procession', '#f4f1de'], ['Ancient Sentinel', '#48d8ce'], ['Elite Relic Choir', '#75eaff'],
    ['Bell Warden', '#e8dcc0'], ['Rune Kite', '#66f2ff'], ['Temple Ray', '#f3df85'], ['Choir Drone', '#b9f6d6'],
  ],
  'black-cloud-region': [
    ['Blackstorm Gate', '#8a2b53'], ['Corrupted Machine', '#35d0a8'], ['Dread Pirate Wing', '#c23b45'], ['Boss Fortress', '#ed5a72'],
    ['Void Reaver', '#9d4d75'], ['Horizon Skiff', '#7559d6'], ['Corruptor Ray', '#a72f4d'], ['Night Engine', '#35d0a8'],
  ],
};

const LEGENDARY_RELIC_BY_BIOME = {
  'starter-sky': 'cloudbreaker-ram',
  'storm-fields': 'heart-of-the-tempest',
  'ash-isles': 'ember-engine',
  'crystal-reefs': 'crystal-conduit',
  'frozen-heights': 'dead-captains-wheel',
  'jungle-islands': 'celestial-compass',
  'industrial-ruins': 'leviathan-engine',
  'pirate-dens': 'glass-hull',
  'floating-temples': 'void-sail',
  'black-cloud-region': 'black-horizon-core',
};

const LEGENDARY_QUESTS = {
  'starter-sky': { pickupAt: [1, 3], chargeAt: [2, 2], pickup: ['compass-scrap', 'S'], charge: ['sun-vane', 'V'], objectStyle: 'kite', puzzleType: 'ordered', puzzleStyle: 'wind', activationRule: 'momentum', activationHint: 'Hold speed through the wind compass in order.', puzzleRoom: 4, symbols: ['N', 'E', 'W'] },
  'storm-fields': { pickupAt: [1, 2], chargeAt: [2, 4], pickup: ['static-coil', 'C'], charge: ['lightning-spire', 'L'], objectStyle: 'spire', puzzleType: 'all', puzzleStyle: 'lightning', activationRule: 'boost', activationHint: 'Boost through each lightning rod to conduct the storm.', puzzleRoom: 3, symbols: ['+', '+', '+', '+'] },
  'ash-isles': { pickupAt: [1, 4], chargeAt: [2, 1], pickup: ['ember-seed', 'E'], charge: ['magma-vent', 'V'], objectStyle: 'vent', puzzleType: 'ordered', puzzleStyle: 'flame', activationRule: 'forge', activationHint: 'Fire at each forge vent in sequence to temper the ember.', puzzleRoom: 2, symbols: ['I', 'II', 'III'] },
  'crystal-reefs': { pickupAt: [1, 1], chargeAt: [2, 3], pickup: ['glass-key', 'K'], charge: ['prism-focus', 'P'], objectStyle: 'prism', puzzleType: 'ordered', puzzleStyle: 'mirror', activationRule: 'align', activationHint: 'Face the shrine from each mirror to align the prism path.', puzzleRoom: 4, symbols: ['A', 'B', 'A'] },
  'frozen-heights': { pickupAt: [1, 5], chargeAt: [2, 2], pickup: ['rime-lens', 'R'], charge: ['ice-silence', 'I'], objectStyle: 'ice', puzzleType: 'all', puzzleStyle: 'snow', activationRule: 'still', activationHint: 'Come nearly still inside each snow seal to freeze it open.', puzzleRoom: 1, symbols: ['*', '*', '*'] },
  'jungle-islands': { pickupAt: [1, 2], chargeAt: [2, 5], pickup: ['seed-heart', 'S'], charge: ['canopy-bloom', 'B'], objectStyle: 'seed', puzzleType: 'return', puzzleStyle: 'vine', activationRule: 'pollinate', activationHint: 'Sweep through the blooms at speed, then return to the seed shrine.', puzzleRoom: 3, symbols: ['1', '2', '3'] },
  'industrial-ruins': { pickupAt: [1, 4], chargeAt: [2, 2], pickup: ['gear-code', 'G'], charge: ['foundry-switch', 'F'], objectStyle: 'gear', puzzleType: 'all', puzzleStyle: 'machine', activationRule: 'rhythm', activationHint: 'Shoot the machine switches quickly enough to keep foundry rhythm.', puzzleRoom: 1, symbols: ['A', 'B', 'C'] },
  'pirate-dens': { pickupAt: [1, 1], chargeAt: [2, 5], pickup: ['black-map', 'M'], charge: ['red-beacon', 'B'], objectStyle: 'map', puzzleType: 'ordered', puzzleStyle: 'route', activationRule: 'raid', activationHint: 'Boost through the marked ambush route before the trail goes cold.', puzzleRoom: 2, symbols: ['X', 'O', 'X'] },
  'floating-temples': { pickupAt: [1, 3], chargeAt: [2, 1], pickup: ['temple-chime', 'T'], charge: ['choir-bell', 'B'], objectStyle: 'bell', puzzleType: 'return', puzzleStyle: 'temple', activationRule: 'harmony', activationHint: 'Perform Boost, Fire, then Stillness to tune the three temple tones.', puzzleRoom: 4, symbols: ['I', 'II', 'III'] },
  'black-cloud-region': { pickupAt: [1, 5], chargeAt: [2, 3], pickup: ['void-splinter', 'Z'], charge: ['dark-anchor', 'A'], objectStyle: 'void', puzzleType: 'all', puzzleStyle: 'void', activationRule: 'silence', activationHint: 'Drift silently through the void anchors without firing or boosting.', puzzleRoom: 2, symbols: ['?', '?', '?', '?'] },
};

const MYTHIC_RELIC_BY_BIOME = {
  'black-cloud-region': 'eclipse-cortex',
};

const ENEMY_RELIC_DROPS_BY_BIOME = {
  'starter-sky': ['sky-vane-rig'],
  'storm-fields': ['stormglass-battery'],
  'ash-isles': ['cinder-fuse'],
  'crystal-reefs': ['prism-lens'],
  'frozen-heights': ['rime-keel'],
  'jungle-islands': ['vinewrapped-cargo-net'],
  'industrial-ruins': ['rivet-armor-plate'],
  'pirate-dens': ['powder-keg-breech'],
  'floating-temples': ['temple-aether-chime'],
  'black-cloud-region': ['umbral-gyroscope'],
};

const MYTHIC_PUZZLES = {
  'black-cloud-region': {
    requiredRelic: 'black-horizon-core',
    puzzleType: 'return',
    puzzleStyle: 'eclipse',
    puzzleRoom: MYTHIC_PUZZLE_ROOM,
    activationHint: 'The Core stirs when it reaches the Heart of the Clouds.',
    symbols: ['I', 'II', 'III', 'IV', 'V'],
    pickup: ['black-horizon-core', 'H'],
    charge: ['eclipse-cortex', 'E'],
  },
};

const BIOME_META = {
  'starter-sky': { icon: 'SKY', boss: 'Cloudbreaker Flagship', bossRelic: 'ricochet-chamber' },
  'storm-fields': { icon: 'STM', boss: 'Tempest Regent', bossRelic: 'lightning-rod-mast' },
  'ash-isles': { icon: 'ASH', boss: 'Cinderlord Engine', bossRelic: 'pulse-dash-core' },
  'crystal-reefs': { icon: 'CRY', boss: 'Prism Oracle', bossRelic: 'quantum-rudder' },
  'frozen-heights': { icon: 'ICE', boss: 'Icebreaker Crown', bossRelic: 'harpoon-launcher' },
  'jungle-islands': { icon: 'JNG', boss: 'Broodmother Nest', bossRelic: 'gravity-mine' },
  'industrial-ruins': { icon: 'IND', boss: 'Foundry Leviathan', bossRelic: 'chainstorm-coil' },
  'pirate-dens': { icon: 'PIR', boss: 'Dread Captain', bossRelic: 'harpoon-launcher' },
  'floating-temples': { icon: 'TMP', boss: 'Relic Choir', bossRelic: 'quantum-rudder' },
  'black-cloud-region': { icon: 'DRK', boss: 'Black Horizon', bossRelic: 'corrupted-relic' },
};

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function makeInitialRunState() {
  return {
    biomeIndex: 0,
    inventory: createRunInventory(),
    activePowerups: [],
    lastLootDrop: 'None',
    lastRelicTrigger: 'None',
    enemyHitCount: 0,
    playerHitCount: 0,
    enemySalvoCount: 0,
    savedAt: null,
    player: null,
    roomDepth: 0,
    biomeStreak: 0,
    islandTier: 1,
    roomInChain: 1,
    roomGraph: null,
    currentRoomId: 'start',
    portalOpen: false,
    roomCleared: false,
    tutorialEnabled: false,
    tutorialComplete: false,
    tutorialSeen: {},
    legendaryQuestState: {},
    routeChoices: [],
  };
}

function cloneRunState(state) {
  return JSON.parse(JSON.stringify(state));
}

function hashRoomSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state + 0x6d2b79f5, 1);
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function saveRunState(state, key = AUTO_SAVE_KEY, slot = 'auto') {
  if (!storageAvailable()) return null;
  const payload = {
    ...cloneRunState(state),
    slot,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
  return payload;
}

function loadRunState(key) {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.inventory)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getSaveInfo(key, slot) {
  const state = loadRunState(key);
  if (!state) return null;
  const biome = BIOME_MAPS[state.biomeIndex] || BIOME_MAPS[0];
  return {
    slot,
    state,
    label: state.savedAt ? new Date(state.savedAt).toLocaleString() : 'Unknown time',
    biome: biome.name,
    items: (state.inventory?.length ?? 0) + (state.activePowerups?.length ?? 0),
    relics: state.inventory?.filter((entry) => isXpRelic(ITEM_BY_ID[entry.id])).length ?? 0,
    roomDepth: state.roomDepth ?? 0,
    biomeStreak: state.biomeStreak ?? 0,
    islandTier: state.islandTier ?? 1,
    roomInChain: state.roomInChain ?? 1,
  };
}

function formatSaveLocation(info) {
  if (!info) return 'No saved run';
  return `${info.biome} ${info.islandTier}-${info.roomInChain}`;
}

function formatSaveSummary(info) {
  if (!info) return 'No saved run';
  return [
    `Saved ${info.label}`,
    `Location: ${formatSaveLocation(info)}`,
    `Run depth: ${info.roomDepth} rooms`,
    `Inventory: ${info.items} items, ${info.relics} relics`,
  ].join('\n');
}

function formatCompactSaveSummary(info) {
  if (!info) return 'Empty';
  return `${formatSaveLocation(info)} | Depth ${info.roomDepth} | ${info.relics} relics`;
}

function deleteSave(slot) {
  if (!storageAvailable()) return;
  if (slot === 'auto') window.localStorage.removeItem(AUTO_SAVE_KEY);
  else window.localStorage.removeItem(SAVE_SLOT_KEYS[slot - 1]);
}

function clampSetting(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
}

function getAudioSettings() {
  if (!storageAvailable()) return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const saved = JSON.parse(window.localStorage.getItem(AUDIO_SETTINGS_KEY) || '{}');
    return {
      music: clampSetting(saved.music ?? DEFAULT_AUDIO_SETTINGS.music),
      sfx: clampSetting(saved.sfx ?? DEFAULT_AUDIO_SETTINGS.sfx),
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function saveAudioSettings(settings) {
  const next = {
    music: clampSetting(settings.music),
    sfx: clampSetting(settings.sfx),
  };
  if (storageAvailable()) window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function formatMenuLabel(label, key) {
  return key ? `${label} (${key})` : label;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.cameras.main.setViewport(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setZoom(1);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;
    this.promptObjects = [];
    this.loadOpen = false;
    this.selectedLoadSlot = 'auto';
    this.titleOptions = null;
    this.refreshSaveState();
    this.draw();
    this.input.keyboard.on('keydown-ENTER', () => { if (!this.titleOptions) this.openNewGamePrompt(); });
    this.input.keyboard.on('keydown-SPACE', () => this.openNewGamePrompt());
    this.input.keyboard.on('keydown-N', () => this.openNewGamePrompt());
    this.input.keyboard.on('keydown-C', () => this.continueAuto());
    this.input.keyboard.on('keydown-L', () => this.handleLoadKey());
    this.input.keyboard.on('keydown-O', () => this.openOptions());
    this.input.keyboard.on('keydown-UP', () => this.adjustTitleOptionSelection(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.adjustTitleOptionSelection(1));
    this.input.keyboard.on('keydown-LEFT', () => this.adjustTitleOptionValue(-0.05));
    this.input.keyboard.on('keydown-RIGHT', () => this.adjustTitleOptionValue(0.05));
    this.input.keyboard.on('keydown-ENTER', () => { if (this.titleOptions) this.saveTitleOptions(); });
    this.input.keyboard.on('keydown-D', () => { if (this.loadOpen) this.openDeletePrompt(); });
    this.input.keyboard.on('keydown-R', () => { if (this.titleOptions) this.openResetPrompt(); });
    this.input.keyboard.on('keydown-ESC', () => this.clearPrompt());
    this.input.keyboard.on('keydown-ONE', () => this.selectLoadSlot('auto'));
    this.input.keyboard.on('keydown-TWO', () => this.selectLoadSlot(1));
    this.input.keyboard.on('keydown-THREE', () => this.selectLoadSlot(2));
    this.input.keyboard.on('keydown-FOUR', () => this.selectLoadSlot(3));
  }

  update(time) {
    const t = time * 0.001;
    this.cloudBands?.forEach((band, index) => {
      band.x = ((t * (10 + index)) % 160) - 80;
      band.y = band.baseY + Math.sin(t * 0.7 + band.phase) * 4;
      band.alpha = 0.4 + Math.sin(t + band.phase) * 0.12;
    });
  }

  refreshSaveState() {
    this.autoInfo = getSaveInfo(AUTO_SAVE_KEY, 'auto');
    this.slotInfos = SAVE_SLOT_KEYS.map((key, index) => getSaveInfo(key, index + 1));
    this.canContinue = Boolean(this.autoInfo);
    this.canLoad = Boolean(this.autoInfo || this.slotInfos.some(Boolean));
    if (!this.getSelectedInfo()) this.selectedLoadSlot = this.autoInfo ? 'auto' : this.slotInfos.find((info) => info)?.slot || 1;
  }

  getSelectedInfo() {
    if (this.selectedLoadSlot === 'auto') return this.autoInfo;
    return this.slotInfos[this.selectedLoadSlot - 1];
  }

  draw() {
    this.children.removeAll(true);
    this.cloudBands = [];
    this.ui = this.add.container(TITLE_OFFSET_X, TITLE_OFFSET_Y).setScale(TITLE_SCALE);
    this.refreshSaveState();
    this.titleBiome = BIOME_MAPS[this.autoInfo?.state?.biomeIndex ?? 0] || BIOME_MAPS[0];
    this.cameras.main.setBackgroundColor(this.titleBiome.palette.sky);
    this.captureTitleObjects(() => {
      this.drawBiomeBackdrop(this.titleBiome);
      this.drawFrame();
      this.drawAirshipSilhouette();
      this.drawLockup();
      this.drawMenu();
    });
  }

  captureTitleObjects(callback) {
    const existing = new Set(this.children.list);
    callback();
    this.children.list
      .filter((object) => object !== this.ui && !existing.has(object))
      .forEach((object) => this.ui.add(object));
  }

  drawBiomeBackdrop(biome) {
    const viewWidth = TITLE_WORLD_WIDTH;
    const viewHeight = TITLE_WORLD_HEIGHT;
    const viewCenterX = TITLE_WORLD_WIDTH / 2;
    const fillWidth = Math.max(TITLE_WORLD_WIDTH, viewWidth) + 96;
    const fillHeight = Math.max(TITLE_WORLD_HEIGHT, viewHeight) + 96;
    const sky = Phaser.Display.Color.HexStringToColor(biome.palette.sky).color;
    const cloud = Phaser.Display.Color.HexStringToColor(biome.palette.cloud).color;
    const accent = Phaser.Display.Color.HexStringToColor(biome.palette.accent).color;
    const frame = Phaser.Display.Color.HexStringToColor(biome.palette.frame).color;
    this.ui.add(this.add.rectangle(viewCenterX, TITLE_WORLD_HEIGHT / 2, fillWidth, fillHeight, sky, 1));
    this.ui.add(this.add.rectangle(viewCenterX, 565, fillWidth, 470, sky, 0.88));
    this.ui.add(this.add.rectangle(viewCenterX, 650, fillWidth, 270, frame, 0.18));
    this.ui.add(this.add.circle(TITLE_CENTER_X + 332, 118, 54, biome.id === 'black-cloud-region' ? 0x8a2b53 : titleColors.amber, biome.id === 'storm-fields' ? 0.36 : 0.72));
    this.ui.add(this.add.circle(TITLE_CENTER_X + 332, 118, 92, accent, 0.08));

    for (let y = 178; y < 720; y += 42) {
      this.ui.add(this.add.line(TITLE_WORLD_WIDTH / 2, y, -680, Math.sin(y * 0.04) * 8, 680, Math.cos(y * 0.03) * 8, cloud, y % 84 === 0 ? 0.18 : 0.1).setLineWidth(y % 84 === 0 ? 2 : 1));
    }
    for (let i = 0; i < 13; i += 1) {
      const band = this.add.container(0, 188 + i * 46).setDepth(0.8);
      for (let x = -120; x < viewWidth + 160; x += 190) {
        band.add(this.add.ellipse(x + ((i * 53) % 140), 0, 104 + (i % 3) * 32, 8, i % 2 ? cloud : accent, i % 2 ? 0.22 : 0.12));
      }
      band.baseY = band.y;
      band.phase = i * 0.57;
      this.cloudBands.push(band);
      this.ui.add(band);
    }
    this.drawBiomeFeatures(biome.id, accent, cloud, frame);
  }

  drawBiomeFeatures(id, accent, cloud, frame) {
    if (id === 'storm-fields' || id === 'black-cloud-region') {
      for (const x of [210, 460, 835, 1080]) {
        this.add.line(x, 196, 0, 0, -24, 72, accent, 0.42).setLineWidth(4);
        this.add.line(x - 24, 268, 0, 0, 34, -8, accent, 0.36).setLineWidth(3);
        this.add.line(x + 10, 260, 0, 0, -28, 74, accent, 0.32).setLineWidth(3);
      }
    } else if (id === 'ash-isles') {
      for (let i = 0; i < 24; i += 1) this.add.circle(90 + i * 52, 230 + (i % 5) * 84, 3 + (i % 3), accent, 0.38);
      this.add.triangle(1040, 646, 0, 0, 118, -240, 246, 0, frame, 0.6).setStrokeStyle(2, accent, 0.35);
    } else if (id === 'crystal-reefs' || id === 'floating-temples') {
      for (const [x, y, h] of [[184, 574, 120], [930, 554, 146], [1080, 610, 90]]) {
        this.add.triangle(x, y, 0, 0, 38, -h, 76, 0, accent, 0.34).setStrokeStyle(2, cloud, 0.34);
      }
    } else if (id === 'frozen-heights') {
      for (let i = 0; i < 40; i += 1) this.add.circle(70 + i * 31, 160 + (i % 9) * 70, 2, cloud, 0.62);
      this.add.rectangle(640, 690, 980, 44, cloud, 0.2);
    } else if (id === 'jungle-islands') {
      for (const x of [110, 246, 1010, 1160]) {
        this.add.ellipse(x, 664, 190, 56, frame, 0.52);
        this.add.ellipse(x + 28, 620, 120, 42, accent, 0.22);
      }
    } else if (id === 'industrial-ruins') {
      for (const x of [136, 1010]) {
        this.add.rectangle(x, 594, 96, 150, frame, 0.42).setStrokeStyle(2, accent, 0.26);
        this.add.rectangle(x, 498, 46, 88, frame, 0.32);
      }
    } else if (id === 'pirate-dens') {
      for (const x of [180, 1048]) {
        this.add.rectangle(x, 612, 146, 72, frame, 0.48).setStrokeStyle(2, accent, 0.32);
        this.add.triangle(x, 532, 0, 0, -46, 78, 46, 78, accent, 0.2);
      }
    } else {
      this.add.ellipse(214, 602, 280, 72, frame, 0.26);
      this.add.ellipse(820, 584, 310, 80, frame, 0.24);
      this.add.ellipse(214, 564, 184, 42, accent, 0.14);
      this.add.ellipse(820, 544, 198, 48, accent, 0.13);
    }
  }

  drawFrame() {
    this.add.rectangle(TITLE_CENTER_X, 400, 1420, 780, 0x000000, 0).setStrokeStyle(4, titleColors.reef, 0.98);
    this.add.rectangle(TITLE_CENTER_X, 400, 1384, 742, 0x000000, 0).setStrokeStyle(2, titleColors.mint, 0.42);
    this.add.rectangle(TITLE_CENTER_X, 54, 1280, 8, titleColors.aqua, 0.88);
    this.add.rectangle(TITLE_CENTER_X, 746, 1280, 8, titleColors.aqua, 0.88);
    for (const x of [TITLE_CENTER_X - 674, TITLE_CENTER_X + 674]) {
      this.add.rectangle(x, 400, 18, 742, titleColors.ink, 0.92).setStrokeStyle(2, titleColors.reef);
      for (let y = 100; y <= 706; y += 46) this.add.circle(x, y, 5, titleColors.amber, 0.74);
    }
  }

  drawAirshipSilhouette() {
    const ship = this.add.container(TITLE_SHIFT_X, 0).setDepth(4);
    const g = this.add.graphics();
    ship.add(g);
    g.fillStyle(0x06111b, 0.26);
    g.fillEllipse(548, 674, 860, 62);

    g.fillStyle(0xb9f6d6, 0.24);
    g.fillEllipse(568, 336, 620, 142);
    g.fillStyle(0x62d7d9, 0.18);
    g.fillEllipse(568, 332, 530, 98);
    g.lineStyle(3, 0xe9fff5, 0.22);
    g.strokeEllipse(568, 336, 620, 142);
    g.lineStyle(2, titleColors.aqua, 0.24);
    for (const x of [366, 466, 568, 670, 770]) {
      g.lineBetween(x, 276, x + (x - 568) * 0.14, 404);
    }
    g.lineStyle(3, titleColors.reef, 0.34);
    g.lineBetween(282, 336, 852, 336);

    g.fillStyle(0x102536, 1);
    g.fillPoints([
      { x: 92, y: 548 },
      { x: 224, y: 488 },
      { x: 748, y: 486 },
      { x: 960, y: 548 },
      { x: 842, y: 632 },
      { x: 232, y: 632 },
    ], true);
    g.lineStyle(4, titleColors.aqua, 0.56);
    g.strokePoints([
      { x: 92, y: 548 },
      { x: 224, y: 488 },
      { x: 748, y: 486 },
      { x: 960, y: 548 },
      { x: 842, y: 632 },
      { x: 232, y: 632 },
    ], true);

    g.fillStyle(0x1f6d78, 0.96);
    g.fillRoundedRect(250, 452, 560, 68, 15);
    g.fillStyle(0x071622, 0.76);
    g.fillRoundedRect(282, 470, 168, 28, 9);
    g.fillStyle(0xffc857, 0.88);
    for (let x = 494; x <= 766; x += 46) g.fillCircle(x, 486, 9);

    g.lineStyle(8, titleColors.ink, 1);
    g.lineBetween(568, 476, 568, 260);
    g.lineStyle(4, titleColors.aqua, 0.62);
    g.lineBetween(326, 374, 830, 374);
    g.fillStyle(0xe9fff5, 0.88);
    g.fillTriangle(586, 286, 586, 456, 854, 382);
    g.fillStyle(0xb9f6d6, 0.74);
    g.fillTriangle(538, 306, 538, 456, 298, 388);
    g.lineStyle(2, titleColors.reef, 0.5);
    g.strokeTriangle(586, 286, 586, 456, 854, 382);
    g.strokeTriangle(538, 306, 538, 456, 298, 388);

    for (const x of [226, 866]) {
      g.fillStyle(titleColors.reef, 0.86);
      g.fillEllipse(x, 570, 132, 50);
      g.lineStyle(3, titleColors.mint, 0.48);
      g.strokeEllipse(x, 570, 132, 50);
      g.fillStyle(0x071622, 0.52);
      g.fillCircle(x, 570, 28);
    }
    g.lineStyle(3, titleColors.mint, 0.18);
    g.lineBetween(320, 520, 780, 520);
    g.lineBetween(230, 632, 842, 632);
    g.fillStyle(0xffc857, 0.82);
    g.fillTriangle(946, 548, 990, 568, 946, 588);

    const glow = this.add.circle(568, 648, 34, titleColors.coral, 0.18);
    ship.add(glow);
    ship.add(this.add.line(568, 0, -320, 392, -40, 488, titleColors.mint, 0.18).setLineWidth(2));
    ship.add(this.add.line(568, 0, 318, 392, 30, 488, titleColors.mint, 0.18).setLineWidth(2));
    ship.add(this.add.text(568, 594, 'STORMWAKE', { fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#ffc857', fontStyle: 'bold' }).setOrigin(0.5));
    this.tweens.add({ targets: glow, alpha: 0.34, scale: 1.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: ship, y: 5, angle: -0.35, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  drawLockup() {
    this.add.text(TITLE_CENTER_X, 124, 'STORMWAKE', { fontFamily: 'Georgia, serif', fontSize: '58px', color: '#e9fff5' }).setOrigin(0.5).setStroke('#071622', 6).setDepth(12);
    this.add.text(TITLE_CENTER_X, 174, 'ISLES', { fontFamily: 'Georgia, serif', fontSize: '34px', color: '#ffc857' }).setOrigin(0.5).setStroke('#071622', 4).setDepth(12);
    this.add.text(TITLE_CENTER_X, 208, 'A SKY-ROGUE COMBAT PROTOTYPE', { fontFamily: 'ui-monospace, monospace', fontSize: '13px', color: '#62d7d9', fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);
    this.add.text(TITLE_CENTER_X, 252, this.titleBiome.name.toUpperCase(), { fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#e9fff5', fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);
    this.add.rectangle(TITLE_CENTER_X, 228, 398, 5, titleColors.reef, 0.9).setDepth(12);
    this.add.rectangle(TITLE_CENTER_X, 236, 254, 3, titleColors.amber, 0.88).setDepth(12);
  }

  drawMenu() {
    this.refreshSaveState();
    const buttons = [
      { label: 'New Game', key: 'N', action: () => this.openNewGamePrompt(), enabled: true },
      ...(this.canContinue ? [{ label: 'Continue', key: 'C', action: () => this.continueAuto(), enabled: true }] : []),
      { label: 'Load Save', key: 'L', action: () => this.openLoad(), enabled: this.canLoad },
      { label: 'Options', key: 'O', action: () => this.openOptions(), enabled: true },
    ];
    const panelX = TITLE_CENTER_X - 604;
    const panelY = 292;
    const panelWidth = 344;
    const panelHeight = 64 + buttons.length * 56 + 26;
    this.drawPanel(panelX, panelY, panelWidth, panelHeight, 0.94).setDepth(20);
    this.add.text(panelX + 28, panelY + 20, 'Command Deck', {
      fontFamily: 'Georgia, serif',
      fontSize: '23px',
      color: '#e9fff5',
    }).setDepth(23);
    this.add.text(panelX + 28, panelY + 48, this.canContinue ? 'Saved run available' : 'Ready for launch', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '10px',
      color: '#b9f6d6',
      fontStyle: 'bold',
    }).setDepth(23);
    buttons.forEach((item, index) => this.drawButton(panelX + 28, panelY + 76 + index * 56, panelWidth - 56, item.label, item.key, item.action, item.enabled));
    this.add.text(TITLE_CENTER_X, 764, 'Enter or Space starts a run. Saves are stored in this browser.', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '11px',
      color: '#b9f6d6',
    }).setOrigin(0.5).setDepth(22);
  }

  drawPanel(x, y, width, height, alpha = 0.96) {
    this.add.rectangle(x + 8, y + 10, width, height, titleColors.ink, 0.52).setOrigin(0).setDepth(19);
    const panel = this.add.rectangle(x, y, width, height, titleColors.panel, alpha).setOrigin(0).setStrokeStyle(3, titleColors.aqua, 0.58);
    this.add.rectangle(x + 10, y + 10, width - 20, 4, titleColors.mint, 0.42).setOrigin(0).setDepth(20);
    return panel;
  }

  drawButton(x, y, width, label, key, onClick, enabled = true) {
    const tone = enabled ? titleColors.reef : 0x263846;
    this.add.rectangle(x + 5, y + 6, width, 44, titleColors.ink, 0.54).setOrigin(0).setDepth(21);
    const bg = this.add.rectangle(x, y, width, 44, tone, enabled ? 0.96 : 0.62).setOrigin(0).setDepth(22).setStrokeStyle(3, enabled ? titleColors.mint : 0x657987, enabled ? 0.64 : 0.32);
    const buttonText = formatMenuLabel(label, key);
    this.add.text(x + width / 2, y + 13, buttonText, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '13px',
      color: enabled ? '#e9fff5' : '#8295a0',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 24 },
    }).setOrigin(0.5, 0).setDepth(23);
    if (!enabled) return;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(titleColors.coral, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(tone, 0.96));
    bg.on('pointerdown', onClick);
  }

  clearPrompt() {
    this.promptObjects.forEach((object) => object.destroy());
    this.promptObjects = [];
    this.loadOpen = false;
    this.titleOptions = null;
  }

  capturePrompt(callback) {
    this.clearPrompt();
    const existing = new Set(this.children.list);
    callback();
    this.promptObjects = this.children.list.filter((object) => !existing.has(object));
    this.promptObjects.forEach((object) => this.ui.add(object));
  }

  drawPrompt(title, body, actions, height = 190) {
    this.capturePrompt(() => {
      this.add.rectangle(TITLE_CENTER_X, 360, TITLE_WORLD_WIDTH, 720, titleColors.ink, 0.54).setDepth(200).setInteractive();
      this.drawPanel(TITLE_CENTER_X - 176, 248, 352, height, 0.98).setDepth(201);
      this.add.text(TITLE_CENTER_X - 150, 270, title, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#e9fff5' }).setDepth(202);
      this.add.text(TITLE_CENTER_X - 150, 304, body, { fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#b9f6d6', wordWrap: { width: 292 }, lineSpacing: 3 }).setDepth(202);
      const buttonWidth = actions.length >= 3 ? 96 : 124;
      const gap = actions.length >= 3 ? 10 : 22;
      const startX = TITLE_CENTER_X - (actions.length * buttonWidth + (actions.length - 1) * gap) / 2;
      actions.forEach((action, index) => this.drawButton(startX + index * (buttonWidth + gap), 248 + height - 58, buttonWidth, action.label, action.key || '', action.action, true));
    });
  }

  openNewGamePrompt() {
    this.drawPrompt('Start New Run?', 'Do you want the tutorial? It freezes the game as mechanics appear and explains the basics.', [
      { label: 'Tutorial', key: 'T', action: () => this.newGame(0, true) },
      { label: 'Skip', key: 'N', action: () => this.openStartBiomeSelect() },
      { label: 'Back', key: 'Esc', action: () => this.clearPrompt() },
    ], 230);
  }

  openStartBiomeSelect() {
    this.capturePrompt(() => {
      this.add.rectangle(TITLE_CENTER_X, 360, TITLE_WORLD_WIDTH, 720, titleColors.ink, 0.54).setDepth(200).setInteractive();
      this.drawPanel(TITLE_CENTER_X - 430, 132, 860, 490, 0.98).setDepth(201);
      this.add.text(TITLE_CENTER_X - 392, 158, 'Choose Starting Biome', { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#e9fff5' }).setDepth(202);
      this.add.text(TITLE_CENTER_X - 392, 194, 'Your first island sets the opening enemy pool and early relic paths.', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '11px',
        color: '#b9f6d6',
        wordWrap: { width: 760 },
      }).setDepth(202);
      BIOME_MAPS.forEach((biome, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = TITLE_CENTER_X - 392 + col * 270;
        const y = 240 + row * 82;
        const selectedColor = Phaser.Display.Color.HexStringToColor(biome.palette.accent).color;
        const meta = BIOME_META[biome.id] || { icon: '???' };
        const bg = this.add.rectangle(x, y, 244, 58, titleColors.panel, 0.92).setOrigin(0).setDepth(202).setStrokeStyle(2, selectedColor, 0.52);
        this.add.rectangle(x + 27, y + 29, 34, 34, selectedColor, 0.38).setDepth(203).setStrokeStyle(1, selectedColor, 0.95);
        this.add.text(x + 14, y + 22, meta.icon, {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '10px',
          color: '#e9fff5',
          fontStyle: 'bold',
        }).setDepth(204);
        this.add.text(x + 52, y + 10, biome.name, {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px',
          color: '#e9fff5',
          fontStyle: 'bold',
        }).setDepth(203);
        this.add.text(x + 52, y + 30, biome.mood, {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '9px',
          color: '#b9f6d6',
          wordWrap: { width: 172 },
        }).setDepth(203);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(selectedColor, 0.72));
        bg.on('pointerout', () => bg.setFillStyle(titleColors.panel, 0.92));
        bg.on('pointerdown', () => this.newGame(index, false));
      });
      this.drawButton(TITLE_CENTER_X - 64, 566, 128, 'Back', 'Esc', () => this.openNewGamePrompt(), true);
    });
  }

  newGame(biomeIndex = 0, tutorialEnabled = false) {
    const state = makeInitialRunState();
    state.biomeIndex = Phaser.Math.Wrap(biomeIndex, 0, BIOME_MAPS.length);
    state.tutorialEnabled = Boolean(tutorialEnabled);
    state.tutorialComplete = false;
    state.tutorialSeen = {};
    const saved = saveRunState(state);
    this.registry.set('runState', saved || state);
    this.scene.start('stormwake');
  }

  continueAuto() {
    this.refreshSaveState();
    if (!this.autoInfo) return;
    this.drawPrompt('Continue Run?', formatSaveSummary(this.autoInfo), [
      { label: 'Continue', key: 'C', action: () => this.loadSave('auto') },
      { label: 'Back', key: 'Esc', action: () => this.clearPrompt() },
    ], 226);
  }

  handleLoadKey() {
    this.refreshSaveState();
    if (!this.canLoad) return;
    if (this.loadOpen) {
      this.loadSave(this.selectedLoadSlot);
      return;
    }
    this.openLoad();
  }

  openLoad() {
    this.refreshSaveState();
    if (!this.canLoad) return;
    this.capturePrompt(() => {
      this.loadOpen = true;
      const panelX = TITLE_CENTER_X - 236;
      this.add.rectangle(TITLE_CENTER_X, 360, TITLE_WORLD_WIDTH, 720, titleColors.ink, 0.54).setDepth(200).setInteractive();
      this.drawPanel(panelX, 88, 472, 600, 0.98).setDepth(201);
      this.add.text(panelX + 34, 136, 'Load Run', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#e9fff5' }).setDepth(202);
      this.add.text(panelX + 34, 170, 'Select a saved run, then load it or delete the selected slot.', { fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#b9f6d6', wordWrap: { width: 400 } }).setDepth(202);
      this.drawSaveRow(panelX + 34, 210, 'auto', this.autoInfo, 1);
      this.slotInfos.forEach((info, index) => this.drawSaveRow(panelX + 34, 292 + index * 82, index + 1, info, index + 2));
      this.drawButton(panelX + 34, 632, 112, 'Load', 'L', () => this.loadSave(this.selectedLoadSlot));
      this.drawButton(panelX + 180, 632, 112, 'Back', 'Esc', () => this.clearPrompt());
      this.drawButton(panelX + 326, 632, 112, 'Delete', 'D', () => this.openDeletePrompt());
    });
    this.loadOpen = true;
  }

  drawSaveRow(x, y, slot, info, keyIndex) {
    const selected = this.selectedLoadSlot === slot && info;
    const row = this.add.rectangle(x, y, 404, 70, selected ? titleColors.amber : titleColors.ink, selected ? 0.9 : 0.34)
      .setOrigin(0)
      .setStrokeStyle(2, selected ? titleColors.ink : titleColors.aqua, selected ? 0.86 : 0.24)
      .setDepth(202);
    const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
    this.add.text(x + 12, y + 8, `${label} (${keyIndex})`, { fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: selected ? '#071622' : info ? '#e9fff5' : '#8295a0', fontStyle: 'bold', wordWrap: { width: 94 } }).setDepth(203);
    const detail = info ? formatSaveSummary(info) : 'Empty slot';
    this.add.text(x + 120, y + 8, detail, { fontFamily: 'ui-monospace, monospace', fontSize: '9px', color: selected ? '#071622' : info ? '#b9f6d6' : '#8295a0', wordWrap: { width: 260 }, lineSpacing: 2 }).setDepth(203);
    if (!info) return;
    row.setInteractive({ useHandCursor: true });
    row.on('pointerdown', () => {
      this.selectedLoadSlot = slot;
      this.openLoad();
    });
  }

  selectLoadSlot(slot) {
    if (!this.loadOpen) return;
    const info = slot === 'auto' ? this.autoInfo : this.slotInfos[slot - 1];
    if (!info) return;
    this.selectedLoadSlot = slot;
    this.openLoad();
  }

  loadSave(slot = 'auto') {
    const key = slot === 'auto' ? AUTO_SAVE_KEY : SAVE_SLOT_KEYS[slot - 1];
    const state = loadRunState(key);
    if (!state) return;
    this.registry.set('runState', state);
    this.scene.start('stormwake');
  }

  openDeletePrompt() {
    const info = this.getSelectedInfo();
    if (!info) {
      this.openLoad();
      return;
    }
    const label = this.selectedLoadSlot === 'auto' ? 'Autosave' : `Slot ${this.selectedLoadSlot}`;
    this.drawPrompt('Delete Run?', `Delete ${label}?\n${formatSaveSummary(info)}\nThis cannot be undone.`, [
      { label: 'Delete', key: 'D', action: () => this.confirmDelete() },
      { label: 'Back', key: 'Esc', action: () => this.openLoad() },
    ], 244);
  }

  confirmDelete() {
    deleteSave(this.selectedLoadSlot);
    this.refreshSaveState();
    if (this.canLoad) this.openLoad();
    else {
      this.clearPrompt();
      this.draw();
    }
  }

  openOptions() {
    this.titleOptions = {
      values: { ...getAudioSettings() },
      selected: this.titleOptions?.selected ?? 0,
    };
    this.drawTitleOptions();
  }

  drawTitleOptions() {
    if (!this.titleOptions) return;
    const optionState = this.titleOptions;
    this.capturePrompt(() => {
      this.titleOptions = optionState;
      this.add.rectangle(TITLE_CENTER_X, 360, TITLE_WORLD_WIDTH, 720, titleColors.ink, 0.54).setDepth(200).setInteractive();
      this.drawPanel(TITLE_CENTER_X - 212, 178, 424, 360, 0.98).setDepth(201);
      this.add.text(TITLE_CENTER_X - 176, 206, 'Options', { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#e9fff5' }).setDepth(202);
      this.add.text(TITLE_CENTER_X - 176, 244, 'Adjust audio settings, then save or cancel.', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '11px',
        color: '#b9f6d6',
        wordWrap: { width: 340 },
      }).setDepth(202);
      this.drawTitleSlider(TITLE_CENTER_X - 176, 292, 'Music Volume', 'music', this.titleOptions.values.music, this.titleOptions.selected === 0);
      this.drawTitleSlider(TITLE_CENTER_X - 176, 366, 'SFX Volume', 'sfx', this.titleOptions.values.sfx, this.titleOptions.selected === 1);
      this.drawButton(TITLE_CENTER_X - 176, 462, 102, 'Save', 'Enter', () => this.saveTitleOptions(), true);
      this.drawButton(TITLE_CENTER_X - 54, 462, 102, 'Cancel', 'Esc', () => this.cancelTitleOptions(), true);
      this.drawButton(TITLE_CENTER_X + 68, 462, 132, 'Reset Saves', 'R', () => this.openResetPrompt(), true);
    });
  }

  drawTitleSlider(x, y, label, key, value, selected) {
    const percent = Math.round(value * 100);
    const color = selected ? titleColors.amber : titleColors.reef;
    const bg = this.add.rectangle(x, y, 352, 56, selected ? titleColors.amber : titleColors.ink, selected ? 0.16 : 0.34)
      .setOrigin(0)
      .setDepth(202)
      .setStrokeStyle(2, color, selected ? 0.82 : 0.32);
    this.add.text(x + 14, y + 9, label, { fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#e9fff5', fontStyle: 'bold' }).setDepth(203);
    this.add.text(x + 326, y + 9, `${percent}%`, { fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#ffc857', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(203);
    this.add.rectangle(x + 14, y + 36, 270, 8, titleColors.ink, 0.9).setOrigin(0).setDepth(203);
    this.add.rectangle(x + 14, y + 36, 270 * value, 8, selected ? titleColors.amber : titleColors.aqua, 1).setOrigin(0).setDepth(204);
    this.add.rectangle(x + 10 + 270 * value, y + 31, 8, 18, 0xffffff, 1).setOrigin(0).setDepth(205);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer) => {
      this.titleOptions.selected = key === 'music' ? 0 : 1;
      const worldX = (pointer.x - TITLE_OFFSET_X) / TITLE_SCALE;
      this.titleOptions.values[key] = clampSetting((worldX - (x + 14)) / 270);
      this.drawTitleOptions();
    });
  }

  adjustTitleOptionSelection(delta) {
    if (!this.titleOptions) return;
    this.titleOptions.selected = Phaser.Math.Clamp(this.titleOptions.selected + delta, 0, 1);
    this.drawTitleOptions();
  }

  adjustTitleOptionValue(delta) {
    if (!this.titleOptions) return;
    const key = this.titleOptions.selected === 0 ? 'music' : 'sfx';
    this.titleOptions.values[key] = clampSetting(this.titleOptions.values[key] + delta);
    this.drawTitleOptions();
  }

  saveTitleOptions() {
    if (!this.titleOptions) return;
    saveAudioSettings(this.titleOptions.values);
    this.clearPrompt();
  }

  cancelTitleOptions() {
    this.clearPrompt();
  }

  openResetPrompt() {
    this.drawPrompt('Reset Saves?', 'Delete every Stormwake Isles save in this browser: autosave and all manual slots.', [
      { label: 'Reset', key: 'R', action: () => {
        deleteSave('auto');
        [1, 2, 3].forEach((slot) => deleteSave(slot));
        this.refreshSaveState();
        this.clearPrompt();
        this.draw();
      } },
      { label: 'Back', key: 'Esc', action: () => this.openOptions() },
    ]);
  }
}

class StormwakeScene extends Phaser.Scene {
  constructor() {
    super('stormwake');
    this.biomeIndex = 0;
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.drones = [];
    this.enemies = [];
    this.enemySalvoCount = 0;
    this.playerHitCount = 0;
    this.enemyHitCount = 0;
    this.inventory = [];
    this.activePowerups = [];
    this.lootDrops = [];
    this.lastLootDrop = 'None';
    this.lastRelicTrigger = 'None';
    this.effectState = {};
    this.lastPulseDash = 0;
    this.lastQuantumJump = 0;
    this.lastVoidJump = 0;
    this.lastHeartStrike = 0;
    this.lastRepairTick = 0;
    this.lastDroneShot = 0;
    this.lastCorruptedTick = 0;
    this.lastAutosaveTick = 0;
    this.lastPowerupPanelTick = 0;
    this.lastLegendaryFxTick = 0;
    this.roomDepth = 0;
    this.biomeStreak = 0;
    this.islandTier = 1;
    this.roomInChain = 1;
    this.roomGraph = null;
    this.currentRoomId = 'start';
    this.routeChoices = [];
    this.portals = [];
    this.corridors = [];
    this.corridorTraversal = null;
    this.nearbyPortal = null;
    this.puzzleObjects = [];
    this.questObjects = [];
    this.hiddenPuzzle = null;
    this.legendaryQuestState = {};
    this.activeLayout = null;
    this.roomCleared = false;
    this.portalOpen = false;
    this.routeTransitioning = false;
    this.paused = false;
    this.gameOver = false;
    this.gameOverMode = null;
    this.pauseObjects = [];
    this.gameOverObjects = [];
    this.tutorialObjects = [];
    this.tutorialEnabled = false;
    this.tutorialComplete = false;
    this.tutorialSeen = {};
    this.tutorialActive = false;
    this.pauseMode = 'menu';
    this.selectedPauseSlot = 'auto';
    this.pauseOptions = null;
  }

  create() {
    this.loadRunState();
    this.cameras.main.setViewport(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor('#101927');
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      boost: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      choice1: Phaser.Input.Keyboard.KeyCodes.ONE,
      choice2: Phaser.Input.Keyboard.KeyCodes.TWO,
      choice3: Phaser.Input.Keyboard.KeyCodes.THREE,
      menu: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.mapLayer = this.add.container(0, 0);
    this.objectLayer = this.add.container(0, 0);
    this.corridorLayer = this.add.container(0, 0);
    this.portalLayer = this.add.container(0, 0);
    this.mapLayer.setDepth(0);
    this.corridorLayer.setDepth(10);
    this.objectLayer.setDepth(12);
    this.portalLayer.setDepth(16);
    this.hud = document.querySelector('#hud');
    this.itemsPanel = document.querySelector('#items');
    this.setupItemTooltip();

    this.createShipTexture();
    this.renderItemPanel();

    this.player = this.physics.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'ship');
    this.player.setDamping(true);
    this.player.setDrag(BASE_DRAG);
    this.player.setMaxVelocity(BASE_MAX_VELOCITY);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.recalculateEffects();
    this.player.hp = this.effectState.maxHp;
    this.player.maxHp = this.effectState.maxHp;
    this.player.energy = this.effectState.maxEnergy;
    this.player.maxEnergy = this.effectState.maxEnergy;
    if (this.pendingPlayerState) {
      this.player.setPosition(
        Phaser.Math.Clamp(this.pendingPlayerState.x ?? this.player.x, 24, WORLD_WIDTH - 24),
        Phaser.Math.Clamp(this.pendingPlayerState.y ?? this.player.y, 24, WORLD_HEIGHT - 24),
      );
      this.player.rotation = this.pendingPlayerState.rotation ?? this.player.rotation;
      this.player.hp = Phaser.Math.Clamp(this.pendingPlayerState.hp ?? this.player.hp, 1, this.player.maxHp);
      this.player.energy = Phaser.Math.Clamp(this.pendingPlayerState.energy ?? this.player.energy, 0, this.player.maxEnergy);
    }

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.loadBiome(this.pendingBiomeIndex ?? 0, {
      islandTier: this.pendingIslandTier ?? 1,
      roomInChain: this.pendingRoomInChain ?? 1,
      roomGraph: this.pendingRoomGraph ?? null,
      currentRoomId: this.pendingCurrentRoomId ?? 'start',
      portalOpen: this.pendingPortalOpen ?? false,
      roomCleared: this.pendingRoomCleared ?? false,
      routeChoices: this.pendingRouteChoices ?? [],
      countRoom: this.roomDepth <= 0,
    });

    this.input.keyboard.on('keydown-E', () => this.enterNearbyPortal());
    this.input.keyboard.on('keydown-ESC', () => this.handleEscape());
    this.input.keyboard.on('keydown-R', () => { if (this.gameOver) this.restartLevel(); });
    this.input.keyboard.on('keydown-B', () => { if (this.gameOver) this.openGameOverBiomeSelect(); });
    this.input.keyboard.on('keydown-ENTER', () => { if (this.tutorialActive) this.closeTutorialStep(); });
    this.input.keyboard.on('keydown-SPACE', () => { if (this.tutorialActive) this.closeTutorialStep(); });
    this.input.keyboard.on('keydown-UP', () => this.adjustPauseOptionSelection(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.adjustPauseOptionSelection(1));
    this.input.keyboard.on('keydown-LEFT', () => this.adjustPauseOptionValue(-0.05));
    this.input.keyboard.on('keydown-RIGHT', () => this.adjustPauseOptionValue(0.05));
    this.maybeShowTutorialStep(
      'intro',
      'Flight Controls',
      'W/S thrust forward and backward. A/D turn your ship. Shift boosts while you have energy.\n\nThe left panel shows Hull, Energy, room location, threats, relics, and active power-ups.',
    );
  }

  loadRunState() {
    const state = this.registry.get('runState') || makeInitialRunState();
    this.pendingBiomeIndex = Number.isInteger(state.biomeIndex) ? state.biomeIndex : 0;
    this.inventory = Array.isArray(state.inventory)
      ? cloneRunState(state.inventory).filter((entry) => isXpRelic(ITEM_BY_ID[entry.id]))
      : createRunInventory();
    this.activePowerups = Array.isArray(state.activePowerups)
      ? cloneRunState(state.activePowerups)
        .filter((entry) => ITEM_BY_ID[entry.id]?.kind === 'powerup')
        .map((entry) => ({
          id: entry.id,
          rarity: entry.rarity || ITEM_BY_ID[entry.id].rarity,
          expiresAt: this.time.now + Math.max(0, entry.remainingMs ?? 0),
        }))
      : [];
    this.lastLootDrop = state.lastLootDrop || 'None';
    this.lastRelicTrigger = state.lastRelicTrigger || 'None';
    this.enemyHitCount = state.enemyHitCount ?? 0;
    this.playerHitCount = state.playerHitCount ?? 0;
    this.enemySalvoCount = state.enemySalvoCount ?? 0;
    this.corruptionSaturation = state.corruptionSaturation ?? 0;
    this.pendingPlayerState = state.player || null;
    this.roomDepth = state.roomDepth ?? 0;
    this.biomeStreak = state.biomeStreak ?? 0;
    this.pendingIslandTier = state.islandTier ?? 1;
    this.pendingRoomInChain = state.roomInChain ?? 1;
    this.pendingRoomGraph = state.roomGraph ? cloneRunState(state.roomGraph) : null;
    this.pendingCurrentRoomId = state.currentRoomId || 'start';
    this.pendingPortalOpen = state.portalOpen ?? false;
    this.pendingRoomCleared = state.roomCleared ?? false;
    this.legendaryQuestState = state.legendaryQuestState ? cloneRunState(state.legendaryQuestState) : {};
    this.pendingRouteChoices = Array.isArray(state.routeChoices) ? cloneRunState(state.routeChoices) : [];
    this.routeChoices = this.pendingRouteChoices;
    this.portalOpen = this.pendingPortalOpen;
    this.roomCleared = this.pendingRoomCleared;
    this.roomGraph = this.pendingRoomGraph;
    this.currentRoomId = this.pendingCurrentRoomId;
    this.tutorialEnabled = Boolean(state.tutorialEnabled);
    this.tutorialComplete = Boolean(state.tutorialComplete);
    this.tutorialSeen = state.tutorialSeen ? cloneRunState(state.tutorialSeen) : {};
  }

  getRunState() {
    return {
      biomeIndex: this.biomeIndex,
      inventory: cloneRunState(this.inventory),
      activePowerups: this.activePowerups
        .filter((entry) => entry.expiresAt > this.time.now)
        .map((entry) => ({
          id: entry.id,
          rarity: entry.rarity,
          remainingMs: Math.max(0, Math.round(entry.expiresAt - this.time.now)),
        })),
      lastLootDrop: this.lastLootDrop,
      lastRelicTrigger: this.lastRelicTrigger,
      enemyHitCount: this.enemyHitCount,
      playerHitCount: this.playerHitCount,
      enemySalvoCount: this.enemySalvoCount,
      corruptionSaturation: this.corruptionSaturation ?? 0,
      player: this.player ? {
        x: this.player.x,
        y: this.player.y,
        rotation: this.player.rotation,
        hp: this.player.hp,
        energy: this.player.energy,
      } : null,
      roomDepth: this.roomDepth,
      biomeStreak: this.biomeStreak,
      islandTier: this.islandTier,
      roomInChain: this.roomInChain,
      roomGraph: this.roomGraph ? cloneRunState(this.roomGraph) : null,
      currentRoomId: this.currentRoomId,
      portalOpen: this.portalOpen,
      roomCleared: this.roomCleared,
      tutorialEnabled: this.tutorialEnabled,
      tutorialComplete: this.tutorialComplete,
      tutorialSeen: cloneRunState(this.tutorialSeen),
      legendaryQuestState: cloneRunState(this.legendaryQuestState),
      routeChoices: cloneRunState(this.routeChoices),
    };
  }

  autosaveRun() {
    const saved = saveRunState(this.getRunState());
    this.registry.set('runState', saved || this.getRunState());
  }

  setupItemTooltip() {
    if (!this.itemsPanel || this.itemTooltip) return;
    const tooltip = document.createElement('div');
    tooltip.className = 'item-tooltip';
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    this.itemTooltip = tooltip;

    const moveTooltip = (event) => {
      if (!this.itemTooltip || this.itemTooltip.hidden) return;
      const margin = 14;
      const rect = this.itemTooltip.getBoundingClientRect();
      const x = Math.min(window.innerWidth - rect.width - margin, event.clientX + margin);
      const y = Math.min(window.innerHeight - rect.height - margin, event.clientY + margin);
      this.itemTooltip.style.left = `${Math.max(margin, x)}px`;
      this.itemTooltip.style.top = `${Math.max(margin, y)}px`;
    };

    this.itemsPanel.addEventListener('mouseover', (event) => {
      const badge = event.target.closest?.('.item-badge[data-item-id]');
      if (!badge || !this.itemsPanel.contains(badge)) return;
      const item = ITEM_BY_ID[badge.dataset.itemId];
      if (!item) return;
      this.itemTooltip.innerHTML = this.renderItemTooltip(item);
      this.itemTooltip.hidden = false;
      this.itemTooltip.classList.remove('visible');
      moveTooltip(event);
      window.requestAnimationFrame(() => this.itemTooltip?.classList.add('visible'));
    });
    this.itemsPanel.addEventListener('mousemove', moveTooltip);
    this.itemsPanel.addEventListener('mouseout', (event) => {
      if (!event.target.closest?.('.item-badge[data-item-id]')) return;
      if (!this.itemTooltip) return;
      this.itemTooltip.classList.remove('visible');
      window.setTimeout(() => {
        if (this.itemTooltip && !this.itemTooltip.classList.contains('visible')) this.itemTooltip.hidden = true;
      }, 140);
    });
  }

  saveManualSlot(slot) {
    const saved = saveRunState(this.getRunState(), SAVE_SLOT_KEYS[slot - 1], slot);
    if (saved) this.registry.set('runState', saved);
    this.lastLootDrop = saved ? `Saved to Slot ${slot}` : 'Save unavailable';
    if (saved) this.autosaveRun();
    this.updateHud();
  }

  handleEscape() {
    if (this.tutorialActive) return;
    if (this.gameOver) {
      if (this.gameOverMode === 'biomes') this.drawGameOverPanel(true);
      else this.openGameOverBiomeSelect();
      return;
    }
    if (this.paused) {
      if (this.pauseMode === 'menu') this.closePauseOverlay();
      else this.openPauseMenu();
      return;
    }
    this.openPauseMenu();
  }

  clearPauseObjects() {
    this.pauseObjects.forEach((object) => {
      if (object?.scene || object?.parent) object.destroy();
    });
    this.pauseObjects = [];
  }

  addPauseObject(object) {
    this.pauseObjects.push(object);
    return object;
  }

  clearGameOverObjects() {
    this.gameOverObjects.forEach((object) => {
      if (object?.scene || object?.parent) object.destroy();
    });
    this.gameOverObjects = [];
  }

  addGameOverObject(object) {
    this.gameOverObjects.push(object);
    return object;
  }

  clearTutorialObjects() {
    this.tutorialObjects.forEach((object) => {
      if (object?.scene || object?.parent) object.destroy();
    });
    this.tutorialObjects = [];
  }

  addTutorialObject(object) {
    this.tutorialObjects.push(object);
    return object;
  }

  maybeShowTutorialStep(step, title, body, finalStep = false) {
    if (!this.tutorialEnabled || this.tutorialComplete || this.tutorialSeen[step] || this.gameOver) return false;
    this.tutorialSeen[step] = true;
    this.tutorialActive = true;
    this.tutorialFinalStep = finalStep;
    this.tutorialCurrentStep = step;
    this.physics.world?.pause?.();
    this.time.paused = true;
    this.player?.setAcceleration(0);
    this.player?.setVelocity(0, 0);
    this.drawTutorialPanel(title, body, finalStep);
    this.autosaveRun();
    return true;
  }

  drawTutorialPanel(title, body, finalStep = false) {
    this.clearTutorialObjects();
    this.addTutorialObject(this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x071622, 0.42).setDepth(240).setInteractive());
    const x = WORLD_WIDTH / 2 - 420;
    const y = WORLD_HEIGHT / 2 - 220;
    const panel = this.addTutorialObject(this.add.rectangle(x, y, 840, 440, 0x102536, 0.98).setOrigin(0).setDepth(241).setStrokeStyle(5, finalStep ? 0xffc857 : 0x62d7d9, 0.82));
    this.addTutorialObject(this.add.rectangle(x + 26, y + 26, 788, 7, finalStep ? 0xffc857 : 0xb9f6d6, 0.42).setOrigin(0).setDepth(242));
    this.addTutorialObject(this.add.text(x + 54, y + 70, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '54px',
      color: finalStep ? '#ffc857' : '#e9fff5',
      fontStyle: 'bold',
    }).setDepth(243));
    this.addTutorialObject(this.add.text(x + 54, y + 156, body, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '24px',
      color: '#b9f6d6',
      wordWrap: { width: 730 },
      lineSpacing: 8,
    }).setDepth(243));
    this.drawTutorialButton(x + 560, y + 350, 230, finalStep ? 'Finish' : 'Continue', 'Enter', () => this.closeTutorialStep(), true);
  }

  drawTutorialButton(x, y, width, label, key, onClick, primary = false) {
    const base = primary ? 0xffc857 : 0x1d6f7b;
    const hover = primary ? 0xffd978 : 0x2b8c98;
    this.addTutorialObject(this.add.rectangle(x + 7, y + 8, width, 58, 0x06111b, 0.5).setOrigin(0).setDepth(244));
    const bg = this.addTutorialObject(this.add.rectangle(x, y, width, 58, base, 0.96).setOrigin(0).setDepth(245).setStrokeStyle(3, primary ? 0x071622 : 0xb9f6d6, 0.72));
    this.addTutorialObject(this.add.text(x + width / 2, y + 17, formatMenuLabel(label, key), {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '20px',
      color: primary ? '#071622' : '#e9fff5',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(246));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(hover, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(base, 0.96));
    bg.on('pointerdown', onClick);
  }

  closeTutorialStep() {
    if (!this.tutorialActive) return;
    const completedStep = this.tutorialCurrentStep;
    const finalStep = this.tutorialFinalStep;
    this.tutorialActive = false;
    this.tutorialFinalStep = false;
    this.tutorialCurrentStep = null;
    this.clearTutorialObjects();
    this.time.paused = false;
    this.physics.world?.resume?.();
    if (finalStep) {
      this.tutorialComplete = true;
      this.tutorialEnabled = false;
    }
    this.autosaveRun();
    if (completedStep === 'intro') {
      this.maybeShowTutorialStep(
        'combat',
        'Threats & Weapons',
        'Space fires your cannon. Enemy shots keep flying until they leave the room, so dodge them instead of waiting them out.\n\nIf Hull reaches zero, your ship is destroyed. Esc opens the pause menu.',
      );
    } else if (completedStep === 'portals') {
      this.maybeShowTutorialStep(
        'secret',
        'One Last Thing',
        'if you explore around, you might find something special!',
        true,
      );
    }
  }

  pauseSimulation() {
    this.tweens.pauseAll();
    this.time.paused = true;
    this.physics.world?.pause?.();
  }

  resumeSimulation() {
    this.time.paused = false;
    this.physics.world?.resume?.();
    this.tweens.resumeAll();
  }

  openPauseMenu() {
    if (this.gameOver) return;
    this.paused = true;
    this.pauseMode = 'menu';
    this.pauseOptions = null;
    this.clearPauseObjects();
    this.pauseSimulation();
    this.drawPauseBackdrop();
    this.drawPausePanel('Paused', 'The run is frozen. Resume when you are ready.', [
      { label: 'Resume', key: 'Esc', action: () => this.closePauseOverlay(), primary: true },
      { label: 'Save Game', action: () => this.openPauseSaveSlots() },
      { label: 'Load Game', action: () => this.openPauseLoadSlots() },
      { label: 'Options', action: () => this.openPauseOptions() },
      { label: 'Main Menu', action: () => this.returnToTitle(), tone: 'danger' },
    ]);
  }

  closePauseOverlay() {
    if (!this.paused) return;
    this.paused = false;
    this.resumeSimulation();
    this.clearPauseObjects();
    this.updateHud();
  }

  drawPauseBackdrop() {
    this.addPauseObject(this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x071622, 0.62).setDepth(230).setInteractive());
  }

  drawPausePanel(title, body, actions, height = 386) {
    const x = WORLD_WIDTH / 2 - 210;
    const y = WORLD_HEIGHT / 2 - height / 2;
    this.addPauseObject(this.add.rectangle(x + 6, y + 8, 420, height, 0x06111b, 0.58).setOrigin(0).setDepth(231));
    this.addPauseObject(this.add.rectangle(x, y, 420, height, 0x102536, 0.98).setOrigin(0).setDepth(232).setStrokeStyle(3, 0x62d7d9, 0.72));
    this.addPauseObject(this.add.rectangle(x + 14, y + 14, 392, 4, 0xb9f6d6, 0.38).setOrigin(0).setDepth(233));
    this.addPauseObject(this.add.text(x + 28, y + 34, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '30px',
      color: '#e9fff5',
    }).setDepth(234));
    this.addPauseObject(this.add.text(x + 28, y + 74, body, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px',
      color: '#b9f6d6',
      wordWrap: { width: 352 },
      lineSpacing: 3,
    }).setDepth(234));
    actions.forEach((action, index) => {
      this.drawPauseButton(x + 28, y + 132 + index * 48, 364, action.label, action.key, action.action, action.primary, action.tone);
    });
  }

  drawPauseButton(x, y, width, label, key, onClick, primary = false, tone = 'default') {
    const base = tone === 'danger' ? 0x8a2b53 : primary ? 0xffc857 : 0x1d6f7b;
    const hover = tone === 'danger' ? 0xff6f59 : primary ? 0xffd978 : 0x2b8c98;
    this.addPauseObject(this.add.rectangle(x + 4, y + 5, width, 38, 0x06111b, 0.5).setOrigin(0).setDepth(236));
    const bg = this.addPauseObject(this.add.rectangle(x, y, width, 38, base, 0.96).setOrigin(0).setDepth(237).setStrokeStyle(2, primary ? 0x071622 : 0xb9f6d6, primary ? 0.72 : 0.58));
    this.addPauseObject(this.add.rectangle(x + 7, y + 6, width - 14, 2, 0xe9fff5, primary ? 0.3 : 0.18).setOrigin(0).setDepth(238));
    this.addPauseObject(this.add.text(x + width / 2, y + 10, formatMenuLabel(label, key), {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '13px',
      color: primary ? '#071622' : '#e9fff5',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 24 },
    }).setOrigin(0.5, 0).setDepth(239));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(hover, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(base, 0.96));
    bg.on('pointerdown', onClick);
  }

  openPauseSaveSlots() {
    this.pauseMode = 'save';
    this.clearPauseObjects();
    this.drawPauseBackdrop();
    this.drawPausePanel('Save Run', 'Choose a manual slot. Saving overwrites that slot only.', [
      { label: 'Save Slot 1', action: () => { this.saveManualSlot(1); this.openPauseSaveSlots(); }, primary: true },
      { label: 'Save Slot 2', action: () => { this.saveManualSlot(2); this.openPauseSaveSlots(); } },
      { label: 'Save Slot 3', action: () => { this.saveManualSlot(3); this.openPauseSaveSlots(); } },
      { label: 'Back', key: 'Esc', action: () => this.openPauseMenu() },
    ], 346);
  }

  openPauseLoadSlots() {
    this.pauseMode = 'load';
    this.clearPauseObjects();
    this.drawPauseBackdrop();
    const slots = [
      { slot: 'auto', label: 'Autosave', info: getSaveInfo(AUTO_SAVE_KEY, 'auto') },
      ...SAVE_SLOT_KEYS.map((key, index) => ({ slot: index + 1, label: `Slot ${index + 1}`, info: getSaveInfo(key, index + 1) })),
    ];
    const actions = slots.map(({ slot, label, info }) => ({
      label: info ? `${label}: ${formatCompactSaveSummary(info)}` : `${label}: Empty`,
      action: () => { if (info) this.loadPauseSave(slot); },
      primary: slot === 'auto',
    }));
    actions.push({ label: 'Back', key: 'Esc', action: () => this.openPauseMenu() });
    this.drawPausePanel('Load Run', 'Choose a saved run to continue from that point.', actions, 386);
  }

  loadPauseSave(slot) {
    const key = slot === 'auto' ? AUTO_SAVE_KEY : SAVE_SLOT_KEYS[slot - 1];
    const state = loadRunState(key);
    if (!state) return;
    this.paused = false;
    this.resumeSimulation();
    this.clearPauseObjects();
    this.registry.set('runState', state);
    this.scene.restart();
  }

  openPauseOptions() {
    this.pauseMode = 'options';
    this.pauseOptions = {
      values: { ...getAudioSettings() },
      selected: this.pauseOptions?.selected ?? 0,
    };
    this.drawPauseOptions();
  }

  drawPauseOptions() {
    if (!this.pauseOptions) return;
    this.clearPauseObjects();
    this.drawPauseBackdrop();
    const x = WORLD_WIDTH / 2 - 230;
    const y = WORLD_HEIGHT / 2 - 220;
    this.addPauseObject(this.add.rectangle(x + 6, y + 8, 460, 440, 0x06111b, 0.58).setOrigin(0).setDepth(231));
    this.addPauseObject(this.add.rectangle(x, y, 460, 440, 0x102536, 0.98).setOrigin(0).setDepth(232).setStrokeStyle(3, 0x62d7d9, 0.72));
    this.addPauseObject(this.add.rectangle(x + 14, y + 14, 432, 4, 0xb9f6d6, 0.38).setOrigin(0).setDepth(233));
    this.addPauseObject(this.add.text(x + 30, y + 34, 'Options', {
      fontFamily: 'Georgia, serif',
      fontSize: '30px',
      color: '#e9fff5',
    }).setDepth(234));
    this.addPauseObject(this.add.text(x + 30, y + 74, 'Adjust audio settings, then save or cancel.', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px',
      color: '#b9f6d6',
      wordWrap: { width: 370 },
    }).setDepth(234));
    this.drawPauseSlider(x + 30, y + 126, 'Music Volume', 'music', this.pauseOptions.values.music, this.pauseOptions.selected === 0);
    this.drawPauseSlider(x + 30, y + 202, 'SFX Volume', 'sfx', this.pauseOptions.values.sfx, this.pauseOptions.selected === 1);
    this.drawPauseButton(x + 30, y + 300, 116, 'Save', '', () => this.savePauseOptions(), true);
    this.drawPauseButton(x + 162, y + 300, 116, 'Cancel', 'Esc', () => this.openPauseMenu());
    this.drawPauseButton(x + 294, y + 300, 136, 'Reset Saves', '', () => this.openPauseResetConfirm(), false, 'danger');
    this.addPauseObject(this.add.text(x + 30, y + 368, 'Controls: W/S thrust, A/D turn, Shift boost, Space fire, E portal, Esc pause.', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '10px',
      color: '#b9f6d6',
      wordWrap: { width: 390 },
      lineSpacing: 3,
    }).setDepth(234));
  }

  drawPauseSlider(x, y, label, key, value, selected) {
    const percent = Math.round(value * 100);
    const color = selected ? 0xffc857 : 0x62d7d9;
    const bg = this.addPauseObject(this.add.rectangle(x, y, 400, 58, selected ? 0xffc857 : 0x06111b, selected ? 0.16 : 0.34)
      .setOrigin(0)
      .setDepth(235)
      .setStrokeStyle(2, color, selected ? 0.82 : 0.32));
    this.addPauseObject(this.add.text(x + 14, y + 9, label, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px',
      color: '#e9fff5',
      fontStyle: 'bold',
    }).setDepth(236));
    this.addPauseObject(this.add.text(x + 374, y + 9, `${percent}%`, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '11px',
      color: '#ffc857',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(236));
    this.addPauseObject(this.add.rectangle(x + 14, y + 38, 310, 8, 0x06111b, 0.9).setOrigin(0).setDepth(236));
    this.addPauseObject(this.add.rectangle(x + 14, y + 38, 310 * value, 8, selected ? 0xffc857 : 0x62d7d9, 1).setOrigin(0).setDepth(237));
    this.addPauseObject(this.add.rectangle(x + 10 + 310 * value, y + 33, 8, 18, 0xffffff, 1).setOrigin(0).setDepth(238));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer) => {
      this.pauseOptions.selected = key === 'music' ? 0 : 1;
      this.pauseOptions.values[key] = clampSetting((pointer.x - (x + 14)) / 310);
      this.drawPauseOptions();
    });
  }

  adjustPauseOptionSelection(delta) {
    if (!this.paused || this.pauseMode !== 'options' || !this.pauseOptions) return;
    this.pauseOptions.selected = Phaser.Math.Clamp(this.pauseOptions.selected + delta, 0, 1);
    this.drawPauseOptions();
  }

  adjustPauseOptionValue(delta) {
    if (!this.paused || this.pauseMode !== 'options' || !this.pauseOptions) return;
    const key = this.pauseOptions.selected === 0 ? 'music' : 'sfx';
    this.pauseOptions.values[key] = clampSetting(this.pauseOptions.values[key] + delta);
    this.drawPauseOptions();
  }

  savePauseOptions() {
    if (!this.pauseOptions) return;
    saveAudioSettings(this.pauseOptions.values);
    this.pauseOptions = null;
    this.openPauseMenu();
  }

  openPauseResetConfirm() {
    this.pauseMode = 'reset';
    this.pauseOptions = null;
    this.clearPauseObjects();
    this.drawPauseBackdrop();
    this.drawPausePanel('Reset Saves?', 'Delete every Stormwake Isles save in this browser: autosave and all manual slots.', [
      { label: 'Reset Saves', action: () => {
        deleteSave('auto');
        [1, 2, 3].forEach((slot) => deleteSave(slot));
        this.lastLootDrop = 'Saves reset';
        this.openPauseOptions();
      }, tone: 'danger' },
      { label: 'Back', key: 'Esc', action: () => this.openPauseOptions(), primary: true },
    ], 270);
  }

  returnToTitle() {
    if (!this.gameOver) this.autosaveRun();
    this.paused = false;
    this.gameOver = false;
    this.resumeSimulation();
    this.clearPauseObjects();
    this.clearGameOverObjects();
    this.scene.start('title');
  }

  restartLevel() {
    this.gameOver = false;
    this.paused = false;
    this.clearGameOverObjects();
    this.clearPauseObjects();
    this.physics.world?.resume?.();
    this.time.paused = false;
    this.player.setVisible(true);
    this.player.clearTint();
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0);
    this.player.hp = this.player.maxHp;
    this.player.energy = this.player.maxEnergy;
    this.loadBiome(this.biomeIndex, {
      islandTier: this.islandTier,
      roomInChain: this.roomInChain,
      currentRoomId: 'start',
      roomGraph: null,
      countRoom: false,
    });
    this.player.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.player.rotation = 0;
    this.updateHud();
  }

  triggerGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.paused = false;
    this.clearPauseObjects();
    this.physics.world?.pause?.();
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0);
    this.player.setTint(0xff6f59);
    this.createPlayerExplosion();
    this.time.delayedCall(180, () => {
      if (this.player) this.player.setVisible(false);
    });
    this.drawGameOverPanel();
    this.updateHud();
  }

  createPlayerExplosion() {
    const x = this.player.x;
    const y = this.player.y;
    this.drawShockwave(x, y, 150, 0xffc857);
    const colors = [0x62d7d9, 0xb9f6d6, 0xffc857, 0xff6f59, 0x102536];
    for (let index = 0; index < 26; index += 1) {
      const angle = (Math.PI * 2 * index) / 26 + Phaser.Math.FloatBetween(-0.18, 0.18);
      const distance = Phaser.Math.Between(60, 190);
      const size = Phaser.Math.Between(4, 12) * WORLD_SCALE;
      const shard = index % 3 === 0
        ? this.add.triangle(x, y, 0, -size, size * 0.9, size, -size * 0.9, size, colors[index % colors.length], 0.95)
        : this.add.rectangle(x, y, size * 1.7, size, colors[index % colors.length], 0.95);
      shard.setDepth(260);
      shard.setRotation(angle);
      this.addGameOverObject(shard);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        rotation: angle + Phaser.Math.FloatBetween(1.5, 4.8),
        alpha: 0,
        scale: 0.4,
        duration: 720 + index * 14,
        ease: 'Cubic.out',
      });
    }
    for (let index = 0; index < 10; index += 1) {
      const flame = this.add.circle(x, y, (10 + index * 3) * WORLD_SCALE, index % 2 ? 0xff6f59 : 0xffc857, 0.34);
      flame.setDepth(259);
      this.addGameOverObject(flame);
      this.tweens.add({
        targets: flame,
        scale: 2.4 + index * 0.1,
        alpha: 0,
        duration: 380 + index * 60,
        ease: 'Sine.out',
      });
    }
  }

  drawGameOverPanel(clearExisting = false) {
    if (clearExisting) this.clearGameOverObjects();
    this.gameOverMode = 'menu';
    this.addGameOverObject(this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x071622, 0.68).setDepth(250).setInteractive());
    const x = WORLD_WIDTH / 2 - 230;
    const y = WORLD_HEIGHT / 2 - 154;
    this.addGameOverObject(this.add.rectangle(x + 8, y + 10, 460, 308, 0x06111b, 0.58).setOrigin(0).setDepth(251));
    const panel = this.addGameOverObject(this.add.rectangle(x, y, 460, 308, 0x102536, 0.98).setOrigin(0).setDepth(252).setStrokeStyle(3, 0xff6f59, 0.82));
    panel.setScale(0.92);
    this.tweens.add({ targets: panel, scale: 1, duration: 180, ease: 'Back.out' });
    this.addGameOverObject(this.add.rectangle(x + 14, y + 14, 432, 4, 0xffc857, 0.44).setOrigin(0).setDepth(253));
    this.addGameOverObject(this.add.text(x + 36, y + 42, 'Game Over!', {
      fontFamily: 'Georgia, serif',
      fontSize: '40px',
      color: '#ffc857',
      fontStyle: 'bold',
    }).setDepth(254));
    this.addGameOverObject(this.add.text(x + 36, y + 98, 'Your hull failed and the ship broke apart.', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '13px',
      color: '#b9f6d6',
      wordWrap: { width: 380 },
      lineSpacing: 3,
    }).setDepth(254));
    this.drawGameOverButton(x + 36, y + 162, 392, 'Restart Level', 'R', () => this.restartLevel(), true);
    this.drawGameOverButton(x + 36, y + 214, 392, 'Biomes', 'B', () => this.openGameOverBiomeSelect(), false);
  }

  openGameOverBiomeSelect() {
    if (!this.gameOver) return;
    this.clearGameOverObjects();
    this.gameOverMode = 'biomes';
    this.addGameOverObject(this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x071622, 0.72).setDepth(250).setInteractive());
    const x = WORLD_WIDTH / 2 - 480;
    const y = WORLD_HEIGHT / 2 - 310;
    this.addGameOverObject(this.add.rectangle(x + 8, y + 10, 960, 620, 0x06111b, 0.58).setOrigin(0).setDepth(251));
    this.addGameOverObject(this.add.rectangle(x, y, 960, 620, 0x102536, 0.98).setOrigin(0).setDepth(252).setStrokeStyle(3, 0x62d7d9, 0.82));
    this.addGameOverObject(this.add.rectangle(x + 24, y + 24, 912, 5, 0xffc857, 0.44).setOrigin(0).setDepth(253));
    this.addGameOverObject(this.add.text(x + 38, y + 52, 'Choose Biome', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#ffc857',
      fontStyle: 'bold',
    }).setDepth(254));
    this.addGameOverObject(this.add.text(x + 38, y + 100, 'Start a new run in a different biome.', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '13px',
      color: '#b9f6d6',
      wordWrap: { width: 840 },
    }).setDepth(254));
    BIOME_MAPS.forEach((biome, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const bx = x + 38 + col * 445;
      const by = y + 144 + row * 78;
      const color = Phaser.Display.Color.HexStringToColor(biome.palette.accent).color;
      const meta = this.getBiomeMeta(biome);
      const bg = this.addGameOverObject(this.add.rectangle(bx, by, 405, 58, 0x071622, 0.9).setOrigin(0).setDepth(255).setStrokeStyle(2, color, 0.62));
      this.addGameOverObject(this.add.rectangle(bx + 28, by + 29, 34, 34, color, 0.36).setDepth(256).setStrokeStyle(1, color, 0.92));
      this.addGameOverObject(this.add.text(bx + 28, by + 22, meta.icon, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '10px',
        color: '#e9fff5',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0).setDepth(257));
      this.addGameOverObject(this.add.text(bx + 58, by + 10, biome.name, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '13px',
        color: '#e9fff5',
        fontStyle: 'bold',
      }).setDepth(257));
      this.addGameOverObject(this.add.text(bx + 58, by + 31, biome.mood, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '10px',
        color: '#b9f6d6',
        wordWrap: { width: 310 },
      }).setDepth(257));
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(color, 0.72));
      bg.on('pointerout', () => bg.setFillStyle(0x071622, 0.9));
      bg.on('pointerdown', () => this.startNewRunFromGameOver(index));
    });
    this.drawGameOverButton(x + 330, y + 548, 300, 'Back', 'Esc', () => this.drawGameOverPanel(true), false);
  }

  startNewRunFromGameOver(biomeIndex) {
    const state = makeInitialRunState();
    state.biomeIndex = Phaser.Math.Wrap(biomeIndex, 0, BIOME_MAPS.length);
    const saved = saveRunState(state);
    this.registry.set('runState', saved || state);
    this.gameOver = false;
    this.gameOverMode = null;
    this.clearGameOverObjects();
    this.scene.restart();
  }

  drawGameOverButton(x, y, width, label, key, onClick, primary = false, tone = 'default') {
    const base = tone === 'danger' ? 0x8a2b53 : primary ? 0xffc857 : 0x1d6f7b;
    const hover = tone === 'danger' ? 0xff6f59 : primary ? 0xffd978 : 0x2b8c98;
    this.addGameOverObject(this.add.rectangle(x + 4, y + 5, width, 40, 0x06111b, 0.5).setOrigin(0).setDepth(255));
    const bg = this.addGameOverObject(this.add.rectangle(x, y, width, 40, base, 0.96).setOrigin(0).setDepth(256).setStrokeStyle(2, primary ? 0x071622 : 0xb9f6d6, primary ? 0.72 : 0.58));
    this.addGameOverObject(this.add.text(x + width / 2, y + 11, formatMenuLabel(label, key), {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '13px',
      color: primary ? '#071622' : '#e9fff5',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(257));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(hover, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(base, 0.96));
    bg.on('pointerdown', onClick);
  }

  createShipTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    const s = WORLD_SCALE;
    graphics.fillStyle(0x071622, 0.34);
    graphics.fillEllipse(24 * s, 37 * s, 40 * s, 12 * s);
    graphics.fillStyle(0x1b6b7c, 1);
    graphics.fillPoints([
      { x: 24 * s, y: 2 * s },
      { x: 39 * s, y: 34 * s },
      { x: 31 * s, y: 45 * s },
      { x: 24 * s, y: 40 * s },
      { x: 17 * s, y: 45 * s },
      { x: 9 * s, y: 34 * s },
    ], true);
    graphics.lineStyle(2 * s, 0xb9f6d6, 0.8);
    graphics.strokePoints([
      { x: 24 * s, y: 2 * s },
      { x: 39 * s, y: 34 * s },
      { x: 31 * s, y: 45 * s },
      { x: 24 * s, y: 40 * s },
      { x: 17 * s, y: 45 * s },
      { x: 9 * s, y: 34 * s },
    ], true);
    graphics.fillStyle(0x102536, 1);
    graphics.fillRoundedRect(15 * s, 13 * s, 18 * s, 25 * s, 5 * s);
    graphics.fillStyle(0x62d7d9, 0.9);
    graphics.fillRoundedRect(18 * s, 18 * s, 12 * s, 11 * s, 3 * s);
    graphics.fillStyle(0xffc857, 1);
    graphics.fillTriangle(24 * s, 4 * s, 19 * s, 16 * s, 29 * s, 16 * s);
    graphics.fillStyle(0xff6f59, 0.86);
    graphics.fillTriangle(24 * s, 42 * s, 20 * s, 51 * s, 28 * s, 51 * s);
    graphics.fillStyle(0xb9f6d6, 1);
    graphics.fillCircle(24 * s, 31 * s, 3.2 * s);
    graphics.fillStyle(0x0d1b2a, 0.95);
    graphics.fillCircle(13 * s, 35 * s, 3 * s);
    graphics.fillCircle(35 * s, 35 * s, 3 * s);
    graphics.generateTexture('ship', 48 * s, 54 * s);
    graphics.destroy();
  }

  getItemEntry(itemId) {
    return this.inventory.find((entry) => entry.id === itemId);
  }

  getActivePowerupEntry(itemId) {
    return this.activePowerups.find((entry) => entry.id === itemId && entry.expiresAt > this.time.now);
  }

  getPowerupPower(itemId) {
    const item = ITEM_BY_ID[itemId];
    if (!item || item.kind !== 'powerup') return 0;
    const entry = this.getActivePowerupEntry(itemId);
    if (!entry) return 0;
    return POWERUP_STRENGTH_BY_RARITY[entry.rarity || item.rarity] ?? 1;
  }

  getItemLevel(itemId) {
    const item = ITEM_BY_ID[itemId];
    if (item?.kind === 'powerup') return this.getPowerupPower(itemId);
    return this.getItemEntry(itemId)?.level ?? 0;
  }

  getRelicLevel(itemId) {
    const entry = this.getItemEntry(itemId);
    const item = ITEM_BY_ID[itemId];
    return entry?.equipped && isXpRelic(item) ? entry.level : 0;
  }

  getRelicPower(itemId) {
    const level = this.getRelicLevel(itemId);
    if (level <= 0) return 0;
    const conduit = this.getRelicLevel('crystal-conduit');
    const ancientIds = new Set([
      'quantum-rudder',
      'crystal-conduit',
      'lightning-rod-mast',
      'black-horizon-core',
      'void-sail',
      'celestial-compass',
      'eclipse-cortex',
    ]);
    return level + (ancientIds.has(itemId) && itemId !== 'crystal-conduit' ? Math.floor(conduit / 2) : 0);
  }

  getXpToNextLevelFor(itemId) {
    const entry = this.getItemEntry(itemId);
    const item = ITEM_BY_ID[itemId];
    return entry && item ? getXpToNextLevel(item, entry.level) : 0;
  }

  recalculateEffects() {
    const oldMaxHp = this.player?.maxHp ?? BASE_PLAYER_MAX_HP;
    const oldMaxEnergy = this.player?.maxEnergy ?? BASE_PLAYER_MAX_ENERGY;
    const hullLevel = this.getItemLevel('reinforced-hull-plating');
    const arcLevel = this.getItemLevel('arc-reactor');
    const leviathan = this.getRelicPower('leviathan-engine');
    const glass = this.getRelicPower('glass-hull');
    const stormCore = this.getItemLevel('storm-core');
    const wheel = this.getRelicPower('dead-captains-wheel');
    const driftFins = this.getItemLevel('drift-fins');
    const skyVane = this.getRelicPower('sky-vane-rig');
    const stormglass = this.getRelicPower('stormglass-battery');
    const cinderFuse = this.getRelicPower('cinder-fuse');
    const prismLens = this.getRelicPower('prism-lens');
    const rimeKeel = this.getRelicPower('rime-keel');
    const vineNet = this.getRelicPower('vinewrapped-cargo-net');
    const rivetArmor = this.getRelicPower('rivet-armor-plate');
    const powderBreech = this.getRelicPower('powder-keg-breech');
    const templeChime = this.getRelicPower('temple-aether-chime');
    const umbralGyro = this.getRelicPower('umbral-gyroscope');

    const maxHp = Math.max(35, BASE_PLAYER_MAX_HP + hullLevel * 10 + leviathan * 15 + rivetArmor * 6 - glass * 9);
    const maxEnergy = BASE_PLAYER_MAX_ENERGY + arcLevel * 10 + stormCore * 5 + stormglass * 4 + templeChime * 3;
    this.effectState = {
      maxHp,
      maxEnergy,
      damageMultiplier: 1 + glass * 0.16 + this.getRelicPower('crystal-conduit') * 0.03 + prismLens * 0.035 + powderBreech * 0.045,
      enemyDamageMultiplier: Math.max(0.35, 1 - stormCore * 0.06 - this.getRelicPower('corrupted-relic') * 0.02 - rivetArmor * 0.025 - rimeKeel * 0.015 - umbralGyro * 0.02),
      turnMultiplier: 1 + wheel * 0.12 + driftFins * 0.08 + skyVane * 0.055 + rimeKeel * 0.04 + templeChime * 0.025 + umbralGyro * 0.025,
      drag: Math.max(0.7, BASE_DRAG - wheel * 0.012 - driftFins * 0.01 - skyVane * 0.006 - rimeKeel * 0.008),
      maxVelocity: BASE_MAX_VELOCITY + wheel * 8 + driftFins * 7 + skyVane * 5 + rimeKeel * 3,
      boostMultiplier: 1 + this.getRelicPower('ember-engine') * 0.03 + this.getRelicPower('black-horizon-core') * 0.04 + templeChime * 0.025 + umbralGyro * 0.02,
      shotSpeed: BASE_PLAYER_SHOT_SPEED + this.getRelicPower('harpoon-launcher') * 22 + cinderFuse * 6 + powderBreech * 8,
      fireDelay: Math.max(70, 160 - this.getItemLevel('burst-cylinder') * 12 - this.getRelicPower('black-horizon-core') * 8 - cinderFuse * 5 - powderBreech * 4 - umbralGyro * 3),
      lootMultiplier: 1
        + this.getItemLevel('salvager-magnet') * 0.2
        + this.getItemLevel('fortune-engine') * 0.08
        + this.getItemLevel('treasure-compass') * 0.08
        + this.getRelicPower('celestial-compass') * 0.05
        + vineNet * 0.045,
      repairRate: this.getItemLevel('repair-drone') * 0.018 + templeChime * 0.003,
      droneRate: Math.max(320, 1100 - this.getItemLevel('gun-drone') * 110),
    };

    const eclipse = this.getRelicPower('eclipse-cortex');
    if (eclipse > 0) {
      const saturation = this.corruptionSaturation ?? 0;
      this.effectState.damageMultiplier += saturation * (0.28 + eclipse * 0.02);
      this.effectState.turnMultiplier += saturation * 0.18;
      this.effectState.maxVelocity += saturation * (34 + eclipse * 4);
      this.effectState.boostMultiplier += saturation * 0.18;
      this.effectState.fireDelay = Math.max(48, this.effectState.fireDelay - saturation * (36 + eclipse * 4));
    }

    if (this.player) {
      this.player.maxHp = maxHp;
      this.player.maxEnergy = maxEnergy;
      this.player.hp = Math.min(maxHp, this.player.hp + Math.max(0, maxHp - oldMaxHp));
      this.player.energy = Math.min(maxEnergy, this.player.energy + Math.max(0, maxEnergy - oldMaxEnergy));
      this.player.setScale(1 + leviathan * 0.07);
      this.player.setMaxVelocity(this.effectState.maxVelocity);
    }
  }

  getBiomeMeta(biome = this.biome) {
    return BIOME_META[biome?.id] || { icon: '???', boss: 'Unknown Boss', bossRelic: 'ricochet-chamber' };
  }

  getRoomCode(biome = this.biome, islandTier = this.islandTier, roomInChain = this.roomInChain) {
    const meta = this.getBiomeMeta(biome);
    return `[${meta.icon}] ${biome.name} ${islandTier}-${roomInChain}`;
  }

  getLevelKey(biomeIndex = this.biomeIndex, islandTier = this.islandTier, roomInChain = this.roomInChain) {
    return `${biomeIndex}:${islandTier}:${roomInChain}`;
  }

  ensureRoomGraph(options = {}) {
    const key = this.getLevelKey();
    if (options.roomGraph?.key === key) {
      this.roomGraph = cloneRunState(options.roomGraph);
    } else if (!this.roomGraph || this.roomGraph.key !== key) {
      this.roomGraph = this.generateLevelRoomGraph(key);
    }
    if (!this.roomGraph.nodes?.[this.currentRoomId]) this.currentRoomId = this.roomGraph.startId;
  }

  generateLevelRoomGraph(key) {
    const random = seededRandom(hashRoomSeed(`level-graph:${key}`));
    const count = LEVEL_ROOM_MIN + Math.floor(random() * (LEVEL_ROOM_MAX - LEVEL_ROOM_MIN + 1));
    const nodes = {};
    const ids = Array.from({ length: count }, (_, index) => (index === 0 ? 'start' : `room-${index}`));
    ids.forEach((id, index) => {
      nodes[id] = {
        id,
        cleared: false,
        neighbors: [],
        layoutSeed: Math.floor(random() * 999999),
        encounterSeed: Math.floor(random() * 999999),
        x: index === 0 ? 0 : Math.round((random() * 2 - 1) * 3),
        y: index === 0 ? 0 : Math.round((random() * 2 - 1) * 3),
      };
    });
    const connect = (a, b) => {
      if (a === b) return;
      if (!nodes[a].neighbors.includes(b)) nodes[a].neighbors.push(b);
      if (!nodes[b].neighbors.includes(a)) nodes[b].neighbors.push(a);
    };
    for (let index = 1; index < ids.length; index += 1) {
      const parentIndex = Math.max(0, Math.floor(random() * index));
      connect(ids[index], ids[parentIndex]);
    }
    for (let index = 1; index < ids.length; index += 1) {
      if (random() < 0.28) connect(ids[index], ids[1 + Math.floor(random() * (ids.length - 1))]);
    }
    const distances = { start: 0 };
    const queue = ['start'];
    while (queue.length) {
      const id = queue.shift();
      nodes[id].neighbors.forEach((next) => {
        if (distances[next] !== undefined) return;
        distances[next] = distances[id] + 1;
        queue.push(next);
      });
    }
    const exitId = ids
      .filter((id) => id !== 'start')
      .sort((a, b) => (distances[b] ?? 0) - (distances[a] ?? 0) || nodes[a].neighbors.length - nodes[b].neighbors.length)[0];
    return { key, startId: 'start', exitId, nodes };
  }

  getCurrentRoomNode() {
    return this.roomGraph?.nodes?.[this.currentRoomId] || null;
  }

  isCurrentLevelExitRoom() {
    return this.currentRoomId === this.roomGraph?.exitId;
  }

  getRoomPortalDirection(targetNodeId) {
    const current = this.getCurrentRoomNode();
    const target = this.roomGraph?.nodes?.[targetNodeId];
    if (!current || !target) return 'right';
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  buildRoomRouteChoices() {
    const current = this.getCurrentRoomNode();
    if (!current?.cleared) {
      this.routeChoices = [];
      return;
    }
    const choices = current.neighbors.map((id) => {
      const node = this.roomGraph.nodes[id];
      const direction = this.getRoomPortalDirection(id);
      return {
        biomeIndex: this.biomeIndex,
        continuing: true,
        islandTier: this.islandTier,
        roomInChain: this.roomInChain,
        roomNodeId: id,
        direction,
        roomTravel: true,
        label: `${this.getRoomCode(this.biome, this.islandTier, this.roomInChain)} ${id === this.roomGraph.exitId ? 'Exit Room' : 'Side Room'}`,
        note: node.cleared ? 'Previously cleared room' : 'Uncleared connected room',
      };
    });
    if (this.currentRoomId === this.roomGraph.exitId) {
      if (this.roomInChain >= 5) {
        this.routeChoices = this.generatePortalChoices(false);
      } else {
        choices.push({
          biomeIndex: this.biomeIndex,
          continuing: true,
          islandTier: this.islandTier,
          roomInChain: this.roomInChain + 1,
          roomNodeId: 'start',
          direction: 'right',
          levelExit: true,
          label: this.getRoomCode(this.biome, this.islandTier, this.roomInChain + 1),
          note: `Advance to level ${this.islandTier}-${this.roomInChain + 1}`,
        });
        this.routeChoices = choices;
      }
    } else {
      this.routeChoices = choices;
    }
    this.autosaveRun();
  }

  loadBiome(index, options = {}) {
    this.clearProjectiles();
    this.clearLootDrops();
    this.clearCorridors();
    this.clearPortals();
    this.clearHiddenPuzzle();
    this.clearLegendaryQuestObjects();
    this.corridorTraversal = null;
    this.resetWorldBounds();
    const previousBiomeId = this.biome?.id ?? null;
    this.biomeIndex = Phaser.Math.Wrap(index, 0, BIOME_MAPS.length);
    this.biome = BIOME_MAPS[this.biomeIndex];
    this.islandTier = Math.max(1, options.islandTier ?? 1);
    this.roomInChain = Phaser.Math.Clamp(options.roomInChain ?? 1, 1, 5);
    this.currentRoomId = options.currentRoomId || options.roomNodeId || 'start';
    this.roomGraph = options.roomGraph ? cloneRunState(options.roomGraph) : (options.keepRoomGraph ? this.roomGraph : null);
    this.ensureRoomGraph(options);
    const shouldCountRoom = options.countRoom ?? (this.roomDepth === 0);
    if (shouldCountRoom) this.roomDepth += 1;
    if (previousBiomeId === this.biome.id) this.biomeStreak = Math.max(this.biomeStreak, this.islandTier);
    else this.biomeStreak = this.islandTier;
    const node = this.getCurrentRoomNode();
    this.portalOpen = options.portalOpen ?? false;
    this.routeChoices = options.routeChoices ? cloneRunState(options.routeChoices) : [];
    this.roomCleared = Boolean(node?.cleared);
    this.portalOpen = this.roomCleared && this.portalOpen;
    if (this.roomCleared) this.buildRoomRouteChoices();
    else this.routeChoices = [];
    this.enemySalvoCount = 0;
    this.enemyHitCount = 0;
    this.routeTransitioning = false;
    this.lastEnemyShot = this.time.now + ENEMY_FIRST_FIRE_DELAY_MS;
    this.activeLayout = this.generateRoomLayout();
    this.drawMap();
    if (this.roomCleared) {
      this.objectLayer.removeAll(true);
      this.enemies = [];
      this.createCorridorObjects();
      this.createPortalObjects();
    } else {
      this.spawnEncounterMarkers();
      this.createLegendaryQuestObject();
      this.createHiddenPuzzle();
    }
    this.autosaveRun();
  }

  generatePortalChoices(autosave = true) {
    const otherIndexes = BIOME_MAPS
      .map((_, index) => index)
      .filter((index) => index !== this.biomeIndex);
    Phaser.Utils.Array.Shuffle(otherIndexes);
    const choices = [
      { biomeIndex: otherIndexes[0], continuing: false, islandTier: 1, roomInChain: 1 },
      { biomeIndex: this.biomeIndex, continuing: true, islandTier: this.islandTier + 1, roomInChain: 1 },
      { biomeIndex: otherIndexes[1], continuing: false, islandTier: 1, roomInChain: 1 },
    ].map((choice) => ({
      ...choice,
      roomNodeId: 'start',
      levelExit: true,
      direction: choice.continuing ? 'right' : undefined,
      label: this.getRoomCode(BIOME_MAPS[choice.biomeIndex], choice.islandTier, choice.roomInChain),
      note: choice.continuing ? `Stay in ${this.biome.name} for deeper relic routes` : `Veer toward ${BIOME_MAPS[choice.biomeIndex].mood.toLowerCase()}`,
    }));
    this.routeChoices = choices;
    if (autosave) this.autosaveRun();
    return choices;
  }

  setNextRoomChoice() {
    this.buildRoomRouteChoices();
  }

  chooseRoute(index) {
    if (this.routeTransitioning || !this.roomCleared || !this.routeChoices[index]) return;
    this.routeTransitioning = true;
    const choice = this.routeChoices[index];
    this.drawShockwave(this.player.x, this.player.y, 90, this.biome.palette.accent ? Phaser.Display.Color.HexStringToColor(this.biome.palette.accent).color : 0x62d7d9);
    this.loadBiome(choice.biomeIndex, {
      islandTier: choice.islandTier,
      roomInChain: choice.roomInChain,
      currentRoomId: choice.roomNodeId || 'start',
      roomGraph: choice.roomTravel ? this.roomGraph : null,
      keepRoomGraph: Boolean(choice.roomTravel),
      countRoom: true,
    });
    const spawn = this.getPlayerSpawnForDirection(choice.direction);
    this.player.setPosition(spawn.x, spawn.y);
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0);
    this.player.rotation = Math.PI / 2;
  }

  getPlayerSpawnForDirection(direction = 'right') {
    const centerY = WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT / 2;
    const centerX = WORLD_OFFSET_X + MAP_PIXEL_WIDTH / 2;
    if (direction === 'left') return { x: WORLD_OFFSET_X + MAP_PIXEL_WIDTH - TILE_SIZE * 1.7, y: centerY };
    if (direction === 'up') return { x: centerX, y: WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT - TILE_SIZE * 1.7 };
    if (direction === 'down') return { x: centerX, y: WORLD_OFFSET_Y + TILE_SIZE * 1.7 };
    return { x: WORLD_OFFSET_X + TILE_SIZE * 1.7, y: centerY };
  }

  checkRoomClear() {
    if (this.roomCleared) return;
    if (this.enemies.some((enemy) => enemy.getData('alive'))) return;
    this.roomCleared = true;
    const node = this.getCurrentRoomNode();
    if (node) node.cleared = true;
    this.portalOpen = this.currentRoomId === this.roomGraph?.exitId;
    this.buildRoomRouteChoices();
    this.createCorridorObjects();
    this.createPortalObjects();
    this.updateHud();
  }

  clearPortals() {
    this.portals?.forEach((portal) => portal.destroy());
    this.portals = [];
    this.nearbyPortal = null;
    this.portalLayer?.removeAll(true);
  }

  clearCorridors() {
    this.corridors?.forEach((corridor) => corridor.destroy());
    this.corridors = [];
    this.nearbyCorridor = null;
    this.corridorLayer?.removeAll(true);
  }

  clearHiddenPuzzle() {
    this.puzzleObjects?.forEach((object) => object.destroy());
    this.puzzleObjects = [];
    this.hiddenPuzzle = null;
  }

  clearLegendaryQuestObjects() {
    this.questObjects?.forEach((object) => object.destroy());
    this.questObjects = [];
  }

  getLegendaryQuestState(biomeId = this.biome.id) {
    if (!this.legendaryQuestState[biomeId]) {
      this.legendaryQuestState[biomeId] = {
        pickup: false,
        charged: false,
      };
    }
    return this.legendaryQuestState[biomeId];
  }

  getLegendaryQuestStep() {
    const quest = LEGENDARY_QUESTS[this.biome.id];
    if (!quest) return null;
    const state = this.getLegendaryQuestState();
    const [pickupTier, pickupRoom] = quest.pickupAt;
    const [chargeTier, chargeRoom] = quest.chargeAt;
    if (this.islandTier === pickupTier && this.roomInChain === pickupRoom && this.isCurrentLevelExitRoom() && !state.pickup) {
      return { kind: 'pickup', data: quest.pickup };
    }
    if (this.islandTier === chargeTier && this.roomInChain === chargeRoom && this.isCurrentLevelExitRoom() && state.pickup && !state.charged) {
      return { kind: 'charged', data: quest.charge };
    }
    return null;
  }

  createLegendaryQuestObject() {
    const step = this.getLegendaryQuestStep();
    if (!step) return;
    const quest = LEGENDARY_QUESTS[this.biome.id];
    const [name, symbol] = step.data;
    const color = Phaser.Display.Color.HexStringToColor(this.biome.palette.accent).color;
    const seed = hashRoomSeed(`quest:${this.biome.id}:${step.kind}`);
    const random = seededRandom(seed);
    const x = WORLD_OFFSET_X + TILE_SIZE * (4 + random() * 10);
    const y = WORLD_OFFSET_Y + TILE_SIZE * (2.3 + random() * 6.8);
    const object = this.add.container(x, y);
    const base = this.createQuestShape(quest.objectStyle, color, step.kind);
    const core = this.add.text(0, -10 * WORLD_SCALE, symbol, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: `${15 * WORLD_SCALE}px`,
      color: '#e9fff5',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    object.add([base, core]);
    object.setDepth(13);
    object.setDataEnabled();
    object.setData('questStep', step.kind);
    object.setData('questName', name);
    object.base = base;
    this.objectLayer.add(object);
    this.questObjects.push(object);
    this.tweens.add({
      targets: base,
      alpha: 0.34,
      scale: 1.2,
      duration: step.kind === 'charged' ? 520 : 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.lastLootDrop = `${this.formatQuestItemName(name)} is reacting to the area...`;
  }

  formatQuestItemName(name) {
    return name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  createQuestShape(style, color, stepKind) {
    const alpha = stepKind === 'charged' ? 0.22 : 0.14;
    if (style === 'kite') return this.add.triangle(0, 0, 0, -34 * WORLD_SCALE, 28 * WORLD_SCALE, 22 * WORLD_SCALE, -28 * WORLD_SCALE, 22 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, 0.58);
    if (style === 'spire') return this.add.rectangle(0, 0, 22 * WORLD_SCALE, 58 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, 0.64);
    if (style === 'vent') return this.add.ellipse(0, 0, 58 * WORLD_SCALE, 26 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, 0xffc857, 0.52);
    if (style === 'prism') return this.add.polygon(0, 0, [0, -32, 30, -8, 18, 30, -18, 30, -30, -8].map((value) => value * WORLD_SCALE), color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, 0.62);
    if (style === 'ice') return this.add.polygon(0, 0, [0, -34, 22, -12, 16, 26, -16, 26, -22, -12].map((value) => value * WORLD_SCALE), 0xe9fff5, alpha).setStrokeStyle(2 * WORLD_SCALE, color, 0.58);
    if (style === 'seed') return this.add.ellipse(0, 0, 34 * WORLD_SCALE, 52 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, 0xb9f6d6, 0.52);
    if (style === 'gear') return this.add.polygon(0, 0, Array.from({ length: 16 }, (_, index) => {
      const radius = (index % 2 === 0 ? 32 : 22) * WORLD_SCALE;
      const angle = (Math.PI * 2 * index) / 16;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    }).flat(), color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, 0.62);
    if (style === 'map') return this.add.rectangle(0, 0, 52 * WORLD_SCALE, 34 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, 0xffc857, 0.52);
    if (style === 'bell') return this.add.arc(0, 4 * WORLD_SCALE, 30 * WORLD_SCALE, 200, 340, false, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, 0.62);
    if (style === 'void') return this.add.circle(0, 0, 30 * WORLD_SCALE, 0x11101f, 0.42).setStrokeStyle(2 * WORLD_SCALE, color, 0.72);
    return this.add.circle(0, 0, 26 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, 0.48);
  }

  checkLegendaryQuestOverlap() {
    if (!this.questObjects.length || !this.player) return;
    const target = this.questObjects.find((object) => (
      object.getData('questStep')
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, object.x, object.y) <= 32 * WORLD_SCALE
    ));
    if (!target) return;
    const state = this.getLegendaryQuestState();
    const step = target.getData('questStep');
    if (step === 'pickup') state.pickup = true;
    if (step === 'charged') state.charged = true;
    target.setData('questStep', null);
    target.setAlpha(0.22);
    target.base?.setStrokeStyle(3 * WORLD_SCALE, 0xe9fff5, 0.75);
    this.drawShockwave(target.x, target.y, 58, Phaser.Display.Color.HexStringToColor(this.biome.palette.accent).color);
    this.autosaveRun();
  }

  isLegendaryQuestReady() {
    const state = this.getLegendaryQuestState();
    return Boolean(state.pickup && state.charged);
  }

  getHiddenPuzzleRelic() {
    const mythic = this.getMythicPuzzleRelic();
    if (mythic) return mythic;
    if (this.islandTier !== HIDDEN_PUZZLE_TIER) return null;
    if (this.roomInChain >= 5) return null;
    if (this.roomInChain !== this.getHiddenPuzzleRoom()) return null;
    if (!this.isCurrentLevelExitRoom()) return null;
    if (!this.isLegendaryQuestReady()) return null;
    const assignedLegendary = ITEM_BY_ID[LEGENDARY_RELIC_BY_BIOME[this.biome.id]];
    if (assignedLegendary && !this.getItemEntry(assignedLegendary.id)) return assignedLegendary;
    return null;
  }

  getMythicPuzzleRelic() {
    const quest = MYTHIC_PUZZLES[this.biome.id];
    if (!quest) return null;
    if (this.islandTier !== MYTHIC_PUZZLE_TIER) return null;
    if (this.roomInChain !== quest.puzzleRoom) return null;
    if (!this.isCurrentLevelExitRoom()) return null;
    if (this.getRelicLevel(quest.requiredRelic) <= 0) return null;
    const relic = ITEM_BY_ID[MYTHIC_RELIC_BY_BIOME[this.biome.id]];
    if (relic && !this.getItemEntry(relic.id)) return relic;
    return null;
  }

  getHiddenPuzzleRoom(biome = this.biome) {
    return LEGENDARY_QUESTS[biome.id]?.puzzleRoom ?? 1 + (hashRoomSeed(`hidden-room:${biome.id}`) % 4);
  }

  createHiddenPuzzle() {
    const relic = this.getHiddenPuzzleRelic();
    if (!relic) return;
    const color = Phaser.Display.Color.HexStringToColor(relic.palette[1]).color;
    const shrineX = WORLD_OFFSET_X + MAP_PIXEL_WIDTH * 0.5;
    const shrineY = WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT * 0.5;
    const seed = hashRoomSeed(`runes:${this.biome.id}:${this.islandTier}:${this.roomInChain}:${relic.id}`);
    const random = seededRandom(seed);
    const quest = relic.rarity === 'mythic'
      ? MYTHIC_PUZZLES[this.biome.id]
      : LEGENDARY_QUESTS[this.biome.id] || { puzzleType: 'ordered', symbols: ['1', '2', '3'] };
    const markerCount = quest.symbols.length;
    const positions = this.getPuzzlePositions(quest.puzzleStyle, markerCount, random);
    this.hiddenPuzzle = {
      relicId: relic.id,
      step: 0,
      complete: false,
      type: quest.puzzleType,
      activationRule: quest.activationRule,
      activationHint: quest.activationHint,
      solved: [],
      positions,
      shrineX,
      shrineY,
      lastActivationAt: 0,
      lastRuleMessageAt: 0,
    };
    const shrine = this.add.container(shrineX, shrineY);
    const base = this.add.circle(0, 0, 36 * WORLD_SCALE, color, 0.12).setStrokeStyle(2 * WORLD_SCALE, color, 0.58);
    const core = this.add.text(0, -10 * WORLD_SCALE, relic.symbol, {
      fontFamily: 'Georgia, serif',
      fontSize: `${22 * WORLD_SCALE}px`,
      color: '#e9fff5',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const label = this.add.text(0, 30 * WORLD_SCALE, relic.rarity === 'mythic' ? 'MYTHIC' : '???', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: `${8 * WORLD_SCALE}px`,
      color: '#e9fff5',
    }).setOrigin(0.5);
    shrine.add([base, core, label]);
    shrine.setDepth(13);
    this.objectLayer.add(shrine);
    this.puzzleObjects.push(shrine);
    this.tweens.add({
      targets: base,
      scale: 1.18,
      alpha: 0.28,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    positions.forEach(([x, y], index) => {
      const rune = this.add.container(x, y);
      const active = quest.puzzleType !== 'ordered' || index === 0;
      const ring = this.createPuzzleMarker(quest, color, active, index);
      const text = this.add.text(0, -7 * WORLD_SCALE, quest.symbols[index] ?? `${index + 1}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: `${12 * WORLD_SCALE}px`,
        color: '#e9fff5',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      rune.add([ring, text]);
      rune.setDepth(13);
      rune.setDataEnabled();
      rune.setData('step', index);
      rune.ring = ring;
      this.objectLayer.add(rune);
      this.puzzleObjects.push(rune);
      this.tweens.add({
        targets: ring,
        scale: 1.16,
        duration: 700 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });
    this.renderItemPanel();
    const shrineItem = quest?.charge?.[0] || quest?.pickup?.[0] || relic.name;
    this.lastLootDrop = relic.rarity === 'mythic'
      ? quest.activationHint
      : quest.activationHint || `${this.formatQuestItemName(shrineItem)} gravitates toward the shrine...`;
  }

  getPuzzlePositions(style, count, random) {
    const centerX = WORLD_OFFSET_X + MAP_PIXEL_WIDTH * 0.5;
    const centerY = WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT * 0.5;
    const points = {
      wind: [[3.2, 2.2], [8.7, 4.9], [14.4, 2.6]],
      lightning: [[5.1, 2.1], [12.8, 2.3], [4.2, 8.9], [13.7, 8.6]],
      flame: [[4.4, 8.5], [8.8, 5.9], [13.6, 8.4]],
      mirror: [[3.8, 3.2], [8.9, 7.4], [14.2, 3.2]],
      snow: [[5.0, 2.7], [8.9, 5.6], [13.0, 8.7]],
      vine: [[3.7, 7.9], [7.9, 2.4], [13.8, 7.7]],
      machine: [[5.1, 3.0], [8.9, 5.4], [12.8, 7.8]],
      route: [[3.4, 3.1], [9.1, 8.7], [14.1, 3.4]],
      temple: [[5.4, 7.6], [8.9, 2.7], [12.6, 7.6]],
      void: [[5.2, 2.4], [12.6, 2.7], [5.5, 8.5], [12.9, 8.4]],
      eclipse: [[8.9, 1.7], [13.6, 4.3], [11.7, 8.9], [6.0, 8.8], [4.1, 4.2]],
    }[style];
    if (points) {
      return points.slice(0, count).map(([gridX, gridY]) => [
        WORLD_OFFSET_X + TILE_SIZE * (gridX + (random() - 0.5) * 0.35),
        WORLD_OFFSET_Y + TILE_SIZE * (gridY + (random() - 0.5) * 0.35),
      ]);
    }
    return Array.from({ length: count }, (_, index) => [
      centerX + Math.cos((Math.PI * 2 * index) / count) * TILE_SIZE * 4,
      centerY + Math.sin((Math.PI * 2 * index) / count) * TILE_SIZE * 2.8,
    ]);
  }

  createPuzzleMarker(quest, color, active, index) {
    const alpha = active ? 0.2 : 0.06;
    if (quest.puzzleStyle === 'wind') return this.add.triangle(0, 0, 0, -26 * WORLD_SCALE, 30 * WORLD_SCALE, 16 * WORLD_SCALE, -30 * WORLD_SCALE, 16 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.9 : 0.35);
    if (quest.puzzleStyle === 'lightning') return this.add.polygon(0, 0, [-8, -28, 10, -6, 0, -6, 12, 28, -12, 2, 0, 2].map((value) => value * WORLD_SCALE), color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.9 : 0.35);
    if (quest.puzzleStyle === 'flame') return this.add.ellipse(0, 0, 34 * WORLD_SCALE, 54 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, 0xffc857, active ? 0.82 : 0.35);
    if (quest.puzzleStyle === 'mirror') return this.add.polygon(0, 0, [0, -30, 28, 0, 0, 30, -28, 0].map((value) => value * WORLD_SCALE), color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.86 : 0.35);
    if (quest.puzzleStyle === 'snow') return this.add.circle(0, 0, 24 * WORLD_SCALE, 0xe9fff5, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.85 : 0.35);
    if (quest.puzzleStyle === 'vine') return this.add.arc(0, 0, 28 * WORLD_SCALE, 20 + index * 30, 290 + index * 20, false, color, alpha).setStrokeStyle(3 * WORLD_SCALE, color, active ? 0.88 : 0.35);
    if (quest.puzzleStyle === 'machine') return this.add.rectangle(0, 0, 46 * WORLD_SCALE, 32 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.84 : 0.35);
    if (quest.puzzleStyle === 'route') return this.add.rectangle(0, 0, 48 * WORLD_SCALE, 30 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, 0xffc857, active ? 0.84 : 0.35);
    if (quest.puzzleStyle === 'temple') return this.add.arc(0, 4 * WORLD_SCALE, 30 * WORLD_SCALE, 200, 340, false, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.84 : 0.35);
    if (quest.puzzleStyle === 'void') return this.add.circle(0, 0, 26 * WORLD_SCALE, 0x11101f, active ? 0.46 : 0.18).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.84 : 0.35);
    if (quest.puzzleStyle === 'eclipse') return this.add.arc(0, 0, 30 * WORLD_SCALE, 35 + index * 20, 325 - index * 10, false, 0x090913, active ? 0.54 : 0.2).setStrokeStyle(3 * WORLD_SCALE, color, active ? 0.95 : 0.4);
    if (quest.puzzleType === 'all') return this.add.rectangle(0, 0, 42 * WORLD_SCALE, 42 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.82 : 0.35);
    if (quest.puzzleType === 'return') return this.add.triangle(0, 0, 0, -25 * WORLD_SCALE, 25 * WORLD_SCALE, 20 * WORLD_SCALE, -25 * WORLD_SCALE, 20 * WORLD_SCALE, color, alpha).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.82 : 0.35);
    return this.add.circle(0, 0, 23 * WORLD_SCALE, color, active ? 0.24 : 0.06).setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.9 : 0.35);
  }

  createPortalObjects() {
    this.clearPortals();
    if (!this.roomCleared || !this.getCurrentRoomNode()?.cleared || !this.routeChoices.length) return;
    const liveChoices = this.routeChoices
      .map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => Boolean(choice) && !choice.roomTravel);
    if (!liveChoices.length) return;
    liveChoices.forEach(({ choice, index }, portalIndex) => {
      const [x, y] = this.getPortalPosition(choice, portalIndex, liveChoices.length);
      const biome = BIOME_MAPS[choice.biomeIndex];
      const color = Phaser.Display.Color.HexStringToColor(biome.palette.accent).color;
      const meta = this.getBiomeMeta(biome);
      this.drawPortalCorridor(x, y, color);
      const portal = this.add.container(x, y);
      const gate = this.add.ellipse(0, 0, 70 * WORLD_SCALE, 98 * WORLD_SCALE, color, 0.18)
        .setStrokeStyle(4 * WORLD_SCALE, color, 0.9);
      const inner = this.add.ellipse(0, 0, 42 * WORLD_SCALE, 66 * WORLD_SCALE, 0xe9fff5, 0.2)
        .setStrokeStyle(2 * WORLD_SCALE, 0xe9fff5, 0.48);
      const icon = this.add.text(0, -10 * WORLD_SCALE, meta.icon, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: `${12 * WORLD_SCALE}px`,
        color: '#e9fff5',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const label = this.add.text(0, 58 * WORLD_SCALE, `${biome.name} ${choice.islandTier}-${choice.roomInChain}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: `${9 * WORLD_SCALE}px`,
        color: '#e9fff5',
        align: 'center',
        wordWrap: { width: 150 * WORLD_SCALE },
      }).setOrigin(0.5, 0);
      const prompt = this.createPortalPrompt(choice, biome, color);
      portal.add([gate, inner, icon, label, prompt]);
      portal.setDataEnabled();
      portal.setData('routeIndex', index);
      portal.setData('triggered', false);
      portal.setData('choice', choice);
      portal.prompt = prompt;
      this.portalLayer.add(portal);
      this.portals.push(portal);
      this.tweens.add({
        targets: [gate, inner],
        scale: 1.08,
        alpha: '+=0.18',
        duration: 820 + portalIndex * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: icon,
        y: -16 * WORLD_SCALE,
        duration: 900 + portalIndex * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });
    this.maybeShowTutorialStep(
      'portals',
      'Routes & Rooms',
      'After clearing a room, corridor mouths open to connected rooms. Fly into one and the camera follows your ship through the landscape.\n\nThe final exit room has a portal to the next level.',
    );
  }

  getPortalPosition(choice, portalIndex, total) {
    const cx = WORLD_OFFSET_X + MAP_PIXEL_WIDTH / 2;
    const cy = WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT / 2;
    const direction = choice.direction || (total > 1 ? ['up', 'right', 'down'][portalIndex] : 'right');
    if (direction === 'left') return [WORLD_OFFSET_X + TILE_SIZE * 1.15, cy];
    if (direction === 'up') return [cx, WORLD_OFFSET_Y + TILE_SIZE * 1.15];
    if (direction === 'down') return [cx, WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT - TILE_SIZE * 1.15];
    return [WORLD_OFFSET_X + MAP_PIXEL_WIDTH - TILE_SIZE * 1.15, cy];
  }

  createPortalPrompt(choice, biome, color) {
    const prompt = this.add.container(-110 * WORLD_SCALE, -126 * WORLD_SCALE);
    const backing = this.add.rectangle(0, 0, 260 * WORLD_SCALE, 104 * WORLD_SCALE, 0x071622, 0.88)
      .setStrokeStyle(2 * WORLD_SCALE, color, 0.92);
    const tail = this.add.triangle(42 * WORLD_SCALE, 58 * WORLD_SCALE, 0, 0, 24 * WORLD_SCALE, 0, 12 * WORLD_SCALE, 20 * WORLD_SCALE, 0x071622, 0.88)
      .setStrokeStyle(1 * WORLD_SCALE, color, 0.7);
    const title = this.add.text(-108 * WORLD_SCALE, -40 * WORLD_SCALE, biome.name, {
      fontFamily: 'Georgia, serif',
      fontSize: `${16 * WORLD_SCALE}px`,
      color: '#e9fff5',
      fontStyle: 'bold',
    });
    const room = this.add.text(-108 * WORLD_SCALE, -10 * WORLD_SCALE, `${choice.islandTier}-${choice.roomInChain}`, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: `${14 * WORLD_SCALE}px`,
      color: '#b9f6d6',
      fontStyle: 'bold',
    });
    const key = this.add.circle(88 * WORLD_SCALE, 18 * WORLD_SCALE, 22 * WORLD_SCALE, color, 0.28)
      .setStrokeStyle(2 * WORLD_SCALE, 0xe9fff5, 0.82);
    const keyText = this.add.text(88 * WORLD_SCALE, 8 * WORLD_SCALE, 'E', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: `${17 * WORLD_SCALE}px`,
      color: '#e9fff5',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const action = this.add.text(-108 * WORLD_SCALE, 25 * WORLD_SCALE, 'Enter portal', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: `${10 * WORLD_SCALE}px`,
      color: '#ffd66f',
      fontStyle: 'bold',
    });
    prompt.add([tail, backing, title, room, key, keyText, action]);
    prompt.setAlpha(0);
    prompt.setVisible(false);
    prompt.keyGlow = key;
    this.tweens.add({
      targets: [key, keyText],
      alpha: 0.45,
      scale: 1.12,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    return prompt;
  }

  drawPortalCorridor(x, y, color) {
    const startX = WORLD_OFFSET_X + MAP_PIXEL_WIDTH * 0.54;
    const width = Math.max(40, x - startX);
    const bridge = this.add.rectangle(startX + width / 2, y, width, 46 * WORLD_SCALE, color, 0.13)
      .setStrokeStyle(2, color, 0.36);
    const railTop = this.add.line(0, 0, startX, y - 31 * WORLD_SCALE, x, y - 42 * WORLD_SCALE, color, 0.42).setOrigin(0).setLineWidth(3);
    const railBottom = this.add.line(0, 0, startX, y + 31 * WORLD_SCALE, x, y + 42 * WORLD_SCALE, color, 0.42).setOrigin(0).setLineWidth(3);
    this.portalLayer.add([bridge, railTop, railBottom]);
  }

  createCorridorObjects() {
    this.clearCorridors();
    if (!this.roomCleared || !this.getCurrentRoomNode()?.cleared || !this.routeChoices.length) return;
    const liveChoices = this.routeChoices
      .map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => Boolean(choice?.roomTravel));
    if (!liveChoices.length) return;
    liveChoices.forEach(({ choice, index }) => {
      const direction = choice.direction || 'right';
      const [x, y] = this.getCorridorMouthPosition(direction);
      const color = Phaser.Display.Color.HexStringToColor(this.biome.palette.accent).color;
      const corridor = this.add.container(x, y);
      const horizontal = direction === 'left' || direction === 'right';
      const mouth = this.add.rectangle(0, 0, horizontal ? 78 * WORLD_SCALE : 122 * WORLD_SCALE, horizontal ? 122 * WORLD_SCALE : 78 * WORLD_SCALE, color, 0.16)
        .setStrokeStyle(3 * WORLD_SCALE, color, 0.78);
      const lane = this.add.rectangle(0, 0, horizontal ? 98 * WORLD_SCALE : 46 * WORLD_SCALE, horizontal ? 46 * WORLD_SCALE : 98 * WORLD_SCALE, 0xe9fff5, 0.12)
        .setStrokeStyle(2 * WORLD_SCALE, 0xe9fff5, 0.35);
      const arrow = this.add.triangle(
        0,
        0,
        0,
        -18 * WORLD_SCALE,
        28 * WORLD_SCALE,
        0,
        0,
        18 * WORLD_SCALE,
        0xffc857,
        0.82,
      );
      arrow.setRotation({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[direction] ?? 0);
      const prompt = this.createCorridorPrompt(choice, color);
      corridor.add([mouth, lane, arrow, prompt]);
      corridor.setDataEnabled();
      corridor.setData('routeIndex', index);
      corridor.setData('choice', choice);
      corridor.setData('direction', direction);
      corridor.prompt = prompt;
      this.corridorLayer.add(corridor);
      this.corridors.push(corridor);
      this.tweens.add({
        targets: arrow,
        x: horizontal ? (direction === 'right' ? 10 : -10) * WORLD_SCALE : 0,
        y: horizontal ? 0 : (direction === 'down' ? 10 : -10) * WORLD_SCALE,
        alpha: 0.45,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });
    this.maybeShowTutorialStep(
      'portals',
      'Routes & Rooms',
      'After clearing a room, corridor mouths open to connected rooms. Fly into one and the camera follows your ship through the landscape.\n\nThe final exit room has a portal to the next level.',
    );
  }

  createCorridorPrompt(choice, color) {
    const prompt = this.add.container(-102 * WORLD_SCALE, -112 * WORLD_SCALE);
    const backing = this.add.rectangle(0, 0, 244 * WORLD_SCALE, 86 * WORLD_SCALE, 0x071622, 0.88)
      .setStrokeStyle(2 * WORLD_SCALE, color, 0.86);
    const title = this.add.text(-100 * WORLD_SCALE, -32 * WORLD_SCALE, choice.label || 'Connected Room', {
      fontFamily: 'Georgia, serif',
      fontSize: `${13 * WORLD_SCALE}px`,
      color: '#e9fff5',
      fontStyle: 'bold',
      wordWrap: { width: 196 * WORLD_SCALE },
    });
    const action = this.add.text(-100 * WORLD_SCALE, 20 * WORLD_SCALE, 'Fly through corridor', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: `${10 * WORLD_SCALE}px`,
      color: '#ffd66f',
      fontStyle: 'bold',
    });
    prompt.add([backing, title, action]);
    prompt.setAlpha(0);
    prompt.setVisible(false);
    return prompt;
  }

  getCorridorMouthPosition(direction = 'right') {
    const cx = WORLD_OFFSET_X + MAP_PIXEL_WIDTH / 2;
    const cy = WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT / 2;
    if (direction === 'left') return [WORLD_OFFSET_X + TILE_SIZE * 0.72, cy];
    if (direction === 'up') return [cx, WORLD_OFFSET_Y + TILE_SIZE * 0.72];
    if (direction === 'down') return [cx, WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT - TILE_SIZE * 0.72];
    return [WORLD_OFFSET_X + MAP_PIXEL_WIDTH - TILE_SIZE * 0.72, cy];
  }

  checkPortalOverlap() {
    if (!this.roomCleared || this.routeTransitioning || !this.portals.length) return;
    let nearest = null;
    let nearestDistance = PORTAL_PROMPT_RADIUS;
    this.portals.forEach((portal) => {
      if (portal.getData('triggered')) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
      const visible = distance <= PORTAL_PROMPT_RADIUS;
      this.setPortalPromptVisible(portal, visible);
      if (distance < nearestDistance) {
        nearest = portal;
        nearestDistance = distance;
      }
    });
    this.nearbyPortal = nearest;
  }

  checkCorridorOverlap() {
    if (!this.roomCleared || this.routeTransitioning || this.corridorTraversal || !this.corridors.length) return;
    let nearest = null;
    let nearestDistance = PORTAL_PROMPT_RADIUS;
    this.corridors.forEach((corridor) => {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, corridor.x, corridor.y);
      const visible = distance <= PORTAL_PROMPT_RADIUS;
      this.setCorridorPromptVisible(corridor, visible);
      if (distance < nearestDistance) {
        nearest = corridor;
        nearestDistance = distance;
      }
      if (distance <= CORRIDOR_TRIGGER_RADIUS) this.beginCorridorTraversal(corridor);
    });
    this.nearbyCorridor = nearest;
  }

  setCorridorPromptVisible(corridor, visible) {
    if (!corridor.prompt || corridor.prompt.getData?.('visiblePrompt') === visible) return;
    corridor.prompt.setDataEnabled();
    corridor.prompt.setData('visiblePrompt', visible);
    corridor.prompt.setVisible(true);
    this.tweens.killTweensOf(corridor.prompt);
    this.tweens.add({
      targets: corridor.prompt,
      alpha: visible ? 1 : 0,
      y: visible ? -120 * WORLD_SCALE : -112 * WORLD_SCALE,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!visible) corridor.prompt.setVisible(false);
      },
    });
  }

  beginCorridorTraversal(corridor) {
    if (!corridor || this.corridorTraversal || this.routeTransitioning) return;
    const choice = corridor.getData('choice');
    if (!choice?.roomTravel) return;
    const direction = corridor.getData('direction') || choice.direction || 'right';
    const start = this.getCorridorStartPosition(direction);
    const end = this.getCorridorEndPosition(direction);
    this.routeTransitioning = true;
    this.corridorTraversal = { choice, direction, end };
    this.clearProjectiles();
    this.clearLootDrops();
    this.clearPortals();
    this.expandWorldBoundsForCorridor(direction);
    this.drawActiveCorridor(direction);
    this.player.setPosition(start.x, start.y);
    this.player.setVelocity(
      direction === 'right' ? 150 * WORLD_SCALE : direction === 'left' ? -150 * WORLD_SCALE : 0,
      direction === 'down' ? 150 * WORLD_SCALE : direction === 'up' ? -150 * WORLD_SCALE : 0,
    );
    this.player.setAcceleration(0);
    this.player.rotation = { right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2, up: 0 }[direction] ?? Math.PI / 2;
  }

  getCorridorStartPosition(direction = 'right') {
    const [x, y] = this.getCorridorMouthPosition(direction);
    if (direction === 'left') return { x: x - 22 * WORLD_SCALE, y };
    if (direction === 'right') return { x: x + 22 * WORLD_SCALE, y };
    if (direction === 'up') return { x, y: y - 22 * WORLD_SCALE };
    return { x, y: y + 22 * WORLD_SCALE };
  }

  getCorridorEndPosition(direction = 'right') {
    const start = this.getCorridorStartPosition(direction);
    if (direction === 'left') return { x: start.x - CORRIDOR_LENGTH, y: start.y };
    if (direction === 'right') return { x: start.x + CORRIDOR_LENGTH, y: start.y };
    if (direction === 'up') return { x: start.x, y: start.y - CORRIDOR_LENGTH };
    return { x: start.x, y: start.y + CORRIDOR_LENGTH };
  }

  resetWorldBounds() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  expandWorldBoundsForCorridor(direction = 'right') {
    const extra = CORRIDOR_LENGTH + TILE_SIZE * 2;
    const x = direction === 'left' ? -extra : 0;
    const y = direction === 'up' ? -extra : 0;
    const width = WORLD_WIDTH + (direction === 'left' || direction === 'right' ? extra : 0);
    const height = WORLD_HEIGHT + (direction === 'up' || direction === 'down' ? extra : 0);
    this.cameras.main.setBounds(x, y, width, height);
    this.physics.world.setBounds(x, y, width, height);
  }

  drawActiveCorridor(direction = 'right') {
    const start = this.getCorridorStartPosition(direction);
    const end = this.getCorridorEndPosition(direction);
    const color = Phaser.Display.Color.HexStringToColor(this.biome.palette.accent).color;
    const cloud = Phaser.Display.Color.HexStringToColor(this.biome.palette.cloud).color;
    const horizontal = direction === 'left' || direction === 'right';
    const x = (start.x + end.x) / 2;
    const y = (start.y + end.y) / 2;
    const width = horizontal ? Math.abs(end.x - start.x) + 160 * WORLD_SCALE : 116 * WORLD_SCALE;
    const height = horizontal ? 116 * WORLD_SCALE : Math.abs(end.y - start.y) + 160 * WORLD_SCALE;
    const path = this.add.rectangle(x, y, width, height, color, 0.13).setStrokeStyle(3 * WORLD_SCALE, color, 0.48);
    const lane = this.add.rectangle(x, y, horizontal ? width : 48 * WORLD_SCALE, horizontal ? 48 * WORLD_SCALE : height, 0xe9fff5, 0.1)
      .setStrokeStyle(2 * WORLD_SCALE, 0xe9fff5, 0.28);
    this.corridorLayer.add([path, lane]);
    for (let index = 0; index < 9; index += 1) {
      const t = (index + 0.5) / 9;
      const px = Phaser.Math.Linear(start.x, end.x, t) + (horizontal ? 0 : Phaser.Math.Between(-42, 42) * WORLD_SCALE);
      const py = Phaser.Math.Linear(start.y, end.y, t) + (horizontal ? Phaser.Math.Between(-42, 42) * WORLD_SCALE : 0);
      const marker = this.add.ellipse(px, py, Phaser.Math.Between(34, 88), Phaser.Math.Between(10, 24), cloud, 0.18);
      marker.setDepth(9);
      this.corridorLayer.add(marker);
    }
  }

  updateCorridorTraversal(time) {
    const traversal = this.corridorTraversal;
    if (!traversal || !this.player) return;
    const boosting = this.keys.boost.isDown && this.player.energy > 0;
    const thrust = boosting ? BOOST_THRUST * this.effectState.boostMultiplier : BASE_THRUST;
    const angular = 3.8 * this.effectState.turnMultiplier;
    this.player.setDrag(this.effectState.drag);
    if (this.keys.left.isDown) this.player.rotation -= angular * this.game.loop.delta / 1000;
    if (this.keys.right.isDown) this.player.rotation += angular * this.game.loop.delta / 1000;
    if (this.keys.up.isDown) this.physics.velocityFromRotation(this.player.rotation - Math.PI / 2, thrust, this.player.body.acceleration);
    else if (this.keys.down.isDown) this.physics.velocityFromRotation(this.player.rotation + Math.PI / 2, thrust * 0.5, this.player.body.acceleration);
    else this.player.setAcceleration(0);
    if (boosting && this.player.body.speed > 20) this.player.energy = Math.max(0, this.player.energy - 0.22);
    else this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 0.12 + this.getPassiveEnergyRegen());
    if (boosting) this.applyBoostRelics(time);
    this.updateLegendaryRelicVisuals(time, boosting);
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, traversal.end.x, traversal.end.y) <= CORRIDOR_EXIT_RADIUS) {
      this.completeCorridorTraversal();
    }
  }

  completeCorridorTraversal() {
    const traversal = this.corridorTraversal;
    if (!traversal) return;
    const { choice, direction } = traversal;
    this.corridorTraversal = null;
    this.drawShockwave(this.player.x, this.player.y, 90, this.biome.palette.accent ? Phaser.Display.Color.HexStringToColor(this.biome.palette.accent).color : 0x62d7d9);
    this.loadBiome(choice.biomeIndex, {
      islandTier: choice.islandTier,
      roomInChain: choice.roomInChain,
      currentRoomId: choice.roomNodeId || 'start',
      roomGraph: this.roomGraph,
      keepRoomGraph: true,
      countRoom: true,
    });
    const spawn = this.getPlayerSpawnForDirection(direction);
    this.player.setPosition(spawn.x, spawn.y);
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0);
    this.player.rotation = { right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2, up: 0 }[direction] ?? Math.PI / 2;
  }

  setPortalPromptVisible(portal, visible) {
    if (!portal.prompt || portal.prompt.getData?.('visiblePrompt') === visible) return;
    portal.prompt.setDataEnabled();
    portal.prompt.setData('visiblePrompt', visible);
    portal.prompt.setVisible(true);
    this.tweens.killTweensOf(portal.prompt);
    this.tweens.add({
      targets: portal.prompt,
      alpha: visible ? 1 : 0,
      y: visible ? -134 * WORLD_SCALE : -126 * WORLD_SCALE,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!visible) portal.prompt.setVisible(false);
      },
    });
  }

  enterNearbyPortal() {
    const portal = this.nearbyPortal;
    if (!portal || this.routeTransitioning || !this.roomCleared) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y) > PORTAL_PROMPT_RADIUS) return;
    portal.setData('triggered', true);
    this.chooseRoute(portal.getData('routeIndex'));
  }

  checkHiddenPuzzleOverlap() {
    if (!this.hiddenPuzzle || this.hiddenPuzzle.complete || !this.player) return;
    if (
      this.hiddenPuzzle.type === 'return'
      && this.hiddenPuzzle.returnReady
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hiddenPuzzle.shrineX, this.hiddenPuzzle.shrineY) <= 72 * WORLD_SCALE
    ) {
      this.completeHiddenPuzzle();
      return;
    }
    const rune = this.puzzleObjects.find((object) => {
      const step = object.getData?.('step');
      if (!Number.isInteger(step)) return false;
      if (this.hiddenPuzzle.type === 'ordered' && step !== this.hiddenPuzzle.step) return false;
      if (this.hiddenPuzzle.solved.includes(step)) return false;
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, object.x, object.y) <= 30 * WORLD_SCALE;
    });
    if (!rune) return;
    const rule = this.getPuzzleActivationResult(rune);
    if (!rule.ok) {
      this.showPuzzleRuleFeedback(rune, rule.message);
      return;
    }
    rune.ring?.setStrokeStyle(3 * WORLD_SCALE, 0xe9fff5, 0.9);
    rune.ring?.setFillStyle(0xe9fff5, 0.18);
    this.drawShockwave(rune.x, rune.y, 54, Phaser.Display.Color.HexStringToColor(ITEM_BY_ID[this.hiddenPuzzle.relicId].palette[1]).color);
    const runeStep = rune.getData('step');
    this.hiddenPuzzle.solved.push(runeStep);
    this.hiddenPuzzle.lastActivationAt = this.time.now;
    this.hiddenPuzzle.step = this.hiddenPuzzle.type === 'ordered'
      ? this.hiddenPuzzle.step + 1
      : this.hiddenPuzzle.solved.length;
    this.lastRelicTrigger = 'Strange Signal';
    const nextRune = this.puzzleObjects.find((object) => object.getData?.('step') === this.hiddenPuzzle.step && !this.hiddenPuzzle.solved.includes(this.hiddenPuzzle.step));
    if (this.hiddenPuzzle.type === 'ordered' && nextRune?.ring) {
      nextRune.ring.setFillStyle(Phaser.Display.Color.HexStringToColor(ITEM_BY_ID[this.hiddenPuzzle.relicId].palette[1]).color, 0.24);
      nextRune.ring.setStrokeStyle(2 * WORLD_SCALE, Phaser.Display.Color.HexStringToColor(ITEM_BY_ID[this.hiddenPuzzle.relicId].palette[1]).color, 0.9);
    }
    if (this.hiddenPuzzle.solved.length < this.hiddenPuzzle.positions.length) {
      return;
    }
    if (this.hiddenPuzzle.type === 'return' && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.hiddenPuzzle.shrineX, this.hiddenPuzzle.shrineY) > 72 * WORLD_SCALE) {
      this.hiddenPuzzle.returnReady = true;
      return;
    }
    this.completeHiddenPuzzle();
  }

  getPuzzleActivationResult(rune) {
    const rule = this.hiddenPuzzle?.activationRule;
    if (!rule) return { ok: true };
    const speed = this.player.body?.speed ?? 0;
    const boosting = this.keys.boost.isDown && this.player.energy > 0;
    const firing = this.keys.fire.isDown;
    const elapsed = this.hiddenPuzzle.lastActivationAt > 0
      ? this.time.now - this.hiddenPuzzle.lastActivationAt
      : 0;
    const step = rune.getData('step') ?? 0;
    if (rule === 'momentum') {
      return speed >= 110 ? { ok: true } : { ok: false, message: 'Build wind momentum before touching the compass mark.' };
    }
    if (rule === 'boost') {
      return boosting ? { ok: true } : { ok: false, message: 'Boost through the rod to conduct lightning.' };
    }
    if (rule === 'forge') {
      return firing ? { ok: true } : { ok: false, message: 'Fire into the forge vent to temper the ember.' };
    }
    if (rule === 'align') {
      const facing = this.player.rotation - Math.PI / 2;
      const target = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.hiddenPuzzle.shrineX, this.hiddenPuzzle.shrineY);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(facing - target));
      return diff <= 0.55 ? { ok: true } : { ok: false, message: 'Face the shrine to align the mirror beam.' };
    }
    if (rule === 'still') {
      return speed <= 35 ? { ok: true } : { ok: false, message: 'Slow almost to a stop to freeze the seal.' };
    }
    if (rule === 'pollinate') {
      return speed >= 90 ? { ok: true } : { ok: false, message: 'Sweep through the bloom with enough speed to carry pollen.' };
    }
    if (rule === 'rhythm') {
      const inRhythm = this.hiddenPuzzle.solved.length === 0 || elapsed <= 1900;
      if (!inRhythm) this.resetHiddenPuzzleProgress();
      return firing && inRhythm
        ? { ok: true }
        : { ok: false, message: inRhythm ? 'Shoot the switch to strike the foundry beat.' : 'The foundry rhythm broke; start the switch pattern again.' };
    }
    if (rule === 'raid') {
      const inRoute = this.hiddenPuzzle.solved.length === 0 || elapsed <= 2200;
      if (!inRoute) this.resetHiddenPuzzleProgress();
      return boosting && speed >= 100 && inRoute
        ? { ok: true }
        : { ok: false, message: inRoute ? 'Boost through the ambush mark.' : 'The pirate trail went cold; restart the route.' };
    }
    if (rule === 'harmony') {
      const needs = [
        boosting,
        firing,
        speed <= 35 && !boosting && !firing,
      ];
      const names = ['Boost', 'Fire', 'Stillness'];
      return needs[step] ? { ok: true } : { ok: false, message: `Tune this temple tone with ${names[step]}.` };
    }
    if (rule === 'silence') {
      return !boosting && !firing && speed >= 25 && speed <= 150
        ? { ok: true }
        : { ok: false, message: 'Drift silently: no boost, no fire, controlled speed.' };
    }
    return { ok: true };
  }

  resetHiddenPuzzleProgress() {
    if (!this.hiddenPuzzle) return;
    this.hiddenPuzzle.solved = [];
    this.hiddenPuzzle.step = 0;
    this.hiddenPuzzle.returnReady = false;
    this.hiddenPuzzle.lastActivationAt = 0;
    const relic = ITEM_BY_ID[this.hiddenPuzzle.relicId];
    const color = Phaser.Display.Color.HexStringToColor(relic.palette[1]).color;
    this.puzzleObjects.forEach((object) => {
      const step = object.getData?.('step');
      if (!Number.isInteger(step) || !object.ring) return;
      const active = this.hiddenPuzzle.type !== 'ordered' || step === 0;
      object.ring.setFillStyle(color, active ? 0.2 : 0.06);
      object.ring.setStrokeStyle(2 * WORLD_SCALE, color, active ? 0.82 : 0.35);
    });
  }

  showPuzzleRuleFeedback(rune, message) {
    if (this.hiddenPuzzle && this.time.now - this.hiddenPuzzle.lastRuleMessageAt > 900) {
      this.lastLootDrop = message;
      this.hiddenPuzzle.lastRuleMessageAt = this.time.now;
    }
    rune.ring?.setStrokeStyle(3 * WORLD_SCALE, 0xff6f59, 0.85);
    this.time.delayedCall(180, () => {
      if (!rune.scene || this.hiddenPuzzle?.solved.includes(rune.getData('step'))) return;
      const relic = ITEM_BY_ID[this.hiddenPuzzle.relicId];
      const color = Phaser.Display.Color.HexStringToColor(relic.palette[1]).color;
      rune.ring?.setStrokeStyle(2 * WORLD_SCALE, color, 0.55);
    });
  }

  completeHiddenPuzzle() {
    if (!this.hiddenPuzzle || this.hiddenPuzzle.complete) return;
    const relic = ITEM_BY_ID[this.hiddenPuzzle.relicId];
    this.hiddenPuzzle.complete = true;
    this.applyLootItem(relic);
    this.lastLootDrop = relic.rarity === 'mythic'
      ? `${relic.name} unlocked from the tier-5 mythic puzzle`
      : `${relic.name} unlocked from hidden puzzle`;
    this.lastRelicTrigger = relic.rarity === 'mythic' ? 'Mythic Shrine Solved' : 'Hidden Shrine Solved';
    this.drawShockwave(this.player.x, this.player.y, 120, Phaser.Display.Color.HexStringToColor(relic.palette[1]).color);
    this.autosaveRun();
  }

  clearProjectiles() {
    this.projectiles.forEach((shot) => shot.destroy());
    this.enemyProjectiles.forEach((shot) => shot.destroy());
    this.projectiles = [];
    this.enemyProjectiles = [];
  }

  clearLootDrops() {
    this.lootDrops.forEach((drop) => {
      drop.parts?.forEach((part) => part.destroy());
      if (drop.scene) drop.destroy();
    });
    this.lootDrops = [];
  }

  generateRoomLayout() {
    const node = this.getCurrentRoomNode();
    const seed = hashRoomSeed(`${this.biome.id}:${this.islandTier}:${this.roomInChain}:${this.currentRoomId}:${node?.layoutSeed ?? 0}`);
    const random = seededRandom(seed);
    const terrain = ['starter-sky', 'storm-fields'].includes(this.biome.id) ? 'C'
      : this.biome.id === 'ash-isles' ? 'V'
        : this.biome.id === 'crystal-reefs' ? 'K'
          : this.biome.id === 'frozen-heights' ? 'X'
            : this.biome.id === 'jungle-islands' ? 'F'
              : this.biome.id === 'industrial-ruins' ? 'M'
                : this.biome.id === 'pirate-dens' ? 'R'
                  : this.biome.id === 'floating-temples' ? 'T'
                    : 'B';
    const accent = this.biome.id === 'storm-fields' ? 'L'
      : this.biome.id === 'crystal-reefs' ? 'P'
        : this.biome.id === 'black-cloud-region' ? 'A'
          : 'S';
    const layout = Array.from({ length: MAP_ROWS }, () => Array.from({ length: MAP_COLS }, () => '.'));
    const carve = (cx, cy, radiusX, radiusY, tile) => {
      for (let row = 1; row < MAP_ROWS - 1; row += 1) {
        for (let col = 1; col < MAP_COLS - 1; col += 1) {
          const dx = (col - cx) / radiusX;
          const dy = (row - cy) / radiusY;
          if (dx * dx + dy * dy <= 1 + random() * 0.18) layout[row][col] = tile;
        }
      }
    };
    const islandCount = 3 + Math.floor(random() * 3) + Math.min(2, this.roomInChain - 1) + (this.currentRoomId === this.roomGraph?.exitId ? 1 : 0);
    for (let index = 0; index < islandCount; index += 1) {
      carve(
        3 + random() * 12,
        2.2 + random() * 7.5,
        1.2 + random() * 2.4,
        0.8 + random() * 1.7,
        random() > 0.78 ? accent : terrain,
      );
    }
    const corridorY = 4 + Math.floor(random() * 4);
    for (let col = 1; col < MAP_COLS - 1; col += 1) {
      layout[corridorY][col] = random() > 0.15 ? 'S' : terrain;
      if (random() > 0.62 && corridorY + 1 < MAP_ROWS - 1) layout[corridorY + 1][col] = 'S';
      if (random() > 0.7 && corridorY - 1 > 0) layout[corridorY - 1][col] = 'S';
    }
    layout[Math.floor(MAP_ROWS / 2)][1] = 'S';
    layout[Math.floor(MAP_ROWS / 2)][2] = 'S';
    layout[Math.floor(MAP_ROWS / 2)][MAP_COLS - 2] = 'S';
    layout[Math.floor(MAP_ROWS / 2)][MAP_COLS - 3] = 'S';
    return layout.map((row) => row.join(''));
  }

  drawMap() {
    this.mapLayer.removeAll(true);
    const { palette } = this.biome;
    const layout = this.activeLayout || this.biome.layout;
    this.cameras.main.setBackgroundColor(palette.sky);

    const bg = this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, Phaser.Display.Color.HexStringToColor(palette.sky).color, 1);
    bg.setOrigin(0, 0);
    this.mapLayer.add(bg);
    this.drawSkyMotion(palette);

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        const tile = layout[row][col];
        const style = TILE_STYLE[tile] || TILE_STYLE['.'];
        if (tile === '.') continue;
        const x = WORLD_OFFSET_X + col * TILE_SIZE + TILE_SIZE / 2;
        const y = WORLD_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2;
        const rect = this.add.rectangle(x, y, TILE_SIZE - 5, TILE_SIZE - 5, style.fill, style.alpha);
        rect.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(palette.frame).color, 0.35);
        this.mapLayer.add(rect);
      }
    }

    this.drawEnvironmentDetails(palette, layout);
    this.drawClouds(palette);
  }

  drawSkyMotion(palette) {
    const cloudColor = Phaser.Display.Color.HexStringToColor(palette.cloud).color;
    for (let index = 0; index < 7; index += 1) {
      const y = WORLD_OFFSET_Y + TILE_SIZE * (1 + index * 1.55);
      const lane = this.add.rectangle(WORLD_WIDTH / 2, y, WORLD_WIDTH * 1.1, 4 + index % 3, cloudColor, 0.06 + index * 0.008);
      lane.setDepth(-2);
      this.mapLayer.add(lane);
      this.tweens.add({
        targets: lane,
        x: lane.x + (index % 2 === 0 ? 34 : -34) * WORLD_SCALE,
        alpha: lane.alpha + 0.04,
        duration: 1800 + index * 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  drawEnvironmentDetails(palette, layout) {
    const accent = Phaser.Display.Color.HexStringToColor(palette.accent).color;
    const frame = Phaser.Display.Color.HexStringToColor(palette.frame).color;
    const node = this.getCurrentRoomNode();
    const seed = hashRoomSeed(`env:${this.biome.id}:${this.islandTier}:${this.roomInChain}:${this.currentRoomId}:${node?.layoutSeed ?? 0}`);
    const random = seededRandom(seed);
    const tileCenters = [];
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        if (layout[row][col] === '.') continue;
        tileCenters.push([
          WORLD_OFFSET_X + col * TILE_SIZE + TILE_SIZE / 2,
          WORLD_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2,
          layout[row][col],
        ]);
      }
    }
    tileCenters.sort(() => random() - 0.5).slice(0, 18).forEach(([x, y, tile], index) => {
      const isHazard = ['V', 'L', 'A', 'B', 'P'].includes(tile);
      const marker = isHazard
        ? this.add.circle(x + (random() - 0.5) * TILE_SIZE * 0.45, y + (random() - 0.5) * TILE_SIZE * 0.45, (6 + random() * 10) * WORLD_SCALE, accent, 0.22)
        : this.add.ellipse(x + (random() - 0.5) * TILE_SIZE * 0.42, y + (random() - 0.5) * TILE_SIZE * 0.42, (22 + random() * 34) * WORLD_SCALE, (7 + random() * 14) * WORLD_SCALE, frame, 0.2);
      marker.setDepth(2);
      this.mapLayer.add(marker);
      this.tweens.add({
        targets: marker,
        alpha: isHazard ? 0.48 : 0.32,
        scale: isHazard ? 1.35 : 1.12,
        duration: 760 + index * 85,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });
  }

  drawClouds(palette) {
    for (let i = 0; i < 26; i += 1) {
      const x = Phaser.Math.Between(20, WORLD_WIDTH - 20);
      const y = Phaser.Math.Between(18, WORLD_HEIGHT - 18);
      const cloud = this.add.ellipse(x, y, Phaser.Math.Between(42, 98), Phaser.Math.Between(10, 28), Phaser.Display.Color.HexStringToColor(palette.cloud).color, 0.18);
      cloud.setDepth(-1);
      this.mapLayer.add(cloud);
    }
  }

  spawnEncounterMarkers() {
    this.objectLayer.removeAll(true);
    this.enemies = [];
    const markers = this.getRoomEncounters();
    const positions = [
      [2.1, 2.5], [6.2, 2.1], [10.4, 2.7], [14.6, 2.2],
      [3.2, 8.6], [8.5, 8.9], [13.7, 8.4],
      [4.7, 5.2], [12.1, 5.7], [15.5, 8.8], [6.9, 7.1],
    ];
    markers.forEach((encounter, index) => {
      const isElite = encounter.elite || encounter.name.toLowerCase().includes('elite');
      const [gridX, gridY] = encounter.boss ? [8.4, 5.4] : positions[index % positions.length];
      const x = WORLD_OFFSET_X + TILE_SIZE * gridX;
      const y = WORLD_OFFSET_Y + TILE_SIZE * gridY;
      const enemy = this.createEnemySprite(x, y, encounter, isElite, index);
      const label = this.add.text(x + 28 * WORLD_SCALE, y - 18 * WORLD_SCALE, encounter.name, {
        fontFamily: 'Georgia, serif',
        fontSize: `${13 * WORLD_SCALE}px`,
        color: '#f0e1bd',
      });
      enemy.label = label;
      this.objectLayer.add([enemy, label]);
      this.enemies.push(enemy);
    });
  }

  getRoomEncounters() {
    const baseVariants = ENCOUNTER_VARIANTS[this.biome.id] || this.biome.encounters.map((entry) => [entry.name, entry.color]);
    const variants = this.getTierEncounterVariants(baseVariants);
    const node = this.getCurrentRoomNode();
    const offset = (this.islandTier * 5 + this.roomInChain * 2 + this.biomeIndex + (node?.encounterSeed ?? 0)) % variants.length;
    const isExitRoom = this.currentRoomId === this.roomGraph?.exitId;
    if (this.roomInChain >= 5 && isExitRoom) {
      const meta = this.getBiomeMeta();
      const minionCount = Math.min(8, 2 + Math.floor(this.islandTier / 2) + Math.max(0, this.islandTier - 2));
      const minions = Array.from({ length: minionCount }, (_, index) => {
        const [name, color] = variants[(offset + index) % variants.length];
        return { name, color, elite: index >= minionCount - Math.min(2, Math.ceil(this.islandTier / 3)) };
      });
      return [
        ...minions,
        {
          name: meta.boss,
          color: this.biome.palette.accent,
          elite: true,
          boss: true,
          relicId: meta.bossRelic,
        },
      ];
    }
    const count = Math.min(11, 3 + this.roomInChain + Math.min(this.islandTier - 1, 5) + Math.floor(Math.max(0, this.islandTier - 2) / 2));
    return Array.from({ length: count }, (_, index) => {
      const [name, color] = variants[(offset + index) % variants.length];
      const eliteCount = this.islandTier >= 5 ? 3 : this.islandTier >= 3 ? 2 : 1;
      const elite = index >= count - eliteCount && (this.roomInChain >= 3 || this.islandTier >= 2);
      return {
        name: elite && !name.toLowerCase().includes('elite') ? `Elite ${name}` : name,
        color,
        elite,
      };
    });
  }

  getTierEncounterVariants(baseVariants) {
    const extras = HIGH_TIER_ENCOUNTERS[this.biome.id] || [];
    if (this.islandTier >= 5) return [...baseVariants, ...extras, ...extras.map(([name, color]) => [`Ancient ${name}`, color])];
    if (this.islandTier >= 3) return [...baseVariants, ...extras];
    return baseVariants;
  }

  getEnemyStatProfile(isBoss, isElite) {
    const tier = Math.max(1, this.islandTier);
    const room = Math.max(1, this.roomInChain);
    const depth = Math.max(0, this.roomDepth);
    const tierScale = 1 + (tier - 1) * 0.38 + Math.max(0, tier - 3) * 0.12;
    const roomScale = 1 + (room - 1) * 0.12;
    const depthScale = 1 + Math.min(0.45, depth * 0.018);
    const eliteScale = isElite ? 1.65 + tier * 0.08 : 1;
    const bossScale = isBoss ? 3.3 + tier * 0.28 : 1;
    const baseHp = isBoss ? 95 : 46;
    const hp = Math.round(baseHp * tierScale * roomScale * depthScale * eliteScale * bossScale);
    const damage = Math.round((ENEMY_SHOT_DAMAGE + (tier - 1) * 2 + Math.floor((room - 1) * 1.2)) * (isBoss ? 1.8 : isElite ? 1.35 : 1));
    return { hp, damage };
  }

  createEnemySprite(x, y, encounter, isElite, index) {
    const color = Phaser.Display.Color.HexStringToColor(encounter.color).color;
    const isBoss = Boolean(encounter.boss);
    const scale = WORLD_SCALE * (isBoss ? 1.38 : isElite ? 1.08 : 0.94);
    const lowerName = encounter.name.toLowerCase();
    const profile = this.getEnemyVisualProfile(lowerName, isBoss, isElite);
    const { animKey, frameKeys } = this.ensureEnemySpriteAssets(profile, encounter, color, isBoss, isElite);
    const enemy = this.add.sprite(x, y, frameKeys[0]).setScale(scale);
    enemy.play(animKey);
    this.physics.add.existing(enemy);
    enemy.body.setAllowGravity(false);
    enemy.body.setImmovable(true);
    enemy.body.setSize(ENEMY_SPRITE_SIZE, ENEMY_SPRITE_SIZE, true);
    enemy.body.setOffset(0, 0);
    enemy.hull = enemy;
    enemy.canopy = enemy;
    enemy.core = enemy;
    enemy.glow = enemy;
    enemy.baseColor = color;
    enemy.accentParts = [];
    enemy.animatedParts = [{ target: enemy, prop: 'texture', amount: 1 }];
    enemy.length = profile.partCount;
    enemy.setDataEnabled();
    enemy.setData('name', encounter.name);
    enemy.setData('encounter', encounter);
    enemy.setData('style', profile.motion);
    enemy.setData('visualStyle', profile.kind);
    enemy.setData('elite', isElite);
    enemy.setData('boss', isBoss);
    enemy.setData('relicId', encounter.relicId || null);
    const stats = this.getEnemyStatProfile(isBoss, isElite);
    enemy.setData('hp', stats.hp);
    enemy.setData('maxHp', stats.hp);
    enemy.setData('shotDamage', stats.damage);
    enemy.setData('alive', true);
    enemy.setData('baseX', x);
    enemy.setData('baseY', y);
    enemy.setData('baseScale', scale);
    enemy.setData('phase', index * 1.7 + Phaser.Math.FloatBetween(0, 0.8));
    enemy.setData('patrolX', (profile.motion === 'station' ? 12 : profile.motion === 'wing' ? 62 : profile.motion === 'ray' ? 48 : 32 + index * 8) * WORLD_SCALE);
    enemy.setData('patrolY', (profile.motion === 'station' ? 10 : profile.motion === 'drone' ? 42 : 20 + (index % 2) * 12) * WORLD_SCALE);
    enemy.setData('moveRate', (profile.motion === 'station' ? 0.24 : profile.motion === 'wing' ? 0.86 : profile.motion === 'ray' ? 0.52 : 0.45) + index * 0.06 + (isElite ? 0.08 : 0));
    return enemy;
  }

  ensureEnemySpriteAssets(profile, encounter, color, isBoss, isElite) {
    const biomeKey = this.biome?.id || 'biome';
    const cleanName = encounter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const colorKey = color.toString(16).padStart(6, '0');
    const baseKey = `enemy-${biomeKey}-${profile.kind}-${cleanName}-${colorKey}-${isBoss ? 'boss' : isElite ? 'elite' : 'normal'}`;
    const frameKeys = [`${baseKey}-a`, `${baseKey}-b`];
    frameKeys.forEach((key, frame) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ add: false });
      this.drawEnemySpriteFrame(g, profile, encounter.name, color, frame, isBoss, isElite);
      g.generateTexture(key, ENEMY_SPRITE_SIZE, ENEMY_SPRITE_SIZE);
      g.destroy();
    });
    const animKey = `${baseKey}-idle`;
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: frameKeys.map((key) => ({ key })),
        frameRate: profile.frameRate,
        repeat: -1,
      });
    }
    return { animKey, frameKeys };
  }

  drawEnemySpriteFrame(g, profile, name, color, frame, isBoss, isElite) {
    const biome = this.biome?.palette || {};
    const accent = color;
    const dark = Phaser.Display.Color.HexStringToColor(biome.dark || '#071622').color;
    const mid = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(dark),
      Phaser.Display.Color.ValueToColor(accent),
      100,
      28,
    );
    const hull = Phaser.Display.Color.GetColor(mid.r, mid.g, mid.b);
    const line = Phaser.Display.Color.HexStringToColor(biome.line || '#62d7d9').color;
    const light = Phaser.Display.Color.HexStringToColor(biome.light || '#e9fff5').color;
    const gold = 0xffc857;
    const ember = 0xff6f59;
    const c = ENEMY_SPRITE_SIZE / 2;
    const bob = frame === 0 ? 0 : 2;
    const flap = frame === 0 ? -3 : 3;
    const pulse = frame === 0 ? 0 : 2;
    const ancient = name.toLowerCase().includes('ancient');
    const eliteGlow = isBoss ? 0.42 : isElite ? 0.28 : ancient ? 0.22 : 0.14;

    g.fillStyle(0x071622, 0.32);
    g.fillEllipse(c, 76, profile.shadowW, profile.shadowH);
    g.fillStyle(accent, eliteGlow);
    g.fillEllipse(c, 45 + bob, profile.shadowW * 0.72, profile.shadowH * 2.6 + pulse);

    const stroke = (width = 3, strokeColor = accent, alpha = 1) => g.lineStyle(width, strokeColor, alpha);
    const rivets = (points) => {
      g.fillStyle(gold, 0.82);
      points.forEach(([x, y]) => g.fillCircle(x, y + bob, isBoss ? 2.6 : 2));
    };

    if (profile.kind === 'serpent') {
      stroke(5, accent, 0.78);
      g.beginPath();
      g.moveTo(12, 54 + bob);
      g.lineTo(24, 43 - flap);
      g.lineTo(42, 49 + bob);
      g.lineTo(55, 58 + flap);
      g.lineTo(70, 39 + bob);
      g.strokePath();
      stroke(3, line, 0.72);
      g.beginPath();
      g.moveTo(18, 51 + bob);
      g.lineTo(32, 42 - flap);
      g.lineTo(48, 50 + bob);
      g.strokePath();
      g.fillStyle(hull, 1);
      g.fillEllipse(60, 39 + bob, 29, 21);
      stroke(3, accent, 1);
      g.strokeEllipse(60, 39 + bob, 29, 21);
      g.fillStyle(accent, 0.9);
      g.fillTriangle(72, 38 + bob, 83, 31 + bob, 78, 48 + bob);
      g.fillStyle(light, 0.85);
      g.fillCircle(66, 36 + bob, 3);
      g.fillStyle(gold, 0.95);
      g.fillCircle(67, 36 + bob, 1.4);
      rivets([[31, 46], [43, 50], [55, 43]]);
    } else if (profile.kind === 'jellyfish') {
      stroke(3, accent, 0.9);
      for (let i = 0; i < 5; i += 1) {
        const x = 26 + i * 9;
        g.beginPath();
        g.moveTo(x, 50 + bob);
        g.lineTo(x - 5 + flap, 61);
        g.lineTo(x + (i % 2 ? 4 : -4), 72);
        g.strokePath();
      }
      g.fillStyle(accent, 0.72);
      g.fillEllipse(c, 34 + bob, 49, 34 + pulse);
      stroke(3, light, 0.48);
      g.strokeEllipse(c, 34 + bob, 49, 34 + pulse);
      g.fillStyle(hull, 0.9);
      g.fillEllipse(c, 41 + bob, 34, 14);
      g.fillStyle(gold, 0.92);
      g.fillCircle(c, 35 + bob, 5 + pulse);
      rivets([[30, 31], [58, 31], [39, 45], [49, 45]]);
    } else if (profile.kind === 'ray') {
      g.fillStyle(accent, 0.56);
      g.fillTriangle(11, 45 + bob, c, 24 + flap, 37, 58 + bob);
      g.fillTriangle(77, 45 + bob, c, 24 - flap, 51, 58 + bob);
      stroke(2, accent, 0.8);
      g.strokeTriangle(11, 45 + bob, c, 24 + flap, 37, 58 + bob);
      g.strokeTriangle(77, 45 + bob, c, 24 - flap, 51, 58 + bob);
      g.fillStyle(hull, 1);
      g.fillEllipse(c, 43 + bob, 44, 26);
      stroke(3, line, 0.7);
      g.strokeEllipse(c, 43 + bob, 44, 26);
      g.fillStyle(light, 0.58);
      g.fillEllipse(53, 39 + bob, 18, 8);
      g.fillStyle(gold, 0.95);
      g.fillCircle(58, 45 + bob, 4);
    } else if (profile.kind === 'bird') {
      g.fillStyle(accent, 0.72);
      g.fillTriangle(13, 38 + bob, 42, 27 + flap, 34, 60 + bob);
      g.fillTriangle(75, 38 + bob, 46, 27 - flap, 54, 60 + bob);
      stroke(2, line, 0.55);
      g.strokeTriangle(13, 38 + bob, 42, 27 + flap, 34, 60 + bob);
      g.strokeTriangle(75, 38 + bob, 46, 27 - flap, 54, 60 + bob);
      g.fillStyle(hull, 1);
      g.fillRoundedRect(29, 35 + bob, 35, 19, 8);
      stroke(3, accent, 0.95);
      g.strokeRoundedRect(29, 35 + bob, 35, 19, 8);
      g.fillStyle(light, 0.8);
      g.fillTriangle(62, 39 + bob, 80, 45 + bob, 62, 52 + bob);
      g.fillStyle(gold, 0.9);
      g.fillCircle(54, 43 + bob, 3);
      rivets([[34, 41], [43, 39], [45, 51]]);
    } else if (profile.kind === 'station') {
      stroke(3, accent, 0.62);
      g.strokeCircle(c, 44 + bob, 30 + pulse);
      g.fillStyle(hull, 1);
      if (profile.nameHint === 'vent') {
        g.fillRoundedRect(25, 25 + bob, 38, 45, 8);
        stroke(3, ember, 0.95);
        g.strokeRoundedRect(25, 25 + bob, 38, 45, 8);
        g.fillStyle(ember, 0.86);
        g.fillTriangle(44, 22 + bob - pulse, 31, 55 + bob, 57, 55 + bob);
      } else if (profile.nameHint === 'shrine') {
        g.fillTriangle(c, 14 + bob, 72, 60 + bob, 16, 60 + bob);
        stroke(3, accent, 0.95);
        g.strokeTriangle(c, 14 + bob, 72, 60 + bob, 16, 60 + bob);
        g.fillStyle(light, 0.76);
        g.fillCircle(c, 38 + bob, 11 + pulse);
      } else {
        g.fillRoundedRect(19, 24 + bob, 50, 40, 10);
        stroke(3, accent, 0.92);
        g.strokeRoundedRect(19, 24 + bob, 50, 40, 10);
        g.fillStyle(accent, 0.68);
        g.fillRect(24, 32 + bob, 40, 8 + pulse);
      }
      g.fillStyle(gold, 0.9);
      g.fillCircle(c, 51 + bob, 5);
      rivets([[25, 26], [63, 26], [25, 63], [63, 63]]);
    } else if (profile.kind === 'mechanical') {
      stroke(4, accent, 0.82);
      g.beginPath();
      g.moveTo(16, 44 + bob);
      g.lineTo(72, 44 + bob);
      g.moveTo(44, 16 + bob);
      g.lineTo(44, 72 + bob);
      g.strokePath();
      g.fillStyle(hull, 1);
      g.fillEllipse(c, 44 + bob, 39, 39);
      stroke(3, line, 0.78);
      g.strokeEllipse(c, 44 + bob, 39, 39);
      stroke(2, gold, 0.84);
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8 + frame * 0.28;
        g.beginPath();
        g.moveTo(c + Math.cos(a) * 8, 44 + bob + Math.sin(a) * 8);
        g.lineTo(c + Math.cos(a) * 22, 44 + bob + Math.sin(a) * 22);
        g.strokePath();
      }
      g.fillStyle(accent, 0.9);
      g.fillCircle(c, 44 + bob, 13 + pulse);
      g.fillStyle(gold, 1);
      g.fillCircle(c, 44 + bob, 5);
    } else if (profile.kind === 'walker') {
      stroke(4, accent, 0.82);
      for (let i = 0; i < 4; i += 1) {
        const y = 34 + i * 7 + bob;
        g.beginPath();
        g.moveTo(34, y);
        g.lineTo(18 - i, y + 8 + (i % 2 ? flap : -flap));
        g.lineTo(8 + i * 2, y + 16);
        g.moveTo(54, y);
        g.lineTo(70 + i, y + 8 - (i % 2 ? flap : -flap));
        g.lineTo(80 - i * 2, y + 16);
        g.strokePath();
      }
      g.fillStyle(hull, 1);
      g.fillEllipse(c, 42 + bob, 42, 32);
      stroke(3, accent, 0.96);
      g.strokeEllipse(c, 42 + bob, 42, 32);
      g.fillStyle(light, 0.88);
      g.fillCircle(36 + frame, 36 + bob, 3);
      g.fillCircle(51 - frame, 36 + bob, 3);
      g.fillStyle(gold, 0.94);
      g.fillRoundedRect(35, 51 + bob, 18, 4, 2);
    } else {
      const heavy = profile.kind === 'heavyship';
      g.fillStyle(light, heavy ? 0.68 : 0.56);
      g.fillTriangle(43, 10 + bob, 43, 56 + bob, heavy ? 76 : 66, 42 + flap);
      stroke(2, accent, 0.5);
      g.strokeTriangle(43, 10 + bob, 43, 56 + bob, heavy ? 76 : 66, 42 + flap);
      stroke(3, line, 0.72);
      g.beginPath();
      g.moveTo(42, 14 + bob);
      g.lineTo(42, 65 + bob);
      g.strokePath();
      g.fillStyle(hull, 1);
      g.fillRoundedRect(18, heavy ? 35 + bob : 38 + bob, heavy ? 57 : 47, heavy ? 28 : 22, 9);
      stroke(3, accent, 0.95);
      g.strokeRoundedRect(18, heavy ? 35 + bob : 38 + bob, heavy ? 57 : 47, heavy ? 28 : 22, 9);
      g.fillStyle(accent, 0.8);
      g.fillRoundedRect(28, heavy ? 29 + bob : 33 + bob, heavy ? 35 : 28, 13, 5);
      g.fillStyle(gold, 0.92);
      g.fillCircle(30, heavy ? 49 + bob : 50 + bob, 4);
      g.fillStyle(ember, 0.72);
      g.fillCircle(19, heavy ? 55 + bob : 56 + bob, 4 + pulse);
      rivets(heavy ? [[23, 40], [66, 41], [26, 62], [67, 61]] : [[24, 43], [58, 44], [27, 58]]);
    }

    if (isElite || isBoss || ancient) {
      stroke(isBoss ? 3 : 2, gold, isBoss ? 0.92 : 0.68);
      g.strokeCircle(c, 44 + bob, isBoss ? 39 : 35);
    }
  }

  getEnemyVisualProfile(lowerName, isBoss, isElite) {
    const stationShape = [-31, -23, 27, -23, 39, -3, 25, 24, -32, 22, -43, -2];
    const mechanicalShape = [-24, -20, 24, -20, 32, 0, 24, 20, -24, 20, -32, 0];
    const withDefaults = (profile) => ({
      frameRate: profile.kind === 'station' ? 4 : profile.kind === 'mechanical' ? 6 : profile.kind === 'bird' ? 7 : 5,
      partCount: profile.kind === 'walker' ? 11 : profile.kind === 'mechanical' ? 10 : profile.kind === 'station' ? 8 : 9,
      ...profile,
    });
    if (lowerName.includes('serpent')) return withDefaults({ kind: 'serpent', motion: 'ray', shadowW: 66, shadowH: 12 });
    if (lowerName.includes('jellyfish')) return withDefaults({ kind: 'jellyfish', motion: 'drone', shadowW: 50, shadowH: 11 });
    if (lowerName.includes('ray') || lowerName.includes('manta')) return withDefaults({ kind: 'ray', motion: 'ray', shadowW: 70, shadowH: 12 });
    if (lowerName.includes('bird') || lowerName.includes('kite') || lowerName.includes('glider') || lowerName.includes('wing')) return withDefaults({ kind: 'bird', motion: 'wing', shadowW: 70, shadowH: 11 });
    if (lowerName.includes('strider') || lowerName.includes('broodmother')) return withDefaults({ kind: 'walker', motion: 'wing', shadowW: 70, shadowH: 13 });
    if (lowerName.includes('cache') || lowerName.includes('vault') || lowerName.includes('wreck') || lowerName.includes('dock') || lowerName.includes('gate') || lowerName.includes('shrine') || lowerName.includes('nest') || lowerName.includes('vent')) {
      const nameHint = lowerName.includes('vent') ? 'vent' : lowerName.includes('shrine') ? 'shrine' : 'station';
      return withDefaults({ kind: 'station', motion: 'station', shadowW: 76, shadowH: 14, stationShape, nameHint });
    }
    if (lowerName.includes('drone') || lowerName.includes('grid') || lowerName.includes('machine') || lowerName.includes('wisp') || lowerName.includes('cell') || lowerName.includes('core') || lowerName.includes('prism') || lowerName.includes('sentinel') || lowerName.includes('warden') || lowerName.includes('choir')) {
      return withDefaults({ kind: 'mechanical', motion: 'drone', shadowW: 60, shadowH: 11, mechanicalShape });
    }
    if (isBoss || isElite || lowerName.includes('fortress') || lowerName.includes('captain') || lowerName.includes('regent') || lowerName.includes('icebreaker') || lowerName.includes('cinderlord')) {
      return withDefaults({ kind: 'heavyship', motion: 'heavy', shadowW: 72, shadowH: 13 });
    }
    return withDefaults({ kind: 'skiff', motion: 'skiff', shadowW: 58, shadowH: 11 });
  }

  update(time) {
    if (this.gameOver) return;
    if (this.paused) return;
    if (this.tutorialActive) return;
    if (!this.player || this.player.hp <= 0) {
      if (this.player && this.player.hp <= 0) this.triggerGameOver();
      this.updateHud();
      return;
    }

    this.updateActivePowerups(time);
    if (this.corridorTraversal) {
      this.updateCorridorTraversal(time);
      this.updateHud();
      return;
    }
    this.updateEclipseCorruption(time);
    const boosting = this.keys.boost.isDown && this.player.energy > 0;
    const thrust = boosting ? BOOST_THRUST * this.effectState.boostMultiplier : BASE_THRUST;
    const angular = 3.8 * this.effectState.turnMultiplier;
    this.player.setDrag(this.effectState.drag);
    if (this.keys.left.isDown) this.player.rotation -= angular * this.game.loop.delta / 1000;
    if (this.keys.right.isDown) this.player.rotation += angular * this.game.loop.delta / 1000;
    if (this.keys.up.isDown) this.physics.velocityFromRotation(this.player.rotation - Math.PI / 2, thrust, this.player.body.acceleration);
    else if (this.keys.down.isDown) this.physics.velocityFromRotation(this.player.rotation + Math.PI / 2, thrust * 0.5, this.player.body.acceleration);
    else this.player.setAcceleration(0);

    if (boosting && this.player.body.speed > 20) this.player.energy = Math.max(0, this.player.energy - 0.22);
    else this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 0.12 + this.getPassiveEnergyRegen());

    if (this.keys.fire.isDown && (!this.lastShot || time - this.lastShot > this.effectState.fireDelay)) {
      this.fireCannon();
      this.lastShot = time;
    }

    if (boosting) this.applyBoostRelics(time);
    this.updateLegendaryRelicVisuals(time, boosting);

    this.updateEnemies(time);

    const enemyFireInterval = Math.max(650, ENEMY_FIRE_INTERVAL_MS - (this.islandTier - 1) * 130 - (this.roomInChain - 1) * 55);
    if (!this.lastEnemyShot || time - this.lastEnemyShot > enemyFireInterval) {
      this.fireEnemySalvo(time);
      this.lastEnemyShot = time;
    }

    this.updateProjectiles(time);
    this.updatePassiveRelics(time);
    this.checkLootOverlap();
    this.checkLegendaryQuestOverlap();
    this.checkHiddenPuzzleOverlap();
    this.checkCorridorOverlap();
    this.checkPortalOverlap();
    if (time - this.lastAutosaveTick > 5000) {
      this.autosaveRun();
      this.lastAutosaveTick = time;
    }
    if (this.activePowerups.length && time - this.lastPowerupPanelTick > 1000) {
      this.renderItemPanel();
      this.lastPowerupPanelTick = time;
    }
    this.updateHud();
  }

  updateActivePowerups(time) {
    const before = this.activePowerups.length;
    this.activePowerups = this.activePowerups.filter((entry) => entry.expiresAt > time);
    if (this.activePowerups.length !== before) {
      this.recalculateEffects();
      this.renderItemPanel();
    }
  }

  updateEclipseCorruption(time) {
    const eclipse = this.getRelicPower('eclipse-cortex');
    const previous = this.corruptionSaturation ?? 0;
    const inCombat = this.enemies.some((enemy) => enemy.getData('alive'));
    const target = eclipse > 0 && inCombat ? 1 : 0;
    const step = eclipse > 0 && inCombat ? 0.0012 + eclipse * 0.00022 : -0.0024;
    this.corruptionSaturation = Phaser.Math.Clamp(previous + step * this.game.loop.delta, 0, target);
    if (Math.abs(this.corruptionSaturation - previous) > 0.04 || (previous > 0 && this.corruptionSaturation === 0)) {
      this.recalculateEffects();
      if (this.corruptionSaturation > 0) this.lastRelicTrigger = 'Eclipse Cortex';
    }
  }

  updateLegendaryRelicVisuals(time, boosting) {
    if (time - this.lastLegendaryFxTick < 180) return;
    this.lastLegendaryFxTick = time;
    const leviathan = this.getRelicPower('leviathan-engine');
    const blackHorizon = this.getRelicPower('black-horizon-core');
    const voidSail = this.getRelicPower('void-sail');
    const heart = this.getRelicPower('heart-of-the-tempest');
    const eclipse = this.getRelicPower('eclipse-cortex');

    if (leviathan > 0) {
      this.drawTrailFlare(this.player.x - Math.cos(this.player.rotation) * 18, this.player.y - Math.sin(this.player.rotation) * 18, 0x9fb2bd);
      if (boosting) this.drawShockwave(this.player.x, this.player.y, 52 + leviathan * 8, 0x9fb2bd);
    }

    if (blackHorizon > 0 && boosting) {
      this.drawTrailFlare(this.player.x, this.player.y, 0x9d4d75);
      this.cameras.main.setZoom(1 + Math.sin(time * 0.01) * 0.012);
      this.time.delayedCall(120, () => this.cameras.main.setZoom(1));
    }

    if (voidSail > 0) {
      const orbit = this.add.circle(this.player.x, this.player.y, 24 + voidSail * 5, 0x7559d6, 0.035);
      orbit.setStrokeStyle(2, 0x7559d6, 0.5);
      orbit.setDepth(5);
      this.tweens.add({
        targets: orbit,
        radius: 42 + voidSail * 7,
        alpha: 0,
        duration: 520,
        onComplete: () => orbit.destroy(),
      });
    }

    if (heart > 0) {
      const angle = Math.random() * Math.PI * 2;
      const x = this.player.x + Math.cos(angle) * (40 + heart * 4);
      const y = this.player.y + Math.sin(angle) * (40 + heart * 4);
      this.drawBeam(this.player.x, this.player.y, x, y, 0xf4ec77);
    }

    if (eclipse > 0 && (this.corruptionSaturation ?? 0) > 0.05) {
      const saturation = this.corruptionSaturation;
      this.drawTrailFlare(this.player.x, this.player.y, saturation > 0.82 ? 0xff2f7d : 0x9d4d75);
      if (saturation > 0.72) {
        this.cameras.main.setZoom(1 + Math.sin(time * 0.016) * 0.018 * saturation);
        this.time.delayedCall(120, () => this.cameras.main.setZoom(1));
      }
      if (saturation > 0.95) this.drawShockwave(this.player.x, this.player.y, 76 + eclipse * 9, 0xff2f7d);
    }
  }

  updateEnemies(time) {
    const t = time * 0.001;
    this.enemies.forEach((enemy, index) => {
      if (!enemy.getData('alive')) return;
      if ((enemy.getData('stunnedUntil') ?? 0) > time) {
        if (enemy.label) {
          enemy.label.setPosition(enemy.x + 28 * WORLD_SCALE, enemy.y - 18 * WORLD_SCALE);
        }
        return;
      }
      const phase = enemy.getData('phase') ?? 0;
      const corruption = this.getRelicPower('eclipse-cortex') > 0 ? this.corruptionSaturation ?? 0 : 0;
      const rate = (enemy.getData('moveRate') ?? 0.5) * (1 + corruption * 0.42);
      const baseX = enemy.getData('baseX') ?? enemy.x;
      const baseY = enemy.getData('baseY') ?? enemy.y;
      const patrolX = enemy.getData('patrolX') ?? 0;
      const patrolY = enemy.getData('patrolY') ?? 0;
      const style = enemy.getData('style') ?? 'skiff';
      const chase = style === 'wing' || (style === 'heavy' && Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < 320);
      const driftX = style === 'drone'
        ? Math.sin(t * rate + phase) * patrolX + Math.sin(t * rate * 1.9 + phase) * patrolX * 0.34
        : style === 'ray'
          ? Math.sin(t * rate + phase) * patrolX
          : Math.sin(t * rate + phase) * patrolX;
      const driftY = style === 'ray'
        ? Math.sin(t * (rate * 0.62) + phase) * patrolY
        : Math.cos(t * (rate * 0.82) + phase) * patrolY;
      const targetX = chase ? Phaser.Math.Linear(baseX + driftX, this.player.x, style === 'wing' ? 0.13 : 0.08) : baseX + driftX;
      const targetY = chase ? Phaser.Math.Linear(baseY + driftY, this.player.y, style === 'wing' ? 0.13 : 0.08) : baseY + driftY;
      const nextX = Phaser.Math.Clamp(targetX, WORLD_OFFSET_X + 42 * WORLD_SCALE, WORLD_OFFSET_X + MAP_PIXEL_WIDTH - 42 * WORLD_SCALE);
      const nextY = Phaser.Math.Clamp(targetY, WORLD_OFFSET_Y + 42 * WORLD_SCALE, WORLD_OFFSET_Y + MAP_PIXEL_HEIGHT - 42 * WORLD_SCALE);
      enemy.setPosition(nextX, nextY);
      enemy.rotation = style === 'station' ? Math.sin(t * rate + phase) * 0.03 : Math.sin(t * rate + phase) * (style === 'wing' ? 0.18 : 0.08);
      if (corruption > 0.35) enemy.setTint(corruption > 0.75 ? 0xff7ab5 : 0xd7f7ff);
      enemy.depth = 14 + index;
      if (enemy.label) {
        enemy.label.setPosition(nextX + 28 * WORLD_SCALE, nextY - 18 * WORLD_SCALE);
      }
    });
  }

  getPassiveEnergyRegen() {
    const stormCore = this.getItemLevel('storm-core');
    const lightningRod = this.getRelicPower('lightning-rod-mast');
    const stormBiomeBonus = ['storm-fields', 'black-cloud-region'].includes(this.biome.id) ? stormCore * 0.07 : 0;
    return this.getItemLevel('arc-reactor') * 0.025 + stormBiomeBonus + lightningRod * 0.01;
  }

  applyBoostRelics(time) {
    const pulse = this.getRelicPower('pulse-dash-core');
    if (pulse > 0 && time - this.lastPulseDash > Math.max(420, 1100 - pulse * 90)) {
      this.damageEnemiesNear(this.player.x, this.player.y, 70 + pulse * 12, 5 + pulse * 3, 'Pulse Dash Core');
      this.drawShockwave(this.player.x, this.player.y, 70 + pulse * 12, 0x73f0ff);
      this.lastPulseDash = time;
    }

    const ember = this.getRelicPower('ember-engine');
    if (ember > 0) {
      this.damageEnemiesNear(this.player.x, this.player.y, 32 + ember * 6, ember, 'Ember Engine');
      this.drawTrailFlare(this.player.x, this.player.y, 0xff8e3c);
    }

    const ram = this.getRelicPower('cloudbreaker-ram');
    const leviathan = this.getRelicPower('leviathan-engine');
    if (ram + leviathan > 0) {
      this.enemies.forEach((enemy) => {
        if (!enemy.getData('alive')) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < 34 + leviathan * 4) {
          const damage = 8 + ram * 4 + leviathan * 5;
          this.damageEnemy(enemy, damage, 'Cloudbreaker Ram');
          if (leviathan >= 5 && enemy.getData('hp') <= 25) this.damageEnemy(enemy, 999, 'Leviathan Engine');
        }
      });
    }

    const quantum = this.getRelicPower('quantum-rudder');
    if (quantum > 0 && time - this.lastQuantumJump > Math.max(1400, 3200 - quantum * 260)) {
      this.teleportShip(28 + quantum * 10, 'Quantum Rudder');
      this.lastQuantumJump = time;
    }

    const voidSail = this.getRelicPower('void-sail');
    if (voidSail > 0 && time - this.lastVoidJump > Math.max(1800, 4200 - voidSail * 320)) {
      this.teleportShip(22 + voidSail * 12, 'Void Sail');
      this.drawShockwave(this.player.x, this.player.y, 54 + voidSail * 14, 0x7559d6);
      this.lastVoidJump = time;
    }
  }

  updatePassiveRelics(time) {
    this.updateBurningEnemies(time);

    if (this.effectState.repairRate > 0 && time - this.lastRepairTick > 250) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.effectState.repairRate);
      this.lastRepairTick = time;
    }

    if (this.getItemLevel('gun-drone') > 0 && time - this.lastDroneShot > this.effectState.droneRate) {
      const target = this.getNearestEnemy(this.player.x, this.player.y, 340);
      if (target) {
        this.damageEnemy(target, 4 + this.getItemLevel('gun-drone'), 'Gun Drone');
        this.drawBeam(this.player.x, this.player.y, target.x, target.y, 0xffce6a);
      }
      this.lastDroneShot = time;
    }

    const heart = this.getRelicPower('heart-of-the-tempest');
    if (heart > 0 && time - this.lastHeartStrike > Math.max(550, 2200 - heart * 260)) {
      const target = this.getNearestEnemy(this.player.x, this.player.y, 260 + heart * 25);
      if (target) {
        this.damageEnemy(target, 7 + heart * 3, 'Heart of the Tempest');
        this.chainLightning(target, heart >= 3 ? 2 : 1, 5 + heart, 'Heart of the Tempest');
        this.drawBeam(this.player.x, this.player.y, target.x, target.y, 0xf4ec77);
      }
      this.lastHeartStrike = time;
    }

    const stormCore = this.getItemLevel('storm-core');
    if (stormCore >= 4 && ['storm-fields', 'black-cloud-region'].includes(this.biome.id)) {
      this.damageEnemiesNear(this.player.x, this.player.y, 72 + stormCore * 7, 0.08 * stormCore, 'Storm Core');
    }

    const corrupted = this.getRelicPower('corrupted-relic');
    if (corrupted > 0 && time - this.lastCorruptedTick > 2400) {
      this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + corrupted * 2);
      if (corrupted >= 3) this.player.hp = Math.min(this.player.maxHp, this.player.hp + corrupted);
      this.lastRelicTrigger = 'Corrupted Relic';
      this.lastCorruptedTick = time;
    }
  }

  updateBurningEnemies(time) {
    this.enemies.forEach((enemy) => {
      if (!enemy.getData('alive')) return;
      const ticks = enemy.getData('burnTicks') ?? 0;
      if (ticks <= 0) return;
      const lastBurn = enemy.getData('lastBurn') ?? 0;
      if (time - lastBurn < 520) return;
      enemy.setData('lastBurn', time);
      enemy.setData('burnTicks', ticks - 1);
      this.damageEnemy(enemy, enemy.getData('burnDamage') ?? 1, enemy.getData('burnSource') ?? 'Burn');
      if ((enemy.getData('burnTicks') ?? 0) <= 0 && enemy.getData('alive')) {
        this.setEnemyNormalVisual(enemy);
      }
    });
  }

  setEnemyNormalVisual(enemy) {
    enemy.clearTint?.();
    enemy.setAlpha(1);
  }

  setEnemyBurnVisual(enemy) {
    enemy.setTint(0xff9b56);
    enemy.setAlpha(1);
  }

  setEnemyDeadVisual(enemy) {
    enemy.setTint(0x6d7780);
    enemy.setAlpha(0.25);
    if (enemy.body) enemy.body.enable = false;
  }

  getNearestEnemy(x, y, range = Infinity, ignoredEnemy = null) {
    let nearest = null;
    let bestDistance = range;
    this.enemies.forEach((enemy) => {
      if (!enemy.getData('alive') || enemy === ignoredEnemy) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance < bestDistance) {
        nearest = enemy;
        bestDistance = distance;
      }
    });
    return nearest;
  }

  damageEnemiesNear(x, y, range, amount, source) {
    this.enemies.forEach((enemy) => {
      if (!enemy.getData('alive')) return;
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= range) {
        this.damageEnemy(enemy, amount, source);
      }
    });
  }

  chainLightning(originEnemy, chains, damage, source) {
    let current = originEnemy;
    const hit = new Set([originEnemy]);
    const chainRange = (source === 'Chainstorm Coil'
      ? 220 + this.getRelicPower('chainstorm-coil') * 45
      : source === 'Heart of the Tempest'
        ? 210 + this.getRelicPower('heart-of-the-tempest') * 35
        : 190 + this.getRelicPower('lightning-rod-mast') * 35) * WORLD_SCALE + TILE_SIZE;
    for (let index = 0; index < chains; index += 1) {
      const next = this.enemies
        .filter((enemy) => enemy.getData('alive') && !hit.has(enemy))
        .map((enemy) => ({
          enemy,
          distance: Phaser.Math.Distance.Between(current.x, current.y, enemy.x, enemy.y),
        }))
        .filter(({ distance }) => distance <= chainRange)
        .sort((a, b) => a.distance - b.distance)[0]?.enemy;
      if (!next) return;
      this.drawBeam(current.x, current.y, next.x, next.y, 0x54e4ff);
      this.damageEnemy(next, damage, source);
      hit.add(next);
      current = next;
    }
  }

  drawBeam(fromX, fromY, toX, toY, color) {
    const beam = this.add.line(0, 0, fromX, fromY, toX, toY, color, 0.82);
    beam.setOrigin(0, 0);
    beam.setDepth(34);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 180,
      onComplete: () => beam.destroy(),
    });
  }

  drawShockwave(x, y, radius, color) {
    const ring = this.add.circle(x, y, 8, color, 0.08);
    ring.setStrokeStyle(2, color, 0.65);
    ring.setDepth(30);
    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 320,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  drawTrailFlare(x, y, color) {
    const flare = this.add.circle(x, y, 12, color, 0.22);
    flare.setDepth(4);
    this.tweens.add({
      targets: flare,
      alpha: 0,
      scale: 1.8,
      duration: 380,
      onComplete: () => flare.destroy(),
    });
  }

  teleportShip(distance, source) {
    const angle = this.player.rotation - Math.PI / 2;
    const nextX = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 24, WORLD_WIDTH - 24);
    const nextY = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 24, WORLD_HEIGHT - 24);
    this.drawShockwave(this.player.x, this.player.y, 32, 0x80c8ff);
    this.player.setPosition(nextX, nextY);
    this.drawShockwave(nextX, nextY, 38, 0x80c8ff);
    this.lastRelicTrigger = source;
  }

  fireCannon() {
    const angle = this.player.rotation - Math.PI / 2;
    const muzzleX = this.player.x + Math.cos(angle) * 24 * WORLD_SCALE;
    const muzzleY = this.player.y + Math.sin(angle) * 24 * WORLD_SCALE;
    const shot = this.add.circle(muzzleX, muzzleY, 5 * WORLD_SCALE, 0xffb44a, 1);
    shot.setDepth(28);
    shot.setStrokeStyle(WORLD_SCALE, 0x351b0d, 0.65);
    shot.birthTime = this.time.now;
    shot.owner = 'player';
    shot.bouncesRemaining = this.getRelicPower('ricochet-chamber') >= 3 ? 2 : this.getRelicPower('ricochet-chamber') >= 1 ? 1 : 0;
    this.physics.add.existing(shot);
    shot.body.setCircle(5 * WORLD_SCALE);
    this.physics.velocityFromRotation(angle, this.effectState.shotSpeed, shot.body.velocity);
    this.projectiles.push(shot);

    if (this.getItemLevel('burst-cylinder') >= 1) {
      const burstCount = Math.min(3, this.getItemLevel('burst-cylinder'));
      for (let index = 1; index < burstCount; index += 1) {
        this.time.delayedCall(index * 55, () => this.fireSecondaryBurst(angle, index));
      }
    }
  }

  fireSecondaryBurst(angle, index) {
    const spread = (index % 2 === 0 ? 0.06 : -0.06) / Math.max(1, this.getItemLevel('burst-cylinder'));
    const muzzleX = this.player.x + Math.cos(angle + spread) * 24 * WORLD_SCALE;
    const muzzleY = this.player.y + Math.sin(angle + spread) * 24 * WORLD_SCALE;
    const shot = this.add.circle(muzzleX, muzzleY, 4 * WORLD_SCALE, this.getItemLevel('burst-cylinder') >= 5 ? 0xff7a2c : 0xffd48a, 0.95);
    shot.setDepth(28);
    shot.birthTime = this.time.now;
    shot.owner = 'player';
    shot.bouncesRemaining = 0;
    this.physics.add.existing(shot);
    shot.body.setCircle(4 * WORLD_SCALE);
    this.physics.velocityFromRotation(angle + spread, this.effectState.shotSpeed * 0.9, shot.body.velocity);
    this.projectiles.push(shot);
  }

  fireEnemySalvo(time) {
    const livingEnemies = this.enemies.filter((enemy) => enemy.getData('alive'));
    if (livingEnemies.length === 0) return;

    const corruption = this.getRelicPower('eclipse-cortex') > 0 ? this.corruptionSaturation ?? 0 : 0;
    const tierBonus = Math.floor(Math.max(0, this.islandTier - 1) / 2);
    const roomBonus = this.roomInChain >= 4 ? 1 : 0;
    const salvoCount = Math.min(livingEnemies.length, ENEMY_SHOTS_PER_SALVO + tierBonus + roomBonus + (corruption > 0.66 ? 1 : 0));
    livingEnemies.slice(0, salvoCount).forEach((enemy, index) => {
      const delay = index * 140;
      this.time.delayedCall(delay, () => {
        if (!enemy.getData('alive') || this.player.hp <= 0) return;
        this.fireEnemyShot(enemy, time + delay);
      });
    });
  }

  fireEnemyShot(enemy, birthTime) {
    if ((enemy.getData('stunnedUntil') ?? 0) > this.time.now) return;
    const shot = this.add.circle(enemy.x, enemy.y, 7 * WORLD_SCALE, 0x6ee7ff, 0.92);
    shot.setDepth(26);
    shot.setStrokeStyle(2 * WORLD_SCALE, 0x173044, 0.75);
    shot.birthTime = birthTime;
    shot.owner = 'enemy';
    shot.damage = enemy.getData('shotDamage') ?? ENEMY_SHOT_DAMAGE;
    this.physics.add.existing(shot);
    shot.body.setCircle(7 * WORLD_SCALE);

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const corruption = this.getRelicPower('eclipse-cortex') > 0 ? this.corruptionSaturation ?? 0 : 0;
    const speed = 145 + this.islandTier * 14 + this.roomInChain * 6 + Math.min(this.enemySalvoCount * 3, 34) + corruption * 42;
    const warpedAngle = angle + Math.sin(birthTime * 0.008 + this.enemySalvoCount) * corruption * 0.24;
    this.physics.velocityFromRotation(warpedAngle, speed, shot.body.velocity);
    this.enemyProjectiles.push(shot);
    this.enemySalvoCount += 1;

    this.tweens.add({
      targets: shot,
      scale: 1.25,
      yoyo: true,
      repeat: -1,
      duration: 180,
    });
  }

  updateProjectiles(time) {
    this.projectiles.slice().forEach((shot) => {
      if (!shot.scene) {
        this.destroyProjectile(shot, this.projectiles);
        return;
      }

      if (shot.ricochetExpiresAt && time > shot.ricochetExpiresAt) {
        this.destroyProjectile(shot, this.projectiles);
        return;
      }

      if (this.isOutsideWorld(shot)) {
        if (shot.bouncesRemaining > 0) {
          this.bounceShot(shot);
        } else {
          this.destroyProjectile(shot, this.projectiles);
        }
        return;
      }

      const target = this.enemies.find((enemy) => this.shotHitsEnemy(shot, enemy));

      if (target) {
        this.resolvePlayerShotHit(target, shot);
        this.destroyProjectile(shot, this.projectiles);
      }
    });

    this.enemyProjectiles.slice().forEach((shot) => {
      if (!shot.scene || this.isOutsideWorld(shot)) {
        this.destroyProjectile(shot, this.enemyProjectiles);
        return;
      }

      if (this.tryInterceptShot(shot)) {
        this.destroyProjectile(shot, this.enemyProjectiles);
        return;
      }

      if (Phaser.Math.Distance.Between(shot.x, shot.y, this.player.x, this.player.y) < 24 * WORLD_SCALE) {
        this.player.hp = Math.max(0, this.player.hp - this.getIncomingDamage(shot.damage ?? ENEMY_SHOT_DAMAGE));
        this.playerHitCount += 1;
        this.flashShip();
        this.destroyProjectile(shot, this.enemyProjectiles);
        if (this.player.hp <= 0) this.triggerGameOver();
      }
    });
  }

  shotHitsEnemy(shot, enemy) {
    if (!enemy?.getData?.('alive')) return false;
    if (!enemy.body) return Phaser.Math.Distance.Between(shot.x, shot.y, enemy.x, enemy.y) < 22 * WORLD_SCALE;
    const radius = Math.max(4, (shot.displayWidth || 8) * 0.5);
    return (
      shot.x + radius >= enemy.body.left
      && shot.x - radius <= enemy.body.right
      && shot.y + radius >= enemy.body.top
      && shot.y - radius <= enemy.body.bottom
    );
  }

  resolvePlayerShotHit(target, shot) {
    const baseDamage = PLAYER_SHOT_DAMAGE * this.effectState.damageMultiplier;
    const ricochetBonus = this.getRelicPower('ricochet-chamber') >= 4 ? 5 : 0;
    const flame = this.getItemLevel('flame-vent');
    let damage = baseDamage + ricochetBonus;
    if (this.getRelicPower('glass-hull') >= 5 && this.player.hp / this.player.maxHp < 0.35) damage *= 1.6;
    if (this.getItemLevel('burst-cylinder') >= 5 && Math.random() < 0.25) {
      damage += 10;
      this.damageEnemiesNear(target.x, target.y, 45, 5, 'Burst Cylinder');
      this.drawShockwave(target.x, target.y, 45, 0xff7a2c);
    }
    this.damageEnemy(target, damage, 'Cannon');

    const chainstorm = this.getRelicPower('chainstorm-coil');
    if (chainstorm > 0) {
      const chains = chainstorm >= 5 ? 4 : chainstorm >= 3 ? 2 : 1;
      this.chainLightning(target, chains, 5 + chainstorm * 3, 'Chainstorm Coil');
    }

    const lightningRod = this.getRelicPower('lightning-rod-mast');
    if (lightningRod >= 3) {
      this.chainLightning(target, lightningRod >= 5 ? 3 : 1, 4 + lightningRod * 2, 'Lightning Rod Mast');
    }

    const harpoon = this.getRelicPower('harpoon-launcher');
    if (harpoon > 0 && target.getData('alive')) {
      const angle = Phaser.Math.Angle.Between(target.x, target.y, this.player.x, this.player.y);
      target.x += Math.cos(angle) * (8 + harpoon * 3);
      target.y += Math.sin(angle) * (8 + harpoon * 3);
      if (harpoon >= 4) target.setData('stunnedUntil', this.time.now + 450);
      this.lastRelicTrigger = 'Harpoon Launcher';
    }

    if (flame > 0 && target.getData('alive')) {
      target.setData('burnTicks', Math.max(target.getData('burnTicks') ?? 0, 2 + flame));
      target.setData('burnDamage', 1 + flame);
      target.setData('burnSource', 'Flame Vent');
      this.setEnemyBurnVisual(target);
      this.lastRelicTrigger = 'Flame Vent';
    }

    const gravity = this.getRelicPower('gravity-mine');
    if (gravity > 0) {
      this.damageEnemiesNear(target.x, target.y, 48 + gravity * 12, 2 + gravity, 'Gravity Mine');
      if (gravity >= 5) this.drawShockwave(target.x, target.y, 86, 0xb27bff);
    }

    if (this.getRelicPower('ricochet-chamber') >= 5) {
      const next = this.getNearestEnemy(target.x, target.y, 180, target);
      if (next) {
        this.damageEnemy(next, 8 + this.getRelicPower('ricochet-chamber') * 2, 'Ricochet Chamber');
        this.drawBeam(target.x, target.y, next.x, next.y, 0xf1d28a);
      }
    }

    const eclipse = this.getRelicPower('eclipse-cortex');
    if (eclipse > 0 && (this.corruptionSaturation ?? 0) > 0.78) {
      this.damageEnemiesNear(target.x, target.y, 58 + eclipse * 8, 4 + eclipse * 2, 'Eclipse Cortex');
      this.drawShockwave(target.x, target.y, 58 + eclipse * 8, 0xff2f7d);
    }
  }

  bounceShot(shot) {
    shot.bouncesRemaining -= 1;
    shot.ricochetExpiresAt = this.time.now + RICOCHET_SHOT_RANGE_MS;
    if (shot.x < 0 || shot.x > WORLD_WIDTH) shot.body.velocity.x *= -1;
    if (shot.y < 0 || shot.y > WORLD_HEIGHT) shot.body.velocity.y *= -1;
    shot.x = Phaser.Math.Clamp(shot.x, 8, WORLD_WIDTH - 8);
    shot.y = Phaser.Math.Clamp(shot.y, 8, WORLD_HEIGHT - 8);
    this.lastRelicTrigger = 'Ricochet Chamber';
  }

  damageEnemy(enemy, amount, source = 'Cannon') {
    if (!enemy.getData('alive')) return;
    const hp = Math.max(0, enemy.getData('hp') - amount);
    enemy.setData('hp', hp);
    this.enemyHitCount += 1;
    this.lastRelicTrigger = source;

    const baseScale = enemy.getData('baseScale') ?? 1;
    enemy.setScale(baseScale * 1.12);
    this.tweens.add({
      targets: enemy,
      scale: baseScale,
      duration: 120,
    });
    enemy.setTint(0xfff1a6);
    this.time.delayedCall(120, () => {
      if (enemy.getData('alive')) {
        if ((enemy.getData('burnTicks') ?? 0) > 0) this.setEnemyBurnVisual(enemy);
        else this.setEnemyNormalVisual(enemy);
      }
    });

    if (hp <= 0) {
      enemy.setData('alive', false);
      enemy.label.setAlpha(0.45);
      enemy.setAlpha(0.25);
      this.setEnemyDeadVisual(enemy);
      this.awardRelicXp(this.getKillXpAmount());
      const item = this.chooseLootItem(enemy);
      this.spawnLootMarker(enemy.x, enemy.y, item);
      this.autosaveRun();
      if (source === 'Flame Vent' && this.getItemLevel('flame-vent') >= 4) {
        this.damageEnemiesNear(enemy.x, enemy.y, 76, 12 + this.getItemLevel('flame-vent') * 3, 'Flame Vent');
        this.drawShockwave(enemy.x, enemy.y, 76, 0xff8738);
      }
      this.checkRoomClear();
    }
  }

  getIncomingDamage(baseDamage) {
    const barrier = this.getItemLevel('scrap-barrier');
    const voidSail = this.getRelicPower('void-sail');
    const resistance = Math.max(0.25, this.effectState.enemyDamageMultiplier - barrier * 0.035 - (voidSail >= 4 ? 0.12 : 0));
    return Math.max(1, Math.round(baseDamage * resistance));
  }

  getKillXpAmount() {
    return Math.max(1, Math.round(RELIC_XP_PER_KILL * this.effectState.lootMultiplier));
  }

  tryInterceptShot(shot) {
    const interceptor = this.getItemLevel('interceptor-drone');
    if (interceptor <= 0) return false;
    const range = 42 + interceptor * 18;
    if (Phaser.Math.Distance.Between(shot.x, shot.y, this.player.x, this.player.y) > range) return false;
    this.lastRelicTrigger = 'Interceptor Drone';
    this.drawBeam(this.player.x, this.player.y, shot.x, shot.y, interceptor >= 4 ? 0xb9e7ff : 0x91d9e8);
    if (interceptor >= 4) {
      const target = this.getNearestEnemy(shot.x, shot.y, 240);
      if (target) this.damageEnemy(target, 4 + interceptor * 2, 'Interceptor Drone');
    }
    if (interceptor >= 5) this.damageEnemiesNear(this.player.x, this.player.y, 78, 5, 'Interceptor EMP');
    return true;
  }

  awardRelicXp(amount) {
    let leveled = false;
    this.inventory.forEach((entry) => {
      const item = ITEM_BY_ID[entry.id];
      if (!entry.equipped || !isXpRelic(item) || entry.level >= 5) return;
      entry.xp += amount;
      while (entry.level < 5 && entry.xp >= getXpToNextLevel(item, entry.level)) {
        entry.xp -= getXpToNextLevel(item, entry.level);
        entry.level += 1;
        leveled = true;
      }
    });
    if (leveled) this.recalculateEffects();
    if (leveled) this.flashRelicPanel();
    this.renderItemPanel();
  }

  chooseLootItem(enemy) {
    if (enemy.getData('boss')) {
      const relicId = enemy.getData('relicId') || this.getBiomeMeta().bossRelic;
      return ITEM_BY_ID[relicId] || ITEM_BY_ID['cloudbreaker-ram'];
    }
    const enemyRelic = this.chooseEnemyRelicDrop(enemy);
    if (enemyRelic) return enemyRelic;
    const fallback = ITEM_CATALOG.filter((item) => item.kind === 'powerup' && item.source.includes('Combat Drop'));
    return this.createPowerupDrop(
      fallback[(this.enemyHitCount + this.enemySalvoCount + this.biomeIndex + this.roomInChain) % fallback.length],
      enemy,
    );
  }

  chooseEnemyRelicDrop(enemy) {
    const pool = (ENEMY_RELIC_DROPS_BY_BIOME[this.biome.id] || [])
      .map((id) => ITEM_BY_ID[id])
      .filter(Boolean);
    if (!pool.length) return null;
    const exclusiveIds = new Set([
      ...Object.values(LEGENDARY_RELIC_BY_BIOME),
      ...Object.values(MYTHIC_RELIC_BY_BIOME),
      ...Object.values(BIOME_META).map((meta) => meta.bossRelic),
    ]);
    const eligible = pool.filter((item) => !exclusiveIds.has(item.id));
    if (!eligible.length) return null;
    const elite = enemy.getData('elite');
    const ownedIds = new Set(this.inventory.map((entry) => entry.id));
    const unowned = eligible.filter((item) => !ownedIds.has(item.id));
    const candidates = unowned.length ? unowned : eligible;
    const depthBonus = Math.min(0.06, this.roomInChain * 0.006 + Math.max(0, this.islandTier - 1) * 0.01);
    const fortune = this.getItemLevel('fortune-engine') * 0.012;
    const dropChance = (elite ? 0.16 : 0.045) + depthBonus + fortune;
    if (Math.random() > dropChance) return null;
    return candidates[(this.enemyHitCount + this.roomDepth + this.biomeIndex + this.roomInChain) % candidates.length];
  }

  createPowerupDrop(item, enemy) {
    const elite = enemy.getData('elite') || enemy.getData('boss');
    const depthBonus = Math.min(0.22, this.roomDepth * 0.012 + this.roomInChain * 0.018);
    const fortune = this.getItemLevel('fortune-engine') * 0.04;
    const roll = Math.random();
    const epicChance = (elite ? 0.14 : 0.04) + depthBonus * 0.35 + fortune;
    const rareChance = (elite ? 0.42 : 0.18) + depthBonus + fortune;
    const rarity = roll < epicChance ? 'epic' : roll < rareChance ? 'rare' : item.rarity;
    const durationScale = rarity === 'epic' ? 1.28 : rarity === 'rare' ? 1.14 : 1;
    return {
      ...item,
      rarity,
      durationMs: Math.round((item.durationMs ?? 45000) * durationScale),
    };
  }

  applyLootItem(item) {
    if (item.kind === 'powerup') {
      this.activatePowerup(item);
      return;
    }
    const existingRelics = this.inventory.filter((entry) => isXpRelic(ITEM_BY_ID[entry.id])).length;
    const entry = this.getItemEntry(item.id);
    if (entry) {
      entry.level = Math.min(5, entry.level + 1);
      entry.equipped = true;
      this.lastLootDrop = `${item.name} relic strengthened`;
    } else if (existingRelics >= MAX_RELIC_SLOTS) {
      this.lastLootDrop = `${item.name} found, but relic bay is full`;
    } else {
      this.inventory.push({
        id: item.id,
        level: 1,
        xp: 0,
        equipped: true,
      });
      this.lastLootDrop = `${item.name} relic obtained`;
    }
    this.recalculateEffects();
    this.flashRelicPanel();
    this.renderItemPanel();
  }

  activatePowerup(item) {
    const duration = item.durationMs ?? 45000;
    const existing = this.activePowerups.find((entry) => entry.id === item.id);
    if (existing) {
      existing.expiresAt = Math.max(existing.expiresAt, this.time.now) + Math.round(duration * 0.55);
      existing.rarity = item.rarity;
      this.lastLootDrop = `${item.name} refreshed`;
    } else {
      this.activePowerups.push({
        id: item.id,
        rarity: item.rarity,
        expiresAt: this.time.now + duration,
      });
      this.lastLootDrop = `${item.name} active`;
    }
    this.recalculateEffects();
    this.flashRelicPanel();
    this.renderItemPanel();
  }

  checkLootOverlap() {
    this.lootDrops.slice().forEach((drop) => {
      if (!drop.scene || Phaser.Math.Distance.Between(drop.x, drop.y, this.player.x, this.player.y) > 34 * WORLD_SCALE) return;
      const item = drop.getData('item');
      if (!item) return;
      this.applyLootItem(item);
      this.drawShockwave(drop.x, drop.y, item.kind === 'relic' ? 62 : 44, Phaser.Display.Color.HexStringToColor(item.palette[1]).color);
      const index = this.lootDrops.indexOf(drop);
      if (index >= 0) this.lootDrops.splice(index, 1);
      drop.parts?.forEach((part) => part.destroy());
      drop.destroy();
      this.autosaveRun();
    });
  }

  spawnLootMarker(x, y, item) {
    const flare = this.add.circle(x, y, 24, Phaser.Display.Color.HexStringToColor(item.palette[1]).color, 0.28);
    flare.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(item.palette[1]).color, 0.85);
    flare.setDepth(31);
    const badge = this.add.circle(x, y, 16, Phaser.Display.Color.HexStringToColor(item.palette[0]).color, 0.95);
    badge.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(item.palette[2]).color, 0.72);
    badge.setDepth(32);
    badge.setData('item', item);
    const symbol = isXpRelic(item)
      ? this.createRelicLootIcon(x, y, item)
      : this.createPowerupLootIcon(x, y, item);
    symbol.setDepth(33);
    const tag = this.add.text(x, y + 28, item.kind === 'relic' ? 'RELIC' : `${item.rarity.toUpperCase()} ${Math.round((item.durationMs ?? 45000) / 1000)}s`, {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: item.palette[1],
      align: 'center',
    });
    tag.setOrigin(0.5, 0.5);
    tag.setDepth(33);
    this.objectLayer.add([flare, badge, symbol, tag]);
    badge.parts = [flare, symbol, tag];
    this.lootDrops.push(badge);
    this.tweens.add({
      targets: [flare, badge],
      scale: 1.3,
      yoyo: true,
      repeat: -1,
      duration: 520,
      ease: 'Sine.easeInOut',
    });
    this.maybeShowTutorialStep(
      'drops',
      'Drops & Upgrades',
      'Enemies can drop temporary power-ups or relics. Fly into a drop to collect it.\n\nRelics stay with the run and level up from kills while equipped. Power-ups are timed boosts. Hover icons in the left panel to read what they do.',
    );
  }

  createPowerupLootIcon(x, y, item) {
    const color = Phaser.Display.Color.HexStringToColor(item.palette[1]).color;
    const dark = Phaser.Display.Color.HexStringToColor(item.palette[2]).color;
    const base = Phaser.Display.Color.HexStringToColor(item.palette[0]).color;
    const icon = this.add.container(x, y);
    const stroke = (shape, width = 2) => shape.setStrokeStyle(width, color, 0.9);
    const id = item.id;
    if (id === 'reinforced-hull-plating') {
      icon.add(stroke(this.add.polygon(0, 0, [0, -13, 12, -5, 9, 11, 0, 14, -9, 11, -12, -5], color, 0.38)));
      icon.add(this.add.line(0, 0, -7, 5, 7, 5, color, 0.9).setLineWidth(2));
    } else if (id === 'burst-cylinder') {
      icon.add(stroke(this.add.rectangle(0, 1, 18, 12, color, 0.24)));
      icon.add(this.add.line(0, 0, -12, 1, 12, 1, color, 0.9).setLineWidth(3));
      icon.add(this.add.circle(9, -6, 4, color, 0.82));
    } else if (id === 'drift-fins') {
      icon.add(this.add.line(0, 0, -2, -13, -2, 13, color, 0.9).setLineWidth(2));
      icon.add(stroke(this.add.triangle(-1, 1, -8, -11, -8, 12, 10, 4, color, 0.5)));
    } else if (id === 'salvager-magnet') {
      icon.add(this.add.arc(0, 0, 12, 35, 325, false, color, 0).setStrokeStyle(4, color, 0.9));
      icon.add(this.add.rectangle(-8, 9, 5, 5, color, 0.9));
      icon.add(this.add.rectangle(8, 9, 5, 5, color, 0.9));
    } else if (id === 'scrap-barrier') {
      icon.add(stroke(this.add.circle(0, 0, 13, dark, 0.08)));
      icon.add(this.add.polygon(0, 0, [0, -11, 10, -2, 7, 10, 0, 13, -7, 10, -10, -2], color, 0.76));
    } else if (id === 'gun-drone') {
      icon.add(stroke(this.add.polygon(0, 0, [0, -11, 12, -5, 12, 7, 0, 13, -12, 7, -12, -5], color, 0.22)));
      icon.add(this.add.line(0, 0, -12, 0, 12, 0, color, 0.9).setLineWidth(2));
      icon.add(this.add.circle(0, 0, 4, color, 0.92));
    } else if (id === 'arc-reactor') {
      icon.add(stroke(this.add.circle(0, 0, 12, dark, 0.08)));
      icon.add(this.add.circle(0, 0, 5, color, 0.92));
      icon.add(this.add.arc(0, 0, 10, 210, 330, false, base, 0).setStrokeStyle(3, color, 0.75));
    } else if (id === 'repair-drone') {
      icon.add(stroke(this.add.circle(0, 0, 12, dark, 0.08)));
      icon.add(this.add.line(0, 0, -8, 0, 8, 0, color, 0.94).setLineWidth(3));
      icon.add(this.add.line(0, 0, 0, -8, 0, 8, color, 0.94).setLineWidth(3));
    } else if (id === 'fortune-engine') {
      icon.add(stroke(this.add.circle(0, 0, 12, dark, 0.08)));
      icon.add(this.add.polygon(0, 0, [0, -12, 4, -2, 12, 0, 4, 2, 0, 12, -4, 2, -12, 0, -4, -2], color, 0.9));
    } else if (id === 'treasure-compass') {
      icon.add(stroke(this.add.circle(0, 0, 12, dark, 0.08)));
      icon.add(this.add.polygon(0, 0, [0, -12, 5, 0, 0, 12, -5, 0], color, 0.84));
      icon.add(this.add.circle(0, 0, 3, dark, 0.8));
    } else if (id === 'interceptor-drone') {
      icon.add(stroke(this.add.triangle(0, 0, 0, -13, 13, 11, -13, 11, color, 0.36)));
      icon.add(this.add.line(0, 0, -10, 7, 10, 7, color, 0.9).setLineWidth(2));
    } else if (id === 'storm-core') {
      icon.add(stroke(this.add.circle(0, 0, 13, dark, 0.08)));
      icon.add(this.add.polygon(0, 0, [-1, -13, -8, 1, -1, 1, -6, 14, 9, -3, 1, -3], color, 0.92));
    } else if (id === 'flame-vent') {
      icon.add(this.add.ellipse(0, 6, 20, 8, dark, 0.34));
      icon.add(this.add.polygon(0, -1, [0, 12, -8, 2, -2, -5, 1, -14, 8, -3, 4, 6], color, 0.9));
    } else {
      icon.add(stroke(this.add.circle(0, 0, 12, dark, 0.08)));
      icon.add(this.add.text(0, -8, item.symbol, {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: item.palette[1],
        align: 'center',
      }).setOrigin(0.5, 0));
    }
    return icon;
  }

  createRelicLootIcon(x, y, item) {
    const color = Phaser.Display.Color.HexStringToColor(item.palette[1]).color;
    const dark = Phaser.Display.Color.HexStringToColor(item.palette[2]).color;
    const icon = this.add.container(x, y);
    const id = item.id;
    const stroke = (shape) => shape.setStrokeStyle(2, color, 0.9);
    if (id === 'chainstorm-coil') {
      icon.add(stroke(this.add.circle(0, 0, 12, dark, 0.08)));
      icon.add(this.add.polygon(0, 0, [-2, -13, -9, 2, -1, 2, -6, 14, 9, -4, 1, -4], color, 0.9));
    } else if (id === 'sky-vane-rig') {
      icon.add(stroke(this.add.circle(0, 0, 13, dark, 0.08)));
      icon.add(this.add.line(0, 0, 0, -13, 0, 13, color, 0.9).setLineWidth(2));
      icon.add(stroke(this.add.triangle(0, -11, -8, 5, 0, 1, 8, 5, color, 0.55)));
    } else if (id === 'stormglass-battery') {
      icon.add(stroke(this.add.rectangle(0, 2, 15, 22, color, 0.2)));
      icon.add(this.add.rectangle(0, 7, 10, 9, color, 0.78));
      icon.add(this.add.polygon(1, -8, [0, -8, -4, 1, 2, 1, -1, 9, 8, -3, 3, -3], color, 0.9));
    } else if (id === 'cinder-fuse') {
      icon.add(this.add.line(0, 0, -10, 9, 5, -6, color, 0.9).setLineWidth(3));
      icon.add(this.add.polygon(7, -8, [0, 9, -5, 1, -1, -6, 1, -13, 7, -4, 5, 5], color, 0.84));
    } else if (id === 'prism-lens') {
      icon.add(stroke(this.add.polygon(0, 0, [0, -14, 13, -3, 8, 13, -8, 13, -13, -3], color, 0.35)));
      icon.add(this.add.circle(0, 0, 5, color, 0.82));
      icon.add(this.add.line(0, 0, -14, -8, 14, 8, color, 0.75).setLineWidth(2));
    } else if (id === 'rime-keel') {
      icon.add(this.add.polygon(0, 2, [0, -14, 9, -2, 5, 13, -5, 13, -9, -2], color, 0.72));
      icon.add(this.add.line(0, 0, 0, -13, 0, 14, dark, 0.8).setLineWidth(2));
      icon.add(this.add.line(0, 0, -8, -4, 8, -4, dark, 0.65).setLineWidth(2));
    } else if (id === 'vinewrapped-cargo-net') {
      icon.add(stroke(this.add.rectangle(0, 1, 20, 16, color, 0.16)));
      icon.add(this.add.line(0, 0, -10, -7, 10, 9, color, 0.8).setLineWidth(2));
      icon.add(this.add.line(0, 0, 10, -7, -10, 9, color, 0.8).setLineWidth(2));
      icon.add(this.add.circle(-6, -4, 3, color, 0.85));
    } else if (id === 'rivet-armor-plate') {
      icon.add(stroke(this.add.polygon(0, 0, [0, -14, 13, -5, 10, 12, 0, 15, -10, 12, -13, -5], color, 0.42)));
      icon.add(this.add.circle(-5, -3, 2, color, 0.9));
      icon.add(this.add.circle(5, -3, 2, color, 0.9));
      icon.add(this.add.line(0, 0, -6, 8, 6, 8, color, 0.9).setLineWidth(2));
    } else if (id === 'powder-keg-breech') {
      icon.add(stroke(this.add.rectangle(0, 2, 19, 16, color, 0.25)));
      icon.add(this.add.line(0, 0, -12, 2, 12, 2, color, 0.9).setLineWidth(3));
      icon.add(this.add.polygon(10, -8, [0, 8, -5, 1, -1, -6, 1, -13, 7, -4, 5, 5], color, 0.82));
    } else if (id === 'temple-aether-chime') {
      icon.add(this.add.line(0, 0, 0, -14, 0, -8, color, 0.9).setLineWidth(2));
      icon.add(stroke(this.add.triangle(0, 4, -10, -8, 10, -8, 7, 12, color, 0.45)));
      icon.add(this.add.circle(0, 11, 3, color, 0.9));
    } else if (id === 'umbral-gyroscope') {
      icon.add(stroke(this.add.circle(0, 0, 13, dark, 0.12)));
      icon.add(this.add.ellipse(0, 0, 24, 10, color, 0.58));
      icon.add(this.add.ellipse(0, 0, 10, 24, color, 0.45));
      icon.add(this.add.circle(0, 0, 4, color, 0.92));
    } else if (id === 'ricochet-chamber') {
      icon.add(this.add.line(0, 0, -12, 8, 8, 8, color, 0.9).setLineWidth(3));
      icon.add(this.add.line(0, 0, 8, 8, 12, -8, color, 0.9).setLineWidth(3));
      icon.add(stroke(this.add.triangle(12, -9, 0, 0, 7, -4, 13, 0, color, 0.5)));
    } else if (id === 'gravity-mine') {
      icon.add(this.add.circle(0, 0, 8, color, 0.85));
      icon.add(stroke(this.add.circle(0, 0, 14, dark, 0.08)));
    } else if (id === 'harpoon-launcher') {
      icon.add(this.add.line(0, 0, -10, 10, 10, -10, color, 0.9).setLineWidth(3));
      icon.add(stroke(this.add.triangle(9, -10, 0, 0, 11, -5, 5, -12, color, 0.55)));
    } else if (id === 'pulse-dash-core') {
      icon.add(stroke(this.add.circle(0, 0, 13, dark, 0.08)));
      icon.add(this.add.line(0, 0, -10, 0, 7, 0, color, 0.9).setLineWidth(3));
      icon.add(stroke(this.add.triangle(9, 0, 0, -8, 12, 0, 0, 8, color, 0.55)));
    } else if (id === 'quantum-rudder') {
      icon.add(this.add.line(0, 0, 0, -13, 0, 13, color, 0.9).setLineWidth(3));
      icon.add(stroke(this.add.triangle(1, 0, -8, -10, -8, 10, 11, 3, color, 0.46)));
    } else if (id === 'crystal-conduit') {
      icon.add(this.add.polygon(0, 0, [0, -14, 12, -1, 0, 15, -12, -1], color, 0.82));
      icon.add(this.add.line(0, 0, 0, -13, 0, 14, dark, 0.75).setLineWidth(2));
    } else if (id === 'interceptor-drone') {
      icon.add(stroke(this.add.polygon(0, 0, [0, -13, 12, -6, 12, 8, 0, 14, -12, 8, -12, -6], dark, 0.1)));
      icon.add(this.add.line(0, 0, -9, 0, 9, 0, color, 0.9).setLineWidth(2));
      icon.add(this.add.line(0, 0, 0, -9, 0, 9, color, 0.9).setLineWidth(2));
    } else if (id === 'cloudbreaker-ram') {
      icon.add(this.add.polygon(0, 0, [-13, 5, -6, -10, 8, -10, 14, 5, 6, 12, -6, 12], color, 0.82));
      icon.add(this.add.line(0, 0, -8, -9, -13, -14, dark, 0.8).setLineWidth(3));
      icon.add(this.add.line(0, 0, 8, -9, 13, -14, dark, 0.8).setLineWidth(3));
    } else if (id === 'storm-core') {
      icon.add(this.add.polygon(0, 0, [-2, -13, -9, 2, -1, 2, -6, 14, 9, -4, 1, -4], color, 0.9));
      icon.add(stroke(this.add.circle(0, 0, 13, dark, 0.08)));
    } else if (id === 'lightning-rod-mast') {
      icon.add(this.add.line(0, 0, 0, -14, 0, 14, color, 0.9).setLineWidth(3));
      icon.add(this.add.line(0, 0, -8, -6, 8, -6, color, 0.9).setLineWidth(2));
      icon.add(this.add.polygon(5, -8, [0, -8, -4, 0, 2, 0, -2, 9, 8, -3, 3, -3], color, 0.9));
    } else if (id === 'flame-vent') {
      icon.add(this.add.ellipse(0, 5, 20, 10, dark, 0.34));
      icon.add(this.add.polygon(0, -1, [0, 13, -8, 3, -3, -5, 0, -14, 7, -3, 4, 6], color, 0.88));
    } else if (id === 'ember-engine') {
      icon.add(stroke(this.add.rectangle(0, 1, 18, 14, color, 0.32)));
      icon.add(this.add.circle(0, 1, 5, color, 0.9));
      icon.add(this.add.polygon(0, -8, [0, 7, -6, -1, -2, -8, 1, -15, 8, -4, 5, 4], color, 0.8));
    } else if (id === 'leviathan-engine') {
      icon.add(this.add.polygon(0, 2, [-14, 2, -6, -10, 9, -9, 15, 1, 8, 10, -7, 10], color, 0.82));
      icon.add(this.add.circle(0, 2, 4, dark, 0.8));
    } else if (id === 'black-horizon-core') {
      icon.add(this.add.circle(0, 0, 13, dark, 0.9));
      icon.add(this.add.arc(0, 2, 13, 200, 340, false, color, 0.92).setStrokeStyle(3, color, 0.9));
    } else if (id === 'heart-of-the-tempest') {
      icon.add(this.add.polygon(0, 1, [0, 14, -10, 3, -9, -8, -2, -5, 0, -1, 2, -5, 9, -8, 10, 3], color, 0.86));
      icon.add(this.add.polygon(1, 0, [0, -12, -4, 1, 3, 1, -2, 13], dark, 0.72));
    } else if (id === 'dead-captains-wheel') {
      icon.add(stroke(this.add.circle(0, 0, 11, dark, 0.08)));
      icon.add(this.add.circle(0, 0, 3, color, 0.9));
      icon.add(this.add.line(0, 0, -12, 0, 12, 0, color, 0.9).setLineWidth(2));
      icon.add(this.add.line(0, 0, 0, -12, 0, 12, color, 0.9).setLineWidth(2));
      icon.add(this.add.line(0, 0, -9, -9, 9, 9, color, 0.9).setLineWidth(2));
      icon.add(this.add.line(0, 0, 9, -9, -9, 9, color, 0.9).setLineWidth(2));
    } else if (id === 'corrupted-relic') {
      icon.add(this.add.circle(0, 0, 8, color, 0.85));
      icon.add(stroke(this.add.circle(0, 0, 14, dark, 0.08)));
      icon.add(this.add.line(0, 0, -7, -7, 7, 7, dark, 0.8).setLineWidth(2));
      icon.add(this.add.line(0, 0, 7, -7, -7, 7, dark, 0.8).setLineWidth(2));
    } else if (id === 'glass-hull') {
      icon.add(stroke(this.add.polygon(0, 0, [0, -14, 13, -2, 8, 13, -8, 13, -13, -2], color, 0.35)));
      icon.add(this.add.line(0, 0, -9, 13, 9, -11, color, 0.9).setLineWidth(2));
    } else if (id === 'void-sail') {
      icon.add(this.add.line(0, 0, -7, -13, -7, 13, color, 0.9).setLineWidth(3));
      icon.add(stroke(this.add.triangle(0, 0, -5, -11, -5, 11, 11, 3, color, 0.5)));
      icon.add(this.add.circle(6, 2, 4, dark, 0.88));
    } else if (id === 'celestial-compass') {
      icon.add(stroke(this.add.circle(0, 0, 11, dark, 0.12)));
      icon.add(this.add.polygon(0, 0, [0, -13, 4, -2, 13, 0, 4, 2, 0, 13, -4, 2, -13, 0, -4, -2], color, 0.9));
    } else if (id === 'eclipse-cortex') {
      icon.add(this.add.circle(0, 0, 13, dark, 0.95));
      icon.add(this.add.ellipse(0, 0, 26, 14, color, 0.58));
      icon.add(this.add.circle(0, 0, 5, Phaser.Display.Color.HexStringToColor(item.palette[0]).color, 0.96));
    } else {
      icon.add(stroke(this.add.polygon(0, 0, [0, -13, 12, 0, 0, 13, -12, 0], color, 0.62)));
    }
    return icon;
  }

  flashRelicPanel() {
    if (!this.itemsPanel) return;
    this.itemsPanel.classList.add('items-flash');
    window.setTimeout(() => this.itemsPanel.classList.remove('items-flash'), 260);
  }

  flashShip() {
    this.player.setTint(0xff6b4a);
    this.time.delayedCall(90, () => {
      if (this.player) this.player.clearTint();
    });
  }

  isOutsideWorld(shot) {
    return shot.x < -24 || shot.x > WORLD_WIDTH + 24 || shot.y < -24 || shot.y > WORLD_HEIGHT + 24;
  }

  destroyProjectile(shot, list) {
    const index = list.indexOf(shot);
    if (index >= 0) list.splice(index, 1);
    if (shot.scene) shot.destroy();
  }

  updateHud() {
    const livingEnemies = this.enemies.filter((enemy) => enemy.getData('alive')).length;
    const activePowerupCount = this.activePowerups.filter((entry) => entry.expiresAt > this.time.now).length;
    const hudText = [
      `${this.getRoomCode()}${this.roomInChain >= 5 ? '  Boss' : ''}`,
      `Hull ${Math.round(this.player.hp)}/${Math.round(this.player.maxHp)}  Energy ${Math.round(this.player.energy)}/${Math.round(this.player.maxEnergy)}`,
      `Threats ${livingEnemies}`,
      `Power-Ups ${activePowerupCount}`,
    ].join('\n');
    document.querySelector('#hud').textContent = hudText;
  }

  renderItemBadge(item) {
    const style = `--base:${item.palette[0]};--accent:${item.palette[1]};--dark:${item.palette[2]}`;
    if (!isXpRelic(item)) {
      return `<span class="item-badge powerup-badge" style="${style}" data-item-id="${item.id}" aria-label="${item.name} icon">${this.renderPowerupIcon(item.id, item.symbol)}</span>`;
    }
    return `<span class="item-badge relic-badge" style="${style}" data-item-id="${item.id}" aria-label="${item.name} icon">${this.renderRelicIcon(item.id)}</span>`;
  }

  renderItemTooltip(item) {
    const entry = this.getItemEntry(item.id);
    const active = this.activePowerups.find((powerup) => powerup.id === item.id && powerup.expiresAt > this.time.now);
    const rarity = item.rarity ? item.rarity.toUpperCase() : 'COMMON';
    const lines = [];
    lines.push(`<strong>${escapeHtml(item.name)}</strong>`);
    lines.push(`<span>${escapeHtml(rarity)} ${escapeHtml(item.kind)}</span>`);
    lines.push(`<p>${escapeHtml(item.baseEffect || 'No effect listed.')}</p>`);
    if (isXpRelic(item)) {
      const level = entry?.level ?? 1;
      const equipped = entry?.equipped ? 'Equipped' : 'Stored';
      const levelText = item.levels?.[Math.max(0, Math.min(level - 1, item.levels.length - 1))]?.effect;
      lines.push(`<small>${escapeHtml(equipped)} | Level ${level}${entry && entry.level < 5 ? ` | XP ${entry.xp}/${getXpToNextLevel(item, entry.level)}` : ''}</small>`);
      if (levelText) lines.push(`<p>${escapeHtml(levelText)}</p>`);
      const maxText = item.levels?.[item.levels.length - 1]?.effect;
      if (maxText && maxText !== levelText) lines.push(`<small>Awakened: ${escapeHtml(maxText)}</small>`);
      lines.push(`<small>Source: ${escapeHtml(this.getRelicSourceHint(item))}</small>`);
    } else {
      const remaining = active ? Math.max(0, Math.ceil((active.expiresAt - this.time.now) / 1000)) : null;
      if (remaining !== null) lines.push(`<small>Active: ${remaining}s remaining</small>`);
      if (item.variants?.length) lines.push(`<p>${item.variants.map((variant) => escapeHtml(variant)).join('<br>')}</p>`);
      lines.push(`<small>Source: ${escapeHtml(item.source)}</small>`);
    }
    return lines.join('');
  }

  renderPowerupIcon(id, fallback = '') {
    const icons = {
      'reinforced-hull-plating': '<path d="M24 6l15 9-4 22-11 5-11-5-4-22z" fill="var(--accent)" opacity=".5" stroke="var(--accent)" stroke-width="3"/><path d="M16 29h16" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'burst-cylinder': '<path d="M12 18h24v14H12z" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/><path d="M8 25h32" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="14" r="5" fill="var(--accent)"/>',
      'drift-fins': '<path d="M23 7v34M24 12c11 5 14 17 0 27M22 13c-10 5-12 15-1 22" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
      'salvager-magnet': '<path d="M13 13v13c0 15 22 15 22 0V13M13 13h8M27 13h8" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><path d="M10 37h10M28 37h10" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'scrap-barrier': '<path d="M24 6l15 12-5 20-10 5-10-5-5-20z" fill="var(--accent)" opacity=".72"/><circle cx="24" cy="24" r="17" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".65"/>',
      'gun-drone': '<path d="M24 10l14 8v16l-14 8-14-8V18z" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M10 24h28M24 16v16" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="4" fill="var(--accent)"/>',
      'arc-reactor': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="var(--accent)"/><path d="M12 31c6 7 18 7 24 0M12 17c6-7 18-7 24 0" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>',
      'repair-drone': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M14 24h20M24 14v20" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>',
      'fortune-engine': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M24 7l5 13 12 4-12 4-5 13-5-13-12-4 12-4z" fill="var(--accent)"/>',
      'treasure-compass': '<circle cx="24" cy="24" r="16" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M24 7l6 17-6 17-6-17z" fill="var(--accent)"/><circle cx="24" cy="24" r="3" fill="var(--dark)"/>',
      'interceptor-drone': '<path d="M24 7l16 30-16-8-16 8z" fill="var(--accent)" opacity=".45" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/><path d="M13 31h22M24 7v22" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'storm-core': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M25 8l-6 15h9l-5 17" fill="var(--accent)"/>',
      'flame-vent': '<path d="M24 42c-9-4-12-12-5-20 3-4 3-8 1-13 10 5 16 15 10 24 4-2 5-6 5-9 6 8 2 17-11 18z" fill="var(--accent)"/><path d="M13 40h22" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
    };
    const body = icons[id] || `<text x="24" y="31" text-anchor="middle" font-family="monospace" font-size="18" font-weight="700" fill="var(--accent)">${fallback}</text>`;
    return `<svg class="item-icon powerup-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  renderRelicIcon(id) {
    const icons = {
      'chainstorm-coil': '<path d="M15 8c10-5 18 5 8 10-9 5 3 15 14 5" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M23 4l-4 11h8l-6 13" fill="var(--accent)"/>',
      'sky-vane-rig': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".7"/><path d="M24 7v34M24 10l-10 23 10-6 10 6z" fill="var(--accent)" opacity=".82" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>',
      'stormglass-battery': '<path d="M17 10h14v30H17zM20 7h8" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/><path d="M20 28h8v9h-8zM28 11l-5 12h8l-7 14" fill="var(--accent)"/>',
      'cinder-fuse': '<path d="M12 35l18-18" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><path d="M32 7c8 8 7 17-3 23 2-6-2-8-1-13-4 5-7 9-6 15-8-7-4-17 10-25z" fill="var(--accent)"/>',
      'prism-lens': '<path d="M24 6l16 15-7 20H15L8 21z" fill="var(--accent)" opacity=".48"/><circle cx="24" cy="24" r="7" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M8 16l32 17M15 41L35 8" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>',
      'rime-keel': '<path d="M24 5l12 17-5 20H17l-5-20z" fill="var(--accent)" opacity=".72"/><path d="M24 5v37M14 21h20M17 33h14" stroke="var(--dark)" stroke-width="2" stroke-linecap="round"/>',
      'vinewrapped-cargo-net': '<path d="M12 14h24v22H12zM12 21h24M12 29h24M20 14v22M28 14v22" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/><path d="M12 36c9-2 8-18 23-22" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="18" r="3" fill="var(--accent)"/>',
      'rivet-armor-plate': '<path d="M24 6l15 9-4 22-11 5-11-5-4-22z" fill="var(--accent)" opacity=".48" stroke="var(--accent)" stroke-width="3"/><circle cx="18" cy="19" r="2.5" fill="var(--accent)"/><circle cx="30" cy="19" r="2.5" fill="var(--accent)"/><path d="M17 32h14" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'powder-keg-breech': '<path d="M12 18h24v17H12z" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/><path d="M8 27h32M31 8c7 7 5 15-2 20 2-6-2-7 0-13-4 3-5 7-5 12-5-6-2-13 7-19z" fill="var(--accent)"/>',
      'temple-aether-chime': '<path d="M24 6v9M14 34h20M17 15h14l5 20H12z" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="24" cy="36" r="4" fill="var(--accent)"/><path d="M10 20c4-5 7-6 11-7M38 20c-4-5-7-6-11-7" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>',
      'umbral-gyroscope': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="3"/><ellipse cx="24" cy="24" rx="18" ry="7" fill="none" stroke="var(--accent)" stroke-width="3"/><ellipse cx="24" cy="24" rx="7" ry="18" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".65"/><circle cx="24" cy="24" r="5" fill="var(--accent)"/>',
      'ricochet-chamber': '<path d="M10 28h24M12 28l9-16h14" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 9l6 3-6 4" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'gravity-mine': '<circle cx="24" cy="24" r="8" fill="var(--accent)"/><path d="M9 24c4-12 24-12 30 0M13 32c8 8 21 2 26-8" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'harpoon-launcher': '<path d="M9 33l21-21M28 9l11 2-2 11M18 24l7 7" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
      'pulse-dash-core': '<path d="M10 24h16M20 13l12 11-12 11" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="24" r="16" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".55"/>',
      'quantum-rudder': '<path d="M24 7v34M10 33c8-5 20-5 28 0M14 14l10 8 10-8" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="24" r="4" fill="var(--accent)"/>',
      'crystal-conduit': '<path d="M24 5l13 13-13 25-13-25z" fill="var(--accent)" opacity=".82"/><path d="M24 5v38M11 18h26" fill="none" stroke="var(--dark)" stroke-width="2" opacity=".75"/>',
      'interceptor-drone': '<path d="M24 10l14 8v16l-14 8-14-8V18z" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M17 24h14M24 17v14" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'cloudbreaker-ram': '<path d="M8 30l10-15h16l8 15-10 7H18z" fill="var(--accent)" opacity=".82"/><path d="M13 29h28M18 15l-5-6M34 15l5-6" stroke="var(--dark)" stroke-width="3" stroke-linecap="round"/>',
      'storm-core': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M25 8l-6 15h9l-5 17" fill="var(--accent)"/>',
      'lightning-rod-mast': '<path d="M24 7v34M15 13h18M18 22h12" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M30 4l-4 10h7l-7 11" fill="var(--accent)"/>',
      'flame-vent': '<path d="M24 42c-9-4-12-12-5-20 3-4 3-8 1-13 10 5 16 15 10 24 4-2 5-6 5-9 6 8 2 17-11 18z" fill="var(--accent)"/>',
      'ember-engine': '<path d="M12 28h24v10H12z" fill="var(--accent)" opacity=".82"/><path d="M17 28c0-11 6-13 7-22 7 7 10 13 7 22M16 38l-5 5M32 38l5 5" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'leviathan-engine': '<path d="M8 28c7-16 25-16 34 0-8 12-27 12-34 0z" fill="var(--accent)" opacity=".82"/><path d="M17 29h18M13 22l-5-7M35 22l5-7" stroke="var(--dark)" stroke-width="3" stroke-linecap="round"/>',
      'black-horizon-core': '<circle cx="24" cy="24" r="16" fill="var(--dark)"/><path d="M8 25c9-8 24-8 32 0M12 32c8 4 18 4 26 0" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
      'heart-of-the-tempest': '<path d="M24 40C8 28 10 12 21 16c2 1 3 3 3 3s1-2 3-3c11-4 13 12-3 24z" fill="var(--accent)"/><path d="M26 10l-5 12h8l-6 12" fill="var(--dark)" opacity=".75"/>',
      'dead-captains-wheel': '<circle cx="24" cy="24" r="13" fill="none" stroke="var(--accent)" stroke-width="3"/><circle cx="24" cy="24" r="4" fill="var(--accent)"/><path d="M24 5v38M5 24h38M11 11l26 26M37 11L11 37" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>',
      'corrupted-relic': '<path d="M24 6l15 10-4 27H13L9 16z" fill="var(--accent)" opacity=".72"/><path d="M17 16l16 18M32 16L17 34" stroke="var(--dark)" stroke-width="3" stroke-linecap="round"/>',
      'glass-hull': '<path d="M24 5l16 14-5 22H13L8 19z" fill="var(--accent)" opacity=".5"/><path d="M24 5v36M8 19h32M14 40l20-21" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>',
      'void-sail': '<path d="M18 7v34M20 11c12 5 14 16 0 25z" fill="var(--accent)" opacity=".78"/><circle cx="29" cy="25" r="5" fill="var(--dark)"/>',
      'celestial-compass': '<circle cx="24" cy="24" r="15" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M24 8l5 14 13 2-13 4-5 14-5-14-13-4 13-2z" fill="var(--accent)"/>',
      'eclipse-cortex': '<circle cx="24" cy="24" r="17" fill="var(--dark)"/><path d="M8 24c8-10 24-10 32 0-8 10-24 10-32 0z" fill="var(--accent)" opacity=".56"/><circle cx="24" cy="24" r="6" fill="var(--base)"/><path d="M24 5v8M24 35v8M5 24h8M35 24h8" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>',
    };
    const body = icons[id] || '<circle cx="24" cy="24" r="14" fill="var(--accent)"/>';
    return `<svg class="relic-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  renderItemPanel() {
    if (!this.itemsPanel) return;
    const equipped = this.inventory.filter((entry) => entry.equipped && isXpRelic(ITEM_BY_ID[entry.id]));
    const powerups = this.activePowerups
      .filter((entry) => entry.expiresAt > this.time.now)
      .map((entry) => ({ ...entry, item: ITEM_BY_ID[entry.id] }))
      .filter((entry) => entry.item);
    const relicRows = equipped.map((entry) => {
      const item = ITEM_BY_ID[entry.id];
      const next = entry.level >= 5 ? 'MAX' : `${entry.xp}/${getXpToNextLevel(item, entry.level)}`;
      const awakened = entry.level >= 5 ? ' awakened' : '';
      return `
        <li class="item-row${awakened}">
          ${this.renderItemBadge(item)}
          <span class="item-copy">
            <strong>${item.name}</strong>
            <small>Lv ${entry.level} | XP ${next}</small>
          </span>
        </li>
      `;
    }).join('') || '<li class="empty-row">No relics installed yet.</li>';

    const activeItems = powerups.map((entry) => {
      const item = entry.item;
      const remaining = Math.max(0, Math.ceil((entry.expiresAt - this.time.now) / 1000));
      return `
        <span class="item-chip" title="${item.name} - ${item.baseEffect}">
          ${this.renderItemBadge(item)}
          <span>${remaining}s</span>
        </span>
      `;
    }).join('') || '<span class="empty-row">No active power-ups.</span>';

    this.itemsPanel.innerHTML = `
      <div class="items-heading">
        <span>Relic Bay</span>
        <small>${equipped.length}/${MAX_RELIC_SLOTS} equipped</small>
      </div>
      <ul class="item-list">${relicRows}</ul>
      <div class="items-heading compact">
        <span>Power-Ups</span>
      </div>
      <div class="item-grid">${activeItems}</div>
    `;
  }

  getRelicSourceHint(item) {
    if (item.rarity === 'mythic') return 'The Core stirs when it reaches the Heart of the Clouds.';
    const legendaryBiome = BIOME_MAPS.find((biome) => LEGENDARY_RELIC_BY_BIOME[biome.id] === item.id);
    if (legendaryBiome) return '???';
    const bossBiome = BIOME_MAPS.find((biome) => this.getBiomeMeta(biome).bossRelic === item.id);
    if (bossBiome) return this.getBiomeRumor(bossBiome);
    if (item.source.includes('Elite Reward')) return 'Recovered from dangerous raiders and veteran crews.';
    return item.source;
  }

  getBiomeRumor(biome) {
    const rumors = {
      'starter-sky': 'Sighted among bright open trade winds.',
      'storm-fields': 'Found where the sky turns violent and electric.',
      'ash-isles': 'Buried near hot ash vents and burning islands.',
      'crystal-reefs': 'Hidden around glittering reef ruins.',
      'frozen-heights': 'Lost in silent ice-cloud passages.',
      'jungle-islands': 'Whispered about beneath overgrown canopy islands.',
      'industrial-ruins': 'Sealed inside old machine wreckage.',
      'pirate-dens': 'Carried through red-flag pirate territory.',
      'floating-temples': 'Protected near old sky temples.',
      'black-cloud-region': 'Drawn toward the darkest cloud front.',
    };
    return rumors[biome.id] || biome.mood;
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#101927',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [TitleScene, StormwakeScene],
};

document.querySelector('#app').innerHTML = `
  <main class="shell">
    <section class="console">
      <div class="brand">
        <span>Stormwake Isles</span>
        <small>Airship roguelike prototype</small>
      </div>
      <pre id="hud"></pre>
      <section id="items" class="items-panel" aria-label="Relic and item inventory"></section>
    </section>
    <section id="game" class="game"></section>
  </main>
`;

const game = new Phaser.Game(config);
window.__STORMWAKE_GAME__ = game;
window.__STORMWAKE_ITEMS__ = ITEM_BY_ID;
window.__STORMWAKE_DEBUG__ = {
  biomes: BIOME_MAPS.map((biome) => ({ id: biome.id, name: biome.name })),
  enemyVariants: ENCOUNTER_VARIANTS,
  legendaryQuests: LEGENDARY_QUESTS,
  legendaryRelics: LEGENDARY_RELIC_BY_BIOME,
  enemyRelicDrops: ENEMY_RELIC_DROPS_BY_BIOME,
  mythicPuzzles: MYTHIC_PUZZLES,
  mythicRelics: MYTHIC_RELIC_BY_BIOME,
};
