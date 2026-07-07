describe('Interface — locale', () => {
  beforeEach(() => {
    cy.loginDemo();
    cy.visit('/');
    cy.get('[data-testid="missions-panel"]', { timeout: 15000 }).should('be.visible');
  });

  it('bascule en anglais sur le Bureau', () => {
    cy.get('[data-testid="locale-en"]').click();
    cy.get('[data-testid="nav-squad"]').should('contain', 'Squad');
    cy.get('[data-testid="missions-panel"]').contains('Mission contracts');
  });

  it('revient en français', () => {
    cy.get('[data-testid="locale-en"]').click();
    cy.get('[data-testid="locale-fr"]').click();
    cy.get('[data-testid="nav-squad"]').should('contain', 'Escouade');
    cy.get('[data-testid="missions-panel"]').contains('Contrats de mission');
  });
});
