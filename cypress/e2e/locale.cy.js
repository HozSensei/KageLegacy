describe('Interface — locale', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
    cy.get('[data-testid="missions-panel"]', { timeout: 15000 }).should('be.visible');
  });

  it('bascule en anglais sur le Bureau', () => {
    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-locale-en"]').click();
    cy.get('[data-testid="nav-squad"]').should('contain', 'Squad');
    cy.get('[data-testid="missions-panel"]').contains('Mission contracts');
  });

  it('revient en français', () => {
    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-locale-en"]').click();
    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-locale-fr"]').click();
    cy.get('[data-testid="nav-squad"]').should('contain', 'Escouade');
    cy.get('[data-testid="missions-panel"]').contains('Contrats de mission');
  });

  it('affiche la chronique en anglais sur /operation', () => {
    cy.task('getAppliedMatchE2E').then((result) => {
      expect(result.ok).to.eq(true);
      cy.get('[data-testid="profile-menu-button"]').click();
      cy.get('[data-testid="profile-locale-en"]').click();
      cy.visit(
        `/operation/match/${result.matchId}?poolId=${result.poolId}&cycle=${result.cycle}`
      );
      cy.get('[data-testid="operation-chronicle"]', { timeout: 15000 }).should('be.visible');
      cy.get('[data-testid="operation-chronicle"]').invoke('text').should('have.length.gte', 20);
      cy.get('[data-testid="nav-squad"]').should('contain', 'Squad');
    });
  });
});
