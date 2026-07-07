describe('Escouade — composition', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
    cy.visitNav('squad');
  });

  it('affiche la composition avec 3 ninjas actifs', () => {
    cy.get('[data-testid="squad-composition"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="squad-composition"] .squad-card-wrap').should('have.length', 3);
  });
});
