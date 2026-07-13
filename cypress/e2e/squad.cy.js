describe('Escouade — composition', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
    cy.visitNav('squad');
  });

  it('affiche la composition avec 3 ninjas actifs', () => {
    cy.get('[data-testid="squad-composition"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="squad-composition"] .squad-card-wrap').should('have.length', 3);
  });

  it('affiche le panneau deck d\'opération', () => {
    cy.get('[data-testid="operation-deck"]', { timeout: 15000 }).should('be.visible');
  });
});
