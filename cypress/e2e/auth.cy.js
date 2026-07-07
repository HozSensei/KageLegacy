describe('Auth — connexion démo', () => {
  it('redirige vers le Bureau après login', () => {
    cy.loginDemo();
    cy.visit('/');
    cy.contains('Bureau du Sensei').should('exist');
  });

  it('déconnecte et retourne au login', () => {
    cy.loginDemo();
    cy.visit('/');
    cy.get('[data-testid="logout-button"]').click();
    cy.url().should('include', '/login');
    cy.get('[data-testid="login-form"]').should('be.visible');
    Cypress.session.clearAllSavedSessions();
  });
});
