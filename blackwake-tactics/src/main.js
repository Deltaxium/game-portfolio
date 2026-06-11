import Phaser from 'phaser';
import beachSandTilesUrl from './assets/beach-sand-tiles.png';
import calmWaterUrl from './assets/calm-water-autotiles-anim.png';
import havenShoreCrashUrl from './assets/haven-shore-crash.png';
import movingWaterUrl from './assets/moving-water-open.png';
import oceanWaterUrl from './assets/ocean-autotiles-anim.png';
import scallywagBlueUrl from './assets/scallywag/pirates-blue.png';
import scallywagGrayUrl from './assets/scallywag/pirates-gray.png';
import scallywagGreenUrl from './assets/scallywag/pirates-green.png';
import scallywagRedUrl from './assets/scallywag/pirates-red.png';
import scallywagWhiteUrl from './assets/scallywag/pirates-white.png';
import scallywagYellowUrl from './assets/scallywag/pirates-yellow.png';

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
    equipment: ['Captain\'s Cutlass', 'Flintlock Pistol', 'Command Sash'],
    level: 1,
    xp: 0,
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
    equipment: ['Deck Musket', 'Powder Horn', 'Rangefinder'],
    level: 1,
    xp: 0,
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
    equipment: ['Hook Blades', 'Grapple Line', 'Boarding Belt'],
    level: 1,
    xp: 0,
    hp: 27,
    maxHp: 27,
    pos: { x: 7, y: 4 },
    signature: 'Grapple Work',
    specialty: 'Flanking, repositioning, and objective pressure.',
    passive: 'Flank attacks build extra stagger and Exposed.',
  },
];

const crewSkillTrees = {
  captain: [
    {
      level: 1,
      name: 'Rallying Orders',
      type: 'Command Skill',
      description: 'Rally grants the crew Rallying and builds extra momentum for Command stance.',
    },
    {
      level: 2,
      name: 'Hold The Line',
      type: 'Passive',
      description: 'Crew with Rallying take less enemy pressure damage.',
    },
    {
      level: 4,
      name: 'Decisive Signal',
      type: 'Command Skill',
      description: 'First Surge in a battle adds bonus stagger to every crew attack that turn.',
    },
    {
      level: 6,
      name: 'No Quarter',
      type: 'Passive',
      description: 'Defeating a staggered enemy grants a larger momentum burst.',
    },
  ],
  gunner: [
    {
      level: 1,
      name: 'Suppression Fire',
      type: 'Marksman Skill',
      description: 'Long-range Marksman attacks apply Suppressed.',
    },
    {
      level: 2,
      name: 'Steady Sight',
      type: 'Passive',
      description: 'Attacks from cover deal bonus damage.',
    },
    {
      level: 4,
      name: 'Powder Spark',
      type: 'Marksman Skill',
      description: 'Marksman hits against Powder-Soaked enemies also apply Burning.',
    },
    {
      level: 6,
      name: 'Deadeye Break',
      type: 'Passive',
      description: 'Critical long shots build extra stagger against Exposed enemies.',
    },
  ],
  raider: [
    {
      level: 1,
      name: 'Grapple Work',
      type: 'Raider Skill',
      description: 'Flank attacks apply Exposed and build extra stagger.',
    },
    {
      level: 2,
      name: 'Fast Boarding',
      type: 'Passive',
      description: 'Raider movement builds extra crew momentum.',
    },
    {
      level: 4,
      name: 'Hook And Drag',
      type: 'Raider Skill',
      description: 'Close attacks add Hooked, making enemy repositioning weaker.',
    },
    {
      level: 6,
      name: 'Cutpurse Tempo',
      type: 'Passive',
      description: 'Defeating an Exposed enemy refunds one action once per battle.',
    },
  ],
};

const crewWeaponCatalog = {
  captainsCutlass: { id: 'captainsCutlass', name: 'Captain\'s Cutlass', slot: 'weapon', crew: ['captain', 'raider'], damage: 2, stagger: 8, range: 1, tags: ['melee', 'command'], description: 'Reliable close weapon. Adds stagger when the wielder is in Command or Boarding stance.' },
  flintlockPistol: { id: 'flintlockPistol', name: 'Flintlock Pistol', slot: 'weapon', crew: ['captain', 'gunner', 'raider'], damage: 1, stagger: 4, range: 3, tags: ['ranged'], description: 'Short ranged shot. Lower damage, but safer from midship.' },
  deckMusket: { id: 'deckMusket', name: 'Deck Musket', slot: 'weapon', crew: ['gunner', 'captain'], damage: 3, stagger: 7, range: 5, tags: ['ranged', 'marksman'], description: 'Long sightline weapon. Best from cover and Marksman stance.' },
  boardingAxe: { id: 'boardingAxe', name: 'Boarding Axe', slot: 'weapon', crew: ['captain', 'raider'], damage: 4, stagger: 12, range: 1, tags: ['melee', 'break'], description: 'Heavy boarding weapon. Strong stagger at close range.' },
  hookBlades: { id: 'hookBlades', name: 'Hook Blades', slot: 'weapon', crew: ['raider'], damage: 2, stagger: 14, range: 1, tags: ['melee', 'flank'], description: 'Fast paired hooks. Excellent for Raider flanks and exposed targets.' },
  handMortar: { id: 'handMortar', name: 'Hand Mortar', slot: 'weapon', crew: ['gunner'], damage: 4, stagger: 5, range: 4, tags: ['ranged', 'powder'], description: 'Explosive sidearm. Hits hard, but favors short firefights.' },
};

const crewEquipmentCatalog = {
  commandSash: { id: 'commandSash', name: 'Command Sash', slot: 'trinket', crew: ['captain'], tags: ['command'], description: 'Rally and Command actions generate more momentum.', momentum: 6 },
  powderHorn: { id: 'powderHorn', name: 'Powder Horn', slot: 'kit', crew: ['gunner', 'captain'], tags: ['powder'], description: 'Ranged attacks build extra stagger.', stagger: 6 },
  rangefinder: { id: 'rangefinder', name: 'Rangefinder', slot: 'trinket', crew: ['gunner'], tags: ['marksman'], description: 'Long-range attacks gain bonus damage.', rangedDamage: 2 },
  grappleLine: { id: 'grappleLine', name: 'Grapple Line', slot: 'kit', crew: ['raider'], tags: ['movement'], description: 'Raider movement and flanks build extra momentum.', momentum: 4 },
  boardingBelt: { id: 'boardingBelt', name: 'Boarding Belt', slot: 'trinket', crew: ['raider', 'captain'], tags: ['boarding'], description: 'Close attacks add bonus damage.', closeDamage: 2 },
  platedCoat: { id: 'platedCoat', name: 'Plated Coat', slot: 'armor', crew: ['captain', 'gunner', 'raider'], tags: ['defense'], description: 'Adds max HP and reduces incoming pressure.', hp: 4 },
  surgeonWraps: { id: 'surgeonWraps', name: 'Surgeon Wraps', slot: 'kit', crew: ['captain', 'gunner', 'raider'], tags: ['support'], description: 'Improves recovery and keeps crew stable after battles.', hp: 2 },
};

const legacyEquipmentIds = {
  'Captain\'s Cutlass': 'captainsCutlass',
  'Flintlock Pistol': 'flintlockPistol',
  'Deck Musket': 'deckMusket',
  'Hook Blades': 'hookBlades',
  'Command Sash': 'commandSash',
  'Powder Horn': 'powderHorn',
  Rangefinder: 'rangefinder',
  'Grapple Line': 'grappleLine',
  'Boarding Belt': 'boardingBelt',
};

const defaultCrewLoadouts = {
  captain: { weapon: 'captainsCutlass', equipment: ['commandSash'] },
  gunner: { weapon: 'deckMusket', equipment: ['powderHorn', 'rangefinder'] },
  raider: { weapon: 'hookBlades', equipment: ['grappleLine', 'boardingBelt'] },
};

const crewWeaponTypeLocks = {
  captain: ['captainsCutlass', 'boardingAxe'],
  gunner: ['deckMusket', 'handMortar', 'flintlockPistol'],
  raider: ['hookBlades', 'boardingAxe'],
};

const enemyTemplate = [
  {
    id: 'bilgerunner',
    name: 'Bilgerunner',
    role: 'Reckless boarding attacker',
    stance: 'Boarding',
    level: 1,
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
    level: 1,
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
    level: 1,
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
    level: 2,
    hp: 24,
    maxHp: 24,
    pos: { x: 1, y: 3 },
    statuses: [],
    intent: 'Hold the powder store',
    weakness: 'Defense collapses under multi-angle pressure.',
  },
];

function enemyUnit(id, name, hp, pos, details = {}) {
  return {
    id,
    name,
    role: details.role || 'Hostile combatant',
    stance: details.stance,
    ...(details.level ? { level: details.level } : {}),
    hp,
    maxHp: hp,
    pos,
    statuses: details.statuses || [],
    intent: details.intent || 'Pressure the crew',
    weakness: details.weakness || 'Vulnerable to coordinated pressure.',
  };
}

const battleEncounters = {
  navyPatrol: {
    title: 'Navy Patrol',
    battlefield: 'navy',
    objectiveLabel: 'Signal Chest',
    objectiveHp: 22,
    rewards: { coin: 28, lumber: 1, scrap: 2, blackPowder: 1, reputation: 1 },
    victoryLines: ['+28 Coin from seized payroll', '+1 Lumber and +2 Scrap from the patrol boat', '+1 Black Powder recovered', '+1 Reputation for breaking the blockade'],
    enemies: [
      { ...enemyTemplate[2], id: 'navy-sharpshooter', name: 'Navy Sharpshooter', hp: 17, maxHp: 17, pos: { x: 2, y: 1 }, intent: 'Pin the helm crew' },
      { ...enemyTemplate[3], id: 'marine-guard', name: 'Marine Guard', hp: 25, maxHp: 25, pos: { x: 1, y: 3 }, intent: 'Hold the signal chest' },
      { ...enemyTemplate[0], id: 'cutlass-marine', name: 'Cutlass Marine', hp: 19, maxHp: 19, pos: { x: 2, y: 4 }, intent: 'Board aggressively' },
    ],
  },
  wreckRaiders: {
    title: 'Burning Wreck Raiders',
    battlefield: 'wreck',
    objectiveLabel: 'Cargo Hoist',
    objectiveHp: 18,
    rewards: { coin: 18, lumber: 3, scrap: 3, blackPowder: 0, reputation: 0 },
    victoryLines: ['+18 Coin from hidden strongboxes', '+3 Lumber and +3 Scrap salvaged from the wreck'],
    enemies: [
      { ...enemyTemplate[1], id: 'torch-runner', name: 'Torch Runner', hp: 16, maxHp: 16, pos: { x: 1, y: 2 }, intent: 'Spread fire through cargo' },
      { ...enemyTemplate[0], id: 'wreck-raider', name: 'Wreck Raider', hp: 18, maxHp: 18, pos: { x: 2, y: 3 }, intent: 'Rush exposed crew' },
      { ...enemyTemplate[0], id: 'reef-cutthroat', name: 'Reef Cutthroat', hp: 15, maxHp: 15, pos: { x: 1, y: 4 }, intent: 'Flank through smoke' },
    ],
  },
  stormCorsairs: {
    title: 'Storm Bank Corsairs',
    battlefield: 'storm',
    objectiveLabel: 'Storm Anchor',
    objectiveHp: 26,
    rewards: { coin: 40, lumber: 1, scrap: 4, blackPowder: 2, reputation: 1 },
    victoryLines: ['+40 Coin from corsair plunder', '+1 Lumber and +4 Scrap recovered', '+2 Black Powder recovered', '+1 Reputation for surviving the storm bank'],
    enemies: [
      { ...enemyTemplate[3], id: 'corsair-bulwark', name: 'Corsair Bulwark', hp: 28, maxHp: 28, pos: { x: 1, y: 3 }, intent: 'Anchor the boarding lane' },
      { ...enemyTemplate[2], id: 'storm-marksman', name: 'Storm Marksman', hp: 16, maxHp: 16, pos: { x: 2, y: 1 }, statuses: ['Smoke-Choked'], intent: 'Shoot through rain breaks' },
      { ...enemyTemplate[1], id: 'powder-saboteur', name: 'Powder Saboteur', hp: 18, maxHp: 18, pos: { x: 2, y: 4 }, intent: 'Ignite wet powder stores' },
      { ...enemyTemplate[0], id: 'hook-corsair', name: 'Hook Corsair', hp: 20, maxHp: 20, pos: { x: 1, y: 2 }, intent: 'Drag crew out of cover' },
    ],
  },
  smugglersHollow: {
    title: 'Smuggler\'s Hollow',
    battlefield: 'hollow',
    objectiveLabel: 'Contraband Cache',
    objectiveHp: 20,
    rewards: { coin: 22, lumber: 1, scrap: 2, blackPowder: 1, reputation: 0 },
    victoryLines: ['+22 Coin from hidden contraband', '+1 Lumber and +2 Scrap recovered', '+1 Black Powder seized'],
    enemies: [
      { ...enemyTemplate[0], pos: { x: 1, y: 2 } },
      { ...enemyTemplate[1], pos: { x: 2, y: 4 } },
      { ...enemyTemplate[2], pos: { x: 2, y: 1 } },
      { ...enemyTemplate[3], pos: { x: 1, y: 3 } },
    ],
  },
  boarbackIsland: {
    title: 'Boarback Island',
    battlefield: 'boarback',
    objectiveLabel: 'Shore Camp',
    objectiveHp: 18,
    rewards: { coin: 10, lumber: 3, scrap: 1, blackPowder: 0, reputation: 0 },
    victoryLines: ['+3 Lumber from the island camp', '+10 Coin and +1 Scrap salvaged'],
    enemies: [
      enemyUnit('reef-hound', 'Reef Hound', 14, { x: 1, y: 2 }, { role: 'Pack hunter', intent: 'Hunt isolated crew', weakness: 'Breaks under grouped counterattacks.' }),
      enemyUnit('saltback-boar', 'Saltback Boar', 26, { x: 1, y: 3 }, { role: 'Charging beast', intent: 'Destroy cover and charge lanes', weakness: 'Poor turning and exposed flanks.' }),
      enemyUnit('razor-gull', 'Razor Gull', 12, { x: 2, y: 1 }, { role: 'Harassing seabird', intent: 'Create panic and steal supplies', weakness: 'Fragile when pinned.' }),
    ],
  },
  mangroveIsle: {
    title: 'Mangrove Isle',
    battlefield: 'mangrove',
    objectiveLabel: 'Shoreline Cache',
    objectiveHp: 20,
    rewards: { coin: 16, lumber: 2, scrap: 1, blackPowder: 0, reputation: 0 },
    victoryLines: ['+16 Coin from the shoreline cache', '+2 Lumber and +1 Scrap recovered'],
    enemies: [
      enemyUnit('mangrove-crocodile', 'Mangrove Crocodile', 30, { x: 1, y: 3 }, { role: 'Ambush predator', intent: 'Control the shoreline', weakness: 'Slow outside water cover.' }),
      enemyUnit('reef-stalker', 'Reef Stalker', 18, { x: 2, y: 2 }, { role: 'Elusive predator', intent: 'Ambush and retreat', weakness: 'Falters when revealed.' }),
      enemyUnit('firetail-monkey', 'Firetail Monkey', 13, { x: 2, y: 4 }, { role: 'Destructive pest', intent: 'Throw debris and relocate', weakness: 'Low endurance.' }),
    ],
  },
  crabCay: {
    title: 'Crab Cay',
    battlefield: 'crab',
    objectiveLabel: 'Tidal Marker',
    objectiveHp: 24,
    rewards: { coin: 14, lumber: 1, scrap: 3, blackPowder: 0, reputation: 0 },
    victoryLines: ['+3 Scrap pried from the tidal flats', '+14 Coin and +1 Lumber recovered'],
    enemies: [
      enemyUnit('ironclaw-crab', 'Ironclaw Crab', 26, { x: 1, y: 3 }, { role: 'Defensive blocker', intent: 'Occupy the objective', weakness: 'Can be outmaneuvered.' }),
      enemyUnit('hammerjaw-seal', 'Hammerjaw Seal', 24, { x: 2, y: 2 }, { role: 'Shoreline bully', intent: 'Control water access', weakness: 'Poor reach inland.' }),
      enemyUnit('razor-gull', 'Razor Gull', 12, { x: 2, y: 1 }, { role: 'Harassing seabird', intent: 'Harass the backline', weakness: 'Fragile when pinned.' }),
    ],
  },
  pirateStronghold: {
    title: 'Pirate Stronghold',
    battlefield: 'stronghold',
    objectiveLabel: 'Boss Plunder',
    objectiveHp: 28,
    rewards: { coin: 58, lumber: 2, scrap: 5, blackPowder: 2, reputation: 2 },
    victoryLines: ['+58 Coin from elite pirate plunder', '+2 Lumber, +5 Scrap, and +2 Black Powder recovered', '+2 Reputation for breaking a stronghold'],
    enemies: [
      enemyUnit('barnacled-butcher', 'The Barnacled Butcher', 38, { x: 1, y: 3 }, { stance: 'Boarding', role: 'Elite bruiser', intent: 'Crush the frontline', weakness: 'Can be kited and exposed.' }),
      enemyUnit('widow-mire', 'Widow Mire', 24, { x: 2, y: 1 }, { stance: 'Raider', role: 'Assassin', intent: 'Isolate exposed crew', weakness: 'Weak when forced into open lanes.' }),
      enemyUnit('gravewake-captain', 'Gravewake Captain', 34, { x: 2, y: 4 }, { stance: 'Command', role: 'Elite commander', intent: 'Coordinate the stronghold crew', weakness: 'Loses tempo when allies fall.' }),
    ],
  },
  tidejawEvent: {
    title: 'Tidejaw',
    battlefield: 'deepOcean',
    objectiveLabel: 'Escape Route',
    objectiveHp: 30,
    rewards: { coin: 34, lumber: 0, scrap: 4, blackPowder: 0, reputation: 2 },
    victoryLines: ['+34 Coin from wreckage scattered by Tidejaw', '+4 Scrap recovered', '+2 Reputation for surviving the deep ocean'],
    enemies: [
      enemyUnit('tidejaw', 'Tidejaw', 46, { x: 1, y: 3 }, { role: 'Legendary shark', intent: 'Create danger zones and force movement', weakness: 'Harpoons and spacing slow its charges.' }),
    ],
  },
  stormwingEvent: {
    title: 'Stormwing',
    battlefield: 'cliffs',
    objectiveLabel: 'Cliffside Perch',
    objectiveHp: 26,
    rewards: { coin: 28, lumber: 1, scrap: 2, blackPowder: 0, reputation: 2 },
    victoryLines: ['+28 Coin from the cliffside cache', '+1 Lumber and +2 Scrap recovered', '+2 Reputation for forcing Stormwing back'],
    enemies: [
      enemyUnit('stormwing', 'Stormwing', 36, { x: 1, y: 2 }, { role: 'Legendary seabird', intent: 'Relocate units and panic the backline', weakness: 'Grounded when pressured from multiple angles.' }),
      enemyUnit('razor-gull', 'Razor Gull', 12, { x: 2, y: 4 }, { role: 'Harassing seabird', intent: 'Screen Stormwing', weakness: 'Fragile when pinned.' }),
    ],
  },
  ironshellEvent: {
    title: 'Ironshell',
    battlefield: 'ironshell',
    objectiveLabel: 'Living Reef',
    objectiveHp: 34,
    rewards: { coin: 42, lumber: 2, scrap: 3, blackPowder: 0, reputation: 2 },
    victoryLines: ['+42 Coin in rare ocean relics', '+2 Lumber and +3 Scrap recovered', '+2 Reputation for navigating Ironshell'],
    enemies: [
      enemyUnit('ironshell', 'Ironshell', 52, { x: 1, y: 3 }, { role: 'Living battlefield', intent: 'Shift the fight around its shell', weakness: 'Ignores crew unless the reef is disturbed.' }),
      enemyUnit('ironclaw-crab', 'Ironclaw Crab', 24, { x: 2, y: 2 }, { role: 'Shell guardian', intent: 'Block paths across the shell', weakness: 'Can be outmaneuvered.' }),
    ],
  },
};

const characterSpriteProfiles = {
  captain: { palette: [0x1b2430, colors.brass, 0x0b0d10], build: 'coat', hat: 'tricorn', hair: 0x120b08, weapons: ['cutlass', 'pistol'], mark: 'scar', posture: 'command' },
  gunner: { palette: [0x39464d, 0xb8874f, 0x1b1d1f], build: 'thin', hat: 'none', weapons: ['musket'], prop: 'spyglass', posture: 'calm' },
  raider: { palette: [0x4a2a1f, colors.crimson, 0x1a0f0b], build: 'lean', hat: 'bandana', weapons: ['hooks'], mark: 'scars', posture: 'low' },
  bilgerunner: { palette: [0x8b5a3c, 0x2b1a13, colors.crimson], build: 'bare', hat: 'none', weapons: ['cutlass'], mark: 'tattoos', posture: 'rush' },
  'powder-monkey': { palette: [0x4a3a2b, colors.ember, 0x0b0d10], build: 'small', hat: 'goggles', weapons: ['bomb'], prop: 'satchel', mark: 'burns', posture: 'skitter' },
  blackscope: { palette: [0x151a20, 0x27313b, colors.smoke], build: 'thin', hat: 'mask', weapons: ['rifle'], posture: 'cold' },
  hullguard: { palette: [0x26313a, 0x4d4035, colors.brass], build: 'large', hat: 'none', weapons: ['shield', 'cutlass'], posture: 'guard' },
  'navy-sharpshooter': { palette: [0x1d3f6e, 0xf3e5c4, colors.brass], build: 'thin', hat: 'officer', weapons: ['musket'], posture: 'disciplined' },
  'marine-guard': { palette: [0x24486f, 0xb9c4cf, colors.brass], build: 'large', hat: 'officer', weapons: ['saber', 'breastplate'], posture: 'guard' },
  'cutlass-marine': { palette: [0x28517c, 0xf3e5c4, colors.brass], build: 'coat', hat: 'officer', weapons: ['saber'], posture: 'rush' },
  'torch-runner': { palette: [0x3b2a20, colors.ember, 0x18100c], build: 'lean', hat: 'none', weapons: ['torch'], mark: 'burns', posture: 'skitter' },
  'wreck-raider': { palette: [0x5b3f2c, colors.brass, 0x2a2e35], build: 'coat', hat: 'none', weapons: ['cutlass'], prop: 'pouches', posture: 'rush' },
  'reef-cutthroat': { palette: [0x20252a, 0x42515a, colors.crimson], build: 'thin', hat: 'hood', weapons: ['knives'], posture: 'low' },
  'corsair-bulwark': { palette: [0x2a2d34, 0x68727d, colors.brass], build: 'large', hat: 'none', weapons: ['shield', 'saber'], prop: 'trophies', posture: 'guard' },
  'storm-marksman': { palette: [0x1b2730, 0x4e5962, colors.brass], build: 'thin', hat: 'hood', weapons: ['rifle'], prop: 'telescope', posture: 'cold' },
  'powder-saboteur': { palette: [0x3c3126, colors.ember, colors.teal], build: 'lean', hat: 'goggles', weapons: ['bomb'], prop: 'tools', mark: 'burns', posture: 'skitter' },
  'hook-corsair': { palette: [0x2a1c18, colors.crimson, colors.brass], build: 'large', hat: 'none', weapons: ['hook'], prop: 'chains', posture: 'rush' },
  'reef-hound': { palette: [0xb8874f, 0x6b4a2f, 0x241914], build: 'beast', weapons: ['fangs'], posture: 'low' },
  'razor-gull': { palette: [0xc8ced1, 0x4e5962, colors.crimson], build: 'bird', weapons: ['beak'], posture: 'skitter' },
  'saltback-boar': { palette: [0x5b4a3b, 0xc8ced1, 0x241914], build: 'boar', weapons: ['tusks'], posture: 'rush' },
  'mangrove-crocodile': { palette: [0x315f43, 0x1f4a32, 0xd9c58e], build: 'croc', weapons: ['jaws'], posture: 'low' },
  'reef-stalker': { palette: [0x242120, 0x8b6f45, 0x0b0d10], build: 'cat', weapons: ['claws'], posture: 'low' },
  'ironclaw-crab': { palette: [0x7d6240, 0xb9c4cf, colors.brass], build: 'crab', weapons: ['claws'], posture: 'guard' },
  'hammerjaw-seal': { palette: [0x4e5962, 0xc8ced1, 0x20252a], build: 'seal', weapons: ['jaw'], posture: 'guard' },
  'firetail-monkey': { palette: [0x6b4a2f, colors.ember, 0xf3e5c4], build: 'monkey', weapons: ['throw'], posture: 'skitter' },
  'barnacled-butcher': { palette: [0x26313a, 0x9fb2ad, colors.crimson], build: 'huge', hat: 'none', weapons: ['axe'], prop: 'barnacles', posture: 'rush' },
  'widow-mire': { palette: [0x11161d, 0x2d1f33, colors.crimson], build: 'thin', hat: 'hood', weapons: ['daggers'], posture: 'low' },
  'gravewake-captain': { palette: [0x35243d, colors.brass, colors.crimson], build: 'coat', hat: 'tricorn', weapons: ['saber', 'pistol'], posture: 'command' },
  tidejaw: { palette: [0x263d4a, 0x8fa6aa, colors.crimson], build: 'shark', weapons: ['jaws'], prop: 'harpoons', posture: 'rush' },
  stormwing: { palette: [0x4e5962, 0xc8ced1, colors.teal], build: 'giant-bird', weapons: ['beak'], posture: 'command' },
  ironshell: { palette: [0x315f43, 0x7d6240, colors.teal], build: 'turtle', weapons: ['shell'], prop: 'coral', posture: 'guard' },
};

const stanceSpriteDetails = {
  Boarding: { accent: colors.crimson, lean: -5, weaponLift: 8 },
  Brace: { accent: colors.brass, lean: 0, weaponLift: -3 },
  Marksman: { accent: colors.teal, lean: 2, weaponLift: -12 },
  Raider: { accent: colors.ember, lean: -9, weaponLift: 11 },
  Command: { accent: colors.brassLight, lean: 0, weaponLift: 0 },
};

const creatureBuilds = ['beast', 'bird', 'boar', 'croc', 'cat', 'crab', 'seal', 'monkey', 'shark', 'giant-bird', 'turtle'];
const scallywagFrameColumns = 19;
const scallywagSpriteProfiles = {
  captain: { sheet: 'scallywag-red', row: 0, outfit: 8, dir: 0, scale: 2.75, badge: 'captain' },
  gunner: { sheet: 'scallywag-blue', row: 10, outfit: 8, dir: 2, scale: 2.72, badge: 'gunner' },
  raider: { sheet: 'scallywag-gray', row: 8, outfit: 4, dir: 2, scale: 2.68, badge: 'raider' },
  bilgerunner: { sheet: 'scallywag-yellow', row: 4, outfit: 4, dir: 2, scale: 2.65 },
  'powder-monkey': { sheet: 'scallywag-green', row: 14, outfit: 4, dir: 0, scale: 2.52 },
  blackscope: { sheet: 'scallywag-gray', row: 12, outfit: 8, dir: 2, scale: 2.58 },
  hullguard: { sheet: 'scallywag-red', row: 18, outfit: 8, dir: 0, scale: 2.82 },
  'navy-sharpshooter': { sheet: 'scallywag-blue', row: 10, outfit: 8, dir: 2, scale: 2.62 },
  'marine-guard': { sheet: 'scallywag-white', row: 18, outfit: 8, dir: 0, scale: 2.78 },
  'cutlass-marine': { sheet: 'scallywag-blue', row: 0, outfit: 8, dir: 0, scale: 2.7 },
  'torch-runner': { sheet: 'scallywag-yellow', row: 14, outfit: 4, dir: 2, scale: 2.58 },
  'wreck-raider': { sheet: 'scallywag-green', row: 8, outfit: 8, dir: 2, scale: 2.64 },
  'reef-cutthroat': { sheet: 'scallywag-gray', row: 16, outfit: 4, dir: 2, scale: 2.58 },
  'corsair-bulwark': { sheet: 'scallywag-gray', row: 18, outfit: 8, dir: 0, scale: 2.86 },
  'storm-marksman': { sheet: 'scallywag-white', row: 12, outfit: 8, dir: 2, scale: 2.58 },
  'powder-saboteur': { sheet: 'scallywag-yellow', row: 14, outfit: 4, dir: 0, scale: 2.58 },
  'hook-corsair': { sheet: 'scallywag-red', row: 16, outfit: 8, dir: 2, scale: 2.76 },
  'barnacled-butcher': { sheet: 'scallywag-gray', row: 18, outfit: 8, dir: 0, scale: 3.05 },
  'widow-mire': { sheet: 'scallywag-gray', row: 16, outfit: 4, dir: 2, scale: 2.62 },
  'gravewake-captain': { sheet: 'scallywag-red', row: 0, outfit: 8, dir: 0, scale: 2.86, badge: 'captain' },
};

function normalizeCharacterId(name = '') {
  return name.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function spriteProfileFor(unit) {
  return characterSpriteProfiles[unit.id] || characterSpriteProfiles[normalizeCharacterId(unit.name)] || {
    palette: [colors.wood, colors.brass, colors.charcoal],
    build: 'coat',
    hat: 'none',
    weapons: ['cutlass'],
    posture: 'rush',
  };
}

function scallywagProfileFor(unit) {
  return scallywagSpriteProfiles[unit.id] || scallywagSpriteProfiles[normalizeCharacterId(unit.name)] || null;
}

function scallywagFrame(row, column) {
  return row * scallywagFrameColumns + column;
}

const scallywagDirectionRows = {
  down: 0,
  up: 1,
  left: 3,
  right: 2,
};

function scallywagBaseRow(profile) {
  return profile.baseRow ?? Math.floor((profile.row ?? 0) / 4) * 4;
}

function scallywagDirectionOffset(direction, facing = -1) {
  if (typeof direction === 'number') return Phaser.Math.Clamp(direction, 0, 3);
  if (direction && scallywagDirectionRows[direction] !== undefined) return scallywagDirectionRows[direction];
  return facing > 0 ? scallywagDirectionRows.right : scallywagDirectionRows.left;
}

function setScallywagPose(parts, direction, walkFrame = 0) {
  if (!parts?.body || !parts?.clothes) return;
  const offset = scallywagDirectionOffset(direction, parts.facing);
  const frame = Phaser.Math.Clamp(Math.round(walkFrame), 0, 2);
  const row = parts.baseRow + offset;
  parts.body.setFrame(scallywagFrame(row, frame));
  parts.clothes.setFrame(scallywagFrame(row, parts.outfit + frame));
}

function isCreatureProfile(profile) {
  return creatureBuilds.includes(profile?.build);
}

const terrainDefs = {
  deck: { label: 'Open Deck', move: 1, elevation: 0, visibility: 'Clear', spread: 'Low' },
  rail: { label: 'Ship Railing', move: 2, elevation: 0, cover: 8, protection: 30, visibility: 'Clear', spread: 'Low' },
  crate: { label: 'Cargo Crates', move: 2, elevation: 0, cover: 12, protection: 45, visibility: 'Partial', spread: 'Medium' },
  powder: { label: 'Powder Barrel', move: 2, elevation: 0, cover: 6, protection: 25, hazard: 'Explosion risk', spread: 'High' },
  smoke: { label: 'Smoke Bank', move: 2, elevation: 0, hazard: 'Smoke-Choked', visibility: 'Poor', spread: 'Medium' },
  fire: { label: 'Burning Debris', move: 3, elevation: 0, hazard: 'Burning', visibility: 'Poor', spread: 'High' },
  mast: { label: 'Mast Platform', move: 2, elevation: 1, cover: 10, protection: 35, visibility: 'High', spread: 'Medium' },
  objective: { label: 'Powder Store', move: 1, elevation: 0, cover: 14, protection: 40, visibility: 'Clear', spread: 'High' },
  sand: { label: 'Beach Sand', move: 1, elevation: 0, visibility: 'Clear', spread: 'Low' },
  surf: { label: 'Shallow Surf', move: 3, elevation: 0, hazard: 'Slowed', visibility: 'Clear', spread: 'Low' },
  palms: { label: 'Palm Cover', move: 2, elevation: 0, cover: 10, protection: 35, visibility: 'Partial', spread: 'Medium' },
  rocks: { label: 'Shore Rocks', move: 2, elevation: 1, cover: 12, protection: 45, visibility: 'High', spread: 'Low' },
  jungle: { label: 'Jungle Growth', move: 2, elevation: 0, cover: 8, protection: 30, visibility: 'Poor', spread: 'Medium' },
  mangrove: { label: 'Mangrove Roots', move: 3, elevation: 0, cover: 10, protection: 38, visibility: 'Poor', spread: 'Medium' },
  shallows: { label: 'Murky Shallows', move: 3, elevation: 0, hazard: 'Slowed', visibility: 'Poor', spread: 'Low' },
  tidepool: { label: 'Tide Pool', move: 3, elevation: 0, hazard: 'Slowed', visibility: 'Clear', spread: 'Low' },
  coral: { label: 'Coral Cover', move: 2, elevation: 0, cover: 9, protection: 34, visibility: 'Partial', spread: 'Low' },
  fort: { label: 'Fort Planks', move: 1, elevation: 0, visibility: 'Clear', spread: 'Low' },
  barricade: { label: 'Barricade', move: 2, elevation: 0, cover: 14, protection: 50, visibility: 'Partial', spread: 'Medium' },
  treasure: { label: 'Treasure Stack', move: 2, elevation: 0, cover: 10, protection: 36, visibility: 'Partial', spread: 'Medium' },
  wreck: { label: 'Splintered Wreck', move: 2, elevation: 0, cover: 10, protection: 35, visibility: 'Partial', spread: 'High' },
  ember: { label: 'Hot Embers', move: 3, elevation: 0, hazard: 'Burning', visibility: 'Poor', spread: 'High' },
  storm: { label: 'Storm-Slick Deck', move: 2, elevation: 0, visibility: 'Poor', spread: 'Medium' },
  lightning: { label: 'Lightning Strike', move: 3, elevation: 0, hazard: 'Burning', visibility: 'Clear', spread: 'High' },
  reef: { label: 'Reef Shelf', move: 1, elevation: 0, visibility: 'Clear', spread: 'Low' },
  shell: { label: 'Living Shell', move: 2, elevation: 1, cover: 12, protection: 42, visibility: 'High', spread: 'Low' },
  cliff: { label: 'Cliff Perch', move: 2, elevation: 1, cover: 8, protection: 28, visibility: 'High', spread: 'Low' },
  nest: { label: 'Stormwing Nest', move: 2, elevation: 1, cover: 10, protection: 34, visibility: 'High', spread: 'Medium' },
  deep: { label: 'Deep Water', move: 3, elevation: 0, hazard: 'Slowed', visibility: 'Poor', spread: 'Low' },
};

const defaultBattleTiles = [
  ['deck', 'deck', 'mast', 'deck', 'crate', 'deck', 'rail', 'deck', 'deck'],
  ['rail', 'deck', 'deck', 'smoke', 'deck', 'crate', 'deck', 'deck', 'rail'],
  ['deck', 'crate', 'deck', 'deck', 'deck', 'deck', 'powder', 'deck', 'deck'],
  ['deck', 'objective', 'deck', 'fire', 'deck', 'crate', 'deck', 'deck', 'rail'],
  ['deck', 'deck', 'powder', 'deck', 'smoke', 'deck', 'deck', 'rail', 'deck'],
  ['rail', 'deck', 'deck', 'deck', 'crate', 'deck', 'mast', 'deck', 'deck'],
];

const battlefields = {
  ship: {
    label: 'Boarding Deck',
    edge: 'ship',
    outside: 0x0d3448,
    plank: 0x39271c,
    tiles: defaultBattleTiles,
  },
  navy: {
    label: 'Navy Cutter Deck',
    edge: 'ship',
    outside: 0x12354a,
    plank: 0x334759,
    tiles: [
      ['rail', 'deck', 'mast', 'deck', 'crate', 'deck', 'rail', 'deck', 'rail'],
      ['rail', 'fort', 'fort', 'smoke', 'deck', 'barricade', 'fort', 'deck', 'rail'],
      ['deck', 'crate', 'fort', 'deck', 'deck', 'deck', 'powder', 'fort', 'deck'],
      ['deck', 'objective', 'fort', 'barricade', 'deck', 'crate', 'deck', 'deck', 'rail'],
      ['deck', 'deck', 'powder', 'deck', 'smoke', 'fort', 'deck', 'rail', 'deck'],
      ['rail', 'deck', 'deck', 'deck', 'crate', 'deck', 'mast', 'deck', 'rail'],
    ],
  },
  wreck: {
    label: 'Burning Wreck',
    edge: 'wreck',
    outside: 0x172b36,
    plank: 0x2b1a13,
    tiles: [
      ['surf', 'wreck', 'mast', 'ember', 'wreck', 'deck', 'surf', 'deep', 'deep'],
      ['surf', 'wreck', 'fire', 'smoke', 'deck', 'crate', 'wreck', 'surf', 'deep'],
      ['sand', 'crate', 'wreck', 'deck', 'ember', 'deck', 'powder', 'wreck', 'surf'],
      ['sand', 'objective', 'wreck', 'fire', 'deck', 'crate', 'deck', 'wreck', 'surf'],
      ['surf', 'wreck', 'powder', 'deck', 'smoke', 'wreck', 'deck', 'surf', 'deep'],
      ['deep', 'surf', 'wreck', 'deck', 'crate', 'ember', 'mast', 'surf', 'deep'],
    ],
  },
  storm: {
    label: 'Storm Bank Deck',
    edge: 'storm',
    outside: 0x102631,
    plank: 0x26313a,
    tiles: [
      ['rail', 'storm', 'mast', 'storm', 'crate', 'storm', 'rail', 'deep', 'deep'],
      ['rail', 'storm', 'smoke', 'smoke', 'storm', 'crate', 'storm', 'storm', 'rail'],
      ['storm', 'crate', 'storm', 'lightning', 'storm', 'storm', 'powder', 'storm', 'storm'],
      ['storm', 'objective', 'storm', 'smoke', 'storm', 'crate', 'storm', 'storm', 'rail'],
      ['storm', 'storm', 'powder', 'storm', 'smoke', 'storm', 'storm', 'rail', 'deep'],
      ['rail', 'deep', 'storm', 'storm', 'crate', 'lightning', 'mast', 'storm', 'rail'],
    ],
  },
  hollow: {
    label: 'Smuggler Cove',
    edge: 'island',
    outside: 0x0d3448,
    plank: 0x7b5a35,
    tiles: [
      ['surf', 'sand', 'rocks', 'sand', 'jungle', 'jungle', 'rocks', 'surf', 'deep'],
      ['surf', 'sand', 'crate', 'smoke', 'sand', 'palms', 'jungle', 'surf', 'deep'],
      ['sand', 'crate', 'sand', 'sand', 'sand', 'jungle', 'powder', 'sand', 'surf'],
      ['sand', 'objective', 'sand', 'rocks', 'sand', 'crate', 'sand', 'sand', 'surf'],
      ['surf', 'sand', 'powder', 'sand', 'smoke', 'palms', 'sand', 'surf', 'deep'],
      ['deep', 'surf', 'sand', 'jungle', 'crate', 'sand', 'rocks', 'surf', 'deep'],
    ],
  },
  boarback: {
    label: 'Boarback Shore',
    edge: 'island',
    outside: 0x0d3448,
    plank: 0x8c6a3e,
    tiles: [
      ['surf', 'sand', 'rocks', 'jungle', 'jungle', 'sand', 'surf', 'deep', 'deep'],
      ['surf', 'sand', 'palms', 'sand', 'jungle', 'rocks', 'sand', 'surf', 'deep'],
      ['sand', 'sand', 'sand', 'sand', 'sand', 'jungle', 'palms', 'sand', 'surf'],
      ['sand', 'objective', 'rocks', 'sand', 'sand', 'palms', 'sand', 'sand', 'surf'],
      ['surf', 'sand', 'jungle', 'sand', 'rocks', 'sand', 'sand', 'surf', 'deep'],
      ['deep', 'surf', 'sand', 'palms', 'sand', 'sand', 'rocks', 'surf', 'deep'],
    ],
  },
  mangrove: {
    label: 'Mangrove Shoreline',
    edge: 'swamp',
    outside: 0x102d2a,
    plank: 0x315f43,
    tiles: [
      ['shallows', 'mangrove', 'mangrove', 'jungle', 'jungle', 'shallows', 'deep', 'deep', 'deep'],
      ['shallows', 'sand', 'mangrove', 'shallows', 'jungle', 'mangrove', 'sand', 'shallows', 'deep'],
      ['sand', 'mangrove', 'shallows', 'sand', 'sand', 'jungle', 'palms', 'sand', 'shallows'],
      ['sand', 'objective', 'mangrove', 'shallows', 'sand', 'rocks', 'sand', 'sand', 'shallows'],
      ['shallows', 'sand', 'jungle', 'sand', 'mangrove', 'shallows', 'sand', 'shallows', 'deep'],
      ['deep', 'shallows', 'sand', 'palms', 'sand', 'mangrove', 'rocks', 'shallows', 'deep'],
    ],
  },
  crab: {
    label: 'Crab Cay Tidal Flats',
    edge: 'tidal',
    outside: 0x0f3b44,
    plank: 0x6e7659,
    tiles: [
      ['deep', 'surf', 'tidepool', 'coral', 'sand', 'tidepool', 'surf', 'deep', 'deep'],
      ['surf', 'sand', 'coral', 'tidepool', 'sand', 'rocks', 'sand', 'surf', 'deep'],
      ['sand', 'coral', 'sand', 'sand', 'tidepool', 'sand', 'coral', 'sand', 'surf'],
      ['sand', 'objective', 'rocks', 'tidepool', 'sand', 'coral', 'sand', 'sand', 'surf'],
      ['surf', 'sand', 'coral', 'sand', 'rocks', 'tidepool', 'sand', 'surf', 'deep'],
      ['deep', 'surf', 'sand', 'tidepool', 'coral', 'sand', 'rocks', 'surf', 'deep'],
    ],
  },
  stronghold: {
    label: 'Pirate Stronghold',
    edge: 'fort',
    outside: 0x14202a,
    plank: 0x352319,
    tiles: [
      ['barricade', 'fort', 'mast', 'fort', 'treasure', 'fort', 'barricade', 'rail', 'deep'],
      ['fort', 'treasure', 'fort', 'smoke', 'fort', 'barricade', 'fort', 'fort', 'rail'],
      ['fort', 'crate', 'fort', 'fort', 'fort', 'treasure', 'powder', 'fort', 'fort'],
      ['fort', 'objective', 'barricade', 'fort', 'fort', 'crate', 'fort', 'fort', 'rail'],
      ['fort', 'fort', 'powder', 'treasure', 'smoke', 'fort', 'barricade', 'rail', 'deep'],
      ['barricade', 'fort', 'fort', 'fort', 'crate', 'fort', 'mast', 'fort', 'rail'],
    ],
  },
  deepOcean: {
    label: 'Deep Ocean Wreckage',
    edge: 'ocean',
    outside: 0x071b2a,
    plank: 0x183544,
    tiles: [
      ['deep', 'deep', 'surf', 'wreck', 'deep', 'surf', 'deep', 'deep', 'deep'],
      ['deep', 'wreck', 'surf', 'crate', 'deep', 'wreck', 'surf', 'deep', 'deep'],
      ['surf', 'wreck', 'deck', 'deck', 'surf', 'deck', 'wreck', 'surf', 'deep'],
      ['surf', 'objective', 'wreck', 'deep', 'deck', 'crate', 'deck', 'surf', 'deep'],
      ['deep', 'surf', 'deck', 'wreck', 'deep', 'surf', 'deck', 'deep', 'deep'],
      ['deep', 'deep', 'surf', 'deck', 'wreck', 'deep', 'surf', 'deep', 'deep'],
    ],
  },
  cliffs: {
    label: 'Stormwing Cliffs',
    edge: 'cliff',
    outside: 0x142631,
    plank: 0x5b5c54,
    tiles: [
      ['deep', 'cliff', 'cliff', 'rocks', 'nest', 'cliff', 'deep', 'deep', 'deep'],
      ['cliff', 'rocks', 'cliff', 'smoke', 'cliff', 'nest', 'rocks', 'deep', 'deep'],
      ['sand', 'cliff', 'rocks', 'cliff', 'cliff', 'cliff', 'nest', 'cliff', 'deep'],
      ['sand', 'objective', 'cliff', 'rocks', 'cliff', 'nest', 'cliff', 'cliff', 'deep'],
      ['surf', 'sand', 'cliff', 'cliff', 'smoke', 'cliff', 'rocks', 'deep', 'deep'],
      ['deep', 'surf', 'sand', 'rocks', 'cliff', 'sand', 'deep', 'deep', 'deep'],
    ],
  },
  ironshell: {
    label: 'Ironshell Reef',
    edge: 'reef',
    outside: 0x0d3448,
    plank: 0x315f43,
    tiles: [
      ['deep', 'reef', 'coral', 'shell', 'reef', 'coral', 'deep', 'deep', 'deep'],
      ['reef', 'shell', 'reef', 'coral', 'shell', 'reef', 'coral', 'deep', 'deep'],
      ['coral', 'reef', 'shell', 'reef', 'reef', 'shell', 'coral', 'reef', 'deep'],
      ['reef', 'objective', 'coral', 'shell', 'reef', 'coral', 'reef', 'shell', 'deep'],
      ['deep', 'reef', 'shell', 'reef', 'coral', 'shell', 'reef', 'deep', 'deep'],
      ['deep', 'deep', 'reef', 'coral', 'shell', 'reef', 'deep', 'deep', 'deep'],
    ],
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeInitialState() {
  return {
    resources: {
      coin: 0,
      lumber: 0,
      scrap: 0,
      blackPowder: 0,
      supplies: 4,
      reputation: 0,
    },
    haven: {
      forge: 0,
      tavern: 0,
      drydock: 0,
      training: 0,
      infirmary: 0,
      watchtower: 0,
    },
    shipSupport: 'boardingHooks',
    momentumIdentity: 'Tidebreak Crew',
    crew: normalizeCrew(clone(crewTemplate)),
    navigationMessage: 'Sail from the haven and choose your next risk.',
    pendingBattle: null,
    activeBattleLayout: null,
    pendingHavenSummary: null,
    pendingTutorialPrompt: false,
    inventory: {
      rations: 5,
      repairKits: 2,
      medicine: 1,
      relics: [],
      weapons: ['captainsCutlass', 'flintlockPistol', 'deckMusket', 'hookBlades', 'boardingAxe', 'handMortar'],
      equipment: ['commandSash', 'powderHorn', 'rangefinder', 'grappleLine', 'boardingBelt', 'platedCoat', 'surgeonWraps'],
    },
    havenZone: 'docks',
    havenPlayerByZone: null,
    battleWon: false,
    discoveredStatusEffects: [],
    tutorial: null,
  };
}

function ensureTopDownShipTexture(scene, key = 'navigation-ship-sprite') {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
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

  g.generateTexture(key, 144, 132);
  g.destroy();
}

function ensureHavenShipTopDownTexture(scene) {
  const key = 'haven-ship-top-down-sprite';
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const cx = 96;
  const cy = 46;

  g.fillStyle(0x07111d, 0.36);
  g.fillEllipse(cx - 2, cy + 10, 168, 38);

  g.fillStyle(0x1a0f0b, 1);
  g.fillPoints([
    { x: 16, y: cy },
    { x: 34, y: 24 },
    { x: 142, y: 22 },
    { x: 176, y: cy },
    { x: 142, y: 70 },
    { x: 34, y: 68 },
  ], true);

  g.fillStyle(colors.woodDark, 1);
  g.fillPoints([
    { x: 23, y: cy },
    { x: 42, y: 29 },
    { x: 138, y: 28 },
    { x: 164, y: cy },
    { x: 138, y: 64 },
    { x: 42, y: 63 },
  ], true);
  g.lineStyle(3, colors.charcoal, 1);
  g.strokePoints([
    { x: 23, y: cy },
    { x: 42, y: 29 },
    { x: 138, y: 28 },
    { x: 164, y: cy },
    { x: 138, y: 64 },
    { x: 42, y: 63 },
  ], true);

  g.fillStyle(colors.wood, 1);
  g.fillRoundedRect(42, 34, 93, 24, 5);
  g.fillStyle(0x6d452d, 0.95);
  g.fillRoundedRect(55, 31, 26, 30, 4);
  g.fillRoundedRect(94, 31, 25, 30, 4);

  g.lineStyle(1, 0x8b5a36, 0.86);
  for (let x = 48; x <= 130; x += 11) g.lineBetween(x, 35, x - 5, 57);
  g.lineStyle(2, colors.brass, 0.78);
  g.lineBetween(38, 31, 141, 30);
  g.lineBetween(38, 62, 141, 63);
  g.lineBetween(34, 38, 28, cy);
  g.lineBetween(34, 54, 28, cy);
  g.lineBetween(142, 32, 158, cy);
  g.lineBetween(142, 62, 158, cy);

  g.fillStyle(0x090605, 0.88);
  for (const x of [52, 67, 83, 99, 115, 130]) {
    g.fillRoundedRect(x, 24, 8, 4, 1);
    g.fillRoundedRect(x, 65, 8, 4, 1);
  }

  g.lineStyle(4, 0x20130e, 1);
  g.lineBetween(66, 14, 66, 78);
  g.lineBetween(108, 16, 108, 76);
  g.lineStyle(2, colors.woodDark, 1);
  g.lineBetween(45, 20, 87, 72);
  g.lineBetween(88, 18, 128, 72);

  g.fillStyle(0xf1dfb7, 0.95);
  g.fillPoints([
    { x: 50, y: 15 },
    { x: 66, y: 19 },
    { x: 82, y: 15 },
    { x: 82, y: 25 },
    { x: 66, y: 28 },
    { x: 50, y: 25 },
  ], true);
  g.fillPoints([
    { x: 50, y: 67 },
    { x: 66, y: 64 },
    { x: 82, y: 67 },
    { x: 82, y: 77 },
    { x: 66, y: 81 },
    { x: 50, y: 77 },
  ], true);
  g.fillStyle(0xd8c28f, 0.94);
  g.fillPoints([
    { x: 90, y: 16 },
    { x: 108, y: 20 },
    { x: 128, y: 16 },
    { x: 128, y: 27 },
    { x: 108, y: 30 },
    { x: 90, y: 26 },
  ], true);
  g.fillPoints([
    { x: 90, y: 65 },
    { x: 108, y: 62 },
    { x: 128, y: 66 },
    { x: 128, y: 77 },
    { x: 108, y: 80 },
    { x: 90, y: 76 },
  ], true);
  g.lineStyle(1, 0x8e754d, 0.7);
  g.strokePoints([{ x: 50, y: 15 }, { x: 66, y: 19 }, { x: 82, y: 15 }, { x: 82, y: 25 }, { x: 66, y: 28 }, { x: 50, y: 25 }], true);
  g.strokePoints([{ x: 50, y: 67 }, { x: 66, y: 64 }, { x: 82, y: 67 }, { x: 82, y: 77 }, { x: 66, y: 81 }, { x: 50, y: 77 }], true);
  g.strokePoints([{ x: 90, y: 16 }, { x: 108, y: 20 }, { x: 128, y: 16 }, { x: 128, y: 27 }, { x: 108, y: 30 }, { x: 90, y: 26 }], true);
  g.strokePoints([{ x: 90, y: 65 }, { x: 108, y: 62 }, { x: 128, y: 66 }, { x: 128, y: 77 }, { x: 108, y: 80 }, { x: 90, y: 76 }], true);

  g.fillStyle(colors.brassLight, 0.9);
  g.fillCircle(66, cy, 5);
  g.fillCircle(108, cy, 5);
  g.fillStyle(colors.charcoal, 0.9);
  g.fillCircle(66, cy, 2);
  g.fillCircle(108, cy, 2);

  g.lineStyle(1, 0xe9d7ad, 0.38);
  g.lineBetween(66, 14, 34, cy);
  g.lineBetween(66, 78, 34, cy);
  g.lineBetween(108, 16, 158, cy);
  g.lineBetween(108, 76, 158, cy);

  g.fillStyle(colors.crimson, 0.9);
  g.fillTriangle(148, 27, 168, 31, 149, 36);
  g.lineStyle(1, colors.charcoal, 0.8);
  g.strokeTriangle(148, 27, 168, 31, 149, 36);

  g.generateTexture(key, 192, 92);
  g.destroy();
}

const havenProjects = {
  drydock: {
    name: 'Drydock',
    reward: 'The Tidebreak can sail from Haven again.',
    cost: { lumber: 4, scrap: 3, coin: 12 },
    color: colors.teal,
  },
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
    ship: { x: 17.65, y: 5.55, scale: 0.92 },
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
const AUDIO_SETTINGS_KEY = 'blackwake-tactics-audio-settings-v2';
const defaultAudioSettings = {
  master: 1,
  music: 1,
  sfx: 1,
  muted: false,
};

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function clamp01(value) {
  return Phaser.Math.Clamp(Number(value) || 0, 0, 1);
}

function normalizeAudioSettings(settings = {}) {
  return {
    master: clamp01(settings.master ?? defaultAudioSettings.master),
    music: clamp01(settings.music ?? defaultAudioSettings.music),
    sfx: clamp01(settings.sfx ?? defaultAudioSettings.sfx),
    muted: false,
  };
}

function loadAudioSettings() {
  if (!storageAvailable()) return { ...defaultAudioSettings };
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
    return normalizeAudioSettings(raw ? JSON.parse(raw) : defaultAudioSettings);
  } catch {
    return { ...defaultAudioSettings };
  }
}

function saveAudioSettings(settings) {
  const normalized = normalizeAudioSettings(settings);
  if (storageAvailable()) window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

function applyAudioSettings(scene, nextSettings = null) {
  const settings = normalizeAudioSettings(nextSettings || loadAudioSettings());
  scene.registry.set('audioSettings', settings);
  if (scene.sound) {
    scene.sound.mute = settings.muted;
    scene.sound.volume = settings.master;
  }
  return settings;
}

function getAudioSettings(scene) {
  return scene.registry.get('audioSettings') || applyAudioSettings(scene);
}

function setAudioSetting(scene, key, value) {
  const settings = {
    ...(scene.audioDraftSettings || getAudioSettings(scene)),
    [key]: clamp01(value),
  };
  scene.audioDraftSettings = normalizeAudioSettings(settings);
  applyAudioSettings(scene, scene.audioDraftSettings);
  return settings;
}

function formatVolume(value) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

function playUiSound(scene, kind = 'click') {
  const settings = getAudioSettings(scene);
  if (settings.muted || settings.master <= 0 || settings.sfx <= 0) return;
  const soundManager = scene.sound;
  const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  const context = soundManager?.context || (AudioContextClass ? new AudioContextClass() : null);
  if (!context) return;
  if (context.state === 'suspended') context.resume?.();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequency = kind === 'back' ? 330 : kind === 'confirm' ? 760 : 520;
  const now = context.currentTime;
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.22, now + 0.045);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(settings.master * settings.sfx * 0.08, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.08);
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
      inventory: {
        ...makeInitialState().inventory,
        ...(payload.state.inventory || {}),
        relics: Array.isArray(payload.state.inventory?.relics) ? payload.state.inventory.relics : [],
        weapons: Array.isArray(payload.state.inventory?.weapons) ? payload.state.inventory.weapons.map((id) => legacyEquipmentIds[id] || id) : makeInitialState().inventory.weapons,
        equipment: Array.isArray(payload.state.inventory?.equipment) ? payload.state.inventory.equipment.map((id) => legacyEquipmentIds[id] || id) : makeInitialState().inventory.equipment,
      },
      crew: normalizeCrew(Array.isArray(payload.state.crew) ? payload.state.crew : clone(crewTemplate)),
      discoveredStatusEffects: Array.isArray(payload.state.discoveredStatusEffects) ? payload.state.discoveredStatusEffects : [],
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
  bg.on('pointerdown', () => {
    playUiSound(scene);
    onClick();
  });
  return [bg, text];
}

function isTutorialActive(state) {
  return Boolean(state?.tutorial?.active);
}

function setTutorialStep(state, step) {
  if (!state.tutorial) state.tutorial = { active: true, step };
  state.tutorial.active = true;
  state.tutorial.step = step;
}

function completeTutorial(state) {
  if (!state.tutorial) state.tutorial = {};
  state.tutorial.active = false;
  state.tutorial.completed = true;
}

function drawTutorialPanel(scene, title, body, actions = []) {
  const y = 506;
  scene.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.12).setDepth(210);
  drawPanel(scene, 40, y, 512, 164, 0.98).setDepth(211);
  scene.add.text(70, y + 24, title, { ...ui.h2, fontSize: '23px' }).setDepth(212);
  scene.add.text(70, y + 58, body, {
    ...ui.small,
    color: '#f3e5c4',
    wordWrap: { width: 452 },
    lineSpacing: 4,
  }).setDepth(212);
  const buttons = actions.length ? actions : [{ label: 'Skip', onClick: () => scene.finishTutorial?.(), tone: colors.teal }];
  buttons.forEach((action, index) => {
    button(scene, 70 + index * 132, y + 116, 116, action.label, action.onClick, action.tone || colors.brass)
      .forEach((object) => object.setDepth?.(213));
  });
}

function drawTutorialPulse(scene, x, y, radius = 34, label = '') {
  const marker = scene.add.circle(x, y, radius, colors.brassLight, 0).setStrokeStyle(4, colors.brassLight, 0.92).setDepth(214);
  scene.tweens.add({ targets: marker, scale: 1.16, alpha: 0.38, duration: 760, yoyo: true, repeat: -1 });
  if (label) {
    scene.add.text(x, y - radius - 28, label, {
      ...ui.small,
      color: '#f3e5c4',
      backgroundColor: '#07111dcc',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(215);
  }
}

function drawTutorialPanelAt(scene, x, y, width, height, title, body, actions = []) {
  drawPanel(scene, x, y, width, height, 0.98).setDepth(211);
  scene.add.text(x + 24, y + 20, title, { ...ui.h2, fontSize: '22px' }).setDepth(212);
  scene.add.text(x + 24, y + 54, body, {
    ...ui.small,
    color: '#f3e5c4',
    wordWrap: { width: width - 48 },
    lineSpacing: 4,
  }).setDepth(212);
  actions.forEach((action, index) => {
    button(scene, x + 24 + index * 132, y + height - 48, 116, action.label, action.onClick, action.tone || colors.brass)
      .forEach((object) => object.setDepth?.(213));
  });
}

function installPauseMenu(scene, options = {}) {
  applyAudioSettings(scene);
  scene.pauseObjects = [];
  scene.pauseMenuOpen = false;
  scene.pauseSaveMessage = '';
  scene.pauseSelectedLoadSlot = 'auto';
  scene.pausePanel = null;
  scene.pauseOptions = {
    sceneLabel: options.sceneLabel || scene.scene.key,
    canSave: options.canSave !== false,
    bindEsc: options.bindEsc !== false,
  };
  scene.clearPauseObjects = () => clearPauseObjects(scene);
  scene.openPauseMenu = () => openPauseMenu(scene);
  scene.closePauseOverlay = () => closePauseOverlay(scene);
  if (scene.pauseOptions.bindEsc) {
    scene.input.keyboard.on('keydown-ESC', () => handlePauseEscape(scene));
  }
  scene.input.keyboard.on('keydown-ENTER', () => handlePauseConfirmKey(scene));
  scene.input.keyboard.on('keydown-Y', () => handlePauseConfirmKey(scene));
  scene.input.keyboard.on('keydown-U', () => {
    if (scene.pausePanel === 'audio') undoPauseOptions(scene);
  });
}

function handlePauseEscape(scene) {
  if (scene.pausePanel === 'audio-confirm') {
    openPauseOptions(scene);
    return true;
  }
  if (scene.pausePanel === 'audio') {
    backFromPauseOptions(scene);
    return true;
  }
  if (scene.pauseMenuOpen) {
    closePauseOverlay(scene);
    return true;
  }
  openPauseMenu(scene);
  return true;
}

function setPauseClock(scene, paused) {
  if (scene.scene.key === 'TitleScene') return;
  if (paused) {
    scene.tweens.pauseAll();
    scene.time.paused = true;
    return;
  }
  scene.time.paused = false;
  scene.tweens.resumeAll();
}

function handlePauseConfirmKey(scene) {
  if (scene.pausePanel === 'audio') {
    openPauseOptionsConfirm(scene);
    return true;
  }
  if (scene.pausePanel === 'audio-confirm') {
    confirmPauseOptions(scene);
    return true;
  }
  return false;
}

function clearPauseObjects(scene) {
  scene.pauseObjects?.forEach((object) => {
    if (object?.active) object.destroy();
  });
  scene.pauseObjects = [];
}

function capturePauseObjects(scene, existing) {
  scene.pauseObjects = scene.children.list.filter((object) => !existing.has(object));
  scene.pauseObjects.forEach((object) => object.setDepth?.(240));
}

function closePauseOverlay(scene) {
  clearPauseObjects(scene);
  scene.pauseMenuOpen = false;
  scene.pausePanel = null;
  scene.audioDraftSettings = null;
  scene.audioOriginalSettings = null;
  scene.audioOptionsOrigin = null;
  setPauseClock(scene, false);
}

function openPauseMenu(scene) {
  clearPauseObjects(scene);
  scene.pauseMenuOpen = true;
  scene.pausePanel = 'menu';
  scene.audioDraftSettings = null;
  scene.audioOriginalSettings = null;
  scene.audioOptionsOrigin = null;
  setPauseClock(scene, true);
  const existing = new Set(scene.children.list);
  scene.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.52).setDepth(230).setInteractive();
  drawPanel(scene, 304, 152, 352, 416, 0.98).setDepth(231);
  scene.add.text(330, 196, 'Paused', { ...ui.h2, fontSize: '30px' }).setDepth(232);
  scene.add.text(330, 236, `${scene.pauseOptions.sceneLabel} is stopped until you resume.`, {
    ...ui.small,
    color: '#f3e5c4',
    wordWrap: { width: 292 },
  }).setDepth(232);
  drawPauseButton(scene, 330, 288, 292, 'Resume', () => closePauseOverlay(scene), colors.brass);
  drawPauseButton(scene, 330, 336, 292, 'Save Game', () => openPauseSaveSlots(scene), colors.teal, scene.pauseOptions.canSave);
  drawPauseButton(scene, 330, 384, 292, 'Load Game', () => openPauseLoadSlots(scene), colors.teal);
  drawPauseButton(scene, 330, 432, 292, 'Options', () => {
    scene.audioOptionsOrigin = 'pause';
    openPauseOptions(scene);
  }, colors.wood);
  drawPauseButton(scene, 330, 496, 292, 'Main Menu', () => {
    closePauseOverlay(scene);
    scene.scene.start('TitleScene');
  }, colors.crimson);
  capturePauseObjects(scene, existing);
}

function drawPauseButton(scene, x, y, width, label, onClick, tone = colors.brass, enabled = true) {
  const buttonTone = enabled ? tone : 0x262b30;
  const bg = scene.add.rectangle(x, y, width, 38, buttonTone, enabled ? 0.95 : 0.72)
    .setOrigin(0)
    .setStrokeStyle(2, enabled ? colors.brass : colors.smoke, enabled ? 0.5 : 0.24)
    .setDepth(242);
  const text = scene.add.text(x + width / 2, y + 19, label, {
    ...ui.label,
    color: enabled ? (tone === colors.brass ? '#17100c' : '#f3e5c4') : '#879097',
  }).setOrigin(0.5).setDepth(243);
  if (!enabled) return [bg, text];
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => bg.setFillStyle(colors.brassLight));
  bg.on('pointerout', () => bg.setFillStyle(buttonTone));
  bg.on('pointerdown', () => {
    playUiSound(scene);
    onClick();
  });
  return [bg, text];
}

function openPauseSaveSlots(scene) {
  drawPauseSlotMenu(scene, 'Save Game', scene.pauseSaveMessage || 'Choose a slot. Occupied slots will be overwritten.', 'save');
}

function openPauseLoadSlots(scene) {
  scene.pauseSelectedLoadSlot = getSaveInfo(scene.pauseSelectedLoadSlot) ? scene.pauseSelectedLoadSlot : firstAvailableSaveSlot();
  drawPauseSlotMenu(scene, 'Load Game', 'Choose an occupied slot to continue from that save.', 'load');
}

function firstAvailableSaveSlot() {
  if (getSaveInfo('auto')) return 'auto';
  return SAVE_SLOTS.find((slot) => getSaveInfo(slot)) || 'auto';
}

function drawPauseSlotMenu(scene, title, subtitle, mode) {
  clearPauseObjects(scene);
  scene.pauseMenuOpen = true;
  setPauseClock(scene, true);
  const existing = new Set(scene.children.list);
  scene.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.55).setDepth(230).setInteractive();
  drawPanel(scene, 214, 132, 532, 456, 0.98).setDepth(231);
  scene.add.text(246, 162, title, { ...ui.h2, fontSize: '27px' }).setDepth(232);
  scene.add.text(246, 200, subtitle, { ...ui.small, color: '#f3e5c4', wordWrap: { width: 460 } }).setDepth(232);
  const slots = mode === 'load' ? ['auto', ...SAVE_SLOTS] : SAVE_SLOTS;
  slots.forEach((slot, index) => drawPauseSlotRow(scene, 246, 244 + index * 66, slot, mode));
  drawPauseButton(scene, 246, 526, 150, 'Back', () => openPauseMenu(scene), colors.teal);
  drawPauseButton(scene, 428, 526, 150, 'Resume', () => closePauseOverlay(scene), colors.brass);
  capturePauseObjects(scene, existing);
}

function drawPauseSlotRow(scene, x, y, slot, mode) {
  const info = getSaveInfo(slot);
  const enabled = mode === 'save' || Boolean(info);
  const selected = mode === 'load' && scene.pauseSelectedLoadSlot === slot && info;
  const row = scene.add.rectangle(x, y, 468, 54, selected ? colors.brass : colors.charcoal, selected ? 0.88 : enabled ? 0.42 : 0.72)
    .setOrigin(0)
    .setStrokeStyle(2, selected ? colors.charcoal : enabled ? colors.brass : colors.smoke, selected ? 0.8 : enabled ? 0.25 : 0.26)
    .setDepth(232);
  const slotLabel = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
  scene.add.text(x + 14, y + 10, slotLabel, { ...ui.label, color: selected ? '#17100c' : enabled ? '#f3e5c4' : '#879097' }).setDepth(233);
  const details = info
    ? `${info.label} | ${info.scene} | Coin ${info.coin} | Supplies ${info.supplies} | Rep ${info.reputation}`
    : 'Empty slot';
  scene.add.text(x + 112, y + 9, details, {
    ...ui.small,
    color: selected ? '#17100c' : enabled ? '#f3e5c4' : '#879097',
    wordWrap: { width: 250 },
    lineSpacing: 1,
  }).setDepth(233);
  const actionLabel = mode === 'save' ? (info ? 'Overwrite' : 'Save') : 'Load';
  drawPauseMiniButton(scene, x + 384, y + 10, 68, actionLabel, () => handlePauseSlotAction(scene, mode, slot), enabled);
  if (!enabled) return;
  row.setInteractive({ useHandCursor: true });
  row.on('pointerdown', () => {
    playUiSound(scene, mode === 'load' ? 'confirm' : 'click');
    handlePauseSlotAction(scene, mode, slot);
  });
}

function drawPauseMiniButton(scene, x, y, width, label, onClick, enabled) {
  const bg = scene.add.rectangle(x, y, width, 34, enabled ? colors.wood : 0x262b30, enabled ? 0.95 : 0.72)
    .setOrigin(0)
    .setStrokeStyle(2, enabled ? colors.brass : colors.smoke, enabled ? 0.45 : 0.24)
    .setDepth(234);
  scene.add.text(x + width / 2, y + 17, label, { ...ui.small, color: enabled ? '#f3e5c4' : '#879097' }).setOrigin(0.5).setDepth(235);
  if (!enabled) return;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => bg.setFillStyle(colors.brass));
  bg.on('pointerout', () => bg.setFillStyle(colors.wood));
  bg.on('pointerdown', () => {
    playUiSound(scene);
    onClick();
  });
}

function handlePauseSlotAction(scene, mode, slot) {
  if (mode === 'load') {
    scene.pauseSelectedLoadSlot = slot;
    const saved = slot === 'auto' ? loadAutoGame() : loadGameSlot(slot);
    if (!saved) return;
    scene.registry.set('gameState', saved);
    closePauseOverlay(scene);
    routeSceneToState(scene, saved);
    return;
  }
  const state = getState(scene);
  state.lastScene = scene.scene.key === 'TitleScene' ? 'Haven' : state.lastScene || scene.scene.key.replace('Scene', '');
  const saved = saveGameSlot(slot, state);
  scene.pauseSaveMessage = saved ? `Saved slot ${slot} ${new Date(saved.savedAt).toLocaleString()}` : 'Save unavailable in this browser.';
  openPauseSaveSlots(scene);
}

function openPauseOptions(scene) {
  clearPauseObjects(scene);
  scene.pauseMenuOpen = true;
  scene.pausePanel = 'audio';
  setPauseClock(scene, true);
  if (!scene.audioOriginalSettings) scene.audioOriginalSettings = { ...loadAudioSettings() };
  if (!scene.audioDraftSettings) scene.audioDraftSettings = { ...scene.audioOriginalSettings };
  if (!scene.audioOptionsOrigin) scene.audioOptionsOrigin = scene.scene.key === 'TitleScene' ? 'title' : 'pause';
  const settings = applyAudioSettings(scene, scene.audioDraftSettings);
  const existing = new Set(scene.children.list);
  scene.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.55).setDepth(230).setInteractive();
  drawPanel(scene, 250, 164, 460, 392, 0.98).setDepth(231);
  scene.add.text(282, 194, 'Audio Settings', { ...ui.h2, fontSize: '26px' }).setDepth(232);
  scene.add.text(282, 230, 'Preview volume changes here, then confirm to keep them.', {
    ...ui.small,
    color: '#f3e5c4',
    wordWrap: { width: 396 },
  }).setDepth(232);
  drawAudioRow(scene, 282, 284, 'Master', 'master', settings);
  drawAudioRow(scene, 282, 336, 'Music', 'music', settings);
  drawAudioRow(scene, 282, 388, 'SFX', 'sfx', settings);
  drawPauseButton(scene, 282, 462, 120, 'Back (Esc)', () => backFromPauseOptions(scene), colors.teal);
  drawPauseButton(scene, 418, 462, 106, 'Undo (U)', () => undoPauseOptions(scene), colors.wood);
  drawPauseButton(scene, 540, 462, 136, 'Confirm (Enter)', () => openPauseOptionsConfirm(scene), colors.brass);
  capturePauseObjects(scene, existing);
}

function undoPauseOptions(scene) {
  scene.audioDraftSettings = { ...(scene.audioOriginalSettings || loadAudioSettings()) };
  applyAudioSettings(scene, scene.audioDraftSettings);
  openPauseOptions(scene);
}

function backFromPauseOptions(scene) {
  applyAudioSettings(scene, scene.audioOriginalSettings || loadAudioSettings());
  scene.audioDraftSettings = null;
  scene.audioOriginalSettings = null;
  const origin = scene.audioOptionsOrigin;
  scene.audioOptionsOrigin = null;
  if (origin === 'title') {
    closePauseOverlay(scene);
    return;
  }
  openPauseMenu(scene);
}

function openPauseOptionsConfirm(scene) {
  clearPauseObjects(scene);
  scene.pauseMenuOpen = true;
  scene.pausePanel = 'audio-confirm';
  setPauseClock(scene, true);
  const existing = new Set(scene.children.list);
  scene.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.55).setDepth(230).setInteractive();
  drawPanel(scene, 304, 246, 352, 214, 0.98).setDepth(231);
  scene.add.text(330, 274, 'Keep Audio Changes?', { ...ui.h2, fontSize: '23px' }).setDepth(232);
  scene.add.text(330, 310, 'Save these audio settings for every scene?', {
    ...ui.small,
    color: '#f3e5c4',
    wordWrap: { width: 292 },
    lineSpacing: 3,
  }).setDepth(232);
  drawPauseButton(scene, 330, 374, 124, 'Yes (Y)', () => confirmPauseOptions(scene), colors.brass);
  drawPauseButton(scene, 498, 374, 124, 'No (Esc)', () => openPauseOptions(scene), colors.teal);
  capturePauseObjects(scene, existing);
}

function confirmPauseOptions(scene) {
  const saved = saveAudioSettings(scene.audioDraftSettings || getAudioSettings(scene));
  applyAudioSettings(scene, saved);
  scene.audioDraftSettings = null;
  scene.audioOriginalSettings = null;
  scene.audioOptionsOrigin = null;
  closePauseOverlay(scene);
}

function drawAudioRow(scene, x, y, label, key, settings) {
  const value = settings[key];
  scene.add.text(x, y, label, { ...ui.label, color: '#f3e5c4' }).setDepth(232);
  scene.add.rectangle(x + 112, y + 8, 162, 10, colors.charcoal, 0.96).setOrigin(0).setStrokeStyle(1, colors.brass, 0.32).setDepth(232);
  scene.add.rectangle(x + 112, y + 8, 162 * value, 10, key === 'sfx' ? colors.teal : colors.brass, 0.95).setOrigin(0).setDepth(233);
  scene.add.text(x + 292, y - 1, formatVolume(value), { ...ui.small, color: '#e1c16b' }).setDepth(233);
  drawPauseButton(scene, x + 346, y - 10, 36, '-', () => {
    setAudioSetting(scene, key, value - 0.1);
    openPauseOptions(scene);
  }, colors.wood);
  drawPauseButton(scene, x + 388, y - 10, 36, '+', () => {
    setAudioSetting(scene, key, value + 0.1);
    openPauseOptions(scene);
  }, colors.brass);
}

function routeSceneToState(scene, state) {
  if (state.lastScene === 'Navigation') scene.scene.start('NavigationScene');
  else if (state.lastScene === 'Battle') scene.scene.start('BattleScene');
  else if (state.lastScene === 'Title') scene.scene.start('TitleScene');
  else scene.scene.start('HavenScene');
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function terrainAt(pos, tiles = defaultBattleTiles) {
  return terrainDefs[tiles[pos.y]?.[pos.x] || 'deck'];
}

function statusLine(unit) {
  return unit.statuses?.length ? unit.statuses.join(', ') : 'None';
}

function laneFor(pos) {
  if (pos.x <= 2) return 'Front';
  if (pos.x <= 5) return 'Mid';
  return 'Back';
}

function xpForNextLevel(level = 1) {
  return 80 + Math.max(0, level - 1) * 45;
}

function skillsForUnit(unit) {
  return crewSkillTrees[unit?.id] || [];
}

function unlockedSkills(unit) {
  const level = Number(unit?.level || 1);
  return skillsForUnit(unit).filter((skill) => skill.level <= level);
}

function lockedSkills(unit) {
  const level = Number(unit?.level || 1);
  return skillsForUnit(unit).filter((skill) => skill.level > level);
}

function nextLockedSkill(unit) {
  return lockedSkills(unit)[0] || null;
}

function hasSkill(unit, skillName) {
  return unlockedSkills(unit).some((skill) => skill.name === skillName);
}

function crewHasSkill(crew, skillName) {
  return (crew || []).some((unit) => unit.hp > 0 && hasSkill(unit, skillName));
}

function equippedItems(unit) {
  return [unit.weapon, ...(unit.equipment || [])].map((id) => crewWeaponCatalog[id] || crewEquipmentCatalog[id]).filter(Boolean);
}

function equipmentBonus(unit, field) {
  return equippedItems(unit).reduce((total, item) => total + (item[field] || 0), 0);
}

function normalizeCrewMember(member, index = 0) {
  const base = crewTemplate.find((unit) => unit.id === member?.id) || crewTemplate[index] || crewTemplate[0];
  const level = Math.max(1, Number(member?.level || base.level || 1));
  const expectedMaxHp = base.maxHp + Math.max(0, level - 1) * 3;
  const loadout = defaultCrewLoadouts[base.id] || { weapon: legacyEquipmentIds[base.weapon] || 'captainsCutlass', equipment: [] };
  const rawWeapon = legacyEquipmentIds[member?.weapon] || member?.weapon || loadout.weapon;
  const weapon = allowedWeaponIdsFor(base.id).includes(rawWeapon) ? rawWeapon : loadout.weapon;
  const equipment = Array.isArray(member?.equipment)
    ? member.equipment.map((item) => legacyEquipmentIds[item] || item).filter((id) => crewEquipmentCatalog[id])
    : [...loadout.equipment];
  const equipmentHp = equipment.reduce((total, id) => total + (crewEquipmentCatalog[id]?.hp || 0), 0);
  const maxHp = Math.max(expectedMaxHp + equipmentHp, Number(member?.maxHp || expectedMaxHp) + equipmentHp);
  return {
    ...base,
    ...member,
    weapon,
    equipment,
    level,
    xp: Math.max(0, Number(member?.xp || 0)),
    skills: skillsForUnit({ ...base, ...member, level }),
    maxHp,
    hp: Math.min(maxHp, Math.max(1, Number(member?.hp || maxHp))),
  };
}

function allowedWeaponIdsFor(memberOrId) {
  const id = typeof memberOrId === 'string' ? memberOrId : memberOrId?.id;
  return crewWeaponTypeLocks[id] || [];
}

function normalizeCrew(crew) {
  return (Array.isArray(crew) ? crew : clone(crewTemplate)).map((member, index) => normalizeCrewMember(member, index));
}

function grantCrewXp(crew, amount) {
  const levelUps = [];
  const nextCrew = normalizeCrew(crew).map((member) => {
    let xp = member.xp + amount;
    let level = member.level;
    let maxHp = member.maxHp;
    let gained = 0;
    while (xp >= xpForNextLevel(level)) {
      xp -= xpForNextLevel(level);
      level += 1;
      maxHp += 3;
      gained += 1;
    }
    if (gained) levelUps.push(`${member.name} reached Level ${level}`);
    return {
      ...member,
      xp,
      level,
      maxHp,
      hp: Math.min(maxHp, member.hp + gained * 3),
    };
  });
  return { crew: nextCrew, levelUps };
}

function encounterXp(encounter) {
  const enemyXp = (encounter.enemies || []).reduce((total, enemy) => {
    const level = enemyLevelFor(enemy, encounter);
    return total + Math.ceil((enemy.maxHp || enemy.hp || 10) / 5) + level * 8;
  }, 0);
  const reputationXp = (encounter.rewards?.reputation || 0) * 8;
  return 18 + enemyXp + reputationXp;
}

function enemyLevelFor(enemy, encounter = {}) {
  if (Number(enemy?.level) > 0) return Number(enemy.level);
  const hp = enemy?.maxHp || enemy?.hp || 10;
  if ((encounter.rewards?.reputation || 0) >= 2 || hp >= 46) return 5;
  if (hp >= 36) return 4;
  if (hp >= 28) return 3;
  if (hp >= 20 || (encounter.rewards?.reputation || 0) >= 1) return 2;
  return 1;
}

function isSamePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function occupied(pos, units) {
  return units.some((unit) => unit.hp > 0 && isSamePos(unit.pos, pos));
}

function directionFromDelta(dx, dy, fallback = 'down') {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  if (dy) return dy > 0 ? 'down' : 'up';
  return fallback;
}

function drawScallywagCharacter(scene, container, unit, profile, stance, ally = true, options = {}) {
  const sprite = scallywagProfileFor(unit);
  if (!sprite) return false;
  const y = options.y ?? 24;
  const scale = (options.scale ?? sprite.scale ?? 2.7) * (options.size ?? 1);
  const facing = options.facing ?? (ally ? -1 : 1);
  const baseRow = scallywagBaseRow({ ...sprite, row: options.row ?? sprite.row });
  const direction = options.direction ?? options.dir ?? (options.front ? 'down' : null);
  const directionOffset = scallywagDirectionOffset(direction, facing);
  const outfit = sprite.outfit ?? 8;
  const auraColor = ally ? colors.teal : colors.crimson;
  if (options.aura !== false) {
    container.add(scene.add.circle(0, -4, 24 * (options.size ?? 1), auraColor, ally ? 0.04 : 0.05).setStrokeStyle(1, stance.accent, 0.18));
  }
  const body = scene.add.sprite(0, y, sprite.sheet, scallywagFrame(baseRow + directionOffset, 0)).setOrigin(0.5, 1).setScale(scale);
  body.setPipeline?.('TextureTintPipeline');
  const clothes = scene.add.sprite(0, y, sprite.sheet, scallywagFrame(baseRow + directionOffset, outfit)).setOrigin(0.5, 1).setScale(scale);
  container.add(body);
  container.add(clothes);
  const parts = { body, clothes, baseRow, outfit, facing, direction };
  container.scallywagParts = parts;
  setScallywagPose(parts, direction, options.walkFrame ?? 0);
  if (options.animate) {
    const frames = [0, 1, 2, 1];
    scene.tweens.addCounter({
      from: 0,
      to: frames.length,
      duration: options.walkDuration ?? 360,
      repeat: options.repeat ?? -1,
      onUpdate: (tween) => {
        if (!body.active || !clothes.active) return;
        setScallywagPose(parts, direction, frames[Math.floor(tween.getValue()) % frames.length]);
      },
    });
  }
  if (options.details !== false) drawScallywagDetails(scene, container, unit, profile, stance, ally, scale, facing, y, options);
  return true;
}

function drawScallywagDetails(scene, container, unit, profile, stance, ally, scale, facing, footY, options = {}) {
  const s = scale / 2.75;
  const top = footY - 42 * s;
  const weapon = profile.weapons || [];
  const steel = 0xdfe8e2;
  const compact = options.compact;
  if (!compact && (profile.hat === 'tricorn' || unit.role === 'Captain' || profile.posture === 'command')) {
    container.add(scene.add.line(-12 * s, top + 15 * s, 0, 0, -24 * s, top + 3 * s, stance.accent, 0.82).setLineWidth(Math.max(2, 3 * s)));
    container.add(scene.add.triangle(-28 * s, top, 0, -5 * s, 0, 5 * s, -14 * s, 0, ally ? colors.teal : colors.crimson, 0.9).setStrokeStyle(1, colors.charcoal, 0.7));
  }
  if (weapon.includes('musket') || weapon.includes('rifle')) {
    container.add(scene.add.line(7 * facing * s, footY - 24 * s, 0, 0, 27 * facing * s, footY - 27 * s, colors.woodDark, 1).setLineWidth(Math.max(2, 3 * s)));
    container.add(scene.add.line(22 * facing * s, footY - 27 * s, 0, 0, 12 * facing * s, footY - 18 * s, colors.charcoal, 1).setLineWidth(Math.max(1, 2 * s)));
  }
  if (weapon.includes('pistol')) {
    container.add(scene.add.line(-7 * facing * s, footY - 22 * s, 0, 0, -20 * facing * s, footY - 27 * s, colors.charcoal, 1).setLineWidth(Math.max(2, 3 * s)));
  }
  if (weapon.includes('cutlass') || weapon.includes('saber')) {
    container.add(scene.add.line(7 * facing * s, footY - 16 * s, 0, 0, 22 * facing * s, footY - 31 * s, steel, 0.96).setLineWidth(Math.max(1, 2 * s)));
    container.add(scene.add.circle(7 * facing * s, footY - 16 * s, 3 * s, colors.brass, 0.94));
  }
  if (weapon.includes('hooks')) {
    container.add(scene.add.arc(-11 * s, footY - 18 * s, 10 * s, Phaser.Math.DegToRad(250), Phaser.Math.DegToRad(70), false).setStrokeStyle(Math.max(1, 2 * s), steel, 0.96));
    container.add(scene.add.arc(11 * s, footY - 18 * s, 10 * s, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(290), false).setStrokeStyle(Math.max(1, 2 * s), steel, 0.96));
  }
  if (weapon.includes('shield')) {
    container.add(scene.add.rectangle(-15 * facing * s, footY - 20 * s, 13 * s, 22 * s, profile.palette[2] || colors.charcoal, 0.92).setStrokeStyle(1, colors.brass, 0.75));
  }
  if (weapon.includes('bomb')) container.add(scene.add.circle(18 * facing * s, footY - 17 * s, 6 * s, colors.charcoal, 0.96).setStrokeStyle(1, colors.ember));
  if (weapon.includes('torch')) {
    container.add(scene.add.line(10 * facing * s, footY - 14 * s, 0, 0, 21 * facing * s, footY - 31 * s, colors.woodDark, 1).setLineWidth(Math.max(2, 3 * s)));
    container.add(scene.add.circle(23 * facing * s, footY - 34 * s, 5 * s, colors.ember, 0.9));
  }
  if (weapon.includes('knives') || weapon.includes('daggers')) {
    container.add(scene.add.line(-10 * s, footY - 15 * s, 0, 0, -26 * s, footY - 29 * s, steel, 0.95).setLineWidth(Math.max(1, 2 * s)));
    container.add(scene.add.line(10 * s, footY - 15 * s, 0, 0, 26 * s, footY - 29 * s, steel, 0.95).setLineWidth(Math.max(1, 2 * s)));
  }
  if (weapon.includes('hook')) {
    container.add(scene.add.line(10 * facing * s, footY - 13 * s, 0, 0, 26 * facing * s, footY - 33 * s, colors.woodDark, 1).setLineWidth(Math.max(2, 3 * s)));
    container.add(scene.add.arc(28 * facing * s, footY - 34 * s, 8 * s, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(300), false).setStrokeStyle(Math.max(2, 2 * s), steel, 0.96));
  }
  if (weapon.includes('axe')) {
    container.add(scene.add.line(10 * facing * s, footY - 13 * s, 0, 0, 26 * facing * s, footY - 33 * s, colors.woodDark, 1).setLineWidth(Math.max(2, 3 * s)));
    container.add(scene.add.triangle(29 * facing * s, footY - 36 * s, 0, -7 * s, 9 * facing * s, 0, 0, 7 * s, 0xb9c4cf, 1).setStrokeStyle(1, colors.charcoal, 0.7));
  }
  if (unit.statuses?.includes('Burning')) container.add(scene.add.circle(18 * s, footY - 9 * s, 6 * s, colors.ember, 0.34));
  if (unit.statuses?.includes('Rallying')) container.add(scene.add.arc(0, top - 4 * s, 14 * s, Phaser.Math.DegToRad(212), Phaser.Math.DegToRad(328), false).setStrokeStyle(Math.max(2, 3 * s), colors.teal, 0.75));
  if (unit.statuses?.includes('Suppressed')) container.add(scene.add.line(-18 * s, top - 4 * s, 0, 0, 36 * s, 0, colors.smoke, 0.55).setLineWidth(Math.max(2, 3 * s)));
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
    this.load.spritesheet('scallywag-blue', scallywagBlueUrl, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('scallywag-gray', scallywagGrayUrl, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('scallywag-green', scallywagGreenUrl, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('scallywag-red', scallywagRedUrl, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('scallywag-white', scallywagWhiteUrl, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('scallywag-yellow', scallywagYellowUrl, { frameWidth: 16, frameHeight: 16 });
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
    this.titleOceanTiles = [];
    this.titleWaveBands = [];
    this.loadOpen = false;
    this.refreshSaveState();
    this.selectedLoadSlot = this.firstFilledSlot();
    installPauseMenu(this, { sceneLabel: 'Title Screen', canSave: false, bindEsc: false });
    this.input.keyboard.on('keydown-ENTER', () => this.openNewGamePrompt());
    this.input.keyboard.on('keydown-SPACE', () => this.openNewGamePrompt());
    this.input.keyboard.on('keydown-N', () => this.openNewGamePrompt());
    this.input.keyboard.on('keydown-C', () => this.continueAuto());
    this.input.keyboard.on('keydown-L', () => this.handleLoadKey());
    this.input.keyboard.on('keydown-O', () => this.openTitleOptions());
    this.input.keyboard.on('keydown-D', () => {
      if (this.loadOpen) this.confirmDelete(this.selectedLoadSlot);
    });
    this.input.keyboard.on('keydown-ESC', () => this.handleEscape());
    this.input.keyboard.on('keydown-ONE', () => this.selectLoadSlot('auto'));
    this.input.keyboard.on('keydown-TWO', () => this.selectLoadSlot(1));
    this.input.keyboard.on('keydown-THREE', () => this.selectLoadSlot(2));
    this.input.keyboard.on('keydown-FOUR', () => this.selectLoadSlot(3));
    this.draw();
  }

  update(time) {
    const t = time * 0.001;
    this.titleOceanTiles?.forEach((tile, index) => {
      tile.x = tile.baseX + Math.sin(t * 0.55 + tile.wavePhase) * 2.2;
      tile.y = tile.baseY + Math.cos(t * 0.42 + tile.wavePhase) * 1.4;
      tile.alpha = tile.baseAlpha + Math.sin(t * 1.1 + index * 0.19) * 0.03;
    });
    this.titleWaveBands?.forEach((band, index) => {
      band.x = ((t * (11 + index * 0.65)) % 180) - 90;
      band.y = band.baseY + Math.sin(t * 0.72 + band.wavePhase) * 4;
      band.alpha = 0.62 + Math.sin(t * 1.05 + band.wavePhase) * 0.18;
    });
  }

  handleEscape() {
    if (this.pausePanel === 'audio' || this.pausePanel === 'audio-confirm') {
      handlePauseEscape(this);
      return;
    }
    if (this.pauseMenuOpen) {
      closePauseOverlay(this);
      return;
    }
    if (this.loadOpen || this.promptObjects.length) {
      this.clearPrompt();
      return;
    }
    openPauseMenu(this);
  }

  draw() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(colors.navyDark);
    this.drawTitleSeaBackdrop();
    this.drawTitleFrame();
    this.drawTitleShipDeck();
    this.drawLanterns();
    this.drawTitleLockup();
    this.drawMenuPanel();
  }

  drawTitleSeaBackdrop() {
    this.titleOceanTiles = [];
    this.titleWaveBands = [];
    this.add.rectangle(480, 148, 960, 296, 0x09283c, 1);
    this.add.rectangle(480, 422, 960, 548, 0x0d3448, 1);
    this.add.circle(772, 112, 48, colors.brassLight, 0.7);
    this.add.circle(772, 112, 82, colors.brassLight, 0.08);
    if (this.textures.exists('ocean-autotiles')) {
      for (let y = 190; y < HEIGHT + 44; y += 45) {
        for (let x = -48; x < WIDTH + 48; x += 47) {
          const frame = ((x / 47 + y / 45) % 4 === 0) ? 61 : ((x + y) % 5 === 0 ? 62 : 63);
          const tile = this.add.image(x + 23.5, y + 22.5, 'ocean-autotiles', frame).setDepth(0.4);
          tile.setDisplaySize(52, 49);
          tile.setTint((x + y) % 4 === 0 ? 0x7bd8df : (x + y) % 3 === 0 ? 0x2c88a4 : 0x13556e);
          tile.setAlpha((x + y) % 4 === 0 ? 0.32 : 0.46);
          tile.baseX = tile.x;
          tile.baseY = tile.y;
          tile.baseAlpha = tile.alpha;
          tile.wavePhase = (x * 0.013) + (y * 0.021);
          this.titleOceanTiles.push(tile);
        }
      }
    }
    const g = this.add.graphics();
    g.fillStyle(0x07111d, 0.34);
    g.fillEllipse(176, 286, 280, 46);
    g.fillEllipse(762, 276, 330, 54);
    g.fillStyle(0x07111d, 0.16);
    for (let y = 248; y < 650; y += 84) {
      g.fillEllipse(230 + Math.sin(y * 0.06) * 85, y + 18, 430, 42);
      g.fillEllipse(710 + Math.cos(y * 0.04) * 70, y + 45, 390, 36);
    }
    for (let y = 220; y < 650; y += 28) {
      g.lineStyle(y % 56 === 0 ? 2 : 1, y % 84 === 0 ? 0xcaf6ea : colors.teal, y % 84 === 0 ? 0.16 : 0.1);
      g.beginPath();
      for (let x = -24; x <= WIDTH + 24; x += 24) {
        const wave = Math.sin((x + y) * 0.027) * 7 + Math.cos((x - y) * 0.015) * 3;
        if (x === -24) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
    for (let i = 0; i < 11; i += 1) {
      const foam = this.add.ellipse(130 + i * 84, 322 + (i % 5) * 42, 58 + (i % 4) * 12, 3, 0xd8fff4, 0.1).setRotation(((i % 5) - 2) * 0.08);
      this.tweens.add({
        targets: foam,
        x: foam.x + 24,
        alpha: 0.025,
        duration: 2200 + i * 130,
        yoyo: true,
        repeat: -1,
      });
    }
    for (let i = 0; i < 10; i += 1) {
      const band = this.add.container(0, 248 + i * 42).setDepth(0.8);
      for (let x = -70; x < WIDTH + 120; x += 185) {
        band.add(this.add.ellipse(x + ((i * 53) % 140), 0, 88 + (i % 4) * 24, 3, i % 3 === 0 ? 0xd8fff4 : 0x7bd8df, i % 3 === 0 ? 0.14 : 0.08));
      }
      band.baseY = band.y;
      band.wavePhase = i * 0.63;
      this.titleWaveBands.push(band);
    }
  }

  drawTitleShipDeck() {
    const ship = this.add.container(0, 0).setDepth(4);
    const g = this.add.graphics();
    ship.add(g);
    g.fillStyle(0x07111d, 0.36);
    g.fillEllipse(480, 612, 780, 58);
    g.fillStyle(0x1a0f0b, 1);
    g.fillPoints([
      { x: 92, y: 486 },
      { x: 156, y: 444 },
      { x: 804, y: 444 },
      { x: 872, y: 486 },
      { x: 820, y: 630 },
      { x: 142, y: 630 },
    ], true);
    g.lineStyle(4, colors.wood, 0.92);
    g.strokePoints([
      { x: 92, y: 486 },
      { x: 156, y: 444 },
      { x: 804, y: 444 },
      { x: 872, y: 486 },
      { x: 820, y: 630 },
      { x: 142, y: 630 },
    ], true);
    g.fillStyle(0x2b1a13, 1);
    g.fillPoints([
      { x: 122, y: 494 },
      { x: 174, y: 464 },
      { x: 786, y: 464 },
      { x: 832, y: 494 },
      { x: 784, y: 604 },
      { x: 176, y: 604 },
    ], true);
    g.fillStyle(colors.wood, 0.96);
    g.fillPoints([
      { x: 160, y: 506 },
      { x: 202, y: 480 },
      { x: 758, y: 480 },
      { x: 796, y: 506 },
      { x: 750, y: 588 },
      { x: 210, y: 588 },
    ], true);
    g.fillStyle(0x8b5a36, 0.55);
    g.fillPoints([
      { x: 198, y: 493 },
      { x: 760, y: 493 },
      { x: 736, y: 512 },
      { x: 224, y: 512 },
    ], true);
    g.lineStyle(2, colors.woodDark, 0.62);
    for (let y = 496; y <= 574; y += 20) {
      const inset = Math.abs(y - 536) * 1.1;
      g.lineBetween(190 + inset, y, 770 - inset, y);
    }
    for (let x = 230; x <= 730; x += 44) {
      g.lineBetween(x, 486, x - 18, 588);
    }
    g.fillStyle(0x120907, 0.96);
    g.fillPoints([{ x: 92, y: 486 }, { x: 156, y: 444 }, { x: 154, y: 628 }, { x: 142, y: 630 }], true);
    g.fillPoints([{ x: 804, y: 444 }, { x: 872, y: 486 }, { x: 820, y: 630 }, { x: 806, y: 628 }], true);
    g.lineStyle(8, 0x0a0706, 0.88);
    g.lineBetween(128, 512, 158, 612);
    g.lineBetween(832, 512, 806, 612);
    g.lineStyle(3, colors.brass, 0.55);
    g.lineBetween(128, 512, 160, 446);
    g.lineBetween(832, 512, 800, 446);
    ship.add(this.add.rectangle(480, 452, 724, 14, colors.woodDark, 0.96).setStrokeStyle(2, colors.wood));
    ship.add(this.add.rectangle(480, 604, 666, 14, colors.woodDark, 0.96).setStrokeStyle(2, colors.wood));
    ship.add(this.add.rectangle(480, 472, 508, 8, colors.brass, 0.35));
    ship.add(this.add.rectangle(480, 594, 456, 8, colors.brass, 0.28));
    for (let x = 166; x <= 794; x += 58) {
      ship.add(this.add.line(x, 446, 0, 0, 0, -34, colors.woodDark, 0.95).setLineWidth(3));
      ship.add(this.add.circle(x, 452, 4, colors.brass, 0.78).setStrokeStyle(1, colors.charcoal));
    }
    for (let x = 206; x <= 754; x += 64) {
      ship.add(this.add.line(x, 604, 0, 0, 0, 28, colors.woodDark, 0.9).setLineWidth(3));
    }
    for (const x of [222, 278, 682, 738]) {
      ship.add(this.add.circle(x, 520, 9, colors.charcoal, 0.95).setStrokeStyle(2, colors.brass, 0.38));
      ship.add(this.add.line(x, 520, 0, 0, x < 480 ? -30 : 30, 6, 0x0b0d10, 0.9).setLineWidth(6));
    }
    for (const x of [246, 714]) {
      ship.add(this.add.rectangle(x, 552, 52, 26, colors.woodDark, 0.9).setStrokeStyle(2, colors.brass, 0.34));
      ship.add(this.add.line(x - 22, 550, 0, 0, 44, 20, colors.brassLight, 0.18).setOrigin(0));
    }
    const sails = this.add.container(480, 0);
    ship.add(sails);
    sails.add(this.add.line(0, 0, 0, 590, 0, 204, colors.woodDark, 1).setLineWidth(10));
    sails.add(this.add.line(0, 0, 0, 590, 0, 204, colors.brass, 0.18).setLineWidth(3));
    sails.add(this.add.rectangle(0, 578, 42, 18, colors.woodDark, 0.96).setStrokeStyle(2, colors.brass, 0.42));
    sails.add(this.add.ellipse(0, 588, 70, 15, colors.charcoal, 0.28));
    sails.add(this.add.line(0, 0, -174, 286, 174, 286, colors.wood, 0.98).setLineWidth(6));
    sails.add(this.add.line(0, 0, -142, 394, 142, 394, colors.wood, 0.95).setLineWidth(5));
    sails.add(this.add.triangle(0, 0, 0, 286, 0, 476, 154, 402, colors.parchment, 0.86).setStrokeStyle(2, colors.brass, 0.48));
    sails.add(this.add.triangle(0, 0, 0, 296, 0, 468, -132, 404, colors.bone, 0.8).setStrokeStyle(2, colors.brass, 0.42));
    sails.add(this.add.triangle(0, 0, 0, 220, 0, 254, 44, 238, colors.crimson, 0.92).setStrokeStyle(1, colors.charcoal, 0.8));
    sails.add(this.add.line(0, 0, -118, 328, 100, 405, colors.brass, 0.18).setLineWidth(2));
    sails.add(this.add.line(0, 0, 18, 318, 118, 452, colors.brass, 0.16).setLineWidth(2));
    ship.add(this.add.line(480, 0, 0, 204, -330, 584, colors.brass, 0.18).setLineWidth(2));
    ship.add(this.add.line(480, 0, 0, 204, 330, 584, colors.brass, 0.18).setLineWidth(2));
    ship.add(this.add.line(480, 0, 0, 286, -300, 452, colors.brass, 0.2).setLineWidth(2));
    ship.add(this.add.line(480, 0, 0, 286, 300, 452, colors.brass, 0.2).setLineWidth(2));
    this.drawTitleCrew(ship);
    ship.add(this.add.rectangle(480, 620, 232, 16, colors.woodDark, 0.78).setStrokeStyle(1, colors.brass, 0.48));
    ship.add(this.add.text(480, 611, 'TIDEBREAK', { ...ui.small, fontSize: '11px', color: '#e1c16b' }).setOrigin(0.5));
    ship.add(this.add.rectangle(480, 626, 690, 18, colors.charcoal, 0.24));
    this.tweens.add({
      targets: ship,
      y: 4,
      angle: -0.45,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: sails,
      angle: 1.2,
      duration: 2100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  drawTitleCrew(parent) {
    this.drawTitleCrewMember(parent, crewTemplate[0], 326, 548, 0, 0.82);
    this.drawTitleCrewMember(parent, crewTemplate[1], 486, 534, 180, 0.78);
    this.drawTitleCrewMember(parent, crewTemplate[2], 642, 552, 320, 0.8);
  }

  drawTitleCrewMember(parent, unit, x, y, delay = 0, scale = 0.8) {
    const profile = characterSpriteProfiles[unit.id];
    const stance = stanceSpriteDetails[unit.stance] || stanceSpriteDetails.Boarding;
    const crew = this.add.container(x, y);
    crew.add(this.add.ellipse(0, 29, 54, 14, colors.charcoal, 0.33));
    drawScallywagCharacter(this, crew, unit, profile, stance, true, { scale: 2.55, size: scale, y: 28, front: true, aura: false, details: false });
    crew.add(this.add.rectangle(0, 34, 44, 4, stance.accent, 0.96).setStrokeStyle(1, colors.charcoal, 0.7));
    crew.add(this.add.text(0, 39, unit.name.split(' ')[0], { ...ui.small, fontSize: '9px', color: '#f3e5c4' }).setOrigin(0.5));
    parent.add(crew);
    this.tweens.add({
      targets: crew,
      y: y - 4,
      angle: unit.id === 'gunner' ? 1 : -1,
      delay,
      duration: 1600 + delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  addTitleHeadgear(container, profile, headY, accent, dark, scale) {
    if (profile.hat === 'tricorn') {
      container.add(this.add.triangle(0, headY - 14 * scale, -24 * scale, 4, 0, -11 * scale, 24 * scale, 4, dark, 1));
      container.add(this.add.rectangle(0, headY - 10 * scale, 34 * scale, 5, accent, 0.85));
    } else if (profile.hat === 'bandana') {
      container.add(this.add.rectangle(0, headY - 12 * scale, 28 * scale, 6, colors.crimson, 0.95));
      container.add(this.add.triangle(14 * scale, headY - 11 * scale, 0, 0, 18 * scale, 4, 22 * scale, 13, colors.crimson, 0.92));
    }
  }

  addTitleWeapons(container, profile, unit, stance, scale) {
    const left = unit.id === 'gunner' ? 1 : -1;
    const weapons = profile.weapons || [];
    if (weapons.includes('musket')) {
      container.add(this.add.line(13 * left * scale, -30, 0, 0, 48 * left * scale, -22, colors.woodDark, 1).setLineWidth(5));
      container.add(this.add.line(42 * left * scale, -23, 0, 0, 18 * left * scale, -6, 0x1b1d1f, 1).setLineWidth(2));
    }
    if (weapons.includes('pistol')) {
      container.add(this.add.line(-15 * left * scale, -19, 0, 0, -31 * left * scale, -28, 0x1b1d1f, 1).setLineWidth(4));
    }
    if (weapons.includes('cutlass')) {
      container.add(this.add.line(15 * left * scale, -10, 0, 0, 36 * left * scale, -34 + stance.weaponLift * 0.4, 0xdfe8e2, 1).setLineWidth(3));
      container.add(this.add.circle(15 * left * scale, -10, 4, colors.brass, 0.95));
    }
    if (weapons.includes('hooks')) {
      container.add(this.add.arc(-18 * scale, -4, 16 * scale, Phaser.Math.DegToRad(250), Phaser.Math.DegToRad(70), false).setStrokeStyle(3, 0xdfe8e2, 1));
      container.add(this.add.arc(18 * scale, -4, 16 * scale, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(290), false).setStrokeStyle(3, 0xdfe8e2, 1));
    }
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

  drawTitleDisplayShip(x, y, scale = 1) {
    const g = this.add.graphics();
    g.setDepth(3);
    g.fillStyle(0x07111d, 0.34);
    g.fillEllipse(x - 2 * scale, y + 22 * scale, 174 * scale, 34 * scale);
    g.fillStyle(0x1c100c, 1);
    g.fillTriangle(x + 70 * scale, y + 2 * scale, x + 98 * scale, y + 12 * scale, x + 70 * scale, y + 24 * scale);
    g.fillTriangle(x - 70 * scale, y + 8 * scale, x - 94 * scale, y + 18 * scale, x - 70 * scale, y + 28 * scale);
    g.fillStyle(colors.woodDark, 1);
    g.fillPoints([
      { x: x - 76 * scale, y: y + 8 * scale },
      { x: x - 48 * scale, y: y + 42 * scale },
      { x: x + 54 * scale, y: y + 42 * scale },
      { x: x + 76 * scale, y: y + 8 * scale },
      { x: x + 52 * scale, y: y + 30 * scale },
      { x: x - 60 * scale, y: y + 31 * scale },
    ], true);
    g.lineStyle(3, colors.charcoal, 1);
    g.strokePoints([
      { x: x - 76 * scale, y: y + 8 * scale },
      { x: x - 48 * scale, y: y + 42 * scale },
      { x: x + 54 * scale, y: y + 42 * scale },
      { x: x + 76 * scale, y: y + 8 * scale },
    ], true);
    g.fillStyle(colors.wood, 1);
    g.fillRoundedRect(x - 58 * scale, y - 2 * scale, 116 * scale, 30 * scale, 5 * scale);
    g.lineStyle(2, colors.brass, 0.78);
    g.lineBetween(x - 64 * scale, y + 5 * scale, x + 64 * scale, y + 3 * scale);
    g.lineBetween(x - 48 * scale, y + 34 * scale, x + 48 * scale, y + 34 * scale);
    g.lineStyle(1, 0x8b5a36, 0.88);
    for (let ix = -44; ix <= 44; ix += 15) g.lineBetween(x + ix * scale, y + 4 * scale, x + (ix - 8) * scale, y + 28 * scale);
    g.fillStyle(0x0a0706, 0.86);
    for (let ix = -38; ix <= 38; ix += 20) g.fillCircle(x + ix * scale, y + 19 * scale, 4 * scale);
    g.lineStyle(5, 0x20130e, 1);
    g.lineBetween(x - 6 * scale, y + 30 * scale, x - 6 * scale, y - 68 * scale);
    g.lineStyle(3, 0x20130e, 1);
    g.lineBetween(x + 28 * scale, y + 26 * scale, x + 28 * scale, y - 40 * scale);
    g.lineStyle(2, colors.woodDark, 1);
    g.lineBetween(x - 48 * scale, y - 34 * scale, x + 48 * scale, y - 34 * scale);
    g.lineBetween(x - 40 * scale, y + 1 * scale, x + 54 * scale, y + 1 * scale);
    g.fillStyle(0xf1dfb7, 0.96);
    g.fillPoints([
      { x: x - 12 * scale, y: y - 64 * scale },
      { x: x - 13 * scale, y: y - 4 * scale },
      { x: x - 68 * scale, y: y - 12 * scale },
      { x: x - 50 * scale, y: y - 42 * scale },
    ], true);
    g.fillStyle(0xd8c28f, 0.94);
    g.fillPoints([
      { x: x + 2 * scale, y: y - 62 * scale },
      { x: x + 3 * scale, y: y + 18 * scale },
      { x: x + 68 * scale, y: y - 1 * scale },
      { x: x + 48 * scale, y: y - 38 * scale },
    ], true);
    g.fillStyle(0xe8d7ae, 0.9);
    g.fillPoints([
      { x: x + 31 * scale, y: y - 40 * scale },
      { x: x + 31 * scale, y: y + 8 * scale },
      { x: x + 64 * scale, y: y - 10 * scale },
    ], true);
    g.lineStyle(1, colors.brass, 0.7);
    g.strokeTriangle(x - 12 * scale, y - 64 * scale, x - 13 * scale, y - 4 * scale, x - 68 * scale, y - 12 * scale);
    g.strokeTriangle(x + 2 * scale, y - 62 * scale, x + 3 * scale, y + 18 * scale, x + 68 * scale, y - 1 * scale);
    g.strokeTriangle(x + 31 * scale, y - 40 * scale, x + 31 * scale, y + 8 * scale, x + 64 * scale, y - 10 * scale);
    g.fillStyle(colors.crimson, 0.9);
    g.fillTriangle(x - 6 * scale, y - 74 * scale, x - 6 * scale, y - 52 * scale, x + 28 * scale, y - 63 * scale);
    g.lineStyle(1, colors.charcoal, 0.9);
    g.strokeTriangle(x - 6 * scale, y - 74 * scale, x - 6 * scale, y - 52 * scale, x + 28 * scale, y - 63 * scale);
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
    g.fillStyle(0x12364a, 0.16);
    g.fillRoundedRect(132, 256, 348, 220, 8);
    g.lineStyle(1, colors.teal, 0.18);
    for (let y = 280; y <= 452; y += 28) {
      g.beginPath();
      for (let x = 146; x <= 466; x += 26) {
        const wave = Math.sin((x + y) * 0.05) * 4;
        if (x === 146) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
    g.fillStyle(colors.parchment, 0.08);
    g.fillCircle(236, 338, 48);
    g.fillCircle(392, 414, 34);
    g.lineStyle(2, colors.brass, 0.28);
    g.lineBetween(172, 454, 452, 284);
    this.add.text(160, 266, 'SEA CHART', { ...ui.label, color: '#e1c16b', fontSize: '12px' });
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
    this.drawTitleGauge(610, 536, 'MORALE', colors.teal, 28);
    this.drawTitleGauge(830, 536, 'DANGER', colors.crimson, -20);
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
    this.add.text(480, 126, 'BLACKWAKE', { ...ui.title, fontSize: '58px', color: '#f3e5c4' }).setOrigin(0.5).setStroke('#07111d', 6).setDepth(12);
    this.add.text(480, 174, 'TACTICS', { ...ui.title, fontSize: '32px', color: '#e1c16b' }).setOrigin(0.5).setStroke('#07111d', 4).setDepth(12);
    this.add.text(480, 206, 'A PIRATE TACTICAL RPG', { ...ui.label, color: '#54b7aa' }).setOrigin(0.5).setDepth(12);
    this.add.rectangle(480, 226, 394, 5, colors.wood, 0.9).setDepth(12);
    this.add.rectangle(480, 234, 254, 3, colors.brass, 0.88).setDepth(12);
  }

  drawMenuPanel() {
    this.refreshSaveState();
    const buttons = [
      { label: 'New Game', key: 'N', action: () => this.openNewGamePrompt(), enabled: true },
      ...(this.canContinue ? [{ label: 'Continue', key: 'C', action: () => this.continueAuto(), enabled: true }] : []),
      { label: 'Load Save', key: 'L', action: () => this.openLoad(), enabled: this.canLoad },
      { label: 'Options', key: 'O', action: () => this.openTitleOptions(), enabled: true },
    ];
    const panelX = 74;
    const panelY = 254;
    const panelWidth = 240;
    const panelHeight = 34 + buttons.length * 42 + 20;
    drawPanel(this, panelX, panelY, panelWidth, panelHeight, 0.92).setDepth(20);
    buttons.forEach((item, index) => {
      this.drawTitleButton(panelX + 22, panelY + 22 + index * 42, panelWidth - 44, item.label, item.key, item.action, item.enabled);
    });
    this.add.text(480, 674, 'Enter or Space starts a new game. Saves use browser local storage.', {
      ...ui.small,
      color: '#d9c58e',
      wordWrap: { width: 500 },
      align: 'center',
    }).setOrigin(0.5).setDepth(22);
  }

  drawTitleButton(x, y, width, label, key, onClick, enabled) {
    const tone = enabled ? colors.wood : 0x262b30;
    this.add.rectangle(x + 4, y + 5, width, 34, colors.charcoal, 0.54).setOrigin(0).setDepth(21);
    const bg = this.add.rectangle(x, y, width, 34, tone, enabled ? 0.98 : 0.68).setOrigin(0).setDepth(22).setStrokeStyle(2, enabled ? colors.brass : colors.smoke, enabled ? 0.65 : 0.32);
    this.add.text(x + 14, y + 8, label, { ...ui.label, color: enabled ? '#f3e5c4' : '#879097' }).setDepth(23);
    this.add.text(x + width - 24, y + 8, `(${key})`, { ...ui.small, color: enabled ? '#e1c16b' : '#879097' }).setOrigin(0.5, 0).setDepth(23);
    if (!enabled) return;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(colors.brass, 0.96));
    bg.on('pointerout', () => bg.setFillStyle(tone, 0.98));
    bg.on('pointerdown', () => {
      playUiSound(this);
      onClick();
    });
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

  drawTitlePrompt(title, body, actions, height = 190) {
    this.capturePrompt(() => {
      this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.5).setDepth(200).setInteractive();
      drawPanel(this, 304, 250, 352, height, 0.98).setDepth(201);
      this.add.text(330, 274, title, { ...ui.h2, fontSize: '23px' }).setDepth(202);
      this.add.text(330, 308, body, {
        ...ui.small,
        color: '#f3e5c4',
        wordWrap: { width: 292 },
        lineSpacing: 3,
      }).setDepth(202);
      const buttonWidth = actions.length >= 3 ? 96 : 124;
      const gap = actions.length >= 3 ? 10 : 22;
      const totalWidth = actions.length * buttonWidth + (actions.length - 1) * gap;
      const startX = 480 - totalWidth / 2;
      actions.forEach((action, index) => {
        button(this, startX + index * (buttonWidth + gap), 250 + height - 58, buttonWidth, action.label, action.onClick, action.tone || colors.brass)
          .forEach((object) => object.setDepth?.(203));
      });
    });
  }

  openNewGamePrompt() {
    if (this.pauseMenuOpen) return;
    this.drawTitlePrompt('Start New Voyage?', 'Begin a new run at the haven docks. Existing saves are kept unless overwritten later.', [
      { label: 'Start', onClick: () => this.newGame() },
      { label: 'Back', onClick: () => this.clearPrompt(), tone: colors.teal },
    ]);
  }

  openContinuePrompt() {
    if (this.pauseMenuOpen) return;
    this.refreshSaveState();
    if (!this.canContinue) return;
    const info = this.autoSaveInfo;
    this.drawTitlePrompt('Continue Autosave?', `${info.label} | ${info.scene} | Coin ${info.coin} | Supplies ${info.supplies} | Rep ${info.reputation}`, [
      { label: 'Continue', onClick: () => this.loadSave('auto') },
      { label: 'Back', onClick: () => this.clearPrompt(), tone: colors.teal },
    ], 198);
  }

  handleLoadKey() {
    if (this.pauseMenuOpen) return;
    this.refreshSaveState();
    if (!this.canLoad) return;
    if (this.loadOpen) {
      this.loadSelected();
      return;
    }
    this.openLoad();
  }

  openTitleOptions() {
    if (this.pauseMenuOpen) return;
    this.pauseMenuOpen = true;
    this.audioOptionsOrigin = 'title';
    openPauseOptions(this);
  }

  newGame() {
    if (this.pauseMenuOpen) return;
    this.clearPrompt();
    const next = makeInitialState();
    next.lastScene = 'Haven';
    next.pendingTutorialPrompt = true;
    this.registry.set('gameState', next);
    saveAutoGame(next);
    this.scene.start('HavenScene');
  }

  startTutorial() {
    if (this.pauseMenuOpen) return;
    this.clearPrompt();
    const next = makeInitialState();
    next.lastScene = 'Haven';
    next.navigationMessage = 'Tutorial voyage: sail to the Navy Patrol marker.';
    setTutorialStep(next, 'haven');
    this.registry.set('gameState', next);
    saveAutoGame(next);
    this.scene.start('HavenScene');
  }

  continueAuto() {
    if (this.pauseMenuOpen) return;
    this.refreshSaveState();
    if (!this.canContinue) return;
    this.openContinuePrompt();
  }

  loadSave(slot = 'auto') {
    this.refreshSaveState();
    if (!this.canLoad) return;
    const saved = slot === 'auto' ? loadAutoGame() : loadGameSlot(slot);
    if (!saved) return;
    this.clearPrompt();
    this.registry.set('gameState', saved);
    this.routeLoadedState(saved);
  }

  firstFilledSlot() {
    if (this.autoSaveInfo || getSaveInfo('auto')) return 'auto';
    return SAVE_SLOTS.find((slot) => getSaveInfo(slot)) || 1;
  }

  refreshSaveState() {
    this.autoSaveInfo = getSaveInfo('auto');
    this.saveInfos = SAVE_SLOTS.map((slot) => getSaveInfo(slot));
    this.canContinue = Boolean(this.autoSaveInfo);
    this.canLoad = Boolean(this.autoSaveInfo || this.saveInfos.some(Boolean));
  }

  selectLoadSlot(slot) {
    if (this.pauseMenuOpen) return;
    if (!this.loadOpen) return;
    this.refreshSaveState();
    if (!getSaveInfo(slot)) return;
    this.selectedLoadSlot = slot;
    this.openLoad();
  }

  openLoad() {
    if (this.pauseMenuOpen) return;
    this.refreshSaveState();
    if (!this.canLoad) return;
    if (!getSaveInfo(this.selectedLoadSlot)) this.selectedLoadSlot = this.firstFilledSlot();
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
      this.drawSaveRow(250, 218, 'auto', this.autoSaveInfo, 1);
      SAVE_SLOTS.forEach((slot, index) => this.drawSaveRow(250, 290 + index * 66, slot, this.saveInfos[index], index + 2));
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
      playUiSound(this);
      this.selectedLoadSlot = slot;
      this.openLoad();
    });
  }

  loadSelected() {
    this.refreshSaveState();
    if (!this.canLoad) return;
    const saved = this.selectedLoadSlot === 'auto' ? loadAutoGame() : loadGameSlot(this.selectedLoadSlot);
    if (!saved) return;
    this.registry.set('gameState', saved);
    this.routeLoadedState(saved);
  }

  confirmDelete(slot) {
    this.refreshSaveState();
    if (!getSaveInfo(slot)) return;
    const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
    this.capturePrompt(() => {
      this.drawPromptShell('Delete Save?', `Delete ${label}? This removes that saved voyage from browser storage.`, 188);
      button(this, 278, 364, 126, 'Delete', () => {
        deleteSave(slot);
        this.refreshSaveState();
        this.selectedLoadSlot = this.firstFilledSlot();
        this.draw();
        if (this.canLoad) this.openLoad();
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
    installPauseMenu(this, { sceneLabel: 'Haven' });
    this.zoneId = havenMaps[this.state.havenZone] ? this.state.havenZone : 'docks';
    if (!['docks', 'village'].includes(this.zoneId)) this.zoneId = 'village';
    this.state.havenZone = this.zoneId;
    this.player = this.state.havenPlayerByZone?.[this.zoneId] || (this.zoneId === 'docks' ? this.state.havenPlayer : null) || this.gridToHavenWorld(this.currentHavenMap().spawn);
    if (!this.canStandAt(this.player.x, this.player.y)) this.player = this.gridToHavenWorld(this.currentHavenMap().spawn);
    this.partyMenuOpen = false;
    this.commandMenuOpen = false;
    this.inventoryMenuOpen = false;
    this.journalMenuOpen = false;
    this.partyViewMode = 'overview';
    this.selectedCrewIndex = 0;
    this.commandMenuIndex = 0;
    this.inventoryCategoryIndex = 0;
    this.inventoryItemIndex = 0;
    this.journalCategoryIndex = 0;
    this.journalEntryIndex = 0;
    this.partyFloatingUi = [];
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE,P,ESC');
    this.input.keyboard.on('keydown-P', () => this.openPartyMenu());
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.hasHavenOverlayOpen()) this.closeHavenOverlays();
    });
    this.draw();
  }

  update(time) {
    if (this.pauseMenuOpen) return;
    if (this.hasHavenOverlayOpen()) {
      this.animateHavenOcean(time);
      this.handleHavenOverlayKeys();
      return;
    }
    if (this.state.pendingTutorialPrompt) {
      this.animateHavenOcean(time);
      return;
    }
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
    this.animateHavenOcean(time);
    this.refreshPlayerMarker();
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.openCommandMenu();
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.tryHavenInteraction();
  }

  draw() {
    this.clearHavenWaterAnimations();
    this.havenOceanTiles = [];
    this.havenOceanBands = [];
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(colors.navy);
    this.drawHavenBackdrop();
    this.drawHavenLevel();
    this.drawPlayerMarker();
    this.drawContextPrompt();
    this.drawHavenSummary();
    this.drawTutorialChoicePrompt();
    this.drawCommandMenu();
    this.drawInventoryMenu();
    this.drawJournalMenu();
    this.drawPartyMenu();
    this.drawTutorial();
  }

  drawHavenBackdrop() {
    if (this.zoneId === 'docks') {
      this.drawPortOceanBackdrop();
      return;
    }
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

  drawPortOceanBackdrop() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x0d3448, 1);
    const g = this.add.graphics();
    g.fillStyle(0x09283c, 0.2);
    for (let y = 24; y < HEIGHT; y += 96) {
      g.fillEllipse(220 + Math.sin(y * 0.07) * 90, y + 16, 420, 34);
      g.fillEllipse(720 + Math.cos(y * 0.05) * 70, y + 42, 360, 30);
    }
    for (let y = 28; y < HEIGHT; y += 28) {
      g.lineStyle(y % 56 === 0 ? 2 : 1, y % 84 === 0 ? 0xcaf6ea : colors.teal, y % 84 === 0 ? 0.16 : 0.1);
      g.beginPath();
      for (let x = -30; x <= WIDTH + 30; x += 24) {
        const wave = Math.sin((x + y) * 0.027) * 7 + Math.cos((x - y) * 0.015) * 3;
        if (x === -30) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
    for (let i = 0; i < 14; i += 1) {
      const y = 42 + i * 48;
      const band = this.add.container(0, y);
      const length = 78 + (i % 4) * 26;
      for (let x = -60; x < WIDTH + 120; x += 180) {
        band.add(this.add.ellipse(x + ((i * 67) % 140), 0, length, 3, i % 3 === 0 ? 0xd8fff4 : 0x7bd8df, i % 3 === 0 ? 0.13 : 0.08));
      }
      band.baseY = y;
      band.wavePhase = i * 0.77;
      this.havenOceanBands.push(band);
    }
  }

  drawHavenLevel() {
    this.drawHavenMapFrame();
    const tiles = this.currentHavenTiles();
    for (let y = 0; y < tiles.length; y += 1) {
      for (let x = 0; x < tiles[y].length; x += 1) {
        const tile = tiles[y][x];
        const info = havenTileInfo[tile] || havenTileInfo.s;
        if (info.kind === 'water') this.drawHavenTile(x, y);
      }
    }
    for (let y = 0; y < tiles.length; y += 1) {
      for (let x = 0; x < tiles[y].length; x += 1) {
        const tile = tiles[y][x];
        const info = havenTileInfo[tile] || havenTileInfo.s;
        if (info.kind !== 'water') this.drawHavenTile(x, y);
      }
    }
    this.drawHavenMapBorder();
    this.drawHavenMapOverlays();
    this.getHavenLots().forEach((lot) => this.drawHavenLot(lot));
    const ship = this.currentHavenMap().ship;
    if (ship) this.drawDockShip(...Object.values(this.gridToHavenWorld(ship)), ship.scale || 1);
    if (this.zoneId === 'docks') this.drawShipBoardingGangway();
  }

  drawDockShip(x, y, scale = 1) {
    ensureHavenShipTopDownTexture(this);
    this.add.image(x, y, 'haven-ship-top-down-sprite')
      .setScale(scale)
      .setDepth(6);
  }

  drawHavenMapFrame() {
    const tiles = this.currentHavenTiles();
    const width = tiles[0].length * HAVEN_TILE;
    const height = tiles.length * HAVEN_TILE;
    this.add.rectangle(HAVEN_MAP_X + width / 2, HAVEN_MAP_Y + height / 2, width + 10, height + 10, colors.navyDark, 0.72)
      .setStrokeStyle(2, colors.brass, 0.36);
  }

  drawHavenMapBorder() {
    const tiles = this.currentHavenTiles();
    const width = tiles[0].length * HAVEN_TILE;
    const height = tiles.length * HAVEN_TILE;
    this.add.rectangle(HAVEN_MAP_X + width / 2, HAVEN_MAP_Y + height / 2, width + 10, height + 10, 0x000000, 0)
      .setStrokeStyle(2, colors.brass, 0.54);
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
    if (this.zoneId === 'docks') {
      this.drawPortOceanTile(px, py, x, y);
      return;
    }
    const shore = this.isHavenCoastalWaterTile(x, y);
    const dockside = this.isHavenDocksideWater(x, y);
    const base = shore ? 0x12495e : ((x + y) % 2 === 0 ? 0x0a3147 : 0x092d41);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, base, 1).setDepth(0);
    this.drawCustomOceanTile(px, py, x, y, shore, dockside);
    if (shore) this.drawShoreFoam(px, py, x, y);
    if (dockside) this.drawDockWaterFoam(px, py, x, y);
    this.drawWaterGlint(px, py, x, y, shore || dockside);
  }

  drawPortOceanTile(px, py, x, y) {
    const shore = this.isHavenCoastalWaterTile(x, y);
    const dockside = this.isHavenDocksideWater(x, y);
    const base = shore ? 0x12495e : ((x + y) % 2 === 0 ? 0x0a3147 : 0x092d41);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, base, 1).setDepth(0);
    this.drawCustomOceanTile(px, py, x, y, shore, dockside);
    if (shore) this.drawShoreFoam(px, py, x, y);
    if (dockside) this.drawDockWaterFoam(px, py, x, y);
    this.drawWaterGlint(px, py, x, y, shore || dockside);
  }

  drawCustomOceanTile(px, py, x, y, shore, dockside) {
    const shade = this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 2, HAVEN_TILE - 2, 0x071f32, 0.08 + ((x + y) % 3) * 0.018)
      .setDepth(0);
    const waveA = this.add.line(px + 20, py + 13 + ((x * 3 + y) % 6), -15, 0, 15, 0, 0x6fb8c8, shore ? 0.22 : dockside ? 0.17 : 0.12)
      .setLineWidth(1)
      .setDepth(0);
    const waveB = this.add.line(px + 18, py + 27 + ((x + y * 2) % 5), -12, 0, 12, 0, 0xd8fff4, shore ? 0.16 : dockside ? 0.12 : 0.07)
      .setLineWidth(1)
      .setDepth(0);
    waveA.baseX = waveA.x;
    waveB.baseX = waveB.x;
    waveA.baseAlpha = waveA.alpha;
    waveB.baseAlpha = waveB.alpha;
    shade.baseAlpha = shade.alpha;
    waveA.wavePhase = x * 0.67 + y * 0.91;
    waveB.wavePhase = x * 0.93 + y * 0.51 + 1.8;
    shade.wavePhase = x * 0.41 + y * 0.73;
    this.havenOceanTiles.push(waveA, waveB, shade);
  }

  animateHavenOcean(time = 0) {
    if (this.zoneId !== 'docks') return;
    const t = time * 0.001;
    this.havenOceanTiles?.forEach((tile, index) => {
      if (tile.baseX !== undefined) tile.x = tile.baseX + Math.sin(t * 0.7 + tile.wavePhase) * 1.2;
      if (tile.baseY !== undefined) tile.y = tile.baseY + Math.cos(t * 0.55 + tile.wavePhase) * 0.6;
      tile.alpha = tile.baseAlpha + Math.sin(t * 1.4 + index * 0.23) * 0.035;
    });
    this.havenOceanBands?.forEach((band, index) => {
      band.x = ((t * (8 + index * 0.35)) % 180) - 90;
      band.y = band.baseY + Math.sin(t * 0.8 + band.wavePhase) * 2.5;
      band.alpha = 0.7 + Math.sin(t * 1.2 + band.wavePhase) * 0.16;
    });
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
    const base = shore ? ((x + y) % 2 === 0 ? 0xc9a15e : 0xb99155) : ((x + y) % 2 === 0 ? 0x957644 : 0x85683c);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, base, 1).setStrokeStyle(1, 0x4e3a23, 0.36);
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE - 8, HAVEN_TILE - 8, shore ? 0xd8b874 : 0xa88751, shore ? 0.2 : 0.13);
    this.add.line(px + 20, py + 11 + ((x + y) % 6), -14, 1, 14, -1, 0x6f5734, shore ? 0.16 : 0.12).setLineWidth(1);
    this.add.line(px + 21, py + 29 + ((x * 2 + y) % 5), -12, -1, 12, 1, 0xd9c58e, shore ? 0.12 : 0.08).setLineWidth(1);
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
    const foam = [];
    if (this.isHavenWaterGrid(x, y - 1)) foam.push(this.add.line(px + 20, py + 5, -15, 0, 15, 0, colors.bone, 0.3).setLineWidth(2));
    if (this.isHavenWaterGrid(x + 1, y)) foam.push(this.add.line(px + 35, py + 20, 0, -15, 0, 15, colors.bone, 0.25).setLineWidth(2));
    if (this.isHavenWaterGrid(x, y + 1)) foam.push(this.add.line(px + 20, py + 35, -15, 0, 15, 0, colors.bone, 0.3).setLineWidth(2));
    if (this.isHavenWaterGrid(x - 1, y)) foam.push(this.add.line(px + 5, py + 20, 0, -15, 0, 15, colors.bone, 0.25).setLineWidth(2));
    foam.forEach((line, index) => {
      this.tweens.add({
        targets: line,
        alpha: 0.1,
        duration: 760 + ((x * 17 + y * 19 + index * 140) % 520),
        yoyo: true,
        repeat: -1,
      });
    });
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
    this.add.rectangle(px + 20, py + 20, HAVEN_TILE, HAVEN_TILE, 0x092d41, 1);
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
    const ship = this.gridToHavenWorld({ x: 17.25, y: 5.85 });
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
      { id: 'drydock', name: 'Drydock Lot', grid: { x: 8, y: 5 }, note: 'Damaged dock frame and keel blocks.', project: 'drydock' },
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
    const built = this.state.haven[lot.project] > 0;
    if (built) {
      this.drawHavenProjectSprite(lot.x, lot.y, lot.project, true);
      this.add.text(lot.x, lot.y + 42, havenProjects[lot.project].name, { ...ui.small, fontSize: '10px', wordWrap: { width: 112 }, align: 'center' }).setOrigin(0.5, 0);
      return;
    }
    this.drawHavenProjectSprite(lot.x, lot.y, lot.project, false);
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
    const leader = normalizeCrew(this.state.crew)[0];
    this.playerMarker = this.add.container(this.player.x, this.player.y).setDepth(50);
    this.playerMarker.leaderId = leader.id;
    this.playerMarker.add(this.add.ellipse(0, 13, 28, 9, colors.charcoal, 0.34));
    this.drawHavenLeaderSprite(this.playerMarker, leader);
    this.refreshContextText();
  }

  drawHavenLeaderSprite(container, leader) {
    const profile = spriteProfileFor(leader);
    const stance = stanceSpriteDetails[leader.stance] || stanceSpriteDetails.Command;
    const facing = this.playerFacing || 1;
    drawScallywagCharacter(this, container, leader, profile, stance, true, { scale: 1.82, y: 14, facing, direction: this.playerDirection || 'down', aura: true });
    if (leader.level > 1) {
      container.add(this.add.circle(14, -24, 5, colors.brassLight, 0.95).setStrokeStyle(1, colors.charcoal));
      container.add(this.add.text(14, -28, `${leader.level}`, { ...ui.small, fontSize: '7px', color: '#17100c' }).setOrigin(0.5, 0));
    }
  }

  refreshPlayerMarker() {
    if (this.playerMarker) this.playerMarker.setPosition(this.player.x, this.player.y);
    if (this.playerMarker && this.playerWalkingUntil && this.time.now < this.playerWalkingUntil) {
      this.playerMarker.y = this.player.y + Math.sin(this.time.now * 0.024) * 2.2;
      this.playerMarker.setScale(1, 1 + Math.sin(this.time.now * 0.048) * 0.025);
      const walkCycle = [0, 1, 2, 1];
      setScallywagPose(this.playerMarker.scallywagParts, this.playerDirection || 'down', walkCycle[Math.floor(this.time.now / 110) % walkCycle.length]);
    } else if (this.playerMarker) {
      this.playerMarker.setScale(1);
      setScallywagPose(this.playerMarker.scallywagParts, this.playerDirection || 'down', 0);
    }
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
    if (dx) this.playerFacing = dx > 0 ? 1 : -1;
    if (Math.abs(dx) > Math.abs(dy)) this.playerDirection = dx > 0 ? 'right' : 'left';
    else if (dy) this.playerDirection = dy > 0 ? 'down' : 'up';
    this.playerWalkingUntil = this.time.now + 140;
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
      text.setText('WASD to move. E opens menu. Space interacts.');
      return;
    }
    if (interaction.type === 'build') {
      const project = havenProjects[interaction.lot.project];
      text.setText(`Space: Build ${project.name} (${this.formatCost(project.cost)}). E opens menu.`);
      return;
    }
    if (interaction.type === 'zone') {
      text.setText(`Space: ${interaction.prompt}. E opens menu.`);
      return;
    }
    text.setText(`Space: ${interaction.prompt}. E opens menu.`);
  }

  tryHavenInteraction() {
    const interaction = this.getNearbyHavenInteraction();
    if (!interaction) {
      this.openPartyMenu();
      return;
    }
    if (interaction.type === 'sail') {
      if (isTutorialActive(this.state)) {
        setTutorialStep(this.state, 'navigation');
        saveAutoGame(this.state);
      }
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
    if (isTutorialActive(this.state) && this.state.tutorial.step === 'rebuildDrydock' && lot.project === 'drydock') {
      completeTutorial(this.state);
      this.state.pendingHavenSummary = {
        title: 'Tutorial Complete',
        lines: ['The drydock is rebuilt.', 'Haven is ready for open-ended voyages.', 'Sail when you are ready to choose your next risk.'],
      };
    }
    saveAutoGame(this.state);
    this.draw();
  }

  openPartyMenu(index = this.selectedCrewIndex) {
    this.closeHavenOverlays(false);
    this.partyMenuOpen = true;
    this.partyViewMode ||= 'overview';
    this.selectedCrewIndex = Phaser.Math.Clamp(index, 0, this.state.crew.length - 1);
    this.clearPartyFloatingUi();
    this.draw();
  }

  closePartyMenu() {
    this.partyMenuOpen = false;
    this.clearPartyFloatingUi();
    saveAutoGame(this.state);
    this.draw();
  }

  hasHavenOverlayOpen() {
    return this.commandMenuOpen || this.partyMenuOpen || this.inventoryMenuOpen || this.journalMenuOpen;
  }

  closeHavenOverlays(redraw = true) {
    this.commandMenuOpen = false;
    this.partyMenuOpen = false;
    this.inventoryMenuOpen = false;
    this.journalMenuOpen = false;
    this.clearPartyFloatingUi();
    if (redraw) this.draw();
  }

  openCommandMenu() {
    this.closeHavenOverlays(false);
    this.commandMenuOpen = true;
    this.commandMenuIndex = 0;
    this.draw();
  }

  openInventoryMenu() {
    this.closeHavenOverlays(false);
    this.inventoryMenuOpen = true;
    this.inventoryCategoryIndex = 0;
    this.inventoryItemIndex = 0;
    this.draw();
  }

  openJournalMenu() {
    this.closeHavenOverlays(false);
    this.journalMenuOpen = true;
    this.journalCategoryIndex = 0;
    this.journalEntryIndex = 0;
    this.draw();
  }

  handleHavenOverlayKeys() {
    if (this.commandMenuOpen) {
      const actions = this.getCommandMenuActions();
      if (Phaser.Input.Keyboard.JustDown(this.keys.W)) {
        this.commandMenuIndex = (this.commandMenuIndex + actions.length - 1) % actions.length;
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
        this.commandMenuIndex = (this.commandMenuIndex + 1) % actions.length;
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) actions[this.commandMenuIndex].action();
      return;
    }
    if (this.inventoryMenuOpen) {
      const cats = this.getInventoryCategories();
      const items = cats[this.inventoryCategoryIndex]?.items || [];
      if (Phaser.Input.Keyboard.JustDown(this.keys.A)) {
        this.inventoryCategoryIndex = (this.inventoryCategoryIndex + cats.length - 1) % cats.length;
        this.inventoryItemIndex = 0;
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.D)) {
        this.inventoryCategoryIndex = (this.inventoryCategoryIndex + 1) % cats.length;
        this.inventoryItemIndex = 0;
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.W)) {
        this.inventoryItemIndex = Math.max(0, this.inventoryItemIndex - 1);
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
        this.inventoryItemIndex = Math.min(Math.max(0, items.length - 1), this.inventoryItemIndex + 1);
        this.draw();
      }
      return;
    }
    if (this.journalMenuOpen) {
      const cats = this.getJournalCategories();
      const entries = cats[this.journalCategoryIndex]?.entries || [];
      if (Phaser.Input.Keyboard.JustDown(this.keys.A)) {
        this.journalCategoryIndex = (this.journalCategoryIndex + cats.length - 1) % cats.length;
        this.journalEntryIndex = 0;
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.D)) {
        this.journalCategoryIndex = (this.journalCategoryIndex + 1) % cats.length;
        this.journalEntryIndex = 0;
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.W)) {
        this.journalEntryIndex = Math.max(0, this.journalEntryIndex - 1);
        this.draw();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
        this.journalEntryIndex = Math.min(Math.max(0, entries.length - 1), this.journalEntryIndex + 1);
        this.draw();
      }
    }
  }

  setPartyView(mode, index = this.selectedCrewIndex) {
    this.partyViewMode = mode;
    this.selectedCrewIndex = Phaser.Math.Clamp(index, 0, this.state.crew.length - 1);
    this.clearPartyFloatingUi();
    saveAutoGame(this.state);
    this.draw();
  }

  drawPartyMenu() {
    if (!this.partyMenuOpen) return;
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.62).setDepth(220).setInteractive();
    drawPanel(this, 34, 34, 892, 652, 0.98).setDepth(221);
    this.add.text(62, 58, this.partyViewMode === 'detail' ? 'Crew Build' : 'Crew Ledger', { ...ui.title, fontSize: '34px' }).setDepth(222);
    this.add.text(62, 98, 'Weapons, kit, stances, skills, and shipboard roles.', { ...ui.label, color: '#d9c58e' }).setDepth(222);
    this.drawPartyResourceStrip();
    if (this.partyViewMode === 'detail') this.drawCrewDetailMenu(normalizeCrew(this.state.crew)[this.selectedCrewIndex]);
    else this.drawCrewOverviewMenu(normalizeCrew(this.state.crew));
    this.drawPartyButton(62, 638, 124, 'Close', () => this.closePartyMenu(), colors.teal);
  }

  getCommandMenuActions() {
    return [
      { label: 'Party', note: 'Crew weapons, kit, stances, and skills.', action: () => this.openPartyMenu() },
      { label: 'Inventory', note: 'Materials, key cargo, consumables, medicine, and relics.', action: () => this.openInventoryMenu() },
      { label: 'Journal', note: 'Voyage notes, combat rules, enemies, status effects, and Haven records.', action: () => this.openJournalMenu() },
      { label: 'Options', note: 'Audio, save, load, and main menu.', action: () => { this.closeHavenOverlays(false); openPauseMenu(this); } },
    ];
  }

  drawCommandMenu() {
    if (!this.commandMenuOpen) return;
    const actions = this.getCommandMenuActions();
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.42).setDepth(220).setInteractive();
    drawPanel(this, 318, 190, 324, 328, 0.98).setDepth(221);
    this.add.text(348, 216, 'Captain\'s Orders', { ...ui.h2, fontSize: '26px' }).setDepth(222);
    this.add.text(348, 250, 'W/S selects. E or Space confirms. Esc closes.', { ...ui.small, color: '#d9c58e' }).setDepth(222);
    actions.forEach((action, index) => {
      const y = 288 + index * 50;
      const selected = index === this.commandMenuIndex;
      this.add.rectangle(348, y, 264, 40, selected ? colors.brass : colors.charcoal, selected ? 0.94 : 0.74)
        .setOrigin(0)
        .setStrokeStyle(2, selected ? colors.brassLight : colors.wood, selected ? 0.82 : 0.35)
        .setDepth(222)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => action.action());
      this.add.text(364, y + 7, action.label, { ...ui.label, color: selected ? '#17100c' : '#f3e5c4' }).setDepth(223);
      this.add.text(450, y + 10, action.note, { ...ui.small, fontSize: '9px', color: selected ? '#3a2519' : '#d9c58e', wordWrap: { width: 148 } }).setDepth(223);
    });
  }

  getInventoryCategories() {
    const inv = this.state.inventory;
    return [
      { id: 'materials', label: 'Materials', items: [
        { name: 'Coin', amount: this.state.resources.coin, description: 'Used for construction, supplies, and crew upgrades.' },
        { name: 'Lumber', amount: this.state.resources.lumber, description: 'Haven construction material.' },
        { name: 'Scrap', amount: this.state.resources.scrap, description: 'Metal, nails, brackets, and repair parts.' },
        { name: 'Black Powder', amount: this.state.resources.blackPowder, description: 'Explosives and ammunition stock.' },
      ] },
      { id: 'key', label: 'Key', items: [
        { name: 'Tidebreak Charter', amount: 1, description: 'The crew claim and operating papers for the Tidebreak.' },
        ...(this.state.haven.drydock ? [{ name: 'Rebuilt Drydock', amount: 1, description: 'The haven can launch and repair the Tidebreak.' }] : []),
      ] },
      { id: 'items', label: 'Items', items: [
        { name: 'Rations', amount: inv.rations || 0, description: 'Food stores for voyages and shore recovery.' },
        { name: 'Repair Kits', amount: inv.repairKits || 0, description: 'Emergency hull and equipment repairs.' },
      ] },
      { id: 'medicine', label: 'Medicine', items: [
        { name: 'Medicine', amount: inv.medicine || 0, description: 'Basic treatment stock for injury and recovery.' },
        ...(inv.equipment?.includes('surgeonWraps') ? [{ name: 'Surgeon Wraps', amount: 1, description: crewEquipmentCatalog.surgeonWraps.description }] : []),
      ] },
      { id: 'weapons', label: 'Weapons', items: (inv.weapons || []).map((id) => ({ name: crewWeaponCatalog[id]?.name || id, amount: 1, description: crewWeaponCatalog[id]?.description || 'Weapon.' })) },
      { id: 'equipment', label: 'Equipment', items: (inv.equipment || []).map((id) => ({ name: crewEquipmentCatalog[id]?.name || id, amount: 1, description: crewEquipmentCatalog[id]?.description || 'Crew equipment.' })) },
      { id: 'relics', label: 'Relics', items: (inv.relics || []).length ? inv.relics.map((name) => ({ name, amount: 1, description: 'A rare voyage find.' })) : [{ name: 'No Relics', amount: 0, description: 'Legendary encounters may leave unusual trophies.' }] },
    ];
  }

  drawInventoryMenu() {
    if (!this.inventoryMenuOpen) return;
    const categories = this.getInventoryCategories();
    const category = categories[this.inventoryCategoryIndex];
    const items = category.items;
    const item = items[this.inventoryItemIndex] || items[0];
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.58).setDepth(220).setInteractive();
    drawPanel(this, 58, 54, 844, 608, 0.98).setDepth(221);
    this.add.text(88, 78, 'Cargo Inventory', { ...ui.title, fontSize: '32px' }).setDepth(222);
    this.add.text(88, 116, 'A/D changes category. W/S selects cargo. Esc closes.', { ...ui.small, color: '#d9c58e' }).setDepth(222);
    categories.forEach((cat, index) => {
      const x = 88 + index * 114;
      const selected = index === this.inventoryCategoryIndex;
      this.add.rectangle(x, 154, 98, 30, selected ? colors.brass : colors.charcoal, selected ? 0.94 : 0.7).setOrigin(0).setStrokeStyle(1, colors.brass, selected ? 0.85 : 0.28).setDepth(222);
      this.add.text(x + 49, 162, cat.label, { ...ui.small, color: selected ? '#17100c' : '#f3e5c4', fontSize: '10px' }).setOrigin(0.5, 0).setDepth(223);
    });
    drawPanel(this, 88, 208, 318, 382, 0.72).setDepth(222);
    items.forEach((entry, index) => {
      const y = 230 + index * 42;
      const selected = index === this.inventoryItemIndex;
      this.add.rectangle(108, y, 276, 34, selected ? colors.wood : colors.charcoal, selected ? 0.82 : 0.52).setOrigin(0).setStrokeStyle(1, selected ? colors.brass : colors.wood, selected ? 0.72 : 0.25).setDepth(223);
      this.add.text(120, y + 8, entry.name, { ...ui.small, color: '#f3e5c4', wordWrap: { width: 188 } }).setDepth(224);
      this.add.text(368, y + 8, `${entry.amount}`, { ...ui.small, color: '#e1c16b' }).setOrigin(1, 0).setDepth(224);
    });
    drawPanel(this, 440, 208, 402, 382, 0.72).setDepth(222);
    this.add.text(466, 234, item?.name || 'Empty', { ...ui.h2, fontSize: '24px' }).setDepth(223);
    this.add.text(466, 272, `Quantity: ${item?.amount ?? 0}`, { ...ui.label, color: '#e1c16b' }).setDepth(223);
    this.add.text(466, 314, item?.description || 'Nothing stored in this category.', { ...ui.small, wordWrap: { width: 332 }, lineSpacing: 4 }).setDepth(223);
  }

  getJournalCategories() {
    const discovered = new Set(this.state.discoveredStatusEffects || []);
    const statusEntries = Object.entries(statuses)
      .filter(([name]) => discovered.has(name))
      .map(([name, def]) => ({ title: name, body: def.note }));
    return [
      { label: 'Voyage', entries: [
        { title: 'Current Objective', body: this.state.tutorial?.active ? 'Complete the guided route, rebuild the drydock, then sail freely.' : 'Sail from Haven, choose battle markers, bring salvage home, and rebuild.' },
        { title: 'Haven', body: 'Haven begins empty. Build projects with materials recovered from battles.' },
        { title: 'Tidebreak', body: `Ship support: ${this.state.shipSupport}. Crew identity: ${this.state.momentumIdentity}.` },
      ] },
      { label: 'Combat', entries: [
        { title: 'Field Intel', body: 'Inspect units, objectives, and terrain to read HP, intent, status, cover, movement cost, visibility, and hazards.' },
        { title: 'Enemy Intent', body: 'Only heavy boss-style attacks telegraph red danger tiles, and only while the enemy turn is resolving.' },
        { title: 'Stances', body: 'Boarding pressures close targets, Marksman controls sightlines, Raider flanks, Brace defends, and Command supports momentum.' },
        { title: 'Surge', body: 'At full momentum, Surge increases damage and stagger for a short burst.' },
      ] },
      { label: 'Crew', entries: normalizeCrew(this.state.crew).map((member) => ({ title: member.name, body: `${member.role}. Stance: ${member.stance}. Weapon: ${crewWeaponCatalog[member.weapon]?.name}. Level ${member.level}. ${member.specialty}` })) },
      { label: 'Status', entries: statusEntries.length ? statusEntries : [{ title: 'No Status Effects Logged', body: 'Status entries appear here only after the crew encounters them in battle.' }] },
      { label: 'Enemies', entries: Object.values(battleEncounters).flatMap((encounter) => encounter.enemies || []).slice(0, 18).map((enemy) => ({ title: enemy.name, body: `${enemy.role || 'Hostile'}. Intent: ${enemy.intent}. Weakness: ${enemy.weakness}` })) },
    ];
  }

  drawJournalMenu() {
    if (!this.journalMenuOpen) return;
    const categories = this.getJournalCategories();
    const category = categories[this.journalCategoryIndex];
    const entries = category.entries;
    const entry = entries[this.journalEntryIndex] || entries[0];
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.58).setDepth(220).setInteractive();
    drawPanel(this, 58, 54, 844, 608, 0.98).setDepth(221);
    this.add.text(88, 78, 'Captain\'s Journal', { ...ui.title, fontSize: '32px' }).setDepth(222);
    this.add.text(88, 116, 'A/D changes section. W/S selects entry. Esc closes.', { ...ui.small, color: '#d9c58e' }).setDepth(222);
    categories.forEach((cat, index) => {
      const x = 88 + index * 148;
      const selected = index === this.journalCategoryIndex;
      this.add.rectangle(x, 154, 130, 30, selected ? colors.brass : colors.charcoal, selected ? 0.94 : 0.7).setOrigin(0).setStrokeStyle(1, colors.brass, selected ? 0.85 : 0.28).setDepth(222);
      this.add.text(x + 65, 162, cat.label, { ...ui.small, color: selected ? '#17100c' : '#f3e5c4', fontSize: '10px' }).setOrigin(0.5, 0).setDepth(223);
    });
    drawPanel(this, 88, 208, 292, 382, 0.72).setDepth(222);
    entries.forEach((journalEntry, index) => {
      const y = 230 + index * 38;
      const selected = index === this.journalEntryIndex;
      if (y > 554) return;
      this.add.rectangle(108, y, 250, 30, selected ? colors.wood : colors.charcoal, selected ? 0.82 : 0.52).setOrigin(0).setStrokeStyle(1, selected ? colors.brass : colors.wood, selected ? 0.72 : 0.25).setDepth(223);
      this.add.text(120, y + 7, journalEntry.title, { ...ui.small, color: '#f3e5c4', wordWrap: { width: 224 } }).setDepth(224);
    });
    drawPanel(this, 420, 208, 422, 382, 0.72).setDepth(222);
    this.add.text(448, 238, entry?.title || 'No Entry', { ...ui.h2, fontSize: '25px', wordWrap: { width: 350 } }).setDepth(223);
    this.add.text(448, 294, entry?.body || 'Nothing recorded.', { ...ui.small, wordWrap: { width: 342 }, lineSpacing: 5 }).setDepth(223);
  }

  drawPartyResourceStrip() {
    const r = this.state.resources;
    const stats = [
      ['Coin', r.coin, colors.brass],
      ['Lumber', r.lumber, colors.wood],
      ['Scrap', r.scrap, colors.smoke],
      ['Powder', r.blackPowder, colors.ember],
      ['Supplies', r.supplies, colors.teal],
      ['Rep', r.reputation, colors.crimson],
    ];
    stats.forEach(([label, value, tone], index) => {
      const x = 404 + index * 82;
      this.add.rectangle(x, 60, 70, 34, colors.charcoal, 0.64).setOrigin(0).setStrokeStyle(1, tone, 0.54).setDepth(222);
      this.add.text(x + 8, 65, label, { ...ui.small, fontSize: '8px', color: '#d9c58e' }).setDepth(223);
      this.add.text(x + 8, 78, `${value}`, { ...ui.label, fontSize: '13px' }).setDepth(223);
    });
  }

  drawCrewOverviewMenu(crew) {
    crew.forEach((member, index) => this.drawCrewCard(member, index));
    drawPanel(this, 624, 156, 254, 396, 0.78).setDepth(222);
    this.add.text(646, 178, 'Hold Identity', ui.h2).setDepth(223);
    this.add.text(646, 214, computeIdentity(crew, this.state.shipSupport), { ...ui.label, color: '#e1c16b', wordWrap: { width: 210 } }).setDepth(223);
    this.add.text(646, 252, 'A crew-wide identity comes from stance spread and ship support. Use detail menus to tune weapons, kit, and roles before sailing.', {
      ...ui.small,
      wordWrap: { width: 206 },
      lineSpacing: 4,
    }).setDepth(223);
    this.add.text(646, 348, 'Inventory', ui.label).setDepth(223);
    const inv = this.state.inventory;
    this.add.text(646, 374, `${inv.weapons?.length || 0} weapons aboard`, ui.small).setDepth(223);
    this.add.text(646, 394, `${inv.equipment?.length || 0} kit pieces aboard`, ui.small).setDepth(223);
    this.add.text(646, 414, `${inv.rations} rations / ${inv.repairKits} repair kits / ${inv.medicine} medicine`, { ...ui.small, wordWrap: { width: 200 } }).setDepth(223);
  }

  drawCrewCard(member, index) {
    const x = 62 + index * 182;
    const y = 154;
    const weapon = crewWeaponCatalog[member.weapon];
    const tone = stanceSpriteDetails[member.stance]?.accent || colors.brass;
    drawPanel(this, x, y, 160, 396, 0.82).setDepth(222);
    this.add.rectangle(x + 12, y + 14, 136, 4, tone, 0.94).setOrigin(0).setDepth(223);
    this.add.text(x + 16, y + 30, member.name, { ...ui.h2, fontSize: '18px', wordWrap: { width: 124 } }).setDepth(223);
    this.add.text(x + 16, y + 58, `${member.role} L${member.level}`, { ...ui.small, color: '#e1c16b' }).setDepth(223);
    this.drawCrewPaperDoll(x + 80, y + 124, member, 0.9, 224);
    this.drawBuildNode(x + 16, y + 178, 'Weapon', weapon?.name || member.weapon, tone, 126);
    this.drawBuildNode(x + 16, y + 236, 'Stance', member.stance, tone, 126);
    this.drawBuildNode(x + 16, y + 294, 'Kit', (member.equipment || []).map((id) => crewEquipmentCatalog[id]?.name).filter(Boolean).slice(0, 2).join(' / ') || 'None', tone, 126);
    this.drawPartyButton(x + 18, y + 354, 124, 'View Build', () => this.setPartyView('detail', index), colors.brass);
  }

  drawBuildNode(x, y, label, value, tone, width = 126) {
    this.add.rectangle(x, y, width, 46, colors.charcoal, 0.6).setOrigin(0).setStrokeStyle(1, tone, 0.42).setDepth(223);
    this.add.text(x + 8, y + 6, label, { ...ui.small, fontSize: '8px', color: '#d9c58e' }).setDepth(224);
    this.add.text(x + 8, y + 20, value, { ...ui.small, fontSize: '10px', color: '#f3e5c4', wordWrap: { width: width - 16 } }).setDepth(224);
  }

  drawCrewDetailMenu(member) {
    const crew = normalizeCrew(this.state.crew);
    const tone = stanceSpriteDetails[member.stance]?.accent || colors.brass;
    drawPanel(this, 62, 140, 252, 476, 0.78).setDepth(222);
    this.add.text(84, 162, member.name, { ...ui.h2, fontSize: '26px' }).setDepth(223);
    this.add.text(84, 194, `${member.role} | Level ${member.level}`, { ...ui.label, color: '#e1c16b' }).setDepth(223);
    this.drawCrewPaperDoll(188, 285, member, 1.18, 224);
    this.add.text(84, 390, member.specialty, { ...ui.small, wordWrap: { width: 204 }, lineSpacing: 3 }).setDepth(223);
    this.add.text(84, 462, `XP ${member.xp}/${xpForNextLevel(member.level)}`, ui.small).setDepth(223);
    this.add.text(84, 486, `Skill: ${unlockedSkills(member).slice(-1)[0]?.name || 'None'}`, { ...ui.small, color: '#f3e5c4', wordWrap: { width: 200 } }).setDepth(223);

    drawPanel(this, 338, 140, 270, 476, 0.78).setDepth(222);
    this.add.text(360, 162, 'Build Core', ui.h2).setDepth(223);
    const weapon = crewWeaponCatalog[member.weapon];
    this.drawDetailRow(360, 202, 'Weapon', weapon?.name || 'None', weapon?.description || 'No weapon equipped.', () => this.openWeaponSwapMenu(member, 482, 220));
    this.drawDetailRow(360, 304, 'Stance', member.stance, stances[member.stance]?.role || 'Combat posture.', () => this.openStanceSwapMenu(member, 482, 322));
    this.drawDetailRow(360, 406, 'Ship Kit', member.equipment.map((id) => crewEquipmentCatalog[id]?.name).filter(Boolean).join(', ') || 'No kit equipped.', 'Kit pieces add HP, damage, momentum, or stagger bonuses.', () => this.openEquipmentSlotMenu(member, 482, 424));

    drawPanel(this, 632, 140, 246, 476, 0.78).setDepth(222);
    this.add.text(654, 162, 'Stats & Skills', ui.h2).setDepth(223);
    const rows = [
      `HP ${member.hp}/${member.maxHp}`,
      `Damage +${(crewWeaponCatalog[member.weapon]?.damage || 0) + equipmentBonus(member, 'closeDamage') + equipmentBonus(member, 'rangedDamage')}`,
      `Stagger +${(crewWeaponCatalog[member.weapon]?.stagger || 0) + equipmentBonus(member, 'stagger')}`,
      `Momentum kit +${equipmentBonus(member, 'momentum')}`,
      `Tags: ${equippedItems(member).flatMap((item) => item.tags || []).slice(0, 5).join(', ') || 'None'}`,
    ];
    rows.forEach((line, index) => this.add.text(654, 204 + index * 24, line, { ...ui.small, wordWrap: { width: 198 } }).setDepth(223));
    this.add.text(654, 348, 'Unlocked', ui.label).setDepth(223);
    unlockedSkills(member).forEach((skill, index) => {
      this.add.text(654, 374 + index * 34, `${skill.name}: ${skill.description}`, { ...ui.small, fontSize: '10px', wordWrap: { width: 198 } }).setDepth(223);
    });
    const previous = (this.selectedCrewIndex + crew.length - 1) % crew.length;
    const next = (this.selectedCrewIndex + 1) % crew.length;
    this.drawPartyButton(208, 638, 124, 'Party View', () => this.setPartyView('overview'), colors.teal);
    this.drawPartyButton(350, 638, 124, 'Prev Crew', () => this.setPartyView('detail', previous), colors.wood);
    this.drawPartyButton(492, 638, 124, 'Next Crew', () => this.setPartyView('detail', next), colors.wood);
  }

  drawDetailRow(x, y, label, value, description, onClick) {
    this.add.rectangle(x, y, 226, 82, colors.charcoal, 0.6).setOrigin(0).setStrokeStyle(1, colors.brass, 0.25).setDepth(223);
    this.add.text(x + 12, y + 8, label, { ...ui.small, color: '#e1c16b' }).setDepth(224);
    this.add.text(x + 12, y + 24, value, { ...ui.label, fontSize: '13px', wordWrap: { width: 142 } }).setDepth(224);
    this.add.text(x + 12, y + 46, description, { ...ui.small, fontSize: '10px', wordWrap: { width: 198 } }).setDepth(224);
    this.drawPartyButton(x + 166, y + 10, 48, 'Swap', onClick, colors.brass, 225);
  }

  drawCrewPaperDoll(x, y, member, scale = 1, depth = 10) {
    const c = this.add.container(x, y).setDepth(depth);
    const profile = spriteProfileFor(member);
    const stance = stanceSpriteDetails[member.stance] || stanceSpriteDetails.Command;
    c.add(this.add.ellipse(0, 28, 52, 12, colors.charcoal, 0.28));
    drawScallywagCharacter(this, c, member, profile, stance, true, { scale: 2.95, y: 28, front: true, aura: true });
    c.add(this.add.rectangle(0, 34, 42, 4, stance.accent, 0.96).setStrokeStyle(1, colors.charcoal, 0.7));
    c.setScale(scale);
  }

  drawPartyButton(x, y, width, label, onClick, tone = colors.wood, depth = 223) {
    const objects = button(this, x, y, width, label, () => {
      playUiSound(this);
      onClick();
    }, tone);
    objects.forEach((object) => object.setDepth?.(depth));
    return objects;
  }

  clearPartyFloatingUi() {
    this.partyFloatingUi?.forEach((object) => object.destroy?.());
    this.partyFloatingUi = [];
  }

  trackPartyFloating(objects) {
    objects.forEach((object) => {
      object.setDepth?.(240);
      this.partyFloatingUi.push(object);
    });
  }

  openPartyOptionMenu(x, y, title, options) {
    this.clearPartyFloatingUi();
    const width = 256;
    const rowHeight = 34;
    const height = 44 + options.length * rowHeight;
    const menuX = Phaser.Math.Clamp(x, 48, 912 - width);
    const menuY = Phaser.Math.Clamp(y, 90, 668 - height);
    const blocker = this.add.rectangle(0, 0, 960, 720, colors.charcoal, 0.26).setOrigin(0).setInteractive().setDepth(236);
    blocker.on('pointerdown', () => this.clearPartyFloatingUi());
    const panel = drawPanel(this, menuX, menuY, width, height, 0.99).setDepth(237);
    const heading = this.add.text(menuX + 14, menuY + 14, title, { ...ui.label, color: '#e1c16b' }).setDepth(241);
    this.trackPartyFloating([blocker, panel, heading]);
    options.forEach((option, index) => {
      const rowY = menuY + 38 + index * rowHeight;
      const row = this.add.rectangle(menuX + 10, rowY, width - 20, 28, option.current ? colors.brass : colors.charcoal, option.current ? 0.92 : 0.78)
        .setOrigin(0)
        .setStrokeStyle(1, option.disabled ? colors.crimson : colors.brass, option.disabled ? 0.55 : 0.26)
        .setInteractive({ useHandCursor: true })
        .setDepth(240);
      const label = this.add.text(menuX + 20, rowY + 7, option.label, { ...ui.small, color: option.current ? '#17100c' : '#f3e5c4', wordWrap: { width: 160 } }).setDepth(241);
      const note = option.note ? this.add.text(menuX + width - 20, rowY + 8, option.note, { ...ui.small, fontSize: '8px', color: option.disabled ? '#ffb49e' : '#d9c58e' }).setOrigin(1, 0).setDepth(241) : null;
      row.on('pointerdown', () => {
        if (option.disabled) return;
        this.clearPartyFloatingUi();
        option.action();
      });
      this.trackPartyFloating([row, label, ...(note ? [note] : [])]);
    });
  }

  openWeaponSwapMenu(member, x, y) {
    const inventory = this.state.inventory.weapons || [];
    const allowedIds = allowedWeaponIdsFor(member);
    const options = inventory.filter((id) => allowedIds.includes(id)).map((id) => {
      const weapon = crewWeaponCatalog[id];
      return {
        label: weapon?.name || id,
        note: `+${weapon.damage} dmg R${weapon.range}`,
        current: member.weapon === id,
        disabled: false,
        action: () => {
          member.weapon = id;
          this.saveCrewMember(member);
          this.draw();
        },
      };
    });
    this.openPartyOptionMenu(x, y, 'Choose Weapon', options.length ? options : [{
      label: 'No valid weapons',
      note: 'Type locked',
      current: false,
      disabled: true,
      action: () => {},
    }]);
  }

  openStanceSwapMenu(member, x, y) {
    this.openPartyOptionMenu(x, y, 'Choose Stance', Object.keys(stances).map((stance) => ({
      label: stance,
      note: stance === member.stance ? 'Current' : '',
      current: member.stance === stance,
      action: () => {
        member.stance = stance;
        this.saveCrewMember(member);
        this.state.momentumIdentity = computeIdentity(normalizeCrew(this.state.crew), this.state.shipSupport);
        this.draw();
      },
    })));
  }

  openEquipmentSlotMenu(member, x, y) {
    const slots = ['kit', 'trinket', 'armor'];
    this.openPartyOptionMenu(x, y, 'Choose Slot', slots.map((slot) => ({
      label: slot[0].toUpperCase() + slot.slice(1),
      note: member.equipment.map((id) => crewEquipmentCatalog[id]).find((item) => item?.slot === slot)?.name || 'Empty',
      action: () => this.openEquipmentSwapMenu(member, slot, x + 34, y + 34),
    })));
  }

  openEquipmentSwapMenu(member, slot, x, y) {
    const inventory = this.state.inventory.equipment || [];
    const options = [
      {
        label: 'Empty slot',
        current: !member.equipment.some((id) => crewEquipmentCatalog[id]?.slot === slot),
        action: () => {
          member.equipment = member.equipment.filter((id) => crewEquipmentCatalog[id]?.slot !== slot);
          this.saveCrewMember(member);
          this.draw();
        },
      },
      ...inventory.filter((id) => crewEquipmentCatalog[id]?.slot === slot).map((id) => {
        const item = crewEquipmentCatalog[id];
        const allowed = item.crew.includes(member.id);
        return {
          label: item.name,
          note: allowed ? item.tags.join('/') : 'Wrong crew',
          current: member.equipment.includes(id),
          disabled: !allowed,
          action: () => {
            member.equipment = member.equipment.filter((current) => crewEquipmentCatalog[current]?.slot !== slot);
            member.equipment.push(id);
            this.saveCrewMember(member);
            this.draw();
          },
        };
      }),
    ];
    this.openPartyOptionMenu(x, y, `${slot[0].toUpperCase()}${slot.slice(1)} Kit`, options);
  }

  saveCrewMember(member) {
    const normalized = normalizeCrewMember(member, this.selectedCrewIndex);
    this.state.crew = normalizeCrew(this.state.crew).map((crewMember) => (crewMember.id === normalized.id ? normalized : crewMember));
    saveAutoGame(this.state);
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

  drawHavenProjectSprite(x, y, project, built) {
    const g = this.add.graphics();
    g.fillStyle(colors.woodDark, built ? 0.58 : 0.42);
    g.fillEllipse(x + 6, y + 36, built ? 104 : 92, built ? 30 : 22);
    if (!built) {
      this.drawUnbuiltProjectSprite(x, y, project);
      return;
    }
    const drawHouse = (roof, body = colors.wood, width = 82, height = 58) => {
      g.fillStyle(body, 0.98);
      g.fillRoundedRect(x - width / 2, y - 20, width, height, 4);
      g.fillStyle(roof, 0.94);
      g.fillTriangle(x - width / 2 - 7, y - 20, x, y - 62, x + width / 2 + 7, y - 20);
      g.lineStyle(2, colors.charcoal, 0.95);
      g.strokeRoundedRect(x - width / 2, y - 20, width, height, 4);
      g.strokeTriangle(x - width / 2 - 7, y - 20, x, y - 62, x + width / 2 + 7, y - 20);
    };
    if (project === 'drydock') {
      g.fillStyle(colors.woodDark, 0.96);
      g.fillRoundedRect(x - 58, y - 20, 116, 62, 5);
      g.fillStyle(0x092d41, 0.8);
      g.fillRoundedRect(x - 38, y - 10, 76, 34, 4);
      g.lineStyle(4, colors.wood, 0.96);
      g.lineBetween(x - 54, y + 35, x - 18, y - 14);
      g.lineBetween(x + 54, y + 35, x + 18, y - 14);
      g.lineStyle(3, colors.brass, 0.62);
      g.lineBetween(x - 40, y - 2, x + 40, y - 2);
      g.lineBetween(x - 48, y + 17, x + 48, y + 17);
      this.add.rectangle(x, y + 28, 66, 10, colors.wood, 0.9).setStrokeStyle(1, colors.charcoal, 0.6);
      this.add.text(x, y - 4, 'DRY', { ...ui.small, fontSize: '9px', color: '#d8fff4' }).setOrigin(0.5);
      return;
    }
    if (project === 'forge') {
      drawHouse(colors.ember, 0x4a3325, 80, 58);
      this.add.rectangle(x + 24, y - 56, 18, 44, 0x2b1a13, 0.98).setStrokeStyle(2, colors.charcoal);
      this.add.circle(x + 24, y - 64, 9, colors.smoke, 0.3);
      this.add.rectangle(x, y + 10, 34, 20, 0x20130e, 0.96).setStrokeStyle(2, colors.ember);
      this.add.circle(x, y + 10, 8, colors.ember, 0.85);
      this.add.line(x - 31, y + 2, 0, 0, 24, -18, 0xb9c4cf, 0.9).setLineWidth(4);
      return;
    }
    if (project === 'tavern') {
      drawHouse(colors.brass, 0x6a432b, 88, 60);
      this.add.rectangle(x - 18, y + 10, 20, 28, colors.woodDark, 0.96).setStrokeStyle(1, colors.charcoal);
      this.add.rectangle(x + 21, y - 1, 25, 18, colors.parchment, 0.84).setStrokeStyle(2, colors.woodDark);
      this.add.circle(x + 46, y - 28, 12, colors.brassLight, 0.92).setStrokeStyle(2, colors.woodDark);
      this.add.text(x + 46, y - 34, 'MUG', { ...ui.small, fontSize: '7px', color: '#17100c' }).setOrigin(0.5, 0);
      return;
    }
    if (project === 'training') {
      g.fillStyle(0x85683c, 0.94);
      g.fillRoundedRect(x - 52, y - 25, 104, 68, 6);
      g.lineStyle(3, colors.woodDark, 0.95);
      g.strokeRoundedRect(x - 52, y - 25, 104, 68, 6);
      g.lineStyle(5, colors.wood, 0.95);
      g.lineBetween(x - 40, y + 28, x - 12, y - 6);
      g.lineBetween(x + 40, y + 28, x + 12, y - 6);
      g.lineStyle(3, colors.brassLight, 0.82);
      g.lineBetween(x - 30, y - 6, x + 30, y - 6);
      this.add.rectangle(x, y + 20, 54, 10, colors.green, 0.58).setStrokeStyle(1, colors.charcoal);
      return;
    }
    if (project === 'infirmary') {
      drawHouse(colors.parchment, 0x7f7958, 82, 58);
      this.add.rectangle(x, y + 4, 52, 28, 0xf3e5c4, 0.92).setStrokeStyle(2, colors.woodDark);
      this.add.rectangle(x, y + 4, 10, 30, colors.crimson, 0.9);
      this.add.rectangle(x, y + 4, 34, 8, colors.crimson, 0.9);
      this.add.circle(x - 32, y - 26, 9, colors.teal, 0.72).setStrokeStyle(1, colors.charcoal);
      return;
    }
    if (project === 'watchtower') {
      g.lineStyle(6, colors.woodDark, 0.98);
      g.lineBetween(x - 32, y + 40, x - 18, y - 42);
      g.lineBetween(x + 32, y + 40, x + 18, y - 42);
      g.lineBetween(x - 34, y + 16, x + 34, y + 16);
      g.lineBetween(x - 27, y - 16, x + 27, y - 16);
      g.fillStyle(0x4e5962, 0.96);
      g.fillRoundedRect(x - 36, y - 64, 72, 34, 4);
      g.fillStyle(colors.smoke, 0.94);
      g.fillTriangle(x - 43, y - 64, x, y - 92, x + 43, y - 64);
      g.lineStyle(2, colors.charcoal, 0.95);
      g.strokeRoundedRect(x - 36, y - 64, 72, 34, 4);
      this.add.circle(x, y - 47, 7, colors.brassLight, 0.86).setStrokeStyle(1, colors.charcoal);
    }
  }

  drawUnbuiltProjectSprite(x, y, project) {
    const g = this.add.graphics();
    const foundation = (w = 92, h = 52, tint = colors.woodDark) => {
      g.fillStyle(tint, 0.58);
      g.fillRoundedRect(x - w / 2, y - 22, w, h, 5);
      g.lineStyle(2, colors.brass, 0.28);
      g.strokeRoundedRect(x - w / 2, y - 22, w, h, 5);
    };
    foundation(92, 50, colors.woodDark);
    if (project === 'drydock') {
      g.fillStyle(0x092d41, 0.72);
      g.fillRoundedRect(x - 32, y - 12, 64, 27, 4);
      g.lineStyle(4, colors.wood, 0.78);
      g.lineBetween(x - 48, y + 26, x - 15, y - 16);
      g.lineBetween(x + 48, y + 26, x + 15, y - 16);
      this.add.circle(x + 37, y - 18, 5, colors.smoke, 0.7);
    } else if (project === 'forge') {
      this.add.rectangle(x - 4, y + 8, 42, 22, 0x2b1a13, 0.72).setStrokeStyle(2, colors.ember, 0.35);
      this.add.rectangle(x + 28, y - 22, 15, 30, colors.woodDark, 0.72).setStrokeStyle(1, colors.charcoal);
      this.add.circle(x - 4, y + 8, 6, colors.ember, 0.42);
    } else if (project === 'tavern') {
      this.add.rectangle(x - 18, y + 5, 22, 25, colors.woodDark, 0.76).setStrokeStyle(1, colors.charcoal);
      this.add.circle(x + 30, y - 16, 10, colors.brass, 0.45).setStrokeStyle(2, colors.woodDark);
      this.add.line(x + 30, y - 6, 0, 0, 0, 22, colors.woodDark, 0.8).setLineWidth(3);
    } else if (project === 'training') {
      g.lineStyle(4, colors.wood, 0.82);
      g.lineBetween(x - 38, y + 20, x - 10, y - 14);
      g.lineBetween(x + 38, y + 20, x + 10, y - 14);
      g.lineBetween(x - 28, y - 10, x + 28, y - 10);
      this.add.circle(x, y + 14, 9, colors.green, 0.34).setStrokeStyle(1, colors.charcoal);
    } else if (project === 'infirmary') {
      this.add.rectangle(x, y + 5, 44, 22, colors.parchment, 0.54).setStrokeStyle(2, colors.woodDark);
      this.add.rectangle(x, y + 5, 8, 24, colors.crimson, 0.58);
      this.add.rectangle(x, y + 5, 28, 7, colors.crimson, 0.58);
      this.add.circle(x - 32, y - 13, 6, colors.teal, 0.38);
    } else if (project === 'watchtower') {
      g.lineStyle(5, colors.woodDark, 0.76);
      g.lineBetween(x - 30, y + 24, x - 16, y - 30);
      g.lineBetween(x + 30, y + 24, x + 16, y - 30);
      g.lineBetween(x - 25, y - 5, x + 25, y - 5);
      this.add.rectangle(x, y - 34, 56, 18, colors.smoke, 0.48).setStrokeStyle(1, colors.charcoal);
    }
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

  drawTutorialChoicePrompt() {
    if (!this.state.pendingTutorialPrompt) return;
    const confirmingSkip = this.state.pendingTutorialPrompt === 'skip-confirm';
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.42).setDepth(210).setInteractive();
    drawPanel(this, 276, 228, 408, confirmingSkip ? 184 : 202, 0.98).setDepth(211);
    this.add.text(306, 254, confirmingSkip ? 'Skip Tutorial?' : 'Play Tutorial?', { ...ui.h2, fontSize: '25px' }).setDepth(212);
    this.add.text(306, 292, confirmingSkip
      ? 'Are you sure? The tutorial explains Haven movement, sailing, Field Intel, targeting, stances, enemy intent, skills, and surge.'
      : 'Start with a guided haven walkthrough, then sail into a scripted boarding battle before the full run opens.',
    {
      ...ui.small,
      color: '#f3e5c4',
      wordWrap: { width: 340 },
      lineSpacing: 4,
    }).setDepth(212);
    const actions = confirmingSkip
      ? [
        { label: 'Yes', onClick: () => this.skipTutorialFromHaven(), tone: colors.brass },
        { label: 'No', onClick: () => this.returnToTutorialChoice(), tone: colors.teal },
      ]
      : [
        { label: 'Yes', onClick: () => this.startTutorialFromHaven(), tone: colors.brass },
        { label: 'No', onClick: () => this.openSkipTutorialConfirm(), tone: colors.teal },
      ];
    const startX = confirmingSkip ? 336 : 336;
    actions.forEach((action, index) => {
      button(this, startX + index * 174, confirmingSkip ? 356 : 374, 112, action.label, action.onClick, action.tone)
        .forEach((object) => object.setDepth?.(213));
    });
  }

  startTutorialFromHaven() {
    this.state.pendingTutorialPrompt = false;
    this.state.navigationMessage = 'Tutorial voyage: sail to the Navy Patrol marker.';
    setTutorialStep(this.state, 'haven');
    saveAutoGame(this.state);
    this.draw();
  }

  openSkipTutorialConfirm() {
    this.state.pendingTutorialPrompt = 'skip-confirm';
    this.draw();
  }

  returnToTutorialChoice() {
    this.state.pendingTutorialPrompt = true;
    this.draw();
  }

  skipTutorialFromHaven() {
    this.state.pendingTutorialPrompt = false;
    completeTutorial(this.state);
    saveAutoGame(this.state);
    this.draw();
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

  drawTutorial() {
    if (!isTutorialActive(this.state)) return;
    if (this.state.tutorial.step === 'rebuildDrydock') {
      const lot = this.getHavenLots().find((item) => item.project === 'drydock');
      if (lot) {
        const p = this.gridToHavenWorld(lot.grid);
        drawTutorialPulse(this, p.x, p.y, 38, 'Rebuild');
      } else {
        const villageExit = this.currentHavenMap().exits.find((exit) => exit.target === 'village');
        if (villageExit) {
          const p = this.gridToHavenWorld(villageExit.grid);
          drawTutorialPulse(this, p.x, p.y, 38, 'Haven Center');
        }
      }
      drawTutorialPanel(
        this,
        'Tutorial: Rebuild',
        this.zoneId === 'village'
          ? 'The boarding drill brought back enough lumber, scrap, and coin to rebuild the drydock. Walk to the drydock lot and press E or Space to build it. The tutorial ends when the drydock is restored.'
          : 'The boarding drill brought back enough lumber, scrap, and coin to rebuild the drydock. Walk west into the Haven Center, then build the drydock lot. The tutorial ends when the drydock is restored.',
        [
          { label: 'Skip', onClick: () => this.finishTutorial(), tone: colors.teal },
        ],
      );
      return;
    }
    if (this.state.tutorial.step !== 'haven') return;
    const shipExit = this.currentHavenMap().exits.find((exit) => exit.type === 'sail');
    if (shipExit) {
      const p = this.gridToHavenWorld(shipExit.grid);
      drawTutorialPulse(this, p.x, p.y, 38, 'Board here');
    }
    drawTutorialPanel(
      this,
      'Tutorial: Haven',
      'This is your base. Move with WASD, then walk to the ship marker on the dock and press E or Space to sail. The bottom prompt changes when you are close enough.',
      [
        { label: 'Skip', onClick: () => this.finishTutorial(), tone: colors.teal },
      ],
    );
  }

  finishTutorial() {
    completeTutorial(this.state);
    saveAutoGame(this.state);
    this.draw();
  }
}

class NavigationScene extends Phaser.Scene {
  constructor() {
    super('NavigationScene');
  }

  create() {
    this.state = setSceneCheckpoint(this, 'Navigation');
    installPauseMenu(this, { sceneLabel: 'Navigation', bindEsc: false });
    this.ship = { x: 160, y: 500, angle: -20, speed: 0 };
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-ONE', () => this.engageNearbyEncounter());
    this.input.keyboard.on('keydown-NUMPAD_ONE', () => this.engageNearbyEncounter());
    this.input.keyboard.on('keydown-Y', () => {
      if (this.havenPromptOpen) this.returnToHaven();
    });
    this.input.keyboard.on('keydown-N', () => {
      if (this.havenPromptOpen) this.closeHavenPrompt();
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.havenPromptOpen) this.closeHavenPrompt();
      else handlePauseEscape(this);
    });
    this.events = [
      { x: 640, y: 184, label: 'Navy Patrol', battleId: 'navyPatrol', note: 'Shipping-lane marines guarding a signal chest', type: 'navy' },
      { x: 735, y: 338, label: 'Burning Wreck', battleId: 'wreckRaiders', note: 'Raiders stripping cargo under fire', type: 'fire' },
      { x: 506, y: 290, label: 'Storm Bank', battleId: 'stormCorsairs', note: 'Corsairs hidden in heavy weather', type: 'storm' },
      { x: 322, y: 446, label: 'Smuggler\'s Hollow', battleId: 'smugglersHollow', note: 'General pirates guarding contraband', type: 'pirate' },
      { x: 270, y: 552, label: 'Boarback Island', battleId: 'boarbackIsland', note: 'Wildlife overruns the shore camp', type: 'wildlife' },
      { x: 446, y: 548, label: 'Mangrove Isle', battleId: 'mangroveIsle', note: 'Predators wait in the flooded roots', type: 'wildlife' },
      { x: 606, y: 538, label: 'Crab Cay', battleId: 'crabCay', note: 'Tidal beasts block the flats', type: 'wildlife' },
      { x: 836, y: 248, label: 'Pirate Stronghold', battleId: 'pirateStronghold', note: 'Elite pirates defend boss plunder', type: 'elite' },
      { x: 372, y: 174, label: 'Tidejaw Waters', battleId: 'tidejawEvent', note: 'A legendary shark circles deep water', type: 'legend' },
      { x: 708, y: 560, label: 'Stormwing Cliffs', battleId: 'stormwingEvent', note: 'A giant seabird rules the cliffs', type: 'legend' },
      { x: 482, y: 420, label: 'Ironshell Reef', battleId: 'ironshellEvent', note: 'A living reef drifts through the sea', type: 'legend' },
    ];
    if (isTutorialActive(this.state) && this.state.tutorial.step === 'navigation') {
      this.ship = { x: 540, y: 214, angle: -16, speed: 0 };
    }
    this.haven = { x: 208, y: 240, radius: 56 };
    this.message = this.state.navigationMessage;
    this.havenPromptOpen = false;
    this.havenPromptCooldown = false;
    this.promptObjects = [];
    this.drawStatic();
  }

  update(time) {
    if (this.pauseMenuOpen) return;
    if (this.havenPromptOpen) {
      this.ship.speed = 0;
      this.animateOpenSea(time);
      return;
    }
    if (this.keys.A.isDown) this.ship.angle -= 1.55;
    if (this.keys.D.isDown) this.ship.angle += 1.55;
    if (this.keys.W.isDown) this.ship.speed = Math.min(1.65, this.ship.speed + 0.034);
    else if (this.keys.S.isDown) this.ship.speed = Math.max(0, this.ship.speed - 0.052);
    else this.ship.speed *= 0.978;
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
    const nearHaven = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, this.haven.x, this.haven.y) < this.haven.radius;
    if (!nearHaven) this.havenPromptCooldown = false;
    this.interactText.setText(near ? `Near ${near.label}: press 1 to engage. ${near.note}.` : nearHaven ? 'Haven waters reached.' : 'WASD steers. Approach a battle marker, then press 1.');
    this.nearEvent = near;
    if (nearHaven && !this.havenPromptCooldown) this.openHavenPrompt();
  }

  drawStatic() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(0x0d3448);
    this.ensureNavigationShipTexture();
    this.drawOpenSeaWater();
    drawPanel(this, 32, 24, 896, 72, 0.9);
    this.add.text(58, 42, 'Navigation', ui.title);
    this.add.text(340, 50, this.message, ui.label);
    this.drawIsland(208, 240, 'Haven', 1, 'haven');
    this.drawIsland(830, 180, 'Fort', 1, 'fort');
    this.drawIsland(800, 552, 'Port', 0.92, 'port');
    this.drawIsland(320, 404, 'Hollow', 0.74, 'hollow');
    this.drawIsland(270, 560, 'Boarback', 0.68, 'boarback');
    this.drawIsland(446, 558, 'Mangrove', 0.68, 'mangrove');
    this.drawIsland(604, 560, 'Crab Cay', 0.64, 'crab');
    this.drawIsland(700, 552, 'Cliffs', 0.58, 'cliffs');
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
    this.add.text(760, 634, '1 Engage', { ...ui.label, color: '#e1c16b' }).setOrigin(0.5, 0);
    this.drawTutorial();
  }

  engageNearbyEncounter() {
    if (this.pauseMenuOpen) return;
    if (this.havenPromptOpen) return;
    if (!this.nearEvent) {
      this.message = 'No battle in boarding range. Sail closer to a visible marker.';
      this.state.navigationMessage = this.message;
      this.drawStatic();
      return;
    }
    this.state.pendingBattle = this.nearEvent.battleId;
    this.state.activeBattleLayout = null;
    this.state.navigationMessage = `Engaging ${this.nearEvent.label}.`;
    if (isTutorialActive(this.state)) setTutorialStep(this.state, 'battlePrep');
    saveAutoGame(this.state);
    this.scene.start('BattleScene');
  }

  openHavenPrompt() {
    if (this.havenPromptOpen) return;
    this.havenPromptOpen = true;
    this.ship.speed = 0;
    this.promptObjects.forEach((object) => object.destroy());
    this.promptObjects = [];
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, colors.charcoal, 0.42).setDepth(200).setInteractive();
    drawPanel(this, 306, 246, 348, 192, 0.98).setDepth(201);
    this.add.text(336, 272, 'Return to Haven?', { ...ui.h2, fontSize: '25px' }).setDepth(202);
    this.add.text(336, 310, 'Drop anchor and return to the haven docks?', {
      ...ui.small,
      color: '#f3e5c4',
      wordWrap: { width: 286 },
    }).setDepth(202);
    button(this, 336, 366, 112, 'Yes', () => this.returnToHaven(), colors.brass).forEach((object) => object.setDepth?.(203));
    button(this, 512, 366, 112, 'No', () => this.closeHavenPrompt(), colors.teal).forEach((object) => object.setDepth?.(203));
    this.add.text(480, 414, 'Y confirms. N or Esc keeps sailing.', { ...ui.small, color: '#d9c58e' }).setOrigin(0.5).setDepth(202);
    this.promptObjects = this.children.list.filter((object) => !existing.has(object));
  }

  closeHavenPrompt() {
    this.promptObjects.forEach((object) => object.destroy());
    this.promptObjects = [];
    this.havenPromptOpen = false;
    this.havenPromptCooldown = true;
    const away = Phaser.Math.DegToRad(this.ship.angle + 180);
    this.ship.x += Math.cos(away) * 64;
    this.ship.y += Math.sin(away) * 64;
    this.ship.x = Phaser.Math.Clamp(this.ship.x, 70, 890);
    this.ship.y = Phaser.Math.Clamp(this.ship.y, 118, 640);
    this.shipIcon.setPosition(this.ship.x, this.ship.y);
    this.wake.setPosition(this.ship.x, this.ship.y);
  }

  returnToHaven() {
    this.state.navigationMessage = 'Returned to the haven docks.';
    this.state.pendingBattle = null;
    saveAutoGame(this.state);
    this.scene.start('HavenScene');
  }

  ensureNavigationShipTexture() {
    ensureTopDownShipTexture(this, 'navigation-ship-sprite');
  }

  drawIsland(x, y, label, scale = 1, variant = 'generic') {
    const g = this.add.graphics();
    const sx = (v) => x + v * scale;
    const sy = (v) => y + v * scale;
    const ellipse = (ox, oy, w, h, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillEllipse(sx(ox), sy(oy), w * scale, h * scale);
    };
    const circle = (ox, oy, radius, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillCircle(sx(ox), sy(oy), radius * scale);
    };
    const rect = (ox, oy, w, h, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillRoundedRect(sx(ox), sy(oy), w * scale, h * scale, Math.max(2, 4 * scale));
    };
    const tri = (x1, y1, x2, y2, x3, y3, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      g.fillTriangle(sx(x1), sy(y1), sx(x2), sy(y2), sx(x3), sy(y3));
    };
    const line = (x1, y1, x2, y2, color, alpha = 1, width = 2) => {
      g.lineStyle(width * scale, color, alpha);
      g.lineBetween(sx(x1), sy(y1), sx(x2), sy(y2));
    };

    ellipse(0, 4, 126, 64, colors.bone, 0.18);
    if (variant === 'fort') {
      ellipse(0, 2, 120, 56, 0x6f684d, 1);
      ellipse(-7, -2, 92, 42, 0x9a7a48, 0.95);
      rect(-36, -20, 72, 32, 0x5d4a39, 0.96);
      rect(-47, -23, 16, 24, 0x4a3a2b, 1);
      rect(31, -23, 16, 24, 0x4a3a2b, 1);
      rect(-10, -31, 20, 18, 0x4a3a2b, 1);
      line(-47, 12, 47, 12, colors.brassLight, 0.45, 2);
      circle(-23, -9, 3, colors.brassLight, 0.8);
      circle(23, -9, 3, colors.brassLight, 0.8);
    } else if (variant === 'port') {
      ellipse(0, 2, 118, 54, 0xa9814d, 1);
      ellipse(-18, -7, 62, 25, 0x315f43, 0.82);
      rect(-44, -9, 34, 22, 0x6a432b, 1);
      rect(2, -18, 31, 24, 0x7a5638, 1);
      tri(-48, -9, -27, -26, -6, -9, colors.crimson, 0.8);
      tri(-1, -18, 18, -34, 37, -18, colors.brass, 0.9);
      line(14, 18, 58, 42, colors.woodDark, 0.9, 4);
      line(29, 16, 70, 32, colors.woodDark, 0.75, 3);
      circle(55, 35, 3, colors.brassLight, 0.75);
    } else if (variant === 'hollow') {
      ellipse(-4, 2, 116, 52, 0x7d6240, 1);
      ellipse(8, -3, 84, 34, 0x234230, 0.92);
      ellipse(-21, 0, 42, 28, 0x18100c, 0.86);
      ellipse(-25, 4, 27, 15, 0x07131a, 0.92);
      line(-44, 16, 13, 5, colors.bone, 0.34, 2);
      rect(16, -12, 18, 18, colors.woodDark, 0.82);
      circle(25, -16, 3, colors.ember, 0.85);
    } else if (variant === 'boarback') {
      ellipse(0, 4, 118, 55, 0xb89357, 1);
      ellipse(-2, -4, 88, 38, 0x5b4a3b, 0.95);
      ellipse(-24, -5, 39, 22, 0x315f43, 0.85);
      ellipse(20, -1, 34, 21, 0x6b4a2f, 0.9);
      tri(40, -4, 61, -14, 50, 1, colors.bone, 0.92);
      tri(40, 6, 62, 15, 49, 1, colors.bone, 0.9);
      circle(31, -8, 2.5, colors.charcoal, 0.85);
      line(-33, -24, -15, -14, 0x1f4a32, 0.88, 4);
      line(-15, -14, -4, -23, 0x1f4a32, 0.76, 3);
    } else if (variant === 'mangrove') {
      ellipse(0, 3, 118, 58, 0x2f6d66, 0.96);
      ellipse(-8, -3, 88, 42, 0x234230, 0.94);
      ellipse(26, 3, 43, 30, 0x317f88, 0.62);
      [-32, -14, 5, 24].forEach((rx, index) => {
        line(rx, -17, rx + (index % 2 ? 11 : -9), 17, colors.woodDark, 0.86, 4);
        circle(rx, -21, 12, index % 2 ? 0x2f8f54 : 0x1f7a45, 0.78);
      });
      line(-44, 22, 39, 18, 0xd8fff4, 0.18, 2);
    } else if (variant === 'crab') {
      ellipse(0, 2, 112, 50, 0xc4935c, 1);
      ellipse(17, 7, 48, 18, 0x317f88, 0.48);
      ellipse(-15, -4, 43, 28, 0x7d6240, 0.94);
      circle(-40, -5, 11, 0xb6843a, 0.95);
      circle(10, -6, 11, 0xb6843a, 0.95);
      line(-24, 8, -42, 20, colors.woodDark, 0.65, 3);
      line(-3, 8, 18, 20, colors.woodDark, 0.65, 3);
      circle(-19, -12, 2, colors.charcoal, 0.9);
      circle(-9, -12, 2, colors.charcoal, 0.9);
    } else if (variant === 'cliffs') {
      ellipse(0, 8, 110, 45, 0x6f684d, 0.94);
      tri(-50, 16, -28, -30, -3, 17, 0x5d5c57, 1);
      tri(-12, 18, 11, -42, 38, 17, 0x686760, 1);
      tri(23, 15, 49, -19, 60, 17, 0x4e5962, 0.96);
      ellipse(12, -33, 34, 12, 0x756044, 0.75);
      circle(15, -35, 4, colors.brassLight, 0.55);
      line(-8, -3, 29, 13, colors.bone, 0.2, 2);
    } else {
      ellipse(0, 0, 108, 52, 0x9a7a48, 1);
      ellipse(8, -8, 70, 32, 0x315f43, 1);
      ellipse(-14, -3, 42, 20, 0x1f4a32, 0.8);
    }
    g.lineStyle(2, colors.bone, 0.22);
    g.strokeEllipse(x, y + 3 * scale, 122 * scale, 60 * scale);
    const labelY = y > 530 ? y + 27 * scale : y + 35 * scale;
    this.add.text(x, labelY, label, { ...ui.small, color: '#f3e5c4', fontSize: scale < 0.75 ? '10px' : '12px' }).setOrigin(0.5);
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
    const tone = {
      navy: colors.crimson,
      fire: colors.ember,
      storm: colors.smoke,
      pirate: colors.wood,
      wildlife: colors.green,
      elite: colors.brass,
      legend: colors.teal,
    }[event.type] || colors.smoke;
    const marker = this.add.container(event.x, event.y).setDepth(5);
    marker.add(this.add.circle(0, 0, 20, colors.charcoal, 0.48));
    marker.add(this.add.circle(0, 0, 17, tone, 0.9).setStrokeStyle(2, colors.brass, 0.9));
    this.drawEncounterIcon(marker, event);
    this.tweens.add({ targets: marker, scale: 1.18, duration: 900, yoyo: true, repeat: -1 });
    const labelY = event.y > 500 ? event.y - 39 : event.y + 28;
    this.add.text(event.x, labelY, event.label, { ...ui.small, fontSize: '10px', color: '#f3e5c4', align: 'center', wordWrap: { width: 92 } }).setOrigin(0.5);
  }

  drawEncounterIcon(marker, event) {
    const track = (object) => {
      marker.add(object);
      return object;
    };
    const line = (x1, y1, x2, y2, color = colors.bone, alpha = 1, width = 2) => track(this.add.line(0, 0, x1, y1, x2, y2, color, alpha).setLineWidth(width));
    const circle = (x, y, r, color = colors.bone, alpha = 1) => track(this.add.circle(x, y, r, color, alpha));
    const rect = (x, y, w, h, color = colors.bone, alpha = 1) => track(this.add.rectangle(x, y, w, h, color, alpha));
    const tri = (x, y, x1, y1, x2, y2, x3, y3, color = colors.bone, alpha = 1) => track(this.add.triangle(x, y, x1, y1, x2, y2, x3, y3, color, alpha));
    if (event.battleId === 'navyPatrol') {
      rect(0, 1, 16, 17, colors.bone, 0.92).setStrokeStyle(1, colors.charcoal, 0.7);
      rect(0, -8, 20, 5, colors.brassLight, 0.95);
      line(-5, -2, 5, 8, colors.crimson, 0.9, 2);
      return;
    }
    if (event.battleId === 'wreckRaiders') {
      tri(-3, 2, -9, 11, 0, -13, 9, 11, colors.ember, 0.95);
      tri(3, 4, -5, 8, 0, -8, 7, 8, colors.brassLight, 0.95);
      line(-12, 12, 12, -9, colors.woodDark, 0.9, 3);
      return;
    }
    if (event.battleId === 'stormCorsairs') {
      circle(-6, -5, 8, colors.smoke, 0.86);
      circle(5, -4, 9, colors.smoke, 0.72);
      line(-2, 3, -9, 14, colors.brassLight, 0.9, 2);
      line(-2, 3, 5, 3, colors.brassLight, 0.9, 2);
      line(5, 3, -2, 14, colors.brassLight, 0.9, 2);
      return;
    }
    if (event.battleId === 'smugglersHollow') {
      rect(0, 4, 18, 13, colors.woodDark, 0.95).setStrokeStyle(1, colors.brass, 0.75);
      circle(0, -5, 7, colors.charcoal, 0.9).setStrokeStyle(1, colors.bone, 0.7);
      circle(-3, -6, 1.5, colors.bone, 0.9);
      circle(3, -6, 1.5, colors.bone, 0.9);
      return;
    }
    if (event.battleId === 'boarbackIsland') {
      circle(0, 2, 9, 0x6b4a2f, 0.96).setStrokeStyle(1, colors.charcoal, 0.7);
      tri(9, 2, 0, -4, 11, 0, 0, 4, colors.bone, 0.95);
      tri(-9, 2, 0, -4, -11, 0, 0, 4, colors.bone, 0.95);
      circle(-3, -2, 1.5, colors.charcoal, 0.9);
      return;
    }
    if (event.battleId === 'mangroveIsle') {
      line(-7, 12, -2, -11, colors.woodDark, 0.95, 4);
      line(5, 12, 2, -9, colors.woodDark, 0.9, 4);
      circle(-6, -9, 8, 0x2f8f54, 0.86);
      circle(6, -7, 8, 0x1f7a45, 0.82);
      return;
    }
    if (event.battleId === 'crabCay') {
      circle(0, 2, 9, 0xb6843a, 0.95).setStrokeStyle(1, colors.charcoal, 0.75);
      circle(-11, 0, 5, colors.brassLight, 0.9);
      circle(11, 0, 5, colors.brassLight, 0.9);
      line(-5, 10, -12, 14, colors.charcoal, 0.72, 2);
      line(5, 10, 12, 14, colors.charcoal, 0.72, 2);
      return;
    }
    if (event.battleId === 'pirateStronghold') {
      tri(0, -4, -13, 10, 0, -15, 13, 10, colors.charcoal, 0.95).setStrokeStyle(1, colors.brass, 0.85);
      line(-8, 7, 8, -8, colors.bone, 0.85, 2);
      line(8, 7, -8, -8, colors.bone, 0.85, 2);
      circle(0, -2, 2, colors.crimson, 0.95);
      return;
    }
    if (event.battleId === 'tidejawEvent') {
      tri(0, 1, -13, -5, 12, -10, 8, 9, 0x8fa6aa, 0.95).setStrokeStyle(1, colors.charcoal, 0.75);
      tri(-2, -9, -4, -14, 3, -14, 1, -6, colors.teal, 0.92);
      return;
    }
    if (event.battleId === 'stormwingEvent') {
      tri(-5, -2, -15, -9, -2, -6, -11, 7, colors.bone, 0.92);
      tri(5, -2, 15, -9, 2, -6, 11, 7, colors.bone, 0.92);
      circle(0, -2, 5, colors.smoke, 0.95);
      tri(7, -2, 0, -3, 10, 0, 0, 3, colors.brassLight, 0.95);
      return;
    }
    if (event.battleId === 'ironshellEvent') {
      circle(0, 2, 11, 0x315f43, 0.96).setStrokeStyle(1, colors.charcoal, 0.75);
      rect(0, 2, 14, 8, 0x7d6240, 0.5);
      circle(11, -1, 5, colors.teal, 0.85);
    }
  }

  drawTutorial() {
    if (!isTutorialActive(this.state) || this.state.tutorial.step !== 'navigation') return;
    const target = this.events.find((event) => event.battleId === 'navyPatrol') || this.events[0];
    drawTutorialPulse(this, target.x, target.y, 34, 'First battle');
    drawTutorialPanel(
      this,
      'Tutorial: Navigation',
      'Use WASD to steer. Approach the pulsing Navy Patrol marker, then press 1 to start the boarding fight. Returning to Haven is optional once you learn the map.',
      [
        { label: 'Skip', onClick: () => this.finishTutorial(), tone: colors.teal },
      ],
    );
  }

  finishTutorial() {
    completeTutorial(this.state);
    saveAutoGame(this.state);
    this.drawStatic();
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create() {
    this.state = setSceneCheckpoint(this, 'Battle');
    installPauseMenu(this, { sceneLabel: 'Battle' });
    this.battleId = this.state.pendingBattle || 'navyPatrol';
    this.encounter = battleEncounters[this.battleId] || battleEncounters.navyPatrol;
    this.battlefield = battlefields[this.encounter.battlefield] || battlefields.ship;
    const savedLayout = this.state.activeBattleLayout?.battleId === this.battleId ? this.state.activeBattleLayout : null;
    this.mapTiles = savedLayout?.mapTiles ? clone(savedLayout.mapTiles) : this.generateCombatMapTiles(this.battlefield);
    this.crew = clone(this.state.crew);
    this.enemies = clone(this.encounter.enemies);
    this.cover = new Map();
    this.crew.forEach((unit) => {
      unit.statuses ||= [];
      unit.actions = 2;
      unit.done = false;
    });
    this.enemies.forEach((unit) => {
      unit.statuses ||= [];
      unit.actions = 1;
      unit.done = false;
      unit.level = enemyLevelFor(unit, this.encounter);
      unit.stagger = 0;
      unit.statuses.forEach((status) => this.discoverStatus(status));
    });
    this.turn = 'prep';
    this.activeIndex = 0;
    this.selected = null;
    this.inspect = { type: 'objective' };
    this.momentum = this.state.shipSupport === 'boardingHooks' ? 20 : 10;
    this.surgeActive = false;
    this.objective = {
      hp: this.encounter.objectiveHp,
      maxHp: this.encounter.objectiveHp,
      pos: { x: 1, y: 3 },
      label: this.encounter.objectiveLabel,
    };
    if (isTutorialActive(this.state) && this.state.tutorial.step === 'battlePrep') this.setupScriptedTutorialBattle();
    this.log = [`${this.encounter.title}: boarding lines are thrown. Inspect the deck, set stances, then begin battle.`];
    this.buildCover();
    if (savedLayout?.cover) this.restoreCoverSnapshot(savedLayout.cover);
    this.persistBattleLayout(true);
    this.draw();
  }

  setupScriptedTutorialBattle() {
    this.encounter = {
      ...this.encounter,
      title: 'Tutorial Boarding Drill',
      objectiveLabel: 'Training Signal Chest',
    };
    this.objective.label = 'Training Signal Chest';
    this.objective.hp = 18;
    this.objective.maxHp = 18;
    this.crew.forEach((unit) => {
      unit.statuses = [];
      unit.actions = 2;
      unit.done = false;
    });
    this.crew[0].pos = { x: 7, y: 2 };
    this.crew[1].pos = { x: 7, y: 3 };
    this.crew[2].pos = { x: 7, y: 4 };
    this.enemies = [
      { ...this.enemies[0], id: 'navy-sharpshooter', name: 'Navy Sharpshooter', level: 1, hp: 17, maxHp: 17, pos: { x: 2, y: 1 }, statuses: [], stagger: 0, intent: 'Pin the captain from range' },
      { ...this.enemies[1], id: 'marine-guard', name: 'Marine Guard', level: 2, hp: 25, maxHp: 25, pos: { x: 1, y: 3 }, statuses: [], stagger: 0, intent: 'Advance to protect the chest' },
      { ...this.enemies[2], id: 'cutlass-marine', name: 'Cutlass Marine', level: 1, hp: 19, maxHp: 19, pos: { x: 2, y: 4 }, statuses: [], stagger: 0, intent: 'Board aggressively when ordered' },
    ];
    this.mapTiles = this.tutorialBattleTiles();
    this.activeIndex = 0;
    this.inspect = { type: 'objective' };
  }

  tutorialBattleTiles() {
    return [
      ['rail', 'deck', 'mast', 'deck', 'deck', 'crate', 'deck', 'deck', 'rail'],
      ['rail', 'deck', 'deck', 'deck', 'smoke', 'crate', 'deck', 'deck', 'rail'],
      ['deck', 'deck', 'fort', 'deck', 'deck', 'deck', 'powder', 'deck', 'deck'],
      ['deck', 'objective', 'fort', 'barricade', 'deck', 'crate', 'deck', 'deck', 'rail'],
      ['deck', 'deck', 'powder', 'deck', 'deck', 'deck', 'deck', 'rail', 'deck'],
      ['rail', 'deck', 'deck', 'deck', 'crate', 'deck', 'mast', 'deck', 'rail'],
    ];
  }

  generateCombatMapTiles(field) {
    const baseByEdge = {
      ship: 'deck',
      storm: 'storm',
      wreck: 'wreck',
      island: 'sand',
      swamp: 'shallows',
      tidal: 'sand',
      fort: 'fort',
      ocean: 'surf',
      cliff: 'cliff',
      reef: 'reef',
    };
    const base = baseByEdge[field.edge] || 'deck';
    const tiles = Array.from({ length: 6 }, () => Array.from({ length: 9 }, () => base));
    const edgeTile = ['ship', 'storm', 'fort'].includes(field.edge) ? 'rail' : ['island', 'swamp', 'tidal', 'ocean', 'reef', 'cliff'].includes(field.edge) ? 'surf' : base;
    for (let y = 0; y < 6; y += 1) {
      tiles[y][0] = edgeTile;
      tiles[y][8] = field.edge === 'ship' || field.edge === 'storm' || field.edge === 'fort' ? 'rail' : 'deep';
    }
    tiles[3][1] = 'objective';
    const pools = {
      ship: { cover: ['crate', 'crate', 'mast', 'rail'], hazard: ['powder', 'smoke'] },
      storm: { cover: ['crate', 'mast', 'storm'], hazard: ['smoke', 'lightning'] },
      wreck: { cover: ['crate', 'wreck', 'mast'], hazard: ['fire', 'ember', 'smoke', 'powder'] },
      island: { cover: ['palms', 'rocks', 'jungle', 'crate'], hazard: ['surf', 'smoke', 'powder'] },
      swamp: { cover: ['mangrove', 'jungle', 'rocks'], hazard: ['shallows', 'smoke'] },
      tidal: { cover: ['coral', 'rocks', 'tidepool'], hazard: ['surf', 'tidepool'] },
      fort: { cover: ['barricade', 'treasure', 'crate'], hazard: ['smoke', 'powder'] },
      ocean: { cover: ['wreck', 'crate', 'surf'], hazard: ['deep', 'surf'] },
      cliff: { cover: ['rocks', 'nest', 'cliff'], hazard: ['smoke', 'deep'] },
      reef: { cover: ['shell', 'coral', 'reef'], hazard: ['deep', 'tidepool'] },
    }[field.edge] || { cover: ['crate'], hazard: ['smoke'] };
    const protectedTiles = new Set(['1,3', '7,2', '7,3', '7,4', '2,1', '2,2', '2,3', '2,4']);
    const place = (count, options) => {
      let attempts = 0;
      let placed = 0;
      while (placed < count && attempts < 80) {
        attempts += 1;
        const x = Phaser.Math.Between(1, 7);
        const y = Phaser.Math.Between(0, 5);
        const key = `${x},${y}`;
        if (protectedTiles.has(key) || tiles[y][x] !== base) continue;
        tiles[y][x] = Phaser.Utils.Array.GetRandom(options);
        protectedTiles.add(key);
        placed += 1;
      }
    };
    place(7, pools.cover);
    place(3, pools.hazard);
    return tiles;
  }

  buildCover() {
    this.mapTiles.forEach((row, y) => row.forEach((id, x) => {
      const terrain = terrainDefs[id];
      if (terrain.cover) this.cover.set(`${x},${y}`, { hp: terrain.cover, maxHp: terrain.cover, tile: id });
    }));
  }

  coverSnapshot() {
    return Array.from(this.cover.entries()).map(([key, cover]) => ({ key, hp: cover.hp, maxHp: cover.maxHp, tile: cover.tile }));
  }

  restoreCoverSnapshot(snapshot) {
    if (!Array.isArray(snapshot)) return;
    snapshot.forEach((item) => {
      const cover = this.cover.get(item.key);
      if (cover) {
        cover.hp = Phaser.Math.Clamp(Number(item.hp ?? cover.hp), 0, cover.maxHp);
        cover.maxHp = Number(item.maxHp || cover.maxHp);
        cover.tile = item.tile || cover.tile;
      }
    });
  }

  persistBattleLayout(writeSave = false) {
    this.state.activeBattleLayout = {
      battleId: this.battleId,
      battlefield: this.encounter.battlefield,
      mapTiles: clone(this.mapTiles),
      cover: this.coverSnapshot(),
    };
    if (writeSave) saveAutoGame(this.state);
  }

  draw() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(colors.navyDark);
    this.drawBattleSeaBackdrop();
    this.drawDeck();
    this.drawCombatOverlays();
    this.drawUnits();
    this.drawHud();
    this.drawTutorial();
  }

  drawBattleSeaBackdrop() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, this.battlefield.outside || 0x0d3448, 1);
    const g = this.add.graphics();
    if (['island', 'swamp', 'tidal', 'cliff', 'reef'].includes(this.battlefield.edge)) {
      const landColor = this.battlefield.edge === 'swamp' ? 0x234a38 : this.battlefield.edge === 'tidal' ? 0x7f7958 : this.battlefield.edge === 'cliff' ? 0x5b5c54 : this.battlefield.edge === 'reef' ? 0x315f43 : 0x9a7a48;
      g.fillStyle(landColor, 0.5);
      g.fillEllipse(285, 372, 560, 360);
      g.fillEllipse(500, 364, 520, 300);
      g.fillStyle(colors.bone, 0.2);
      g.fillEllipse(356, 420, 680, 320);
    }
    if (this.battlefield.edge === 'fort') {
      g.fillStyle(0x1b1511, 0.65);
      g.fillRoundedRect(20, 114, 540, 388, 14);
      g.lineStyle(5, colors.woodDark, 0.7);
      g.strokeRoundedRect(20, 114, 540, 388, 14);
    }
    for (let y = 24; y < HEIGHT; y += 30) {
      g.lineStyle(y % 60 === 0 ? 2 : 1, y % 90 === 0 ? 0xcaf6ea : colors.teal, y % 90 === 0 ? 0.14 : 0.08);
      g.beginPath();
      for (let x = -30; x <= WIDTH + 30; x += 24) {
        const wave = Math.sin((x + y) * 0.027) * 7 + Math.cos((x - y) * 0.015) * 3;
        if (x === -30) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.strokePath();
    }
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
    this.add.text(58, 42, this.turn === 'prep' ? 'Battle Preparation' : this.encounter.title, ui.title);
    this.add.text(420, 50, `${this.battlefield.label} | Objective: capture ${this.objective.label}. Momentum Identity: ${this.state.momentumIdentity}`, {
      ...ui.label,
      fontSize: '12px',
      wordWrap: { width: 470 },
    });
    const o = this.gridOrigin();
    const g = this.add.graphics();
    g.fillStyle(this.battlefield.plank || 0x39271c, 1);
    if (this.battlefield.edge === 'ship' || this.battlefield.edge === 'storm' || this.battlefield.edge === 'wreck') {
      g.fillRoundedRect(o.x - 18, o.y - 16, o.size * 9 + 36, o.size * 6 + 30, 16);
      g.fillStyle(colors.woodDark, 0.7);
      g.fillTriangle(o.x - 18, o.y - 16, o.x + 20, o.y - 52, o.x + 100, o.y - 16);
      g.fillTriangle(o.x + o.size * 9 + 18, o.y - 16, o.x + o.size * 9 - 20, o.y - 52, o.x + o.size * 9 - 100, o.y - 16);
    } else {
      g.fillRoundedRect(o.x - 16, o.y - 16, o.size * 9 + 32, o.size * 6 + 32, 18);
    }
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const id = this.mapTiles[y][x];
        const terrain = terrainDefs[id];
        const wx = o.x + x * o.size;
        const wy = o.y + y * o.size;
        const fill = this.tileColor(id, x, y);
        const tile = this.add.rectangle(wx, wy, o.size - 2, o.size - 2, fill, 1).setOrigin(0).setStrokeStyle(1, colors.charcoal, 0.75);
        tile.setInteractive({ useHandCursor: true });
        tile.on('pointerdown', () => this.handleTile({ x, y }));
        this.drawTileFrame(id, wx, wy, x, y);
        this.drawTileDetail(id, wx, wy, x, y);
        if (terrain.cover) {
          const c = this.cover.get(`${x},${y}`);
          this.drawCoverWearOverlay(wx, wy, c);
          this.add.rectangle(wx + 8, wy + 40, 42, 5, colors.charcoal, 0.55).setOrigin(0);
          this.add.rectangle(wx + 8, wy + 40, 42 * ((c?.hp || 0) / terrain.cover), 5, (c?.hp || 0) <= terrain.cover * 0.35 ? colors.crimson : colors.brass, 0.9).setOrigin(0);
        }
      }
    }
    if (this.selected?.pos) {
      const p = this.gridToWorld(this.selected.pos);
      this.add.rectangle(p.x, p.y, o.size - 8, o.size - 8).setStrokeStyle(4, colors.teal).setOrigin(0.5);
    }
  }

  isInGrid(pos) {
    return pos && pos.x >= 0 && pos.x <= 8 && pos.y >= 0 && pos.y <= 5;
  }

  uniqueTiles(tiles) {
    const seen = new Set();
    return tiles.filter((pos) => {
      if (!this.isInGrid(pos)) return false;
      const key = `${pos.x},${pos.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  attackAreaFor(attacker, target) {
    if (!attacker || !target) return [];
    if (!attacker.intent) return this.uniqueTiles([{ ...target.pos }]);
    const area = [{ ...target.pos }];
    const intent = `${attacker.intent || ''} ${attacker.stance || ''}`.toLowerCase();
    if (intent.includes('powder') || intent.includes('ignite') || intent.includes('spread fire')) {
      area.push(
        { x: target.pos.x + 1, y: target.pos.y },
        { x: target.pos.x - 1, y: target.pos.y },
        { x: target.pos.x, y: target.pos.y + 1 },
        { x: target.pos.x, y: target.pos.y - 1 },
      );
    }
    if (attacker.stance === 'Boarding' && distance(attacker.pos, target.pos) <= 1) {
      area.push({ x: target.pos.x, y: target.pos.y + 1 }, { x: target.pos.x, y: target.pos.y - 1 });
    }
    return this.uniqueTiles(area);
  }

  coverAt(pos) {
    return this.cover.get(`${pos.x},${pos.y}`);
  }

  liveCoverAt(pos) {
    const cover = this.coverAt(pos);
    return cover && cover.hp > 0 ? cover : null;
  }

  coverPositionsAround(pos) {
    return this.uniqueTiles([
      { ...pos },
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ]).filter((tile) => this.liveCoverAt(tile));
  }

  bestCoverForTarget(target) {
    if (!target?.pos) return null;
    const covers = this.coverPositionsAround(target.pos)
      .map((pos) => ({ pos, cover: this.liveCoverAt(pos), terrain: terrainAt(pos, this.mapTiles) }))
      .filter((item) => item.cover);
    if (!covers.length) return null;
    return covers.sort((a, b) => (b.terrain.protection || 0) - (a.terrain.protection || 0))[0];
  }

  coverInArea(area) {
    return this.uniqueTiles(area).filter((pos) => this.liveCoverAt(pos));
  }

  hitChanceFor(attacker, target) {
    if (!attacker || !target) return null;
    const gap = distance(attacker.pos, target.pos);
    const weapon = crewWeaponCatalog[attacker.weapon] || crewWeaponCatalog.captainsCutlass;
    let chance = 82;
    if (gap > weapon.range) chance -= 30 + (gap - weapon.range) * 8;
    if (attacker.stance === 'Marksman' && gap >= 3) chance += 10;
    if (attacker.stance === 'Raider' && gap <= 2) chance += 5;
    if (attacker.statuses?.includes('Suppressed') || attacker.statuses?.includes('Smoke-Choked')) chance -= 14;
    if (target.statuses?.includes('Exposed')) chance += 12;
    if (target.statuses?.includes('Rallying')) chance -= 6;
    const ranged = gap >= 3 || weapon.tags?.includes('ranged') || attacker.stance === 'Marksman';
    const cover = ranged ? this.bestCoverForTarget(target) : null;
    if (cover) chance -= Math.round((cover.terrain.protection || 0) * 0.58);
    if (this.surgeActive) chance += 7;
    return Phaser.Math.Clamp(Math.round(chance), 18, 95);
  }

  damageCoverAt(pos, amount = 4) {
    const cover = this.liveCoverAt(pos);
    if (!cover) return 0;
    const before = cover.hp;
    cover.hp = Math.max(0, cover.hp - amount);
    this.persistBattleLayout(false);
    return before - cover.hp;
  }

  applyCoverWearForAttack(attacker, target, damage = 4) {
    const area = this.attackAreaFor(attacker, target);
    const worn = new Set();
    const directCover = this.bestCoverForTarget(target);
    if (directCover) {
      this.damageCoverAt(directCover.pos, damage + 2);
      worn.add(`${directCover.pos.x},${directCover.pos.y}`);
    }
    this.coverInArea(area).forEach((pos) => {
      const key = `${pos.x},${pos.y}`;
      if (!worn.has(key)) this.damageCoverAt(pos, Math.max(2, Math.floor(damage * 0.7)));
    });
  }

  rallyRangeFor(unit) {
    return hasSkill(unit, 'Rallying Orders') ? 3 : 2;
  }

  rallyAreaFor(unit) {
    if (!unit) return [];
    const range = this.rallyRangeFor(unit);
    return this.uniqueTiles(this.crew
      .filter((member) => member.hp > 0 && distance(unit.pos, member.pos) <= range)
      .map((member) => ({ ...member.pos })));
  }

  enemyIntentArea(enemy) {
    const target = this.closestCrew(enemy);
    if (!target) return [];
    const intent = `${enemy.intent || ''} ${enemy.stance || ''}`.toLowerCase();
    if (intent.includes('powder') || intent.includes('ignite') || intent.includes('sabotage') || intent.includes('spread fire')) {
      return this.uniqueTiles([
        { ...this.objective.pos },
        { x: this.objective.pos.x + 1, y: this.objective.pos.y },
        { x: this.objective.pos.x - 1, y: this.objective.pos.y },
        { x: this.objective.pos.x, y: this.objective.pos.y + 1 },
        { x: this.objective.pos.x, y: this.objective.pos.y - 1 },
      ]);
    }
    if (distance(enemy.pos, target.pos) <= 2 || intent.includes('pin') || intent.includes('shoot')) {
      return this.attackAreaFor(enemy, target);
    }
    return this.uniqueTiles([{
      x: enemy.pos.x + Math.sign(target.pos.x - enemy.pos.x),
      y: enemy.pos.y + Math.sign(target.pos.y - enemy.pos.y),
    }]);
  }

  isStrongEnemyIntent(enemy) {
    if (!enemy?.hp) return false;
    const id = enemy.id || '';
    const intent = `${enemy.intent || ''} ${enemy.role || ''} ${enemy.stance || ''}`.toLowerCase();
    if (['tidejaw', 'stormwing', 'ironshell', 'barnacled-butcher', 'gravewake-captain'].includes(id)) return true;
    return enemy.level >= 5 || intent.includes('legendary') || intent.includes('elite') || intent.includes('powder') || intent.includes('ignite') || intent.includes('sabotage');
  }

  drawFlashingDangerTile(pos, label = '') {
    const o = this.gridOrigin();
    const x = o.x + pos.x * o.size + o.size / 2;
    const y = o.y + pos.y * o.size + o.size / 2;
    const tile = this.add.rectangle(x, y, o.size - 7, o.size - 7, colors.crimson, 0.18)
      .setStrokeStyle(3, colors.crimson, 0.78)
      .setDepth(9);
    this.tweens.add({ targets: tile, alpha: 0.34, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.rectangle(x, y, o.size - 17, o.size - 17, colors.crimson, 0.06).setDepth(8);
    if (label) {
      this.add.text(x, y - 22, label, { ...ui.small, fontSize: '9px', color: '#ffd3c6' })
        .setOrigin(0.5)
        .setDepth(10);
    }
  }

  drawFlashingMoveTile(pos) {
    const o = this.gridOrigin();
    const x = o.x + pos.x * o.size + o.size / 2;
    const y = o.y + pos.y * o.size + o.size / 2;
    const moveGreen = 0x2bd46f;
    const tile = this.add.rectangle(x, y, o.size - 7, o.size - 7, moveGreen, 0.2)
      .setStrokeStyle(3, moveGreen, 0.86)
      .setDepth(9);
    this.add.rectangle(x, y, o.size - 19, o.size - 19, moveGreen, 0.08).setDepth(8);
    this.tweens.add({ targets: tile, alpha: 0.42, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  drawHitChanceLabel(pos, value, label = '') {
    if (value == null) return;
    const o = this.gridOrigin();
    const x = o.x + pos.x * o.size + o.size / 2;
    const y = o.y + pos.y * o.size + o.size / 2;
    const color = value >= 75 ? colors.teal : value >= 50 ? colors.brassLight : colors.crimson;
    this.add.rectangle(x, y + 18, label ? 58 : 38, 17, colors.charcoal, 0.82)
      .setStrokeStyle(1, color, 0.78)
      .setDepth(11);
    this.add.text(x, y + 11, label ? `${value}% ${label}` : `${value}%`, { ...ui.small, fontSize: '9px', color: '#f3e5c4' })
      .setOrigin(0.5, 0)
      .setDepth(12);
  }

  drawCombatOverlays() {
    this.drawEnemyIntentOverlays();
    this.drawPlayerActionPreview();
  }

  drawEnemyIntentOverlays() {
    if (this.turn !== 'enemy') return;
    this.enemies.filter((enemy) => enemy.hp > 0 && this.isStrongEnemyIntent(enemy)).forEach((enemy) => {
      this.enemyIntentArea(enemy).forEach((pos, index) => {
        this.drawFlashingDangerTile(pos, index === 0 ? 'Heavy' : '');
      });
    });
  }

  drawPlayerActionPreview() {
    if (this.turn !== 'crew') return;
    const active = this.crew[this.activeIndex];
    if (!active || active.hp <= 0) return;
    if (this.command === 'attack') {
      const targets = this.inspect?.type === 'enemy' && this.inspect.unit?.hp > 0 ? [this.inspect.unit] : this.enemies.filter((enemy) => enemy.hp > 0);
      targets.forEach((target) => {
        this.attackAreaFor(active, target).forEach((pos, index) => this.drawFlashingDangerTile(pos, index === 0 ? 'Attack' : ''));
        this.drawHitChanceLabel(target.pos, this.hitChanceFor(active, target));
        this.coverInArea(this.attackAreaFor(active, target)).forEach((pos) => {
          const cover = this.liveCoverAt(pos);
          if (cover) this.drawHitChanceLabel(pos, Phaser.Math.Clamp(Math.round(68 - (1 - cover.hp / cover.maxHp) * 18), 35, 82), 'cover');
        });
      });
    }
    if (this.command === 'move') {
      this.movableTilesFor(active).forEach((pos) => this.drawFlashingMoveTile(pos));
    }
    if (this.command === 'rally') {
      this.rallyAreaFor(active).forEach((pos, index) => {
        this.drawFlashingDangerTile(pos, index === 0 ? `Rally R${this.rallyRangeFor(active)}` : '');
      });
    }
    if (this.command === 'surge') {
      const tiles = this.isScriptedTutorialBattle()
        ? this.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.pos)
        : [{ ...active.pos }];
      tiles.forEach((pos, index) => {
        this.drawFlashingDangerTile(pos, index === 0 ? 'Surge' : '');
      });
    }
  }

  movableTilesFor(unit) {
    if (!unit) return [];
    const max = unit.stance === 'Raider' ? 4 : unit.stance === 'Brace' ? 2 : 3;
    const occupiedTiles = [...this.crew, ...this.enemies]
      .filter((other) => other.hp > 0 && other.id !== unit.id)
      .map((other) => `${other.pos.x},${other.pos.y}`);
    const occupiedSet = new Set(occupiedTiles);
    const tiles = [];
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const pos = { x, y };
        if (isSamePos(pos, unit.pos)) continue;
        if (distance(unit.pos, pos) > max) continue;
        if (occupiedSet.has(`${x},${y}`)) continue;
        if (terrainAt(pos, this.mapTiles).move > max) continue;
        tiles.push(pos);
      }
    }
    return tiles;
  }

  tileColor(id, x, y) {
    const palette = {
      deck: 0x6a432b,
      rail: 0x4a3325,
      crate: 0x7a5638,
      powder: 0x513b2c,
      smoke: 0x4e5962,
      fire: 0x77351d,
      mast: 0x7d6240,
      objective: 0x6b2e23,
      sand: 0xb89357,
      surf: 0x3d9ab1,
      palms: 0x2f6b3e,
      rocks: 0x686760,
      jungle: 0x245436,
      mangrove: 0x234230,
      shallows: 0x2f6d66,
      tidepool: 0x317f88,
      coral: 0xd0a06d,
      fort: 0x5d4a39,
      barricade: 0x3b2a20,
      treasure: 0xb6843a,
      wreck: 0x4f2f1f,
      ember: 0x8d3d1f,
      storm: 0x3f4f5a,
      lightning: 0x657b89,
      reef: 0x3b7b62,
      shell: 0x6c7b5a,
      cliff: 0x5d5c57,
      nest: 0x756044,
      deep: 0x12364a,
    };
    const base = palette[id] || palette.deck;
    return Phaser.Display.Color.ValueToColor(base).darken((x + y) % 2 === 0 ? 0 : 6).color;
  }

  drawTileFrame(id, wx, wy, x, y) {
    const warm = ['deck', 'rail', 'crate', 'powder', 'mast', 'fort', 'barricade', 'treasure', 'wreck', 'ember'].includes(id);
    const bright = warm ? colors.brassLight : ['surf', 'shallows', 'tidepool', 'deep'].includes(id) ? 0xd8fff4 : colors.bone;
    this.add.rectangle(wx + 2, wy + 2, 52, 52, bright, 0.035).setOrigin(0);
    this.add.rectangle(wx + 4, wy + 4, 48, 48, 0x000000, 0).setOrigin(0).setStrokeStyle(1, bright, 0.16);
    this.add.rectangle(wx + 1, wy + 1, 54, 54, 0x000000, 0).setOrigin(0).setStrokeStyle(1, colors.charcoal, 0.5);
  }

  drawCoverWearOverlay(wx, wy, cover) {
    if (!cover?.maxHp) return;
    const wear = 1 - (cover.hp / cover.maxHp);
    if (wear <= 0.08) return;
    const cx = wx + 28;
    const cy = wy + 28;
    const alpha = Phaser.Math.Clamp(wear * 0.72, 0.18, 0.68);
    this.add.line(wx, wy, 12, 17, 32, 35, colors.charcoal, alpha).setOrigin(0).setLineWidth(wear > 0.45 ? 3 : 2);
    this.add.line(wx, wy, 39, 18, 25, 33, colors.charcoal, alpha * 0.86).setOrigin(0).setLineWidth(2);
    if (wear > 0.5) {
      this.add.circle(cx + 11, cy + 5, 5, colors.charcoal, 0.28);
      this.add.rectangle(cx - 12, cy + 11, 16, 4, colors.charcoal, 0.32).setRotation(-0.25);
    }
    if (wear > 0.8) {
      this.add.circle(cx - 8, cy - 4, 7, colors.charcoal, 0.42);
      this.add.rectangle(cx + 8, cy - 12, 22, 5, colors.charcoal, 0.38).setRotation(0.34);
    }
  }

  drawReadableTileTexture(id, wx, wy, x, y) {
    const cx = wx + 28;
    const cy = wy + 28;
    const cover = this.cover?.get(`${x},${y}`);
    const wear = cover?.maxHp ? 1 - (cover.hp / cover.maxHp) : 0;
    const line = (x1, y1, x2, y2, color, alpha = 0.45, width = 2) => {
      this.add.line(wx, wy, x1, y1, x2, y2, color, alpha).setOrigin(0).setLineWidth(width);
    };
    const dot = (ox, oy, radius, color, alpha = 0.55) => this.add.circle(wx + ox, wy + oy, radius, color, alpha);
    const drawWear = () => {
      if (wear <= 0.08) return;
      const alpha = Phaser.Math.Clamp(wear * 0.7, 0.18, 0.62);
      line(13, 16, 31, 34, colors.charcoal, alpha, wear > 0.45 ? 3 : 2);
      line(39, 18, 27, 31, colors.charcoal, alpha * 0.8, 2);
      if (wear > 0.55) {
        this.add.circle(cx + 11, cy + 6, 5, colors.charcoal, 0.28);
        this.add.rectangle(cx - 12, cy + 11, 16, 4, colors.charcoal, 0.3).setRotation(-0.25);
      }
      if (wear > 0.8) {
        this.add.circle(cx - 8, cy - 3, 7, colors.charcoal, 0.38);
        this.add.rectangle(cx + 8, cy - 12, 22, 5, colors.charcoal, 0.36).setRotation(0.34);
      }
    };
    if (['deck', 'rail', 'fort', 'storm', 'wreck'].includes(id)) {
      const plank = id === 'storm' ? 0xa7b0ad : id === 'fort' ? 0xd0aa73 : id === 'wreck' ? 0x2b1a13 : colors.woodDark;
      [13, 29, 45].forEach((yy, index) => line(6, yy, 52, yy + ((x + y + index) % 2 ? 2 : -2), plank, id === 'wreck' ? 0.56 : 0.38, 2));
      [18, 38].forEach((xx) => line(xx, 6, xx - 8, 52, colors.charcoal, 0.18, 1));
    }
    if (id === 'rail') {
      this.add.rectangle(cx, cy + 16, 46, 8, colors.woodDark, 0.92).setStrokeStyle(2, colors.brass, 0.5);
      dot(12, 38, 3, colors.brassLight, 0.78);
      dot(44, 38, 3, colors.brassLight, 0.78);
      return;
    }
    if (['surf', 'shallows', 'tidepool', 'deep'].includes(id)) {
      const foam = id === 'deep' ? 0x3d9ab1 : 0xd8fff4;
      this.add.ellipse(cx, cy - 9, 44, 5, foam, id === 'deep' ? 0.12 : 0.32).setRotation(0.08);
      this.add.ellipse(cx - 4, cy + 9, 36, 4, foam, id === 'deep' ? 0.08 : 0.24).setRotation(-0.08);
      if (id === 'tidepool') this.add.circle(cx + 9, cy + 2, 13, 0xd8fff4, 0.12).setStrokeStyle(1, 0xd8fff4, 0.24);
      return;
    }
    if (['sand'].includes(id)) {
      dot(14, 18, 2, 0xf0d59c, 0.42);
      dot(37, 35, 2.4, 0x6f5734, 0.35);
      dot(42, 15, 1.3, colors.bone, 0.28);
      this.add.ellipse(cx - 4, cy, 34, 5, 0xf0d59c, 0.16).setRotation(-0.22);
      return;
    }
    if (['palms', 'jungle', 'mangrove'].includes(id)) {
      const trunk = id === 'mangrove' ? 0x432d20 : colors.woodDark;
      line(18, 42, 23, 15, trunk, 0.72, 4);
      line(34, 43, 30, 13, trunk, 0.58, 4);
      this.add.ellipse(cx - 10, cy - 10, 34, 12, 0x2f8f54, 0.72).setRotation(-0.38);
      this.add.ellipse(cx + 9, cy - 8, 30, 11, 0x1f7a45, 0.7).setRotation(0.32);
      return;
    }
    if (['rocks', 'coral', 'shell', 'cliff', 'reef'].includes(id)) {
      const stone = id === 'coral' ? 0xe0a28f : id === 'shell' ? 0xb9c4cf : id === 'reef' ? 0x3b7b62 : 0x8a8980;
      this.add.polygon(cx - 7, cy + 1, [-16, 9, -8, -12, 9, -14, 18, 5, 3, 16], stone, 0.82).setStrokeStyle(1, colors.charcoal, 0.4);
      this.add.polygon(cx + 12, cy + 10, [-10, 6, -3, -7, 9, -5, 12, 7, 2, 11], stone, 0.58).setStrokeStyle(1, colors.charcoal, 0.3);
      return;
    }
    if (['crate', 'barricade', 'treasure'].includes(id)) {
      const fill = id === 'treasure' ? colors.brass : colors.woodDark;
      this.add.rectangle(cx, cy + 2, 38, 27, fill, 0.9).setStrokeStyle(2, colors.charcoal, 0.72);
      line(10, 20, 46, 38, colors.brassLight, 0.22, 2);
      line(46, 20, 10, 38, colors.brassLight, 0.16, 2);
      if (id === 'barricade') this.add.rectangle(cx, cy - 2, 45, 7, colors.wood, 0.8).setRotation(-0.22);
      drawWear();
      return;
    }
    if (id === 'powder') {
      this.add.circle(cx, cy, 17, 0x2b1a13, 0.94).setStrokeStyle(3, colors.ember, 0.78);
      this.add.rectangle(cx, cy + 5, 28, 8, colors.woodDark, 0.7);
      line(35, 15, 45, 6, colors.ember, 0.9, 2);
      return;
    }
    if (['fire', 'ember', 'lightning'].includes(id)) {
      this.add.circle(cx, cy + 8, 18, colors.ember, 0.22);
      this.add.triangle(cx - 1, cy + 6, -13, 15, 0, -22, 14, 15, colors.ember, 0.9);
      this.add.triangle(cx + 5, cy + 7, -7, 11, 0, -14, 8, 11, colors.brassLight, 0.86);
      if (id === 'lightning') line(31, 6, 21, 27, 0xd8fff4, 0.8, 3);
      return;
    }
    if (id === 'smoke') {
      this.add.circle(cx - 10, cy, 16, colors.smoke, 0.34);
      this.add.circle(cx + 7, cy - 6, 19, colors.smoke, 0.26);
      this.add.circle(cx + 13, cy + 10, 13, colors.smoke, 0.24);
      return;
    }
    if (id === 'mast') {
      this.add.rectangle(cx, cy, 13, 50, colors.woodDark, 0.92).setStrokeStyle(2, colors.brass, 0.34);
      line(8, 17, 50, 42, colors.charcoal, 0.5, 3);
      drawWear();
      return;
    }
    if (['objective', 'nest'].includes(id)) {
      this.add.rectangle(cx, cy + 2, 40, 29, id === 'nest' ? 0x756044 : colors.crimson, 0.78).setStrokeStyle(2, colors.brass, 0.72);
      this.add.circle(cx, cy - 9, 6, colors.brassLight, 0.9);
      drawWear();
      return;
    }
    if (cover) drawWear();
  }

  drawTileDetail(id, wx, wy, x, y) {
    this.drawReadableTileTexture(id, wx, wy, x, y);
    return;
    const cx = wx + 28;
    const cy = wy + 28;
    if (['deck', 'fort', 'storm', 'wreck', 'rail'].includes(id)) {
      const lineColor = id === 'storm' ? 0x9fb2ad : colors.woodDark;
      this.add.line(wx + 5, wy + 18, 0, 0, 48, ((x + y) % 2) * 5, lineColor, 0.35).setOrigin(0);
      this.add.line(wx + 5, wy + 38, 0, 0, 48, -((x + y) % 2) * 5, lineColor, 0.28).setOrigin(0);
      this.add.line(wx + 28, wy + 4, 0, 0, ((x + y) % 2 ? 4 : -4), 49, colors.bone, 0.07).setOrigin(0);
    }
    if (id === 'rail') {
      this.add.rectangle(cx, cy + 17, 45, 6, colors.brass, 0.5).setStrokeStyle(1, colors.charcoal, 0.35);
      this.add.circle(cx - 17, cy + 10, 3, colors.woodDark, 0.95);
      this.add.circle(cx + 17, cy + 10, 3, colors.woodDark, 0.95);
    }
    if (id === 'mast') {
      this.add.rectangle(cx, cy, 12, 50, colors.woodDark, 0.82).setStrokeStyle(2, colors.brass, 0.25);
      this.add.line(cx - 22, cy - 11, 0, 0, 44, 22, colors.charcoal, 0.5).setLineWidth(3).setOrigin(0);
    }
    if (id === 'sand') {
      this.add.ellipse(cx - 10, cy - 6, 22, 4, 0xf0d59c, 0.22).setRotation(0.2);
      this.add.circle(cx + 12, cy + 9, 2, 0x7d6240, 0.35);
      this.add.circle(cx - 19, cy + 14, 1.3, 0x7d6240, 0.22);
      this.add.circle(cx + 5, cy - 17, 1, 0xf0d59c, 0.34);
    }
    if (['surf', 'shallows', 'tidepool', 'deep'].includes(id)) {
      this.add.ellipse(cx, cy - 5, 42, 5, 0xd8fff4, id === 'deep' ? 0.09 : 0.22);
      this.add.ellipse(cx - 4, cy + 12, 32, 4, 0x9cf1e2, id === 'deep' ? 0.07 : 0.18);
      if (id !== 'deep') this.add.arc(cx + 8, cy + 2, 19, Phaser.Math.DegToRad(195), Phaser.Math.DegToRad(335), false).setStrokeStyle(2, 0xd8fff4, 0.18);
    }
    if (['palms', 'jungle', 'mangrove'].includes(id)) {
      this.add.rectangle(cx - 8, cy + 8, 7, 25, colors.woodDark, 0.75).setRotation(-0.18);
      this.add.ellipse(cx - 12, cy - 7, 34, 12, 0x1f7a45, 0.65).setRotation(-0.4);
      this.add.ellipse(cx + 8, cy - 11, 30, 10, 0x2f8f54, 0.52).setRotation(0.3);
    }
    if (['rocks', 'coral', 'shell', 'cliff'].includes(id)) {
      const color = id === 'coral' ? 0xe0a28f : id === 'shell' ? 0x9fb2ad : 0x8a8980;
      this.add.ellipse(cx - 8, cy + 2, 26, 18, color, 0.72).setStrokeStyle(1, colors.charcoal, 0.3);
      this.add.ellipse(cx + 10, cy + 8, 22, 14, color, 0.55).setStrokeStyle(1, colors.charcoal, 0.24);
    }
    if (['crate', 'barricade', 'treasure'].includes(id)) {
      const color = id === 'treasure' ? colors.brass : colors.woodDark;
      this.add.rectangle(cx, cy + 2, 34, 24, color, 0.75).setStrokeStyle(2, colors.charcoal, 0.65);
      this.add.line(cx - 17, cy - 6, 0, 0, 34, 18, colors.brassLight, 0.22).setOrigin(0);
      if (id === 'treasure') this.add.rectangle(cx, cy - 2, 28, 5, colors.brassLight, 0.28);
    }
    if (id === 'powder') {
      this.add.circle(cx, cy, 16, 0x2b1a13, 0.88).setStrokeStyle(2, colors.ember, 0.72);
      this.add.circle(cx + 4, cy - 6, 4, colors.brassLight, 0.7);
      this.add.line(cx + 6, cy - 10, 0, 0, 7, -7, colors.ember, 0.9).setLineWidth(2);
    }
    if (['fire', 'ember', 'lightning'].includes(id)) {
      this.add.circle(cx - 4, cy + 7, 16, colors.ember, 0.28);
      this.add.triangle(cx, cy, -12, 14, 0, -20, 12, 14, colors.ember, 0.82);
      this.add.triangle(cx + 5, cy + 2, -7, 11, 0, -14, 7, 11, colors.brassLight, 0.8);
    }
    if (id === 'smoke') {
      this.add.circle(cx - 9, cy, 14, colors.smoke, 0.32);
      this.add.circle(cx + 7, cy - 5, 17, colors.smoke, 0.24);
      this.add.circle(cx + 13, cy + 8, 12, colors.smoke, 0.22);
    }
    if (['objective', 'nest'].includes(id)) {
      this.add.rectangle(cx, cy + 2, 38, 27, id === 'nest' ? 0x756044 : colors.crimson, 0.68).setStrokeStyle(2, colors.brass, 0.62);
      this.add.circle(cx, cy - 8, 5, colors.brassLight, 0.84);
      if (id === 'objective') this.add.line(cx - 15, cy + 5, 0, 0, 30, 0, colors.brassLight, 0.35).setLineWidth(2).setOrigin(0);
    }
  }

  drawUnits() {
    this.unitContainers = new Map();
    this.crew.forEach((unit, index) => this.drawUnit(unit, index === this.activeIndex && this.turn === 'crew', true));
    this.enemies.forEach((unit) => {
      if (unit.hp > 0) this.drawUnit(unit, false, false);
    });
  }

  drawUnit(unit, active, ally) {
    const p = this.gridToWorld(unit.pos);
    const profile = spriteProfileFor(unit);
    const stance = stanceSpriteDetails[unit.stance] || stanceSpriteDetails.Boarding;
    const action = unit.visualAction?.type || (this.isUnitInCover(unit) ? 'cover' : 'idle');
    const container = this.add.container(p.x, p.y).setDepth(20 + p.y * 0.01);
    container.unitId = unit.id;
    this.unitContainers.set(unit.id, container);
    this.addUnitShadow(container, profile);
    const moveDirection = unit.visualAction?.from
      ? directionFromDelta(unit.pos.x - unit.visualAction.from.x, unit.pos.y - unit.visualAction.from.y, ally ? 'left' : 'right')
      : ally ? 'left' : 'right';
    this.addCharacterBody(container, unit, profile, stance, ally, action, moveDirection);
    this.addUnitLabels(container, unit, active, ally, profile);
    if (unit.visualAction?.from) {
      const from = this.gridToWorld(unit.visualAction.from);
      container.setPosition(from.x, from.y);
    }
    this.animateUnitContainer(container, unit, action, p, ally);
  }

  addUnitShadow(container, profile) {
    const creature = isCreatureProfile(profile);
    const wide = ['large', 'huge', 'boar', 'croc', 'crab', 'seal', 'shark', 'turtle'].includes(profile.build);
    container.add(this.add.ellipse(0, creature ? 24 : 21, creature && wide ? 58 : creature ? 44 : 34, creature && wide ? 16 : creature ? 12 : 9, colors.charcoal, 0.3));
    container.add(this.add.ellipse(0, creature ? 19 : 18, creature && wide ? 42 : creature ? 30 : 24, creature && wide ? 9 : creature ? 7 : 5, colors.charcoal, 0.2));
  }

  addSpriteAura(container, unit, ally, stance) {
    const statusTone = unit.statuses?.includes('Burning') ? colors.ember
      : unit.statuses?.includes('Suppressed') || unit.statuses?.includes('Smoke-Choked') ? colors.smoke
        : unit.statuses?.includes('Exposed') || unit.statuses?.includes('Panic') ? colors.crimson
          : stance.accent;
    container.add(this.add.circle(0, 0, 31, ally ? colors.teal : colors.crimson, 0.025).setStrokeStyle(1, ally ? colors.teal : colors.crimson, 0.16));
    container.add(this.add.arc(0, 24, 27, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false)
      .setStrokeStyle(3, statusTone, unit.statuses?.length ? 0.72 : 0.2));
    if (unit.level > 1 && ally) {
      container.add(this.add.circle(-28, -45, 7, colors.brassLight, 0.92).setStrokeStyle(1, colors.charcoal, 0.9));
      container.add(this.add.text(-28, -49, `${unit.level}`, { ...ui.small, fontSize: '8px', color: '#17100c' }).setOrigin(0.5, 0));
    }
  }

  addCharacterBody(container, unit, profile, stance, ally, action, direction = null) {
    this.addRefinedUnitSprite(container, unit, profile, stance, ally, action, direction);
    return;
    if (['beast', 'bird', 'boar', 'croc', 'cat', 'crab', 'seal', 'monkey', 'shark', 'giant-bird', 'turtle'].includes(profile.build)) {
      this.addSpriteAura(container, unit, ally, stance);
      this.addWildlifeSprite(container, profile, stance, action);
      return;
    }
    const [coat, accent, dark] = profile.palette;
    const scale = profile.build === 'huge' ? 1.22 : profile.build === 'large' ? 1.1 : profile.build === 'small' ? 0.88 : 1;
    const coverDuck = action === 'cover';
    const lean = stance.lean + (profile.posture === 'low' ? -4 : profile.posture === 'rush' ? -6 : 0);
    const bodyY = coverDuck ? -2 : -7;
    const headY = coverDuck ? -29 : -42;
    const bodyWidth = profile.build === 'thin' ? 24 : profile.build === 'bare' ? 30 : 34;
    const bodyHeight = profile.build === 'bare' ? 36 : profile.build === 'coat' ? 46 : 40;
    const legColor = dark || colors.charcoal;
    container.setAngle(lean * 0.22);
    this.addSpriteAura(container, unit, ally, stance);
    container.add(this.add.ellipse(0, -13, (bodyWidth + 18) * scale, (bodyHeight + 30) * scale, ally ? colors.teal : colors.crimson, ally ? 0.08 : 0.1));
    container.add(this.add.line(-8 * scale, 9, 0, 0, -13 * scale, 27, legColor, 1).setLineWidth(5));
    container.add(this.add.line(8 * scale, 9, 0, 0, 13 * scale, 27, legColor, 1).setLineWidth(5));
    container.add(this.add.circle(-13 * scale, 27, 5 * scale, colors.charcoal, 0.86));
    container.add(this.add.circle(13 * scale, 27, 5 * scale, colors.charcoal, 0.86));
    if (profile.build === 'bare') {
      container.add(this.add.rectangle(0, bodyY, bodyWidth * scale, bodyHeight * scale, 0x9b6a48, 0.96).setStrokeStyle(2, dark));
      container.add(this.add.line(-12, bodyY - 6, 0, 0, 11, bodyY + 12, colors.crimson, 0.9).setLineWidth(2));
      container.add(this.add.line(10, bodyY - 9, 0, 0, -9, bodyY + 9, colors.teal, 0.8).setLineWidth(2));
    } else {
      container.add(this.add.rectangle(0, bodyY, bodyWidth * scale, bodyHeight * scale, coat, 0.96).setStrokeStyle(2, dark));
      container.add(this.add.rectangle(-bodyWidth * 0.36, bodyY - bodyHeight * 0.18, 4, bodyHeight * 0.5, colors.bone, 0.16));
      container.add(this.add.rectangle(bodyWidth * 0.36, bodyY - bodyHeight * 0.12, 3, bodyHeight * 0.42, colors.charcoal, 0.2));
      container.add(this.add.rectangle(-bodyWidth * 0.22, bodyY - 2, 4, bodyHeight * 0.8, accent, 0.78));
      container.add(this.add.rectangle(bodyWidth * 0.22, bodyY - 2, 4, bodyHeight * 0.8, accent, 0.55));
      container.add(this.add.line(-bodyWidth * 0.32, bodyY - bodyHeight * 0.35, 0, 0, bodyWidth * 0.64, 0, colors.bone, 0.14).setLineWidth(1));
      container.add(this.add.circle(0, bodyY + bodyHeight * 0.08, 2, colors.brassLight, 0.88));
      container.add(this.add.circle(0, bodyY + bodyHeight * 0.28, 1.6, colors.brassLight, 0.72));
    }
    if (profile.prop === 'satchel') container.add(this.add.rectangle(16, 1, 12, 16, colors.woodDark, 1).setStrokeStyle(1, accent));
    if (profile.prop === 'pouches') container.add(this.add.rectangle(-16, 12, 22, 8, colors.brass, 0.9).setStrokeStyle(1, dark));
    if (profile.prop === 'tools') container.add(this.add.rectangle(16, 4, 12, 22, colors.teal, 0.75).setStrokeStyle(1, dark));
    if (profile.prop === 'spyglass') {
      container.add(this.add.line(-17, 7, 0, 0, 13, 8, colors.brass, 0.95).setLineWidth(4));
      container.add(this.add.circle(-20, 6, 3, colors.brassLight, 0.95).setStrokeStyle(1, dark));
    }
    if (profile.prop === 'telescope') {
      container.add(this.add.line(14, -18, 0, 0, 25, -6, colors.brass, 0.95).setLineWidth(4));
      container.add(this.add.circle(40, -24, 3, colors.brassLight, 0.95).setStrokeStyle(1, dark));
    }
    if (profile.prop === 'chains') container.add(this.add.line(-17, -10, 0, 0, 34, 30, colors.brass, 0.75).setLineWidth(2));
    if (profile.prop === 'trophies') container.add(this.add.circle(17, -18, 4, colors.brassLight, 0.9).setStrokeStyle(1, dark));
    if (profile.prop === 'barnacles') {
      container.add(this.add.circle(-13, -18, 4, 0x9fb2ad, 0.85).setStrokeStyle(1, dark));
      container.add(this.add.circle(12, 4, 3, 0x9fb2ad, 0.78).setStrokeStyle(1, dark));
      container.add(this.add.circle(3, -25, 2.5, 0xf3e5c4, 0.65));
    }
    container.add(this.add.circle(0, headY, 11 * scale, colors.parchment, 0.98).setStrokeStyle(2, dark));
    container.add(this.add.circle(-4 * scale, headY - 2 * scale, 1.3 * scale, colors.charcoal, 0.92));
    container.add(this.add.circle(4 * scale, headY - 2 * scale, 1.3 * scale, colors.charcoal, 0.92));
    container.add(this.add.line(-4 * scale, headY + 5 * scale, 0, 0, 8 * scale, 0, colors.woodDark, 0.45).setLineWidth(1));
    this.addHeadgear(container, profile, headY, accent, dark, scale);
    if (profile.mark === 'scar') container.add(this.add.line(4, headY - 5, 0, 0, 7, 7, colors.crimson, 0.95).setLineWidth(1));
    if (profile.mark === 'scars') container.add(this.add.line(-7, headY + 2, 0, 0, 15, -4, colors.crimson, 0.75).setLineWidth(1));
    if (profile.mark === 'burns') container.add(this.add.circle(-5, headY + 4, 4, colors.ember, 0.6));
    if (profile.mark === 'tattoos') {
      container.add(this.add.line(-9, bodyY - 8, 0, 0, 6, 8, dark, 0.7).setLineWidth(2));
      container.add(this.add.circle(9, bodyY + 3, 3, dark, 0.55));
    }
    this.addWeapons(container, profile, unit, stance, ally, action, scale);
    this.addRankAndStatusDetails(container, unit, profile, stance, ally, scale);
    if (ally) this.addStanceRibbon(container, unit.stance, stance.accent);
  }

  addRefinedUnitSprite(container, unit, profile, stance, ally, action, direction = null) {
    const creature = isCreatureProfile(profile);
    if (creature) {
      this.addSpriteAura(container, unit, ally, stance);
      this.addRefinedCreatureSprite(container, unit, profile, stance, ally, action, direction);
      return;
    }
    this.addRefinedHumanoidSprite(container, unit, profile, stance, ally, action, direction);
  }

  addRefinedHumanoidSprite(container, unit, profile, stance, ally, action, direction = null) {
    const sprite = scallywagProfileFor(unit);
    if (sprite) {
      const facing = ally ? -1 : 1;
      const y = 21;
      const size = action === 'hit' ? 0.96 : action === 'melee' ? 1.04 : 1;
      const combatScale = profile.build === 'huge' ? 2.28 : profile.build === 'large' ? 2.18 : 2.02;
      drawScallywagCharacter(this, container, unit, profile, stance, ally, {
        scale: combatScale,
        y,
        facing,
        direction: direction || (ally ? 'left' : 'right'),
        animate: action === 'move',
        repeat: action === 'move' ? 5 : -1,
        walkDuration: 260,
        aura: true,
        size,
        compact: true,
      });
      if (ally) this.addStanceRibbon(container, unit.stance, stance.accent);
      return;
    }
    this.addSpriteAura(container, unit, ally, stance);
    const [coat, accent, dark] = profile.palette;
    const scale = profile.build === 'huge' ? 1.16 : profile.build === 'large' ? 1.08 : profile.build === 'small' ? 0.84 : 1;
    const facing = ally ? -1 : 1;
    const cover = action === 'cover';
    const lean = (stance.lean + (profile.posture === 'low' ? -3 : profile.posture === 'rush' ? -5 : 0)) * 0.16;
    const bodyY = cover ? -2 : -8;
    const headY = cover ? -30 : -43;
    const torsoW = (profile.build === 'thin' ? 25 : profile.build === 'bare' ? 31 : 35) * scale;
    const torsoH = (profile.build === 'coat' ? 44 : profile.build === 'large' ? 43 : 38) * scale;
    container.setAngle(lean);

    container.add(this.add.ellipse(0, -10, 48 * scale, 64 * scale, ally ? colors.teal : colors.crimson, ally ? 0.045 : 0.055));
    container.add(this.add.line(-8 * scale, bodyY + 19, 0, 0, -15 * scale, 32, dark, 0.98).setLineWidth(5 * scale));
    container.add(this.add.line(8 * scale, bodyY + 19, 0, 0, 14 * scale, 32, dark, 0.98).setLineWidth(5 * scale));
    container.add(this.add.ellipse(-15 * scale, 32, 10 * scale, 5 * scale, colors.charcoal, 0.9));
    container.add(this.add.ellipse(14 * scale, 32, 10 * scale, 5 * scale, colors.charcoal, 0.9));

    if (profile.build === 'bare') {
      container.add(this.add.ellipse(0, bodyY - 2, torsoW * 0.9, torsoH * 1.05, 0x9b6a48, 0.98).setStrokeStyle(2, dark, 0.9));
      container.add(this.add.line(-10 * scale, bodyY - 12, 0, 0, 20 * scale, 24 * scale, accent, 0.75).setLineWidth(2));
    } else {
      container.add(this.add.rectangle(0, bodyY, torsoW, torsoH, coat, 0.98).setStrokeStyle(2, dark, 0.92));
      container.add(this.add.polygon(0, bodyY - torsoH * 0.1, [
        -torsoW * 0.42, -torsoH * 0.38,
        0, -torsoH * 0.18,
        torsoW * 0.42, -torsoH * 0.38,
        torsoW * 0.24, torsoH * 0.38,
        0, torsoH * 0.48,
        -torsoW * 0.24, torsoH * 0.38,
      ], coat, 0.34).setStrokeStyle(1, colors.bone, 0.12));
      container.add(this.add.rectangle(-torsoW * 0.22, bodyY, 4 * scale, torsoH * 0.78, accent, 0.8));
      container.add(this.add.rectangle(torsoW * 0.21, bodyY, 3 * scale, torsoH * 0.66, accent, 0.5));
      container.add(this.add.circle(0, bodyY + torsoH * 0.02, 2.1 * scale, colors.brassLight, 0.86));
      container.add(this.add.circle(0, bodyY + torsoH * 0.24, 1.7 * scale, colors.brassLight, 0.68));
    }

    container.add(this.add.line(-torsoW * 0.55, bodyY - 9, 0, 0, -18 * scale, bodyY + 9, dark, 0.98).setLineWidth(4 * scale));
    container.add(this.add.line(torsoW * 0.55, bodyY - 9, 0, 0, 18 * scale, bodyY + 9, dark, 0.98).setLineWidth(4 * scale));
    this.addRefinedProp(container, profile, accent, dark, scale, facing);

    container.add(this.add.circle(0, headY, 11.5 * scale, colors.parchment, 0.98).setStrokeStyle(2, dark, 0.95));
    container.add(this.add.circle(-4 * scale, headY - 2 * scale, 1.4 * scale, colors.charcoal, 0.95));
    container.add(this.add.circle(4 * scale, headY - 2 * scale, 1.4 * scale, colors.charcoal, 0.95));
    container.add(this.add.line(-4 * scale, headY + 5 * scale, 0, 0, 8 * scale, 0, colors.woodDark, 0.58).setLineWidth(1));
    this.addRefinedHeadgear(container, profile, headY, accent, dark, scale);
    this.addRefinedMark(container, profile, headY, bodyY, dark, scale);
    this.addRefinedWeapon(container, profile, unit, stance, ally, action, scale);
    this.addRefinedStatusBadges(container, unit, profile, stance, ally, scale);
    if (ally) this.addStanceRibbon(container, unit.stance, stance.accent);
  }

  addRefinedProp(container, profile, accent, dark, scale, facing) {
    if (profile.prop === 'satchel') container.add(this.add.rectangle(17 * facing, 5, 12 * scale, 16 * scale, colors.woodDark, 0.96).setStrokeStyle(1, accent, 0.85));
    if (profile.prop === 'pouches') container.add(this.add.rectangle(-15 * facing, 13, 22 * scale, 8 * scale, colors.brass, 0.88).setStrokeStyle(1, dark, 0.9));
    if (profile.prop === 'tools') {
      container.add(this.add.rectangle(17 * facing, 5, 12 * scale, 22 * scale, colors.teal, 0.72).setStrokeStyle(1, dark));
      container.add(this.add.line(17 * facing, -6, 0, 0, 0, 22, colors.brassLight, 0.5).setLineWidth(1));
    }
    if (profile.prop === 'spyglass' || profile.prop === 'telescope') {
      const long = profile.prop === 'telescope';
      container.add(this.add.line(15 * facing, long ? -19 : 5, 0, 0, (long ? 33 : 26) * facing, long ? -12 : 9, colors.brass, 0.95).setLineWidth(long ? 4 : 3));
      container.add(this.add.circle((long ? 36 : 28) * facing, long ? -13 : 9, 3, colors.brassLight, 0.95).setStrokeStyle(1, dark));
    }
    if (profile.prop === 'chains') container.add(this.add.line(-18, -11, 0, 0, 35, 28, colors.brass, 0.62).setLineWidth(2));
    if (profile.prop === 'trophies') container.add(this.add.circle(17, -18, 4, colors.brassLight, 0.82).setStrokeStyle(1, dark));
    if (profile.prop === 'barnacles') {
      container.add(this.add.circle(-13, -18, 4, 0x9fb2ad, 0.82).setStrokeStyle(1, dark));
      container.add(this.add.circle(12, 3, 3, 0x9fb2ad, 0.74).setStrokeStyle(1, dark));
    }
  }

  addRefinedHeadgear(container, profile, headY, accent, dark, scale) {
    if (profile.hat === 'tricorn') {
      container.add(this.add.polygon(0, headY - 14 * scale, [-25 * scale, 5 * scale, -7 * scale, -6 * scale, 0, -12 * scale, 7 * scale, -6 * scale, 25 * scale, 5 * scale, 12 * scale, 9 * scale, -12 * scale, 9 * scale], dark, 1).setStrokeStyle(1, accent, 0.5));
      container.add(this.add.rectangle(0, headY - 9 * scale, 30 * scale, 4 * scale, accent, 0.86));
    } else if (profile.hat === 'officer') {
      container.add(this.add.rectangle(0, headY - 14 * scale, 28 * scale, 9 * scale, accent, 0.95).setStrokeStyle(1, dark));
      container.add(this.add.rectangle(0, headY - 8 * scale, 34 * scale, 4 * scale, dark, 0.95));
    } else if (profile.hat === 'bandana') {
      container.add(this.add.rectangle(0, headY - 12 * scale, 28 * scale, 6 * scale, colors.crimson, 0.96));
      container.add(this.add.triangle(14 * scale, headY - 11 * scale, 0, 0, 18 * scale, 4 * scale, 23 * scale, 12 * scale, colors.crimson, 0.9));
    } else if (profile.hat === 'hood') {
      container.add(this.add.polygon(0, headY - 3 * scale, [-17 * scale, 14 * scale, -9 * scale, -15 * scale, 0, -21 * scale, 9 * scale, -15 * scale, 17 * scale, 14 * scale], dark, 0.95).setStrokeStyle(1, accent, 0.34));
    } else if (profile.hat === 'mask') {
      container.add(this.add.rectangle(0, headY + 1, 23 * scale, 11 * scale, dark, 0.95));
    } else if (profile.hat === 'goggles') {
      container.add(this.add.rectangle(0, headY - 7 * scale, 25 * scale, 5 * scale, dark, 0.96));
      container.add(this.add.circle(-6 * scale, headY - 6 * scale, 4 * scale, colors.brassLight, 0.95).setStrokeStyle(1, dark));
      container.add(this.add.circle(6 * scale, headY - 6 * scale, 4 * scale, colors.brassLight, 0.95).setStrokeStyle(1, dark));
    } else if (profile.hair) {
      container.add(this.add.arc(0, headY - 4 * scale, 11 * scale, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(335), false).setStrokeStyle(4 * scale, profile.hair, 0.92));
    }
  }

  addRefinedMark(container, profile, headY, bodyY, dark, scale) {
    if (profile.mark === 'scar') container.add(this.add.line(4 * scale, headY - 5 * scale, 0, 0, 7 * scale, 7 * scale, colors.crimson, 0.9).setLineWidth(1));
    if (profile.mark === 'scars') container.add(this.add.line(-7 * scale, headY + 2 * scale, 0, 0, 15 * scale, -4 * scale, colors.crimson, 0.65).setLineWidth(1));
    if (profile.mark === 'burns') container.add(this.add.circle(-5 * scale, headY + 4 * scale, 4 * scale, colors.ember, 0.46));
    if (profile.mark === 'tattoos') {
      container.add(this.add.line(-10 * scale, bodyY - 8, 0, 0, 7 * scale, 8, dark, 0.55).setLineWidth(2));
      container.add(this.add.circle(9 * scale, bodyY + 3, 2.5 * scale, dark, 0.48));
    }
  }

  addRefinedWeapon(container, profile, unit, stance, ally, action, scale) {
    const weapons = profile.weapons || [];
    const facing = ally ? -1 : 1;
    const lift = stance.weaponLift + (action === 'melee' ? -14 : action === 'fire' ? -9 : 0);
    const steel = 0xdfe8e2;
    if (weapons.includes('musket') || weapons.includes('rifle')) {
      container.add(this.add.line(13 * facing, -20 + lift, 0, 0, 44 * facing, -14 + lift, colors.woodDark, 1).setLineWidth(5 * scale));
      container.add(this.add.line(37 * facing, -15 + lift, 0, 0, 22 * facing, -3, 0x1b1d1f, 1).setLineWidth(2));
      if (action === 'fire') container.add(this.add.circle(57 * facing, -30 + lift, 8, colors.brassLight, 0.78));
    }
    if (weapons.includes('pistol')) {
      container.add(this.add.line(-14 * facing, -19, 0, 0, -30 * facing, -27, 0x1b1d1f, 1).setLineWidth(4));
      if (action === 'fire') container.add(this.add.circle(-41 * facing, -31, 6, colors.brassLight, 0.75));
    }
    if (weapons.includes('cutlass') || weapons.includes('saber')) {
      container.add(this.add.line(14 * facing, -9, 0, 0, 35 * facing, -32 + lift, steel, 1).setLineWidth(3));
      container.add(this.add.circle(14 * facing, -9, 4, colors.brass, 0.94));
      if (action === 'melee') container.add(this.add.arc(24 * facing, -24, 29, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(318), false).setStrokeStyle(3, colors.brassLight, 0.48));
    }
    if (weapons.includes('hooks')) {
      container.add(this.add.arc(-18, -5, 17, Phaser.Math.DegToRad(250), Phaser.Math.DegToRad(70), false).setStrokeStyle(3, steel, 1));
      container.add(this.add.arc(18, -5, 17, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(290), false).setStrokeStyle(3, steel, 1));
    }
    if (weapons.includes('shield')) container.add(this.add.rectangle(-22 * facing, -7, 19 * scale, 31 * scale, profile.palette[2] || colors.charcoal, 0.96).setStrokeStyle(2, colors.brass));
    if (weapons.includes('bomb')) container.add(this.add.circle(20 * facing, -3, 8 * scale, colors.charcoal, 0.98).setStrokeStyle(2, colors.ember));
    if (weapons.includes('torch')) {
      container.add(this.add.line(18 * facing, -3, 0, 0, 31 * facing, -31, colors.woodDark, 1).setLineWidth(4));
      container.add(this.add.circle(33 * facing, -34, 8, colors.ember, 0.92));
      container.add(this.add.circle(35 * facing, -38, 4, colors.brassLight, 0.82));
    }
    if (weapons.includes('knives') || weapons.includes('daggers')) {
      container.add(this.add.line(-17, -4, 0, 0, -32, -18, steel, 1).setLineWidth(3));
      container.add(this.add.line(17, -4, 0, 0, 32, -18, steel, 1).setLineWidth(3));
    }
    if (weapons.includes('hook')) {
      container.add(this.add.line(18 * facing, -4, 0, 0, 42 * facing, -35, colors.woodDark, 1).setLineWidth(5));
      container.add(this.add.arc(45 * facing, -37, 15, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(300), false).setStrokeStyle(4, steel, 1));
    }
    if (weapons.includes('axe')) {
      container.add(this.add.line(17 * facing, -2, 0, 0, 43 * facing, -38, colors.woodDark, 1).setLineWidth(5));
      container.add(this.add.triangle(47 * facing, -42, 0, -12, 16 * facing, 0, 0, 12, 0xb9c4cf, 1).setStrokeStyle(1, profile.palette[2] || colors.charcoal));
    }
    if (weapons.includes('breastplate')) container.add(this.add.rectangle(0, -9, 24 * scale, 25 * scale, 0xb9c4cf, 0.26).setStrokeStyle(1, colors.brass, 0.72));
  }

  addRefinedStatusBadges(container, unit, profile, stance, ally, scale) {
    const accent = stance.accent;
    if (unit.role === 'Captain' || profile.posture === 'command') {
      container.add(this.add.line(-21 * scale, -31 * scale, 0, 0, -34 * scale, -48 * scale, accent, 0.88).setLineWidth(3));
      container.add(this.add.triangle(-36 * scale, -50 * scale, 0, -6, 0, 6, -17 * scale, 0, ally ? colors.teal : colors.crimson, 0.92).setStrokeStyle(1, colors.charcoal, 0.7));
    }
    if (unit.statuses?.includes('Burning')) container.add(this.add.circle(23, 9, 7, colors.ember, 0.38));
    if (unit.statuses?.includes('Rallying')) container.add(this.add.arc(0, -56, 18, Phaser.Math.DegToRad(212), Phaser.Math.DegToRad(328), false).setStrokeStyle(3, colors.teal, 0.78));
    if (unit.statuses?.includes('Suppressed')) container.add(this.add.line(-22, -56, 0, 0, 44, 0, colors.smoke, 0.58).setLineWidth(3));
  }

  addRefinedCreatureSprite(container, unit, profile, stance, ally, action, direction = null) {
    const [body, accent, dark] = profile.palette;
    const flash = action === 'hit' ? colors.crimson : body;
    const big = ['giant-bird', 'shark', 'turtle', 'croc'].includes(profile.build);
    const scale = profile.build === 'giant-bird' ? 1.18 : big ? 1.04 : 1;
    const facing = direction === 'left' ? -1 : 1;
    const stride = action === 'move' ? 5 : 0;
    const leg = (x, y, footX, footY, width = 4, color = dark, alpha = 0.92) => {
      container.add(this.add.line(x * facing, y, 0, 0, (footX - x) * facing, footY - y, color, alpha).setLineWidth(width));
      container.add(this.add.ellipse(footX * facing, footY, width * 2.1, width * 0.95, color, alpha));
    };
    const eye = (x, y, r = 2.2) => {
      container.add(this.add.circle(x * facing, y, r + 1.2, colors.bone, 0.92).setStrokeStyle(1, dark, 0.8));
      container.add(this.add.circle(x * facing, y, r, colors.charcoal, 0.96));
    };
    const stripe = (x1, y1, x2, y2, alpha = 0.45, width = 2) => container.add(this.add.line(0, 0, x1 * facing, y1, x2 * facing, y2, accent, alpha).setLineWidth(width));
    container.add(this.add.ellipse(0, -2, 64 * scale, 38 * scale, colors.charcoal, 0.13));
    if (profile.build === 'bird' || profile.build === 'giant-bird') {
      const giant = profile.build === 'giant-bird';
      const wing = giant ? 45 : 34;
      leg(-5 * scale, -1, -10 * scale - stride, 14 * scale, 3, dark, 0.86);
      leg(6 * scale, -1, 12 * scale + stride, 14 * scale, 3, dark, 0.86);
      container.add(this.add.polygon(-9 * scale, -16, [-wing * scale, -20 * scale, -5 * scale, -12 * scale, -29 * scale, 14 * scale], accent, 0.94).setStrokeStyle(2, dark, 0.62));
      container.add(this.add.polygon(9 * scale, -16, [wing * scale, -20 * scale, 5 * scale, -12 * scale, 29 * scale, 14 * scale], accent, 0.94).setStrokeStyle(2, dark, 0.62));
      container.add(this.add.ellipse(0, -14, 32 * scale, 25 * scale, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.circle(16 * facing * scale, -18, 10 * scale, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.triangle(25 * facing * scale, -16, 0, -5, 18 * facing * scale, 0, 0, 7, colors.brassLight, 1).setStrokeStyle(1, dark, 0.45));
      eye(17 * scale, -21, giant ? 2.2 : 1.8);
      stripe(-20, -20, -34, -7, 0.32, 2);
      stripe(20, -20, 34, -7, 0.32, 2);
      return;
    }
    if (profile.build === 'crab') {
      [-24, -14, -5, 5, 14, 24].forEach((lx, index) => {
        const side = lx < 0 ? -1 : 1;
        const kick = (index % 2 ? stride : -stride) * 0.45;
        container.add(this.add.line(lx, 9, 0, 0, side * (14 + Math.abs(kick)), 11 + Math.abs(kick) * 0.3, dark, 0.9).setLineWidth(3));
        container.add(this.add.line(lx + side * (14 + Math.abs(kick)), 20, 0, 0, side * 9, 4, dark, 0.82).setLineWidth(3));
      });
      container.add(this.add.ellipse(0, 0, 48, 31, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.rectangle(0, -3, 30, 10, accent, 0.22).setStrokeStyle(1, dark, 0.24));
      container.add(this.add.circle(-33, -2, 13, accent, 0.95).setStrokeStyle(2, dark));
      container.add(this.add.circle(33, -2, 13, accent, 0.95).setStrokeStyle(2, dark));
      container.add(this.add.line(-41, -3, 0, 0, -12, -10, colors.bone, 0.38).setLineWidth(2));
      container.add(this.add.line(41, -3, 0, 0, 12, -10, colors.bone, 0.38).setLineWidth(2));
      eye(-8, -11, 1.8);
      eye(8, -11, 1.8);
      return;
    }
    if (['croc', 'shark', 'seal', 'turtle'].includes(profile.build)) {
      const long = profile.build === 'shark' ? 76 : profile.build === 'turtle' ? 58 : 66;
      if (profile.build === 'croc' || profile.build === 'turtle') {
        leg(-20 * scale, 4, -28 * scale - stride, 19 * scale, 5, dark, 0.88);
        leg(14 * scale, 5, 25 * scale + stride, 18 * scale, 5, dark, 0.88);
      }
      if (profile.build === 'seal') {
        container.add(this.add.triangle(-18 * facing, 8, -17 * facing, 0, -2 * facing, 13, 14 * facing, 4, accent, 0.78).setStrokeStyle(1, dark, 0.45));
        container.add(this.add.triangle(12 * facing, 9, -12 * facing, 1, 2 * facing, 14, 17 * facing, 4, accent, 0.62).setStrokeStyle(1, dark, 0.35));
      }
      if (profile.build === 'shark') {
        container.add(this.add.polygon(0, 0, [-37 * facing * scale, 0, -52 * facing * scale, -14 * scale, -47 * facing * scale, 0, -52 * facing * scale, 14 * scale], accent, 0.92).setStrokeStyle(2, dark, 0.6));
        container.add(this.add.polygon(0, 0, [
          -38 * facing * scale, -4 * scale,
          -22 * facing * scale, -14 * scale,
          10 * facing * scale, -16 * scale,
          38 * facing * scale, -9 * scale,
          48 * facing * scale, 0,
          38 * facing * scale, 9 * scale,
          10 * facing * scale, 16 * scale,
          -22 * facing * scale, 14 * scale,
        ], flash, 1).setStrokeStyle(2, dark));
        container.add(this.add.polygon(0, 0, [-6 * facing * scale, -13 * scale, 8 * facing * scale, -34 * scale, 18 * facing * scale, -11 * scale], accent, 0.96).setStrokeStyle(1, dark, 0.65));
        container.add(this.add.polygon(0, 0, [-3 * facing * scale, 10 * scale, 14 * facing * scale, 30 * scale, 22 * facing * scale, 7 * scale], accent, 0.82).setStrokeStyle(1, dark, 0.5));
        container.add(this.add.ellipse(14 * facing * scale, 4 * scale, 42 * scale, 10 * scale, 0xc8ced1, 0.34));
        container.add(this.add.triangle(46 * facing * scale, -1, -4 * facing * scale, -11 * scale, 9 * facing * scale, 0, -4 * facing * scale, 11 * scale, flash, 1).setStrokeStyle(2, dark, 0.75));
        container.add(this.add.line(35 * facing * scale, 4 * scale, 0, 0, 11 * facing * scale, 0, colors.bone, 0.66).setLineWidth(1));
        eye(31 * scale, -6 * scale, 2);
        [18, 23, 28].forEach((gx) => stripe(gx, 0, gx + 2, 10, 0.42, 1));
        if (profile.prop === 'harpoons') {
          container.add(this.add.line(-7 * facing, -18, 0, 0, 28 * facing, 29, colors.woodDark, 1).setLineWidth(3));
          container.add(this.add.triangle(31 * facing, 32, -4 * facing, -3, 7 * facing, 0, -4 * facing, 3, colors.brassLight, 1));
        }
        return;
      }
      container.add(this.add.ellipse(0, 0, long * scale, 28 * scale, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.triangle((long * scale / 2 - 4) * facing, 0, 0, -12 * scale, 24 * facing * scale, 0, 0, 12 * scale, accent, 0.94));
      if (profile.build === 'croc') {
        container.add(this.add.rectangle(24 * facing, -2, 31 * scale, 13 * scale, flash, 0.98).setStrokeStyle(2, dark));
        container.add(this.add.line(15 * facing, -3, 0, 0, 36 * facing, 0, colors.bone, 0.75).setLineWidth(2));
        eye(29 * scale, -9, 1.9);
        stripe(-20, -10, -12, 8, 0.35, 2);
        stripe(-5, -11, 4, 8, 0.28, 2);
      }
      if (profile.build === 'turtle') {
        container.add(this.add.ellipse(-7, -4, 40, 22, accent, 0.45).setStrokeStyle(2, dark, 0.55));
        container.add(this.add.circle(31 * facing, -3, 9, flash, 1).setStrokeStyle(2, dark));
        eye(34, -6, 1.6);
        if (profile.prop === 'coral') {
          container.add(this.add.circle(-15, -18, 5, colors.teal, 0.82).setStrokeStyle(1, dark));
          container.add(this.add.line(-15, -19, 0, 0, -7, -15, colors.brassLight, 0.65).setLineWidth(2));
        }
      }
      if (profile.build === 'seal') {
        container.add(this.add.circle(29 * facing, -8, 12, flash, 1).setStrokeStyle(2, dark));
        eye(33, -12, 1.8);
        container.add(this.add.line(35 * facing, -3, 0, 0, 44 * facing, -7, colors.bone, 0.6).setLineWidth(1));
        container.add(this.add.line(35 * facing, -1, 0, 0, 44 * facing, 2, colors.bone, 0.55).setLineWidth(1));
      }
      return;
    }
    if (profile.build === 'boar') {
      leg(-18, 5, -24 - stride, 21, 5, dark, 0.94);
      leg(-4, 6, -5 + stride, 22, 5, dark, 0.84);
      leg(12, 5, 19 + stride, 21, 5, dark, 0.92);
      leg(23, 2, 30 - stride, 19, 5, dark, 0.78);
      container.add(this.add.ellipse(-3 * facing, -2, 53, 31, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.circle(24 * facing, -7, 15, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.rectangle(27 * facing, -2, 14, 10, accent, 0.42).setStrokeStyle(1, dark, 0.4));
      container.add(this.add.triangle(35 * facing, -5, 0, -8, 22 * facing, 0, 0, 8, colors.bone, 1));
      container.add(this.add.triangle(26 * facing, -4, 0, -8, 17 * facing, 0, 0, 8, colors.bone, 1));
      container.add(this.add.triangle(17 * facing, -21, -5 * facing, 0, 5 * facing, -10, 14 * facing, 0, dark, 0.9));
      eye(24, -11, 1.8);
      return;
    }
    const catLike = profile.build === 'cat' || profile.build === 'beast';
    if (catLike) {
      leg(-18, 4, -26 - stride, 18, 4, dark, 0.9);
      leg(-3, 6, -1 + stride, 20, 4, dark, 0.8);
      leg(12, 5, 19 + stride, 18, 4, dark, 0.88);
      leg(24, -2, 31 - stride, 13, 4, dark, 0.78);
    }
    if (profile.build === 'monkey') {
      leg(-9, -4, -18 - stride, 19, 4, dark, 0.88);
      leg(8, -4, 15 + stride, 19, 4, dark, 0.88);
      container.add(this.add.line(-12 * facing, -10, 0, 0, -25 * facing, 6, dark, 0.82).setLineWidth(4));
      container.add(this.add.line(12 * facing, -10, 0, 0, 25 * facing, 6, dark, 0.82).setLineWidth(4));
    }
    container.add(this.add.ellipse(0, 0, catLike ? 49 : 31, catLike ? 22 : 34, flash, 1).setStrokeStyle(2, dark));
    container.add(this.add.circle((catLike ? 23 : 0) * facing, catLike ? -8 : -28, catLike ? 13 : 11, flash, 1).setStrokeStyle(2, dark));
    if (catLike) {
      container.add(this.add.triangle(21 * facing, -22, -5 * facing, 0, 3 * facing, -11, 10 * facing, 0, dark, 0.88));
      container.add(this.add.line(-22 * facing, -2, 0, 0, -38 * facing, -11, dark, 0.85).setLineWidth(4));
      eye(27, -11, 1.6);
    }
    if (profile.build === 'monkey') {
      container.add(this.add.circle(0, -28, 12, flash, 1).setStrokeStyle(2, dark));
      eye(-4, -31, 1.5);
      eye(4, -31, 1.5);
      container.add(this.add.arc(-18, 4, 26, Phaser.Math.DegToRad(120), Phaser.Math.DegToRad(310), false).setStrokeStyle(5, colors.ember, 0.95));
    }
  }

  addRankAndStatusDetails(container, unit, profile, stance, ally, scale) {
    const accent = stance.accent;
    if (unit.role === 'Captain' || profile.posture === 'command') {
      container.add(this.add.line(-22 * scale, -30 * scale, 0, 0, -36 * scale, -48 * scale, accent, 0.92).setLineWidth(3));
      container.add(this.add.triangle(-38 * scale, -50 * scale, 0, -6, 0, 6, -18 * scale, 0, ally ? colors.teal : colors.crimson, 0.95)
        .setStrokeStyle(1, colors.charcoal, 0.7));
    }
    if (unit.statuses?.includes('Burning')) container.add(this.add.circle(22, 8, 8, colors.ember, 0.42));
    if (unit.statuses?.includes('Rallying')) container.add(this.add.arc(0, -55, 18, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false).setStrokeStyle(3, colors.teal, 0.86));
    if (unit.statuses?.includes('Suppressed')) container.add(this.add.line(-24, -55, 0, 0, 48, 0, colors.smoke, 0.7).setLineWidth(3));
  }

  addHeadgear(container, profile, headY, accent, dark, scale) {
    if (profile.hat === 'tricorn') {
      container.add(this.add.triangle(0, headY - 14 * scale, -24 * scale, 4, 0, -11 * scale, 24 * scale, 4, dark, 1));
      container.add(this.add.rectangle(0, headY - 10 * scale, 34 * scale, 5, accent, 0.85));
      container.add(this.add.circle(-11 * scale, headY - 12 * scale, 2, colors.brassLight, 0.9));
      container.add(this.add.circle(11 * scale, headY - 12 * scale, 2, colors.brassLight, 0.9));
    } else if (profile.hat === 'officer') {
      container.add(this.add.rectangle(0, headY - 14 * scale, 28 * scale, 9, accent, 0.95).setStrokeStyle(1, dark));
      container.add(this.add.rectangle(0, headY - 9 * scale, 34 * scale, 4, dark, 0.95));
    } else if (profile.hat === 'bandana') {
      container.add(this.add.rectangle(0, headY - 12 * scale, 28 * scale, 6, colors.crimson, 0.95));
      container.add(this.add.triangle(14, headY - 11 * scale, 0, 0, 19, 4, 22, 13, colors.crimson, 0.92));
      container.add(this.add.circle(-8 * scale, headY - 11 * scale, 1.3, colors.brassLight, 0.8));
    } else if (profile.hat === 'hood') {
      container.add(this.add.triangle(0, headY - 18 * scale, -17 * scale, 15 * scale, 17 * scale, 15 * scale, dark, 0.95).setStrokeStyle(1, accent, 0.35));
    } else if (profile.hat === 'mask') {
      container.add(this.add.rectangle(0, headY + 1, 24 * scale, 12 * scale, dark, 0.95));
    } else if (profile.hat === 'goggles') {
      container.add(this.add.rectangle(0, headY - 7 * scale, 25 * scale, 5, dark, 0.96));
      container.add(this.add.circle(-6 * scale, headY - 6 * scale, 4, colors.brassLight, 0.95).setStrokeStyle(1, dark));
      container.add(this.add.circle(6 * scale, headY - 6 * scale, 4, colors.brassLight, 0.95).setStrokeStyle(1, dark));
    }
  }

  addWeapons(container, profile, unit, stance, ally, action, scale) {
    const weaponLift = stance.weaponLift + (action === 'melee' ? -16 : action === 'fire' ? -10 : 0);
    const left = ally ? -1 : 1;
    const dark = profile.palette[2] || colors.charcoal;
    const weapons = profile.weapons || [];
    if (weapons.includes('musket') || weapons.includes('rifle')) {
      container.add(this.add.line(13 * left, -20 + weaponLift, 0, 0, 38 * left, -14 + weaponLift, colors.woodDark, 1).setLineWidth(5));
      container.add(this.add.line(32 * left, -15 + weaponLift, 0, 0, 20 * left, -2, 0x1b1d1f, 1).setLineWidth(2));
      if (action === 'fire') container.add(this.add.circle(56 * left, -34 + weaponLift, 8, colors.brassLight, 0.82));
    }
    if (weapons.includes('pistol')) {
      container.add(this.add.line(-15 * left, -19, 0, 0, -30 * left, -26, 0x1b1d1f, 1).setLineWidth(4));
      if (action === 'fire') container.add(this.add.circle(-42 * left, -31, 6, colors.brassLight, 0.78));
    }
    if (weapons.includes('cutlass') || weapons.includes('saber')) {
      container.add(this.add.line(15 * left, -10, 0, 0, 34 * left, -31 + weaponLift, 0xdfe8e2, 1).setLineWidth(3));
      container.add(this.add.circle(15 * left, -10, 4, colors.brass, 0.95));
      if (action === 'melee') container.add(this.add.arc(22 * left, -22, 28, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(315), false).setStrokeStyle(3, colors.brassLight, 0.6));
    }
    if (weapons.includes('hooks')) {
      container.add(this.add.arc(-18, -4, 16, Phaser.Math.DegToRad(250), Phaser.Math.DegToRad(70), false).setStrokeStyle(3, 0xdfe8e2, 1));
      container.add(this.add.arc(18, -4, 16, Phaser.Math.DegToRad(110), Phaser.Math.DegToRad(290), false).setStrokeStyle(3, 0xdfe8e2, 1));
    }
    if (weapons.includes('shield')) container.add(this.add.rectangle(-20 * left, -8, 18 * scale, 32 * scale, dark, 0.95).setStrokeStyle(2, colors.brass));
    if (weapons.includes('bomb')) container.add(this.add.circle(19 * left, -2, 8, colors.charcoal, 1).setStrokeStyle(2, colors.ember));
    if (weapons.includes('torch')) {
      container.add(this.add.line(19 * left, -3, 0, 0, 31 * left, -30, colors.woodDark, 1).setLineWidth(4));
      container.add(this.add.circle(33 * left, -34, 8, colors.ember, 0.95));
    }
    if (weapons.includes('knives') || weapons.includes('daggers')) {
      container.add(this.add.line(-18, -3, 0, 0, -34, -18, 0xdfe8e2, 1).setLineWidth(3));
      container.add(this.add.line(18, -3, 0, 0, 34, -18, 0xdfe8e2, 1).setLineWidth(3));
    }
    if (weapons.includes('hook')) {
      container.add(this.add.line(18 * left, -4, 0, 0, 42 * left, -35, colors.woodDark, 1).setLineWidth(5));
      container.add(this.add.arc(45 * left, -37, 15, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(300), false).setStrokeStyle(4, 0xdfe8e2, 1));
    }
    if (weapons.includes('axe')) {
      container.add(this.add.line(17 * left, -2, 0, 0, 43 * left, -38, colors.woodDark, 1).setLineWidth(5));
      container.add(this.add.triangle(47 * left, -42, 0, -12, 16 * left, 0, 0, 12, 0xb9c4cf, 1).setStrokeStyle(1, dark));
    }
    if (weapons.includes('breastplate')) container.add(this.add.rectangle(0, -9, 25, 26, 0xb9c4cf, 0.35).setStrokeStyle(1, colors.brass));
  }

  addWildlifeSprite(container, profile, stance, action) {
    const [body, accent, dark] = profile.palette;
    const flash = action === 'hit' ? colors.crimson : body;
    container.add(this.add.ellipse(0, -2, 64, 42, colors.charcoal, 0.18));
    if (profile.build === 'bird' || profile.build === 'giant-bird') {
      const s = profile.build === 'giant-bird' ? 1.35 : 0.9;
      container.add(this.add.ellipse(0, -14, 30 * s, 22 * s, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.triangle(-8, -17, -36 * s, -30 * s, -6, -6, -44 * s, 4, accent, 0.95));
      container.add(this.add.triangle(8, -17, 36 * s, -30 * s, 6, -6, 44 * s, 4, accent, 0.95));
      container.add(this.add.triangle(17 * s, -15, 0, -5, 17 * s, 0, 33 * s, -3, colors.brassLight, 1));
      container.add(this.add.circle(9 * s, -19, 2.2, colors.charcoal, 0.95));
      return;
    }
    if (profile.build === 'crab') {
      container.add(this.add.ellipse(0, 0, 44, 30, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.circle(-31, -2, 12, accent, 1).setStrokeStyle(2, dark));
      container.add(this.add.circle(31, -2, 12, accent, 1).setStrokeStyle(2, dark));
      [-18, -7, 7, 18].forEach((lx) => {
        container.add(this.add.line(lx, 11, 0, 0, lx * 0.5, 13, dark, 0.85).setLineWidth(3));
      });
      return;
    }
    if (profile.build === 'croc' || profile.build === 'shark' || profile.build === 'seal' || profile.build === 'turtle') {
      const long = profile.build === 'shark' ? 70 : profile.build === 'turtle' ? 58 : 62;
      container.add(this.add.ellipse(0, 0, long, 28, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.triangle(long / 2 - 4, 0, 0, -12, 24, 0, 0, 12, accent, 0.95));
      if (profile.build === 'croc') container.add(this.add.line(15, -3, 0, 0, 30, 0, colors.bone, 0.75).setLineWidth(2));
      if (profile.build === 'seal') container.add(this.add.triangle(-18, 10, -16, 0, 0, 12, 16, 0, accent, 0.72));
      if (profile.build === 'shark') container.add(this.add.triangle(-10, -14, -7, 0, 8, -20, 14, 0, accent, 0.88));
      if (profile.prop === 'harpoons') container.add(this.add.line(-8, -18, 0, 0, 18, 28, colors.woodDark, 1).setLineWidth(3));
      if (profile.prop === 'coral') container.add(this.add.circle(-8, -18, 6, colors.teal, 0.85));
      return;
    }
    if (profile.build === 'boar') {
      container.add(this.add.ellipse(0, -2, 52, 30, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.circle(24, -7, 15, flash, 1).setStrokeStyle(2, dark));
      container.add(this.add.triangle(35, -5, 0, -8, 22, 0, 0, 8, colors.bone, 1));
      container.add(this.add.triangle(17, -21, -5, 0, 5, -10, 14, 0, dark, 0.9));
      return;
    }
    const catLike = profile.build === 'cat' || profile.build === 'beast';
    container.add(this.add.ellipse(0, 0, catLike ? 48 : 30, catLike ? 22 : 34, flash, 1).setStrokeStyle(2, dark));
    container.add(this.add.circle(catLike ? 23 : 0, catLike ? -8 : -28, catLike ? 13 : 11, flash, 1).setStrokeStyle(2, dark));
    if (catLike) {
      container.add(this.add.triangle(21, -22, -5, 0, 3, -11, 10, 0, dark, 0.88));
      container.add(this.add.circle(-9, -5, 2, accent, 0.65));
      container.add(this.add.circle(5, 4, 2, accent, 0.55));
    }
    if (profile.build === 'monkey') container.add(this.add.arc(-18, 4, 26, Phaser.Math.DegToRad(120), Phaser.Math.DegToRad(310), false).setStrokeStyle(5, colors.ember, 1));
  }

  addStanceRibbon(container, stanceName, accent) {
    container.add(this.add.rectangle(0, 12, 28, 3, accent, 0.96).setStrokeStyle(1, colors.charcoal, 0.7));
    container.add(this.add.text(0, 15, stanceName.slice(0, 3).toUpperCase(), { ...ui.small, fontSize: '6px', color: '#f3e5c4' }).setOrigin(0.5));
  }

  addUnitLabels(container, unit, active, ally, profile) {
    const label = this.unitShortLabel(unit);
    const beast = isCreatureProfile(profile);
    const large = ['large', 'huge', 'boar', 'croc', 'crab', 'seal', 'shark', 'turtle'].includes(profile.build);
    const labelY = beast ? 18 : 14;
    const hpX = ally ? 21 : large ? -23 : -21;
    const hpY = beast ? -23 : -20;
    const plateColor = ally ? 0x0e3f3d : 0x4b1b17;
    container.add(this.add.rectangle(0, labelY, Math.min(28, Math.max(18, label.length * 3)), 5, plateColor, 0.78).setStrokeStyle(1, ally ? colors.teal : colors.crimson, 0.58));
    container.add(this.add.circle(hpX, hpY, 7, colors.charcoal, 0.88).setStrokeStyle(1, ally ? colors.teal : colors.crimson, 0.84));
    container.add(this.add.text(hpX, hpY - 5, `${unit.hp}`, { ...ui.small, fontSize: '6px', color: '#f3e5c4' }).setOrigin(0.5, 0));
    if (active) {
      container.add(this.add.circle(0, -12, 24, colors.brassLight, 0).setStrokeStyle(2, colors.brassLight, 0.92));
      const arrow = this.add.triangle(0, -22, 0, -7, -7, 3, 7, 3, colors.brassLight, 0.98)
        .setStrokeStyle(1, colors.charcoal, 0.9);
      container.add(arrow);
      this.tweens.add({ targets: arrow, y: -26, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    if (unit.stagger >= 100) container.add(this.add.text(hpX, hpY + 11, 'STG', { ...ui.small, fontSize: '8px', color: '#ffcc77' }).setOrigin(0.5));
  }

  unitShortLabel(unit) {
    const replacements = {
      'The Barnacled Butcher': 'Butcher',
      'Gravewake Captain': 'Gravewake',
      'Navy Sharpshooter': 'Navy',
      'Marine Guard': 'Marine',
      'Cutlass Marine': 'Cutlass',
      'Powder Monkey': 'Powder',
      'Storm Marksman': 'Storm',
      'Powder Saboteur': 'Saboteur',
      'Hook Corsair': 'Hook',
      'Mangrove Crocodile': 'Croc',
      'Saltback Boar': 'Boar',
      'Ironclaw Crab': 'Crab',
      'Hammerjaw Seal': 'Seal',
      'Firetail Monkey': 'Monkey',
    };
    return replacements[unit.name] || unit.name.split(' ')[0].replace(/^The$/, 'Boss');
  }

  animateUnitContainer(container, unit, action, target, ally) {
    if (action === 'move') {
      this.tweens.add({ targets: container, x: target.x, y: target.y, duration: 340, ease: 'Sine.out' });
      this.tweens.add({ targets: container, angle: ally ? 4 : -4, yoyo: true, repeat: 2, duration: 90 });
      return;
    }
    if (action === 'hit') {
      this.tweens.add({ targets: container, x: container.x + (ally ? 8 : -8), alpha: 0.55, yoyo: true, repeat: 2, duration: 70 });
      return;
    }
    if (action === 'fire') {
      this.tweens.add({ targets: container, x: container.x + (ally ? 12 : -12), yoyo: true, duration: 120, ease: 'Back.out' });
      return;
    }
    if (action === 'melee') {
      this.tweens.add({ targets: container, x: container.x + (ally ? -18 : 18), angle: ally ? -8 : 8, yoyo: true, duration: 150, ease: 'Quad.out' });
      return;
    }
    if (action === 'stance') {
      this.tweens.add({ targets: container, scale: 1.16, yoyo: true, duration: 180, ease: 'Sine.inOut' });
      return;
    }
    if (action === 'cover') {
      container.setY(container.y + 2);
      return;
    }
    this.tweens.add({ targets: container, y: container.y - 2, duration: 950 + (unit.name.length % 5) * 80, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  isUnitInCover(unit) {
    const here = terrainAt(unit.pos, this.mapTiles);
    if (here.cover && this.cover.get(`${unit.pos.x},${unit.pos.y}`)?.hp > 0) return true;
    const adjacent = [
      { x: unit.pos.x + 1, y: unit.pos.y },
      { x: unit.pos.x - 1, y: unit.pos.y },
      { x: unit.pos.x, y: unit.pos.y + 1 },
      { x: unit.pos.x, y: unit.pos.y - 1 },
    ];
    return adjacent.some((pos) => this.cover.get(`${pos.x},${pos.y}`)?.hp > 0);
  }

  setUnitVisualAction(unit, type, duration = 420, extra = {}) {
    unit.visualAction = { type, until: this.time.now + duration, ...extra };
    this.time.delayedCall(duration, () => {
      if (unit.visualAction?.type === type && unit.visualAction.until <= this.time.now + 20) {
        unit.visualAction = null;
        if (this.sys?.isActive()) this.draw();
      }
    });
  }

  attackAnimationFor(unit, gap) {
    const profile = spriteProfileFor(unit);
    const weapons = profile.weapons || [];
    const hasMelee = weapons.some((weapon) => ['cutlass', 'saber', 'hooks', 'knives', 'daggers', 'hook', 'axe', 'claws', 'jaws', 'tusks', 'fangs', 'beak'].includes(weapon));
    const hasRanged = weapons.some((weapon) => ['musket', 'rifle', 'pistol', 'bomb', 'torch', 'throw'].includes(weapon));
    if (hasMelee && (gap <= 2 || !hasRanged)) return 'melee';
    if (hasRanged) return 'fire';
    return gap >= 3 || unit.stance === 'Marksman' ? 'fire' : 'melee';
  }

  drawHud() {
    drawPanel(this, 576, 110, 360, 586, 0.94);
    this.add.text(596, 132, 'Command Board', ui.h2);
    this.add.text(596, 160, `${this.encounter.title} | ${this.turn === 'prep' ? 'Preparation' : this.turn === 'crew' ? 'Crew Turn' : 'Enemy Turn'}`, { ...ui.label, fontSize: '12px' });
    this.drawMomentum();
    this.drawCrewList();
    this.drawFieldIntel();
    this.drawCommands();
    this.drawLog();
  }

  drawMomentum() {
    this.add.rectangle(596, 184, 316, 58, colors.charcoal, 0.48).setOrigin(0).setStrokeStyle(1, colors.brass, 0.18);
    this.add.text(608, 198, `Momentum ${this.momentum}/100`, ui.label);
    this.add.rectangle(710, 203, 184, 11, colors.navyDark, 1).setOrigin(0);
    this.add.rectangle(710, 203, Math.min(184, this.momentum * 1.84), 11, this.surgeActive ? colors.ember : colors.teal, 1).setOrigin(0);
    this.add.text(608, 220, this.surgeActive ? 'Surge active: next attacks gain damage and stagger.' : 'Flanks, range-limited rallies, and objectives build Surge.', { ...ui.small, fontSize: '9px', wordWrap: { width: 286 } });
  }

  drawCrewList() {
    this.add.text(596, 252, 'Crew', ui.label);
    this.crew.forEach((unit, index) => {
      const y = 274 + index * 43;
      const active = this.turn === 'crew' && index === this.activeIndex;
      const row = this.add.rectangle(596, y, 148, 34, active ? colors.wood : colors.charcoal, active ? 0.82 : 0.52).setOrigin(0).setStrokeStyle(1, active ? colors.brass : colors.wood);
      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => this.selectCrewForIntel(index));
      const nextSkill = nextLockedSkill(unit);
      this.add.text(606, y + 5, `${unit.name.split(' ')[0]}  L${unit.level}  ${unit.hp}/${unit.maxHp}`, { ...ui.small, fontSize: '11px' });
      this.add.text(606, y + 19, nextSkill ? `${unit.xp}/${xpForNextLevel(unit.level)} XP | L${nextSkill.level} ${nextSkill.name}` : `${unit.xp} XP | all skills`, { ...ui.small, fontSize: '9px' });
    });
  }

  drawFieldIntel() {
    drawPanel(this, 758, 252, 154, 154, 0.78);
    this.add.text(772, 268, 'Field Intel', ui.label);
    const lines = this.getIntelLines();
    lines.slice(0, 8).forEach((line, index) => {
      const value = line.length > 23 ? `${line.slice(0, 20)}...` : line;
      const text = this.add.text(772, 292 + index * 14, value, { ...ui.small, fontSize: '9px', fixedWidth: 124 });
      text.setMaxLines(1);
    });
  }

  getIntelLines() {
    const item = this.inspect;
    if (!item || item.type === 'objective') {
      return [
        `Objective: ${this.objective.label}`,
        `HP: ${this.objective.hp}/${this.objective.maxHp}`,
        'Pressure: enemy sabotage',
        'Risk: explosions and burning',
        'Plan: hold Mid',
      ];
    }
    if (item.type === 'terrain') {
    const t = terrainAt(item.pos, this.mapTiles);
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
    if (!enemy) {
      const weapon = crewWeaponCatalog[unit.weapon] || crewWeaponCatalog.captainsCutlass;
      return [
        unit.name,
        `HP: ${unit.hp}/${unit.maxHp}`,
        `Actions: ${unit.actions ?? 0}`,
        `Status: ${statusLine(unit)}`,
        `Weapon: ${weapon.name}`,
        `Range: ${weapon.range}`,
        `Rally AoE: R${this.rallyRangeFor(unit)}`,
      ];
    }
    return [
      unit.name,
      `Level ${unit.level || 1}  HP: ${unit.hp}/${unit.maxHp}`,
      unit.stance ? `Stance: ${unit.stance}` : 'Type: Wildlife',
      `Status: ${statusLine(unit)}`,
      this.turn === 'enemy' && this.isStrongEnemyIntent(unit) ? `Heavy: ${unit.intent}` : 'Intent: hidden',
      `Stagger: ${unit.stagger || 0}/100`,
      `Weak: ${unit.weakness}`,
    ];
  }

  drawCommands() {
    const x = 596;
    const y = 426;
    this.add.rectangle(x, y - 10, 316, 132, colors.charcoal, 0.42).setOrigin(0).setStrokeStyle(1, colors.brass, 0.16);
    this.add.text(x, y, 'Actions', ui.label);
    if (this.turn === 'prep') {
      this.drawCommandButton(x + 8, y + 28, 92, 'Begin', 'begin', () => this.beginBattle(), colors.brass);
      this.drawCommandButton(x + 112, y + 28, 92, 'Stance', 'stance', () => this.cycleActiveStance(), colors.teal);
      this.drawCommandButton(x + 216, y + 28, 92, 'Next', 'next', () => this.nextPrepCrew(), colors.wood);
      this.add.text(x + 8, y + 72, 'Prep locks movement but allows Field Intel and opening stance changes.', {
        ...ui.small,
        wordWrap: { width: 288 },
        fontSize: '10px',
      });
      return;
    }
    if (this.turn !== 'crew') {
      this.add.text(x + 8, y + 34, 'Enemy action resolving...', ui.small);
      return;
    }
    this.drawCommandButton(x + 8, y + 28, 92, 'Attack', 'attack', () => this.selectCommand('attack'), colors.crimson);
    this.drawCommandButton(x + 112, y + 28, 92, 'Move', 'move', () => this.selectCommand('move'), colors.teal);
    this.drawCommandButton(x + 216, y + 28, 92, 'Stance', 'stance', () => this.cycleActiveStance(), colors.brass);
    this.drawCommandButton(x + 8, y + 70, 92, 'Rally', 'rally', () => this.selectCommand('rally'), colors.teal);
    this.drawCommandButton(x + 112, y + 70, 92, 'Surge', 'surge', () => this.selectCommand('surge'), colors.ember);
    this.drawCommandButton(x + 216, y + 70, 92, 'End', 'end', () => this.endCrewUnit(), colors.wood);
    this.add.text(x + 8, y + 113, `Selected: ${this.command || 'inspect'} | Click a tile or target.`, { ...ui.small, fontSize: '9px', fixedWidth: 292 });
  }

  drawCommandButton(x, y, width, label, actionId, onClick, tone) {
    const enabled = this.isTutorialActionAllowed(actionId);
    const handler = enabled ? onClick : () => this.blockTutorialAction(actionId);
    button(this, x, y, width, label, handler, enabled ? tone : 0x30363a);
  }

  selectCommand(command) {
    if (command === 'rally' && this.isScriptedTutorialBattle()) {
      this.rally();
      return;
    }
    if (command === 'surge' && this.isScriptedTutorialBattle()) {
      this.activateSurge();
      return;
    }
    this.command = command;
    this.log.push(`${command[0].toUpperCase()}${command.slice(1)} targeting preview shown.`);
    this.draw();
  }

  drawLog() {
    drawPanel(this, 596, 584, 316, 84, 0.7);
    this.add.text(610, 598, 'Battle Log', { ...ui.label, fontSize: '12px' });
    this.log.slice(-3).forEach((entry, index) => {
      const line = entry.length > 54 ? `${entry.slice(0, 51)}...` : entry;
      const text = this.add.text(610, 620 + index * 14, line, { ...ui.small, fontSize: '10px', fixedWidth: 284 });
      text.setMaxLines(1);
    });
  }

  isScriptedTutorialBattle() {
    return isTutorialActive(this.state) && this.scene.key === 'BattleScene' && [
      'battlePrep',
      'battleSkill',
      'battleStance',
      'battleBegin',
      'battleTarget',
      'battleMove',
      'battleRally',
      'battleSurge',
      'battleFinish',
    ].includes(this.state.tutorial.step);
  }

  isTutorialActionAllowed(actionId) {
    if (!this.isScriptedTutorialBattle()) return true;
    const step = this.state.tutorial.step;
    const allowed = {
      battlePrep: [],
      battleSkill: [],
      battleStance: ['stance'],
      battleBegin: ['begin'],
      battleTarget: ['attack'],
      battleMove: ['move'],
      battleRally: ['rally'],
      battleSurge: ['surge', 'end'],
      battleFinish: [],
    }[step] || [];
    return allowed.includes(actionId);
  }

  blockTutorialAction(actionId) {
    if (!this.isScriptedTutorialBattle()) return;
    const message = {
      battlePrep: 'Tutorial step: click the Navy Sharpshooter to inspect targeting and Field Intel.',
      battleSkill: 'Tutorial step: click Mara in the crew list to inspect level, skills, and stance details.',
      battleStance: 'Tutorial step: press Stance to learn how roles change tactical bonuses.',
      battleBegin: 'Tutorial step: press Begin to lock deployment and start the crew turn.',
      battleTarget: 'Tutorial step: press Attack, then click the Navy Sharpshooter.',
      battleMove: 'Tutorial step: press Move, then click the highlighted flank tile.',
      battleRally: 'Tutorial step: press Rally to show morale and defensive support.',
      battleSurge: 'Tutorial step: press Surge or End to finish this scripted sequence.',
    }[this.state.tutorial.step] || 'Follow the highlighted tutorial action.';
    this.log.push(message);
    this.draw();
  }

  advanceTutorialBattle(step, message = '') {
    if (!this.isScriptedTutorialBattle()) return;
    setTutorialStep(this.state, step);
    if (message) this.log.push(message);
    saveAutoGame(this.state);
  }

  selectCrewForIntel(index) {
    const unit = this.crew[index];
    this.inspect = { type: 'ally', unit };
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step === 'battleSkill' && index === 0) {
      this.advanceTutorialBattle('battleStance', 'Field Intel now shows Mara: level, XP, current skill, next locked skill, stance role, and actions.');
    } else if (this.isScriptedTutorialBattle() && this.state.tutorial.step === 'battleSkill') {
      this.log.push('Good inspection habit, but this step needs Mara Voss in the crew list.');
    }
    this.draw();
  }

  handleTile(pos) {
    const all = [...this.crew, ...this.enemies];
    const enemy = this.enemies.find((unit) => unit.hp > 0 && isSamePos(unit.pos, pos));
    const ally = this.crew.find((unit) => unit.hp > 0 && isSamePos(unit.pos, pos));
    if (enemy) this.inspect = { type: 'enemy', unit: enemy };
    else if (ally) this.inspect = { type: 'ally', unit: ally };
    else this.inspect = { type: 'terrain', pos };

    if (this.isScriptedTutorialBattle()) {
      if (this.handleScriptedTutorialTile(pos, enemy, ally)) return;
    }

    if (this.turn === 'prep') {
      if (!enemy && !ally) this.log.push(`Preparation is inspection-only. ${this.crew[this.activeIndex].name} holds the starting lane.`);
      this.draw();
      return;
    }

    if (this.turn !== 'crew') {
      this.draw();
      return;
    }
    if (this.command === 'attack' && enemy) this.attack(this.crew[this.activeIndex], enemy);
    else if (this.command === 'move' && !enemy && !ally) this.moveActive(pos);
    else if (this.command === 'rally') this.rally();
    else if (this.command === 'surge') this.activateSurge();
    else this.draw();
  }

  handleScriptedTutorialTile(pos, enemy, ally) {
    const step = this.state.tutorial.step;
    if (step === 'battlePrep') {
      if (enemy?.id === 'navy-sharpshooter') {
        this.advanceTutorialBattle('battleSkill', 'Field Intel reads the target: HP, intent, stance, status, stagger, and weakness.');
      } else {
        this.log.push('Click the highlighted Navy Sharpshooter so Field Intel can explain a target.');
      }
      this.draw();
      return true;
    }
    if (step === 'battleSkill') {
      if (ally?.id === 'captain') {
        this.advanceTutorialBattle('battleStance', 'Mara is selected. Her level 1 skill, next locked skill, and stance role are visible in Field Intel.');
      } else {
        this.log.push('Click Mara in the crew list or on the deck to inspect skills and stance details.');
      }
      this.draw();
      return true;
    }
    if (step === 'battleTarget') {
      if (this.command !== 'attack') {
        this.log.push('Press Attack first. Targeting mode then waits for an enemy click.');
        this.draw();
        return true;
      }
      if (enemy?.id === 'navy-sharpshooter') {
        this.attack(this.crew[this.activeIndex], enemy);
      } else {
        this.log.push('Target the Navy Sharpshooter. This teaches range, target selection, and Field Intel before damage resolves.');
        this.draw();
      }
      return true;
    }
    if (step === 'battleMove') {
      const target = { x: 6, y: 1 };
      if (this.command !== 'move') {
        this.log.push('Press Move first. Movement mode then waits for a destination tile.');
        this.draw();
        return true;
      }
      if (pos.x === target.x && pos.y === target.y && !enemy && !ally) {
        this.moveActive(pos);
      } else {
        this.log.push('Move Ivo to the highlighted crate-side tile to show safe repositioning and cover.');
        this.draw();
      }
      return true;
    }
    if (['battleStance', 'battleBegin', 'battleRally', 'battleSurge', 'battleFinish'].includes(step)) {
      this.log.push('Use the highlighted command button for this tutorial step.');
      this.draw();
      return true;
    }
    return false;
  }

  beginBattle() {
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step !== 'battleBegin') {
      this.blockTutorialAction('begin');
      return;
    }
    this.turn = 'crew';
    this.activeIndex = 0;
    this.command = null;
    if (this.isScriptedTutorialBattle()) this.advanceTutorialBattle('battleTarget', 'Battle begins. Mara is active; choose Attack before selecting a target.');
    this.log.push('Begin Battle. Turn-based boarding action starts.');
    this.draw();
  }

  nextPrepCrew() {
    this.activeIndex = (this.activeIndex + 1) % this.crew.length;
    this.log.push(`Preparing ${this.crew[this.activeIndex].name}.`);
    this.draw();
  }

  cycleActiveStance() {
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step !== 'battleStance') {
      this.blockTutorialAction('stance');
      return;
    }
    const unit = this.crew[this.activeIndex];
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step === 'battleStance') {
      unit.stance = 'Command';
      this.momentum = Math.min(100, this.momentum + 8);
      this.setUnitVisualAction(unit, 'stance', 420);
      this.log.push(`${unit.name} previews stance roles and keeps Command for the rally lesson.`);
      this.advanceTutorialBattle('battleBegin', 'Stances change tactical roles: Command supports, Marksman controls range, Raider flanks, Brace defends, and Boarding pressures close targets.');
      this.draw();
      return;
    }
    const keys = Object.keys(stances);
    unit.stance = keys[(keys.indexOf(unit.stance) + 1) % keys.length];
    this.momentum = Math.min(100, this.momentum + (unit.stance === 'Command' ? 8 : 4));
    this.setUnitVisualAction(unit, 'stance', 420);
    this.log.push(`${unit.name} shifts to ${unit.stance}.`);
    if (this.isScriptedTutorialBattle()) this.advanceTutorialBattle('battleBegin', `${unit.stance} shows how stances change roles: Command supports, Marksman controls range, Raider flanks, Brace defends, Boarding pressures.`);
    this.draw();
  }

  moveActive(pos) {
    const unit = this.crew[this.activeIndex];
    if (unit.actions <= 0) return;
    const t = terrainAt(pos, this.mapTiles);
    if (!this.movableTilesFor(unit).some((tile) => isSamePos(tile, pos))) {
      this.log.push('Move blocked: too far for current stance.');
      this.draw();
      return;
    }
    const from = { ...unit.pos };
    unit.pos = pos;
    this.setUnitVisualAction(unit, 'move', 520, { from });
    unit.actions -= 1;
    if (t.hazard === 'Burning') this.applyStatus(unit, 'Burning');
    if (t.hazard === 'Smoke-Choked') this.applyStatus(unit, 'Smoke-Choked');
    if (unit.stance === 'Raider') this.momentum = Math.min(100, this.momentum + (hasSkill(unit, 'Fast Boarding') ? 14 : 10));
    this.log.push(`${unit.name} repositions through ${t.label}.`);
    this.command = null;
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step === 'battleMove') {
      unit.actions = Math.max(unit.actions, 1);
      this.activeIndex = 0;
      this.crew[0].actions = Math.max(this.crew[0].actions, 1);
      this.advanceTutorialBattle('battleRally', 'Movement spends an action and can claim cover, range, or flanking lines. Now use Rally to stabilize the crew.');
      this.draw();
      return;
    }
    this.checkUnitDone();
    this.draw();
  }

  attack(attacker, target) {
    if (attacker.actions <= 0 || target.hp <= 0) return;
    const gap = distance(attacker.pos, target.pos);
    const weapon = crewWeaponCatalog[attacker.weapon] || crewWeaponCatalog.captainsCutlass;
    if (gap > weapon.range && attacker.hp > 0) {
      this.log.push(`${weapon.name} is out of range.`);
      this.draw();
      return;
    }
    this.setUnitVisualAction(attacker, this.attackAnimationFor(attacker, gap), 520);
    const hitChance = this.hitChanceFor(attacker, target);
    const hit = Phaser.Math.Between(1, 100) <= hitChance;
    const flank = Math.abs(attacker.pos.y - target.pos.y) >= 2 || attacker.pos.x < target.pos.x;
    let damage = 5 + (weapon.damage || 0);
    let stagger = 18 + (weapon.stagger || 0) + equipmentBonus(attacker, 'stagger');
    if (attacker.stance === 'Boarding' && gap <= 2) {
      damage += 4;
      stagger += 18;
    }
    if (attacker.stance === 'Marksman' && gap >= 3) {
      damage += 4;
      if (hasSkill(attacker, 'Suppression Fire')) this.applyStatus(target, 'Suppressed');
    }
    if (attacker.stance === 'Raider' && flank) {
      damage += 3;
      stagger += 28;
      if (hasSkill(attacker, 'Grapple Work')) this.applyStatus(target, 'Exposed');
    }
    if (attacker.stance === 'Command') {
      this.applyStatus(attacker, 'Rallying');
      this.momentum = Math.min(100, this.momentum + 14 + equipmentBonus(attacker, 'momentum'));
    }
    if (gap <= 2) damage += equipmentBonus(attacker, 'closeDamage');
    if (gap >= 3) damage += equipmentBonus(attacker, 'rangedDamage');
    if (hasSkill(attacker, 'Steady Sight') && this.isUnitInCover(attacker)) damage += 2;
    if (this.surgeActive) {
      damage += 3;
      stagger += crewHasSkill(this.crew, 'Decisive Signal') ? 30 : 20;
    }
    if (target.statuses.includes('Exposed')) damage += 2;
    if (target.statuses.includes('Powder-Soaked') && attacker.stance === 'Marksman' && hasSkill(attacker, 'Powder Spark')) {
      damage += 3;
      this.applyStatus(target, 'Burning');
    }
    if (target.statuses.includes('Exposed') && gap >= 3 && hasSkill(attacker, 'Deadeye Break')) stagger += 18;
    if (gap <= 2 && hasSkill(attacker, 'Hook And Drag')) this.applyStatus(target, 'Hooked');
    this.applyCoverWearForAttack(attacker, target, Math.max(3, Math.ceil(damage * 0.55)));
    if (hit) {
      this.setUnitVisualAction(target, 'hit', 520);
      target.hp = Math.max(0, target.hp - damage);
      target.stagger = Math.min(100, (target.stagger || 0) + stagger);
      if (target.stagger >= 100) {
        this.applyStatus(target, 'Exposed');
        this.momentum = Math.min(100, this.momentum + (hasSkill(attacker, 'No Quarter') ? 28 : 18));
        this.log.push(`${target.name} staggers under coordinated pressure.`);
      }
      this.log.push(`${attacker.name} hits ${target.name} for ${damage} (${hitChance}%).`);
    } else {
      this.log.push(`${attacker.name} misses ${target.name} (${hitChance}%). Cover splinters.`);
    }
    attacker.actions -= 1;
    this.momentum = Math.min(100, this.momentum + 8);
    if (target.hp <= 0) this.log.push(`${target.name} is defeated.`);
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step === 'battleTarget') {
      this.scriptedTutorialEnemyResponse();
      attacker.actions = 0;
      attacker.done = true;
      this.activeIndex = 1;
      this.crew[1].actions = 2;
      this.command = null;
      this.advanceTutorialBattle('battleMove', 'The enemy follows the script: the guard advances into midship while the sharpshooter holds range. Now move Ivo to cover.');
      this.draw();
      return;
    }
    this.command = null;
    this.checkBattleEnd();
    this.checkUnitDone();
    this.draw();
  }

  rally() {
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step !== 'battleRally') {
      this.blockTutorialAction('rally');
      return;
    }
    const unit = this.crew[this.activeIndex];
    if (unit.actions <= 0) return;
    const targets = this.crew.filter((member) => member.hp > 0 && distance(unit.pos, member.pos) <= this.rallyRangeFor(unit));
    targets.forEach((member) => this.applyStatus(member, 'Rallying'));
    this.setUnitVisualAction(unit, 'stance', 520);
    this.momentum = Math.min(100, this.momentum + (unit.stance === 'Command' && hasSkill(unit, 'Rallying Orders') ? 24 : 12) + equipmentBonus(unit, 'momentum'));
    if (this.isScriptedTutorialBattle()) this.momentum = 100;
    unit.actions -= 1;
    this.log.push(`${unit.name} rallies ${targets.length} crew in range ${this.rallyRangeFor(unit)}.`);
    if (this.isScriptedTutorialBattle()) {
      this.advanceTutorialBattle('battleSurge', 'Rally adds Rallying and momentum. Momentum is set to 100 here so you can see Surge without grinding.');
      this.draw();
      return;
    }
    this.checkUnitDone();
    this.draw();
  }

  activateSurge() {
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step !== 'battleSurge') {
      this.blockTutorialAction('surge');
      return;
    }
    if (this.momentum < 100 || this.surgeActive) {
      this.log.push('Surge unavailable: build full crew momentum first.');
      this.draw();
      return;
    }
    this.momentum = 0;
    this.surgeActive = true;
    this.log.push(`${this.state.momentumIdentity} surge ignites.`);
    if (this.isScriptedTutorialBattle()) {
      this.enemies.forEach((enemy) => {
        if (enemy.hp > 0) {
          enemy.hp = 0;
          enemy.stagger = 100;
          this.setUnitVisualAction(enemy, 'hit', 520);
        }
      });
      this.advanceTutorialBattle('battleFinish', 'Surge breaks the drill crew. Salvage is secured for rebuilding the drydock back at Haven.');
      this.checkBattleEnd();
      return;
    }
    this.draw();
  }

  applyStatus(unit, status) {
    unit.statuses ||= [];
    this.discoverStatus(status);
    if (!unit.statuses.includes(status)) unit.statuses.push(status);
  }

  discoverStatus(status) {
    if (!status || !statuses[status]) return;
    this.state.discoveredStatusEffects ||= [];
    if (!this.state.discoveredStatusEffects.includes(status)) this.state.discoveredStatusEffects.push(status);
  }

  checkUnitDone() {
    const unit = this.crew[this.activeIndex];
    if (unit.actions <= 0) this.endCrewUnit();
  }

  endCrewUnit() {
    if (this.isScriptedTutorialBattle() && this.state.tutorial.step === 'battleSurge') {
      this.advanceTutorialBattle('battleFinish', 'Ending a unit passes tempo when the right action is to hold position. The drill is complete.');
      this.draw();
      return;
    }
    if (this.isScriptedTutorialBattle() && !this.isTutorialActionAllowed('end')) {
      this.blockTutorialAction('end');
      return;
    }
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

  scriptedTutorialEnemyResponse() {
    const guard = this.enemies.find((enemy) => enemy.id === 'marine-guard');
    const cutlass = this.enemies.find((enemy) => enemy.id === 'cutlass-marine');
    const sharpshooter = this.enemies.find((enemy) => enemy.id === 'navy-sharpshooter');
    if (guard?.hp > 0) {
      const from = { ...guard.pos };
      guard.pos = { x: 3, y: 3 };
      this.setUnitVisualAction(guard, 'move', 620, { from });
      this.log.push('Scripted enemy: Marine Guard advances to midship cover.');
    }
    if (cutlass?.hp > 0) {
      const from = { ...cutlass.pos };
      cutlass.pos = { x: 3, y: 4 };
      this.setUnitVisualAction(cutlass, 'move', 620, { from });
      this.log.push('Scripted enemy: Cutlass Marine shifts toward Sel but does not attack yet.');
    }
    if (sharpshooter?.hp > 0) {
      this.applyStatus(sharpshooter, 'Suppressed');
      this.log.push('Scripted enemy: the Sharpshooter stays back and is marked Suppressed for the next lesson.');
    }
  }

  enemyTurn() {
    this.enemies.filter((enemy) => enemy.hp > 0).forEach((enemy) => {
      const target = this.closestCrew(enemy);
      if (!target) return;
      if (enemy.id === 'powder-monkey' && distance(enemy.pos, this.objective.pos) <= 1) {
        this.setUnitVisualAction(enemy, 'fire', 520);
        this.objective.hp = Math.max(0, this.objective.hp - 5);
        this.log.push(`${enemy.name} sabotages the powder store.`);
        return;
      }
      if (distance(enemy.pos, target.pos) <= 2) {
        this.setUnitVisualAction(enemy, this.attackAnimationFor(enemy, distance(enemy.pos, target.pos)), 520);
        let damage = enemy.stagger >= 100 ? 2 : 5;
        if (target.stance === 'Brace') damage -= 2;
        if (target.statuses.includes('Rallying')) damage -= crewHasSkill(this.crew, 'Hold The Line') ? 2 : 1;
        const hitChance = this.hitChanceFor(enemy, target) ?? 72;
        this.applyCoverWearForAttack(enemy, target, Math.max(2, damage));
        if (Phaser.Math.Between(1, 100) <= hitChance) {
          this.setUnitVisualAction(target, 'hit', 520);
          target.hp = Math.max(0, target.hp - Math.max(1, damage));
          if (enemy.stance === 'Boarding') this.applyStatus(target, 'Panic');
          if (enemy.stance === 'Marksman') this.applyStatus(target, 'Suppressed');
          this.log.push(`${enemy.name} pressures ${target.name} (${hitChance}%).`);
        } else {
          this.log.push(`${enemy.name} misses ${target.name} (${hitChance}%). Cover takes the hit.`);
        }
      } else {
        const from = { ...enemy.pos };
        enemy.pos.x += Math.sign(target.pos.x - enemy.pos.x);
        enemy.pos.y += Math.sign(target.pos.y - enemy.pos.y);
        this.setUnitVisualAction(enemy, 'move', 520, { from });
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
      this.state.activeBattleLayout = null;
      this.log.push('Defeat. The powder store falls.');
      this.time.delayedCall(900, () => this.scene.start('HavenScene'));
      return;
    }
    if (!enemiesAlive) {
      this.turn = 'ended';
      const tutorialVictory = isTutorialActive(this.state);
      const drydockCost = havenProjects.drydock.cost;
      const rewards = tutorialVictory
        ? { coin: drydockCost.coin, lumber: drydockCost.lumber, scrap: drydockCost.scrap, blackPowder: 0, reputation: 0 }
        : this.encounter.rewards;
      const xpAward = encounterXp(this.encounter);
      const battleCrew = this.crew.map((unit) => {
        const { actions, done, statuses, stagger, visualAction, ...savedUnit } = unit;
        return savedUnit;
      });
      const progression = grantCrewXp(battleCrew, xpAward);
      if (tutorialVictory) setTutorialStep(this.state, 'rebuildDrydock');
      this.state.battleWon = true;
      this.state.activeBattleLayout = null;
      this.state.crew = progression.crew;
      this.state.resources.coin += rewards.coin || 0;
      this.state.resources.lumber += rewards.lumber || 0;
      this.state.resources.scrap += rewards.scrap || 0;
      this.state.resources.blackPowder += rewards.blackPowder || 0;
      this.state.resources.reputation += rewards.reputation || 0;
      this.state.pendingBattle = null;
      this.state.navigationMessage = tutorialVictory ? 'Tutorial salvage recovered. Return to the Haven Center and rebuild the drydock.' : `${this.encounter.title} won. Loot and salvage returned to the haven.`;
      this.state.pendingHavenSummary = {
        title: tutorialVictory ? 'Drydock Salvage Secured' : `${this.encounter.title} Won`,
        lines: tutorialVictory ? [
          `+${rewards.lumber} Lumber`,
          `+${rewards.scrap} Scrap`,
          `+${rewards.coin} Coin`,
          'Enough materials to rebuild the drydock.',
          `+${xpAward} XP for each crew member`,
        ] : [
          ...this.encounter.victoryLines,
          `+${xpAward} XP for each crew member`,
          ...progression.levelUps,
        ],
      };
      this.state.lastScene = 'Haven';
      saveAutoGame(this.state);
      this.log.push('Victory. The deck is captured.');
      this.time.delayedCall(1100, () => this.scene.start('HavenScene'));
    }
  }

  drawTutorial() {
    if (!isTutorialActive(this.state)) return;
    const step = this.state.tutorial.step;
    const skip = { label: 'Skip', onClick: () => this.finishTutorial(), tone: colors.teal };
    if (step === 'battlePrep') {
      const target = this.enemies.find((unit) => unit.id === 'navy-sharpshooter');
      if (target) {
        const p = this.gridToWorld(target.pos);
        drawTutorialPulse(this, p.x, p.y, 34, 'Inspect target');
      }
      drawTutorialPulse(this, 838, 340, 78, 'Field Intel');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Tutorial Battle: Targeting And Intel',
        'This fight is scripted. First, click the highlighted Navy Sharpshooter. Field Intel on the right explains the selected target: HP, stance, status, intent, stagger, and weakness. Other actions are locked until the lesson advances.',
        [skip],
      );
      return;
    }
    if (step === 'battleSkill') {
      const captain = this.crew[0];
      const p = this.gridToWorld(captain.pos);
      drawTutorialPulse(this, p.x, p.y, 32, 'Mara');
      drawTutorialPulse(this, 682, 302, 38, 'Crew list');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Skills, Levels, And Stances',
        'Click Mara on the deck or in the crew list. Crew Field Intel shows level, XP, unlocked skill, next locked skill, stance role, and actions. Every crew member has a level 1 skill and later skills at higher levels.',
        [skip],
      );
      return;
    }
    if (step === 'battleStance') {
      drawTutorialPulse(this, 764, 487, 34, 'Stance');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Stance Lesson',
        'Press Stance. Stances define the job a character is doing: Command supports momentum, Marksman controls range, Raider flanks, Brace defends, and Boarding pressures close targets. Stance changes are locked to this button for the lesson.',
        [skip],
      );
      return;
    }
    if (step === 'battleBegin') {
      drawTutorialPulse(this, 654, 487, 34, 'Begin');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Deployment Lock',
        'Press Begin. In real battles, preparation lets you inspect the field, adjust stances, and deploy on your side of the board. Once combat starts, each active crew member spends actions.',
        [skip],
      );
      return;
    }
    if (step === 'battleTarget') {
      const target = this.enemies.find((unit) => unit.id === 'navy-sharpshooter');
      if (target) {
        const p = this.gridToWorld(target.pos);
        drawTutorialPulse(this, p.x, p.y, 34, 'Target this');
      }
      drawTutorialPulse(this, 654, 487, 34, 'Attack');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Attack Targeting',
        'Press Attack, then click the highlighted Sharpshooter. Targeting is always two steps: choose the command, then choose a legal target on the board. Mara will attack, and the enemy will make a scripted response.',
        [skip],
      );
      return;
    }
    if (step === 'battleMove') {
      const tile = this.gridToWorld({ x: 6, y: 1 });
      drawTutorialPulse(this, tile.x, tile.y, 32, 'Move here');
      drawTutorialPulse(this, 764, 487, 34, 'Move');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Movement, Cover, And Enemy Script',
        'The Marine Guard advanced to midship and the Sharpshooter stayed back. Press Move, then click the highlighted crate-side tile for Ivo. Movement teaches range, cover, hazards, and future flanking lines.',
        [skip],
      );
      return;
    }
    if (step === 'battleRally') {
      drawTutorialPulse(this, 654, 537, 34, 'Rally');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Rally And Momentum',
        'Press Rally. Rally adds the Rallying status, reduces pressure, and builds momentum. Mara has Rallying Orders at level 1, so Command play is about keeping the crew stable and setting up Surge windows.',
        [skip],
      );
      return;
    }
    if (step === 'battleSurge') {
      drawTutorialPulse(this, 764, 537, 34, 'Surge');
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Surge',
        'Momentum is set to 100 for the tutorial. Press Surge to spend it. Surge is the payoff for good targeting, flanking, rallying, and objective pressure: attacks hit harder and build more stagger for a short window.',
        [skip],
      );
      return;
    }
    if (step === 'battleFinish') {
      drawTutorialPanelAt(
        this,
        40,
        506,
        512,
        164,
        'Tutorial Complete',
        'You have inspected Field Intel, read skills and locked level rewards, changed stance, targeted an enemy, watched scripted enemy movement, moved into cover, rallied, and triggered Surge. Normal battles now unlock all commands.',
        [
          { label: 'Done', onClick: () => this.finishTutorial(), tone: colors.brass },
        ],
      );
    }
  }

  finishTutorial() {
    completeTutorial(this.state);
    saveAutoGame(this.state);
    this.draw();
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
