export const partySynergyDefinitions = {
  stampede: {
    id: 'stampede',
    name: 'The Stampede',
    identity: 'A mounted aggression crew focused on forward pressure, rapid repositioning, and collapsing enemy formations.',
    description: 'Mounted aggression and positional pressure.',
    baseEffect: 'Mounted movement costs slightly less ATB.',
    surgeTrigger: 'Two or more mounted allies enter aggressive stances, and at least one ally advances toward enemy lines.',
    surgeState: 'Stampede Surge',
    surgeEffects: [
      'Mounted attacks increase Panic buildup slightly.',
      'Charge-style attacks gain stronger pushback.',
      'Mounted movement through open terrain becomes cheaper temporarily.',
    ],
    fantasy: 'A violent cavalry push that overwhelms space before enemies stabilize.',
  },
  deadeye: {
    id: 'deadeye',
    name: 'Deadeye Posse',
    identity: 'Precision shooters coordinating focused eliminations through rifle pressure, focused fire, and exposed targets.',
    description: 'Precision fire and coordinated target exposure.',
    baseEffect: 'Marked enemies are easier to critically hit.',
    surgeTrigger: 'Multiple rifle, revolver, or Sharpshooter allies attack the same enemy.',
    surgeState: 'Deadeye Focus',
    surgeEffects: [
      'Marked enemies suffer reduced cover effectiveness.',
      'Follow-up attacks against marked enemies gain improved hit chance.',
      'Precision attacks slightly reduce enemy ATB momentum.',
    ],
    fantasy: 'Coordinated gunslingers creating controlled execution pressure.',
  },
  'frontier-survivors': {
    id: 'frontier-survivors',
    name: 'Frontier Survivors',
    identity: 'A durable defensive crew built around holding territory, resisting pressure, and stabilizing under fire.',
    description: 'Defensive endurance and battlefield stability.',
    baseEffect: 'Allies recover from Panic slightly faster.',
    surgeTrigger: 'Multiple allies use defensive tools, or the crew stays grouped while absorbing pressure.',
    surgeState: 'Last Stand',
    surgeEffects: [
      'Guarding allies reduces incoming Panic buildup.',
      'Cover degrades more slowly temporarily.',
      'Grit activates slightly easier for wounded allies.',
    ],
    fantasy: 'Hardened survivors refusing to break without becoming immortal tanks.',
  },
  'dust-devils': {
    id: 'dust-devils',
    name: 'Dust Devils',
    identity: 'Fast-moving outlaws controlling combat through repositioning, flanking, and tempo disruption.',
    description: 'Movement-heavy tempo pressure.',
    baseEffect: 'Repositioning grants slight ATB recovery.',
    surgeTrigger: 'Multiple allies reposition within a short timeframe, or flank enemy lanes aggressively.',
    surgeState: 'Dust Rush',
    surgeEffects: [
      'Repositioning costs slightly less ATB temporarily.',
      'Flanking attacks gain improved hit chance.',
      'Enemy targeting becomes less stable against moving allies.',
    ],
    fantasy: 'Fast-moving outlaws creating mobility pressure without infinite movement loops.',
  },
  'iron-vultures': {
    id: 'iron-vultures',
    name: 'Iron Vultures',
    identity: 'A brutal pressure posse focused on wounded enemies, bleed escalation, and execution momentum.',
    description: 'Wounded target pressure and bleed control.',
    baseEffect: 'Bleeding enemies are easier to pressure and finish.',
    surgeTrigger: 'Multiple enemies become Bleeding Out simultaneously.',
    surgeState: 'Blood Trail',
    surgeEffects: [
      'Bleeding enemies become easier to interrupt.',
      'Bleeding Out durations refresh slightly from close-range attacks.',
      'Enemy Panic increases against heavily wounded allies.',
    ],
    fantasy: 'Ruthless hunters circling weakened prey.',
  },
  'outlaw-rush': {
    id: 'outlaw-rush',
    name: 'Outlaw Rush',
    identity: 'High-risk outlaws who fight harder while exposed through dangerous positioning and reckless aggression.',
    description: 'Exposed aggression and unstable momentum.',
    baseEffect: 'Exposed allies gain small ATB momentum when attacking aggressively.',
    surgeTrigger: 'Multiple allies remain outside strong cover and continue attacking aggressively.',
    surgeState: 'No Turning Back',
    surgeEffects: [
      'Aggressive attacks generate increased ATB momentum.',
      'Showdown pressure increases slightly.',
      'Suppression effects weaken temporarily.',
    ],
    fantasy: 'Desperate outlaws committing to danger without making defensive play obsolete.',
  },
  'trail-wardens': {
    id: 'trail-wardens',
    name: 'Trail Wardens',
    identity: 'Protective battlefield controllers focused on escorting, holding positions, and protecting objectives.',
    description: 'Formation defense and support control.',
    baseEffect: 'Guard and support actions cost slightly less ATB.',
    surgeTrigger: 'Multiple allies use guard, healing, or defensive actions to hold formation.',
    surgeState: 'Hold the Line',
    surgeEffects: [
      'Guard reactions trigger more often.',
      'Nearby allies recover from Panic slightly faster.',
      'Defensive repositioning becomes cheaper temporarily.',
    ],
    fantasy: 'A disciplined crew creating stable formation defense without passive stall gameplay.',
  },
  'gravewind-riders': {
    id: 'gravewind-riders',
    name: 'Gravewind Riders',
    identity: 'Mounted terror and battlefield disruption focused on panic pressure and scattering enemy formations.',
    description: 'Mounted terror and lane disruption.',
    baseEffect: 'Mounted attacks slightly increase enemy Panic buildup.',
    surgeTrigger: 'Mounted allies aggressively pressure multiple enemy lanes.',
    surgeState: 'Panic Run',
    surgeEffects: [
      'Panicked enemies lose ATB efficiency temporarily.',
      'Mounted attacks disrupt enemy targeting slightly.',
      'Panicked enemies reposition less effectively.',
    ],
    fantasy: 'Terrifying mounted raiders creating battlefield instability without removing enemy control.',
  },
  'ashen-trail': {
    id: 'ashen-trail',
    name: 'Ashen Trail',
    identity: 'Attrition and battlefield exhaustion through lingering pressure, control, and status layering.',
    description: 'Gradual status attrition and battlefield control.',
    baseEffect: 'Enemy recovery from negative statuses slows slightly.',
    surgeTrigger: 'Multiple enemies suffer different status effects simultaneously.',
    surgeState: 'Choking Dust',
    surgeEffects: [
      'Dust-Choked spreads more easily nearby.',
      'Enemy ATB recovery slows slightly while statused.',
      'Healing and recovery effects weaken temporarily.',
    ],
    fantasy: 'Gradual battlefield collapse without permanent hard-locks.',
  },
  'sundown-reapers': {
    id: 'sundown-reapers',
    name: 'Sundown Reapers',
    identity: 'Focused execution and duel pressure built around isolating targets and finishing weakened enemies.',
    description: 'Isolated target execution and duel pressure.',
    baseEffect: 'Showdown pressure builds faster against isolated enemies.',
    surgeTrigger: 'Multiple allies focus the same isolated enemy, or consecutive attacks pressure a vulnerable target.',
    surgeState: 'Final Draw',
    surgeEffects: [
      'Isolated enemies become easier to interrupt.',
      'Follow-up attacks gain stronger hit consistency.',
      'Eliminating enemies refunds small ATB to nearby allies.',
    ],
    fantasy: 'A posse coordinating deadly finishing strikes with measured execution momentum.',
  },
};

