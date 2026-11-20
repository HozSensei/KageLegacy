const card = {
  id: 11,
  slug: 'test-card',
  nameFr: 'Carte test',
  nameEn: 'Test card',
  descriptionFr: 'Description',
  descriptionEn: 'Description',
  type: 'attack',
  rarity: 'legendary',
  upgradable: true,
  cost: 1,
};

function entry(level = 0) {
  return {
    collectionId: 7,
    cardDefinitionId: 11,
    quantity: 2,
    upgradeLevel: level,
    card,
    actionPreview: {
      upgradeCost:
        level === 0
          ? { ryos: 4500, dust: 400, essence: 0 }
          : { ryos: 18000, dust: 1800, essence: 10 },
      disenchantGain: { dust: 200, essence: level ? 2 : 0 },
    },
  };
}

function onboardingStep(overrides = {}) {
  return {
    key: 'edit_deck',
    kind: 'action',
    route: '/decks',
    nameFr: 'Modifier un deck',
    nameEn: 'Edit a deck',
    hintFr: 'Ajuste les cartes de ton deck actif.',
    hintEn: 'Tweak cards in your active deck.',
    rewards: [{ type: 'ryos', amount: 60 }, { type: 'xp', amount: 30 }],
    completed: false,
    claimed: false,
    claimable: false,
    ...overrides,
  };
}

function onboardingPayload(steps, finished = false) {
  const completed = steps.filter(step => step.completed).length;
  const claimed = steps.filter(step => step.claimed).length;
  const claimable = steps.filter(step => step.claimable).length;
  return {
    steps,
    meta: {
      total: steps.length,
      completed,
      claimed,
      claimable,
      finished,
      allCompleted: completed >= steps.length,
    },
  };
}

function setupApp(language = 'fr') {
  cy.intercept('GET', '/api/auth/me', {
    user: { id: 1, username: 'test' },
    sensei: { name: 'Test', language },
  });
  cy.intercept('GET', '/api/player', {
    character: { name: 'Test', level: 1, talentPointsAvailable: 0 },
  });
  cy.intercept('GET', '/api/shop/balances', {
    balances: { ryos: 50000, dust: 5000, essence: 20, kageCoins: 0 },
  });
  cy.intercept('GET', '/api/onboarding', onboardingPayload([onboardingStep()], true));
  cy.intercept('POST', '/api/onboarding/visit', { body: {} });
}

function visit(path, language = 'fr') {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('kage-locale', language);
    },
  });
}

function deck(active = false) {
  return {
    id: 5,
    name: 'Deck test',
    isActive: active,
    size: 20,
    cards: [],
    validation: { valid: true, errors: [], errorsEn: [] },
    passiveBonuses: {},
  };
}

