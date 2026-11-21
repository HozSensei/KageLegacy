describe('Création perso V2', () => {
  it('inscrit le compte puis force le wizard nom / village / avatar', () => {
    const suffix = Date.now();
    const email = `e2e_create_${suffix}@example.test`;
    const characterName = `Genin ${suffix}`;

    Cypress.session.clearAllSavedSessions();
    cy.visit('/register');
    cy.get('[data-testid="login-username"]').clear().type(email);
    cy.get('[data-testid="login-password"]').clear().type('testpass');
    cy.intercept('POST', '/api/auth/register').as('register');
    cy.get('[data-testid="login-submit"]').click();

    cy.wait('@register').then(({ request, response }) => {
      expect(request.body.email).to.equal(email);
      expect(request.body).not.to.have.property('characterName');
      expect(request.body).not.to.have.property('avatarId');
      expect(request.body).not.to.have.property('username');
      expect(response.statusCode).to.equal(201);
    });

    cy.get('[data-testid="character-creation"]', { timeout: 15000 }).should('be.visible');
    cy.request('/api/player').its('status').should('eq', 404);

    cy.get('[data-testid="create-name"]').clear().type(characterName);
    cy.intercept('POST', '/api/player/create').as('createCharacter');
    cy.get('[data-testid="create-submit"]').click();
    cy.wait('@createCharacter').its('response.statusCode').should('eq', 201);

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

  it('démarre en invité puis complète le wizard avant le hub', () => {
    const characterName = `Invité ${Date.now()}`;
    Cypress.session.clearAllSavedSessions();
    cy.visit('/');
    cy.intercept('POST', '/api/auth/guest').as('guest');
    cy.get('[data-testid="landing-guest"]').click();

    cy.wait('@guest').then(({ request, response }) => {
      expect(request.body).not.to.have.property('characterName');
      expect(request.body).not.to.have.property('avatarId');
      expect(response.statusCode).to.equal(201);
    });

    cy.get('[data-testid="character-creation"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="create-name"]').type(characterName);
    cy.intercept('POST', '/api/player/create').as('createCharacter');
    cy.get('[data-testid="create-submit"]').click();
    cy.wait('@createCharacter').its('response.statusCode').should('eq', 201);

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
