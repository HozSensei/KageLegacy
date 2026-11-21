const byTestId = id => `[data-testid="${id}"]`;
const picker = byTestId('ninja-avatar-picker');
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
      profile: { displayName: endpoint === 'guest' ? 'Guest' : 'test', language: 'en' },
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
    cy.intercept('GET', '/api/auth/providers', {
      body: { google: { enabled: false, clientId: null } },
    });
    cy.intercept('GET', '/api/player', { statusCode: 404, body: { error: 'not found' } });
    cy.intercept('GET', '/api/leaderboard/factions', {
      body: {
        factions: [
          { id: 'midorihara', accentColor: '#2d6a4f' },
          { id: 'kareno', accentColor: '#9b2226' },
        ],
      },
    });
  });

  it('keeps portrait out of registration and collects it in the character wizard', () => {
    mockAuth('register');
    cy.intercept('POST', '/api/player/create', {
      statusCode: 201,
      body: {
        character: {
          name: characterName,
          rank: 'Aspirant ninja',
          level: 1,
          profile: { avatarId: 'aspirant-2-3' },
        },
      },
    }).as('createCharacter');

    visit('/register');
    cy.get(picker).should('not.exist');
    cy.get(byTestId('login-username')).type('test@example.test');
    cy.get(byTestId('login-password')).type(password);
    cy.get(loginSubmit).click();
    cy.wait('@register').its('request.body').should('deep.equal', {
      email: 'test@example.test',
      password,
      language: 'en',
    });

    cy.location('pathname').should('eq', '/character-creation');
    cy.get(byTestId('create-name')).type(characterName);
    cy.get(picker).find('input[value="aspirant-1-1"]').should('be.checked');
    cy.get(picker).contains('button', 'Genin').click();
    cy.get(picker).find('input[value="genin-1-1"]').should('be.disabled');
    cy.get(picker).contains('button', 'Aspirant ninja').click();
    cy.get(picker).contains('button', 'Set 2').click();
    selectPortrait('aspirant-2-3');
    cy.get(byTestId('create-submit')).click();

    cy.wait('@createCharacter').its('request.body').should('include', {
      name: characterName,
      avatarId: 'aspirant-2-3',
    });
  });

  it('starts a guest trial without portrait fields then opens the wizard', () => {
    mockAuth('guest');
    visit('/');
    cy.get(byTestId('landing-guest-name')).should('not.exist');
    cy.get(byTestId('landing-guest-portrait')).should('not.exist');
    cy.get(byTestId('landing-guest')).click();
    cy.wait('@guest').its('request.body').should('deep.equal', { language: 'en' });
    cy.location('pathname').should('eq', '/character-creation');
    cy.get(picker).should('exist');
  });

  it('keeps the portrait picker and avatarId out of account login', () => {
    mockAuth('login', 200);
    cy.intercept('GET', '/api/player', {
      character: { name: characterName, rank: 'Aspirant ninja', level: 1 },
    });
    visit('/login');
    cy.get(picker).should('not.exist');
    cy.get(byTestId('login-username')).type('test');
    cy.get(byTestId('login-password')).type(password);
    cy.get(loginSubmit).click();
    cy.wait('@login').its('request.body').should('deep.equal', { username: 'test', password });
    cy.location('pathname').should('eq', '/home');
  });
});
