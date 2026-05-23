export function getPartySynergy(party) {
  const mounted = party.filter((rider) => rider.mounted && rider.horseId).length;
  const weapons = party.map((rider) => rider.equippedWeapon);
  const weaponCount = (weaponId) => weapons.filter((weapon) => weapon === weaponId).length;
  const stances = party.map((rider) => rider.riderStance);
  const horseStances = party.filter((rider) => rider.mounted && rider.horseId).map((rider) => rider.horseStance);
  const tags = party.flatMap((rider) => getEquippedTraitTags(rider));
  const count = (value) => tags.filter((item) => item === value).length;
  const stanceCount = (stance) => stances.filter((item) => item === stance).length;
  const horseStanceCount = (stance) => horseStances.filter((item) => item === stance).length;
  const candidates = [];

  if (mounted >= 2 && (horseStanceCount('Stampede') >= 1 || stanceCount('Wrangler') >= 1 || horseStanceCount('Sprint') >= 1)) {
    candidates.push({
      id: 'stampede',
      name: 'The Stampede',
      description: 'Mounted pressure and charge tempo.',
      score: mounted * 3 + horseStanceCount('Stampede') * 2 + horseStanceCount('Sprint'),
      priority: 3,
      traitTags: tags,
    });
  }
  if (weaponCount('rifle') + weaponCount('revolver') >= 2 && (stanceCount('Sharpshooter') >= 1 || stanceCount('Gunslinger') >= 1)) {
    candidates.push({
      id: 'deadeye',
      name: 'Deadeye Posse',
      description: 'Clean lanes and precision fire.',
      score: (weaponCount('rifle') + weaponCount('revolver')) * 2 + stanceCount('Sharpshooter') * 2 + stanceCount('Gunslinger'),
      priority: 3,
      traitTags: tags,
    });
  }
  if (weapons.includes('throwable') || stanceCount('Gunslinger') + stanceCount('Wrangler') >= 2 || horseStanceCount('Sprint') >= 1) {
    candidates.push({
      id: 'dust-devils',
      name: 'Dust Devils',
      description: 'Fast movement and disruption.',
      score: stanceCount('Gunslinger') + stanceCount('Wrangler') + horseStanceCount('Sprint') * 2 + (weapons.includes('throwable') ? 3 : 0),
      priority: 3,
      traitTags: tags,
    });
  }
  if (weaponCount('shotgun') + weaponCount('melee') >= 2 || stanceCount('Outlaw') >= 1 || stanceCount('Iron Rider') >= 2) {
    candidates.push({
      id: 'iron-vultures',
      name: 'Iron Vultures',
      description: 'Risk, bleed, and comeback grit.',
      score: weaponCount('shotgun') * 2 + weaponCount('melee') * 2 + stanceCount('Outlaw') * 3 + stanceCount('Iron Rider'),
      priority: 3,
      traitTags: tags,
    });
  }
  if (stanceCount('Iron Rider') >= 1 && (stanceCount('Wrangler') >= 1 || horseStanceCount('Defensive Guard') >= 1 || horseStanceCount('Calm Focus') >= 1)) {
    candidates.push({
      id: 'frontier-survivors',
      name: 'Frontier Survivors',
      description: 'Balanced sustain and control.',
      score: stanceCount('Iron Rider') * 2 + stanceCount('Wrangler') + horseStanceCount('Defensive Guard') + horseStanceCount('Calm Focus'),
      priority: 1,
      traitTags: tags,
    });
  }
  if (!candidates.length) return { id: 'none', name: 'No Party Synergy', description: 'No crew-wide bonus active.', score: 0, priority: 0, traitTags: tags };
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
