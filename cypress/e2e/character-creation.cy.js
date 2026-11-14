describe('Création perso V2', () => {
  it('inscrit un compte et crée un personnage via le hub', () => {
    const suffix = Date.now();
    const username = `e2e_create_${suffix}`;
    const senseiName = `Sensei ${suffix}`;
    const charName = `Genin ${suffix}`;

    Cypress.session.clearAllSavedSessions();
    cy.visit('/register');
    cy.get('[data-testid="login-username"]').clear().type(username);
    cy.get('[data-testid="register-sensei-name"]').clear().type(senseiName);
    cy.get('[data-testid="login-password"]').clear().type('testpass');
    cy.get('[data-testid="login-submit"]').click();

    // Hub accessible sans personnage (empty-state onboarding).
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="empty-state-primary"]').should('be.visible').click();

    cy.get('[data-testid="character-creation"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="create-name"]').clear().type(charName);
    cy.get('[data-testid="create-submit"]').click();

    // Post-création : retour hub avec checklist / welcome.
    cy.url({ timeout: 15000 }).should('include', '/home');
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="hub-welcome"]', { timeout: 15000 }).should('be.visible');
    cy.contains(charName).should('exist');
  });
});
