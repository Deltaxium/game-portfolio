import Phaser from 'phaser';
import beachSandTilesUrl from './assets/beach-sand-tiles.png';
import calmWaterUrl from './assets/calm-water-autotiles-anim.png';
import havenShoreCrashUrl from './assets/haven-shore-crash.png';
import movingWaterUrl from './assets/moving-water-open.png';
import oceanWaterUrl from './assets/ocean-autotiles-anim.png';

const WIDTH = 960;
const HEIGHT = 720;

const colors = {
  navy: 0x0d1d2d,
  navyDark: 0x07111d,
  wood: 0x5a3727,
  woodDark: 0x2b1a13,
  brass: 0xb68a3a,
  brassLight: 0xe1c16b,
  parchment: 0xe9d7ad,
  bone: 0xf3e5c4,
  charcoal: 0x101013,
  ember: 0xd9682a,
  crimson: 0x9e2734,
  teal: 0x54b7aa,
  smoke: 0x879097,
  green: 0x8fbe72,
};

const fontStack = '"Trebuchet MS", Verdana, Arial, sans-serif';
const titleFontStack = 'Georgia, "Palatino Linotype", "Times New Roman", serif';

const ui = {
  title: { fontFamily: titleFontStack, fontSize: '30px', color: '#f3e5c4' },
  h2: { fontFamily: titleFontStack, fontSize: '20px', color: '#e1c16b' },
  label: { fontFamily: fontStack, fontSize: '13px', color: '#d9c58e' },
  body: { fontFamily: fontStack, fontSize: '15px', color: '#f3e5c4' },
  small: { fontFamily: fontStack, fontSize: '12px', color: '#c8ced1' },
};

const stances = {
  Boarding: {
    role: 'Aggressive frontline pressure',
    bonus: 'Close attacks gain momentum and extra stagger pressure.',
    weak: 'Suppression and open sightlines punish overextension.',
  },
  Brace: {
    role: 'Defensive stabilization',
    bonus: 'Cover and objective defense improve; panic buildup falls.',
    weak: 'Repositioning is slower and offense generates less tempo.',
  },
  Marksman: {
    role: 'Precision ranged control',
    bonus: 'Exposed targets take more damage and suppression improves.',
    weak: 'Close pressure and smoke weaken effectiveness.',
  },
  Raider: {
    role: 'Mobility and flanking',
    bonus: 'Movement pressure, flank attacks, and objective plays improve.',
    weak: 'Long fights and defensive holds are weaker.',
  },
  Command: {
    role: 'Crew coordination',
    bonus: 'Rallying, surge generation, and formation stability improve.',
    weak: 'Low direct damage and isolated commanders are vulnerable.',
  },
};

const statuses = {
  Burning: { color: colors.ember, note: 'Deals damage each turn and weakens cover.' },
  Suppressed: { color: colors.smoke, note: 'Aggressive movement and momentum are weaker.' },
  Exposed: { color: colors.crimson, note: 'Defense drops and stagger buildup rises.' },
  Panic: { color: colors.crimson, note: 'Movement, reactions, and morale weaken.' },
  'Smoke-Choked': { color: colors.smoke, note: 'Ranged accuracy and sightline control fall.' },
  'Powder-Soaked': { color: colors.ember, note: 'Explosions and burning become more dangerous.' },
  Hooked: { color: colors.teal, note: 'Repositioning options narrow.' },
  Rallying: { color: colors.teal, note: 'Panic resistance and momentum improve.' },
};

const crewTemplate = [
  {
    id: 'captain',
    name: 'Mara Voss',
    role: 'Captain',
    stance: 'Command',
    weapon: 'Cutlass & Pistol',
    hp: 30,
    maxHp: 30,
    pos: { x: 7, y: 2 },
    signature: 'Rallying Orders',
    specialty: 'Crew morale, coordinated surges, and formation recovery.',
    passive: 'Gains Rallying after defeating a staggered enemy.',
  },
  {
    id: 'gunner',
    name: 'Ivo Flint',
    role: 'Gunner',
    stance: 'Marksman',
    weapon: 'Deck Musket',
    hp: 24,
    maxHp: 24,
    pos: { x: 7, y: 3 },
    signature: 'Suppression Fire',
    specialty: 'Sightline control, exposed target punishment, and powder combos.',
    passive: 'Marksman attacks can Suppress at long range.',
  },
  {
    id: 'raider',
    name: 'Sel Crow',
    role: 'Boarder',
    stance: 'Raider',
    weapon: 'Hook Blades',
    hp: 27,
    maxHp: 27,
    pos: { x: 7, y: 4 },
    signature: 'Grapple Work',
    specialty: 'Flanking, repositioning, and objective pressure.',
    passive: 'Flank attacks build extra stagger and Exposed.',
  },
];

const enemyTemplate = [
  {
    id: 'bilgerunner',
    name: 'Bilgerunner',
    role: 'Reckless boarding attacker',
    stance: 'Boarding',
    hp: 18,
    maxHp: 18,
    pos: { x: 1, y: 2 },
    statuses: [],
    intent: 'Aggressive push',
    weakness: 'Staggers if suppressed or flanked before charging.',
  },
  {
    id: 'powder-monkey',
    name: 'Powder Monkey',
    role: 'Explosive disruptor',
    stance: 'Raider',
    hp: 16,
    maxHp: 16,
    pos: { x: 2, y: 4 },
    statuses: ['Powder-Soaked'],
    intent: 'Light powder stores',
    weakness: 'Explosives backfire when interrupted.',
  },
  {
    id: 'blackscope',
    name: 'Blackscope',
    role: 'Deck sharpshooter',
    stance: 'Marksman',
    hp: 15,
    maxHp: 15,
    pos: { x: 2, y: 1 },
    statuses: [],
    intent: 'Pin exposed crew',
    weakness: 'Loses focus when flanked or Smoke-Choked.',
  },
  {
    id: 'hullguard',
    name: 'Hullguard',
    role: 'Heavy defensive pirate',
    stance: 'Brace',
    hp: 24,
    maxHp: 24,
    pos: { x: 1, y: 3 },
    statuses: [],
    intent: 'Hold the powder store',
    weakness: 'Defense collapses under multi-angle pressure.',
  },
];

const terrainDefs = {
  deck: { label: 'Open Deck', move: 1, elevation: 0, visibility: 'Clear', spread: 'Low' },
  rail: { label: 'Ship Railing', move: 2, elevation: 0, cover: 8, protection: 30, visibility: 'Clear', spread: 'Low' },
  crate: { label: 'Cargo Crates', move: 2, elevation: 0, cover: 12, protection: 45, visibility: 'Partial', spread: 'Medium' },
  powder: { label: 'Powder Barrel', move: 2, elevation: 0, cover: 6, protection: 25, hazard: 'Explosion risk', spread: 'High' },
  smoke: { label: 'Smoke Bank', move: 2, elevation: 0, hazard: 'Smoke-Choked', visibility: 'Poor', spread: 'Medium' },
  fire: { label: 'Burning Debris', move: 3, elevation: 0, hazard: 'Burning', visibility: 'Poor', spread: 'High' },
  mast: { label: 'Mast Platform', move: 2, elevation: 1, cover: 10, protection: 35, visibility: 'High', spread: 'Medium' },
  objective: { label: 'Powder Store', move: 1, elevation: 0, cover: 14, protection: 40, visibility: 'Clear', spread: 'High' },
};

const mapTiles = [
  ['deck', 'deck', 'mast', 'deck', 'crate', 'deck', 'rail', 'deck', 'deck'],
  ['rail', 'deck', 'deck', 'smoke', 'deck', 'crate', 'deck', 'deck', 'rail'],
  ['deck', 'crate', 'deck', 'deck', 'deck', 'deck', 'powder', 'deck', 'deck'],
  ['deck', 'objective', 'deck', 'fire', 'deck', 'crate', 'deck', 'deck', 'rail'],
  ['deck', 'deck', 'powder', 'deck', 'smoke', 'deck', 'deck', 'rail', 'deck'],
  ['rail', 'deck', 'deck', 'deck', 'crate', 'deck', 'mast', 'deck', 'deck'],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeInitialState() {
  return {
    resources: {
      coin: 80,
      lumber: 6,
      scrap: 5,
      blackPowder: 3,
      supplies: 4,
      reputation: 1,
    },
    haven: {
      forge: 0,
      tavern: 0,
      drydock: 1,
      training: 0,
      infirmary: 0,
      watchtower: 0,
    },
    shipSupport: 'boardingHooks',
    momentumIdentity: 'Tidebreak Crew',
    crew: clone(crewTemplate),
    navigationMessage: 'Sail from the haven and choose your next risk.',
    pendingHavenSummary: null,
    havenZone: 'docks',
    havenPlayerByZone: null,
    battleWon: false,
  };
}

const havenProjects = {
  forge: {
    name: 'Forge',
    reward: 'Weapon upgrades and advanced equipment.',
    cost: { lumber: 2, scrap: 3, coin: 12 },
    color: colors.ember,
  },
  tavern: {
    name: 'Tavern',
    reward: 'Recruits, rumors, and morale support.',
    cost: { lumber: 4, coin: 18 },
    color: colors.brass,
  },
  training: {
    name: 'Training Yard',
    reward: 'New abilities and tactical growth.',
    cost: { lumber: 3, scrap: 2, coin: 14 },
    color: colors.green,
  },
  infirmary: {
    name: 'Infirmary',
    reward: 'Recovery, injury stability, and resistance.',
    cost: { lumber: 3, supplies: 2, coin: 10 },
    color: colors.parchment,
  },
  watchtower: {
    name: 'Watchtower',
    reward: 'Encounter previews and scouting information.',
    cost: { lumber: 3, scrap: 2, coin: 16 },
    color: colors.smoke,
  },
};

const archivedHavenUi = {
  preparation: {
    title: 'Haven Preparation',
    description: 'Tune weapons, stances, supplies, tactical roles, and ship support. Crew identity comes from the pirates themselves.',
    crewFields: ['name', 'role', 'weapon', 'stance', 'signature', 'specialty', 'passive'],
    momentumIdentity: 'Computed from crew stances and ship support.',
    shipSupport: ['boardingHooks', 'smokeLaunchers', 'reinforcedHull', 'improvedCannons'],
  },
  commandBoard: {
    title: 'Command Board',
    selectedMemberFields: ['name', 'stance role', 'signature', 'specialty', 'light passive'],
    actions: ['Cycle ship support', 'Manual saves', 'Sail', 'Battle Drill'],
  },
};

const HAVEN_TILE = 40;
const HAVEN_MAP_X = 80;
const HAVEN_MAP_Y = 82;

const havenMaps = {
  docks: {
    name: 'Haven Docks',
    spawn: { x: 2, y: 7 },
    ship: { x: 18.2, y: 5.2, scale: 1.2 },
    tiles: [
      'ggggr~~~~~~~~~~~~~~~',
      'gpppgr~~~~~~~~~~~~~~',
      'gppppgr~~~~d~~~~~~~~',
      'gpppppgr~~~d~~~~~~~~',
      'gppppppgr~~ddddd~~~~',
      'gpppppppddd~d~~~~~~~',
      'ppppppppddddddddd~~~',
      'ppppppppp~~~d~~~d~~~',
      'gppppLppp~~~dddd~~~~',
      'gpppppppp~~~d~~d~~~~',
      'ggppppgr~~~~d~~d~~~~',
      'gggppggr~~~~d~~d~~~~',
      'gggggr~~~~~~d~~~~~~~',
      'gggg~~~~~~~~~~~~~~~~',
    ],
    lots: [],
    exits: [
      { type: 'zone', label: 'Village', grid: { x: 0, y: 7 }, target: 'village', targetGrid: { x: 18, y: 7 }, auto: true, prompt: 'Enter the barren center of the haven.' },
      { type: 'sail', label: 'Ship', grid: { x: 16, y: 6 }, prompt: 'Board the ship and depart for the charted waters.' },
      { type: 'save', label: 'Ledger', grid: { x: 7, y: 8 }, prompt: 'Record the voyage in Slot 1.' },
    ],
  },
  village: {
    name: 'Haven Center',
    spawn: { x: 18, y: 7 },
    tiles: [
      'ssssssrrrsssssssssss',
      'sssppppppppppppsssss',
      'ssppTppppppFppppssss',
      'ssppppprrpppppppssss',
      'ssppYppppppppWpppsss',
      'ssppppppDppppppppsss',
      'ssppIppppprrppppppss',
      'sspppppppppppppppppp',
      'ssspppprrpppppppppps',
      'ssssppppppppppppppss',
      'sssssppppprrpppppsss',
      'ssssssppppppppppssss',
      'ssssssssppppppssssss',
      'ssssssssssssssssssss',
    ],
    lots: ['tavern', 'forge', 'training', 'infirmary', 'watchtower', 'drydock'],
    exits: [
      { type: 'zone', label: 'Docks', grid: { x: 19, y: 7 }, target: 'docks', targetGrid: { x: 1, y: 7 }, auto: true, prompt: 'Return to the harbor docks.' },
    ],
  },
  training: {
    name: 'Training Yard',
    spawn: { x: 10, y: 11 },
    tiles: [
      '~~~~~~~~ssssssss~~~~',
      '~~~~~~ssssggggsss~~~',
      '~~~~ssssgggggggsss~~',
      '~~~ssspppppppppsss~~',
      '~~sssppppYpppppsss~~',
      '~~ssgppppppppppsss~~',
      '~~ssgppppppppppsss~~',
      '~~ssgppppppppppsss~~',
      '~~~sspppppppppsss~~~',
      '~~~~ssppppppsss~~~~~',
      '~~~~~ssppppsss~~~~~~',
      '~~~~~~ssppps~~~~~~~~',
      '~~~~~~~ssps~~~~~~~~~',
      '~~~~~~~~sss~~~~~~~~~',
    ],
    lots: ['training'],
    exits: [
      { type: 'zone', label: 'Docks', grid: { x: 10, y: 12 }, target: 'docks', targetGrid: { x: 10, y: 2 }, prompt: 'Head back down to the docks.' },
    ],
  },
  lookout: {
    name: 'Watchtower Rise',
    spawn: { x: 9, y: 11 },
    tiles: [
      '~~~~~~~ssssss~~~~~~~',
      '~~~~~ssssggssss~~~~~',
      '~~~~ssgggggggss~~~~~',
      '~~~ssgggrrgggsss~~~~',
      '~~~sggggWggggsss~~~~',
      '~~ssggggppgggsss~~~~',
      '~~ssgggppppggsss~~~~',
      '~~~ssgppppppssss~~~~',
      '~~~~ssppppppsss~~~~~',
      '~~~~~ssppppsss~~~~~~',
      '~~~~~~sppppss~~~~~~~',
      '~~~~~~sppps~~~~~~~~~',
      '~~~~~~ssss~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~',
    ],
    lots: ['watchtower'],
    exits: [
      { type: 'zone', label: 'Village', grid: { x: 9, y: 12 }, target: 'village', targetGrid: { x: 10, y: 1 }, prompt: 'Descend toward the village.' },
    ],
  },
};

const havenTileInfo = {
  '~': { kind: 'water', walkable: false },
  's': { kind: 'sand', walkable: true },
  'g': { kind: 'scrub', walkable: true },
  'p': { kind: 'path', walkable: true },
  'd': { kind: 'dock', walkable: true },
  'r': { kind: 'rock', walkable: false },
  'b': { kind: 'brush', walkable: false },
  C: { kind: 'camp', walkable: true },
  D: { kind: 'drydock', walkable: true },
  F: { kind: 'project', project: 'forge', walkable: true },
  T: { kind: 'project', project: 'tavern', walkable: true },
  Y: { kind: 'project', project: 'training', walkable: true },
  I: { kind: 'project', project: 'infirmary', walkable: true },
  W: { kind: 'project', project: 'watchtower', walkable: true },
  L: { kind: 'save', walkable: true },
  B: { kind: 'path', walkable: true },
  O: { kind: 'sail', walkable: true },
};

const oceanWaveFrames = {
  open: [60, 61, 62, 63],
  openAlt: [20, 21, 22, 23],
  sandWaterSouth: [4, 5, 6, 7],
  sandWaterNorth: [36, 37, 38, 39],
  sandWaterEast: [16, 17, 18, 19],
  sandWaterWest: [24, 25, 26, 27],
  cornerNorthWest: [28, 29, 30, 31],
  cornerNorthEast: [12, 13, 14, 15],
  cornerSouthWest: [40, 41, 42, 43],
  cornerSouthEast: [44, 45, 46, 47],
  shallow: [9, 10, 11, 10],
};

const havenShoreCrashFrames = {
  sandWaterSouth: [0, 1, 2, 3],
  sandWaterNorth: [4, 5, 6, 7],
  sandWaterEast: [8, 9, 10, 11],
  sandWaterWest: [12, 13, 14, 15],
  cornerNorthWest: [16, 17, 18, 19],
  cornerNorthEast: [20, 21, 22, 23],
  cornerSouthWest: [24, 25, 26, 27],
  cornerSouthEast: [28, 29, 30, 31],
};

const SAVE_SLOTS = [1, 2, 3];
const AUTO_SAVE_KEY = 'blackwake-tactics-autosave-v1';
const SLOT_KEYS = [
  'blackwake-tactics-save-v1-slot-1',
  'blackwake-tactics-save-v1-slot-2',
  'blackwake-tactics-save-v1-slot-3',
];

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function savePayload(key, state, slot = 'auto') {
  if (!storageAvailable()) return null;
  const payload = {
    version: 1,
    slot,
    savedAt: new Date().toISOString(),
    state: clone(state),
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
  return payload;
}

function loadPayload(key) {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.state) return null;
    return {
      ...makeInitialState(),
      ...payload.state,
      resources: {
        ...makeInitialState().resources,
        ...(payload.state.resources || {}),
      },
      haven: {
        ...makeInitialState().haven,
        ...(payload.state.haven || {}),
      },
      crew: Array.isArray(payload.state.crew) ? payload.state.crew : clone(crewTemplate),
      savedAt: payload.savedAt,
      slot: payload.slot,
    };
  } catch {
    return null;
  }
}

