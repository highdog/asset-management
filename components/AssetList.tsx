'use client';

type TabType = '全览' | '股票' | '债券' | '理财' | '商品';

interface AssetListProps {
  activeTab: TabType;
  selectedAsset: string;
  onSelectAsset: (asset: string) => void;
}

// 模拟数据
const mockAssets: Record<TabType, Array<{ id: string; name: string; price: number; change: number }>> = {
  '全览': [
    { id: '1', name: '平安银行', price: 12.34, change: 2.5 },
    { id: '2', name: '比亚迪', price: 123.45, change: -1.2 },
    { id: '3', name: '贵州茅台', price: 1234.56, change: 3.8 },
  ],
  '股票': [
    { id: '1', name: '平安银行', price: 12.34, change: 2.5 },
    { id: '2', name: '比亚迪', price: 123.45, change: -1.2 },
    { id: '3', name: '贵州茅台', price: 1234.56, change: 3.8 },
    { id: '4', name: '中国石油', price: 5.67, change: 0.8 },
  ],
  '债券': [
    { id: '5', name: '国开债', price: 100.23, change: 0.1 },
    { id: '6', name: '政策性银行债', price: 99.87, change: -0.2 },
  ],
  '理财': [
    { id: '7', name: '货币基金A', price: 1.0234, change: 0.02 },
    { id: '8', name: '理财产品1', price: 100.5, change: 0.5 },
  ],
  '商品': [
    { id: '9', name: '黄金', price: 456.78, change: 1.5 },
    { id: '10', name: '白银', price: 56.78, change: -0.8 },
  ],
};

export default function AssetList({ activeTab, selectedAsset, onSelectAsset }: AssetListProps) {
  const assets = mockAssets[activeTab];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900">标的列表</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {assets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => onSelectAsset(asset.id)}
            className={`w-full px-4 py-3 text-left border-b border-gray-100 hover:bg-blue-50 transition-colors ${
              selectedAsset === asset.id ? 'bg-blue-100' : ''
            }`}
          >
            <div className="font-medium text-sm text-gray-900">{asset.name}</div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-600">¥{asset.price.toFixed(2)}</span>
              <span
                className={`text-xs font-medium ${
                  asset.change >= 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {asset.change > 0 ? '+' : ''}{asset.change}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
