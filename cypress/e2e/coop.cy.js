const url = '/api/coop';
const waiting = {
  room: { id: 'room-coop', code: 'ABCD', status: 'waiting', revision: 1, combat: null },
};
const person = (id, name) => ({ id, name, hp: 30, maxHp: 30, block: 0 });
const card = (slug, props) => ({
  instanceId: slug,
  slug,
  nameFr: slug,
  nameEn: slug,
  type: 'skill',
  cost: 1,
  statType: 'medicine',
  effects: [],
  ...props,
});

function active({ revision = 2, activePlayerId = 1, hand = [], allyHp = 30 } = {}) {
  return {
    room: {
      ...waiting.room,
      status: 'active',
      revision,
      combat: {
        id: 'room-coop',
        state: 'in_progress',
        ruleset: 'persistent',
        currentTurn: 1,
        currentPhase: activePlayerId === 1 ? 'player_turn' : 'enemy_turn',
        activePlayerId,
        stats: { taijutsu: 7, ninjutsu: 8, genjutsu: 9, medicine: 6 },
        player: {
          ...person(1, 'Scout'),
          rank: 'Genin',
          level: 5,
          profile: { avatarId: 'genin-1-2', nicknameId: 'genin' },
          chakra: 1,
          maxChakra: 5,
          hand,
          drawCount: 2,
          discardsRemaining: 2,
          chakraDiscardAvailable: true,
          previousCardStatType: 'taijutsu',
        },
        ally: {
          ...person(2, 'Medic'),
          profile: { avatarId: 'aspirant-2-5' },
          hp: allyHp,
          block: 4,
          chakra: 2,
          maxChakra: 5,
          statuses: [{ key: 'burn', value: 2, duration: 2 }],
        },
        enemy: {
          ...person('enemy', 'Ronin'),
          intent: { type: 'attack', damage: 3, targetName: 'Scout', targetId: 1 },
          nextIntent: { type: 'attack', damage: 4, targetId: 2 },
        },
      },
    },
  };
}

const byTestId = id => `[data-testid="${id}"]`;
const get = id => cy.get(byTestId(id));
const fighterCard = id => get(id).find(byTestId('ninja-profile-card'));

