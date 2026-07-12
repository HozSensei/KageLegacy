describe('Missions — envoi de contrat (UI)', () => {
  before(() => {
    cy.task('resetDemoCycle').then((result) => {
      expect(result.ok).to.eq(true);
      expect(result.hour).to.eq(0);
      expect(result.benchNinjas).to.be.gte(1);
    });
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/missions').as('getMissions');
    cy.loginDemo();
    cy.visit('/missions');
    cy.wait('@getMissions');
    cy.get('[data-testid="missions-panel"]', { timeout: 15000 }).should('be.visible');
  });

  it('envoie un contrat Routine et affiche la mission active sans rechargement', () => {
    cy.get('[data-testid="missions-ninja-select"] option:not([disabled])')
      .not('[value="null"]')
      .first()
      .then(($option) => {
        cy.get('[data-testid="missions-ninja-select"]').select($option.val());
      });

    cy.get('[data-testid="missions-tier-select"]').select('D');
    cy.intercept('POST', '/api/missions/assign').as('assignMission');
    cy.get('[data-testid="missions-send"]').should('not.be.disabled').click();
    cy.wait('@assignMission').then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      expect(response.body.missions.activeMissions).to.have.length.gte(1);
    });

    cy.url().should('include', '/missions');
    cy.get('[data-testid="missions-panel"]').should('not.contain.text', 'Chargement');
    cy.get('[data-testid="missions-active"]', { timeout: 10000 }).should('exist').and('be.visible');
    cy.get('[data-testid="missions-active"]').contains(/En mission|On mission/);
    cy.get('[data-testid="missions-active"]').contains(/Mission — rang D|Mission — rank D/);

    cy.get('[data-testid="missions-ninja-select"] option:not([disabled])')
      .not('[value="null"]')
      .eq(1)
      .then(($option) => {
        cy.get('[data-testid="missions-ninja-select"]').select($option.val());
      });
    cy.get('[data-testid="missions-tier-select"] option[value="D"]').should('be.disabled');
  });
});
