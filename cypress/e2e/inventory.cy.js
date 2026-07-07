describe('Inventaire', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
    cy.visitNav('inventory');
  });

  it('affiche les objets et ninjas du dojo', () => {
    cy.get('[data-testid="inventory-content"]', { timeout: 15000 }).should('be.visible');
  });
});
