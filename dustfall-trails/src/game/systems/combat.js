import { encounters, horseCatalog, statusEffects, weaponCatalog } from '../config/gameData.js';
import { getLane, laneDistance, terrainAt } from './grid.js';
import { countEquippedTraitTag, hasPartySynergy } from './synergy.js';

export function createEncounter(id, heat) {
  const encounter = encounters[id];
  return {
    ...encounter,
    enemies: encounter.enemies.map((enemy) => {
      const bonus = heat * 5;
      return {
        ...enemy,
        maxHp: enemy.maxHp + bonus,
        hp: enemy.maxHp + bonus,
        statuses: enemy.statuses ? enemy.statuses.map((status) => ({ ...status })) : [],
        grid: { ...enemy.grid },
      };
    }),
  };
}

export function living(units) {
  return units.filter((unit) => unit.hp > 0);
}

export function getHorse(rider) {
  return rider.horseId ? horseCatalog[rider.horseId] : null;
}

export function isMounted(rider) {
  return Boolean(rider.mounted && getHorse(rider));
}

export function getWeapon(rider) {
  return weaponCatalog[rider.equippedWeapon] || weaponCatalog.revolver;
}

export function hasPreferredWeapon(rider) {
  return rider.talent?.preferredWeapon === getWeapon(rider).id;
}

export function hasEquippedTrait(rider, traitName) {
  return [...(rider.combatTraits || []), ...(rider.bondTraits || [])].some((trait) => trait.name === traitName);
}

export function hasEquippedTraitTag(rider, tagName) {
  return [...(rider.combatTraits || []), ...(rider.bondTraits || [])].some((trait) => trait.tags?.includes(tagName));
}

export function getTerrain(unit, map) {
  return map ? terrainAt(map, unit.grid) : { elevation: 0, cover: false };
}

