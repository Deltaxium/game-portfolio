import { partyTemplate } from '../config/gameData.js';

export function createParty() {
  return partyTemplate.map((rider) => ({
    ...rider,
    grid: { ...rider.grid },
    skills: rider.skills.map((skill) => ({ ...skill })),
    talent: { ...rider.talent },
    combatTraits: rider.combatTraits.map((trait) => (trait ? { ...trait, tags: [...trait.tags] } : null)),
    combatTraitOptions: rider.combatTraitOptions.map((trait) => ({ ...trait, tags: [...trait.tags] })),
    bondTraits: rider.bondTraits.map((trait) => (trait ? { ...trait, tags: [...trait.tags] } : null)),
    bondTraitOptions: rider.bondTraitOptions.map((trait) => ({ ...trait, tags: [...trait.tags] })),
    horseBonds: { ...rider.horseBonds },
    statuses: [],
  }));
}

export function restoreParty(party) {
  party.forEach((rider) => {
    rider.hp = rider.maxHp;
    rider.atb = 0;
    rider.statuses = [];
  });
}
