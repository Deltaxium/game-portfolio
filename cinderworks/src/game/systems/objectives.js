export function getFactoryObjective({ currentMapId, factoryInteriorUnlocked }) {
  if (currentMapId === 'factoryControlRoom') return 'Factory control room reached';
  if (currentMapId === 'factoryInterior') return 'Find the control room';
  if (factoryInteriorUnlocked) return 'Enter the factory';
  return 'Find a way into the factory';
}
