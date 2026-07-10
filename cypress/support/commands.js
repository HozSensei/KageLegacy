const NAV_PAGES = {
  bureau: { testId: 'bureau-page', path: '/bureau' },
  squad: { testId: 'squad-page', path: '/squad' },
  missions: { testId: 'missions-page', path: '/missions' },
  league: { testId: 'league-page', path: '/league' },
  market: { testId: 'market-page', path: '/market' },
  exchanges: { testId: 'exchanges-page', path: '/exchanges' },
  inventory: { testId: 'inventory-page', path: '/inventory' },
  operation: { testId: 'operation-page', path: '/operation' },
};

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
    {
      cacheAcrossSpecs: true,
      validate() {
        cy.request({ url: '/api/auth/me', failOnStatusCode: false }).its('status').should('eq', 200);
      },
    }
  );
});

Cypress.Commands.add('visitNav', (name) => {
  const page = NAV_PAGES[name];
  if (!page) throw new Error(`visitNav: page inconnue « ${name} »`);
  if (name === 'bureau') {
    cy.visit('/bureau');
  } else {
    cy.get(`[data-testid="nav-${name}"]`).first().click();
  }
  cy.url().should('include', page.path === '/bureau' ? '/bureau' : page.path);
  cy.get(`[data-testid="${page.testId}"]`, { timeout: 15000 }).should('be.visible');
});
