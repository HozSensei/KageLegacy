const byTestId = id => `[data-testid="${id}"]`;
const picker = byTestId('ninja-avatar-picker');
const guestPortrait = byTestId('landing-guest-portrait');
const guestName = byTestId('landing-guest-name');
const guestSubmit = byTestId('landing-guest');
const loginSubmit = byTestId('login-submit');
const password = 'testpass';
const characterName = 'Test ninja';

function visit(path) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('kage-locale', 'en');
    },
  });
}

function mockAuth(endpoint, statusCode = 201) {
  cy.intercept('POST', `/api/auth/${endpoint}`, {
    statusCode,
    body: {
      user: { id: 1, username: 'test', isGuest: endpoint === 'guest' },
      profile: { displayName: characterName, language: 'en' },
    },
  }).as(endpoint);
}

function selectPortrait(id) {
  cy.get(picker).find(`input[value="${id}"]`).closest('label').click();
  cy.get(picker).find(`input[value="${id}"]`).should('be.checked');
}

describe('Onboarding portraits', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/**', {});
    cy.intercept('GET', '/api/auth/me', { statusCode: 401 });
    cy.intercept('GET', '/api/player', {
      character: { name: characterName, rank: 'Aspirant ninja', level: 1 },
    });
  });

  it('sends the selected Aspirant portrait at registration and locks higher ranks', () => {
    mockAuth('register');
    visit('/register');
    cy.get(byTestId('login-username')).type('test@example.test');
    cy.get(byTestId('register-character-name')).type(` ${characterName} `);
    cy.get(byTestId('login-password')).type(password);

    cy.get(picker).find('input[value="aspirant-1-1"]').should('be.checked');
    cy.get(picker).contains('button', 'Genin').click();
    cy.get(picker).find('input[value="genin-1-1"]').should('be.disabled');
    cy.get(picker).contains('button', 'Aspirant ninja').click();
    cy.get(picker).contains('button', 'Set 2').click();
    selectPortrait('aspirant-2-3');
    cy.get(loginSubmit).click();

    cy.wait('@register').its('request.body').should('deep.equal', {
      email: 'test@example.test',
      password,
      characterName,
      language: 'en',
      avatarId: 'aspirant-2-3',
    });
    cy.location('pathname').should('eq', '/home');
  });

  it('previews and submits a custom guest portrait after the picker is collapsed again', () => {
    cy.viewport(390, 844);
    mockAuth('guest');
    visit('/');
    cy.get(guestSubmit).should('be.disabled');
    cy.get(guestName).type(` ${characterName} `);
    cy.get(guestPortrait).should('not.have.attr', 'open');
    cy.get(guestPortrait)
      .find('summary .ninja-portrait')
      .invoke('css', 'background-position')
      .as('defaultPosition', { type: 'static' });
    cy.get(guestPortrait).find('summary').click();
    selectPortrait('aspirant-1-2');
    cy.get(guestPortrait).find('summary').click();
    cy.get(guestPortrait).should('not.have.attr', 'open');
    cy.get('@defaultPosition').then(position => {
      cy.get(guestPortrait)
        .find('summary .ninja-portrait')
        .should('not.have.css', 'background-position', position);
    });

    cy.get(guestSubmit).click();
    cy.wait('@guest').its('request.body').should('deep.equal', {
      characterName,
      language: 'en',
      avatarId: 'aspirant-1-2',
    });
    cy.location('pathname').should('eq', '/home');
  });

  it('sends the default portrait without opening the guest picker', () => {
    mockAuth('guest');
    visit('/');
    cy.get(guestPortrait).should('not.have.attr', 'open');
    cy.get(guestName).type(characterName);
    cy.get(guestSubmit).click();
    cy.wait('@guest').its('request.body.avatarId').should('eq', 'aspirant-1-1');
    cy.location('pathname').should('eq', '/home');
  });

  it('keeps the portrait picker and avatarId out of account login', () => {
    mockAuth('login', 200);
    visit('/login');
    cy.get(picker).should('not.exist');
    cy.get(byTestId('login-username')).type('test');
    cy.get(byTestId('login-password')).type(password);
    cy.get(loginSubmit).click();
    cy.wait('@login').its('request.body').should('deep.equal', { username: 'test', password });
    cy.location('pathname').should('eq', '/home');
  });
});
