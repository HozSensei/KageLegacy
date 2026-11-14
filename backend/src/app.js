import express from 'express';
import cors from 'cors';
import { formatZodError } from './utils/zodErrors.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import clockRouter from './routes/clock.js';
import playerRouter from './routes/player.js';
import cardsRouter from './routes/cards.js';
import collectionRouter from './routes/collection.js';
import decksRouter from './routes/decks.js';
import talentsRouter from './routes/talents.js';
import combatRouter from './routes/combat.js';
import combatMissionsRouter from './routes/combatMissions.js';
import battlePassRouter from './routes/battlePass.js';
import shopRouter from './routes/shop.js';
import { attachUser } from './middleware/auth.js';

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(attachUser);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/clock', clockRouter);
app.use('/api/player', playerRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/collection', collectionRouter);
app.use('/api/decks', decksRouter);
app.use('/api/talents', talentsRouter);
app.use('/api/combat', combatRouter);
app.use('/api/missions', combatMissionsRouter);
app.use('/api/battle-pass', battlePassRouter);
app.use('/api/shop', shopRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.statusCode || (err.name === 'ZodError' ? 400 : 500);
  const message =
    err.name === 'ZodError' ? formatZodError(err) : err.message || 'Erreur interne du serveur';
  res.status(status).json({
    error: message,
  });
});

export default app;
