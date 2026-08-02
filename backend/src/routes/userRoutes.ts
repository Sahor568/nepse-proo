import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db.js';
import { PortfolioService } from '../services/portfolioService.js';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';

const router = Router();

// Apply real JWT auth to all /api/user routes
router.use(authMiddleware);

// ─── Trading & Cash Balance ────────────────────────────────────────────────────
router.get('/cash-balance', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const service = new PortfolioService(db);
    const cashBalance = await service.getCashBalance(userId);
    res.json({ cashBalance });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/cash-balance', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ error: 'Valid positive amount is required.' });
    }
    const db = await getDb();
    const service = new PortfolioService(db);
    await service.setCashBalance(userId, amount);
    res.json({ cashBalance: amount });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const service = new PortfolioService(db);
    const transactions = await service.getTransactions(userId);
    res.json(transactions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/trade-quote', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, quantity, price, type } = req.body;
    
    if (!symbol || !quantity || !price || !type) {
      return res.status(400).json({ error: 'symbol, quantity, price, and type are required.' });
    }
    
    if (!['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ error: 'type must be BUY or SELL.' });
    }
    
    const db = await getDb();
    const service = new PortfolioService(db);
    const userId = req.userId as number;
    const quote = await service.getTradeQuote(
      userId,
      symbol,
      quantity,
      price,
      type
    );
    res.json(quote);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/trade', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, quantity, price, type } = req.body;
    
    if (!symbol || !quantity || !price || !type) {
      return res.status(400).json({ error: 'symbol, quantity, price, and type are required.' });
    }
    
    if (!['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ error: 'type must be BUY or SELL.' });
    }
    
    const db = await getDb();
    const service = new PortfolioService(db);
    const userId = req.userId as number;
    const transaction = await service.executeTrade(
      userId,
      symbol,
      quantity,
      price,
      type
    );
    res.status(201).json(transaction);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/holdings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const service = new PortfolioService(db);
    const holdings = await service.getHoldings(userId);
    res.json(holdings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/portfolio-summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const service = new PortfolioService(db);
    const summary = await service.getPortfolioSummary(userId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/realized-pl', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const service = new PortfolioService(db);
    const realizedMetrics = await service.getRealizedMetrics(userId);
    res.json(realizedMetrics);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Watchlist ────────────────────────────────────────────────────────────────
router.get('/watchlist', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const watchlist = await db.all('SELECT * FROM watchlist WHERE user_id = ?', [userId]);
    res.json(watchlist);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/watchlist', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required.' });

    const userId = req.userId as number;
    const db = await getDb();
    const existing = await db.get(
      'SELECT * FROM watchlist WHERE user_id = ? AND symbol = ?',
      [userId, symbol.toUpperCase()]
    );
    if (existing) return res.status(409).json({ error: 'Symbol already in watchlist.' });

    const result = await db.run(
      'INSERT INTO watchlist (user_id, symbol) VALUES (?, ?)',
      [userId, symbol.toUpperCase()]
    );
    res.status(201).json({ id: result.lastID, symbol: symbol.toUpperCase() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/watchlist/:symbol', async (req: AuthRequest, res: Response) => {
  try {
    const symbol = req.params.symbol as string;
    const userId = req.userId as number;
    const db = await getDb();
    await db.run(
      'DELETE FROM watchlist WHERE user_id = ? AND symbol = ?',
      [userId, symbol.toUpperCase()]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Portfolio ────────────────────────────────────────────────────────────────
router.get('/portfolio', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const portfolio = await db.all(
      'SELECT * FROM portfolio WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
    res.json(portfolio);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/portfolio', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, quantity, buy_price, buy_date, reference, name } = req.body;
    if (!symbol || !quantity || !buy_price) {
      return res.status(400).json({ error: 'symbol, quantity and buy_price are required.' });
    }
    const userId = req.userId as number;
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO portfolio (user_id, symbol, name, quantity, buy_price, buy_date, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, symbol.toUpperCase(), name || '', quantity, buy_price, buy_date || new Date().toISOString().split('T')[0], reference || '']
    );
    res.status(201).json({ id: result.lastID, symbol, quantity, buy_price, buy_date, reference });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/portfolio/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, buy_price, buy_date, reference, name } = req.body;
    const userId = req.userId as number;
    const db = await getDb();
    const entry = await db.get(
      'SELECT id FROM portfolio WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!entry) return res.status(404).json({ error: 'Portfolio entry not found.' });

    await db.run(
      'UPDATE portfolio SET quantity = ?, buy_price = ?, buy_date = ?, reference = ?, name = ? WHERE id = ? AND user_id = ?',
      [quantity, buy_price, buy_date, reference || '', name || '', id, userId]
    );
    res.json({ success: true, id, quantity, buy_price, buy_date, reference });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/portfolio/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId as number;
    const db = await getDb();
    await db.run(
      'DELETE FROM portfolio WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── User Profile ─────────────────────────────────────────────────────────────
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const db = await getDb();
    const user = await db.get(
      'SELECT id, name, email, mobile, bio FROM users WHERE id = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, mobile, bio } = req.body;
    const db = await getDb();

    // Check if new email is taken by someone else
    if (email) {
      const conflict = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.toLowerCase().trim(), req.userId]
      );
      if (conflict) return res.status(409).json({ error: 'Email is already in use.' });
    }

    await db.run(
      'UPDATE users SET name = ?, email = ?, mobile = ?, bio = ? WHERE id = ?',
      [name, email?.toLowerCase().trim(), mobile || '', bio || '', req.userId]
    );
    const user = await db.get(
      'SELECT id, name, email, mobile, bio FROM users WHERE id = ?',
      [req.userId]
    );
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/password', async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const db = await getDb();
    const user = await db.get('SELECT password FROM users WHERE id = ?', [req.userId]);

    let isMatch = false;
    if (user.password?.startsWith('$2')) {
      isMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
      isMatch = user.password === currentPassword;
    }

    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, req.userId]);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
