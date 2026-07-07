describe('En-tête — horloge et navigation', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
  });

  it('affiche l\'horloge du cycle', () => {
    cy.get('[data-testid="header-game-clock"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="header-game-clock"]').contains(/H\d+/);
  });
});
