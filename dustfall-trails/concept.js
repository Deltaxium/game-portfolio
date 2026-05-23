export const dustfallTrailsConcept = {
  id: 'dustfall-trails',
  workingTitle: 'Dustfall Trails',
  theme: 'Wild West',
  camera: {
    world: {
      angle: 'top-down',
      dimensions: '2D',
      movement: 'static-camera',
    },
    battle: {
      angle: 'side-view',
      dimensions: '2D',
      movement: 'static-camera',
      partySide: 'right',
      enemySide: 'left',
    },
  },
  combat: {
    style: 'active-time-battle',
    commandFlow: 'menu-command-selection',
    timeBehavior: 'time-continues-while-menus-are-open',
    expectedHud: ['party-status', 'enemy-lineup', 'atb-bars', 'command-menu', 'message-log'],
  },
  movement: {
    style: 'walking',
    platforming: false,
    routeGates: [
      {
        id: 'canyon-pass',
        requiredItem: 'Sheriff Star',
        blockedMessage: 'The deputy will not open the pass without proof of authority.',
      },
      {
        id: 'old-mine',
        requiredItem: 'Mine Lantern',
        blockedMessage: 'The mine is too dark to enter safely.',
      },
      {
        id: 'rail-switch-yard',
        requiredItem: 'Rail Spike',
        blockedMessage: 'The rail switch is missing its locking spike.',
      },
    ],
    puzzles: [
      {
        id: 'minecart-route',
        type: 'switch-routing',
        reward: 'Mine Lantern',
      },
      {
        id: 'sheriff-safe',
        type: 'clue-combination',
        reward: 'Sheriff Star',
      },
      {
        id: 'water-pump',
        type: 'sequence-toggle',
        reward: 'Cactus Bloom',
      },
    ],
  },
  ui: {
    style: 'wild-west-focused',
    materials: ['weathered-wood', 'parchment', 'brass-trim', 'leather-tabs'],
    motifs: ['sheriff-stars', 'wanted-poster-frames', 'tumbleweed-transition-accents'],
    readabilityRules: [
      'Keep ATB bars visible during command selection.',
      'Use tumbleweed motion only as an accent outside critical text areas.',
      'Reserve sheriff-star icons for ready states, quest authority, or confirmed choices.',
    ],
  },
  palette: {
    brown: 0x6f4a2d,
    darkBrown: 0x2f1d13,
    yellow: 0xe4b84a,
    paleYellow: 0xf5df9b,
    white: 0xfff8e7,
    green: 0x4f8a43,
    cactusGreen: 0x2f6f3f,
  },
  starterParty: [
    {
      id: 'marshal',
      name: 'Marshal',
      role: 'Frontier Guardian',
      battlePosition: 'right-front',
    },
    {
      id: 'gunslinger',
      name: 'Gunslinger',
      role: 'Quickdraw Striker',
      battlePosition: 'right-mid',
    },
    {
      id: 'medic',
      name: 'Trail Medic',
      role: 'Support Healer',
      battlePosition: 'right-back',
    },
  ],
  starterEnemies: [
    {
      id: 'dust-bandit',
      name: 'Dust Bandit',
      battlePosition: 'left-front',
    },
    {
      id: 'cactus-rattler',
      name: 'Cactus Rattler',
      battlePosition: 'left-mid',
    },
    {
      id: 'copper-vulture',
      name: 'Copper Vulture',
      battlePosition: 'left-back',
    },
  ],
};

