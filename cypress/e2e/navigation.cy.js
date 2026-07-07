describe('Navigation — routes principales', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
  });

  const routes = ['bureau', 'squad', 'league', 'market', 'exchanges', 'inventory', 'operation'];

  routes.forEach((name) => {
    it(`ouvre la page ${name}`, () => {
      if (name !== 'bureau') cy.visitNav(name);
      else cy.get('[data-testid="bureau-page"]').should('be.visible');
    });
  });
});