export function getPartySynergy(party) {
  const mounted = party.filter((rider) => rider.mounted && rider.horseId).length;
  const weapons = party.map((rider) => rider.equippedWeapon);
  const weaponCount = (weaponId) => weapons.filter((weapon) => weapon === weaponId).length;
  const stances = party.map((rider) => rider.riderStance);
  const horseStances = party.filter((rider) => rider.mounted && rider.horseId).map((rider) => rider.horseStance);
  const tags = party.flatMap((rider) => getEquippedTraitTags(rider));
  const tagCount = (value) => tags.filter((item) => item === value).length;
  const stanceCount = (stance) => stances.filter((item) => item === stance).length;
  const horseStanceCount = (stance) => horseStances.filter((item) => item === stance).length;
  const candidates = [];
  const pushCandidate = (id, score, priority = 3) => {
    candidates.push({
      ...partySynergyDefinitions[id],
      score,
      priority,
      traitTags: tags,
      surge: null,
    });
  };

  if (mounted >= 2 && (horseStanceCount('Stampede') >= 1 || stanceCount('Wrangler') >= 1 || horseStanceCount('Sprint') >= 1)) {
    pushCandidate('stampede', mounted * 3 + horseStanceCount('Stampede') * 2 + horseStanceCount('Sprint') + tagCount('Mounted'));
  }
  if (weaponCount('rifle') + weaponCount('revolver') >= 2 && (stanceCount('Sharpshooter') >= 1 || stanceCount('Gunslinger') >= 1)) {
    pushCandidate('deadeye', (weaponCount('rifle') + weaponCount('revolver')) * 2 + stanceCount('Sharpshooter') * 2 + stanceCount('Gunslinger') + tagCount('Mark'));
  }
  if (stanceCount('Iron Rider') >= 1 && (stanceCount('Wrangler') >= 1 || horseStanceCount('Defensive Guard') >= 1 || horseStanceCount('Calm Focus') >= 1)) {
    pushCandidate('frontier-survivors', stanceCount('Iron Rider') * 2 + stanceCount('Wrangler') + horseStanceCount('Defensive Guard') + horseStanceCount('Calm Focus') + tagCount('Tank'), 2);
  }
  if (weapons.includes('throwable') || stanceCount('Gunslinger') + stanceCount('Wrangler') >= 2 || horseStanceCount('Sprint') >= 1) {
    pushCandidate('dust-devils', stanceCount('Gunslinger') + stanceCount('Wrangler') + horseStanceCount('Sprint') * 2 + (weapons.includes('throwable') ? 3 : 0) + tagCount('Mobility'));
  }
  if (weaponCount('shotgun') + weaponCount('melee') >= 2 || stanceCount('Outlaw') >= 1 || stanceCount('Iron Rider') >= 2) {
    pushCandidate('iron-vultures', weaponCount('shotgun') * 2 + weaponCount('melee') * 2 + stanceCount('Outlaw') * 3 + stanceCount('Iron Rider') + tagCount('Bleed'));
  }
  if (stanceCount('Outlaw') >= 1 || tagCount('Wanted') >= 1 || tagCount('Duel') >= 2) {
    pushCandidate('outlaw-rush', stanceCount('Outlaw') * 3 + tagCount('Wanted') * 2 + tagCount('Duel') + weaponCount('revolver'));
  }
  if (tagCount('Support') + tagCount('Tank') >= 3 || stanceCount('Wrangler') + stanceCount('Iron Rider') >= 2 || horseStanceCount('Defensive Guard') >= 1) {
    pushCandidate('trail-wardens', tagCount('Support') * 2 + tagCount('Tank') * 2 + stanceCount('Wrangler') + horseStanceCount('Defensive Guard'), 2);
  }
  if (mounted >= 2 && (tagCount('Panic') >= 1 || stanceCount('Wrangler') >= 1 || horseStanceCount('Wild Frenzy') >= 1)) {
    pushCandidate('gravewind-riders', mounted * 2 + tagCount('Panic') * 2 + stanceCount('Wrangler') + horseStanceCount('Wild Frenzy') * 2);
  }
  if (weapons.includes('throwable') || tagCount('Mark') + tagCount('Panic') + tagCount('Bleed') >= 3) {
    pushCandidate('ashen-trail', tagCount('Mark') + tagCount('Panic') + tagCount('Bleed') + (weapons.includes('throwable') ? 3 : 0) + weaponCount('rifle'));
  }
  if (tagCount('Duel') >= 1 || stanceCount('Sharpshooter') + stanceCount('Outlaw') >= 2) {
    pushCandidate('sundown-reapers', tagCount('Duel') * 3 + stanceCount('Sharpshooter') * 2 + stanceCount('Outlaw') + weaponCount('revolver') + weaponCount('rifle'));
  }

  if (!candidates.length) {
    return { id: 'none', name: 'No Party Synergy', description: 'No crew-wide bonus active.', baseEffect: 'No crew-wide combat bonus active.', score: 0, priority: 0, traitTags: tags, surge: null };
  }
  return candidates.sort((a, b) => b.score - a.score || b.priority - a.priority || a.name.localeCompare(b.name))[0];
}

export function getEquippedTraitTags(rider) {
  return [
    ...(rider.combatTraits || []).filter(Boolean).flatMap((trait) => trait.tags || []),
    ...(rider.bondTraits || []).filter(Boolean).flatMap((trait) => trait.tags || []),
  ];
}

export function countEquippedTraitTag(partySynergy, tag) {
  return partySynergy?.traitTags?.filter((item) => item === tag).length || 0;
}

export function hasPartySynergy(synergy, id) {
  return synergy?.id === id;
}

export function hasSynergySurge(synergy, id = synergy?.id) {
  return Boolean(synergy?.id === id && synergy?.surge?.active);
}
