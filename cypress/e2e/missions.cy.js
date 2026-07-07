describe('Missions idle (navigateur)', () => {
  before(() => {
    cy.task('prepareMissionsE2E').then((result) => {
      expect(result.ok).to.eq(true);
      expect(result.pendingMissions).to.be.gte(1);
      expect(result.missionNotifications).to.be.gte(1);
    });
  });

  beforeEach(() => {
    cy.loginDemo();
  });

  it('charge la page missions', () => {
    cy.visit('/missions');
    cy.get('[data-testid="missions-panel"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="missions-collect"]').should('be.visible');
  });

  it('affiche les notifications mission_report dans la cloche', () => {
    cy.visit('/bureau');
    cy.get('[data-testid="notification-bell"]').click();
    cy.get('[data-testid="notification-panel"]').should('be.visible');
    cy.get('[data-testid="notification-panel"]').contains(/Rapport de mission|Mission report/);
  });

  it('collecte les rapports de mission', () => {
    cy.visit('/missions');
    cy.get('[data-testid="missions-collect"]').click();
    cy.get('[data-testid="missions-collect"]').should('not.exist');
  });
});
