import assert from 'node:assert/strict';
import { getFactoryObjective } from '../src/game/systems/objectives.js';

const cases = [
  {
    state: { currentMapId: 'factoryDistrict', factoryInteriorUnlocked: false },
    expected: 'Find a way into the factory',
  },
  {
    state: { currentMapId: 'factoryDistrict', factoryInteriorUnlocked: true },
    expected: 'Enter the factory',
  },
  {
    state: { currentMapId: 'factoryInterior', factoryInteriorUnlocked: true },
    expected: 'Find the control room',
  },
];

cases.forEach(({ state, expected }) => {
  assert.equal(getFactoryObjective(state), expected);
});

console.log('objective checks ok');
