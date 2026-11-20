/**
 * Battle Pass — progression par quête et récompense de palier sur une saison seedée.
 */
describe('Battle Pass', () => {
  let guestCreated = false;

  beforeEach(() => {
    cy.request('POST', '/api/auth/guest', {
      characterName: 'Cypress Battle Pass',
      avatarId: 'aspirant-1-1',
    }).then(({ body }) => {
      guestCreated = true;
      expect(body.user.isGuest).to.equal(true);
    });
  });

  afterEach(() => {
    if (guestCreated) {
      cy.request('DELETE', '/api/auth/profile', { confirm: true });
      guestCreated = false;
    }
  });

  it('gagne de l’XP de quête et réclame un palier gratuit', () => {
    // Initialiser les fenêtres de quête avant de progresser par de vraies actions de jeu.
    cy.request('/api/battle-pass').its('body.season').should('not.be.null');
    cy.request('/api/battle-pass/quests');
    for (let i = 0; i < 5; i += 1) {
      cy.request('POST', '/api/shop/boosters/standard/open', {}).its('status').should('eq', 201);
    }

    cy.intercept('POST', '/api/battle-pass/quests/*/claim').as('claimQuest');
    cy.intercept('POST', '/api/battle-pass/claim/1').as('claimTier');
    cy.visit('/battle-pass');
    cy.get('[data-testid="battle-pass-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="battle-pass-track"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="battle-pass-empty"]').should('not.exist');
    cy.get('[data-testid="debug-bp-xp"]').should('not.exist');

    cy.get('[data-testid="quest-open_5_boosters"]').within(() => {
      cy.get('[data-testid^="claim-quest-"]').should('be.visible').and('be.enabled').click();
    });
    cy.wait('@claimQuest').then(({ response }) => {
      expect(response.statusCode).to.equal(200);
      expect(response.body.xp.xpGained).to.be.at.least(1000);
    });

    cy.get('[data-testid="claim-free-1"]', { timeout: 15000 })
      .should('be.visible')
      .and('be.enabled')
      .click();
    cy.wait('@claimTier').then(({ response }) => {
      expect(response.statusCode).to.equal(200);
      expect(response.body.level).to.equal(1);
      expect(response.body.track).to.equal('free');
      expect(response.body.rewards).not.to.be.empty;
    });
    cy.get('[data-testid="claim-free-1"]').should('not.exist');
    cy.get('[data-testid="battle-pass-track"] .bp-tier')
      .first()
      .should('have.class', 'bp-tier--claimed');
    cy.reload();
    cy.get('[data-testid="battle-pass-track"] .bp-tier', { timeout: 15000 })
      .first()
      .should('have.class', 'bp-tier--claimed');
    cy.get('[data-testid="claim-free-1"]').should('not.exist');
  });
});
