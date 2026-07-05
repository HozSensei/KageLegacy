/**
 * Test logique promotions/relégations (sans BDD).
 */
import { getPoolStandingsOrdered, processSeasonEnd } from '../src/services/seasonService.js';

// Vérifie uniquement que le module s'importe ; les tests BDD nécessitent migrate + seed.
console.log('seasonService exports:', typeof getPoolStandingsOrdered, typeof processSeasonEnd);
console.log('season end module OK');
