describe('Joueur — profil V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('affiche le profil personnage', () => {
    cy.visit('/profil');
    cy.get('[data-testid="profile-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="player-profile"]').should('be.visible');
    cy.get('[data-testid="player-stats"]').should('be.visible');
  });
});
