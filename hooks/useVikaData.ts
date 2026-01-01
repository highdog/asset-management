import { useState, useCallback, useEffect } from 'react';

const ASSETS_CACHE_KEY = 'vika_assets_cache';
const TRADES_CACHE_KEY = 'vika_trades_cache';
const COMPLETED_TRADES_CACHE_KEY = 'vika_completed_trades_cache';
const KLINE_CACHE_KEY = 'vika_kline_cache';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 小时

// 请求队列管理 - 限制并发请求数量和请求频率
const REQUEST_QUEUE: Array<() => Promise<any>> = [];
let ACTIVE_REQUESTS = 0;
const MAX_CONCURRENT_REQUESTS = 1; // 最多同时发送1个请求，严格控制频率
const REQUEST_DELAY = 600; // 请求间延迟600ms，避免触发频率限制
let LAST_REQUEST_TIME = 0;

function addToQueue(requestFn: () => Promise<any>): Promise<any> {
  return new Promise((resolve, reject) => {
    REQUEST_QUEUE.push(async () => {
      try {
        // 检查请求间延迟
        const timeSinceLastRequest = Date.now() - LAST_REQUEST_TIME;
        if (timeSinceLastRequest < REQUEST_DELAY) {
          await new Promise(r => setTimeout(r, REQUEST_DELAY - timeSinceLastRequest));
        }
        LAST_REQUEST_TIME = Date.now();
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
}

function processQueue() {
  while (ACTIVE_REQUESTS < MAX_CONCURRENT_REQUESTS && REQUEST_QUEUE.length > 0) {
    ACTIVE_REQUESTS++;
    const requestFn = REQUEST_QUEUE.shift();
    if (requestFn) {
      requestFn().finally(() => {
        ACTIVE_REQUESTS--;
        processQueue();
      });
    }
  }
}

interface CacheData<T> {
  data: T;
  timestamp: number;
}

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheDataObj = JSON.parse(cached) as CacheData<T>;
    const data: T = cacheDataObj.data;
    
    // 检查缓存是否过期
    if (Date.now() - cacheDataObj.timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取缓存数据失败:', error);
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('保存缓存数据失败:', error);
  }
}

export function useAssets() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async (forceRefresh = false) => {
    // 如果不强制刷新，先尝试使用缓存
    if (!forceRefresh) {
      const cached = getCachedData<any[]>(ASSETS_CACHE_KEY);
      if (cached) {
        setAssets(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const result = await addToQueue(async () => {
        const response = await fetch('/api/vika/assets');
        return response.json();
      });

      if (result.success) {
        setAssets(result.data);
        // 保存到本地缓存
        setCachedData(ASSETS_CACHE_KEY, result.data);
      } else {
        setError(result.error || '获取标的列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化时加载
  useEffect(() => {
    // 开发环境下清除缓存，确保获取最新数据
    try {
      localStorage.removeItem('vika_assets_cache');
    } catch (e) {
      // 忽略清除缓存的错误
    }
    fetchAssets();
  }, []);

  return { assets, loading, error, fetchAssets };
}

export function useTrades(selectedAsset: string) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async (forceRefresh = false) => {
    if (!selectedAsset) {
      setTrades([]);
      return;
    }

    // 如果不强制刷新，先尝试使用缓存
    if (!forceRefresh) {
      const cacheKey = `${TRADES_CACHE_KEY}_${selectedAsset}`;
      const cached = getCachedData<any[]>(cacheKey);
      if (cached) {
        setTrades(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const result = await addToQueue(async () => {
        const response = await fetch(`/api/vika/trades?asset=${encodeURIComponent(selectedAsset)}`);
        return response.json();
      });

      if (result.success) {
        setTrades(result.data);
        // 保存到本地缓存
        const cacheKey = `${TRADES_CACHE_KEY}_${selectedAsset}`;
        setCachedData(cacheKey, result.data);
      } else {
        setError(result.error || '获取交易记录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [selectedAsset]);

  // 初始化时加载
  useEffect(() => {
    fetchTrades();
  }, [selectedAsset]);

  return { trades, loading, error, fetchTrades };
}

export function useCompletedTrades(selectedAsset: string) {
  const [completedTrades, setCompletedTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletedTrades = useCallback(async (forceRefresh = false) => {
    if (!selectedAsset) {
      setCompletedTrades([]);
      return;
    }

    // 如果不强制刷新，先尝试使用缓存
    if (!forceRefresh) {
      const cacheKey = `${COMPLETED_TRADES_CACHE_KEY}_${selectedAsset}`;
      const cached = getCachedData<any[]>(cacheKey);
      if (cached) {
        setCompletedTrades(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const result = await addToQueue(async () => {
        const response = await fetch(`/api/vika/completed-trades?asset=${encodeURIComponent(selectedAsset)}`);
        return response.json();
      });

      if (result.success) {
        setCompletedTrades(result.data);
        // 保存到本地缓存
        const cacheKey = `${COMPLETED_TRADES_CACHE_KEY}_${selectedAsset}`;
        setCachedData(cacheKey, result.data);
      } else {
        setError(result.error || '获取已完成交易失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [selectedAsset]);

  // 初始化时加载
  useEffect(() => {
    fetchCompletedTrades();
  }, [selectedAsset]);

  return { completedTrades, loading, error, fetchCompletedTrades };
}

export function useKlineData(secid: string) {
  const [klineData, setKlineData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKline = useCallback(async (forceRefresh = false) => {
    if (!secid) {
      setKlineData(null);
      return;
    }

    // 如果不强制刷新，先尝试使用缓存
    if (!forceRefresh) {
      const cacheKey = `${KLINE_CACHE_KEY}_${secid}`;
      const cached = getCachedData<any>(cacheKey);
      if (cached) {
        setKlineData(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const result = await addToQueue(async () => {
        const response = await fetch(`/api/kline?secid=${encodeURIComponent(secid)}`);
        return response.json();
      });

      if (result.success) {
        setKlineData(result.data);
        // 保存到本地缓存
        const cacheKey = `${KLINE_CACHE_KEY}_${secid}`;
        setCachedData(cacheKey, result.data);
      } else {
        setError(result.error || '获取K线数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [secid]);

  // 初始化时加载
  useEffect(() => {
    if (secid) {
      fetchKline();
    }
  }, [secid, fetchKline]);

  return { klineData, loading, error, fetchKline };
}

// 为 AssetList 等直接调用 API 的地方提供的函数，自动使用请求队列
export async function fetchTradesWithQueue(asset: string): Promise<any> {
  return addToQueue(async () => {
    const response = await fetch(`/api/vika/trades?asset=${encodeURIComponent(asset)}`);
    return response.json();
  });
}

export function clearAllCache(): void {
  try {
    localStorage.removeItem(ASSETS_CACHE_KEY);
    localStorage.removeItem('vika_assets_cache'); // 也清除这个键
    // 清空所有交易记录缓存，但不清空K线缓存
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(TRADES_CACHE_KEY) || key.startsWith(COMPLETED_TRADES_CACHE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('清空缓存失败:', error);
  }
}

// 清空K线缓存（仅在显式刷新K线时调用）
export function clearKlineCache(secid?: string): void {
  try {
    if (secid) {
      // 清空特定证券的K线缓存
      localStorage.removeItem(`${KLINE_CACHE_KEY}_${secid}`);
    } else {
      // 清空所有K线缓存
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(KLINE_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('清空K线缓存失败:', error);
  }
}
