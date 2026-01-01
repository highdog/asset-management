'use client';

import { useState, useEffect } from 'react';
import { useAssets, useTrades, fetchTradesWithQueue, useKlineData } from '@/hooks/useVikaData';

type TabType = '全览' | '股票' | '债券' | '理财' | '商品';

interface AssetListProps {
  activeTab: TabType;
  selectedAsset: string;
  onSelectAsset: (asset: string) => void;
}

interface Asset {
  recordId: string;
  标的名称: string;
  标的代码: string;
  当前价格?: string | number;
  类型?: string; // 添加类型字段
  持有金额?: number; // 添加持有金额
  比例?: number; // 添加比例
}

export default function AssetList({ activeTab, selectedAsset, onSelectAsset }: AssetListProps) {
  const { assets, loading, error, fetchAssets } = useAssets();
  // 为了获取持仓成本，我们需要计算每个标的的持仓成本
  // 这里我们创建一个状态来存储每个标的的持仓成本
  const [costPrices, setCostPrices] = useState<{ [key: string]: number }>({});
  const [assetTradesData, setAssetTradesData] = useState<{ [key: string]: any[] }>({});
  // 添加展开/收起状态
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  // 添加东财最新价格存储
  const [eastmoneyPrices, setEastmoneyPrices] = useState<{ [key: string]: number | null }>({});
  // 为每个标的获取交易数据并计算持仓成本
  useEffect(() => {
    const calculateCostPrices = async () => {
      const newCostPrices: { [key: string]: number } = {};
      
      for (const asset of assets) {
        // \u4f7f\u7528\u8bf7\u6c42\u961f\u5217\u7ba1\u7406\u7684 fetchTradesWithQueue \u51fd\u6570\uff0c\u9650\u5236\u8bf7\u6c42\u9891\u7387
        try {
          const result = await fetchTradesWithQueue(asset.\u6807\u7684\u540d\u79f0);
          
          if (result.success && result.data) {
            const trades = result.data;
            // 计算平均持仓成本
            let totalCost = 0;
            let totalQuantity = 0;
            
            trades.forEach((trade: any) => {
              if (trade.买入日期 && trade.买入金额 > 0 && trade.买入数量 > 0) {
                totalCost += trade.买入金额;
                totalQuantity += trade.买入数量;
              }
            });
            
            if (totalQuantity > 0) {
              newCostPrices[asset.标的名称] = totalCost / totalQuantity;
            }
          }
        } catch (err) {
          console.error(`获取 ${asset.标的名称} 的交易数据失败:`, err);
        }
      }
      
      setCostPrices(newCostPrices);
    };
    
    if (assets.length > 0) {
      calculateCostPrices();
    }
  }, [assets]);

  const handleRefresh = async () => {
    // 清除缓存后刷新
    try {
      localStorage.removeItem('vika_assets_cache');
    } catch (e) {
      // 忽略清除缓存的错误
    }
    await fetchAssets(true); // 强制刷新
  };

  // 切换分组的展开/收起状态
  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // 获取每个标的的东财最新价格
  useEffect(() => {
    const getEastmoneyPrices = async () => {
      const newPrices: { [key: string]: number | null } = {};
      
      for (const asset of assets) {
        try {
          if (asset['东财证券ID']) {
            const response = await fetch(`/api/kline?secid=${asset['东财证券ID']}&lmt=1`);
            const data = await response.json();
            
            if (data.success && data.data.klines && data.data.klines.length > 0) {
              const latestKline = data.data.klines[data.data.klines.length - 1];
              newPrices[asset.标的名称] = latestKline.close;
            } else {
              newPrices[asset.标的名称] = null;
            }
          } else {
            newPrices[asset.标的名称] = null;
          }
        } catch (err) {
          console.error(`获取 ${asset.标的名称} 的东财价格失败:`, err);
          newPrices[asset.标的名称] = null;
        }
      }
      
      setEastmoneyPrices(newPrices);
    };
    
    if (assets.length > 0) {
      getEastmoneyPrices();
    }
  }, [assets]);
  // 计算显示的百分比
  const getPercentage = (asset: Asset): string | null => {
    const eastmoneyPrice = eastmoneyPrices[asset.标的名称];
    const currentPrice = eastmoneyPrice || (asset.当前价格 ? Number(asset.当前价格) : null);
    const costPrice = costPrices[asset.标的名称];
    
    if (!currentPrice || !costPrice) return null;
    
    const ratio = (currentPrice / costPrice - 1) * 100;
    return ratio > 0 ? `+${ratio.toFixed(2)}%` : `${ratio.toFixed(2)}%`;
  };

  // 获取百分比颜色
  const getPercentageColor = (asset: Asset): string => {
    const eastmoneyPrice = eastmoneyPrices[asset.标的名称];
    const currentPrice = eastmoneyPrice || (asset.当前价格 ? Number(asset.当前价格) : null);
    const costPrice = costPrices[asset.标的名称];
    
    if (!currentPrice || !costPrice) return '#6b7280';
    
    const ratio = (currentPrice / costPrice - 1) * 100;
    return ratio > 0 ? '#10b981' : '#ef4444';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">标的列表</h2>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-sm px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新标的数据"
          >
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-xs mt-2">{error}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">加载中...</div>
        ) : assets.length > 0 ? (
          <div>
            {Array.from(new Set(assets.map((a) => a.类型 || '其他')))
              .sort((a, b) => {
                // 排序顺序：股票、债券、理财、商品、其他
                const order = { '股票': 0, '债券': 1, '理财': 2, '商品': 3, '其他': 4 };
                return (order[a as keyof typeof order] || 4) - (order[b as keyof typeof order] || 4);
              })
              .map((type) => {
                // 计算该分组的合计金额和合计比例
                const groupAssets = assets.filter((asset) => (asset.类型 || '其他') === type);
                const totalAmount = groupAssets.reduce((sum, asset) => sum + (asset.持有金额 || 0), 0);
                const totalRatio = groupAssets.reduce((sum, asset) => sum + (asset.比例 || 0), 0);
                const isExpanded = expandedGroups[type] !== false; // 默认展开
                
                return (
                  <div key={type}>
                    {/* 分组标题 - 深灰色背景 */}
                    <button
                      onClick={() => toggleGroup(type)}
                      className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-800 sticky top-0 z-10 flex justify-between items-center transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">
                          {isExpanded ? '▼' : '▶'} {type}
                        </span>
                      </div>
                      <div className="text-white text-xs font-medium">
                        <span>¥{totalAmount.toFixed(0)}</span>
                        <span className="ml-3">{(totalRatio * 100).toFixed(2)}%</span>
                      </div>
                    </button>
                    
                    {/* 标的列表 */}
                    {isExpanded && groupAssets.map((asset) => (
                      <button
                        key={asset.recordId}
                        onClick={() => onSelectAsset(asset.标的名称)}
                        className={`w-full px-4 py-3 text-left border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          selectedAsset === asset.标的名称 ? 'bg-blue-100' : 'bg-white'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* 第一行：标的名称和代码（左侧），当前价格（右侧） */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900">{asset.标的名称}</span>
                              <span className="text-xs text-gray-500">{asset.标的代码}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              ¥{(eastmoneyPrices[asset.标的名称] ?? Number(asset.当前价格 || 0)).toFixed(3)}
                            </div>
                          </div>
                          
                          {/* 第二行：持有金额和比例（左侧），涨跌幅（右侧） */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span>¥{asset.持有金额?.toFixed(0) || '0'}</span>
                              <span>{(asset.比例 ? asset.比例 * 100 : 0).toFixed(2)}%</span>
                            </div>
                            {(eastmoneyPrices[asset.标的名称] !== null || asset.当前价格) && costPrices[asset.标的名称] && (
                              <span
                                className="text-xs font-medium"
                                style={{ color: getPercentageColor(asset) }}
                              >
                                {getPercentage(asset)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">暂无标的数据</div>
        )}
      </div>
    </div>
  );
}
