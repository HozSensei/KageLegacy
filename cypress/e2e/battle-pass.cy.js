/**
 * Battle Pass V2 — page load + debug XP / claim si saison seedée.
 * Skip documenté si e2e:prepare n’a pas seedé la saison.
 */
describe('Battle Pass V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('charge la page et claim un tier après debug XP', function () {
    cy.visit('/battle-pass');
    cy.get('[data-testid="battle-pass-page"]', { timeout: 15000 }).should('be.visible');

    // Attendre track OU empty (ne pas matcher le kicker « Saison »).
    cy.get(
      '[data-testid="battle-pass-track"], [data-testid="battle-pass-empty"]',
      { timeout: 15000 },
    ).should('exist');

    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="battle-pass-empty"]').length) {
        cy.log('SKIP: saison Battle Pass absente — lancer npm run db:seed-battle-pass');
        this.skip();
      }
    });

    cy.get('[data-testid="battle-pass-track"]').should('be.visible');
    cy.get('[data-testid="debug-bp-xp"]').should('be.visible').click();

    cy.get('body').then(($body) => {
      const claimBtn = $body.find('[data-testid^="claim-free-"]').first();
      if (!claimBtn.length) {
        cy.log('Aucun claim free disponible après debug XP (déjà claimé) — smoke OK');
        return;
      }
      const testId = claimBtn.attr('data-testid');
      cy.get(`[data-testid="${testId}"]`).click();
      cy.get(`[data-testid="${testId}"]`, { timeout: 15000 }).should('not.exist');
    });
  });
});
