describe('Magasin du village', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
    cy.visitNav('market');
  });

  it('affiche le catalogue et le solde Ryos', () => {
    cy.get('[data-testid="market-catalog"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="market-catalog"]').contains(/Ryos/);
    cy.get('[data-testid="market-catalog"] article').should('have.length.gte', 1);
  });
});
