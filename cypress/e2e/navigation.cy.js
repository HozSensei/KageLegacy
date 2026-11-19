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
    'journal',
    'coop',
  ];

  routes.forEach(name => {
    it(`ouvre la page ${name}`, () => {
      if (name !== 'hub') cy.visitNav(name);
      else cy.get('[data-testid="hub-page"]').should('be.visible');
    });
  });

  it('ouvre Co-op depuis le hub sans raccourci PvP', () => {
    cy.get('[data-testid="hub-shortcuts"]').within(() => {
      cy.get('a[href^="/pvp"]').should('not.exist');
      cy.get('a[href="/coop"]').click();
    });
    cy.location('pathname').should('eq', '/coop');
    cy.get('[data-testid="coop-page"]').should('be.visible');
  });
});
