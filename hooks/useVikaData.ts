import { useState, useCallback, useEffect } from 'react';

const ASSETS_CACHE_KEY = 'vika_assets_cache';
const TRADES_CACHE_KEY = 'vika_trades_cache';
const COMPLETED_TRADES_CACHE_KEY = 'vika_completed_trades_cache';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 小时

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
      const response = await fetch('/api/vika/assets');
      const result = await response.json();

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
      const response = await fetch(`/api/vika/trades?asset=${encodeURIComponent(selectedAsset)}`);
      const result = await response.json();

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
      const response = await fetch(`/api/vika/completed-trades?asset=${encodeURIComponent(selectedAsset)}`);
      const result = await response.json();

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

// 清空所有缓存
export function clearAllCache(): void {
  try {
    localStorage.removeItem(ASSETS_CACHE_KEY);
    // 清空所有交易记录缓存
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
