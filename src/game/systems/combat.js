import { statusRules } from '../config/gameData.js';

export function cloneBattlers(template) {
  return template.map((unit) => ({
    ...unit,
    skills: unit.skills ? unit.skills.map((skill) => ({ ...skill })) : undefined,
    statuses: [],
  }));
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
