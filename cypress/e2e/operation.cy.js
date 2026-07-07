describe('Opération — navigation et chronique', () => {
  let appliedMatch;

  before(() => {
    cy.task('getAppliedMatchE2E').then((result) => {
      expect(result.ok).to.eq(true);
      appliedMatch = result;
    });
  });

  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
  });

  it('affiche le bandeau latéral des matchs', () => {
    cy.visitNav('operation');
    cy.get('[data-testid="operation-match-nav"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="operation-match-nav"] button').should('have.length.gte', 1);
  });

  it('affiche la chronique d\'un match terminé', () => {
    cy.visit(
      `/operation/match/${appliedMatch.matchId}?poolId=${appliedMatch.poolId}&cycle=${appliedMatch.cycle}`
    );
    cy.get('[data-testid="operation-chronicle"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="operation-chronicle"]').invoke('text').should('have.length.gte', 20);
  });
});
