describe('Header — navigation V2 alpha', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/home');
  });

  it('affiche le hub et le menu de navigation', () => {
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('.nav-rail a[href="/coop"]').should('be.visible');
    cy.get('.nav-rail a[href^="/pvp"]').should('not.exist');
    cy.get('[data-testid="nav-menu-button"]').should('be.visible').click();
    cy.get('[data-testid="nav-menu-panel"]').should('be.visible');
    cy.get('[data-testid="nav-profile"]').should('be.visible');
    cy.get('[data-testid="nav-rules"]').should('be.visible');
    cy.get('[data-testid="nav-missions"]').should('be.visible');
    cy.get('[data-testid="nav-coop"]').should('be.visible');
    cy.get('[data-testid="nav-pvp"]').should('not.exist');
  });

  it('expose le registre (journal) et masque l’inventaire legacy', () => {
    cy.openNavMenu();
    cy.get('[data-testid="nav-journal"]').scrollIntoView().should('be.visible');
    cy.get('[data-testid="nav-inventory"]').should('not.exist');
  });
});
