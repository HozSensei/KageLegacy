/**
 * PvP queue V2 — smoke page load uniquement.
 * Matchmaking complet (2 users) hors CI standard.
 */
describe('PvP queue V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('charge la file d’attente', () => {
    cy.visit('/pvp');
    cy.get('[data-testid="pvp-queue-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="pvp-window"]').should('be.visible');
    cy.get('[data-testid="pvp-join-queue"]').should('be.visible');
  });
});
