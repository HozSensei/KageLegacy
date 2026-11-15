describe('Locale — FR/EN V2', () => {
  it('landing : switch EN puis FR sans compte', () => {
    cy.clearLocalStorage();
    cy.visit('/');
    cy.get('[data-testid="landing-page"]').should('be.visible');
    cy.get('[data-testid="locale-switch-en"]').click();
    cy.get('[data-testid="landing-guest"]').should('contain', 'guest');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('kage-locale')).to.eq('en');
    });
    cy.get('[data-testid="locale-switch-fr"]').click();
    cy.get('[data-testid="landing-guest"]').should('contain', 'invité');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('kage-locale')).to.eq('fr');
    });
  });

  describe('connecté', () => {
    beforeEach(() => {
      cy.loginDemo();
      cy.visit('/profil');
      cy.get('[data-testid="profile-page"]', { timeout: 15000 }).should('be.visible');
    });

    it('passe en anglais puis revient en français (nav)', () => {
      cy.get('[data-testid="profile-menu-button"]').click();
      cy.get('[data-testid="profile-locale-en"]').click();
      cy.get('[data-testid="profile-menu-panel"]').should('not.exist');
      cy.openNavMenu();
      cy.get('[data-testid="nav-profile"]').should('contain', 'Profile');
      cy.get('[data-testid="nav-missions"]').should('contain', 'Missions');
      cy.get('[data-testid="nav-hub"]').should('contain', 'Home');
      cy.get('[data-testid="nav-shop"]').should('contain', 'Shop');
      cy.get('[data-testid="nav-battle-pass"]').should('contain', 'Battle Pass');
      cy.get('[data-testid="nav-pvp"]').should('contain', 'PvP');

      cy.closeSlidePanel();
      cy.get('[data-testid="profile-menu-button"]').click();
      cy.get('[data-testid="profile-menu-panel"]').should('be.visible');
      cy.get('[data-testid="profile-locale-fr"]').click();
      cy.get('[data-testid="profile-menu-panel"]').should('not.exist');
      cy.openNavMenu();
      cy.get('[data-testid="nav-profile"]').should('contain', 'Profil');
      cy.get('[data-testid="nav-missions"]').should('contain', 'Missions');
      cy.get('[data-testid="nav-hub"]').should('contain', 'Accueil');
      cy.get('[data-testid="nav-shop"]').should('contain', 'Boutique');
    });

    it('persiste la locale et rafraîchit la collection', () => {
      cy.get('[data-testid="profile-menu-button"]').click();
      cy.get('[data-testid="profile-locale-en"]').click();
      // Attendre la fin du PATCH async (fermeture panneau) avant d'asserter le storage
      cy.get('[data-testid="profile-menu-panel"]').should('not.exist');
      cy.window().its('localStorage').invoke('getItem', 'kage-locale').should('eq', 'en');

      cy.visitNav('collection');
      cy.get('[data-testid="collection-page"]').should('be.visible');
      // Titre de section / empty / grille : chrome EN
      cy.contains(/collection|cards|upgrade|quantity/i).should('exist');

      cy.get('[data-testid="profile-menu-button"]').click();
      cy.get('[data-testid="profile-locale-fr"]').click();
      cy.get('[data-testid="profile-menu-panel"]').should('not.exist');
      cy.visitNav('missions');
      cy.get('[data-testid="missions-combat-page"]').should('be.visible');
      cy.contains(/mission|combat|deck/i).should('exist');
    });
  });
});
