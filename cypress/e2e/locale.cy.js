describe('Locale — FR/EN V2', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/profil');
    cy.get('[data-testid="profile-page"]', { timeout: 15000 }).should('be.visible');
  });

  it('passe en anglais puis revient en français', () => {
    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-locale-en"]').click();
    cy.get('[data-testid="profile-menu-panel"]').should('not.exist');
    cy.openNavMenu();
    cy.get('[data-testid="nav-profile"]').should('contain', 'Profile');
    cy.get('[data-testid="nav-missions"]').should('contain', 'Missions');
    cy.get('[data-testid="nav-hub"]').should('contain', 'Home');

    cy.closeSlidePanel();
    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-menu-panel"]').should('be.visible');
    cy.get('[data-testid="profile-locale-fr"]').click();
    cy.get('[data-testid="profile-menu-panel"]').should('not.exist');
    cy.openNavMenu();
    cy.get('[data-testid="nav-profile"]').should('contain', 'Profil');
    cy.get('[data-testid="nav-missions"]').should('contain', 'Missions');
    cy.get('[data-testid="nav-hub"]').should('contain', 'Accueil');
  });
});
