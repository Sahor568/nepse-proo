import { Router } from 'express';

const router = Router();

// Mock endpoint for market data
router.get('/history', (req, res) => {
  res.json({ message: 'Historical data stream here' });
});

router.get('/stocks', (req, res) => {
  res.json([
    { symbol: 'NABIL', ltp: 450, change: 2.5 },
    { symbol: 'NICA', ltp: 380, change: -1.2 },
  ]);
});

export default router;
