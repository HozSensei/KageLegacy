const STORAGE_KEY = 'kage-legacy-theme';

function clearThemeOnLoad(win) {
  try {
    win.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}

function expectTheme(theme) {
  cy.get('html').should('have.attr', 'data-theme', theme);
  cy.get('[data-testid="theme-toggle"]').should('have.attr', 'data-theme-current', theme);
}

function pickTheme(theme) {
  cy.get('[data-testid="theme-toggle"]').click();
  cy.get('[data-testid="theme-picker-menu"]').should('be.visible');
  cy.get(`[data-testid="theme-option-${theme}"]`).click();
  expectTheme(theme);
}

describe('Thème — clair / sombre indigo / sombre encre / sombre ambre', () => {
  it('sans choix mémorisé, applique sombre encre par défaut', () => {
    cy.visit('/', { onBeforeLoad: clearThemeOnLoad });
    cy.get('[data-testid="landing-page"]').should('be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem(STORAGE_KEY)).to.equal(null);
      expect(win.document.documentElement.getAttribute('data-theme')).to.equal('ink');
    });
    expectTheme('ink');
  });

  it('propose les quatre thèmes, persiste le choix et le conserve après rechargement', () => {
    cy.visit('/', { onBeforeLoad: clearThemeOnLoad });
    cy.get('[data-testid="landing-page"]').should('be.visible');

    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('[data-testid="theme-picker-menu"]').should('be.visible');
    cy.get('[data-testid="theme-option-light"]').should('exist');
    cy.get('[data-testid="theme-option-dark"]').should('exist');
    cy.get('[data-testid="theme-option-ink"]').should('exist');
    cy.get('[data-testid="theme-option-amber"]').should('exist');
    cy.get('[data-testid="theme-toggle"]').click();

    pickTheme('dark');
    cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.equal('dark'));
    cy.reload();
    cy.get('[data-testid="landing-page"]').should('be.visible');
    expectTheme('dark');

    pickTheme('ink');
    cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.equal('ink'));
    cy.reload();
    expectTheme('ink');

    pickTheme('amber');
    cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.equal('amber'));
    cy.reload();
    expectTheme('amber');

    pickTheme('light');
    cy.reload();
    expectTheme('light');
  });

  it('propose la bascule dans la coque et garde le thème d’une page à l’autre', () => {
    cy.loginDemo();
    cy.visit('/home', { onBeforeLoad: clearThemeOnLoad });
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');

    pickTheme('amber');

    cy.visit('/collection');
    cy.get('[data-testid="collection-page"]', { timeout: 15000 }).should('be.visible');
    expectTheme('amber');
  });
});
