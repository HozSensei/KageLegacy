describe('Cartes — collection & decks V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('ouvre la collection', () => {
    cy.visit('/collection');
    cy.get('[data-testid="collection-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="collection-grid"]').should('be.visible');
  });

  it('ouvre le constructeur de deck', () => {
    cy.visit('/decks');
    cy.get('[data-testid="deck-builder-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="deck-builder"]').should('be.visible');
  });

  it('ouvre la boutique de parchemins', () => {
    cy.visit('/shop');
    cy.get('[data-testid="shop-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="booster-selection"]').should('be.visible');
    cy.get('[data-testid="booster-standard"]').should('be.visible');
  });
});
