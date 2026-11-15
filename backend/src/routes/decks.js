import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  addCardToDeck,
  createDeck,
  deleteDeck,
  getActiveDeck,
  getDeck,
  getDeckPassiveBonuses,
  listDecks,
  removeCardFromDeck,
  replaceDeckCards,
  setActiveDeck,
  updateDeck,
  validateDeck,
  DECK_CONSTRAINTS,
} from '../services/deckService.js';
import { ensureStarterLoadout } from '../services/starterLoadoutService.js';

const router = Router();

/** GET /api/decks */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    await ensureStarterLoadout(user.id);
    const decks = await listDecks(user.id);
    res.json({
      decks,
      constraints: { ...DECK_CONSTRAINTS },
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/decks/active */
router.get('/active', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const deck = await getActiveDeck(user.id);
    res.json({ deck });
  } catch (error) {
    next(error);
  }
});

/** GET /api/decks/passive-bonuses — bridge Phase 1 stats */
router.get('/passive-bonuses', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const bonuses = await getDeckPassiveBonuses(user.id);
    res.json({ bonuses });
  } catch (error) {
    next(error);
  }
});

/** GET /api/decks/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const deck = await getDeck(user.id, Number(req.params.id));
    res.json({ deck });
  } catch (error) {
    next(error);
  }
});

/** POST /api/decks */
router.post('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const deck = await createDeck(user.id, {
      name: req.body?.name,
      archetype: req.body?.archetype,
      cards: req.body?.cards,
    });
    res.status(201).json({ deck });
  } catch (error) {
    next(error);
  }
});

/** PUT /api/decks/:id */
router.put('/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const deckId = Number(req.params.id);
    if (req.body?.cards) {
      await replaceDeckCards(user.id, deckId, req.body.cards);
    }
    const deck = await updateDeck(user.id, deckId, {
      name: req.body?.name,
      archetype: req.body?.archetype,
    });
    res.json({ deck });
  } catch (error) {
    next(error);
  }
});

/** POST /api/decks/:id/activate */
router.post('/:id/activate', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const deck = await setActiveDeck(user.id, Number(req.params.id));
    res.json({ deck });
  } catch (error) {
    next(error);
  }
});

/** POST /api/decks/:id/cards */
router.post('/:id/cards', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const collectionId = Number(req.body?.collectionId);
    const quantity = Number(req.body?.quantity) || 1;
    if (!collectionId) {
      return res.status(400).json({ error: 'collectionId requis.' });
    }
    const deck = await addCardToDeck(user.id, Number(req.params.id), collectionId, quantity);
    res.json({ deck });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/decks/:id/cards/:collectionId */
router.delete('/:id/cards/:collectionId', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const quantity = Number(req.query?.quantity) || 1;
    const deck = await removeCardFromDeck(
      user.id,
      Number(req.params.id),
      Number(req.params.collectionId),
      quantity,
    );
    res.json({ deck });
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/decks/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await deleteDeck(user.id, Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/decks/validate — dry-run validation */
router.post('/validate', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const cards = Array.isArray(req.body?.cards) ? req.body.cards : [];
    res.json({ validation: validateDeck(cards) });
  } catch (error) {
    next(error);
  }
});

export default router;
