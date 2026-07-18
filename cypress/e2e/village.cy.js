describe('Village — page et appartenance', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('affiche la page village et le village du Sensei', () => {
    cy.visit('/village');
    cy.get('[data-testid="village-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="village-identity"]').should('be.visible');
    cy.get('[data-testid="village-standings"]').should('be.visible');
    cy.get('[data-testid="village-actions"]').should('be.visible');
  });
});
