import { ELEMENT_BEATS } from './constants.js';

export function elementDamageMultiplier(attackerElement, defenderElement) {
  if (ELEMENT_BEATS[attackerElement] === defenderElement) return 1.25;
  if (ELEMENT_BEATS[defenderElement] === attackerElement) return 0.85;
  return 1.0;
}