function saveAutoGame(state) {
  return savePayload(AUTO_SAVE_KEY, state, 'auto');
}

function loadAutoGame() {
  return loadPayload(AUTO_SAVE_KEY);
}

function saveGameSlot(slot, state) {
  return savePayload(SLOT_KEYS[slot - 1] || SLOT_KEYS[0], state, slot);
}

function loadGameSlot(slot) {
  return loadPayload(SLOT_KEYS[slot - 1] || SLOT_KEYS[0]);
}

function deleteSave(slot) {
  if (!storageAvailable()) return;
  if (slot === 'auto') window.localStorage.removeItem(AUTO_SAVE_KEY);
  else window.localStorage.removeItem(SLOT_KEYS[slot - 1] || SLOT_KEYS[0]);
}

function getSaveInfo(slot) {
  const state = slot === 'auto' ? loadAutoGame() : loadGameSlot(slot);
  if (!state?.savedAt) return null;
  return {
    slot,
    label: new Date(state.savedAt).toLocaleString(),
    coin: state.resources?.coin ?? 0,
    supplies: state.resources?.supplies ?? 0,
    reputation: state.resources?.reputation ?? 0,
    identity: state.momentumIdentity || 'Tidebreak Crew',
    scene: state.lastScene || 'Haven',
  };
}

function getState(scene) {
  if (!scene.registry.get('gameState')) scene.registry.set('gameState', loadAutoGame() || makeInitialState());
  return scene.registry.get('gameState');
}

function setSceneCheckpoint(scene, sceneName) {
  const state = getState(scene);
  state.lastScene = sceneName;
  saveAutoGame(state);
  return state;
}

function drawPanel(scene, x, y, width, height, alpha = 0.92) {
  const g = scene.add.graphics();
  g.fillStyle(colors.navyDark, alpha);
  g.fillRoundedRect(x, y, width, height, 6);
  g.lineStyle(2, colors.wood, 1);
  g.strokeRoundedRect(x, y, width, height, 6);
  g.lineStyle(1, colors.brass, 0.45);
  g.strokeRoundedRect(x + 4, y + 4, width - 8, height - 8, 4);
  return g;
}

function button(scene, x, y, width, label, onClick, tone = colors.brass) {
  const bg = scene.add.rectangle(x, y, width, 38, tone, 0.95).setOrigin(0).setStrokeStyle(2, colors.charcoal, 0.9);
  bg.setInteractive({ useHandCursor: true });
  const text = scene.add.text(x + width / 2, y + 19, label, {
    ...ui.label,
    color: tone === colors.brass ? '#17100c' : '#f3e5c4',
  }).setOrigin(0.5);
  bg.on('pointerover', () => bg.setFillStyle(colors.brassLight));
  bg.on('pointerout', () => bg.setFillStyle(tone));
  bg.on('pointerdown', onClick);
  return [bg, text];
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function terrainAt(pos) {
  return terrainDefs[mapTiles[pos.y]?.[pos.x] || 'deck'];
}

function statusLine(unit) {
  return unit.statuses?.length ? unit.statuses.join(', ') : 'None';
}

function laneFor(pos) {
  if (pos.x <= 2) return 'Enemy Deck';
  if (pos.x <= 5) return 'Midship';
  return 'Crew Deck';
}

function isSamePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function occupied(pos, units) {
  return units.some((unit) => unit.hp > 0 && isSamePos(unit.pos, pos));
}

function computeIdentity(crew, support) {
  const counts = crew.reduce((acc, member) => {
    acc[member.stance] = (acc[member.stance] || 0) + 1;
    return acc;
  }, {});
  if (counts.Command && counts.Boarding) return 'Black Flag Command';
  if (counts.Raider >= 2 || support === 'boardingHooks') return 'Hookstorm Raiders';
  if (counts.Marksman && counts.Brace) return 'Gunline Wardens';
  if (counts.Boarding >= 2) return 'Red Deck Rush';
  return 'Tidebreak Crew';
}

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.spritesheet('calm-water-autotiles', calmWaterUrl, { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('beach-sand-tiles', beachSandTilesUrl, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('haven-shore-crash', havenShoreCrashUrl, { frameWidth: 40, frameHeight: 40 });
    this.load.spritesheet('moving-water-open', movingWaterUrl, { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('ocean-autotiles', oceanWaterUrl, { frameWidth: 47, frameHeight: 45 });
  }

  create() {
    this.registry.set('gameState', loadAutoGame() || makeInitialState());
    this.scene.start('TitleScene');
  }
}

class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    this.promptObjects = [];
    this.selectedLoadSlot = getSaveInfo('auto') ? 'auto' : this.firstFilledSlot();
    this.loadOpen = false;
    this.input.keyboard.on('keydown-ENTER', () => this.newGame());
    this.input.keyboard.on('keydown-SPACE', () => this.newGame());
    this.input.keyboard.on('keydown-N', () => this.newGame());
    this.input.keyboard.on('keydown-C', () => this.continueAuto());
    this.input.keyboard.on('keydown-L', () => this.openLoad());
    this.input.keyboard.on('keydown-D', () => {
      if (this.loadOpen) this.confirmDelete(this.selectedLoadSlot);
    });
    this.input.keyboard.on('keydown-ESC', () => this.clearPrompt());
    this.input.keyboard.on('keydown-ONE', () => this.selectLoadSlot('auto'));
    this.input.keyboard.on('keydown-TWO', () => this.selectLoadSlot(1));
    this.input.keyboard.on('keydown-THREE', () => this.selectLoadSlot(2));
    this.input.keyboard.on('keydown-FOUR', () => this.selectLoadSlot(3));
    this.draw();
  }

  draw() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(colors.navyDark);
    this.drawSea(0.22);
    this.drawTitleFrame();
    this.drawChartTable();
    this.drawLanterns();
    this.drawShip(704, 328, 0.95, colors.wood, colors.brass);
    this.drawCompass(720, 496);
    this.drawGauges();
    this.drawTitleLockup();
    this.drawLedger();
  }

  drawSea(alpha) {
    const g = this.add.graphics();
    for (let y = 0; y < HEIGHT; y += 24) {
      g.lineStyle(1, colors.teal, alpha);
      g.beginPath();
      for (let x = -20; x < WIDTH + 20; x += 40) {
        const wave = Math.sin((x + y) * 0.035) * 5;
        if (x === -20) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
  }

  drawShip(x, y, scale, hull, sail) {
    const g = this.add.graphics();
    g.fillStyle(hull, 1);
    g.fillTriangle(x - 80 * scale, y + 42 * scale, x + 90 * scale, y + 42 * scale, x + 52 * scale, y + 82 * scale);
    g.fillTriangle(x - 80 * scale, y + 42 * scale, x - 24 * scale, y + 82 * scale, x + 52 * scale, y + 82 * scale);
    g.lineStyle(4, colors.charcoal, 1);
    g.strokeTriangle(x - 80 * scale, y + 42 * scale, x + 90 * scale, y + 42 * scale, x + 52 * scale, y + 82 * scale);
    g.lineStyle(5, colors.woodDark, 1);
    g.lineBetween(x, y + 42 * scale, x, y - 90 * scale);
    g.fillStyle(sail, 0.92);
    g.fillTriangle(x + 6 * scale, y - 86 * scale, x + 6 * scale, y + 30 * scale, x + 94 * scale, y + 8 * scale);
    g.fillStyle(colors.parchment, 0.85);
    g.fillTriangle(x - 8 * scale, y - 70 * scale, x - 8 * scale, y + 22 * scale, x - 92 * scale, y + 6 * scale);
  }

  drawTitleFrame() {
    this.add.rectangle(480, 360, 858, 612, 0x000000, 0).setStrokeStyle(4, colors.wood, 0.98);
    this.add.rectangle(480, 360, 828, 580, 0x000000, 0).setStrokeStyle(2, colors.brass, 0.44);
    this.add.rectangle(480, 74, 744, 8, colors.brass, 0.88);
    this.add.rectangle(480, 646, 744, 8, colors.brass, 0.88);
    for (const x of [70, 890]) {
      this.add.rectangle(x, 360, 18, 580, colors.woodDark, 0.92).setStrokeStyle(2, colors.wood);
      for (let y = 106; y <= 616; y += 46) {
        this.add.circle(x, y, 5, colors.brassLight, 0.76).setStrokeStyle(1, colors.charcoal);
      }
    }
  }

  drawChartTable() {
    const g = this.add.graphics();
    g.fillStyle(0x0a1724, 0.78);
    g.fillRoundedRect(104, 100, 752, 506, 10);
    g.lineStyle(2, colors.wood, 0.9);
    g.strokeRoundedRect(104, 100, 752, 506, 10);
    g.fillStyle(0x12364a, 0.34);
    g.fillRoundedRect(134, 220, 356, 300, 8);
    g.lineStyle(1, colors.teal, 0.3);
    for (let y = 246; y <= 500; y += 28) {
      g.beginPath();
      for (let x = 148; x <= 472; x += 26) {
        const wave = Math.sin((x + y) * 0.05) * 4;
        if (x === 148) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
    g.fillStyle(colors.parchment, 0.14);
    g.fillCircle(240, 340, 54);
    g.fillCircle(378, 418, 42);
    g.lineStyle(3, colors.brass, 0.7);
    g.lineBetween(184, 456, 450, 270);
    g.lineStyle(2, colors.crimson, 0.8);
    g.strokeCircle(392, 300, 24);
    g.strokeCircle(236, 436, 20);
    this.add.text(160, 232, 'SEA CHART', { ...ui.label, color: '#e1c16b' });
    this.add.text(166, 480, 'Navy Patrols  |  Wreck Sites  |  Storm Banks', { ...ui.small, fontSize: '10px' });
  }

  drawLanterns() {
    [150, 810].forEach((x, index) => {
      this.add.line(x, 102, 0, 0, 0, 58, colors.wood, 0.9).setLineWidth(3);
      const lantern = this.add.circle(x, 176, 22, colors.ember, 0.38).setStrokeStyle(2, colors.brass);
      this.add.circle(x, 176, 9, colors.brassLight, 0.92);
      this.tweens.add({
        targets: lantern,
        alpha: 0.18,
        scale: 1.12,
        duration: 1100 + index * 260,
        yoyo: true,
        repeat: -1,
      });
    });
  }

  drawCompass(x, y) {
    this.add.circle(x, y, 54, 0x0b1520, 0.94).setStrokeStyle(4, colors.brass);
    this.add.circle(x, y, 42, colors.parchment, 0.86).setStrokeStyle(2, colors.wood);
    ['N', 'E', 'S', 'W'].forEach((label, index) => {
      const angle = Phaser.Math.DegToRad(index * 90 - 90);
      this.add.text(x + Math.cos(angle) * 30, y + Math.sin(angle) * 30, label, { ...ui.label, color: '#17100c' }).setOrigin(0.5);
    });
    this.add.line(x, y, 0, 0, 0, -31, colors.crimson, 1).setLineWidth(4);
    this.add.line(x, y, 0, 0, 21, 20, colors.charcoal, 0.75).setLineWidth(3);
    this.add.circle(x, y, 5, colors.charcoal);
  }

  drawGauges() {
    this.drawTitleGauge(602, 486, 'MORALE', colors.teal, 28);
    this.drawTitleGauge(816, 486, 'DANGER', colors.crimson, -20);
  }

  drawTitleGauge(x, y, label, color, needleAngle) {
    this.add.circle(x, y, 30, 0x0b1520, 0.96).setStrokeStyle(3, colors.brass);
    this.add.circle(x, y, 22, colors.parchment, 0.88).setStrokeStyle(1, colors.wood);
    for (let i = 0; i < 5; i += 1) {
      const angle = Phaser.Math.DegToRad(210 + i * 30);
      this.add.line(x + Math.cos(angle) * 17, y + Math.sin(angle) * 17, 0, 0, Math.cos(angle) * 5, Math.sin(angle) * 5, colors.charcoal, 0.72).setLineWidth(1);
    }
    const needle = Phaser.Math.DegToRad(needleAngle - 90);
    this.add.line(x, y, 0, 0, Math.cos(needle) * 16, Math.sin(needle) * 16, color, 1).setLineWidth(3);
    this.add.circle(x, y, 4, colors.charcoal);
    this.add.text(x, y + 39, label, { ...ui.small, color: '#e1c16b', fontSize: '10px' }).setOrigin(0.5);
  }

  drawTitleLockup() {
    this.add.text(480, 126, 'BLACKWAKE', { ...ui.title, fontSize: '58px', color: '#f3e5c4' }).setOrigin(0.5).setStroke('#07111d', 6);
    this.add.text(480, 174, 'TACTICS', { ...ui.title, fontSize: '32px', color: '#e1c16b' }).setOrigin(0.5).setStroke('#07111d', 4);
    this.add.text(480, 206, 'A PIRATE TACTICAL RPG PROTOTYPE', { ...ui.label, color: '#54b7aa' }).setOrigin(0.5);
    this.add.rectangle(480, 226, 394, 5, colors.wood, 0.9);
    this.add.rectangle(480, 234, 254, 3, colors.brass, 0.88);
  }

  drawLedger() {
    const autoInfo = getSaveInfo('auto');
    const canLoad = Boolean(autoInfo || SAVE_SLOTS.some((slot) => getSaveInfo(slot)));
    drawPanel(this, 190, 282, 300, 218, 0.94);
    this.add.text(216, 302, 'Captain\'s Ledger', ui.h2);
    this.drawTitleButton(216, 338, 248, 'New Game', 'N', () => this.newGame(), true);
    this.drawTitleButton(216, 382, 248, 'Continue', 'C', () => this.continueAuto(), Boolean(autoInfo));
    this.drawTitleButton(216, 426, 248, 'Load Game', 'L', () => this.openLoad(), canLoad);
    this.add.text(518, 536, 'Enter/Space starts a new game. Saves use browser local storage.', {
      ...ui.small,
      wordWrap: { width: 290 },
      align: 'center',
    }).setOrigin(0.5);
  }

  drawTitleButton(x, y, width, label, key, onClick, enabled) {
    const tone = enabled ? colors.wood : 0x262b30;
    this.add.rectangle(x + 4, y + 5, width, 34, colors.charcoal, 0.54).setOrigin(0);
    const bg = this.add.rectangle(x, y, width, 34, tone, enabled ? 0.98 : 0.68).setOrigin(0).setStrokeStyle(2, enabled ? colors.brass : colors.smoke, enabled ? 0.65 : 0.32);
    this.add.text(x + 14, y + 8, label, { ...ui.label, color: enabled ? '#f3e5c4' : '#879097' });
    this.add.text(x + width - 24, y + 8, `(${key})`, { ...ui.small, color: enabled ? '#e1c16b' : '#879097' }).setOrigin(0.5, 0);
    if (!enabled) return;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(colors.brass, 0.96));
    bg.on('pointerout', () => bg.setFillStyle(tone, 0.98));
    bg.on('pointerdown', onClick);
  }

  clearPrompt() {
    this.promptObjects.forEach((object) => object.destroy());
    this.promptObjects = [];
    this.loadOpen = false;
  }

  capturePrompt(callback) {
    this.clearPrompt();
    const existing = new Set(this.children.list);
    callback();
    this.promptObjects = this.children.list.filter((object) => !existing.has(object));
  }

  drawPromptShell(title, body, height = 210) {
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.5).setDepth(200).setInteractive();
    drawPanel(this, 236, 236, 488, height, 0.98).setDepth(201);
    this.add.text(268, 260, title, { ...ui.h2, fontSize: '24px' }).setDepth(202);
    this.add.text(268, 294, body, { ...ui.small, color: '#f3e5c4', wordWrap: { width: 420 }, lineSpacing: 4 }).setDepth(202);
  }

  newGame() {
    const next = makeInitialState();
    next.lastScene = 'Haven';
    this.registry.set('gameState', next);
    saveAutoGame(next);
    this.scene.start('HavenScene');
  }

  continueAuto() {
    const saved = loadAutoGame();
    if (!saved) return;
    this.registry.set('gameState', saved);
    this.routeLoadedState(saved);
  }

  firstFilledSlot() {
    if (getSaveInfo('auto')) return 'auto';
    return SAVE_SLOTS.find((slot) => getSaveInfo(slot)) || 1;
  }

  selectLoadSlot(slot) {
    if (!this.loadOpen) return;
    if (!getSaveInfo(slot)) return;
    this.selectedLoadSlot = slot;
    this.openLoad();
  }

  openLoad() {
    const canLoad = Boolean(getSaveInfo('auto') || SAVE_SLOTS.some((slot) => getSaveInfo(slot)));
    if (!canLoad) return;
    this.loadOpen = true;
    this.capturePrompt(() => {
      this.loadOpen = true;
      this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.5).setDepth(200).setInteractive();
      drawPanel(this, 214, 112, 532, 500, 0.98).setDepth(201);
      this.add.text(250, 138, 'Load Game', { ...ui.h2, fontSize: '26px' }).setDepth(202);
      this.add.text(250, 174, 'Choose an autosave or manual slot. Press L to load, D to delete, or Esc to close.', {
        ...ui.small,
        color: '#f3e5c4',
        wordWrap: { width: 450 },
      }).setDepth(202);
      this.drawSaveRow(250, 218, 'auto', getSaveInfo('auto'), 1);
      SAVE_SLOTS.forEach((slot, index) => this.drawSaveRow(250, 290 + index * 66, slot, getSaveInfo(slot), index + 2));
      button(this, 250, 548, 112, 'Load', () => this.loadSelected(), colors.brass).forEach((object) => object.setDepth?.(203));
      button(this, 424, 548, 112, 'Delete', () => this.confirmDelete(this.selectedLoadSlot), colors.crimson).forEach((object) => object.setDepth?.(203));
      button(this, 598, 548, 112, 'Back', () => this.clearPrompt(), colors.teal).forEach((object) => object.setDepth?.(203));
    });
  }

  drawSaveRow(x, y, slot, info, keyIndex) {
    const selected = this.selectedLoadSlot === slot && info;
    const bg = this.add.rectangle(x, y, 460, 52, selected ? colors.brass : colors.charcoal, selected ? 0.9 : 0.42).setOrigin(0).setStrokeStyle(2, selected ? colors.charcoal : colors.brass, selected ? 0.85 : 0.25).setDepth(202);
    const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
    this.add.text(x + 12, y + 8, `${label} (${keyIndex})`, { ...ui.label, color: selected ? '#17100c' : info ? '#f3e5c4' : '#879097', wordWrap: { width: 104 } }).setDepth(203);
    const detail = info
      ? `${info.label} | ${info.scene} | Coin ${info.coin} | Supplies ${info.supplies} | Rep ${info.reputation} | ${info.identity}`
      : 'Empty slot';
    this.add.text(x + 124, y + 12, detail, { ...ui.small, color: selected ? '#17100c' : info ? '#f3e5c4' : '#879097', wordWrap: { width: 300 }, lineSpacing: 2 }).setDepth(203);
    if (!info) return;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      this.selectedLoadSlot = slot;
      this.openLoad();
    });
  }

  loadSelected() {
    const saved = this.selectedLoadSlot === 'auto' ? loadAutoGame() : loadGameSlot(this.selectedLoadSlot);
    if (!saved) return;
    this.registry.set('gameState', saved);
    this.routeLoadedState(saved);
  }

  confirmDelete(slot) {
    if (!getSaveInfo(slot)) return;
    const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
    this.capturePrompt(() => {
      this.drawPromptShell('Delete Save?', `Delete ${label}? This removes that saved voyage from browser storage.`, 188);
      button(this, 278, 364, 126, 'Delete', () => {
        deleteSave(slot);
        this.selectedLoadSlot = this.firstFilledSlot();
        if (getSaveInfo('auto') || SAVE_SLOTS.some((slot) => getSaveInfo(slot))) this.openLoad();
        else this.clearPrompt();
      }, colors.crimson).forEach((object) => object.setDepth?.(203));
      button(this, 556, 364, 126, 'Back', () => this.openLoad(), colors.teal).forEach((object) => object.setDepth?.(203));
    });
  }

  routeLoadedState(state) {
    if (state.lastScene === 'Navigation') this.scene.start('NavigationScene');
    else if (state.lastScene === 'Battle') this.scene.start('BattleScene');
    else this.scene.start('HavenScene');
  }
}

