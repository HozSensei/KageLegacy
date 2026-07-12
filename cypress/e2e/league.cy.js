describe('Ligue — classement', () => {
  before(() => {
    cy.task('ensureLeagueFixtures').then((result) => {
      expect(result.ok).to.eq(true);
      expect(result.matchCount).to.be.gte(1);
    });
  });

  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
    cy.visitNav('league');
  });

  it('affiche le classement du pool', () => {
    cy.get('[data-testid="league-standings"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="league-standings"] tbody tr').should('have.length.gte', 2);
  });

  it('affiche le calendrier et ouvre un match', () => {
    cy.get('[data-testid="league-fixtures"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="league-fixtures"] a').first().click();
    cy.url().should('include', '/operation/match/');
    cy.get('[data-testid="operation-page"]', { timeout: 15000 }).should('be.visible');
  });
});
