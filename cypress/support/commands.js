Cypress.Commands.add('loginDemo', () => {
  cy.session(
    'demo_sensei',
    () => {
      cy.visit('/login');
      cy.get('[data-testid="login-username"]').clear().type('demo_sensei');
      cy.get('[data-testid="login-password"]').clear().type('demo');
      cy.get('[data-testid="login-submit"]').click();
      cy.url({ timeout: 15000 }).should('not.include', '/login');
    },
    { cacheAcrossSpecs: true }
  );
});
