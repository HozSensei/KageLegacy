describe('Auth — connexion démo', () => {
  it('redirige vers le Bureau après login', () => {
    cy.loginDemo();
    cy.visit('/');
    cy.contains('Bureau du Sensei').should('exist');
  });

  it('refuse des identifiants invalides', () => {
    Cypress.session.clearAllSavedSessions();
    cy.visit('/login');
    cy.get('[data-testid="login-username"]').type('invalid_user');
    cy.get('[data-testid="login-password"]').type('wrongpassword');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="login-error"]').should('be.visible');
    cy.url().should('include', '/login');
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
