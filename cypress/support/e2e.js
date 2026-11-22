import './commands';

/**
 * Les overlays « première visite » (anatomie carte, guide missions) bloquent
 * les clics Cypress. On les marque vus sauf si un spec les efface explicitement.
 */
Cypress.on('window:before:load', win => {
  try {
    win.localStorage.setItem('kage.cardAnatomyGuide.v1', '1');
    win.localStorage.setItem('kage.missionGuide.v1', '1');
  } catch {
    /* ignore */
  }
});