class HavenScene extends Phaser.Scene {
  constructor() {
    super('HavenScene');
  }

  create() {
    this.state = setSceneCheckpoint(this, 'Haven');
    this.zoneId = havenMaps[this.state.havenZone] ? this.state.havenZone : 'docks';
    if (!['docks', 'village'].includes(this.zoneId)) this.zoneId = 'village';
    this.state.havenZone = this.zoneId;
    this.player = this.state.havenPlayerByZone?.[this.zoneId] || (this.zoneId === 'docks' ? this.state.havenPlayer : null) || this.gridToHavenWorld(this.currentHavenMap().spawn);
    if (!this.canStandAt(this.player.x, this.player.y)) this.player = this.gridToHavenWorld(this.currentHavenMap().spawn);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE');
    this.draw();
  }

  update() {
    const speed = 2.4;
    let dx = 0;
    let dy = 0;
    if (this.keys.A.isDown) {
      dx -= speed;
    }
    if (this.keys.D.isDown) {
      dx += speed;
    }
    if (this.keys.W.isDown) {
      dy -= speed;
    }
    if (this.keys.S.isDown) {
      dy += speed;
    }
    if (dx || dy) {
      this.movePlayer(dx, dy);
      this.state.havenPlayerByZone ||= {};
      this.state.havenPlayerByZone[this.zoneId] = { ...this.player };
      this.refreshPlayerMarker();
      this.refreshContextText();
      this.checkAutoHavenTransition();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.tryHavenInteraction();
  }

  draw() {
    this.clearHavenWaterAnimations();
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(colors.navy);
    this.drawHavenBackdrop();
    this.drawHavenLevel();
    this.drawPlayerMarker();
    this.drawContextPrompt();
    this.drawHavenSummary();
  }

  drawHavenBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x0b3446, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    for (let y = 28; y < HEIGHT; y += 34) {
      g.lineStyle(2, colors.teal, 0.16);
      g.beginPath();
      for (let x = -16; x <= WIDTH + 16; x += 32) {
        const wave = Math.sin((x + y) * 0.03) * 7;
        if (x === -16) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
  }

  drawHavenLevel() {
    this.drawHavenMapFrame();
    const tiles = this.currentHavenTiles();
    for (let y = 0; y < tiles.length; y += 1) {
      for (let x = 0; x < tiles[y].length; x += 1) {
        this.drawHavenTile(x, y);
      }
    }
    this.drawHavenMapOverlays();
    this.getHavenLots().forEach((lot) => this.drawHavenLot(lot));
    const ship = this.currentHavenMap().ship;
    if (ship) this.drawDockShip(...Object.values(this.gridToHavenWorld(ship)), ship.scale || 1);
    if (this.zoneId === 'docks') this.drawShipBoardingGangway();
  }

  drawDockShip(x, y, scale = 1) {
    const g = this.add.graphics();
    g.fillStyle(colors.woodDark, 0.92);
    g.fillTriangle(x - 84 * scale, y - 10 * scale, x + 118 * scale, y - 10 * scale, x + 76 * scale, y + 38 * scale);
    g.fillStyle(colors.wood, 1);
    g.fillTriangle(x - 70 * scale, y - 22 * scale, x + 108 * scale, y - 20 * scale, x + 70 * scale, y + 24 * scale);
    g.lineStyle(4, colors.charcoal, 0.9);
    g.strokeTriangle(x - 70 * scale, y - 22 * scale, x + 108 * scale, y - 20 * scale, x + 70 * scale, y + 24 * scale);
    g.lineStyle(5, colors.woodDark, 1);
    g.lineBetween(x + 22 * scale, y - 22 * scale, x + 22 * scale, y - 124 * scale);
    g.fillStyle(colors.parchment, 0.9);
    g.fillTriangle(x + 30 * scale, y - 116 * scale, x + 30 * scale, y - 34 * scale, x + 96 * scale, y - 48 * scale);
    g.fillStyle(colors.brass, 0.88);
    g.fillTriangle(x + 12 * scale, y - 94 * scale, x + 12 * scale, y - 32 * scale, x - 50 * scale, y - 46 * scale);
  }

  drawHavenMapFrame() {
    const tiles = this.currentHavenTiles();
    const width = tiles[0].length * HAVEN_TILE;
    const height = tiles.length * HAVEN_TILE;
    this.add.rectangle(HAVEN_MAP_X + width / 2, HAVEN_MAP_Y + height / 2, width + 10, height + 10, colors.navyDark, 0.72)
      .setStrokeStyle(2, colors.brass, 0.36);
  }

  drawHavenTile(x, y) {
    const tile = this.currentHavenTiles()[y][x];
    const info = havenTileInfo[tile] || havenTileInfo.s;
    const px = HAVEN_MAP_X + x * HAVEN_TILE;
    const py = HAVEN_MAP_Y + y * HAVEN_TILE;
    if (info.kind === 'water') {
      this.drawWaterTile(px, py, x, y);
      return;
    }
    if (info.kind === 'dock') {
      this.drawDockTile(px, py, x, y);
      return;
    }
    if (info.kind === 'rock') {
      this.drawSandTile(px, py, x, y);
      this.drawRockTile(px, py, x, y);
      return;
    }
    if (info.kind === 'brush') {
      this.drawScrubTile(px, py, x, y);
      this.drawBrushTile(px, py, x, y);
      return;
    }
    if (info.kind === 'scrub') {
      this.drawScrubTile(px, py, x, y);
      return;
    }
    if (info.kind === 'path' || info.kind === 'camp' || info.kind === 'save' || info.kind === 'sail' || info.kind === 'drydock' || info.kind === 'project') {
      this.drawPathTile(px, py, x, y, tile);
      return;
    }
    this.drawSandTile(px, py, x, y);
  }

  drawWaterTile(px, py, x, y) {
    const shore = this.isHavenCoastalWaterTile(x, y);
    const dockside = this.isHavenDocksideWater(x, y);
    const base = shore ? 0x1e8b8f : dockside ? 0x116f82 : 0x083f5c;
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, base, 1);
    if (this.textures.exists('moving-water-open')) {
      const sequence = this.getMovingWaterFrames(x, y);
      const water = this.add.image(px + 20, py + 20, 'moving-water-open', sequence[0]);
      water.setDisplaySize(HAVEN_TILE + 4, HAVEN_TILE + 4);
      water.setTint(shore ? 0xbdf5e8 : dockside ? 0x91dce3 : 0x67bdd3);
      water.setAlpha(shore ? 0.86 : dockside ? 0.9 : 0.92);
      this.animateHavenFrameSequence(water, sequence, x, y, 160);
    } else if (this.textures.exists('ocean-autotiles')) {
      const sequence = this.getHavenWaterFlowFrames(x, y);
      const water = this.add.image(px + 20, py + 20, 'ocean-autotiles', sequence[0]);
      water.setDisplaySize(HAVEN_TILE + 2, HAVEN_TILE + 2);
      water.setTint(shore ? 0xb4f1df : dockside ? 0x86d4df : 0x5cb5cc);
      water.setAlpha(shore ? 0.92 : dockside ? 0.88 : 0.82);
      this.animateHavenFrameSequence(water, sequence, x, y, 300);
    } else if (this.textures.exists('calm-water-autotiles')) {
      const sequence = [0, 1, 2, 1];
      const water = this.add.image(px + 20, py + 20, 'calm-water-autotiles', sequence[0]);
      water.setDisplaySize(HAVEN_TILE + 2, HAVEN_TILE + 2);
      water.setTint(shore ? 0x9ee6d7 : dockside ? 0x6ccad0 : 0x3c9fbd);
      water.setAlpha(shore ? 0.82 : 0.72);
      this.animateHavenFrameSequence(water, sequence, x, y, 360);
    } else {
      const tint = (x + y) % 2 === 0 ? 0x0d3e52 : 0x0b3448;
      this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, tint, 1);
    }
    if (shore) {
      this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 4, HAVEN_TILE - 4, colors.bone, 0.06);
      this.drawShoreFoam(px, py, x, y);
    }
    if (dockside) this.drawDockWaterFoam(px, py, x, y);
    this.drawWaterGlint(px, py, x, y, shore || dockside);
    this.add.line(px + 20, py + 18, -14, 0, 14, 0, colors.teal, 0.2).setLineWidth(2);
    if ((x * 3 + y) % 5 === 0) this.add.line(px + 21, py + 29, -10, 0, 10, 0, colors.bone, 0.16).setLineWidth(1);
  }

  getHavenWaterFlowFrames(x, y) {
    if (this.isHavenDocksideWater(x, y)) return (x + y) % 2 === 0 ? oceanWaveFrames.openAlt : oceanWaveFrames.shallow;
    if (this.isHavenCoastalWaterTile(x, y)) return oceanWaveFrames.shallow;
    return (x + y) % 3 === 0 ? oceanWaveFrames.open : oceanWaveFrames.openAlt;
  }

  getMovingWaterFrames(x, y) {
    const offset = (x * 2 + y) % 4;
    return [0, 1, 2, 3].map((frame) => (frame + offset) % 4);
  }

  animateHavenFrameSequence(sprite, frames, x, y, baseDelay, options = {}) {
    const phase = options.phase ?? ((x * 3 + y * 5) % frames.length);
    sprite.havenFrameIndex = phase;
    sprite.setFrame(frames[sprite.havenFrameIndex]);
    this.havenWaterEvents ||= [];
    const event = this.time.addEvent({
      delay: baseDelay + (options.stagger === false ? 0 : ((x * 19 + y * 31) % 180)),
      loop: true,
      callback: () => {
        if (!sprite.active) return;
        sprite.havenFrameIndex = (sprite.havenFrameIndex + 1) % frames.length;
        sprite.setFrame(frames[sprite.havenFrameIndex]);
      },
    });
    this.havenWaterEvents.push(event);
  }

  clearHavenWaterAnimations() {
    this.havenWaterEvents?.forEach((event) => event.remove(false));
    this.havenWaterEvents = [];
  }

  drawSandTile(px, py, x, y) {
    const shore = this.isHavenShoreTile(x, y);
    const base = shore ? ((x + y) % 2 === 0 ? 0xd8b874 : 0xcaa766) : ((x + y) % 2 === 0 ? 0xb7965b : 0xa88751);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, base, 1).setStrokeStyle(1, 0x4e3a23, 0.36);
    if (this.textures.exists('beach-sand-tiles')) {
      const frame = this.getHavenSandFrame(x, y);
      this.add.image(px + 20, py + 20, 'beach-sand-tiles', frame)
        .setDisplaySize(HAVEN_TILE + 1, HAVEN_TILE + 1)
        .setTint(shore ? 0xffe0a2 : 0xf0c982)
        .setAlpha(shore ? 0.94 : 0.9);
    } else {
      this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 8, HAVEN_TILE - 8, shore ? 0xf0d39b : 0xcaa767, shore ? 0.24 : 0.16);
    }
    for (let i = 0; i < 5; i += 1) {
      const ox = 6 + ((x * 13 + y * 7 + i * 9) % 29);
      const oy = 7 + ((x * 5 + y * 17 + i * 6) % 27);
      const dot = (i + x + y) % 2 === 0 ? 0x5c4329 : 0xd9c58e;
      this.add.circle(px + ox, py + oy, i % 3 === 0 ? 1.3 : 0.9, dot, shore ? 0.34 : 0.22);
    }
    if ((x + y * 2) % 4 === 0) this.add.circle(px + 11, py + 14, 2, 0x3a2a1c, 0.26);
    if ((x * 2 + y) % 5 === 0) this.add.line(px + 25, py + 28, -8, 2, 9, -2, 0x3a2a1c, shore ? 0.24 : 0.18).setLineWidth(1);
    if (shore && (x * 7 + y) % 4 === 0) this.drawShellDetail(px + 24, py + 12, (x + y) % 2 === 0);
    if (shore) {
      this.drawCrashingShoreTile(px, py, x, y);
      this.drawWetSandEdges(px, py, x, y);
      this.drawSandShoreFoam(px, py, x, y);
    }
  }

  isHavenWaterGrid(x, y) {
    const tile = this.currentHavenTiles()[y]?.[x];
    return Boolean(tile) && havenTileInfo[tile]?.kind === 'water';
  }

  isHavenLandGrid(x, y) {
    const tile = this.currentHavenTiles()[y]?.[x];
    return Boolean(tile) && havenTileInfo[tile]?.kind !== 'water';
  }

  isHavenShoreTile(x, y) {
    if (!this.isHavenLandGrid(x, y)) return false;
    return [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].some(([dx, dy]) => this.isHavenWaterGrid(x + dx, y + dy));
  }

  isHavenCoastalWaterTile(x, y) {
    if (!this.isHavenWaterGrid(x, y)) return false;
    return [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].some(([dx, dy]) => this.isHavenLandGrid(x + dx, y + dy));
  }

  isHavenDocksideWater(x, y) {
    return [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].some(([dx, dy]) => this.currentHavenTiles()[y + dy]?.[x + dx] === 'd');
  }

  getHavenSandFrame(x, y) {
    const frames = [0, 1, 2, 3, 8, 9, 10, 11];
    return frames[(x * 3 + y * 5) % frames.length];
  }

  drawCrashingShoreTile(px, py, x, y) {
    if (this.textures.exists('haven-shore-crash')) {
      const sequence = this.getHavenShoreCrashFrames(x, y);
      const wash = this.add.image(px + 20, py + 20, 'haven-shore-crash', sequence[0])
        .setDisplaySize(HAVEN_TILE, HAVEN_TILE)
        .setAlpha(1);
      this.animateHavenFrameSequence(wash, sequence, x, y, 180, { phase: 0, stagger: false });
      return;
    }
    if (!this.textures.exists('ocean-autotiles')) return;
    const sequence = this.getHavenShoreWashFrames(x, y);
    const wash = this.add.image(px + 20, py + 20, 'ocean-autotiles', sequence[0])
      .setDisplaySize(HAVEN_TILE + 2, HAVEN_TILE + 2)
      .setTint(0xffffff)
      .setAlpha(0.98);
    this.animateHavenFrameSequence(wash, sequence, x, y, 180, { phase: 0, stagger: false });
  }

  getHavenShoreCrashFrames(x, y) {
    const north = this.isHavenWaterGrid(x, y - 1);
    const east = this.isHavenWaterGrid(x + 1, y);
    const south = this.isHavenWaterGrid(x, y + 1);
    const west = this.isHavenWaterGrid(x - 1, y);
    if (north && west) return havenShoreCrashFrames.cornerNorthWest;
    if (north && east) return havenShoreCrashFrames.cornerNorthEast;
    if (south && west) return havenShoreCrashFrames.cornerSouthWest;
    if (south && east) return havenShoreCrashFrames.cornerSouthEast;
    if (north) return havenShoreCrashFrames.sandWaterNorth;
    if (south) return havenShoreCrashFrames.sandWaterSouth;
    if (west) return havenShoreCrashFrames.sandWaterWest;
    if (east) return havenShoreCrashFrames.sandWaterEast;
    return havenShoreCrashFrames.sandWaterSouth;
  }

  getHavenShoreWashFrames(x, y) {
    const north = this.isHavenWaterGrid(x, y - 1);
    const east = this.isHavenWaterGrid(x + 1, y);
    const south = this.isHavenWaterGrid(x, y + 1);
    const west = this.isHavenWaterGrid(x - 1, y);
    if (north && west) return oceanWaveFrames.cornerNorthWest;
    if (north && east) return oceanWaveFrames.cornerNorthEast;
    if (south && west) return oceanWaveFrames.cornerSouthWest;
    if (south && east) return oceanWaveFrames.cornerSouthEast;
    if (north) return oceanWaveFrames.sandWaterNorth;
    if (south) return oceanWaveFrames.sandWaterSouth;
    if (west) return oceanWaveFrames.sandWaterWest;
    if (east) return oceanWaveFrames.sandWaterEast;
    return oceanWaveFrames.sandWaterSouth;
  }

  drawWetSandEdges(px, py, x, y) {
    const edgeColor = 0x456a61;
    if (this.isHavenWaterGrid(x, y - 1)) this.add.rectangle(px + 20, py + 3, HAVEN_TILE - 5, 5, edgeColor, 0.28);
    if (this.isHavenWaterGrid(x + 1, y)) this.add.rectangle(px + 37, py + 20, 5, HAVEN_TILE - 5, edgeColor, 0.25);
    if (this.isHavenWaterGrid(x, y + 1)) this.add.rectangle(px + 20, py + 37, HAVEN_TILE - 5, 5, edgeColor, 0.3);
    if (this.isHavenWaterGrid(x - 1, y)) this.add.rectangle(px + 3, py + 20, 5, HAVEN_TILE - 5, edgeColor, 0.25);
  }

  drawShoreFoam(px, py, x, y) {
    if (!this.isHavenWaterGrid(x, y - 1)) this.add.line(px + 20, py + 5, -13, 0, 13, 0, colors.bone, 0.12).setLineWidth(2);
    if (!this.isHavenWaterGrid(x + 1, y)) this.add.line(px + 35, py + 20, 0, -13, 0, 13, colors.bone, 0.1).setLineWidth(2);
    if (!this.isHavenWaterGrid(x, y + 1)) this.add.line(px + 20, py + 35, -13, 0, 13, 0, colors.bone, 0.12).setLineWidth(2);
    if (!this.isHavenWaterGrid(x - 1, y)) this.add.line(px + 5, py + 20, 0, -13, 0, 13, colors.bone, 0.1).setLineWidth(2);
  }

  drawDockWaterFoam(px, py, x, y) {
    const nearNorth = this.currentHavenTiles()[y - 1]?.[x] === 'd';
    const nearEast = this.currentHavenTiles()[y]?.[x + 1] === 'd';
    const nearSouth = this.currentHavenTiles()[y + 1]?.[x] === 'd';
    const nearWest = this.currentHavenTiles()[y]?.[x - 1] === 'd';
    if (nearNorth) this.add.line(px + 20, py + 5, -14, 0, 14, 0, colors.bone, 0.22).setLineWidth(2);
    if (nearEast) this.add.line(px + 35, py + 20, 0, -14, 0, 14, colors.bone, 0.18).setLineWidth(2);
    if (nearSouth) this.add.line(px + 20, py + 35, -14, 0, 14, 0, colors.bone, 0.22).setLineWidth(2);
    if (nearWest) this.add.line(px + 5, py + 20, 0, -14, 0, 14, colors.bone, 0.18).setLineWidth(2);
  }

  drawWaterGlint(px, py, x, y, bright) {
    if ((x * 11 + y * 7) % 3 !== 0) return;
    const glint = this.add.ellipse(px + 14 + ((x * 9 + y * 5) % 14), py + 12 + ((x * 5 + y * 11) % 18), 18, 4, colors.bone, bright ? 0.18 : 0.1)
      .setRotation(((x + y) % 2 ? 0.25 : -0.18));
    this.tweens.add({
      targets: glint,
      alpha: bright ? 0.04 : 0.02,
      scaleX: 1.35,
      duration: 900 + ((x * 17 + y * 13) % 700),
      yoyo: true,
      repeat: -1,
    });
  }

  drawSandShoreFoam(px, py, x, y) {
    if (this.isHavenWaterGrid(x, y - 1)) this.add.line(px + 20, py + 4, -13, 0, 13, 0, colors.bone, 0.28).setLineWidth(2);
    if (this.isHavenWaterGrid(x + 1, y)) this.add.line(px + 36, py + 20, 0, -13, 0, 13, colors.bone, 0.24).setLineWidth(2);
    if (this.isHavenWaterGrid(x, y + 1)) this.add.line(px + 20, py + 36, -13, 0, 13, 0, colors.bone, 0.28).setLineWidth(2);
    if (this.isHavenWaterGrid(x - 1, y)) this.add.line(px + 4, py + 20, 0, -13, 0, 13, colors.bone, 0.24).setLineWidth(2);
  }

  drawShellDetail(x, y, flip) {
    this.add.ellipse(x, y, 8, 5, colors.bone, 0.42).setRotation(flip ? 0.4 : -0.4);
    this.add.line(x, y, -3, 0, 3, 0, 0x7a623c, 0.28).setRotation(flip ? 0.4 : -0.4).setLineWidth(1);
  }

  drawScrubTile(px, py, x, y) {
    if (this.zoneId === 'docks') {
      const base = (x + y) % 2 === 0 ? 0x435b35 : 0x374c31;
      this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, base, 1).setStrokeStyle(1, 0x1b271d, 0.48);
      this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 8, HAVEN_TILE - 8, 0x263826, 0.34);
      for (let i = 0; i < 4; i += 1) {
        const ox = 8 + ((x * 7 + y * 3 + i * 9) % 24);
        const oy = 8 + ((x * 5 + y * 11 + i * 7) % 24);
        this.add.line(px + ox, py + oy, 0, 6, 5, -4, 0x76a85b, 0.42).setLineWidth(1);
      }
      return;
    }
    this.drawSandTile(px, py, x, y);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 5, HAVEN_TILE - 5, 0x315f43, 0.52);
    for (let i = 0; i < 3; i += 1) {
      const ox = 8 + ((x * 7 + y * 3 + i * 9) % 24);
      const oy = 8 + ((x * 5 + y * 11 + i * 7) % 24);
      this.add.line(px + ox, py + oy, 0, 5, 4, -3, 0x76a85b, 0.45).setLineWidth(1);
    }
  }

  drawPathTile(px, py, x, y, tile) {
    this.drawSandTile(px, py, x, y);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 4, HAVEN_TILE - 4, 0x6a4a2f, tile === 'C' ? 0.72 : 0.62)
      .setStrokeStyle(1, 0x3d2719, 0.48);
    for (let row = 0; row < 3; row += 1) {
      const offset = (row + x + y) % 2 === 0 ? 0 : 8;
      for (let col = -1; col < 3; col += 1) {
        const bx = px + 2 + col * 16 + offset;
        const by = py + 6 + row * 10;
        if (bx < px || bx > px + 32) continue;
        this.add.rectangle(bx + 8, by + 4, 14, 7, (row + col + x) % 2 ? 0x785433 : 0x5f4129, 0.62)
          .setStrokeStyle(1, 0x2b1a13, 0.42);
      }
    }
  }

  drawDockTile(px, py, x, y) {
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, 0x123c4b, 1);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 2, HAVEN_TILE - 4, colors.wood, 0.96).setStrokeStyle(1, colors.woodDark);
    this.add.line(px + 20, py + 8, -17, 0, 17, 0, colors.woodDark, 0.72).setLineWidth(2);
    this.add.line(px + 20, py + 21, -17, 0, 17, 0, colors.woodDark, 0.58).setLineWidth(2);
    this.add.line(px + 20, py + 34, -17, 0, 17, 0, colors.woodDark, 0.72).setLineWidth(2);
    if ((x + y) % 2 === 0) this.add.circle(px + 8, py + 8, 2, colors.brass, 0.58);
  }

  drawRockTile(px, py, x, y) {
    this.add.polygon(px + 20, py + 20, [-14, 9, -8, -10, 8, -14, 15, 5, 4, 14], 0x3b3f3d, 0.96)
      .setStrokeStyle(1, colors.charcoal, 0.7);
    this.add.line(px + 20, py + 20, -7, -4, 8, 4, colors.smoke, 0.34).setLineWidth(2);
  }

  drawBrushTile(px, py, x, y) {
    for (let i = 0; i < 5; i += 1) {
      const ox = 8 + ((x * 3 + i * 7) % 24);
      const oy = 10 + ((y * 5 + i * 5) % 22);
      this.add.line(px + ox, py + oy, 0, 8, 5, -5, 0x1f4a32, 0.8).setLineWidth(2);
      this.add.line(px + ox, py + oy, 0, 7, -5, -4, 0x76a85b, 0.55).setLineWidth(1);
    }
  }

  drawHavenMapOverlays() {
    const tiles = this.currentHavenTiles();
    const width = tiles[0].length * HAVEN_TILE;
    const height = tiles.length * HAVEN_TILE;
    this.add.rectangle(HAVEN_MAP_X + width / 2, HAVEN_MAP_Y + 3, width - 12, 6, colors.brass, 0.18);
    this.add.rectangle(HAVEN_MAP_X + width / 2, HAVEN_MAP_Y + height - 3, width - 12, 6, colors.charcoal, 0.22);
    if (this.zoneId === 'docks') {
      this.drawWorkPile(8, 6);
      this.drawWorkPile(12, 7);
      this.drawDockHarborDetails();
    }
    if (this.zoneId === 'village') this.drawCampfire(...Object.values(this.gridToHavenWorld({ x: 8, y: 7 })));
    if (this.zoneId === 'village') this.drawBarrenVillageDetails();
    this.currentHavenMap().exits.forEach((exit) => this.drawHavenExitTile(exit.grid.x, exit.grid.y, exit.label, exit.type === 'sail' ? colors.brass : exit.type === 'save' ? colors.teal : colors.parchment));
  }

  drawWorkPile(x, y) {
    const p = this.gridToHavenWorld({ x, y });
    this.add.rectangle(p.x, p.y + 7, 32, 10, colors.woodDark, 0.72).setRotation(-0.22);
    this.add.rectangle(p.x + 4, p.y, 28, 8, colors.wood, 0.84).setRotation(0.18);
    this.add.circle(p.x - 12, p.y - 4, 4, colors.smoke, 0.68);
  }

  drawDockHarborDetails() {
    [[10, 4], [13, 4], [15, 6], [12, 9], [15, 8], [11, 12]].forEach(([x, y]) => {
      const p = this.gridToHavenWorld({ x, y });
      this.add.circle(p.x, p.y, 7, colors.woodDark, 0.96).setStrokeStyle(2, colors.brass, 0.34);
      this.add.circle(p.x, p.y - 2, 3, colors.wood, 0.92);
    });
    this.drawDockRope(10, 4, 13, 4);
    this.drawDockRope(13, 4, 15, 6);
    this.drawDockRope(12, 9, 15, 8);
    this.drawDockRope(12, 9, 11, 12);
    this.drawDockCrane(13.2, 5.2);
    this.drawSmallBoat(14.8, 8.6, -0.45);
    this.drawSmallBoat(12.7, 11.5, 0.36);
    this.drawSmallBoat(16.0, 10.2, -0.18);
    this.drawDockFlag(15.8, 10.8);
    this.drawRockCluster(7.2, 6.2);
    this.drawRockCluster(8.5, 10.4);
  }

  drawShipBoardingGangway() {
    const dock = this.gridToHavenWorld({ x: 16, y: 6 });
    const ship = this.gridToHavenWorld({ x: 17.4, y: 5.8 });
    this.add.rectangle((dock.x + ship.x) / 2, (dock.y + ship.y) / 2, 72, 14, colors.wood, 0.94)
      .setRotation(-0.18)
      .setStrokeStyle(2, colors.woodDark, 0.95)
      .setDepth(45);
    for (let i = 0; i < 4; i += 1) {
      this.add.line(dock.x + 8 + i * 13, dock.y - 6 - i * 2, 0, -5, 0, 5, colors.woodDark, 0.72)
        .setRotation(-0.18)
        .setLineWidth(1)
        .setDepth(46);
    }
  }

  drawDockRope(x1, y1, x2, y2) {
    const a = this.gridToHavenWorld({ x: x1, y: y1 });
    const b = this.gridToHavenWorld({ x: x2, y: y2 });
    this.add.line(0, 0, a.x, a.y - 12, b.x, b.y - 12, colors.brass, 0.38).setLineWidth(2);
  }

  drawDockCrane(x, y) {
    const p = this.gridToHavenWorld({ x, y });
    this.add.line(p.x, p.y, 0, 34, 0, -54, colors.woodDark, 1).setLineWidth(6);
    this.add.line(p.x, p.y - 50, 0, 0, 86, -34, colors.wood, 0.95).setLineWidth(5);
    this.add.line(p.x + 80, p.y - 82, 0, 0, 0, 46, colors.charcoal, 0.82).setLineWidth(2);
    this.add.circle(p.x + 80, p.y - 34, 5, colors.brass, 0.84).setStrokeStyle(1, colors.charcoal);
  }

  drawSmallBoat(x, y, rotation) {
    const p = this.gridToHavenWorld({ x, y });
    const hull = this.add.ellipse(p.x, p.y, 54, 20, colors.woodDark, 0.95).setRotation(rotation).setStrokeStyle(2, colors.wood);
    this.add.rectangle(p.x, p.y, 38, 5, colors.wood, 0.86).setRotation(rotation);
    this.add.line(p.x, p.y, -20, 0, 20, 0, colors.brass, 0.28).setRotation(rotation).setLineWidth(1);
    hull.setDepth(8);
  }

  drawDockFlag(x, y) {
    const p = this.gridToHavenWorld({ x, y });
    this.add.line(p.x, p.y, 0, 18, 0, -32, colors.woodDark, 1).setLineWidth(3);
    this.add.triangle(p.x + 13, p.y - 24, 0, -8, 0, 8, 24, 0, colors.charcoal, 0.92).setStrokeStyle(1, colors.brass, 0.42);
    this.add.text(p.x + 8, p.y - 30, 'x', { ...ui.small, fontSize: '8px', color: '#f3e5c4' }).setOrigin(0.5);
  }

  drawRockCluster(x, y) {
    const p = this.gridToHavenWorld({ x, y });
    this.add.circle(p.x - 10, p.y + 4, 9, 0x3b3f3d, 0.95).setStrokeStyle(1, colors.charcoal);
    this.add.circle(p.x + 3, p.y - 4, 12, 0x4b514d, 0.95).setStrokeStyle(1, colors.charcoal);
    this.add.circle(p.x + 15, p.y + 8, 7, 0x303633, 0.95).setStrokeStyle(1, colors.charcoal);
  }

  drawBarrenVillageDetails() {
    [[7, 3], [11, 6], [7, 8], [10, 10]].forEach(([x, y]) => this.drawRockCluster(x, y));
    [[6, 2], [13, 2], [6, 5], [12, 5], [6, 7], [14, 7]].forEach(([x, y]) => this.drawWorkPile(x, y));
    this.drawBrokenFence(2.5, 1.4, 4);
    this.drawBrokenFence(13.5, 3.2, 5);
    this.drawBrokenFence(2.3, 9.5, 5);
    this.drawDockFlag(17.2, 7.1);
  }

  drawBrokenFence(x, y, posts) {
    const start = this.gridToHavenWorld({ x, y });
    for (let i = 0; i < posts; i += 1) {
      const px = start.x + i * 18;
      const py = start.y + (i % 2) * 4;
      this.add.rectangle(px, py, 5, 26, colors.woodDark, 0.9).setRotation((i % 2 ? -0.12 : 0.08));
      if (i < posts - 1) this.add.line(px + 9, py, 0, -5, 20, 2, colors.wood, 0.72).setLineWidth(3);
    }
  }

  drawHavenExitTile(x, y, label, color) {
    const p = this.gridToHavenWorld({ x, y });
    this.add.circle(p.x, p.y, 18, color, 0.14).setStrokeStyle(2, color, 0.62);
    this.add.text(p.x, p.y + 22, label, { ...ui.small, fontSize: '10px', color: '#f3e5c4' }).setOrigin(0.5);
  }

  drawCampfire(x, y) {
    const g = this.add.graphics();
    g.fillStyle(colors.woodDark, 0.8);
    g.fillEllipse(x, y + 18, 90, 28);
    g.fillStyle(colors.ember, 0.9);
    g.fillTriangle(x - 18, y + 12, x, y - 34, x + 20, y + 12);
    g.fillStyle(colors.brassLight, 0.84);
    g.fillTriangle(x - 8, y + 12, x + 4, y - 18, x + 12, y + 12);
  }

  getHavenLots() {
    const lots = [
      { id: 'drydock', name: 'Drydock', grid: { x: 8, y: 5 }, note: 'Damaged dock frame and keel blocks.', built: true, color: colors.teal },
      { id: 'forge', name: 'Forge Lot', grid: { x: 11, y: 2 }, note: 'Ruined furnace foundation.', project: 'forge' },
      { id: 'tavern', name: 'Tavern Lot', grid: { x: 4, y: 2 }, note: 'Torn tent and muddy planks.', project: 'tavern' },
      { id: 'training', name: 'Training Lot', grid: { x: 4, y: 4 }, note: 'Open sparring dirt.', project: 'training' },
      { id: 'infirmary', name: 'Infirmary Lot', grid: { x: 4, y: 6 }, note: 'Collapsed medic shack.', project: 'infirmary' },
      { id: 'watchtower', name: 'Watchtower Lot', grid: { x: 14, y: 4 }, note: 'Broken signal platform.', project: 'watchtower' },
    ];
    const allowed = new Set(this.currentHavenMap().lots || []);
    return lots.filter((lot) => allowed.has(lot.project || lot.id));
  }

  drawHavenLot(lot) {
    const point = this.gridToHavenWorld(lot.grid);
    lot.x = point.x;
    lot.y = point.y;
    const built = lot.built || this.state.haven[lot.project] > 0;
    if (built) {
      this.drawBuilding(lot.x, lot.y, lot.project ? havenProjects[lot.project].name : lot.name, lot.color || havenProjects[lot.project]?.color || colors.teal);
      this.add.text(lot.x, lot.y + 42, lot.project ? havenProjects[lot.project].name : 'Damaged dock', { ...ui.small, fontSize: '10px', wordWrap: { width: 112 }, align: 'center' }).setOrigin(0.5, 0);
      this.drawNpcActivity(lot.x, lot.y, lot.project || lot.id);
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(colors.woodDark, 0.62);
    g.fillRoundedRect(lot.x - 48, lot.y - 28, 96, 58, 6);
    g.lineStyle(2, colors.brass, 0.35);
    g.strokeRoundedRect(lot.x - 48, lot.y - 28, 96, 58, 6);
    g.lineStyle(3, colors.wood, 0.86);
    g.lineBetween(lot.x - 36, lot.y + 18, lot.x + 38, lot.y - 14);
    g.lineBetween(lot.x - 34, lot.y - 12, lot.x + 36, lot.y + 18);
    this.add.text(lot.x, lot.y - 8, lot.name, { ...ui.small, color: '#e1c16b', align: 'center', wordWrap: { width: 86 } }).setOrigin(0.5);
    this.add.text(lot.x, lot.y + 36, 'Unfinished', { ...ui.small, fontSize: '9px', wordWrap: { width: 104 }, align: 'center' }).setOrigin(0.5, 0);
  }

  drawNpcActivity(x, y, id) {
    const tint = id === 'forge' ? colors.ember : id === 'tavern' ? colors.brass : colors.teal;
    for (let index = 0; index < 2; index += 1) {
      const npc = this.add.circle(x - 28 + index * 56, y + 34 + index * 5, 5, tint, 0.9).setStrokeStyle(1, colors.charcoal);
      this.tweens.add({ targets: npc, x: npc.x + (index ? -8 : 8), duration: 900 + index * 140, yoyo: true, repeat: -1 });
    }
  }

  drawPlayerMarker() {
    this.playerMarker = this.add.container(this.player.x, this.player.y).setDepth(50);
    this.playerMarker.add(this.add.circle(0, 0, 11, colors.teal, 1).setStrokeStyle(3, colors.brassLight));
    this.playerMarker.add(this.add.text(0, -5, 'C', { ...ui.small, color: '#07111d', fontSize: '10px' }).setOrigin(0.5));
    this.refreshContextText();
  }

  refreshPlayerMarker() {
    if (this.playerMarker) this.playerMarker.setPosition(this.player.x, this.player.y);
  }

  getNearbyBuildLot() {
    return this.getHavenLots().map((lot) => ({ ...lot, ...this.gridToHavenWorld(lot.grid) }))
      .find((lot) => lot.project && !this.state.haven[lot.project] && Phaser.Math.Distance.Between(this.player.x, this.player.y, lot.x, lot.y) < 58);
  }

  getNearbyHavenInteraction() {
    const lot = this.getNearbyBuildLot();
    if (lot) return { type: 'build', lot };
    const exits = this.currentHavenMap().exits.map((exit) => ({ ...exit, ...this.gridToHavenWorld(exit.grid) }));
    return exits.find((exit) => Phaser.Math.Distance.Between(this.player.x, this.player.y, exit.x, exit.y) < 58) || null;
  }

  getAutoHavenTransition() {
    return this.currentHavenMap().exits
      .filter((exit) => exit.auto)
      .map((exit) => ({ ...exit, ...this.gridToHavenWorld(exit.grid) }))
      .find((exit) => Phaser.Math.Distance.Between(this.player.x, this.player.y, exit.x, exit.y) < 34);
  }

  checkAutoHavenTransition() {
    const transition = this.getAutoHavenTransition();
    if (transition) this.changeHavenZone(transition.target, transition.targetGrid);
  }

  currentHavenMap() {
    return havenMaps[this.zoneId] || havenMaps.docks;
  }

  currentHavenTiles() {
    return this.currentHavenMap().tiles;
  }

  gridToHavenWorld(pos) {
    return {
      x: HAVEN_MAP_X + pos.x * HAVEN_TILE + HAVEN_TILE / 2,
      y: HAVEN_MAP_Y + pos.y * HAVEN_TILE + HAVEN_TILE / 2,
    };
  }

  havenWorldToGrid(x, y) {
    return {
      x: Math.floor((x - HAVEN_MAP_X) / HAVEN_TILE),
      y: Math.floor((y - HAVEN_MAP_Y) / HAVEN_TILE),
    };
  }

  havenTileAtWorld(x, y) {
    const pos = this.havenWorldToGrid(x, y);
    const tile = this.currentHavenTiles()[pos.y]?.[pos.x] || '~';
    return havenTileInfo[tile] || havenTileInfo['~'];
  }

  canStandAt(x, y) {
    const checks = [
      this.havenTileAtWorld(x, y),
      this.havenTileAtWorld(x - 10, y),
      this.havenTileAtWorld(x + 10, y),
      this.havenTileAtWorld(x, y - 10),
      this.havenTileAtWorld(x, y + 10),
    ];
    return checks.every((tile) => tile.walkable);
  }

  movePlayer(dx, dy) {
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    if (this.canStandAt(nextX, this.player.y)) this.player.x = nextX;
    if (this.canStandAt(this.player.x, nextY)) this.player.y = nextY;
  }

  drawContextPrompt() {
    const r = this.state.resources;
    this.add.text(20, 18, `Coin ${r.coin}  Lumber ${r.lumber}  Scrap ${r.scrap}  Powder ${r.blackPowder}  Supplies ${r.supplies}  Rep ${r.reputation}`, {
      ...ui.small,
      color: '#f3e5c4',
    }).setDepth(80);
    this.add.text(20, 680, '', {
      ...ui.small,
      color: '#e1c16b',
      fixedWidth: 560,
    }).setName('haven-context-text').setDepth(80);
    this.refreshContextText();
  }

  refreshContextText() {
    const text = this.children.getByName?.('haven-context-text');
    if (!text) return;
    const interaction = this.getNearbyHavenInteraction();
    if (!interaction) {
      text.setText('WASD to move. E or Space interacts.');
      return;
    }
    if (interaction.type === 'build') {
      const project = havenProjects[interaction.lot.project];
      text.setText(`E: Build ${project.name} (${this.formatCost(project.cost)})`);
      return;
    }
    if (interaction.type === 'zone') {
      text.setText(`E: ${interaction.prompt}`);
      return;
    }
    text.setText(`E: ${interaction.prompt}`);
  }

  tryHavenInteraction() {
    const interaction = this.getNearbyHavenInteraction();
    if (!interaction) return;
    if (interaction.type === 'sail') {
      this.scene.start('NavigationScene');
      return;
    }
    if (interaction.type === 'zone') {
      this.changeHavenZone(interaction.target, interaction.targetGrid);
      return;
    }
    if (interaction.type === 'save') {
      this.saveManual(1);
      this.state.pendingHavenSummary = {
        title: 'Voyage Recorded',
        lines: ['The quartermaster marks the ledger in Slot 1.', 'Autosave is also current.'],
      };
      this.draw();
      return;
    }
    this.tryBuildLot(interaction.lot);
  }

  changeHavenZone(zoneId, targetGrid) {
    if (!havenMaps[zoneId]) return;
    this.state.havenPlayerByZone ||= {};
    this.state.havenPlayerByZone[this.zoneId] = { ...this.player };
    this.zoneId = zoneId;
    this.state.havenZone = zoneId;
    this.player = this.gridToHavenWorld(targetGrid || this.currentHavenMap().spawn);
    this.state.havenPlayerByZone[this.zoneId] = { ...this.player };
    saveAutoGame(this.state);
    this.draw();
  }

  tryBuildLot(lot) {
    const project = havenProjects[lot.project];
    if (!this.canAfford(project.cost)) {
      this.state.pendingHavenSummary = {
        title: 'Construction Delayed',
        lines: [`Need ${this.formatCost(project.cost)} to build the ${project.name}.`],
      };
      this.draw();
      return;
    }
    this.spendCost(project.cost);
    this.state.haven[lot.project] = 1;
    this.state.pendingHavenSummary = {
      title: `${project.name} Built`,
      lines: [project.reward, 'Workers raise beams, lanterns brighten, and the haven feels less fragile.'],
    };
    saveAutoGame(this.state);
    this.draw();
  }

  canAfford(cost) {
    return Object.entries(cost).every(([resource, amount]) => (this.state.resources[resource] || 0) >= amount);
  }

  spendCost(cost) {
    Object.entries(cost).forEach(([resource, amount]) => {
      this.state.resources[resource] = Math.max(0, (this.state.resources[resource] || 0) - amount);
    });
  }

  formatCost(cost) {
    return Object.entries(cost).map(([resource, amount]) => `${amount} ${resource}`).join(', ');
  }

  drawBuilding(x, y, name, color) {
    const g = this.add.graphics();
    g.fillStyle(colors.woodDark, 0.6);
    g.fillEllipse(x + 8, y + 35, 96, 30);
    g.fillStyle(colors.wood, 1);
    g.fillRoundedRect(x - 42, y - 22, 84, 62, 4);
    g.fillStyle(color, 0.85);
    g.fillTriangle(x - 48, y - 22, x, y - 64, x + 48, y - 22);
    g.lineStyle(2, colors.charcoal, 1);
    g.strokeRoundedRect(x - 42, y - 22, 84, 62, 4);
    g.strokeTriangle(x - 48, y - 22, x, y - 64, x + 48, y - 22);
    this.add.text(x, y - 7, name, { ...ui.label, fontSize: '11px', align: 'center', wordWrap: { width: 78 } }).setOrigin(0.5);
  }

  drawHavenSummary() {
    const summary = this.state.pendingHavenSummary;
    if (!summary) return;
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.46).setDepth(200).setInteractive();
    drawPanel(this, 292, 218, 376, 246, 0.98).setDepth(201);
    this.add.text(322, 242, summary.title || 'Haven Summary', { ...ui.h2, fontSize: '25px' }).setDepth(202);
    (summary.lines || []).slice(0, 5).forEach((line, index) => {
      this.add.text(322, 286 + index * 28, line, { ...ui.small, color: '#f3e5c4', wordWrap: { width: 316 }, lineSpacing: 3 }).setDepth(202);
    });
    button(this, 424, 410, 112, 'Close', () => {
      this.state.pendingHavenSummary = null;
      saveAutoGame(this.state);
      this.draw();
    }, colors.brass).forEach((object) => object.setDepth?.(203));
  }

  saveManual(slot) {
    this.state.lastScene = 'Haven';
    saveAutoGame(this.state);
    saveGameSlot(slot, this.state);
    this.draw();
  }

  supportLabel(id) {
    return {
      boardingHooks: 'Boarding Hooks',
      smokeLaunchers: 'Smoke Launchers',
      reinforcedHull: 'Reinforced Hull',
      improvedCannons: 'Improved Cannons',
    }[id] || id;
  }
}

