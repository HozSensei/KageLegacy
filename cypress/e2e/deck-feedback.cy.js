const constraints = { min: 2, max: 4, maxCopies: 2, maxClan: 2, maxLegendaryOrMythic: 4 };
const deckId = 41;
const deckUrl = `/api/decks/${deckId}`;
const deckName = 'Practice deck';

function collectionEntry(collectionId, slug, nameEn) {
  const card = { id: collectionId - 100, slug, nameEn, type: 'attack', rarity: 'common', cost: 1 };
  return { collectionId, cardDefinitionId: card.id, quantity: 4, upgradeLevel: 0, card };
}

const first = collectionEntry(111, 'first-scroll', 'First scroll');
const second = collectionEntry(112, 'second-scroll', 'Second scroll');
const reasons = ['Deck too large (5/4 maximum).', 'Too many copies of "First scroll" (max 2).'];
const invalidDeck = makeDeck(3, 2, {
  valid: false,
  errors: ['Deck trop grand (5/4 maximum).', 'Trop de copies de « First scroll » (max 2).'],
  errorsEn: reasons,
});

function makeDeck(
  firstQuantity,
  secondQuantity,
  validation = { valid: true, errors: [], errorsEn: [] }
) {
  return {
    id: deckId,
    name: deckName,
    isActive: true,
    size: firstQuantity + secondQuantity,
    cards: [first, second].map(({ collectionId, cardDefinitionId, card }, index) => ({
      deckCardId: index + 1,
      collectionId,
      cardDefinitionId,
      card,
      quantity: index === 0 ? firstQuantity : secondQuantity,
    })),
    validation,
  };
}

const byTestId = id => `[data-testid="${id}"]`;
const page = byTestId('deck-builder-page');
const builder = byTestId('deck-builder');
const validity = byTestId('deck-validity');
const validation = byTestId('deck-validation');
const cardTile = entry => byTestId(`deck-card-${entry.collectionId}`);
const cardFeedback = entry => byTestId(`deck-card-feedback-${entry.collectionId}`);

function mockDeck(getDeck) {
  cy.intercept('GET', '/api/decks', req => {
    const { id, name, size, isActive } = getDeck();
    req.reply({ decks: [{ id, name, size, isActive }], constraints });
  });
  cy.intercept('GET', deckUrl, req => req.reply({ deck: getDeck() }));
}

function visitDeckBuilder() {
  cy.visit('/decks', {
    onBeforeLoad(win) {
      win.localStorage.setItem('kage-locale', 'en');
    },
  });
}

function quantityControl(entry, action) {
  return cy
    .get(cardTile(entry))
    .find(`button[aria-label="${action} one copy of ${entry.card.nameEn}"]`);
}

