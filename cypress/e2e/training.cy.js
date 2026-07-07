describe('Entraînement — plans par ninja', () => {
  before(() => {
    cy.task('resetDemoCycle');
  });

  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/training');
  });

  it('définit un plan d\'entraînement', () => {
    cy.get('[data-testid="bureau-training-panel"]').should('be.visible');
    cy.get('[data-testid="training-plan-select"]').first().select('Taijutsu');
    cy.get('[data-testid="training-plan-select"]').first().should('have.value', 'Taijutsu');
  });
});