class NavigationScene extends Phaser.Scene {
  constructor() {
    super('NavigationScene');
  }

  create() {
    this.state = setSceneCheckpoint(this, 'Navigation');
    this.ship = { x: 210, y: 510, angle: -20, speed: 0 };
    this.keys = this.input.keyboard.createCursorKeys();
    this.events = [
      { x: 610, y: 250, label: 'Navy Patrol', kind: 'combat' },
      { x: 760, y: 420, label: 'Burning Wreck', kind: 'salvage' },
      { x: 540, y: 360, label: 'Storm Bank', kind: 'storm' },
    ];
    this.message = this.state.navigationMessage;
    this.drawStatic();
  }

  update(time) {
    if (this.keys.left.isDown) this.ship.angle -= 2.2;
    if (this.keys.right.isDown) this.ship.angle += 2.2;
    if (this.keys.up.isDown) this.ship.speed = Math.min(3, this.ship.speed + 0.06);
    else if (this.keys.down.isDown) this.ship.speed = Math.max(0, this.ship.speed - 0.08);
    else this.ship.speed *= 0.985;
    const rad = Phaser.Math.DegToRad(this.ship.angle);
    this.ship.x += Math.cos(rad) * this.ship.speed;
    this.ship.y += Math.sin(rad) * this.ship.speed;
    this.ship.x = Phaser.Math.Clamp(this.ship.x, 70, 890);
    this.ship.y = Phaser.Math.Clamp(this.ship.y, 118, 640);
    this.shipIcon.setPosition(this.ship.x, this.ship.y).setRotation(rad);
    this.wake.setPosition(this.ship.x - Math.cos(rad) * 34, this.ship.y - Math.sin(rad) * 34).setRotation(rad);
    this.wake.setScale(0.86 + this.ship.speed * 0.16, 0.82 + this.ship.speed * 0.08);
    this.animateOpenSea(time);
    const near = this.events.find((event) => Phaser.Math.Distance.Between(this.ship.x, this.ship.y, event.x, event.y) < 58);
    this.interactText.setText(near ? `Near ${near.label}: press Engage` : 'Arrow keys steer. Approach visible encounters.');
    this.nearEvent = near;
  }

