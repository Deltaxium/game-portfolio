import bruiserUrl from './dust-bruiser.svg?url';
import gunslingerUrl from './gunslinger.svg?url';
import brassHoofUrl from './horse-brass-hoof.png?url';
import cometUrl from './horse-comet.png?url';
import ghostPepperUrl from './horse-ghost-pepper.png?url';
import marshalUrl from './marshal.svg?url';
import medicUrl from './medic.svg?url';
import raiderUrl from './red-sash-raider.svg?url';
import riflemanUrl from './canyon-rifleman.svg?url';
import wagonUrl from './wagon.png?url';

export const spriteAssets = [
  { key: 'sprite-marshal', url: marshalUrl, width: 96, height: 96 },
  { key: 'sprite-quickdraw', url: gunslingerUrl, width: 96, height: 96 },
  { key: 'sprite-sawbones', url: medicUrl, width: 96, height: 96 },
  { key: 'sprite-horse-comet', url: cometUrl, type: 'image' },
  { key: 'sprite-horse-brass-hoof', url: brassHoofUrl, type: 'image' },
  { key: 'sprite-horse-ghost-pepper', url: ghostPepperUrl, type: 'image' },
  { key: 'sprite-raider', url: raiderUrl, width: 96, height: 96 },
  { key: 'sprite-rifleman', url: riflemanUrl, width: 96, height: 96 },
  { key: 'sprite-bruiser', url: bruiserUrl, width: 96, height: 96 },
  { key: 'sprite-supply-wagon', url: wagonUrl, type: 'image' },
];

export const partySpriteKeys = {
  marshal: 'sprite-marshal',
  quickdraw: 'sprite-quickdraw',
  sawbones: 'sprite-sawbones',
};

export const enemySpriteKeys = {
  raider: 'sprite-raider',
  rifleman: 'sprite-rifleman',
  bruiser: 'sprite-bruiser',
  scout: 'sprite-raider',
  sapper: 'sprite-bruiser',
};

export const horseSourceSpriteKeys = {
  comet: 'sprite-horse-comet',
  'brass-hoof': 'sprite-horse-brass-hoof',
  'ghost-pepper': 'sprite-horse-ghost-pepper',
};

export const horseSpriteKeys = {
  comet: 'sprite-horse-comet-cutout',
  'brass-hoof': 'sprite-horse-brass-hoof-cutout',
  'ghost-pepper': 'sprite-horse-ghost-pepper-cutout',
};
