const travelEncounters = ['redSashAmbush', 'ridgeDuel', 'gullyRush'];

export function resolveTravelChoice(state, risky) {
  const progress = risky ? 34 : 22;
  const battleChance = risky ? 0.72 : 0.34;
  const result = {
    startsBattle: false,
    message: '',
  };

  state.routeProgress = Math.min(100, state.routeProgress + progress);

  if (risky) {
    state.money += 10;
    state.wanted += 1;
    result.message = 'The crew hits a payroll lockbox. Cash rises, and the wanted heat follows.';
  } else if (state.supplies > 0) {
    state.supplies -= 1;
    result.message = 'The crew scouts ridges and spends supplies to avoid the worst of the trail.';
  } else {
    result.message = 'No supplies left. Even careful travel leaves the crew exposed.';
  }

  result.startsBattle = state.routeProgress >= 100 || Math.random() < battleChance;
  if (result.startsBattle) {
    const heatIndex = Math.min(travelEncounters.length - 1, Math.floor(state.wanted / 2));
    const randomIndex = Math.floor(Math.random() * (heatIndex + 1));
    state.nextEncounterId = travelEncounters[randomIndex];
  }
  return result;
}

export function chooseBountyEncounter(state) {
  state.nextEncounterId = 'redSashRiflemanBounty';
}
