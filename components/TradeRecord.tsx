'use client';

interface TradeRecord {
  id: string;
  type: '买入' | '卖出';
  amount: number;
  price: number;
  time: string;
}

interface TradeRecordProps {
  selectedAsset: string;
}

// 模拟交易记录数据
const mockTradeRecords: Record<string, TradeRecord[]> = {
  '1': [
    { id: '1', type: '买入', amount: 100, price: 12.34, time: '14:35' },
    { id: '2', type: '卖出', amount: 50, price: 12.50, time: '14:28' },
    { id: '3', type: '买入', amount: 200, price: 12.10, time: '13:45' },
  ],
  '2': [
    { id: '4', type: '买入', amount: 10, price: 120.00, time: '15:10' },
    { id: '5', type: '卖出', amount: 5, price: 125.50, time: '14:55' },
  ],
  '3': [
    { id: '6', type: '买入', amount: 1, price: 1234.56, time: '13:20' },
  ],
};

export default function TradeRecord({ selectedAsset }: TradeRecordProps) {
  const records = selectedAsset ? mockTradeRecords[selectedAsset] || [] : [];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900">交易记录</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {records.length > 0 ? (
          <div>
            {records.map((record) => (
              <div
                key={record.id}
                className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-xs font-semibold ${
                      record.type === '买入' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {record.type}
                  </span>
                  <span className="text-xs text-gray-500">{record.time}</span>
                </div>
                <div className="text-xs text-gray-600">
                  <div>数量: {record.amount}</div>
                  <div>价格: ¥{record.price.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">暂无交易记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
