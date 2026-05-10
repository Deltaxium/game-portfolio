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
  return unit.statuses.map((status) => `${status.name} ${status.turns}`).join(' / ');
}

export function damageMultiplier(unit) {
  let multiplier = 1;
  if (hasStatus(unit, 'jammed')) multiplier *= 0.55;
  if (hasStatus(unit, 'burned')) multiplier *= 0.75;
  if (hasStatus(unit, 'overheated')) multiplier *= 1.25;
  return multiplier;
}

export function applyStatus(unit, name, turns) {
  const existing = unit.statuses.find((status) => status.name === name);
  if (existing) {
    existing.turns = Math.max(existing.turns, turns);
    return;
  }
  unit.statuses.push({ name, turns });
}

export function tickStatuses(unit) {
  unit.statuses = unit.statuses
    .map((status) => ({ ...status, turns: status.turns - 1 }))
    .filter((status) => status.turns > 0);
}
