describe('Entraînement — préparation et global', () => {
  before(() => {
    cy.task('resetDemoCycle');
  });

  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/training');
  });

  it('définit un entraînement global et une préparation', () => {
    cy.get('[data-testid="bureau-training-panel"]').should('be.visible');

    cy.get('[data-testid="global-training-select"]').select('Chakra');
    cy.get('[data-testid="global-training-select"]').should('have.value', 'Chakra');

    cy.get('[data-testid="training-plan-select"]').first().select('Ninjutsu');
    cy.get('[data-testid="training-plan-select"]').first().should('have.value', 'Ninjutsu');
  });
});
