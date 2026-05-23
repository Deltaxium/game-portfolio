import { getTerrainDefinition } from '../config/terrain.js';

export function terrainIdAt(map, grid) {
  return map.elements[grid.y]?.[grid.x] || map.baseTerrain;
}

export function terrainAt(map, grid) {
  return getTerrainDefinition(terrainIdAt(map, grid));
}

export function gridToWorld(map, grid) {
  return {
    x: map.origin.x + grid.x * map.renderTileSize + map.renderTileSize / 2,
    y: map.origin.y + grid.y * map.renderTileSize + map.renderTileSize / 2,
  };
}

export function worldToGrid(map, worldX, worldY) {
  return {
    x: Math.floor((worldX - map.origin.x) / map.renderTileSize),
    y: Math.floor((worldY - map.origin.y) / map.renderTileSize),
  };
}

export function isInBounds(map, grid) {
  return Boolean(map.elements[grid.y] && grid.x >= 0 && grid.x < map.elements[grid.y].length);
}

export function gridDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isOccupied(grid, units) {
  return units.some((unit) => unit.hp > 0 && unit.grid.x === grid.x && unit.grid.y === grid.y);
}

export function getSide(unit) {
  if (unit.side) return unit.side;
  return unit.grid.x <= 3 ? 'enemy' : 'ally';
}

export function getLane(unit) {
  const side = getSide(unit);
  const x = unit.grid.x;
  if (side === 'enemy') {
    if (x <= 2) return 'Back';
    if (x <= 4) return 'Mid';
    return 'Front';
  }
  if (x <= 2) return 'Front';
  if (x <= 4) return 'Mid';
  return 'Back';
}

export function laneDistance(attacker, target) {
  const order = { Front: 0, Mid: 1, Back: 2 };
  return Math.abs(order[getLane(attacker)] - order[getLane(target)]);
}

function getMoveBudget(unit) {
  if (!unit.mounted) return 3;
  if (unit.horseStance === 'Sprint') return 5;
  if (unit.horseStance === 'Calm Focus') return 3;
  return 4;
}

function getTileStepCost(map, unit, grid) {
  const terrain = terrainAt(map, grid);
  let cost = terrain.movementCost;
  if (unit.mounted) cost = Math.max(1, cost - 1);
  if (unit.mounted && terrain.id === 'gully') cost += 1;
  if (unit.mounted && terrain.mountedSlow) cost += 2;
  if (!unit.mounted && terrain.cover) cost += 1;
  return cost;
}

export function getReachableTiles(map, unit, units) {
  const budget = getMoveBudget(unit);
  const bestCosts = new Map([[`${unit.grid.x},${unit.grid.y}`, 0]]);
  const frontier = [{ grid: unit.grid, cost: 0 }];
  const tiles = [];

  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();
    [
      { x: current.grid.x + 1, y: current.grid.y },
      { x: current.grid.x - 1, y: current.grid.y },
      { x: current.grid.x, y: current.grid.y + 1 },
      { x: current.grid.x, y: current.grid.y - 1 },
    ].forEach((grid) => {
      if (!isInBounds(map, grid)) return;
      if (isOccupied(grid, units)) return;
      const nextCost = current.cost + getTileStepCost(map, unit, grid);
      if (nextCost > budget) return;
      const key = `${grid.x},${grid.y}`;
      if (bestCosts.has(key) && bestCosts.get(key) <= nextCost) return;
      bestCosts.set(key, nextCost);
      frontier.push({ grid, cost: nextCost });
    });
  }

  bestCosts.forEach((cost, key) => {
    if (cost === 0) return;
    const [x, y] = key.split(',').map(Number);
    tiles.push({ x, y, cost });
  });

  return tiles;
}

export function sortUnitsForDraw(units) {
  return [...units].sort((a, b) => a.grid.y - b.grid.y || a.grid.x - b.grid.x);
}
