const STORAGE_KEY = 'kage-legacy-theme';

function clearThemeOnLoad(win) {
  try {
    win.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}

function visibleThemeToggle() {
  return cy.get('[data-testid="theme-toggle"]:visible').first();
}

function expectTheme(theme) {
  cy.get('html').should('have.attr', 'data-theme', theme);
  visibleThemeToggle().should('have.attr', 'data-theme-current', theme);
}

function pickTheme(theme) {
  visibleThemeToggle().click();
  cy.get('[data-testid="theme-picker-menu"]:visible').should('be.visible');
  cy.get(`[data-testid="theme-option-${theme}"]:visible`).click();
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

    visibleThemeToggle().click();
    cy.get('[data-testid="theme-picker-menu"]:visible').should('be.visible');
    cy.get('[data-testid="theme-option-light"]:visible').should('exist');
    cy.get('[data-testid="theme-option-dark"]:visible').should('exist');
    cy.get('[data-testid="theme-option-ink"]:visible').should('exist');
    cy.get('[data-testid="theme-option-amber"]:visible').should('exist');
    visibleThemeToggle().click();

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

    // Rail desktop : le menu s’ouvre vers le haut (onFill) pour rester dans le viewport.
    pickTheme('amber');

    cy.visit('/collection');
    cy.get('[data-testid="collection-page"]', { timeout: 15000 }).should('be.visible');
    expectTheme('amber');
  });
});
