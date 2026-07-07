describe('Échanges entre joueurs', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
    cy.visitNav('exchanges');
  });

  it('affiche le marché et les annonces personnelles', () => {
    cy.get('[data-testid="exchanges-content"]', { timeout: 15000 }).should('be.visible');
  });
});
