'use client';

import { useEffect, useState } from 'react';
import { useTrades, useCompletedTrades } from '@/hooks/useVikaData';

interface TradeRecordItem {
  id: string;
  type: '买入' | '卖出';
  amount: number;
  price: number;
  date: string;
  status: 'uncompleted' | 'completed';
}

interface TradeRecordProps {
  selectedAsset: string;
}

export default function TradeRecord({ selectedAsset }: TradeRecordProps) {
  const { trades } = useTrades(selectedAsset);
  const { completedTrades } = useCompletedTrades(selectedAsset);
  const [recordList, setRecordList] = useState<TradeRecordItem[]>([]);

  useEffect(() => {
    const items: TradeRecordItem[] = [];

    // 添加未完成交易的买入记录
    trades?.forEach((trade: any) => {
      if (trade.买入日期 && trade.买入价格 > 0) {
        items.push({
          id: `uncompleted_buy_${trade.id}`,
          type: '买入',
          amount: trade.买入数量,
          price: trade.买入价格,
          date: trade.买入日期,
          status: 'uncompleted',
        });
      }
      // 卖出记录 - 只需要卖出价格大于0和卖出日期非空
      if (trade.卖出价格 > 0 && trade.卖出日期) {
        items.push({
          id: `uncompleted_sell_${trade.id}`,
          type: '卖出',
          amount: trade.卖出数量,
          price: trade.卖出价格,
          date: trade.卖出日期,
          status: 'uncompleted',
        });
      }
    });

    // 添加已完成交易的买入记录
    completedTrades?.forEach((trade: any) => {
      if (trade.买入日期 && trade.买入价格 > 0) {
        items.push({
          id: `completed_buy_${trade.id}`,
          type: '买入',
          amount: trade.买入数量,
          price: trade.买入价格,
          date: trade.买入日期,
          status: 'completed',
        });
      }
      // 卖出记录 - 只需要卖出价格大于0和卖出日期非空
      if (trade.卖出价格 > 0 && trade.卖出日期) {
        items.push({
          id: `completed_sell_${trade.id}`,
          type: '卖出',
          amount: trade.卖出数量,
          price: trade.卖出价格,
          date: trade.卖出日期,
          status: 'completed',
        });
      }
    });

    // 按日期降序排序（最新的在前）
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecordList(items);
  }, [trades, completedTrades]);
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900">买卖记录</h2>
        {selectedAsset && <p className="text-xs text-gray-500 mt-1">{selectedAsset}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {recordList.length > 0 ? (
          <div>
            {recordList.map((record) => (
              <div
                key={record.id}
                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  record.status === 'completed' ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded ${
                        record.type === '买入'
                          ? 'text-red-600 bg-red-100'
                          : 'text-green-600 bg-green-100'
                      }`}
                    >
                      {record.type}
                    </span>
                    {record.status === 'completed' && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        已完成
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{record.date}</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">数量:</span>
                    <span className="font-medium">{record.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">价格:</span>
                    <span className="font-medium">¥{record.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">{selectedAsset ? '暂无交易记录' : '请选择标的'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
