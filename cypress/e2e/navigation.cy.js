describe('Navigation — routes V2', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/home');
  });

  const routes = [
    'hub',
    'profile',
    'collection',
    'decks',
    'talents',
    'missions',
    'shop',
    'battle-pass',
    'pvp',
  ];

  routes.forEach((name) => {
    it(`ouvre la page ${name}`, () => {
      if (name !== 'hub') cy.visitNav(name);
      else cy.get('[data-testid="hub-page"]').should('be.visible');
    });
  });
});
