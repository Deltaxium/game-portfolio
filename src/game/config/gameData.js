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

export const partyTemplate = [
  {
    name: 'Ada',
    role: 'Gearblade',
    maxHp: 132,
    hp: 132,
    speed: 43,
    atb: 10,
    statuses: [],
    skills: [
      { name: 'Saber Strike', power: 24, target: 'enemy', description: 'Reliable gearblade hit.' },
      {
        name: 'Overcrank',
        power: 38,
        target: 'enemy',
        selfStatus: 'overheated',
        description: 'Harder hit, overheats Ada.',
      },
      {
        name: 'Spark Snare',
        power: 16,
        target: 'enemy',
        status: 'jammed',
        description: 'Damage and jam chance.',
      },
    ],
  },
  {
    name: 'Brass',
    role: 'Boiler Medic',
    maxHp: 104,
    hp: 104,
    speed: 35,
    atb: 0,
    statuses: [],
    skills: [
      { name: 'Pipe Wrench', power: 19, target: 'enemy', description: 'Basic blunt attack.' },
      { name: 'Steam Mend', power: -38, target: 'ally', description: 'Repairs the weakest ally.' },
      {
        name: 'Coolant Flush',
        power: -16,
        target: 'ally',
        cleanse: true,
        description: 'Small heal and clears status.',
      },
    ],
  },
];

export const enemyTemplate = [
  {
    name: 'Rust Hound',
    maxHp: 92,
    hp: 92,
    speed: 33,
    atb: 15,
    statuses: [],
    x: 205,
    y: 260,
    tint: palette.copper,
  },
  {
    name: 'Valve Imp',
    maxHp: 78,
    hp: 78,
    speed: 47,
    atb: 0,
    statuses: [],
    x: 335,
    y: 330,
    tint: palette.red,
  },
];

export const statusRules = {
  jammed: 'Damage x0.55. Commands can fail.',
  burned: 'Damage x0.75. Takes chip damage on action.',
  stunned: 'Loses the next action.',
  overheated: 'Damage x1.25. Vulnerable state after Overcrank.',
};
