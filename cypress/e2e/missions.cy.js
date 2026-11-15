/**
 * Missions combat V2 — liste + démarrage run (ou reprise si run actif).
 */
describe('Missions combat V2', () => {
  beforeEach(() => {
    cy.loginDemo();
  });

  it('affiche la liste et démarre ou reprend un run', function () {
    cy.visit('/missions');
    cy.get('[data-testid="missions-combat-page"]', { timeout: 15000 }).should('be.visible');

    cy.get(
      '[data-testid="active-run-banner"], article[data-testid^="mission-"]',
      { timeout: 15000 },
    ).should('exist');

    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="active-run-banner"]').length) {
        cy.get('[data-testid="resume-run"]').click();
        return;
      }

      const mission = $body.find('article[data-testid^="mission-"]').first();
      if (!mission.length) {
        cy.log('SKIP: aucune mission listée (migrations combat manquantes)');
        this.skip();
      }
      cy.wrap(mission).find('[data-testid="mission-start"]').click();
    });

    cy.url({ timeout: 15000 }).should('include', '/missions/run/');
    cy.get('[data-testid="mission-run-page"]', { timeout: 15000 }).should('be.visible');
  });

  it('affiche la section duel rapide', () => {
    cy.visit('/missions');
    cy.get('[data-testid="missions-combat-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="quick-fight-section"]').should('be.visible');
    cy.get('[data-testid^="quick-fight-"]', { timeout: 15000 }).should('have.length.gte', 1);
  });
});
