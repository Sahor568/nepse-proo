import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import authRoutes from './routes/authRoutes.js';
import nepseRoutes from './routes/nepseRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { initDb } from './db.js';
import passport from 'passport';

dotenv.config();

initDb().then(() => console.log('📁 Database Initialized')).catch(console.error);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(session({
  secret: process.env.JWT_SECRET || 'nepse_pro_jwt_super_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/nepse', nepseRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`✅ NEPSE API Server running on port ${PORT}`));
