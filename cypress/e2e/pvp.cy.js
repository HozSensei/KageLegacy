describe('PvP masqué par défaut', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  ['/pvp', '/pvp?invite=TESTCODE', '/pvp/duel/42'].forEach(path => {
    it(`redirige ${path} sans monter la vue PvP`, () => {
      cy.visit(path);
      cy.location('pathname').should('be.oneOf', ['/home', '/coop']);
      cy.location('search').should('eq', '');
      cy.get('[data-testid="hub-page"], [data-testid="coop-page"]').should('be.visible');
      cy.get('[data-testid="pvp-queue-page"], [data-testid="pvp-duel-page"]').should('not.exist');
    });
  });
});
