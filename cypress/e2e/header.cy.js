describe('Header — horloge de cycle V2', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
  });

  it('affiche la barre de progression et l’horloge', () => {
    cy.get('[data-testid="cycle-progress-bar"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="header-game-clock"]').should('be.visible');
    cy.get('[data-testid="header-game-clock"]').contains(/\d+h\d{2}:\d{2}/);
  });

  it('ouvre le détail des jalons', () => {
    cy.get('[data-testid="cycle-progress-toggle"]').click();
    cy.get('[data-testid="cycle-progress-detail"]').should('be.visible');
    cy.get('[data-testid="cycle-step-start"]').should('be.visible');
    cy.get('[data-testid="cycle-step-mid"]').should('be.visible');
  });
});
