describe('Cartes — collection & decks V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('ouvre la collection', () => {
    cy.visit('/collection');
    cy.get('[data-testid="collection-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="collection-grid"]').should('be.visible');
  });

  it('ouvre le constructeur et crée un deck minimal', () => {
    cy.visit('/decks');
    cy.get('[data-testid="deck-builder-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="deck-builder"]').should('be.visible');

    const deckName = `E2E Deck ${Date.now()}`;
    // Stage heroes are tall; scrollBehavior top would tuck the input under the sticky app bar.
    cy.get('[data-testid="deck-create-name"]')
      .scrollIntoView({ offset: { top: -96, left: 0 } })
      .clear({ scrollBehavior: 'center' })
      .type(deckName, { scrollBehavior: 'center' });
    cy.get('[data-testid="deck-create-submit"]').click({ scrollBehavior: 'center' });
    cy.get('[data-testid="deck-list"]', { timeout: 15000 }).should('contain', deckName);
    cy.get('[data-testid="deck-builder"]').should('be.visible');
  });

  it('ouvre la boutique de parchemins (boosters)', () => {
    cy.visit('/shop');
    cy.get('[data-testid="shop-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="booster-selection"]').should('be.visible');
    cy.get('[data-testid="booster-standard"]').should('be.visible');
  });
});
