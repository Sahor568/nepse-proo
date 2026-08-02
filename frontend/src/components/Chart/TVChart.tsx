import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createChart, ColorType, CrosshairMode, Time, IChartApi, ISeriesApi, CandlestickData, WhitespaceData, LineStyle, LineWidth } from 'lightweight-charts';
import { Settings, Maximize2, BarChart2, TrendingUp, X, ChevronDown, Search, Loader2, Play, Sliders, Trash2 } from 'lucide-react';
import { NEPSE_BASE } from '../../apiConfig';

/* ─── Advanced Indicator Math ──────────────────────────────────── */

const calcSMA = (data: any[], period: number) =>
  data.map((d, i) => {
    if (i < period - 1) return null;
    const avg = data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0) / period;
    return { time: d.time, value: +avg.toFixed(2) };
  }).filter(Boolean);

const calcEMA = (data: any[], period: number) => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, x) => s + x.close, 0) / period;
  return data.slice(period - 1).map((d, i) => {
    if (i === 0) return { time: d.time, value: +ema.toFixed(2) };
    ema = d.close * k + ema * (1 - k);
    return { time: d.time, value: +ema.toFixed(2) };
  });
};

const calcRSI = (data: any[], period = 14) => {
  if (data.length <= period) return [];
  const rsi = [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push({ time: data[i].time, value: +(100 - 100 / (1 + rs)).toFixed(2) });
  }
  return rsi;
};

const calcMACD = (data: any[], fast = 12, slow = 26, signal = 9) => {
  const fastEMA = calcEMA(data, fast);
  const slowEMA = calcEMA(data, slow);
  const macdLine: any[] = [];
  
  slowEMA.forEach(s => {
    const f = fastEMA.find(x => x.time === s.time);
    if (f) macdLine.push({ time: s.time, value: +(f.value - s.value).toFixed(2) });
  });

  const signalLine = calcEMA(macdLine.map(m => ({ ...m, close: m.value })), signal);
  const histogram = signalLine.map(sig => {
    const m = macdLine.find(x => x.time === sig.time);
    return { time: sig.time, value: +(m.value - sig.value).toFixed(2) };
  });

  return { macd: macdLine, signal: signalLine, histogram };
};

const aggregateData = (data: any[], timeframe: string) => {
  if (timeframe === '1D') return data;
  const aggregated: any[] = [];
  let currentBucket: any = null;
  data.forEach(d => {
    const date = new Date(d.time);
    let bucketKey = timeframe === '1W' 
        ? new Date(date.setDate(date.getDate() - date.getDay() + 1)).toISOString().split('T')[0]
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    if (!currentBucket || currentBucket.time !== bucketKey) {
      if (currentBucket) aggregated.push(currentBucket);
      currentBucket = { time: bucketKey, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume };
    } else {
      currentBucket.high = Math.max(currentBucket.high, d.high);
      currentBucket.low = Math.min(currentBucket.low, d.low);
      currentBucket.close = d.close;
      currentBucket.volume += d.volume;
    }
  });
  if (currentBucket) aggregated.push(currentBucket);
  return aggregated;
};

/* ─── Static Data ──────────────────────────────────────────────── */

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'];

const TOOLS = [
  { id: 'cursor', label: 'Cursor', icon: '↗' },
  { id: 'trendline', label: 'Trendline', icon: '/' },
  { id: 'hline', label: 'Horiz. Line', icon: '—' },
  { id: 'vline', label: 'Vert. Line', icon: '|' },
];

/* ─── Component ────────────────────────────────────────────────── */

const TVChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const location = useLocation();
  const [symbol, setSymbol] = useState(() => new URLSearchParams(location.search).get('symbol') || localStorage.getItem('tvchart_symbol') || 'NABIL');
  const [timeframe, setTimeframe] = useState(() => localStorage.getItem('tvchart_timeframe') || '1D');
  const [securities, setSecurities] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [ohlc, setOhlc] = useState<any>(null);
  
  // Advanced Indicator State
  const [activeIndicators, setActiveIndicators] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('tvchart_indicators');
      return saved ? JSON.parse(saved) : [
        { id: 'vol', type: 'Volume', params: { color: '#26a69a' } },
        { id: 'sma_1', type: 'SMA', params: { period: 20, color: '#fdd835' } }
      ];
    } catch {
      return [];
    }
  });
  const [showIndPicker, setShowIndPicker] = useState(false);
  const [editingInd, setEditingInd] = useState<any>(null);

  // Sync to local storage
  useEffect(() => { localStorage.setItem('tvchart_symbol', symbol); }, [symbol]);
  useEffect(() => { localStorage.setItem('tvchart_timeframe', timeframe); }, [timeframe]);
  useEffect(() => { localStorage.setItem('tvchart_indicators', JSON.stringify(activeIndicators)); }, [activeIndicators]);

  useEffect(() => {
    fetch(`${NEPSE_BASE}/securities`).then(res => res.json()).then(data => setSecurities(data || []));
  }, []);

  const candleSeriesRef = useRef<any>(null);

  const buildChart = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true);
    try {
      let data: any[] = [];
      const isIntraday = ['1m', '5m', '15m', '1h', '4h'].includes(timeframe);
      
      if (isIntraday) {
        const resp = await fetch(`${NEPSE_BASE}/intraday/${symbol}`);
        const raw = await resp.json();
        
        let intervalSecs = 60; // 1m
        if (timeframe === '5m') intervalSecs = 300;
        else if (timeframe === '15m') intervalSecs = 900;
        else if (timeframe === '1h') intervalSecs = 3600;
        else if (timeframe === '4h') intervalSecs = 14400;

        const buckets: Record<number, any> = {};
        (raw || []).forEach((p: any) => {
            const t = p.time; // NEPSE timestamp is UNIX seconds
            const bucketKey = Math.floor(t / intervalSecs) * intervalSecs;
            
            if (!buckets[bucketKey]) {
                buckets[bucketKey] = {
                    time: bucketKey as Time,
                    open: p.contractRate,
                    high: p.contractRate,
                    low: p.contractRate,
                    close: p.contractRate,
                    volume: p.contractQuantity || 0,
                    firstT: t,
                    lastT: t
                };
            } else {
                const b = buckets[bucketKey];
                b.high = Math.max(b.high, p.contractRate);
                b.low = Math.min(b.low, p.contractRate);
                b.volume += (p.contractQuantity || 0);
                
                if (t < b.firstT) { b.firstT = t; b.open = p.contractRate; }
                if (t >= b.lastT) { b.lastT = t; b.close = p.contractRate; }
            }
        });
        
        data = Object.values(buckets).sort((a: any, b: any) => (a.time as number) - (b.time as number));
      } else {
        // Fetch historical data AND today's raw trades at the same time to prevent the "1 day late" API delay! 
        const [histResp, liveResp] = await Promise.all([
           fetch(`${NEPSE_BASE}/history/${symbol}`),
           fetch(`${NEPSE_BASE}/intraday/${symbol}`)
        ]);
        const hist = await histResp.json();
        const live = await liveResp.json();
        
        const aggregated = aggregateData(Array.isArray(hist) ? hist : [], timeframe);
        
        // Build today's live candle from intraday data
        if (Array.isArray(live) && live.length > 0) {
           let todayOpen = live[0].contractRate;
           let todayHigh = live[0].contractRate;
           let todayLow = live[0].contractRate;
           let todayClose = live[live.length - 1].contractRate;
           let todayVol = 0;
           
           live.forEach((p: any) => {
              todayHigh = Math.max(todayHigh, p.contractRate);
              todayLow = Math.min(todayLow, p.contractRate);
              todayVol += (p.contractQuantity || 0);
           });
           
           // Nepse intraday time is in Unix. We need today's YYYY-MM-DD in Nepal timezone (UTC+5:45).
           const nepalOffsetMs = (5 * 60 + 45) * 60 * 1000;
           const todayDate = new Date(Date.now() + nepalOffsetMs).toISOString().split('T')[0];
           
           // Overwrite or append the candle for the live day
           const lastCandle = aggregated[aggregated.length - 1];
           if (lastCandle && lastCandle.time === todayDate) {
              lastCandle.high = Math.max(lastCandle.high, todayHigh);
              lastCandle.low = Math.min(lastCandle.low, todayLow);
              lastCandle.close = todayClose;
              lastCandle.volume = Math.max(lastCandle.volume, todayVol);
           } else {
              aggregated.push({
                 time: todayDate,
                 open: todayOpen,
                 high: todayHigh,
                 low: todayLow,
                 close: todayClose,
                 volume: todayVol
              });
           }
        }
        
        data = aggregated;
      }
      if (!data.length) { setLoading(false); return; }

      if (chartRef.current) chartRef.current.remove();
      const chart = createChart(containerRef.current, {
        layout: { background: { type: ColorType.Solid, color: '#131722' }, textColor: '#d1d4dc', fontFamily: 'Inter' },
        grid: { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#2a2e39', scaleMargins: { top: 0.1, bottom: 0.3 } },
        timeScale: { borderColor: '#2a2e39', timeVisible: isIntraday },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      chartRef.current = chart;

      const candleSeries = chart.addCandlestickSeries({ upColor: '#089981', downColor: '#f23645', borderVisible: false, wickUpColor: '#089981', wickDownColor: '#f23645' });
      candleSeries.setData(data);
      candleSeriesRef.current = candleSeries;

      // Render Dynamic Indicators
      activeIndicators.forEach(ind => {
        if (ind.type === 'Volume') {
          const vol = chart.addHistogramSeries({ priceScaleId: 'v', color: ind.params.color });
          vol.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
          vol.setData(data.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(8,153,129,0.3)' : 'rgba(242,54,69,0.3)' })));
        } else if (ind.type === 'SMA') {
          chart.addLineSeries({ color: ind.params.color, lineWidth: 1 as LineWidth, priceLineVisible: false }).setData(calcSMA(data, ind.params.period) as any);
        } else if (ind.type === 'EMA') {
          chart.addLineSeries({ color: ind.params.color, lineWidth: 1 as LineWidth, priceLineVisible: false }).setData(calcEMA(data, ind.params.period) as any);
        } else if (ind.type === 'RSI') {
            const rsi = chart.addLineSeries({ color: ind.params.color, lineWidth: 2 as LineWidth, priceScaleId: 'rsi' });
            rsi.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0.05 }, borderVisible: true });
            rsi.setData(calcRSI(data, ind.params.period) as any);
            chart.addLineSeries({ color: 'rgba(255,255,255,0.1)', lineWidth: 1 as LineWidth, lineStyle: LineStyle.Dashed, priceScaleId: 'rsi', priceLineVisible: false }).setData(data.map(d => ({ time: d.time, value: 70 })));
            chart.addLineSeries({ color: 'rgba(255,255,255,0.1)', lineWidth: 1 as LineWidth, lineStyle: LineStyle.Dashed, priceScaleId: 'rsi', priceLineVisible: false }).setData(data.map(d => ({ time: d.time, value: 30 })));
        } else if (ind.type === 'MACD') {
            const res = calcMACD(data, ind.params.fast, ind.params.slow, ind.params.signal);
            const mLine = chart.addLineSeries({ color: '#2196f3', lineWidth: 1 as LineWidth, priceScaleId: 'macd' });
            const sLine = chart.addLineSeries({ color: '#ff9800', lineWidth: 1 as LineWidth, priceScaleId: 'macd' });
            const hist = chart.addHistogramSeries({ priceScaleId: 'macd' });
            mLine.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
            mLine.setData(res.macd as any);
            sLine.setData(res.signal as any);
            hist.setData(res.histogram.map(h => ({ ...h, color: h.value >= 0 ? 'rgba(8,153,129,0.3)' : 'rgba(242,54,69,0.3)' })));
        }
      });

      chart.subscribeCrosshairMove(p => p.time && p.seriesData.get(candleSeries) && setOhlc({...p.seriesData.get(candleSeries), time: p.time }));
      chart.timeScale().fitContent();
      const resize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
        }
      };
      window.addEventListener('resize', resize);
      setLoading(false);
      return () => window.removeEventListener('resize', resize);
    } catch { setLoading(false); }
  }, [symbol, timeframe, activeIndicators]);

  useEffect(() => { buildChart(); }, [buildChart]);

  // Real-time chart polling logic
  useEffect(() => {
    let interval = setInterval(async () => {
      if (!candleSeriesRef.current || !chartRef.current) return;
      try {
        const isIntraday = ['1m', '5m', '15m', '1h', '4h'].includes(timeframe);
        if (isIntraday) {
          const resp = await fetch(`${NEPSE_BASE}/intraday/${symbol}`);
          const raw = await resp.json();
          if (raw && raw.length > 0) {
            const last = raw.sort((a: any, b: any) => (a.time as number) - (b.time as number));
            const latestNode = last[last.length - 1];
            candleSeriesRef.current.update({
              time: latestNode.time as Time,
              open: latestNode.contractRate,
              high: latestNode.contractRate,
              low: latestNode.contractRate,
              close: latestNode.contractRate,
              volume: latestNode.contractQuantity || 0
            });
          }
        }
      } catch (e) {
        // fail silently to prevent console spam
      }
    }, 5000); // Polling every 5 seconds for Real-Time "Advanced" Feel
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  const addIndicator = (type: string) => {
    const id = Date.now().toString();
    const defaultParams: any = {
      SMA: { period: 9, color: '#fdd835' },
      EMA: { period: 21, color: '#e91e63' },
      RSI: { period: 14, color: '#9c27b0' },
      MACD: { fast: 12, slow: 26, signal: 9 },
    };
    setActiveIndicators([...activeIndicators, { id, type, params: defaultParams[type] }]);
    setShowIndPicker(false);
  };

  const updateInd = (id: string, params: any) => {
    setActiveIndicators(activeIndicators.map(i => i.id === id ? { ...i, params } : i));
  };

  const removeInd = (id: string) => {
    setActiveIndicators(activeIndicators.filter(i => i.id !== id));
  };

  const filtered = securities.filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || s.securityName.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);

  return (
    <div className="flex flex-col h-full bg-[#131722] relative overflow-hidden font-sans">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-[#2a2e39] bg-[#1e222d] z-50">
        <button onClick={() => setShowSearch(!showSearch)} className="flex items-center gap-2 px-3 py-1.5 bg-[#131722] border border-[#2a2e39] rounded text-white font-bold text-sm hover:border-blue-500/50 transition-colors">
          {symbol} <ChevronDown size={14} className="text-gray-500" />
        </button>
        {showSearch && (
          <div className="absolute top-12 left-4 w-72 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl p-2 z-[110] animate-fadeUp">
            <input autoFocus className="input mb-1 border-[#2a2e39]" placeholder="Search Scrip..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {filtered.map(s => (
              <div key={s.symbol} onClick={() => { setSymbol(s.symbol); setShowSearch(false); }} className="p-2.5 hover:bg-blue-600/10 cursor-pointer rounded flex justify-between items-center group">
                <span className="font-bold text-white group-hover:text-blue-400">{s.symbol}</span>
                <span className="text-[10px] text-gray-500">{s.securityName.slice(0, 22)}...</span>
              </div>
            ))}
          </div>
        )}

        <div className="h-6 w-px bg-[#2a2e39]" />

        <div className="flex bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
          {TIMEFRAMES.map((tf: string) => (
            <button key={tf} onClick={() => setTimeframe(tf)} className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all ${timeframe === tf ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{tf}</button>
          ))}
        </div>

        <button onClick={() => setShowIndPicker(!showIndPicker)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-colors ${showIndPicker ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}>
          <BarChart2 size={16} /> Indicators
        </button>

        {showIndPicker && (
          <div className="absolute top-12 left-[310px] w-60 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2 z-[110] animate-fadeUp">
             {['SMA', 'EMA', 'RSI', 'MACD'].map((type: string) => (
               <button key={type} onClick={() => addIndicator(type)} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-xs font-bold text-gray-200 flex items-center justify-between group">
                  {type} <Play size={10} className="text-gray-600 group-hover:text-blue-500" />
               </button>
             ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
            {loading && <Loader2 className="animate-spin text-blue-500" size={16} />}
            <button className="p-2 text-gray-500 hover:text-white"><Settings size={18} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Indicators Overlay */}
        <div className="absolute top-16 left-16 z-40 space-y-2 pointer-events-none">
           {activeIndicators.map(ind => (
             <div key={ind.id} className="flex items-center gap-2 bg-[#1e222d]/80 backdrop-blur-md px-2 py-1 rounded border border-white/5 pointer-events-auto group">
                <span className="text-[10px] font-bold text-gray-400">{ind.type} {ind.params.period || ''}</span>
                <button onClick={() => setEditingInd(ind)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-gray-500"><Sliders size={12} /></button>
                <button onClick={() => removeInd(ind.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-gray-500"><Trash2 size={12} /></button>
             </div>
           ))}
        </div>

        {/* Legend */}
        {ohlc && (
          <div className="absolute top-14 left-16 z-40 bg-[#131722]/90 px-3 py-2 rounded-lg border border-white/10 flex gap-4 text-[11px] font-bold pointer-events-none shadow-xl">
             <span className="text-blue-500">{symbol}</span>
             <span className="text-gray-500">O <span className={ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}>{ohlc.open}</span></span>
             <span className="text-gray-500">H <span className={ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}>{ohlc.high}</span></span>
             <span className="text-gray-500">L <span className={ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}>{ohlc.low}</span></span>
             <span className="text-gray-500">C <span className={ohlc.close >= ohlc.open ? 'text-green-500' : 'text-red-500'}>{ohlc.close}</span></span>
          </div>
        )}

        {editingInd && (
          <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-sm shadow-2xl">
               <div className="p-4 border-b border-[#2a2e39] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">{editingInd.type} Settings</h3>
                  <button onClick={() => setEditingInd(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
               </div>
               <div className="p-6 space-y-4">
                  {Object.entries(editingInd.params).map(([key, val]: any) => (
                    <div key={key}>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">{key}</label>
                      <input type={typeof val === 'number' ? 'number' : 'text'} className="input" value={val} onChange={(e) => updateInd(editingInd.id, { ...editingInd.params, [key]: typeof val === 'number' ? +e.target.value : e.target.value })} />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        <div className="w-12 border-r border-[#2a2e39] flex flex-col items-center py-4 bg-[#1e222d]">
          {TOOLS.map((t: any) => <button key={t.id} className="p-2 text-gray-500 hover:text-white">{t.icon}</button>)}
        </div>
        <div className="flex-1 relative"><div ref={containerRef} className="w-full h-full" /></div>
      </div>
    </div>
  );
};

export default TVChart;
