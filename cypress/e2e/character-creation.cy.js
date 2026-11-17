describe('Création perso V2', () => {
  it('crée le compte et le ninja dans la même étape', () => {
    const suffix = Date.now();
    const email = `e2e_create_${suffix}@example.test`;
    const characterName = `Genin ${suffix}`;

    Cypress.session.clearAllSavedSessions();
    cy.visit('/register');
    cy.get('[data-testid="login-username"]').clear().type(email);
    cy.get('[data-testid="register-character-name"]').clear().type(characterName);
    cy.get('[data-testid="login-password"]').clear().type('testpass');
    cy.intercept('POST', '/api/auth/register').as('register');
    cy.get('[data-testid="login-submit"]').click();

    cy.wait('@register').then(({ request, response }) => {
      expect(request.body.email).to.equal(email);
      expect(request.body.characterName).to.equal(characterName);
      expect(request.body).not.to.have.property('username');
      expect(response.statusCode).to.equal(201);
      expect(response.body.profile.displayName).to.equal(characterName);
    });

    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="hub-welcome"]', { timeout: 15000 }).should('be.visible');
    cy.contains(characterName).should('exist');
    cy.request('/api/player').its('body.character.name').should('equal', characterName);

    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-logout"]').click();
    cy.visit('/login');
    cy.get('[data-testid="login-username"]').type(email);
    cy.get('[data-testid="login-password"]').type('testpass');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    cy.request('/api/player').its('body.character.name').should('equal', characterName);
  });

  it('demande aussi un nom de ninja pour démarrer en invité', () => {
    const characterName = `Invité ${Date.now()}`;
    Cypress.session.clearAllSavedSessions();
    cy.visit('/');
    cy.get('[data-testid="landing-guest-name"]').type(characterName);
    cy.intercept('POST', '/api/auth/guest').as('guest');
    cy.get('[data-testid="landing-guest"]').click();

    cy.wait('@guest').then(({ request, response }) => {
      expect(request.body.characterName).to.equal(characterName);
      expect(response.statusCode).to.equal(201);
      expect(response.body.profile.displayName).to.equal(characterName);
    });

    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    cy.request('/api/player').its('body.character.name').should('equal', characterName);

    const email = `e2e_guest_${Date.now()}@example.test`;
    cy.get('[data-testid="profile-menu-button"]').click();
    cy.get('[data-testid="profile-convert"]').click();
    cy.get('[data-testid="guest-convert-email"]').type(email);
    cy.get('[data-testid="guest-convert-password"]').type('testpass');
    cy.intercept('POST', '/api/auth/convert').as('convertGuest');
    cy.get('[data-testid="guest-convert-submit"]').click();
    cy.wait('@convertGuest').then(({ request, response }) => {
      expect(request.body.email).to.equal(email);
      expect(request.body).not.to.have.property('username');
      expect(response.statusCode).to.equal(200);
    });
    cy.request('/api/player').its('body.character.name').should('equal', characterName);
  });
});
