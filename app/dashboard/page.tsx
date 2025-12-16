'use client';

import { useState } from 'react';
import TabNavigation from '@/components/TabNavigation';
import AssetList from '@/components/AssetList';
import KLineChart from '@/components/KLineChart';
import TradeRecord from '@/components/TradeRecord';

type TabType = '全览' | '股票' | '债券' | '理财' | '商品';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('全览');
  const [selectedAsset, setSelectedAsset] = useState<string>('');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-full mx-auto py-4 px-6">
          <h1 className="text-2xl font-bold text-gray-900">资产管理系统</h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full gap-4 p-4">
          {/* Left Column - Asset List (1 part) */}
          <div className="w-1/6 overflow-y-auto bg-white rounded-lg shadow">
            <AssetList 
              activeTab={activeTab} 
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
            />
          </div>

          {/* Middle Column - K-Line Chart (4 parts) */}
          <div className="flex-1 overflow-hidden bg-white rounded-lg shadow">
            <KLineChart selectedAsset={selectedAsset} activeTab={activeTab} />
          </div>

          {/* Right Column - Trade Record (1 part) */}
          <div className="w-1/6 overflow-y-auto bg-white rounded-lg shadow">
            <TradeRecord selectedAsset={selectedAsset} />
          </div>
        </div>
      </main>
    </div>
  );
}
