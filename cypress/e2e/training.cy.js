describe('Bureau — plans d\'entraînement', () => {
  before(() => {
    cy.task('resetDemoCycle');
  });

  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
    cy.get('[data-testid="missions-panel"]', { timeout: 15000 }).should('be.visible');
  });

  it('définit un plan sans démonter le panneau missions', () => {
    cy.get('[data-testid="bureau-training-panel"]').scrollIntoView().should('be.visible');
    cy.get('[data-testid="training-plan-select"]').first().select('Taijutsu');
    cy.get('[data-testid="missions-panel"]').should('be.visible');
    cy.get('[data-testid="training-plan-select"]').first().should('have.value', 'Taijutsu');
  });
});
