describe('Navigation — routes V2', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
  });

  const routes = ['bureau', 'profile', 'collection', 'decks', 'inventory', 'journal'];

  routes.forEach((name) => {
    it(`ouvre la page ${name}`, () => {
      if (name !== 'bureau') cy.visitNav(name);
      else cy.get('[data-testid="placeholder-page"]').should('be.visible');
    });
  });
});
