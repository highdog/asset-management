'use client';

import { useState } from 'react';
import { useAssets } from '@/hooks/useVikaData';

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
}

export default function AssetList({ activeTab, selectedAsset, onSelectAsset }: AssetListProps) {
  const { assets, loading, error, fetchAssets } = useAssets();

  const handleRefresh = async () => {
    await fetchAssets(true); // 强制刷新
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
              <div className="font-medium text-sm text-gray-900">{asset.标的名称}</div>
              <div className="text-xs text-gray-500 mt-1">{asset.标的代码}</div>
            </button>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">暂无标的数据</div>
        )}
      </div>
    </div>
  );
}
