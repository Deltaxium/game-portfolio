import { getTerrainDefinition } from '../config/terrain.js';

export const battleMaps = {
  cinderMesaRoad: {
    id: 'cinderMesaRoad',
    name: 'Cinder Mesa Road',
    tileWidth: 32,
    tileHeight: 32,
    renderTileSize: 64,
    origin: { x: 28, y: 106 },
    baseTerrain: 'dust',
    elements: [
      ['highRidge', 'ridge', null, 'road', 'road', null, 'cover', 'ridge'],
      ['ridge', 'cactusPatch', 'cover', 'road', null, 'gully', null, 'highRidge'],
      [null, 'gully', null, 'road', 'cover', 'mud', 'ridge', null],
      ['cover', null, 'ridge', 'road', 'road', null, 'gully', 'cover'],
      ['gully', null, 'mud', 'cover', 'road', 'ridge', 'cactusPatch', null],
      ['ridge', 'cover', null, 'road', 'road', null, 'cover', 'highRidge'],
    ],
  },
};

export const startingBattleMapId = 'cinderMesaRoad';

export function getBattleMap(id = startingBattleMapId) {
  return battleMaps[id] || battleMaps[startingBattleMapId];
}

export function generateBattleMap() {
  const base = getBattleMap(startingBattleMapId);
  const elements = Array.from({ length: 6 }, () => Array.from({ length: 8 }, () => null));
  const blocked = new Set(['0,1', '0,2', '1,3', '7,1', '7,3', '7,4']);
  const columnsBySide = {
    left: [0, 1, 2, 3],
    right: [7, 6, 5, 4],
  };
  const counts = {
    left: { cover: 0, ridge: 0, hazard: 0, slow: 0 },
    right: { cover: 0, ridge: 0, hazard: 0, slow: 0 },
  };
  const terrainGroups = {
    cover: ['cover', 'brokenSign', 'barrelCover'],
    ridge: ['ridge', 'highRidge'],
    hazard: ['cactusPatch', 'gully'],
    slow: ['mud'],
    open: ['road', null, null],
  };
  const limits = {
    cover: 3,
    ridge: 3,
    hazard: 2,
    slow: 1,
  };
  const pick = (values) => values[Math.floor(Math.random() * values.length)];
  const key = (x, y) => `${x},${y}`;
  const canPlace = (x, y) => !blocked.has(key(x, y)) && elements[y][x] === null;
  const place = (side, category, attempts = 30) => {
    if (counts[side][category] >= limits[category]) return false;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const x = pick(columnsBySide[side]);
      const y = Math.floor(Math.random() * elements.length);
      if (!canPlace(x, y)) continue;
      elements[y][x] = pick(terrainGroups[category]);
      counts[side][category] += 1;
      return true;
    }
    return false;
  };
  const placePair = (category) => {
    place('left', category);
    place('right', category);
  };

  for (let y = 0; y < elements.length; y += 1) {
    elements[y][3] = pick(terrainGroups.open);
    elements[y][4] = pick(terrainGroups.open);
  }

  const coverPairs = 2 + Math.floor(Math.random() * 2);
  const ridgePairs = 1 + Math.floor(Math.random() * 2);
  const hazardPairs = 1 + Math.floor(Math.random() * 2);
  for (let index = 0; index < coverPairs; index += 1) placePair('cover');
  for (let index = 0; index < ridgePairs; index += 1) placePair('ridge');
  for (let index = 0; index < hazardPairs; index += 1) placePair('hazard');
  if (Math.random() > 0.45) placePair('slow');

  elements.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value || blocked.has(key(x, y)) || Math.random() > 0.18) return;
      elements[y][x] = pick(terrainGroups.open);
    });
  });

  return {
    ...base,
    id: 'randomCinderMesaRoad',
    name: 'Shifting Cinder Mesa',
    elements,
  };
}

export function createTilemapData(map) {
  const baseTile = getTerrainDefinition(map.baseTerrain).tileFrame + 1;
  return map.elements.map((row) => row.map(() => baseTile));
}

export function createElementTilemapData(map) {
  return map.elements.map((row) =>
    row.map((terrainId) => (terrainId ? getTerrainDefinition(terrainId).tileFrame + 1 : -1)),
  );
}