describe('Co-op room (mocked HTTP)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/auth/me', {
      user: { id: 1, username: 'Scout' },
      profile: { language: 'en' },
    });
    cy.intercept('GET', '/api/player', { character: { id: 12, name: 'Scout' } });
    cy.intercept('GET', '/api/shop/balances', { balances: {} });
  });

  it('creates a room, polls until activation, and disables hand actions during the ally turn', () => {
    cy.intercept('POST', url, req => {
      expect(req.body).to.deep.equal({});
      req.reply(waiting);
    }).as('createRoom');
    let snapshot = waiting;
    cy.intercept('GET', `${url}/${waiting.room.id}`, req => req.reply(snapshot)).as('poll');
    cy.intercept('POST', `${url}/${waiting.room.id}/action`, req => {
      expect(req.body.type).to.equal('end_turn');
      snapshot = active({ revision: 3, activePlayerId: 2 });
      req.reply(snapshot);
    }).as('endTurn');

    cy.visit('/coop');
    get('coop-create').click();
    cy.wait('@createRoom');
    get('coop-code')
      .should('have.text', 'ABCD')
      .then(() => {
        snapshot = active();
      });
    cy.wait('@poll');
    get('combat-arena').find(byTestId('ninja-profile-card')).should('have.length', 3);
    fighterCard('player-status').within(() => {
      cy.root().should('have.attr', 'data-variant', 'ninja');
      cy.root().should('have.attr', 'data-avatar-id', 'genin-1-2');
      get('ninja-card-nickname').should('have.text', 'Rising Shinobi');
      get('ninja-card-arts')
        .find(byTestId('ninja-card-art-taijutsu'))
        .should('contain.text', 'Taijutsu')
        .and('contain.text', '7');
      get('combat-fighter-chain').should('be.visible');
    });
    fighterCard('enemy-display').within(() => {
      cy.root().should('have.attr', 'data-variant', 'enemy');
      get('ninja-card-hp').should('have.text', '30/30');
      get('ninja-card-armor').should('have.text', '0');
      for (const id of ['ninja-card-arts', 'ninja-card-nickname', 'ninja-card-chakra']) {
        get(id).should('not.exist');
      }
      cy.get('.ninja-card__rank').should('not.exist');
      get('enemy-intent').should('contain.text', 'Target: Scout');
      get('enemy-next-intent').should('contain.text', 'Target: Medic');
    });
    fighterCard('coop-ally').within(() => {
      cy.root().should('have.attr', 'data-variant', 'ninja');
      cy.root().should('have.attr', 'data-avatar-id', 'aspirant-2-5');
      cy.root().should('contain.text', 'Medic');
      get('ninja-card-chakra').should('have.text', '2/5');
      get('ninja-card-armor').should('have.text', '4');
      get('combat-fighter-statuses')
        .children()
        .should('have.length', 1)
        .and('contain.text', 'Burn');
    });
    get('coop-ally').find('[data-testid^="hand-card-"]').should('not.exist');
    cy.get('#combat-header-tools').find('[data-testid="combat-header-log-trigger"]').click();
    get('combat-header-log-panel').should('be.visible').trigger('keydown', { key: 'Escape' });
    get('combat-header-log-panel').should('not.be.visible');
    get('end-turn-btn').click();
    cy.wait('@endTurn');
    get('end-turn-btn').should('be.disabled');
    get('combat-arena').should('contain.text', 'Ally’s turn');
  });

  it('does not submit damage on cancel and only retries server-gated actions after confirmation', () => {
    const hand = [card('Strike', { damage: 5 }), card('Ward', { block: 3 })];
    let snapshot = active({ hand });
    const sent = [];
    cy.intercept('POST', `${url}/join`, req => {
      expect(req.body).to.deep.equal({ code: 'ABCD' });
      req.reply(snapshot);
    }).as('joinRoom');
    cy.intercept('GET', `${url}/${waiting.room.id}`, req => req.reply(snapshot));
    cy.intercept('POST', `${url}/${waiting.room.id}/action`, req => {
      sent.push(req.body);
      if (!req.body.confirmedFriendlyFire) {
        req.reply({
          statusCode: 400,
          body: { code: 'FRIENDLY_FIRE_CONFIRMATION', error: 'Confirm' },
        });
        return;
      }
      snapshot = active({ revision: 3, hand: [], allyHp: 25 });
      req.reply(snapshot);
    }).as('playCard');

    cy.visit('/coop');
    get('coop-code-input').type('abcd');
    get('coop-join').click();
    cy.wait('@joinRoom');
    get('hand-card-Strike').click();
    get('play-on-ally-btn').click();
    cy.get('dialog[open]').should('contain.text', 'Strike');
    cy.focused().should('contain.text', 'Cancel').click();
    cy.get('dialog[open]')
      .should('not.exist')
      .then(() => expect(sent).to.have.length(0));

    get('hand-card-Ward').click();
    get('play-on-ally-btn').click();
    cy.wait('@playCard').its('request.body').should('deep.equal', {
      type: 'play',
      target: 'ally',
      instanceId: 'Ward',
      revision: 2,
    });
    cy.get('dialog[open]').should('contain.text', 'Ward');
    get('coop-confirm-friendly-fire').click();
    cy.wait('@playCard').its('request.body').should('deep.equal', {
      type: 'play',
      target: 'ally',
      instanceId: 'Ward',
      confirmedFriendlyFire: true,
      revision: 2,
    });
    fighterCard('coop-ally').find(byTestId('ninja-card-hp')).should('have.text', '25/30');
  });
});
