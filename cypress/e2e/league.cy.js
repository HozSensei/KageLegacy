describe('Ligue — classement', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
    cy.visitNav('league');
  });

  it('affiche le classement du pool', () => {
    cy.get('[data-testid="league-standings"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="league-standings"] tbody tr').should('have.length.gte', 2);
  });
});
