export const WORLD = 'world';
export const BATTLE = 'battle';

export const TILE = 34;
export const MAP_X = 22;
export const MAP_Y = 26;
export const SIDEBAR_X = 724;

export const palette = {
  coal: 0x120d0a,
  iron: 0x241914,
  panel: 0x2d1c14,
  panelDark: 0x1b110d,
  brass: 0xd8912f,
  amber: 0xffc252,
  copper: 0xb95632,
  red: 0x9d2f25,
  cream: 0xf4d59b,
  smoke: 0x524038,
  green: 0x76b76a,
  blue: 0x78a8bd,
  gray: 0x75645c,
};

export const itemData = {
  'Brass Key': 'Unlocks chained pressure machinery.',
  'Pressure Gauge': 'Reveals the safe valve order.',
  'Aether Fuse': 'Powers the factory lift.',
};

export const valveSequence = ['red', 'amber', 'blue'];

export const worldTiles = [
  '####################',
  '#....K.......#.....#',
  '#............#..E..#',
  '#..####..#####.....#',
  '#..#..#......S.....#',
  '#..#V.#....####G####',
  '#..#..#....#.......#',
  '#..####....#.......#',
  '#..........#...F...#',
  '#....P.............#',
  '####################',
];

export const statusRules = {
  jamming: {
    label: 'Jamming',
    summary: '35% action failure. Expires after 1 affected action.',
    prompt: 'Jamming can make a combatant lose their next command before it fires.',
    durationType: 'action',
    defaultTurns: 1,
  },
  burned: {
    label: 'Burned',
    summary: 'Takes 8 damage when acting. Lasts until cured or battle ends.',
    prompt: 'Burned deals damage when the affected combatant acts. It does not reduce attack power.',
    durationType: 'permanent',
    defaultTurns: null,
  },
  stunned: {
    label: 'Stunned',
    summary: 'ATB fill pauses briefly. Expires after 1 global action.',
    prompt: 'Stunned pauses ATB fill. It clears after the next combat action resolves.',
    durationType: 'globalAction',
    defaultTurns: 1,
  },
  overheated: {
    label: 'Overheated',
    summary: '+25% damage dealt, +35% damage taken. Lasts 3 affected actions.',
    prompt: 'Overheated is risky: more outgoing damage, but incoming hits hurt more.',
    durationType: 'action',
    defaultTurns: 3,
  },
};

export const bossResistancePlan = {
  'Boiler Warden': {
    resists: ['burned'],
    vulnerable: ['jamming'],
    reasoning: 'A furnace-based boss should not care much about fire, but its pressure valves can still jam.',
  },
  'Clockwork Magistrate': {
    resists: ['stunned', 'jamming'],
    vulnerable: ['burned'],
    reasoning: 'A precision automaton should resist control-disruption effects, while heat can warp its brass frame.',
  },
  'Aether Conductor': {
    resists: ['overheated'],
    vulnerable: ['stunned'],
    reasoning: 'It runs on volatile aether pressure, so overheat-like pressure is natural to it; interrupting its rhythm should matter.',
  },
};

export const devTools = [
  '` Toggle tools',
  'B Start battle',
  'K Grant key/gauge',
  'V Solve valve',
  'L Grant fuse',
  'C Force crit',
  'H Status reference',
  'R Reset slice',
];
