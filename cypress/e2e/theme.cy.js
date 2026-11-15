const STORAGE_KEY = 'kage-legacy-theme';

/** Visite une page en simulant le thème du système (aucun choix mémorisé au départ). */
function visitWithSystemTheme(path, systemDark) {
  cy.visit(path, {
    onBeforeLoad(win) {
      // Efface un éventuel choix résiduel avant le script inline de index.html.
      try {
        win.localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
      // Remplace matchMedia avant le script inline (cy.stub peut arriver trop tard).
      Object.defineProperty(win, 'matchMedia', {
        configurable: true,
        writable: true,
        value(query) {
          return {
            matches: Boolean(systemDark && String(query).includes('prefers-color-scheme: dark')),
            media: query,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
            onchange: null,
          };
        },
      });
    },
  });
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
  it('suit le thème du système tant qu’aucun choix n’est mémorisé (sombre → indigo)', () => {
    visitWithSystemTheme('/', true);
    cy.get('[data-testid="landing-page"]').should('be.visible');
    expectTheme('dark');
    cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.equal(null));

    visitWithSystemTheme('/', false);
    expectTheme('light');
  });

  it('propose les quatre thèmes, persiste le choix et le conserve après rechargement', () => {
    visitWithSystemTheme('/', false);
    expectTheme('light');

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
    visitWithSystemTheme('/home', false);
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    expectTheme('light');

    pickTheme('amber');

    cy.visit('/collection');
    cy.get('[data-testid="collection-page"]', { timeout: 15000 }).should('be.visible');
    expectTheme('amber');
  });
});
