describe('Bureau — panneaux clés', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
  });

  it('affiche le Bureau et les panneaux budget / académie', () => {
    cy.get('[data-testid="bureau-page"]', { timeout: 15000 }).should('be.visible');
    cy.contains('Bureau du Sensei').should('exist');
    cy.get('[data-testid="bureau-budget-panel"]').should('be.visible');

    // L'onboarding early-career soft-hide l'Académie : on le passe si présent.
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="onboarding-checklist"]').length) {
        cy.get('[data-testid="onboarding-dismiss"]').click();
        cy.get('[data-testid="onboarding-checklist"]').should('not.exist');
      }
    });

    cy.get('[data-testid="bureau-academy-panel"]').should('be.visible');
  });

  it('affiche le panneau missions sur /missions', () => {
    cy.visit('/missions');
    cy.get('[data-testid="missions-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="missions-panel"]').should('be.visible');
    cy.get('[data-testid="missions-panel"]').contains('Rang de mission');
  });
});
