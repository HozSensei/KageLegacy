describe('Bureau — panneaux clés', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
  });

  it('affiche le Bureau et les panneaux budget / académie', () => {
    cy.get('[data-testid="bureau-page"]', { timeout: 15000 }).should('be.visible');
    cy.contains('Bureau du Sensei').should('exist');
    cy.get('[data-testid="bureau-budget-panel"]').should('be.visible');
    cy.get('[data-testid="bureau-academy-panel"]').should('be.visible');
  });

  it('affiche le panneau missions', () => {
    cy.get('[data-testid="missions-panel"]', { timeout: 15000 }).should('be.visible');
    cy.contains('Contrats de mission').should('exist');
  });
});
