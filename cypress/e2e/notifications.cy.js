describe('Notifications — cloche Bureau', () => {
  before(() => {
    cy.task('prepareMissionsE2E').then((result) => {
      expect(result.ok).to.eq(true);
      expect(result.missionNotifications).to.be.gte(1);
    });
  });

  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/bureau');
  });

  it('ignore une notification mission_report', () => {
    cy.get('[data-testid="notification-bell"]').click();
    cy.get('[data-testid="notification-panel"]').should('be.visible');
    cy.get('[data-testid="notification-dismiss"]').its('length').then((count) => {
      expect(count).to.be.gte(1);
      cy.get('[data-testid="notification-dismiss"]').first().click();
      if (count > 1) {
        cy.get('[data-testid="notification-dismiss"]').should('have.length', count - 1);
      } else {
        cy.get('[data-testid="notification-dismiss"]').should('not.exist');
      }
    });
  });

  it('suit le lien vers le Bureau depuis une notif mission', () => {
    cy.get('[data-testid="notification-bell"]').click();
    cy.get('[data-testid="notification-follow"]').first().click();
    cy.get('[data-testid="bureau-page"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="missions-panel"]').should('be.visible');
  });
});
