const firstCard = {
  id: 11,
  slug: 'first-scroll',
  nameEn: 'First scroll',
  nameFr: 'Premier parchemin',
  type: 'attack',
  rarity: 'legendary',
  upgradable: true,
  cost: 1,
};
const secondCard = { ...firstCard, id: 12, slug: 'second-scroll', nameEn: 'Second scroll' };
const resources = { ryos: 1000, dust: 500, essence: 0, kageCoins: 0 };
const serverError = { statusCode: 503, body: { error: 'Indisponible' } };

function entry(card = firstCard, quantity = 2, upgradeLevel = 0) {
  return {
    collectionId: card.id + 100,
    cardDefinitionId: card.id,
    quantity,
    upgradeLevel,
    card,
    actionPreview: { upgradeCost: { ryos: 100 }, disenchantGain: { dust: 10 } },
  };
}

const byTestId = id => `[data-testid="${id}"]`;
const detail = byTestId('collection-detail');
const loadError = byTestId('collection-load-error');
const actionButton = action => byTestId(`collection-${action}`);
const actionFeedback = action => byTestId(`collection-${action}-feedback`);
const actionUrl = action => `/api/collection/111/${action}`;

function visitCollection(ownedOnly = false) {
  cy.visit('/collection', {
    onBeforeLoad(win) {
      win.localStorage.setItem('kage-locale', 'en');
      win.localStorage.setItem('kage-legacy-collection-owned-only', ownedOnly ? '1' : '0');
    },
  });
}

function selectCard(name = firstCard.nameEn) {
  cy.contains(byTestId('card-face-front'), name).click({ scrollBehavior: 'center' });
}

function clickAction(action) {
  cy.get(actionButton(action)).click({ scrollBehavior: 'center' });
}

function expectActionFeedback(action, text) {
  cy.get(actionButton(action))
    .next(actionFeedback(action))
    .should('be.visible')
    .and('contain', text);
  cy.get(loadError).should('not.exist');
}

describe('Collection — retours des actions', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/auth/me', {
      user: { id: 1, username: 'test' },
      sensei: { name: 'Test', language: 'en' },
    });
    cy.intercept('GET', '/api/player', { character: { name: 'Test', level: 1 } });
    cy.intercept('GET', '/api/shop/balances', { balances: resources });
    cy.intercept('GET', '/api/cards', { cards: [firstCard, secondCard] });
  });

  it('affiche les succès sous les boutons concernés et met à jour le détail', () => {
    let currentEntry = entry();
    cy.intercept('GET', '/api/collection', req => req.reply({ collection: [currentEntry] }));
    cy.intercept('POST', actionUrl('upgrade'), req => {
      currentEntry = entry(firstCard, 2, 1);
      req.reply({ resources });
    });
    cy.intercept('POST', actionUrl('disenchant'), req => {
      expect(req.body).to.deep.equal({ quantity: 1 });
      currentEntry = entry(firstCard, 1, 1);
      req.reply({ resources });
    });

    visitCollection();
    selectCard();
    clickAction('upgrade');
    expectActionFeedback('upgrade', 'Card upgraded.');
    cy.get(detail).find('dd').first().should('have.text', '×2');
    cy.get(detail).find('.lozenge:not(.lozenge--hollow)').should('have.length', 1);

    clickAction('disenchant');
    expectActionFeedback('disenchant', 'Card disenchanted.');
    cy.get(actionFeedback('upgrade')).should('not.exist');
    cy.get(detail).find('dd').first().should('have.text', '×1');
  });

  it('traduit les erreurs du POST sans alerte globale et les efface à la sélection suivante', () => {
    cy.intercept('GET', '/api/collection', { collection: [entry(), entry(secondCard)] });
    cy.intercept('POST', actionUrl('upgrade'), {
      statusCode: 400,
      body: { error: 'Poussière de carte insuffisante.' },
    });
    cy.intercept('POST', actionUrl('disenchant'), {
      statusCode: 400,
      body: { error: 'Impossible de désenchanter : exemplaires utilisés dans un deck.' },
    });

    visitCollection();
    selectCard();
    clickAction('upgrade');
    expectActionFeedback('upgrade', 'Not enough card dust.');
    clickAction('disenchant');
    expectActionFeedback('disenchant', 'Cannot disenchant: copies are used in a deck.');
    cy.get(actionFeedback('upgrade')).should('not.exist');
    selectCard(secondCard.nameEn);
    cy.get(actionFeedback('disenchant')).should('not.exist');
  });

  it('garde l’erreur de chargement globale mais affiche l’échec du rafraîchissement sous le bouton', () => {
    let failLoad = true;
    cy.intercept('GET', '/api/collection', req =>
      req.reply(failLoad ? serverError : { body: { collection: [entry()] } })
    );
    cy.intercept('POST', actionUrl('upgrade'), req => {
      failLoad = true;
      req.reply({ resources });
    });

    visitCollection();
    cy.get(loadError).should('be.visible').and('contain', 'The request failed.');
    cy.then(() => {
      failLoad = false;
    });
    cy.get(loadError).find('button').click({ scrollBehavior: 'center' });
    selectCard();
    clickAction('upgrade');
    expectActionFeedback('upgrade', 'Action completed, but the refresh failed.');
  });

  it('ne remplace pas une sélection plus récente après une réponse tardive', () => {
    let release;
    const responseGate = new Cypress.Promise(resolve => {
      release = resolve;
    });
    let upgraded = false;
    cy.intercept('GET', '/api/collection', req =>
      req.reply({ collection: [entry(firstCard, 2, upgraded ? 1 : 0), entry(secondCard)] })
    );
    cy.intercept('POST', actionUrl('upgrade'), req =>
      responseGate.then(() => {
        upgraded = true;
        req.reply({ resources });
      })
    );

    visitCollection();
    selectCard();
    clickAction('upgrade');
    cy.get(actionButton('upgrade')).should('be.disabled');
    selectCard(secondCard.nameEn);
    cy.then(release);
    cy.get(actionButton('upgrade')).should('be.enabled');
    cy.get(detail).should('contain', secondCard.nameEn).and('not.contain', firstCard.nameEn);
    cy.get(actionFeedback('upgrade')).should('not.exist');
    cy.get(loadError).should('not.exist');
    selectCard();
    cy.get(detail).find('.lozenge:not(.lozenge--hollow)').should('have.length', 1);
  });

  it('conserve le succès dans le panneau quand le dernier exemplaire disparaît du filtre', () => {
    let owned = true;
    cy.intercept('GET', '/api/collection', req =>
      req.reply({ collection: owned ? [entry(firstCard, 1)] : [] })
    );
    cy.intercept('POST', actionUrl('disenchant'), req => {
      owned = false;
      req.reply({ resources });
    });

    visitCollection(true);
    selectCard();
    clickAction('disenchant');
    cy.get(actionButton('disenchant')).should('not.exist');
    cy.get(detail)
      .find(actionFeedback('disenchant'))
      .should('be.visible')
      .and('contain', 'Card disenchanted.');
    cy.get(loadError).should('not.exist');
  });
});