export function normalizeStatusName(name = '') {
  return name
    .toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function getStatusDefinition(name) {
  const id = normalizeStatusName(name);
  return statusEffects[id] || { id, label: name, description: '' };
}

export function createStatus(name, turns = null) {
  const definition = getStatusDefinition(name);
  return {
    name: definition.id,
    label: definition.label,
    turns,
  };
}

export function hasStatus(unit, name) {
  const id = normalizeStatusName(name);
  return unit.statuses?.some((status) => normalizeStatusName(status.name) === id);
}

export function statusLabels(unit) {
  return unit.statuses?.length ? unit.statuses.map((status) => status.label || getStatusDefinition(status.name).label) : [];
}

export function riderSpeed(rider, partySynergy = null) {
  const horse = getHorse(rider);
  let speed = isMounted(rider) ? 18 * horse.speed : 12;
  if (rider.riderStance === 'Gunslinger') speed += 5;
  if (rider.riderStance === 'Sharpshooter') speed -= 3;
  if (rider.riderStance === 'Gunslinger' && getLane(rider) === 'Mid') speed += 2;
  if (rider.riderStance === 'Outlaw' && getLane(rider) === 'Front') speed += 2;
  if (rider.riderStance === 'Wrangler' && getLane(rider) === 'Mid') speed += 1;
  if (rider.horseStance === 'Sprint') speed += 4;
  if (rider.horseStance === 'Calm Focus') speed -= 1;
  if (hasEquippedTrait(rider, 'Dust Runner') && getLane(rider) === 'Mid') speed += 3;
  if (hasEquippedTrait(rider, 'Quick Hands') && ['revolver', 'throwable', 'melee'].includes(getWeapon(rider).id)) speed += 2;
  if (hasEquippedTrait(rider, 'Ghost Sprint') && isMounted(rider)) speed += 3;
  if (hasEquippedTrait(rider, 'Loose Reins') && isMounted(rider)) speed += 2;
  if (hasPartySynergy(partySynergy, 'stampede') && isMounted(rider)) speed += 2 + Math.min(2, countEquippedTraitTag(partySynergy, 'Mounted'));
  if (hasPartySynergy(partySynergy, 'dust-devils')) speed += 2 + Math.min(2, countEquippedTraitTag(partySynergy, 'Mobility'));
  if (hasStatus(rider, 'quick')) speed += 5;
  if (hasStatus(rider, 'showdown')) speed += 8;
  if (hasStatus(rider, 'grit')) speed += 10;
  if (hasStatus(rider, 'bleeding-out')) speed += Math.round((1 - rider.hp / rider.maxHp) * 10);
  if (hasStatus(rider, 'sunstroke')) speed *= 0.75;
  if (hasStatus(rider, 'dust-choked')) speed *= 0.82;
  if (hasStatus(rider, 'fatigue')) speed *= 0.68;
  if (hasStatus(rider, 'horse-panic') && isMounted(rider)) speed *= hasEquippedTrait(rider, 'Steady Reins') || hasEquippedTrait(rider, 'Trusted Mount') ? 0.84 : 0.7;
  return Math.max(8, speed);
}

export function enemySpeed(enemy) {
  let speed = enemy.speed;
  if (hasStatus(enemy, 'snared')) speed *= 0.56;
  if (hasStatus(enemy, 'sunstroke')) speed *= 0.75;
  if (hasStatus(enemy, 'dust-choked')) speed *= 0.82;
  if (hasStatus(enemy, 'fatigue')) speed *= 0.68;
  if (hasStatus(enemy, 'showdown')) speed += 8;
  if (hasStatus(enemy, 'bleeding-out')) speed += Math.round((1 - enemy.hp / enemy.maxHp) * 8);
  return Math.max(4, speed);
}

export function riderDamage(rider, target, map, partySynergy = null) {
  const riderTerrain = getTerrain(rider, map);
  const targetTerrain = getTerrain(target, map);
  const riderLane = getLane(rider);
  const targetLane = getLane(target);
  const laneGap = laneDistance(rider, target);
  const weapon = getWeapon(rider);
  let damage = isMounted(rider) ? 18 : 15;

  damage += weapon.damage;
  if (weapon.id === 'shotgun' && laneGap <= 1) damage += 8;
  if (weapon.id === 'shotgun' && laneGap >= 3) damage -= 4;
  if (weapon.id === 'rifle' && riderLane === 'Back') damage += 5;
  if (weapon.id === 'rifle' && riderTerrain.cover && !isMounted(rider)) damage += 4;
  if (weapon.id === 'rifle' && riderLane === 'Front') damage -= 4;
  if (weapon.id === 'revolver' && riderLane === 'Mid') damage += 3;
  if (weapon.id === 'throwable' && targetTerrain.cover) damage += 4;
  if (weapon.id === 'melee' && laneGap === 0) damage += 7;
  if (weapon.id === 'melee' && isMounted(rider)) damage += 3;

  if (hasPreferredWeapon(rider) && rider.talent?.id === 'close-quarters-marshal' && laneGap <= 1) damage += 6;
  if (hasPreferredWeapon(rider) && rider.talent?.id === 'fan-the-hammer' && riderLane === 'Mid') damage += 4;
  if (hasPreferredWeapon(rider) && rider.talent?.id === 'patient-surgeon' && (riderLane === 'Back' || riderTerrain.cover)) damage += 4;
  if (hasEquippedTrait(rider, 'Breacher') && weapon.id === 'shotgun' && laneGap <= 1) damage += 5;
  if (hasEquippedTrait(rider, 'Blood Price') && hasStatus(target, 'bleeding-out')) damage += 5;
  if (hasEquippedTrait(rider, 'Hot Hand') && weapon.id === 'revolver' && riderLane === 'Mid') damage += 3;
  if (hasEquippedTrait(rider, 'Wanted Smile') && hasStatus(rider, 'wanted')) damage += 4;
  if (hasEquippedTrait(rider, 'Duel Spark') && hasStatus(rider, 'showdown')) damage += 5;
  if (hasEquippedTrait(rider, 'Steady Aim') && weapon.id === 'rifle' && (riderLane === 'Back' || riderTerrain.cover)) damage += 4;
  if (hasEquippedTrait(rider, 'Long Watch') && riderLane === 'Back') damage += 3;
  if (hasEquippedTrait(rider, 'Iron Charge') && isMounted(rider)) damage += 4;
  if (hasPartySynergy(partySynergy, 'stampede') && isMounted(rider)) damage += 4 + Math.min(2, countEquippedTraitTag(partySynergy, 'Mounted'));
  if (hasPartySynergy(partySynergy, 'deadeye') && ['rifle', 'revolver'].includes(weapon.id) && riderLane !== 'Front') damage += 3 + Math.min(2, countEquippedTraitTag(partySynergy, weapon.id === 'rifle' ? 'Rifle' : 'Revolver'));
  if (hasPartySynergy(partySynergy, 'iron-vultures') && (hasStatus(target, 'bleeding-out') || hasStatus(rider, 'wanted') || hasStatus(rider, 'grit'))) damage += 4 + Math.min(2, countEquippedTraitTag(partySynergy, 'Bleed') + countEquippedTraitTag(partySynergy, 'Wanted') + countEquippedTraitTag(partySynergy, 'Grit'));

  if (rider.riderStance === 'Sharpshooter') damage += 9 + riderTerrain.elevation * 3;
  if (rider.riderStance === 'Sharpshooter' && riderLane === 'Back') damage += 7;
  if (rider.riderStance === 'Sharpshooter' && riderLane === 'Front') damage -= 5;
  if (rider.riderStance === 'Outlaw') damage += Math.round((1 - rider.hp / rider.maxHp) * 18);
  if (rider.riderStance === 'Outlaw' && riderLane === 'Front') damage += 6;
  if (rider.horseStance === 'Stampede' && isMounted(rider)) damage += targetTerrain.elevation < 0 ? 12 : 8;
  if (rider.horseStance === 'Stampede' && isMounted(rider) && targetLane !== 'Front') damage += 4;
  if (rider.horseStance === 'Wild Frenzy' && isMounted(rider)) damage += 5;
  if (rider.riderStance === 'Gunslinger') damage += 4;
  if (rider.riderStance === 'Gunslinger' && riderLane === 'Mid') damage += 5;
  if (rider.riderStance === 'Gunslinger' && laneGap >= 2) damage -= 5;
  if (rider.riderStance === 'Wrangler' && hasStatus(target, 'horse-panic')) damage += 5;
  if (targetTerrain.cover && !isMounted(rider)) damage -= 4;
  if (rider.riderStance === 'Sharpshooter' && riderTerrain.cover && !isMounted(rider)) damage += 5;
  if (hasStatus(target, 'marked')) damage += 7;
  if (riderTerrain.elevation > targetTerrain.elevation) damage += 4;
  if (riderTerrain.elevation < targetTerrain.elevation) damage -= 3;
  if (hasStatus(rider, 'wanted')) damage *= 1.18;
  if (hasStatus(rider, 'whiskey-dazed')) damage *= 1.08;
  if (hasStatus(rider, 'showdown')) damage *= 1.25;
  if (hasStatus(rider, 'sunstroke')) damage *= 0.86;
  if (hasStatus(rider, 'dust-choked')) damage *= 0.72;
  if (hasStatus(rider, 'horse-panic') && isMounted(rider)) damage *= 0.72;

  return Math.max(4, Math.round(damage));
}

export function skillPower(skill, rider, target, map, partySynergy = null) {
  if (skill.power < 0) return skill.power;
  let power = skill.power;
  const riderTerrain = getTerrain(rider, map);
  const riderLane = getLane(rider);
  const gap = laneDistance(rider, target);
  const weapon = getWeapon(rider);

  power += Math.round(weapon.damage / 2);
  if (weapon.id === 'shotgun' && gap <= 1) power += 5;
  if (weapon.id === 'shotgun' && gap >= 3) power -= 3;
  if (weapon.id === 'rifle' && riderLane === 'Back') power += 3;
  if (weapon.id === 'revolver' && riderLane === 'Mid') power += 2;
  if (weapon.id === 'throwable' && target.statuses?.length) power += 4;
  if (weapon.id === 'melee' && gap === 0) power += 5;
  if (hasPreferredWeapon(rider) && rider.talent?.id === 'close-quarters-marshal' && gap <= 1) power += 4;
  if (hasPreferredWeapon(rider) && rider.talent?.id === 'fan-the-hammer' && riderLane === 'Mid') power += 3;
  if (hasPreferredWeapon(rider) && rider.talent?.id === 'patient-surgeon' && (riderLane === 'Back' || riderTerrain.cover)) power += 3;
  if (hasEquippedTrait(rider, 'Breacher') && weapon.id === 'shotgun' && gap <= 1) power += 3;
  if (hasEquippedTrait(rider, 'Hot Hand') && weapon.id === 'revolver' && riderLane === 'Mid') power += 2;
  if (hasEquippedTrait(rider, 'Wanted Smile') && hasStatus(rider, 'wanted')) power += 3;
  if (hasEquippedTrait(rider, 'Steady Aim') && weapon.id === 'rifle' && (riderLane === 'Back' || riderTerrain.cover)) power += 3;
  if (hasPartySynergy(partySynergy, 'deadeye') && ['rifle', 'revolver'].includes(weapon.id) && riderLane !== 'Front') power += 2 + Math.min(1, countEquippedTraitTag(partySynergy, weapon.id === 'rifle' ? 'Rifle' : 'Revolver'));
  if (hasPartySynergy(partySynergy, 'dust-devils') && (weapon.id === 'throwable' || hasStatus(target, 'snared') || hasStatus(target, 'dust-choked'))) power += 3 + Math.min(2, countEquippedTraitTag(partySynergy, 'Mobility'));
  if (hasPartySynergy(partySynergy, 'iron-vultures') && (hasStatus(target, 'bleeding-out') || hasStatus(rider, 'wanted') || hasStatus(rider, 'grit'))) power += 3 + Math.min(2, countEquippedTraitTag(partySynergy, 'Bleed') + countEquippedTraitTag(partySynergy, 'Wanted') + countEquippedTraitTag(partySynergy, 'Grit'));

  if (riderTerrain.elevation > 0 && skill.id === 'iron-shot') power += riderTerrain.elevation * 4;
  if (skill.id === 'iron-shot' && riderLane === 'Back') power += 4;
  if (skill.id === 'fan-fire' && riderLane === 'Mid') power += 6;
  if (skill.id === 'fan-fire' && gap >= 2) power -= 4;
  if (skill.id === 'lasso-snag' && rider.riderStance === 'Wrangler') power += 5;
  if (skill.id === 'low-health-shot' && riderLane === 'Front') power += 5;
  if (skill.outlawBonus) power += Math.round((1 - rider.hp / rider.maxHp) * 18);
  if (hasStatus(target, 'marked')) power += 8;
  if (hasStatus(target, 'snared') && skill.id === 'fan-fire') power += 5;
  if (hasStatus(rider, 'wanted')) power *= 1.18;
  if (hasStatus(rider, 'whiskey-dazed')) power *= 1.08;
  if (hasStatus(rider, 'showdown')) power *= 1.25;
  if (hasStatus(rider, 'sunstroke')) power *= 0.86;
  if (hasStatus(rider, 'dust-choked')) power *= 0.72;
  if (hasStatus(rider, 'horse-panic') && isMounted(rider)) power *= 0.72;
  return Math.max(0, Math.round(power));
}

export function talentFollowUp(rider, target, map) {
  const weapon = getWeapon(rider);
  const riderTerrain = getTerrain(rider, map);
  const riderLane = getLane(rider);
  const gap = laneDistance(rider, target);

  if (hasEquippedTrait(rider, 'Ride-By Nerve') && isMounted(rider)) {
    return { atb: 6, log: `${rider.name}'s Ride-By Nerve keeps the pressure up.` };
  }
  if (!hasPreferredWeapon(rider)) return null;
  if (rider.talent?.id === 'close-quarters-marshal' && weapon.id === 'shotgun' && gap <= 1) {
    return { status: 'bleeding-out', log: `${rider.talent.name} tears open Bleeding Out.` };
  }
  if (rider.talent?.id === 'fan-the-hammer' && weapon.id === 'revolver' && riderLane === 'Mid') {
    return { atb: 12, log: `${rider.talent.name} keeps ${rider.name}'s tempo high.` };
  }
  if (rider.talent?.id === 'patient-surgeon' && weapon.id === 'rifle' && (riderLane === 'Back' || riderTerrain.cover)) {
    return { status: 'marked', log: `${rider.talent.name} marks ${target.name} for follow-up fire.` };
  }
  return null;
}

export function weaponFollowUp(rider, target) {
  const weapon = getWeapon(rider);
  const gap = laneDistance(rider, target);

  if (weapon.id === 'throwable') {
    return { status: 'snared', log: `${rider.name}'s throwables slow ${target.name}.` };
  }
  if (weapon.id === 'melee' && gap === 0) {
    return { status: 'horse-panic', log: `${rider.name} breaks ${target.name}'s momentum up close.` };
  }
  return null;
}

export function incomingDamage(target, amount, map, partySynergy = null) {
  const terrain = getTerrain(target, map);
  const horse = getHorse(target);
  const lane = getLane(target);
  let damage = amount;

  if (isMounted(target)) damage *= horse.guard;
  if (isMounted(target) && lane === 'Front') damage *= 1.08;
  if (!isMounted(target) && lane === 'Back') damage *= 0.94;
  if (target.riderStance === 'Iron Rider') damage *= 0.78;
  if (target.riderStance === 'Sharpshooter' && lane === 'Front') damage *= 1.12;
  if (target.riderStance === 'Outlaw' && lane === 'Front') damage *= 0.94;
  if (target.horseStance === 'Defensive Guard' && isMounted(target)) damage *= 0.74;
  if (hasEquippedTrait(target, 'Iron Hide') && target.riderStance === 'Iron Rider') damage *= 0.9;
  if (hasEquippedTrait(target, 'Dust Shield') && terrain.cover && !isMounted(target)) damage *= 0.88;
  if (hasEquippedTrait(target, 'Saddle Guard') && isMounted(target) && lane === 'Front') damage *= 0.88;
  if (hasEquippedTrait(target, 'Calm Under Fire') && hasStatus(target, 'horse-panic')) damage *= 0.9;
  if (hasPartySynergy(partySynergy, 'frontier-survivors')) damage *= 0.92 - Math.min(0.04, countEquippedTraitTag(partySynergy, 'Tank') * 0.02);
  if (terrain.cover && !isMounted(target)) damage *= 0.72;
  if (terrain.elevation < 0) damage *= 1.12;
  if (hasStatus(target, 'guarded')) damage *= 0.62;
  if (hasStatus(target, 'grit')) damage *= 0.72;
  if (hasStatus(target, 'whiskey-dazed')) damage *= 0.72;
  if (hasStatus(target, 'wanted')) damage *= 1.2;

  return Math.max(1, Math.round(damage));
}

export function healingAmount(target, baseAmount, healer = target, partySynergy = null) {
  let healing = baseAmount;
  if (hasEquippedTrait(healer, 'Trail Triage')) healing += 5;
  if (hasEquippedTrait(healer, 'Field Surgeon')) healing += 7;
  if (hasEquippedTrait(healer, 'Dustproof Saddle') && isMounted(healer)) healing += 4;
  if (hasPartySynergy(partySynergy, 'frontier-survivors')) healing += 4 + Math.min(3, countEquippedTraitTag(partySynergy, 'Support'));
  if (hasStatus(target, 'sunstroke')) healing *= 0.62;
  if (hasStatus(target, 'fatigue')) healing *= 0.82;
  return Math.max(1, Math.round(healing));
}
