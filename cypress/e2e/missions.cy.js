describe('Bureau — missions idle (navigateur)', () => {
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

  it('charge le Bureau et le panneau missions', () => {
    cy.visit('/');
    cy.get('[data-testid="missions-panel"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="missions-collect"]').should('be.visible');
  });

  it('affiche les notifications mission_report dans la cloche', () => {
    cy.visit('/');
    cy.get('[data-testid="notification-bell"]').click();
    cy.get('[data-testid="notification-panel"]').should('be.visible');
    cy.get('[data-testid="notification-panel"]').contains(/Rapport de mission|Mission report/);
  });

  it('collecte les rapports de mission', () => {
    cy.visit('/');
    cy.get('[data-testid="missions-collect"]').click();
    cy.get('[data-testid="missions-collect"]').should('not.exist');
  });
});

describe('Auth — connexion démo', () => {
  it('redirige vers le Bureau après login', () => {
    cy.loginDemo();
    cy.visit('/');
    cy.contains('Bureau du Sensei').should('exist');
  });
});
