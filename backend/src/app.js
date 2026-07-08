import express from 'express';
import cors from 'cors';
import { formatZodError } from './utils/zodErrors.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import squadRouter from './routes/squad.js';
import clockRouter from './routes/clock.js';
import devRouter from './routes/dev.js';
import leagueRouter from './routes/league.js';
import operationRouter from './routes/operation.js';
import marketRouter from './routes/market.js';
import inventoryRouter from './routes/inventory.js';
import missionsRouter from './routes/missions.js';
import academyRouter from './routes/academy.js';
import bureauRouter from './routes/bureau.js';
import clanRouter from './routes/clan.js';
import matchesRouter from './routes/matches.js';
import playerMarketRouter from './routes/playerMarket.js';
import { attachUser } from './middleware/auth.js';

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(attachUser);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/squad', squadRouter);
app.use('/api/clock', clockRouter);
app.use('/api/dev', devRouter);
app.use('/api/league', leagueRouter);
app.use('/api/operation', operationRouter);
app.use('/api/market', marketRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/missions', missionsRouter);
app.use('/api/academy', academyRouter);
app.use('/api/bureau', bureauRouter);
app.use('/api/clan', clanRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/player-market', playerMarketRouter);

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
