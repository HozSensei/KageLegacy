import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import squadRouter from './routes/squad.js';
import clockRouter from './routes/clock.js';
import devRouter from './routes/dev.js';
import leagueRouter from './routes/league.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/squad', squadRouter);
app.use('/api/clock', clockRouter);
app.use('/api/dev', devRouter);
app.use('/api/league', leagueRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.statusCode || (err.name === 'ZodError' ? 400 : 500);
  res.status(status).json({
    error: err.message || 'Erreur interne du serveur',
    details: err.errors || undefined,
  });
});

export default app;