describe('Premiers pas, collection et decks', () => {
  it('reconstruit la checklist depuis la progression onboarding persistée', () => {
    setupApp();
    let finished = false;
    cy.intercept('GET', '/api/collection', { collection: [entry()] });
    cy.intercept('GET', '/api/decks', { decks: [deck(true)] });
    cy.intercept('GET', '/api/talents/me', {
      talents: { unlockedNodeIds: [], talentPointsAvailable: 0 },
    });
    cy.intercept('GET', '/api/achievements', { achievements: [] });
    cy.intercept('GET', '/api/onboarding', req =>
      req.reply(
        onboardingPayload(
          finished
            ? [
                onboardingStep({
                  completed: true,
                  claimed: true,
                  claimable: false,
                }),
              ]
            : [
                onboardingStep(),
                onboardingStep({
                  key: 'spend_talent',
                  route: '/talents',
                  nameFr: 'Dépenser un point de talent',
                  nameEn: 'Spend a talent point',
                }),
                onboardingStep({
                  key: 'win_combat',
                  route: '/missions',
                  nameFr: 'Gagner un combat',
                  nameEn: 'Win a fight',
                }),
              ],
          finished
        )
      )
    );
    visit('/home');
    cy.get('[data-testid="hub-step-edit_deck"]').should('be.visible');
    cy.get('[data-testid="hub-step-spend_talent"]').should('exist');
    cy.get('[data-testid="hub-step-win_combat"]').should('exist');
    cy.get('[data-testid="hub-hero-cta"]').should('have.attr', 'href', '/decks');
    cy.then(() => {
      finished = true;
    });
    cy.reload();
    cy.get('[data-testid="hub-checklist"]').should('not.exist');
    cy.get('[data-testid="hub-step-edit_deck"]').should('not.exist');
    cy.get('[data-testid="hub-primary-cta"]').should('not.exist');
  });

  it('signale un échec de progression et permet de réessayer en anglais', () => {
    setupApp('en');
    let failed = true;
    cy.intercept('GET', '/api/collection', { collection: [] });
    cy.intercept('GET', '/api/decks', req =>
      req.reply(
        failed
          ? { statusCode: 503, body: { error: 'Erreur serveur' } }
          : { body: { decks: [deck(true)] } }
      )
    );
    cy.intercept('GET', '/api/talents/me', { talents: { unlockedNodeIds: ['node-1'] } });
    cy.intercept('GET', '/api/achievements', {
      achievements: [{ key: 'mission_runs', progress: 1 }],
    });
    cy.intercept('GET', '/api/onboarding', req =>
      req.reply(
        failed
          ? { statusCode: 503, body: { error: 'Erreur serveur' } }
          : {
              body: onboardingPayload([onboardingStep()]),
            }
      )
    );
    visit('/home', 'en');
    cy.get('[data-testid="hub-progress-error"]').should('contain', 'Unable to load progress');
    cy.get('[data-testid="hub-checklist"]').should('not.exist');
    cy.then(() => {
      failed = false;
    });
    cy.get('[data-testid="hub-progress-error"] button').click();
    cy.get('[data-testid="hub-checklist"]').should('be.visible');
  });

  it('distingue personnage absent et erreur de chargement', () => {
    setupApp();
    let absent = false;
    cy.intercept('GET', '/api/player', req =>
      req.reply({ statusCode: absent ? 404 : 503, body: { error: 'indisponible' } })
    );
    cy.intercept('GET', '/api/collection', { collection: [] });
    cy.intercept('GET', '/api/decks', { decks: [] });
    cy.intercept('GET', '/api/talents/me', { statusCode: 404, body: {} });
    cy.intercept('GET', '/api/achievements', { achievements: [] });
    visit('/home');
    cy.get('[data-testid="hub-player-load-error"]').should('be.visible');
    cy.get('[data-testid="hub-hero-create"]').should('not.exist');
    cy.then(() => {
      absent = true;
    });
    cy.get('[data-testid="hub-player-load-error"] button').click();
    cy.get('[data-testid="hub-hero-create"]').should('have.attr', 'href', '/character-creation');
  });

  it('garde le filtre possédées accessible et persistant avec une collection vide', () => {
    setupApp();
    cy.intercept('GET', '/api/collection', { collection: [] });
    cy.intercept('GET', '/api/cards', { cards: [card] });
    visit('/collection');
    cy.get('[data-testid="collection-owned-only"]').check();
    cy.get('[data-testid="collection-empty-filter"]').should('be.visible');
    cy.reload();
    cy.get('[data-testid="collection-owned-only"]').should('be.checked').uncheck();
    cy.get('[data-testid="collection-empty-filter"]').should('not.exist');
  });

  it('affiche les coûts API, actualise le niveau et le conserve après rechargement', () => {
    setupApp('en');
    let level = 0;
    cy.intercept('GET', '/api/cards', { cards: [card] });
    cy.intercept('GET', '/api/collection', req => req.reply({ collection: [entry(level)] }));
    cy.intercept('POST', '/api/collection/7/upgrade', req => {
      level = 1;
      req.reply({
        entry: entry(level),
        resources: { ryos: 45500, dust: 4600, essence: 20, kageCoins: 0 },
      });
    });
    visit('/collection', 'en');
    cy.get('[data-testid="card-face-front"]').first().click();
    cy.get('.collection-detail')
      .contains('button', 'Upgrade')
      .should('contain', '4,500')
      .and('contain', '400');
    cy.get('.collection-detail [title="Ryos: 4,500"]').should('exist');
    cy.get('.collection-detail').contains('button', 'Upgrade').click();
    cy.get('[data-testid="collection-upgrade-feedback"]').should('contain', 'Card upgraded');
    cy.openNavMenu();
    cy.get('[data-testid="nav-menu-panel"] [data-testid="header-wallet-balances"]')
      .should('be.visible')
      .invoke('text')
      .should(text => {
        expect(String(text).replace(/\D/g, '')).to.include('45500');
      });
    cy.get('[data-testid="slide-panel-backdrop"]').click({ force: true });
    cy.get('.collection-detail').should('contain', 'Upgrade level: 1');
    cy.get('.collection-detail')
      .contains('button', 'Upgrade')
      .should('contain', '18,000')
      .and('contain', '1,800');
    cy.get('.collection-detail [title="Card essence: 10"]').should('exist');
    cy.reload();
    cy.get('[data-testid="card-face-front"]').first().click();
    cy.get('.collection-detail').should('contain', 'Upgrade level: 1');
    cy.get('.collection-detail [title="Card essence: 10"]').should('exist');
  });

  it('affiche en anglais les erreurs métier de collection, sans faux succès', () => {
    setupApp('en');
    cy.intercept('GET', '/api/cards', { cards: [card] });
    cy.intercept('GET', '/api/collection', { collection: [entry()] });
    cy.intercept('POST', '/api/collection/7/upgrade', {
      statusCode: 400,
      body: { error: 'Poussière de carte insuffisante.' },
    });
    cy.intercept('POST', '/api/collection/7/disenchant', {
      statusCode: 400,
      body: { error: 'Impossible de désenchanter : exemplaires utilisés dans un deck.' },
    });
    visit('/collection', 'en');
    cy.get('[data-testid="card-face-front"]').first().click();
    cy.get('.collection-detail').contains('button', 'Upgrade').click();
    cy.get('[data-testid="collection-upgrade-feedback"]')
      .should('have.class', 'alert--error')
      .and('contain', 'Not enough card dust');
    cy.get('.collection-detail').contains('button', 'Disenchant').click();
    cy.get('[data-testid="collection-disenchant-feedback"]')
      .should('have.class', 'alert--error')
      .and('contain', 'copies are used in a deck');
  });

  it('signale une actualisation ratée après amélioration réussie', () => {
    setupApp();
    let upgraded = false;
    cy.intercept('GET', '/api/cards', { cards: [card] });
    cy.intercept('GET', '/api/collection', req =>
      req.reply(
        upgraded
          ? { statusCode: 503, body: { error: 'Erreur serveur' } }
          : { body: { collection: [entry()] } }
      )
    );
    cy.intercept('POST', '/api/collection/7/upgrade', req => {
      upgraded = true;
      req.reply({ resources: { ryos: 45500, dust: 4600, essence: 20, kageCoins: 0 } });
    });
    visit('/collection');
    cy.get('[data-testid="card-face-front"]').first().click();
    cy.contains('button', 'Améliorer').click();
    cy.get('[data-testid="collection-upgrade-feedback"]')
      .should('have.class', 'alert--error')
      .and('contain', 'Action effectuée');
  });

  it('explique en français la limite des cartes mythiques', () => {
    setupApp();
    const mythic = { ...card, rarity: 'mythic' };
    const mythicEntry = {
      ...entry(1),
      card: mythic,
      actionPreview: { upgradeCost: null, disenchantGain: { dust: 1000, essence: 5 } },
    };
    cy.intercept('GET', '/api/cards', { cards: [mythic] });
    cy.intercept('GET', '/api/collection', { collection: [mythicEntry] });
    visit('/collection');
    cy.get('[data-testid="card-face-front"]').first().click();
    cy.contains('button', 'Améliorer').should('be.disabled');
    cy.get('.collection-detail').should(
      'contain',
      'Les cartes mythiques ne peuvent être améliorées qu’une fois'
    );
    cy.get('.collection-detail [title="Essence de carte : 5"]').should('exist');
  });

  it('signale une collection indisponible dans le constructeur au lieu de la déclarer vide', () => {
    setupApp('en');
    cy.intercept('GET', '/api/collection', { statusCode: 503, body: { error: 'Erreur serveur' } });
    cy.intercept('GET', '/api/decks', { decks: [] });
    visit('/decks', 'en');
    cy.get('[data-testid="deck-builder-page"] [role="alert"]').should(
      'contain',
      'The request failed'
    );
    cy.get('[data-testid="deck-builder-page"]').should('not.contain', 'No cards to build with');
  });

  it('affiche l’erreur bilingue d’activation dans la langue choisie', () => {
    setupApp('en');
    cy.intercept('GET', '/api/collection', { collection: [entry()] });
    cy.intercept('GET', '/api/decks', { decks: [deck()] });
    cy.intercept('GET', '/api/decks/5', { deck: deck() });
    cy.intercept('POST', '/api/decks/5/activate', {
      statusCode: 400,
      body: { error: 'Deck trop petit (19/20 minimum). / Deck too small (19/20 minimum).' },
    });
    visit('/decks', 'en');
    cy.contains('button', 'Activate this deck').click();
    cy.get('[role="alert"]')
      .should('have.class', 'alert--error')
      .and('contain', 'Deck too small (19/20 minimum).')
      .and('not.contain', 'Deck trop petit');
    cy.contains('button', 'Activate this deck').should('exist');
  });

  it('affiche les erreurs de sélection et reflète immédiatement puis après rechargement le deck activé', () => {
    setupApp('en');
    let active = false;
    let failDetail = true;
    cy.intercept('GET', '/api/collection', { collection: [entry()] });
    cy.intercept('GET', '/api/decks', req => req.reply({ decks: [deck(active)] }));
    cy.intercept('GET', '/api/decks/5', req =>
      req.reply(
        failDetail
          ? { statusCode: 404, body: { error: 'Deck introuvable.' } }
          : { body: { deck: deck(active) } }
      )
    );
    cy.intercept('GET', '/api/decks/passive-bonuses', { bonuses: {} });
    cy.intercept('POST', '/api/decks/5/activate', req => {
      active = true;
      req.reply({ deck: deck(true) });
    });
    visit('/decks', 'en');
    cy.get('[role="alert"]').should('have.class', 'alert--error').and('contain', 'Deck not found');
    cy.then(() => {
      failDetail = false;
    });
    cy.get('[data-testid="deck-pick-5"]').click();
    cy.contains('button', 'Activate this deck').click();
    cy.get('[role="status"]').should('contain', 'Deck activated');
    cy.get('[data-testid="deck-builder"]').should('contain', 'Active');
    cy.contains('button', 'Activate this deck').should('not.exist');
    cy.reload();
    cy.get('[data-testid="deck-builder"]').should('contain', 'Active');
    cy.contains('button', 'Activate this deck').should('not.exist');
  });
});
