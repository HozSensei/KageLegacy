describe('Joueur — profil V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('affiche le profil sans affinité, même pour un personnage historique', () => {
    cy.intercept('GET', '/api/player', req => {
      req.continue(res => {
        if (res.body.character) res.body.character.elementAffinity = 'Katon';
      });
    }).as('loadPlayer');
    cy.visit('/profil');
    cy.wait('@loadPlayer').its('response.body.character.elementAffinity').should('eq', 'Katon');
    cy.get('[data-testid="profile-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="player-profile"]')
      .should('be.visible')
      .and('not.contain.text', 'Katon')
      .and('not.contain.text', 'Affinité élémentaire')
      .and('not.contain.text', 'Element affinity');
    cy.get('[data-testid="player-stats"]').should('be.visible');
  });
});
