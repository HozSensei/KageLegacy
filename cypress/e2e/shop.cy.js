/**
 * Shop catalogue V2 — onglets seulement (pas d’achat Stripe / stub coins).
 */
describe('Shop — catalogue V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('parcourt les onglets du catalogue', () => {
    cy.visit('/shop');
    cy.get('[data-testid="shop-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="shop-tabs"]').should('be.visible');

    cy.get('[data-testid="shop-tab-boosters"]').click();
    cy.get('[data-testid="booster-selection"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="booster-standard"]').should('be.visible');
    cy.get('[data-testid="booster-elemental"]').should('be.visible');
    cy.get('[data-testid="booster-premium"]').should('be.visible');

    cy.get('[data-testid="shop-tab-cosmetics"]').should('not.exist');
    cy.get('[data-testid="cosmetic-catalog"]').should('not.exist');

    cy.get('[data-testid="shop-tab-currency"]').click();
    cy.get('[data-testid="coin-pack-catalog"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="coin-pack-ember"]', { timeout: 15000 }).should('be.visible');
    // Pas de clic achat : Stripe / stub hors smoke UI.

    cy.get('[data-testid="shop-tab-battlePass"]').click();
    cy.get('[data-testid="battle-pass-offer"]', { timeout: 15000 }).should('be.visible');
  });
});
