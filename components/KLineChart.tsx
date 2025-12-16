'use client';

type TabType = '全览' | '股票' | '债券' | '理财' | '商品';

interface KLineChartProps {
  selectedAsset: string;
  activeTab: TabType;
}

export default function KLineChart({ selectedAsset, activeTab }: KLineChartProps) {
  return (
    <div className="h-full flex flex-col bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {selectedAsset ? `${activeTab} - K线图` : '请选择标的'}
        </h2>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
        {selectedAsset ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">K线图表区域</p>
            <p className="text-sm text-gray-500">
              已选择: {selectedAsset}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              此处将显示K线图、技术指标等
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-500">请从左侧列表选择一个标的</p>
          </div>
        )}
      </div>

      {/* Chart Controls */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
          1分钟
        </button>
        <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
          5分钟
        </button>
        <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
          15分钟
        </button>
        <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
          1小时
        </button>
        <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
          1天
        </button>
      </div>
    </div>
  );
}
