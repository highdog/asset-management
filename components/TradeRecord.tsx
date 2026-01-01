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

interface CompletedTradeGroup {
  id: string;
  buyRecord: any;
  sellRecord: any;
  profitLoss: number;
}

interface TradeRecordProps {
  selectedAsset: string;
}

export default function TradeRecord({ selectedAsset }: TradeRecordProps) {
  const { trades } = useTrades(selectedAsset);
  const { completedTrades } = useCompletedTrades(selectedAsset);
  const [recordList, setRecordList] = useState<TradeRecordItem[]>([]);
  const [completedTradeGroups, setCompletedTradeGroups] = useState<CompletedTradeGroup[]>([]);

  useEffect(() => {
    if (!selectedAsset) {
      setRecordList([]);
      setCompletedTradeGroups([]);
      return;
    }

    const items: TradeRecordItem[] = [];

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

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecordList(items);

    if (completedTrades && completedTrades.length > 0) {
      const groups: CompletedTradeGroup[] = completedTrades.map((trade: any) => ({
        id: trade.id,
        buyRecord: trade.买入日期 && trade.买入价格 > 0 ? {
          date: trade.买入日期,
          price: trade.买入价格,
          amount: trade.买入数量,
        } : null,
        sellRecord: trade.卖出价格 > 0 && trade.卖出日期 ? {
          date: trade.卖出日期,
          price: trade.卖出价格,
          amount: trade.卖出数量,
        } : null,
        profitLoss: trade.盈亏金额,
      }));
      groups.sort((a, b) => {
        const dateA = a.sellRecord?.date || a.buyRecord?.date || '';
        const dateB = b.sellRecord?.date || b.buyRecord?.date || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      setCompletedTradeGroups(groups);
    } else {
      setCompletedTradeGroups([]);
    }
  }, [selectedAsset, trades, completedTrades]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900">交易记录</h2>
        {selectedAsset && <p className="text-xs text-gray-500 mt-1">{selectedAsset}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {recordList.length > 0 || completedTradeGroups.length > 0 ? (
          <div>
            {/* 未完成交易 */}
            {recordList.filter((r) => r.status === 'uncompleted').length > 0 && (
              <div>
                <div className="px-4 py-3 bg-gray-100 sticky top-0 z-10">
                  <h3 className="font-semibold text-sm text-gray-900">未完成交易</h3>
                </div>
                {recordList
                  .filter((r) => r.status === 'uncompleted')
                  .map((record) => (
                    <div
                      key={record.id}
                      className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
            )}

            {/* 已完成交易 */}
            {completedTradeGroups.length > 0 && (
              <div>
                <div className="px-4 py-3 bg-blue-100 sticky top-0 z-10">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">已完成交易</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white rounded p-2">
                    <div>
                      <p className="text-gray-600">交易笔数</p>
                      <p className="font-semibold text-gray-900">{completedTradeGroups.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">总盈亏</p>
                      <p className={`font-semibold ${
                        completedTradeGroups.reduce((sum, g) => sum + g.profitLoss, 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        ¥{completedTradeGroups.reduce((sum, g) => sum + g.profitLoss, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                {completedTradeGroups.map((group) => (
                  <div
                    key={group.id}
                    className="px-4 py-3 border-b border-gray-100 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {group.buyRecord && (
                        <div className="border-r border-gray-200 pr-3">
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-sm font-semibold px-2 py-0.5 rounded text-red-600 bg-red-100">买入</span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">日期:</span>
                              <span className="font-medium">{group.buyRecord.date}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">数量:</span>
                              <span className="font-medium">{group.buyRecord.amount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">价格:</span>
                              <span className="font-medium">¥{group.buyRecord.price.toFixed(3)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {group.sellRecord && (
                        <div className="pl-3">
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-sm font-semibold px-2 py-0.5 rounded text-green-600 bg-green-100">卖出</span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">日期:</span>
                              <span className="font-medium">{group.sellRecord.date}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">数量:</span>
                              <span className="font-medium">{group.sellRecord.amount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">价格:</span>
                              <span className="font-medium">¥{group.sellRecord.price.toFixed(3)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">本次盈亏:</span>
                        <span className={`text-sm font-semibold ${
                          group.profitLoss >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          ¥{group.profitLoss.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