  drawStatic() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(0x0d3448);
    this.ensureNavigationShipTexture();
    this.drawOpenSeaWater();
    drawPanel(this, 32, 24, 896, 72, 0.9);
    this.add.text(58, 42, 'Navigation', ui.title);
    this.add.text(340, 50, this.message, ui.label);
    this.drawIsland(208, 240, 'Haven');
    this.drawIsland(830, 180, 'Fort');
    this.drawIsland(780, 580, 'Port');
    this.events.forEach((event) => this.drawEncounter(event));
    this.wake = this.add.container(this.ship.x - 34, this.ship.y);
    this.wake.add([
      this.add.ellipse(-8, -9, 62, 9, 0xcaf6ea, 0.22).setRotation(-0.22),
      this.add.ellipse(-9, 9, 70, 10, 0xcaf6ea, 0.18).setRotation(0.22),
      this.add.ellipse(-40, 0, 44, 7, colors.teal, 0.18),
      this.add.ellipse(16, -14, 20, 5, 0xe8fff9, 0.2).setRotation(-0.55),
      this.add.ellipse(16, 14, 20, 5, 0xe8fff9, 0.18).setRotation(0.55),
    ]);
    this.shipIcon = this.add.container(this.ship.x, this.ship.y);
    this.shipIcon.add(this.add.image(0, 0, 'navigation-ship-sprite').setScale(0.9));
    this.shipIcon.setDepth(8);
    drawPanel(this, 32, 612, 896, 76, 0.86);
    this.interactText = this.add.text(58, 634, '', ui.label);
    button(this, 674, 628, 116, 'Engage', () => {
      if (!this.nearEvent) {
        this.message = 'No encounter in boarding range. Sail closer to a visible marker.';
        this.state.navigationMessage = this.message;
        this.drawStatic();
        return;
      }
      if (this.nearEvent.kind === 'combat') this.scene.start('BattleScene');
      else {
        if (this.nearEvent.kind === 'salvage') {
          this.state.resources.supplies += 1;
          this.state.resources.lumber += 1;
          this.state.pendingHavenSummary = {
            title: 'Wreck Salvaged',
            lines: ['Dockworkers unload usable lumber and supplies.', '+1 Supplies', '+1 Lumber'],
          };
          this.message = 'Recovered supplies and lumber from the wreck.';
        } else {
          this.state.resources.supplies = Math.max(0, this.state.resources.supplies - 1);
          this.state.pendingHavenSummary = {
            title: 'Storm Damage',
            lines: ['The crew limps home and spends supplies patching the hull.', '-1 Supplies'],
          };
          this.message = 'Storm damage cost supplies.';
        }
        this.state.navigationMessage = this.message;
        saveAutoGame(this.state);
        this.drawStatic();
      }
    }, colors.brass);
    button(this, 812, 628, 90, 'Haven', () => this.scene.start('HavenScene'), colors.teal);
  }

  ensureNavigationShipTexture() {
    if (this.textures.exists('navigation-ship-sprite')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = 72;
    const cy = 68;

    g.fillStyle(0x07111d, 0.34);
    g.fillEllipse(cx - 4, cy + 21, 134, 27);

    g.fillStyle(0x1c100c, 1);
    g.fillTriangle(cx + 56, cy + 3, cx + 76, cy + 11, cx + 56, cy + 18);
    g.fillTriangle(cx - 54, cy + 7, cx - 70, cy + 15, cx - 54, cy + 23);
    g.fillStyle(colors.woodDark, 1);
    g.fillPoints([
      { x: cx - 58, y: cy + 9 },
      { x: cx - 36, y: cy + 34 },
      { x: cx + 42, y: cy + 34 },
      { x: cx + 60, y: cy + 7 },
      { x: cx + 42, y: cy + 24 },
      { x: cx - 46, y: cy + 25 },
    ], true);
    g.lineStyle(3, colors.charcoal, 1);
    g.strokePoints([
      { x: cx - 58, y: cy + 9 },
      { x: cx - 36, y: cy + 34 },
      { x: cx + 42, y: cy + 34 },
      { x: cx + 60, y: cy + 7 },
    ], true);

    g.fillStyle(colors.wood, 1);
    g.fillRoundedRect(cx - 46, cy + 2, 94, 23, 4);
    g.lineStyle(1, 0x8b5a36, 0.9);
    for (let x = cx - 36; x <= cx + 37; x += 12) g.lineBetween(x, cy + 6, x - 7, cy + 23);
    g.lineStyle(2, colors.brass, 0.86);
    g.lineBetween(cx - 51, cy + 6, cx + 52, cy + 4);
    g.lineBetween(cx - 36, cy + 28, cx + 38, cy + 28);
    g.fillStyle(0x0a0706, 0.86);
    for (let x = cx - 31; x <= cx + 31; x += 16) g.fillCircle(x, cy + 17, 3);
    g.fillStyle(colors.brassLight, 0.92);
    g.fillCircle(cx + 46, cy + 14, 3);
    g.fillCircle(cx - 45, cy + 15, 3);

    g.lineStyle(4, 0x20130e, 1);
    g.lineBetween(cx - 5, cy + 24, cx - 5, cy - 52);
    g.lineStyle(3, 0x20130e, 1);
    g.lineBetween(cx + 20, cy + 21, cx + 20, cy - 31);
    g.lineStyle(2, colors.woodDark, 1);
    g.lineBetween(cx - 36, cy - 26, cx + 37, cy - 26);
    g.lineBetween(cx - 30, cy + 1, cx + 42, cy + 1);
    g.lineBetween(cx + 6, cy - 13, cx + 38, cy - 13);

    g.fillStyle(0xf1dfb7, 0.96);
    g.fillPoints([
      { x: cx - 10, y: cy - 50 },
      { x: cx - 11, y: cy - 2 },
      { x: cx - 51, y: cy - 10 },
      { x: cx - 38, y: cy - 32 },
    ], true);
    g.fillStyle(0xd8c28f, 0.94);
    g.fillPoints([
      { x: cx + 1, y: cy - 48 },
      { x: cx + 2, y: cy + 14 },
      { x: cx + 52, y: cy - 1 },
      { x: cx + 36, y: cy - 29 },
    ], true);
    g.fillStyle(0xe8d7ae, 0.9);
    g.fillPoints([
      { x: cx + 23, y: cy - 30 },
      { x: cx + 23, y: cy + 5 },
      { x: cx + 48, y: cy - 10 },
    ], true);
    g.lineStyle(1, colors.brass, 0.75);
    g.strokeTriangle(cx - 10, cy - 50, cx - 11, cy - 2, cx - 51, cy - 10);
    g.strokeTriangle(cx + 1, cy - 48, cx + 2, cy + 14, cx + 52, cy - 1);
    g.strokeTriangle(cx + 23, cy - 30, cx + 23, cy + 5, cx + 48, cy - 10);
    g.lineStyle(1, 0x8e754d, 0.45);
    g.lineBetween(cx - 16, cy - 37, cx - 42, cy - 13);
    g.lineBetween(cx + 10, cy - 34, cx + 42, cy - 5);
    g.lineBetween(cx + 6, cy - 18, cx + 32, cy + 5);
    g.lineStyle(1, 0xe9d7ad, 0.42);
    g.lineBetween(cx - 49, cy - 10, cx + 47, cy + 23);
    g.lineBetween(cx + 53, cy - 1, cx - 35, cy + 27);

    g.fillStyle(colors.crimson, 0.88);
    g.fillTriangle(cx - 5, cy - 56, cx - 5, cy - 40, cx + 20, cy - 48);
    g.lineStyle(1, colors.charcoal, 0.9);
    g.strokeTriangle(cx - 5, cy - 56, cx - 5, cy - 40, cx + 20, cy - 48);

    g.generateTexture('navigation-ship-sprite', 144, 132);
    g.destroy();
  }

  drawIsland(x, y, label) {
    const g = this.add.graphics();
    g.fillStyle(colors.bone, 0.18);
    g.fillEllipse(x, y + 4, 172, 88);
    g.fillStyle(0x9a7a48, 1);
    g.fillEllipse(x, y, 150, 72);
    g.fillStyle(0x315f43, 1);
    g.fillEllipse(x + 12, y - 12, 96, 44);
    g.fillStyle(0x1f4a32, 0.8);
    g.fillEllipse(x - 20, y - 4, 58, 28);
    g.lineStyle(2, colors.bone, 0.22);
    g.strokeEllipse(x, y + 3, 166, 82);
    this.add.text(x, y + 48, label, ui.label).setOrigin(0.5);
  }

  drawOpenSeaWater() {
    this.seaTiles = [];
    this.waveBands = [];
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0d3448, 1);
    if (this.textures.exists('ocean-autotiles')) {
      for (let y = -45; y < HEIGHT + 45; y += 45) {
        for (let x = -47; x < WIDTH + 47; x += 47) {
          const frame = ((x / 47 + y / 45) % 4 === 0) ? 61 : ((x + y) % 5 === 0 ? 62 : 63);
          const tile = this.add.image(x + 23.5, y + 22.5, 'ocean-autotiles', frame);
          tile.setDisplaySize(50, 48);
          tile.setTint((x + y) % 4 === 0 ? 0x8bdce2 : (x + y) % 3 === 0 ? 0x54aeca : 0x1d7895);
          tile.setAlpha((x + y) % 4 === 0 ? 0.58 : 0.72);
          tile.baseX = tile.x;
          tile.baseY = tile.y;
          tile.baseAlpha = tile.alpha;
          tile.wavePhase = (x * 0.013) + (y * 0.021);
          this.seaTiles.push(tile);
        }
      }
    }
    const g = this.add.graphics();
    g.fillStyle(0x09283c, 0.22);
    for (let y = 104; y < HEIGHT; y += 92) {
      g.fillEllipse(220 + Math.sin(y * 0.07) * 90, y + 16, 420, 38);
      g.fillEllipse(720 + Math.cos(y * 0.05) * 70, y + 42, 360, 32);
    }
    for (let y = 112; y < HEIGHT; y += 28) {
      g.lineStyle(y % 56 === 0 ? 2 : 1, y % 84 === 0 ? 0xcaf6ea : colors.teal, y % 84 === 0 ? 0.18 : 0.11);
      g.beginPath();
      for (let x = -30; x <= WIDTH + 30; x += 24) {
        const wave = Math.sin((x + y) * 0.027) * 7 + Math.cos((x - y) * 0.015) * 3;
        if (x === -30) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
    for (let i = 0; i < 12; i += 1) {
      const y = 132 + i * 48;
      const band = this.add.container(0, y);
      const length = 86 + (i % 4) * 28;
      for (let x = -60; x < WIDTH + 120; x += 180) {
        band.add(this.add.ellipse(x + ((i * 67) % 140), 0, length, 3, i % 3 === 0 ? 0xd8fff4 : 0x7bd8df, i % 3 === 0 ? 0.16 : 0.09));
      }
      band.baseY = y;
      band.wavePhase = i * 0.77;
      this.waveBands.push(band);
    }
    for (let i = 0; i < 30; i += 1) {
      const x = 70 + ((i * 149) % 850);
      const y = 122 + ((i * 83) % 520);
      const foam = this.add.ellipse(x, y, 42 + (i % 5) * 8, 3, 0xd8fff4, 0.12).setRotation(((i % 7) - 3) * 0.08);
      this.tweens.add({
        targets: foam,
        x: x + 22,
        alpha: 0.03,
        duration: 2400 + (i % 6) * 420,
        yoyo: true,
        repeat: -1,
      });
    }
    for (let y = 150; y < HEIGHT; y += 118) {
      const current = this.add.ellipse(420 + Math.sin(y) * 80, y, 620, 34, colors.bone, 0.045).setRotation(-0.16);
      this.tweens.add({
        targets: current,
        scaleX: 1.08,
        alpha: 0.018,
        duration: 3600 + y * 4,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  animateOpenSea(time = 0) {
    const t = time * 0.001;
    this.seaTiles?.forEach((tile, index) => {
      tile.x = tile.baseX + Math.sin(t * 0.7 + tile.wavePhase) * 1.8;
      tile.y = tile.baseY + Math.cos(t * 0.55 + tile.wavePhase) * 1.2;
      tile.alpha = tile.baseAlpha + Math.sin(t * 1.4 + index * 0.17) * 0.035;
    });
    this.waveBands?.forEach((band, index) => {
      band.x = ((t * (9 + index * 0.45)) % 180) - 90;
      band.y = band.baseY + Math.sin(t * 0.8 + band.wavePhase) * 3;
      band.alpha = 0.72 + Math.sin(t * 1.2 + band.wavePhase) * 0.18;
    });
  }

  drawEncounter(event) {
    const tone = event.kind === 'combat' ? colors.crimson : event.kind === 'salvage' ? colors.ember : colors.smoke;
    const marker = this.add.circle(event.x, event.y, 18, tone, 0.9).setStrokeStyle(3, colors.brass);
    this.tweens.add({ targets: marker, scale: 1.18, duration: 900, yoyo: true, repeat: -1 });
    this.add.text(event.x, event.y + 28, event.label, ui.small).setOrigin(0.5);
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create() {
    this.state = setSceneCheckpoint(this, 'Battle');
    this.crew = clone(this.state.crew);
    this.enemies = clone(enemyTemplate);
    this.cover = new Map();
    this.crew.forEach((unit) => {
      unit.statuses ||= [];
      unit.actions = 2;
      unit.done = false;
    });
    this.enemies.forEach((unit) => {
      unit.actions = 1;
      unit.done = false;
      unit.stagger = 0;
    });
    this.turn = 'prep';
    this.activeIndex = 0;
    this.selected = null;
    this.inspect = { type: 'objective' };
    this.momentum = this.state.shipSupport === 'boardingHooks' ? 20 : 10;
    this.surgeActive = false;
    this.objective = { hp: 24, maxHp: 24, pos: { x: 1, y: 3 }, label: 'Powder Store' };
    this.log = ['Boarding lines are thrown. Inspect the deck, adjust deployment, then begin battle.'];
    this.buildCover();
    this.draw();
  }

  buildCover() {
    mapTiles.forEach((row, y) => row.forEach((id, x) => {
      const terrain = terrainDefs[id];
      if (terrain.cover) this.cover.set(`${x},${y}`, { hp: terrain.cover, maxHp: terrain.cover });
    }));
  }

  draw() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(colors.navyDark);
    this.drawDeck();
    this.drawUnits();
    this.drawHud();
  }

  gridOrigin() {
    return { x: 38, y: 132, size: 58 };
  }

  gridToWorld(pos) {
    const o = this.gridOrigin();
    return { x: o.x + pos.x * o.size + o.size / 2, y: o.y + pos.y * o.size + o.size / 2 };
  }

  worldToGrid(x, y) {
    const o = this.gridOrigin();
    return { x: Math.floor((x - o.x) / o.size), y: Math.floor((y - o.y) / o.size) };
  }

  drawDeck() {
    drawPanel(this, 32, 24, 896, 72, 0.9);
    this.add.text(58, 42, this.turn === 'prep' ? 'Battle Preparation' : 'Tactical Boarding Action', ui.title);
    this.add.text(420, 50, `Objective: capture the deck and protect the powder store. Momentum Identity: ${this.state.momentumIdentity}`, {
      ...ui.label,
      fontSize: '12px',
      wordWrap: { width: 470 },
    });
    const o = this.gridOrigin();
    const g = this.add.graphics();
    g.fillStyle(0x39271c, 1);
    g.fillRoundedRect(o.x - 12, o.y - 12, o.size * 9 + 24, o.size * 6 + 24, 14);
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const id = mapTiles[y][x];
        const terrain = terrainDefs[id];
        const wx = o.x + x * o.size;
        const wy = o.y + y * o.size;
        const fill = {
          deck: 0x6a432b,
          rail: 0x4a3325,
          crate: 0x7a5638,
          powder: 0x513b2c,
          smoke: 0x4e5962,
          fire: 0x77351d,
          mast: 0x7d6240,
          objective: 0x6b2e23,
        }[id] || 0x6a432b;
        const tile = this.add.rectangle(wx, wy, o.size - 2, o.size - 2, fill, 1).setOrigin(0).setStrokeStyle(1, colors.charcoal, 0.75);
        tile.setInteractive({ useHandCursor: true });
        tile.on('pointerdown', () => this.handleTile({ x, y }));
        if (terrain.cover) {
          const c = this.cover.get(`${x},${y}`);
          this.add.rectangle(wx + 8, wy + 40, 42 * ((c?.hp || 0) / terrain.cover), 5, colors.brass, 0.9).setOrigin(0);
        }
        if (id === 'fire') this.add.text(wx + 21, wy + 18, 'F', { ...ui.h2, color: '#ff9b45' });
        if (id === 'smoke') this.add.text(wx + 17, wy + 18, 'S', { ...ui.h2, color: '#c8ced1' });
        if (id === 'powder') this.add.text(wx + 17, wy + 18, 'P', { ...ui.h2, color: '#e1c16b' });
      }
    }
    if (this.selected?.pos) {
      const p = this.gridToWorld(this.selected.pos);
      this.add.rectangle(p.x, p.y, o.size - 8, o.size - 8).setStrokeStyle(4, colors.teal).setOrigin(0.5);
    }
  }

  drawUnits() {
    this.crew.forEach((unit, index) => this.drawUnit(unit, index === this.activeIndex && this.turn === 'crew', true));
    this.enemies.forEach((unit) => {
      if (unit.hp > 0) this.drawUnit(unit, false, false);
    });
  }

  drawUnit(unit, active, ally) {
    const p = this.gridToWorld(unit.pos);
    const tone = ally ? colors.teal : colors.crimson;
    this.add.circle(p.x, p.y, 20, tone, active ? 1 : 0.86).setStrokeStyle(active ? 4 : 2, active ? colors.brassLight : colors.charcoal);
    this.add.text(p.x, p.y - 7, ally ? unit.name.split(' ')[0][0] : unit.name[0], { ...ui.label, color: '#ffffff' }).setOrigin(0.5);
    this.add.text(p.x, p.y + 22, `${unit.hp}`, { ...ui.small, color: '#f3e5c4' }).setOrigin(0.5);
    if (unit.stagger >= 100) this.add.text(p.x + 20, p.y - 26, 'STAG', { ...ui.small, color: '#ffcc77' }).setOrigin(0.5);
  }

  drawHud() {
    drawPanel(this, 584, 118, 344, 570, 0.92);
    this.add.text(606, 140, 'Tactical Command Board', ui.h2);
    this.add.text(606, 170, `Phase: ${this.turn === 'prep' ? 'Preparation' : this.turn === 'crew' ? 'Crew Turn' : 'Enemy Turn'}`, ui.label);
    this.drawMomentum();
    this.drawCrewList();
    this.drawFieldIntel();
    this.drawCommands();
    this.drawLog();
  }

  drawMomentum() {
    this.add.text(606, 204, `Crew Momentum ${this.momentum}/100`, ui.label);
    this.add.rectangle(766, 209, 122, 10, colors.charcoal, 1).setOrigin(0);
    this.add.rectangle(766, 209, Math.min(122, this.momentum * 1.22), 10, this.surgeActive ? colors.ember : colors.teal, 1).setOrigin(0);
    this.add.text(606, 226, this.surgeActive ? 'SURGE ACTIVE: damage and stagger rise.' : 'Coordinate flanks and objectives to trigger a surge.', { ...ui.small, wordWrap: { width: 280 } });
  }

  drawCrewList() {
    this.add.text(606, 258, 'Crew', ui.label);
    this.crew.forEach((unit, index) => {
      const y = 282 + index * 48;
      const active = this.turn === 'crew' && index === this.activeIndex;
      const row = this.add.rectangle(606, y, 154, 38, active ? colors.wood : colors.charcoal, active ? 0.8 : 0.5).setOrigin(0).setStrokeStyle(1, active ? colors.brass : colors.wood);
      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        this.inspect = { type: 'ally', unit };
        this.draw();
      });
      this.add.text(614, y + 6, `${unit.name.split(' ')[0]} ${unit.hp}/${unit.maxHp}`, ui.small);
      this.add.text(614, y + 21, `${unit.stance} | ${unit.actions} act`, { ...ui.small, fontSize: '10px' });
    });
  }

  drawFieldIntel() {
    drawPanel(this, 774, 258, 128, 164, 0.74);
    this.add.text(786, 274, 'Field Intel', ui.label);
    const lines = this.getIntelLines();
    lines.slice(0, 7).forEach((line, index) => {
      const value = line.length > 18 ? `${line.slice(0, 15)}...` : line;
      const text = this.add.text(786, 300 + index * 16, value, { ...ui.small, fontSize: '10px', fixedWidth: 100 });
      text.setMaxLines(1);
    });
  }

  getIntelLines() {
    const item = this.inspect;
    if (!item || item.type === 'objective') {
      return [
        'Objective: Powder Store',
        `HP: ${this.objective.hp}/${this.objective.maxHp}`,
        'Pressure: enemy sabotage',
        'Risk: explosions and burning',
        'Plan: hold midship lanes',
      ];
    }
    if (item.type === 'terrain') {
      const t = terrainAt(item.pos);
      const c = this.cover.get(`${item.pos.x},${item.pos.y}`);
      return [
        t.label,
        `Lane: ${laneFor(item.pos)}`,
        `Move Cost: ${t.move}`,
        `Cover: ${c ? `${c.hp}/${c.maxHp}` : 'None'}`,
        `Elevation: ${t.elevation}`,
        `Visibility: ${t.visibility}`,
        `Spread Risk: ${t.spread}`,
      ];
    }
    const unit = item.unit;
    const enemy = item.type === 'enemy';
    return [
      unit.name,
      `HP: ${unit.hp}/${unit.maxHp}`,
      `Stance: ${unit.stance}`,
      `Status: ${statusLine(unit)}`,
      enemy ? `Intent: ${unit.intent}` : `Momentum Role: ${stances[unit.stance].role}`,
      enemy ? `Stagger: ${unit.stagger || 0}/100` : `Actions: ${unit.actions}`,
      enemy ? `Weak: ${unit.weakness}` : `Position: ${laneFor(unit.pos)}`,
    ];
  }

  drawCommands() {
    const x = 606;
    const y = 440;
    this.add.text(x, y, 'Actions', ui.label);
    if (this.turn === 'prep') {
      button(this, x, y + 28, 96, 'Begin', () => this.beginBattle(), colors.brass);
      button(this, x + 110, y + 28, 96, 'Stance', () => this.cycleActiveStance(), colors.teal);
      button(this, x + 220, y + 28, 96, 'Next', () => this.nextPrepCrew(), colors.wood);
      this.add.text(x, y + 82, 'Prep allows full Field Intel, opening stance changes, and deployment adjustments before combat starts.', {
        ...ui.small,
        wordWrap: { width: 288 },
      });
      return;
    }
    if (this.turn !== 'crew') {
      this.add.text(x, y + 34, 'Enemy action resolving...', ui.small);
      return;
    }
    button(this, x, y + 28, 96, 'Attack', () => this.command = 'attack', colors.crimson);
    button(this, x + 110, y + 28, 96, 'Move', () => this.command = 'move', colors.teal);
    button(this, x + 220, y + 28, 96, 'Stance', () => this.cycleActiveStance(), colors.brass);
    button(this, x, y + 78, 96, 'Rally', () => this.rally(), colors.teal);
    button(this, x + 110, y + 78, 96, 'Surge', () => this.activateSurge(), colors.ember);
    button(this, x + 220, y + 78, 96, 'End', () => this.endCrewUnit(), colors.wood);
    this.add.text(x, y + 132, `Selected command: ${this.command || 'inspect'}. Click a tile or enemy.`, ui.small);
  }

  drawLog() {
    drawPanel(this, 606, 604, 296, 62, 0.68);
    this.log.slice(-3).forEach((entry, index) => {
      const line = entry.length > 46 ? `${entry.slice(0, 43)}...` : entry;
      const text = this.add.text(622, 616 + index * 16, line, { ...ui.small, fontSize: '11px', fixedWidth: 260 });
      text.setMaxLines(1);
    });
  }

  handleTile(pos) {
    const all = [...this.crew, ...this.enemies];
    const enemy = this.enemies.find((unit) => unit.hp > 0 && isSamePos(unit.pos, pos));
    const ally = this.crew.find((unit) => unit.hp > 0 && isSamePos(unit.pos, pos));
    if (enemy) this.inspect = { type: 'enemy', unit: enemy };
    else if (ally) this.inspect = { type: 'ally', unit: ally };
    else this.inspect = { type: 'terrain', pos };

    if (this.turn === 'prep') {
      const active = this.crew[this.activeIndex];
      if (!enemy && !ally && pos.x >= 6 && !occupied(pos, all)) {
        active.pos = pos;
        this.log.push(`${active.name} deploys to ${laneFor(pos)}.`);
      }
      this.draw();
      return;
    }

    if (this.turn !== 'crew') {
      this.draw();
      return;
    }
    if (this.command === 'attack' && enemy) this.attack(this.crew[this.activeIndex], enemy);
    else if (this.command === 'move' && !enemy && !ally) this.moveActive(pos);
    else this.draw();
  }

  beginBattle() {
    this.turn = 'crew';
    this.activeIndex = 0;
    this.command = null;
    this.log.push('Begin Battle. Turn-based boarding action starts.');
    this.draw();
  }

  nextPrepCrew() {
    this.activeIndex = (this.activeIndex + 1) % this.crew.length;
    this.log.push(`Preparing ${this.crew[this.activeIndex].name}.`);
    this.draw();
  }

  cycleActiveStance() {
    const unit = this.crew[this.activeIndex];
    const keys = Object.keys(stances);
    unit.stance = keys[(keys.indexOf(unit.stance) + 1) % keys.length];
    this.momentum = Math.min(100, this.momentum + (unit.stance === 'Command' ? 8 : 4));
    this.log.push(`${unit.name} shifts to ${unit.stance}.`);
    this.draw();
  }

  moveActive(pos) {
    const unit = this.crew[this.activeIndex];
    if (unit.actions <= 0) return;
    const t = terrainAt(pos);
    const max = unit.stance === 'Raider' ? 4 : unit.stance === 'Brace' ? 2 : 3;
    if (distance(unit.pos, pos) > max || pos.x < 0 || pos.x > 8 || pos.y < 0 || pos.y > 5) {
      this.log.push('Move blocked: too far for current stance.');
      this.draw();
      return;
    }
    unit.pos = pos;
    unit.actions -= 1;
    if (t.hazard === 'Burning') this.applyStatus(unit, 'Burning');
    if (t.hazard === 'Smoke-Choked') this.applyStatus(unit, 'Smoke-Choked');
    if (unit.stance === 'Raider') this.momentum = Math.min(100, this.momentum + 10);
    this.log.push(`${unit.name} repositions through ${t.label}.`);
    this.command = null;
    this.checkUnitDone();
    this.draw();
  }

  attack(attacker, target) {
    if (attacker.actions <= 0 || target.hp <= 0) return;
    const gap = distance(attacker.pos, target.pos);
    const flank = Math.abs(attacker.pos.y - target.pos.y) >= 2 || attacker.pos.x < target.pos.x;
    let damage = 5;
    let stagger = 18;
    if (attacker.stance === 'Boarding' && gap <= 2) {
      damage += 4;
      stagger += 18;
    }
    if (attacker.stance === 'Marksman' && gap >= 3) {
      damage += 4;
      this.applyStatus(target, 'Suppressed');
    }
    if (attacker.stance === 'Raider' && flank) {
      damage += 3;
      stagger += 28;
      this.applyStatus(target, 'Exposed');
    }
    if (attacker.stance === 'Command') {
      this.applyStatus(attacker, 'Rallying');
      this.momentum = Math.min(100, this.momentum + 14);
    }
    if (this.surgeActive) {
      damage += 3;
      stagger += 20;
    }
    if (target.statuses.includes('Exposed')) damage += 2;
    if (target.statuses.includes('Powder-Soaked') && attacker.stance === 'Marksman') {
      damage += 3;
      this.applyStatus(target, 'Burning');
    }
    target.hp = Math.max(0, target.hp - damage);
    target.stagger = Math.min(100, (target.stagger || 0) + stagger);
    if (target.stagger >= 100) {
      this.applyStatus(target, 'Exposed');
      this.momentum = Math.min(100, this.momentum + 18);
      this.log.push(`${target.name} staggers under coordinated pressure.`);
    }
    attacker.actions -= 1;
    this.momentum = Math.min(100, this.momentum + 8);
    this.log.push(`${attacker.name} hits ${target.name} for ${damage}.`);
    if (target.hp <= 0) this.log.push(`${target.name} is defeated.`);
    this.command = null;
    this.checkBattleEnd();
    this.checkUnitDone();
    this.draw();
  }

  rally() {
    const unit = this.crew[this.activeIndex];
    if (unit.actions <= 0) return;
    this.crew.forEach((member) => this.applyStatus(member, 'Rallying'));
    this.momentum = Math.min(100, this.momentum + (unit.stance === 'Command' ? 24 : 12));
    unit.actions -= 1;
    this.log.push(`${unit.name} rallies the crew.`);
    this.checkUnitDone();
    this.draw();
  }

  activateSurge() {
    if (this.momentum < 100 || this.surgeActive) {
      this.log.push('Surge unavailable: build full crew momentum first.');
      this.draw();
      return;
    }
    this.momentum = 0;
    this.surgeActive = true;
    this.log.push(`${this.state.momentumIdentity} surge ignites.`);
    this.draw();
  }

  applyStatus(unit, status) {
    unit.statuses ||= [];
    if (!unit.statuses.includes(status)) unit.statuses.push(status);
  }

  checkUnitDone() {
    const unit = this.crew[this.activeIndex];
    if (unit.actions <= 0) this.endCrewUnit();
  }

  endCrewUnit() {
    const unit = this.crew[this.activeIndex];
    unit.done = true;
    unit.actions = 0;
    const next = this.crew.findIndex((member) => member.hp > 0 && !member.done);
    if (next >= 0) {
      this.activeIndex = next;
      this.command = null;
      this.draw();
      return;
    }
    this.turn = 'enemy';
    this.command = null;
    this.time.delayedCall(450, () => this.enemyTurn());
    this.draw();
  }

  enemyTurn() {
    this.enemies.filter((enemy) => enemy.hp > 0).forEach((enemy) => {
      const target = this.closestCrew(enemy);
      if (!target) return;
      if (enemy.id === 'powder-monkey' && distance(enemy.pos, this.objective.pos) <= 1) {
        this.objective.hp = Math.max(0, this.objective.hp - 5);
        this.log.push(`${enemy.name} sabotages the powder store.`);
        return;
      }
      if (distance(enemy.pos, target.pos) <= 2) {
        let damage = enemy.stagger >= 100 ? 2 : 5;
        if (target.stance === 'Brace') damage -= 2;
        if (target.statuses.includes('Rallying')) damage -= 1;
        target.hp = Math.max(0, target.hp - Math.max(1, damage));
        if (enemy.stance === 'Boarding') this.applyStatus(target, 'Panic');
        if (enemy.stance === 'Marksman') this.applyStatus(target, 'Suppressed');
        this.log.push(`${enemy.name} pressures ${target.name}.`);
      } else {
        enemy.pos.x += Math.sign(target.pos.x - enemy.pos.x);
        enemy.pos.y += Math.sign(target.pos.y - enemy.pos.y);
        this.log.push(`${enemy.name} advances.`);
      }
    });
    this.tickStatuses();
    this.checkBattleEnd();
    this.crew.forEach((unit) => {
      unit.actions = 2;
      unit.done = false;
    });
    this.enemies.forEach((unit) => {
      unit.stagger = Math.max(0, (unit.stagger || 0) - 12);
    });
    this.surgeActive = false;
    if (this.turn !== 'ended') {
      this.turn = 'crew';
      this.activeIndex = this.crew.findIndex((unit) => unit.hp > 0);
    }
    this.draw();
  }

  closestCrew(enemy) {
    return [...this.crew].filter((unit) => unit.hp > 0).sort((a, b) => distance(enemy.pos, a.pos) - distance(enemy.pos, b.pos))[0];
  }

  tickStatuses() {
    [...this.crew, ...this.enemies].forEach((unit) => {
      if (unit.hp <= 0) return;
      if (unit.statuses.includes('Burning')) {
        const burn = Math.max(1, Math.ceil(unit.maxHp / 16));
        unit.hp = Math.max(0, unit.hp - burn);
        this.log.push(`${unit.name} burns for ${burn}.`);
      }
      unit.statuses = unit.statuses.filter((status) => status !== 'Rallying');
    });
  }

  checkBattleEnd() {
    const enemiesAlive = this.enemies.some((unit) => unit.hp > 0);
    const crewAlive = this.crew.some((unit) => unit.hp > 0);
    if (!crewAlive || this.objective.hp <= 0) {
      this.turn = 'ended';
      this.log.push('Defeat. The powder store falls.');
      this.time.delayedCall(900, () => this.scene.start('HavenScene'));
      return;
    }
    if (!enemiesAlive) {
      this.turn = 'ended';
      this.state.battleWon = true;
      this.state.resources.coin += 35;
      this.state.resources.lumber += 2;
      this.state.resources.scrap += 3;
      this.state.resources.blackPowder += 1;
      this.state.resources.reputation += 1;
      this.state.navigationMessage = 'Boarding action won. Loot and salvage returned to the haven.';
      this.state.pendingHavenSummary = {
        title: 'Cargo Unloaded',
        lines: [
          '+35 Coin from captured stores',
          '+2 Lumber and +3 Scrap for construction',
          '+1 Black Powder recovered',
          '+1 Reputation as the haven grows bolder',
        ],
      };
      this.state.lastScene = 'Haven';
      saveAutoGame(this.state);
      this.log.push('Victory. The deck is captured.');
      this.time.delayedCall(1100, () => this.scene.start('HavenScene'));
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: WIDTH,
  height: HEIGHT,
  pauseOnBlur: false,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  backgroundColor: '#07111d',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, HavenScene, NavigationScene, BattleScene],
});

window.__pirateTactics = game;
