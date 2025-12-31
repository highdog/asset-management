'use client';

import { useEffect, useState } from 'react';
import { useTrades, useCompletedTrades } from '@/hooks/useVikaData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TabType = '全览' | '股票' | '债券' | '理财' | '商品';

interface TradeRecord {
  id: string;
  标的: string | string[];
  买入日期: string;
  买入价格: number;
  买入数量: number;
  买入金额: number;
  卖出日期: string;
  卖出价格: number;
  卖出数量: number;
  卖出金额: number;
  状态: string;
  盈亏金额: number;
  盈亏比例: number;
  手续费: number;
}

interface ChartPoint {
  date: string;
  买入价格?: number;
  卖出价格?: number;
  完成买入价格?: number; // 已完成交易的买入价格
  完成卖出价格?: number; // 已完成交易的卖出价格
}

interface KLineChartProps {
  selectedAsset: string;
  activeTab: TabType;
}

export default function KLineChart({ selectedAsset, activeTab }: KLineChartProps) {
  const { trades, loading, error, fetchTrades } = useTrades(selectedAsset);
  const { completedTrades, loading: completedLoading, error: completedError, fetchCompletedTrades } = useCompletedTrades(selectedAsset);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (!selectedAsset || (!trades || trades.length === 0) && (!completedTrades || completedTrades.length === 0)) {
      setChartData([]);
      return;
    }

    // 构建图表数据
    const chartPoints: { [key: string]: ChartPoint } = {};

    // 添加未完成的交易记录
    trades?.forEach((trade: TradeRecord) => {
      // 添加买入点
      if (trade.买入日期 && trade.买入价格 > 0) {
        if (!chartPoints[trade.买入日期]) {
          chartPoints[trade.买入日期] = { date: trade.买入日期 };
        }
        chartPoints[trade.买入日期].买入价格 = trade.买入价格;
      }

      // 添加卖出点
      if (trade.卖出日期 && trade.卖出价格 > 0) {
        if (!chartPoints[trade.卖出日期]) {
          chartPoints[trade.卖出日期] = { date: trade.卖出日期 };
        }
        chartPoints[trade.卖出日期].卖出价格 = trade.卖出价格;
      }
    });

    // 添加已完成的交易记录
    completedTrades?.forEach((trade: TradeRecord) => {
      // 添加已完成的买入点
      if (trade.买入日期 && trade.买入价格 > 0) {
        if (!chartPoints[trade.买入日期]) {
          chartPoints[trade.买入日期] = { date: trade.买入日期 };
        }
        chartPoints[trade.买入日期].完成买入价格 = trade.买入价格;
      }

      // 添加已完成的卖出点
      if (trade.卖出日期 && trade.卖出价格 > 0) {
        if (!chartPoints[trade.卖出日期]) {
          chartPoints[trade.卖出日期] = { date: trade.卖出日期 };
        }
        chartPoints[trade.卖出日期].完成卖出价格 = trade.卖出价格;
      }
    });

    // 按日期排序
    const sortedData = Object.values(chartPoints).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setChartData(sortedData);
  }, [selectedAsset, trades, completedTrades]);

  const handleRefresh = async () => {
    await fetchTrades(true); // 强制刷新未完成交易
    await fetchCompletedTrades(true); // 强制刷新已完成交易
  };

  return (
    <div className="h-full flex flex-col bg-white p-4">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedAsset ? `${selectedAsset} - 买卖价格走势` : '请选择标的'}
          </h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || completedLoading}
          className="text-sm px-3 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="刷新交易数据"
        >
          {loading || completedLoading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {(error || completedError) && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          {error && <p className="text-red-700 text-sm">{error}</p>}
          {completedError && <p className="text-red-700 text-sm">{completedError}</p>}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
        {loading || completedLoading ? (
          <div className="text-center">
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : selectedAsset ? (
          chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  label={{ value: '价格', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return value.toFixed(2);
                    }
                    return value;
                  }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="买入价格"
                  stroke="#10b981"
                  dot={{ fill: '#10b981', r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="卖出价格"
                  stroke="#ef4444"
                  dot={{ fill: '#ef4444', r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="完成买入价格"
                  stroke="#3b82f6"
                  strokeDasharray="5 5"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="完成卖出价格"
                  stroke="#f97316"
                  strokeDasharray="5 5"
                  dot={{ fill: '#f97316', r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-2">暂无交易记录</p>
              <p className="text-sm text-gray-500">
                标的: {selectedAsset}
              </p>
            </div>
          )
        ) : (
          <div className="text-center">
            <p className="text-gray-500">请从左侧列表选择一个标的</p>
          </div>
        )}
      </div>

      {/* Trade Summary */}
      {selectedAsset && (trades?.length > 0 || completedTrades?.length > 0) && (
        <div className="mt-4 bg-gray-50 rounded p-3">
          <h3 className="font-semibold text-sm text-gray-900 mb-2">交易统计</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* 未完成交易 */}
            {trades && trades.length > 0 && (
              <div className="border-r pr-4">
                <h4 className="font-medium text-xs text-gray-700 mb-2">未完成交易</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">交易笔数</p>
                    <p className="font-semibold text-gray-900">{trades.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">总盈亏</p>
                    <p className={`font-semibold ${
                      trades.reduce((sum, t) => sum + t.盈亏金额, 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      ¥{trades.reduce((sum, t) => sum + t.盈亏金额, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* 已完成交易 */}
            {completedTrades && completedTrades.length > 0 && (
              <div className="pl-4">
                <h4 className="font-medium text-xs text-gray-700 mb-2">已完成交易</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">交易笔数</p>
                    <p className="font-semibold text-gray-900">{completedTrades.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">总盈亏</p>
                    <p className={`font-semibold ${
                      completedTrades.reduce((sum, t) => sum + t.盈亏金额, 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      ¥{completedTrades.reduce((sum, t) => sum + t.盈亏金额, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
