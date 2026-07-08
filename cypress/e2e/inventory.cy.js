describe('Inventaire', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
    cy.visitNav('inventory');
  });

  it('affiche les objets et ninjas de l\'inventaire', () => {
    cy.get('[data-testid="inventory-content"]', { timeout: 15000 }).should('be.visible');
  });
});
