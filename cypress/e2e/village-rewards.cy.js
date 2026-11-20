const endpoint = '/api/deck-duels/village-rewards';
const bell = '[data-testid="village-rewards-notification"]';
const dot = '[data-testid="village-rewards-unread"]';
const balances = '[data-testid="header-wallet-balances"]';
const panelBalances = '[data-testid="nav-menu-panel"] [data-testid="header-wallet-balances"]';
const heading = '#village-rewards-heading';
const reward = {
  weekStart: '2026-11-16',
  weekEnd: '2026-11-23',
  ryos: 150,
  factionId: 'kareno',
  settledAt: '2026-11-23T00:00:00.000Z',
};
const nextReward = {
  ...reward,
  weekStart: '2026-11-23',
  weekEnd: '2026-11-30',
  ryos: 250,
  settledAt: '2026-11-30T00:00:00.000Z',
};

function stubUser(language = 'en') {
  cy.intercept('GET', '/api/auth/me', { user: { id: 1, username: 'test' }, profile: { language } });
  cy.intercept('GET', '/api/player', { character: { name: 'Test', level: 1 } });
  cy.intercept('GET', '/api/deck-duels/factions', {
    weekStart: reward.weekStart,
    weekEnd: reward.weekEnd,
    factions: [],
  });
  cy.intercept('GET', '/api/deck-duels/friends', { friends: [], incoming: [], outgoing: [] });
  cy.intercept('GET', '/api/shop/balances', {
    balances: { ryos: 400, dust: 3, kageCoins: 2, essence: 1 },
  });
}

describe('Village rewards and header wallet', () => {
  it('fits at 360 px and acknowledges only the consulted week via the bell', () => {
    stubUser();
    cy.viewport(360, 740);
    let unreadCount = 1;
    let rewards = [reward];
    let reads = 0;
    cy.intercept('GET', '/api/shop/balances', req => {
      req.reply({
        balances: { ryos: rewards.length > 1 ? 650 : 400, dust: 3, kageCoins: 2, essence: 1 },
      });
    });
    cy.intercept('GET', endpoint, req => req.reply({ rewards, unreadCount })).as('rewards');
    cy.intercept('POST', `${endpoint}/read`, req => {
      reads += 1;
      if (reads === 1) {
        expect(req.body).to.deep.equal({ throughWeekStart: reward.weekStart });
        rewards = [nextReward, reward];
      } else {
        expect(req.body).to.deep.equal({ throughWeekStart: nextReward.weekStart });
        unreadCount = 0;
      }
      req.reply({ unreadCount });
    }).as('read');

    cy.visit('/home');
    cy.wait('@rewards');
    cy.get(dot).should('be.visible');
    cy.get(bell).should('have.attr', 'aria-label', 'Village rewards — 1 unread reward');
    cy.get(panelBalances).should('not.exist');
    cy.get(`${balances}:visible`).should('not.exist');
    cy.openNavMenu();
    cy.get(panelBalances)
      .scrollIntoView()
      .should('be.visible')
      .and('contain', '400')
      .and('contain', 'Card essence');
    cy.get('[data-testid="nav-menu-button"]').should('be.visible');
    cy.get('[data-testid="profile-menu-button"]').should('be.visible');
    cy.document()
      .its('documentElement')
      .should(root => {
        expect(root.scrollWidth).to.equal(root.clientWidth);
      });
    cy.then(() => expect(reads).to.equal(0));

    cy.get(bell).focus();
    cy.then(async () => {
      for (const type of ['keyDown', 'keyUp']) {
        await Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchKeyEvent',
          params: { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 },
        });
      }
    });
    cy.location('hash').should('eq', '#village-rewards');
    cy.get(heading).should('be.focused');
    cy.get('#village-rewards').should('contain', '+150 ryos').and('not.contain', '+250 ryos');
    cy.wait('@read');
    cy.get(dot).should('be.visible');
    cy.get(bell).click();
    cy.get('#village-rewards').should('contain', '+250 ryos');
    cy.wait('@read');
    cy.get(dot).should('not.exist');
    cy.get(bell).should('have.attr', 'aria-label', 'Village rewards');
    cy.get('#village-rewards button').should('not.exist');
    cy.document()
      .its('documentElement')
      .should(root => {
        expect(root.scrollWidth).to.equal(root.clientWidth);
      });
    cy.openNavMenu();
    cy.get(panelBalances).scrollIntoView().should('contain', '650');
  });

  it('keeps the dot until the confirmed row is in view on a direct Village visit', () => {
    stubUser();
    cy.viewport(360, 260);
    let reads = 0;
    cy.intercept('GET', endpoint, { rewards: [reward], unreadCount: 1 });
    cy.intercept('POST', `${endpoint}/read`, req => {
      reads += 1;
      expect(req.body).to.deep.equal({ throughWeekStart: reward.weekStart });
      req.reply({ unreadCount: 0 });
    }).as('read');

    cy.visit('/village');
    cy.get(dot).should('be.visible');
    cy.contains('#village-rewards li', '+150 ryos')
      .then(([row]) => {
        expect(row.getBoundingClientRect().top).to.be.greaterThan(260);
        expect(reads).to.equal(0);
      })
      .scrollIntoView({ offset: { top: -100, left: 0 } });
    cy.wait('@read');
    cy.get(dot).should('not.exist');
  });

  it('does not mark after a failed Village GET and retries in French', () => {
    stubUser('fr');
    let gets = 0;
    let reads = 0;
    cy.intercept('GET', endpoint, req => {
      gets += 1;
      if (gets === 2) req.reply(503, {});
      else req.reply({ rewards: [reward], unreadCount: 1 });
    }).as('rewards');
    cy.intercept('POST', `${endpoint}/read`, req => {
      reads += 1;
      req.reply({ unreadCount: 0 });
    }).as('read');

    cy.visit('/home');
    cy.wait('@rewards');
    cy.openNavMenu();
    cy.get(panelBalances).scrollIntoView().should('be.visible');
    cy.get('[data-testid="slide-panel-backdrop"]').click({ force: true });
    cy.get(bell).click();
    cy.get('#village-rewards [role="alert"]').should('contain', 'Impossible de charger');
    cy.get(dot).should('be.visible');
    cy.then(() => expect(reads).to.equal(0));
    cy.contains('button', 'Actualiser').click();
    cy.get('#village-rewards')
      .should('contain', 'Vos gains du Village')
      .and('contain', '+150 ryos');
    cy.wait('@read');
    cy.get(dot).should('not.exist');
  });
});
