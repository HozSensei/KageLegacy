describe('Auth — connexion démo (V2)', () => {
  it('redirige vers le hub après connexion', () => {
    cy.loginDemo();
    cy.visit('/home');
    cy.url().should('include', '/home');
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
  });

  it('redirige /bureau vers le hub', () => {
    cy.loginDemo();
    cy.visit('/bureau');
    cy.url().should('include', '/home');
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
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

  it('déconnecte et retourne au landing', () => {
    cy.loginDemo();
    cy.visit('/home');
    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-logout"]').click();
    cy.url().should('include', '/');
    cy.get('[data-testid="landing-page"]').should('be.visible');
  });
});
