'use client';

import { useState, useEffect } from 'react';
import { useAssets, useTrades, fetchTradesWithQueue } from '@/hooks/useVikaData';

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
  当前价格?: string;
}

export default function AssetList({ activeTab, selectedAsset, onSelectAsset }: AssetListProps) {
  const { assets, loading, error, fetchAssets } = useAssets();
  // 为了获取持仓成本，我们需要计算每个标的的持仓成本
  // 这里我们创建一个状态来存储每个标的的持仓成本
  const [costPrices, setCostPrices] = useState<{ [key: string]: number }>({});
  const [assetTradesData, setAssetTradesData] = useState<{ [key: string]: any[] }>({});

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
    await fetchAssets(true); // 强制刷新
  };

  // 计算显示的百分比
  const getPercentage = (asset: Asset): string | null => {
    const currentPrice = asset.当前价格 ? parseFloat(asset.当前价格) : null;
    const costPrice = costPrices[asset.标的名称];
    
    if (!currentPrice || !costPrice) return null;
    
    const ratio = (currentPrice / costPrice - 1) * 100;
    return ratio > 0 ? `+${ratio.toFixed(2)}%` : `${ratio.toFixed(2)}%`;
  };

  // 获取百分比颜色
  const getPercentageColor = (asset: Asset): string => {
    const currentPrice = asset.当前价格 ? parseFloat(asset.当前价格) : null;
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
          assets.map((asset) => (
            <button
              key={asset.recordId}
              onClick={() => onSelectAsset(asset.标的名称)}
              className={`w-full px-4 py-3 text-left border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                selectedAsset === asset.标的名称 ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{asset.标的名称}</div>
                  <div className="text-xs text-gray-500 mt-1">{asset.标的代码}</div>
                </div>
                {asset.当前价格 && costPrices[asset.标的名称] && (
                  <div className="ml-4 flex flex-col items-end">
                    <span className="text-xs text-gray-600">
                      ¥{parseFloat(asset.当前价格).toFixed(3)}
                    </span>
                    <span
                      className="text-xs font-medium mt-1"
                      style={{ color: getPercentageColor(asset) }}
                    >
                      {getPercentage(asset)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">暂无标的数据</div>
        )}
      </div>
    </div>
  );
}
