describe('En-tête — horloge et navigation', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
  });

  it('affiche l\'horloge du cycle', () => {
    cy.get('[data-testid="cycle-progress-bar"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="header-game-clock"]').should('be.visible');
    cy.get('[data-testid="header-game-clock"]').contains(/H\d+/);
  });

  it('déplie le détail du cycle', () => {
    cy.get('[data-testid="cycle-progress-toggle"]').click();
    cy.get('[data-testid="cycle-progress-detail"]').should('be.visible');
    cy.get('[data-testid="cycle-step-start"]').should('be.visible');
    cy.get('[data-testid="cycle-step-mid"]').should('be.visible');
  });
});