describe('Deck builder feedback', () => {
  beforeEach(() => {
    // Stub unexpected API calls too, so the spec never falls through to a real backend.
    cy.intercept(
      { pathname: '/api/**' },
      { statusCode: 501, body: { error: 'Unmocked API call' } }
    );
    cy.intercept('GET', '/api/auth/me', {
      user: { id: 1, username: 'test' },
      profile: { language: 'en' },
    });
    cy.intercept('GET', '/api/player', { character: { name: 'Test', level: 1 } });
    cy.intercept('GET', '/api/shop/balances', {
      balances: { ryos: 0, dust: 0, essence: 0, kageCoins: 0 },
    });
    cy.intercept('GET', '/api/collection', { collection: [first, second] });
  });

  it('displays the server limits in the rules and the selected deck summary', () => {
    mockDeck(() =>
      makeDeck(2, 1, {
        valid: true,
        artCounts: { taijutsu: 1, ninjutsu: 1 },
        nonNeutralCount: 2,
        minArtCards: 1,
      })
    );
    visitDeckBuilder();

    cy.get(byTestId('deck-rules'))
      .should('be.visible')
      .within(() => {
        cy.contains('h2', 'Deck-building rules').should('be.visible');
        cy.contains('li', '2 to 4 cards total, including copies.').should('be.visible');
        cy.contains('li', 'Up to 2 copies of the same card').should('be.visible');
        cy.contains('li', 'Up to 2 clan cards.').should('be.visible');
        cy.contains('li', 'Up to 4 legendary or mythic cards total').should('be.visible');
        cy.contains('li', 'Exactly 2 distinct arts, each with at least 25%').should('be.visible');
      });
    cy.get(builder).contains('3 / 4').should('be.visible');
    cy.get(builder).contains('Clan 0/2 · Legendary/mythic 0/4').should('be.visible');
    cy.get(byTestId('deck-art-summary'))
      .should('contain.text', 'Neutral cards: 1')
      .and('contain.text', 'Minimum per art: 1')
      .and('contain.text', 'Taijutsu');
  });

  it('shows an active deck as invalid with the server-provided reasons', () => {
    mockDeck(() => invalidDeck);
    visitDeckBuilder();

    cy.get(byTestId(`deck-pick-${deckId}`)).should('have.attr', 'aria-pressed', 'true');
    cy.get(builder)
      .contains('span', /^Active$/)
      .should('be.visible');
    cy.get(validity).should('be.visible').and('have.text', 'Invalid deck');
    cy.get(validation)
      .should('be.visible')
      .within(() => {
        cy.contains('This deck cannot be used in combat.').should('be.visible');
        cy.get('li').should($items => {
          expect([...$items].map(item => item.textContent.trim())).to.deep.equal(reasons);
        });
      });
  });

  it('shows an add-card 400 only under the clicked card and leaves the count unchanged', () => {
    mockDeck(() => makeDeck(2, 1));
    cy.intercept('POST', `${deckUrl}/cards`, {
      statusCode: 400,
      body: { error: 'Pas assez d’exemplaires dans la collection.' },
    }).as('addCard');
    visitDeckBuilder();

    quantityControl(second, 'Add').click({ scrollBehavior: 'center' });
    cy.wait('@addCard').then(({ request, response }) => {
      expect(request.body).to.deep.equal({ collectionId: second.collectionId, quantity: 1 });
      expect(response.statusCode).to.equal(400);
    });

    cy.get(cardTile(second))
      .find(cardFeedback(second))
      .should('be.visible')
      .and('have.attr', 'role', 'alert');
    cy.get(cardFeedback(second)).should('have.text', 'Not enough copies in your collection.');
    cy.get(page).find('[role="alert"], .alert--error').should('have.length', 1);
    cy.get(cardTile(first)).find('[data-testid^="deck-card-feedback-"]').should('not.exist');
    cy.get(cardTile(second)).find('[aria-label="1 copy in deck"]').should('have.text', '1');
  });

  it('replaces invalid status and reasons when a successful removal makes the deck valid', () => {
    let deck = invalidDeck;
    mockDeck(() => deck);
    cy.intercept(
      {
        method: 'DELETE',
        pathname: `${deckUrl}/cards/${first.collectionId}`,
        query: { quantity: '1' },
      },
      req => {
        deck = makeDeck(2, 2);
        req.reply({ deck });
      }
    ).as('removeCard');
    visitDeckBuilder();

    cy.get(validity).should('have.text', 'Invalid deck');
    cy.get(validation).should('be.visible');
    quantityControl(first, 'Remove').click({ scrollBehavior: 'center' });
    cy.wait('@removeCard').its('response.statusCode').should('eq', 200);

    cy.get(validity).should('be.visible').and('have.text', 'Valid deck');
    cy.get(validation).should('not.exist');
    cy.get(cardTile(first)).find('[aria-label="2 copies in deck"]').should('have.text', '2');
    cy.get(cardTile(first))
      .find(cardFeedback(first))
      .should('be.visible')
      .and('have.text', 'Card removed from deck.');
  });
});
