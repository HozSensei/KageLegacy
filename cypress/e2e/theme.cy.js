const STORAGE_KEY = 'kage-legacy-theme';

/** Visite une page en simulant le thème du système (aucun choix mémorisé au départ). */
function visitWithSystemTheme(path, systemDark) {
  cy.visit(path, {
    onBeforeLoad(win) {
      cy.stub(win, 'matchMedia').callsFake((query) => ({
        matches: systemDark && query.includes('prefers-color-scheme: dark'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }));
    },
  });
}

function expectTheme(theme) {
  cy.get('html').should('have.attr', 'data-theme', theme);
  cy.get('[data-testid="theme-toggle"]').should('have.attr', 'data-theme-current', theme);
}

describe('Thème — clair / sombre', () => {
  it('suit le thème du système tant qu’aucun choix n’est mémorisé', () => {
    visitWithSystemTheme('/', true);
    cy.get('[data-testid="landing-page"]').should('be.visible');
    expectTheme('dark');
    cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.equal(null));

    visitWithSystemTheme('/', false);
    expectTheme('light');
  });

  it('bascule sur une page publique et conserve le choix après rechargement', () => {
    visitWithSystemTheme('/', false);
    expectTheme('light');

    cy.get('[data-testid="theme-toggle"]').click();
    expectTheme('dark');
    cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.equal('dark'));

    cy.reload();
    cy.get('[data-testid="landing-page"]').should('be.visible');
    expectTheme('dark');

    cy.get('[data-testid="theme-toggle"]').click();
    expectTheme('light');
    cy.reload();
    expectTheme('light');
  });

  it('propose la bascule dans la coque et garde le thème d’une page à l’autre', () => {
    cy.loginDemo();
    visitWithSystemTheme('/home', false);
    cy.get('[data-testid="hub-page"]', { timeout: 15000 }).should('be.visible');
    expectTheme('light');

    cy.get('[data-testid="theme-toggle"]').click();
    expectTheme('dark');

    cy.visit('/collection');
    cy.get('[data-testid="collection-page"]', { timeout: 15000 }).should('be.visible');
    expectTheme('dark');
  });
});
