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

    cy.get('[data-testid="character-creation"]', { timeout: 15000 })
      .should('be.visible')
      .and('not.contain.text', 'Katon')
      .and('not.contain.text', 'Suiton')
      .and('not.contain.text', 'Raiton')
      .and('not.contain.text', 'Doton')
      .and('not.contain.text', 'Futon')
      .and('not.contain.text', 'Affinité élémentaire')
      .and('not.contain.text', 'Element affinity');
    for (const element of ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon']) {
      cy.get('[data-testid="character-creation"]')
        .find(`input[value="${element}"], option[value="${element}"]`)
        .should('not.exist');
    }
    cy.get('[data-testid="create-name"]').clear().type(charName);
    cy.intercept('POST', '/api/player/create').as('createCharacter');
    cy.get('[data-testid="create-submit"]').click();
    cy.wait('@createCharacter').then(({ request, response }) => {
      expect(request.body).not.to.have.property('elementAffinity');
      expect(request.body.name).to.equal(charName);
      expect(response.statusCode).to.equal(201);
      expect(response.body.character.name).to.equal(charName);
    });

    // Post-création : retour hub avec checklist / welcome.
    cy.url({ timeout: 15000 }).should('include', '/home');
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="hub-welcome"]', { timeout: 15000 }).should('be.visible');
    cy.contains(charName).should('exist');
  });
});
