const byTestId = id => `[data-testid="${id}"]`;
const card = () => cy.get(byTestId('ninja-profile-card'));

const initialProfile = {
  avatarId: 'aspirant-1-1',
  borderColor: null,
  backgroundColor: null,
  nicknameId: null,
  unlockedNicknameIds: ['genin'],
};

const arts = { taijutsu: 7, ninjutsu: 8, genjutsu: 9, medicine: 6 };

function mockProfile(name = 'Yori') {
  let character = {
    id: 7,
    name,
    level: 5,
    rank: 'Genin',
    xp: 10,
    xpToNextLevel: 500,
    talentPointsAvailable: 2,
    stats: { total: { maxHp: 12, startingBlock: 4, maxChakra: 1, ...arts } },
    profile: { ...initialProfile },
  };
  cy.intercept('GET', '**/api/**', {});
  cy.intercept('GET', '/api/auth/me', {
    user: { id: 1, username: 'Yori' },
    profile: { language: 'en' },
  });
  cy.intercept('GET', '/api/player', req => req.reply({ character }));
  cy.intercept('PATCH', '/api/player/character/profile', req => {
    character = { ...character, profile: { ...character.profile, ...req.body } };
    req.reply({ character });
  }).as('saveProfile');
}

describe('Ninja identity card', () => {
  it('previews appearance changes and saves them without changing the displayed stats', () => {
    mockProfile();
    cy.visit('/profil');
    card().should('have.attr', 'data-variant', 'ninja');
    card().should('have.attr', 'data-avatar-id', 'aspirant-1-1');
    card().find(byTestId('ninja-card-hp')).should('have.text', '112/112');
    card().find(byTestId('ninja-card-armor')).should('have.text', '4');
    card().find(byTestId('ninja-card-chakra')).should('have.text', '6/6');
    const artsRow = () => card().find(byTestId('ninja-card-arts'));
    artsRow().find('[data-testid^="ninja-card-art-"]').should('have.length', 4);
    for (const [art, value] of Object.entries(arts)) {
      const label = art[0].toUpperCase() + art.slice(1);
      artsRow()
        .find(byTestId(`ninja-card-art-${art}`))
        .should('contain.text', label)
        .and('contain.text', String(value));
    }

    const picker = () => cy.get(byTestId('ninja-avatar-picker'));
    picker().contains('button', 'ANBU').click();
    picker().find('input[value="anbu-1-1"]').should('be.disabled');
    picker().contains('button', 'Genin').click();
    picker().find('input[value="genin-1-3"]').closest('label').click();
    cy.get(byTestId('profile-nickname')).select('Rising Shinobi');
    cy.get(byTestId('profile-appearance-form'))
      .find('input[type="color"]')
      .eq(0)
      .invoke('val', '#abcdef')
      .trigger('input');
    cy.get(byTestId('profile-appearance-form'))
      .find('input[type="color"]')
      .eq(1)
      .invoke('val', '#123456')
      .trigger('input');

    card().should('have.attr', 'data-avatar-id', 'genin-1-3');
    card().find(byTestId('ninja-card-nickname')).should('have.text', 'Rising Shinobi');
    card().should('have.css', 'background-color', 'rgb(18, 52, 86)');
    card().should('have.css', 'border-top-color', 'rgb(171, 205, 239)');
    card().should('have.css', 'color', 'rgb(255, 255, 255)');
    cy.get(byTestId('profile-save')).click();
    cy.wait('@saveProfile').its('request.body').should('deep.equal', {
      avatarId: 'genin-1-3',
      borderColor: '#abcdef',
      backgroundColor: '#123456',
      nicknameId: 'genin',
    });

    cy.reload();
    card().should('have.attr', 'data-avatar-id', 'genin-1-3');
    card().find(byTestId('ninja-card-nickname')).should('have.text', 'Rising Shinobi');
    card().find(byTestId('ninja-card-hp')).should('have.text', '112/112');
    cy.get(byTestId('profile-save')).should('be.disabled');
  });

  it('wraps a long ninja name without horizontal overflow on mobile', () => {
    const name = 'Yori of the Hidden Moon and Keeper of the Eastern Mountain Pass';
    cy.viewport(360, 800);
    mockProfile(name);
    cy.visit('/profil');

    card()
      .contains('h1, h2, h3, h4, h5, h6', name)
      .should($name => {
        const heading = $name[0];
        expect(heading.textContent.trim()).to.equal(name);
        const range = heading.ownerDocument.createRange();
        range.selectNodeContents(heading);
        const lineTops = new Set(Array.from(range.getClientRects(), rect => rect.top));
        expect(lineTops.size, 'rendered name lines').to.be.greaterThan(1);
      });
    card().should($card => {
      const { scrollWidth, clientWidth } = $card[0];
      expect(scrollWidth, 'card scroll width').to.equal(clientWidth);
    });
    cy.document()
      .its('documentElement')
      .should(root => {
        expect(root.scrollWidth, 'page scroll width').to.equal(root.clientWidth);
      });

    if (Cypress.env('ninjaCardPreview')) {
      card().screenshot('ninja-profile-card-mobile');
    }
  });
});
