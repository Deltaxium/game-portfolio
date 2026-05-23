import { statusRules } from '../config/gameData.js';

export function cloneBattlers(template) {
  return template.map((unit) => ({
    ...unit,
    actions: unit.actions ? unit.actions.map((action) => ({ ...action })) : undefined,
    skills: unit.skills ? unit.skills.map((skill) => ({ ...skill })) : undefined,
    statuses: [],
  }));
}

export function createEncounterMobs(encounter, mobCatalog) {
  const entries = encounter.mobPool?.length
    ? rollEncounterMobEntries(encounter)
    : encounter.mobs;

  return entries.map((entry, index) => {
    const mob = mobCatalog[entry.mobId];
    if (!mob) {
      throw new Error(`Unknown mob id in encounter: ${entry.mobId}`);
    }
    return {
      ...cloneBattlers([mob])[0],
      id: `${mob.id}-${index + 1}`,
      x: entry.x,
      y: entry.y,
    };
  });
}

function rollEncounterMobEntries(encounter) {
  const [minCount = 1, maxCount = minCount] = encounter.countRange || [encounter.mobPool.length, encounter.mobPool.length];
  const count = randomInt(minCount, Math.max(minCount, maxCount));
  const positions = encounter.positions?.length ? encounter.positions : encounter.mobs;

  return Array.from({ length: count }, (_, index) => ({
    ...(positions[index % positions.length] || {}),
    mobId: encounter.mobPool[Math.floor(Math.random() * encounter.mobPool.length)],
  }));
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function hasStatus(unit, name) {
  return unit.statuses.some((status) => status.name === name);
}

export function statusLabel(unit) {
  if (!unit.statuses.length) return 'Normal';
  return unit.statuses
    .map((status) => {
      const label = statusRules[status.name]?.label || status.name;
      return status.turns ? `${label} ${status.turns}` : label;
    })
    .join(' / ');
}

export function outgoingDamageMultiplier(unit) {
  let multiplier = 1;
  if (hasStatus(unit, 'overheated')) multiplier *= 1.25;
  return multiplier;
}

export function incomingDamageMultiplier(unit) {
  let multiplier = 1;
  if (unit && hasStatus(unit, 'overheated')) multiplier *= 1.35;
  return multiplier;
}

export function rollAttackDamage(basePower, attacker, target, criticalChance = 0.15) {
  const critical = Math.random() < criticalChance;
  const criticalMultiplier = critical ? 1.5 : 1;
  const damage = Math.round(
    basePower * outgoingDamageMultiplier(attacker) * incomingDamageMultiplier(target) * criticalMultiplier,
  );
  return { damage, critical };
}

export function chooseAction(unit) {
  if (!unit.actions?.length) {
    return {
      id: 'basic-attack',
      name: 'Attack',
      power: 12,
      target: 'party-random',
      criticalChance: 0.1,
      log: 'attacks',
    };
  }
  return unit.actions[Math.floor(Math.random() * unit.actions.length)];
}

export function resolveAttackAction(action, attacker, target, forceCritical = false) {
  const criticalChance = forceCritical ? 1 : action.criticalChance;
  const { damage, critical } = rollAttackDamage(action.power, attacker, target, criticalChance);
  return {
    action,
    attacker,
    target,
    damage,
    critical,
    status:
      action.status && Math.random() < (action.statusChance ?? 1)
        ? {
            name: action.status,
            turns: action.statusTurns,
          }
        : null,
  };
}

export function applyStatus(unit, name, turns = statusRules[name]?.defaultTurns) {
  const existing = unit.statuses.find((status) => status.name === name);
  const nextTurns = turns ?? null;
  if (existing) {
    existing.turns = existing.turns === null || nextTurns === null ? null : Math.max(existing.turns, nextTurns);
    return;
  }
  unit.statuses.push({ name, turns: nextTurns });
}

export function tickStatuses(unit, durationType = 'action') {
  unit.statuses = unit.statuses
    .map((status) => {
      const rule = statusRules[status.name];
      if (!rule || rule.durationType !== durationType || status.turns === null) return status;
      return { ...status, turns: status.turns - 1 };
    })
    .filter((status) => status.turns === null || status.turns > 0);
}

export function clearBattleStatuses(unit) {
  unit.statuses = [];
}
