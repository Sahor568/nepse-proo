import { Router } from 'express';
import type { Request, Response } from 'express';
import { Nepse } from '@rumess/nepse-api';

const router = Router();
const nepse = new Nepse();

// In-memory cache to avoid hammering the API
const cache: Record<string, { data: any; ts: number }> = {};
const TTL_MS = 5_000; // 5 seconds cache for advanced real-time feel

const cached = async <T>(key: string, fn: () => Promise<T>, ttlMs = TTL_MS): Promise<T> => {
  if (cache[key] && Date.now() - cache[key].ts < ttlMs) return cache[key].data as T;
  const data = await fn();
  cache[key] = { data, ts: Date.now() };
  return data;
};

// ─── NEPSE Index ───────────────────────────────────────────────────
router.get('/index', async (_: Request, res: Response) => {
  try {
    const data = await cached('nepseIndex', () => nepse.getNepseIndex(), 60_000);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Market Summary ────────────────────────────────────────────────
router.get('/summary', async (_: Request, res: Response) => {
  try {
    const data = await cached('summary', () => nepse.getMarketSummary());
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Market Status ─────────────────────────────────────────────────
router.get('/status', async (_: Request, res: Response) => {
  try {
    const data = await cached('status', () => nepse.getMarketStatus());
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Live Market (all traded securities today) ─────────────────────
router.get('/live', async (_: Request, res: Response) => {
  try {
    const data = await cached('live', async () => {
      const [gainers, losers, turnover] = await Promise.all([
        nepse.getTopTenGainers().catch(() => []),
        nepse.getTopTenLosers().catch(() => []),
        nepse.getTopTenTurnoverScrips().catch(() => [])
      ]);

      // Create turnover map for quick lookup
      const turnoverMap = new Map();
      (turnover || []).forEach((t: any) => {
        turnoverMap.set(t.symbol, {
          turnover: t.turnover || 0,
          closingPrice: t.closingPrice || t.ltp || 0,
          securityId: t.securityId
        });
      });

      // Combine gainers and losers
      const combined = new Map();
      (gainers || []).forEach((s: any) => {
        const tInfo = turnoverMap.get(s.symbol) || {};
        combined.set(s.symbol, {
          symbol: s.symbol,
          securityName: s.securityName,
          lastTradedPrice: s.ltp || s.closePrice || 0,
          percentageChange: s.percentageChange || 0,
          highPrice: s.highPrice || s.ltp || 0,
          lowPrice: s.lowPrice || s.ltp || 0,
          totalTradeQuantity: tInfo.turnover ? Math.round((tInfo.turnover / (tInfo.closingPrice || 1)) * 100) : 0,
          totalTradeValue: tInfo.turnover || 0,
          closePrice: tInfo.closingPrice || s.ltp || 0,
        });
      });
      (losers || []).forEach((s: any) => {
        if (combined.has(s.symbol)) return;
        const tInfo = turnoverMap.get(s.symbol) || {};
        combined.set(s.symbol, {
          symbol: s.symbol,
          securityName: s.securityName,
          lastTradedPrice: s.ltp || s.closePrice || 0,
          percentageChange: s.percentageChange || 0,
          highPrice: s.highPrice || s.ltp || 0,
          lowPrice: s.lowPrice || s.ltp || 0,
          totalTradeQuantity: tInfo.turnover ? Math.round((tInfo.turnover / (tInfo.closingPrice || 1)) * 100) : 0,
          totalTradeValue: tInfo.turnover || 0,
          closePrice: tInfo.closingPrice || s.ltp || 0,
        });
      });

// Add remaining turnover stocks
          (turnover || []).forEach((t: any) => {
            if (!combined.has(t.symbol)) {
              combined.set(t.symbol, {
                symbol: t.symbol,
                securityName: t.securityName || '',
                lastTradedPrice: t.closingPrice || t.ltp || 0,
                percentageChange: 0,
                highPrice: t.closingPrice || 0,
                lowPrice: t.closingPrice || 0,
                totalTradeQuantity: t.turnover ? Math.round(t.turnover / (t.closingPrice || 1)) : 0,
                totalTradeValue: t.turnover || 0,
                closePrice: t.closingPrice || 0,
              });
            }
          });

      return Array.from(combined.values());
    });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Today's Prices (Last Closing Prices) ──────────────────────────
router.get('/today-price', async (_: Request, res: Response) => {
  try {
    const status = await cached('status', () => nepse.getMarketStatus());
    const dateStr = status.asOf ? status.asOf.split('T')[0] : '';
    const raw: any = await cached(`today-price-${dateStr}`, () => nepse.requestGETAPI(`/api/nots/nepse-data/today-price?&size=500&securityId=&indexDate=${dateStr}`));
    res.json(raw?.content || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Top Gainers ───────────────────────────────────────────────────
router.get('/gainers', async (_: Request, res: Response) => {
  try {
    const data = await cached('gainers', () => nepse.getTopTenGainers());
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Top Losers ────────────────────────────────────────────────────
router.get('/losers', async (_: Request, res: Response) => {
  try {
    const data = await cached('losers', () => nepse.getTopTenLosers());
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Top Turnover ──────────────────────────────────────────────────
router.get('/turnover', async (_: Request, res: Response) => {
  try {
    const data = await cached('turnover', () => nepse.getTopTenTurnoverScrips());
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Sub-Indices ───────────────────────────────────────────────────
router.get('/sub-indices', async (_: Request, res: Response) => {
  try {
    const data = await cached('sub-indices', () => nepse.getNepseSubIndices());
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── NEPSE Index Daily Graph (for NEPSE chart) ─────────────────────
router.get('/index-graph', async (_: Request, res: Response) => {
  try {
    const data = await cached('index-graph', () => nepse.getNepseIndexDailyGraph());
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Security Price/Volume History (OHLCV for any stock) ──────────
// GET /api/nepse/history/:symbol
router.get('/history/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  try {
    const securityId = (await nepse.getSecuritySymbolIdKeymap()).get(String(symbol).toUpperCase());
    if (!securityId) throw new Error(`Security symbol ${symbol} not found`);
    const raw: any = await cached(`history-${symbol}`, () => nepse.requestGETAPI(`/api/nots/market/security/price/${securityId}?size=5000`));
    const ohlcv = (raw.content as any[])
      .map((d: any) => ({
        time: d.businessDate,           // 'YYYY-MM-DD'
        open:  d.openPrice ?? d.lastTradedPrice ?? d.previousDayClosePrice,
        high:  d.highPrice ?? d.lastTradedPrice ?? d.previousDayClosePrice,
        low:   d.lowPrice ?? d.lastTradedPrice ?? d.previousDayClosePrice,
        close: d.closePrice ?? d.lastTradedPrice ?? d.previousDayClosePrice,
        volume: d.totalTradedQuantity ?? 0,
        turnover: d.totalTradedValue ?? 0,
        trades: d.totalTrades ?? 0,
        ltp: d.lastTradedPrice,
        prevClose: d.previousDayClosePrice,
        fiftyTwoWeekHigh: d.fiftyTwoWeekHigh,
        fiftyTwoWeekLow:  d.fiftyTwoWeekLow,
      }))
      .reverse(); // oldest first for charts
    res.json(ohlcv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Security Intraday Graph ───────────────────────────────────────
router.get('/intraday/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  try {
    const raw = await cached(`intraday-${symbol}`, () => nepse.getSecurityDailyGraph(String(symbol).toUpperCase()));
    res.json(raw);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Security List ─────────────────────────────────────────────────
router.get('/securities', async (_: Request, res: Response) => {
  try {
    const raw = await cached('securities', () => nepse.getSecurityList());
    res.json(raw);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
