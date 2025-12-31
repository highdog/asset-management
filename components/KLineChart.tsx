'use client';

import { useEffect, useState, useRef } from 'react';
import { useTrades, useCompletedTrades, clearAllCache, useAssets } from '@/hooks/useVikaData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
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
  const { assets } = useAssets();
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [zoomStartIndex, setZoomStartIndex] = useState(0);
  const [zoomEndIndex, setZoomEndIndex] = useState(-1);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [costPrice, setCostPrice] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedAsset || (!trades || trades.length === 0) && (!completedTrades || completedTrades.length === 0)) {
      setChartData([]);
      setZoomStartIndex(0);
      setZoomEndIndex(-1);
      setCurrentPrice(null);
      setCostPrice(null);
      return;
    }

    // 获取当前价格
    const asset = assets.find((a: any) => a['标的名称'] === selectedAsset);
    if (asset) {
      setCurrentPrice(parseFloat(asset['当前价格']) || null);
    }

    // 计算持仓价格（未完成交易的平均成本）
    let totalCost = 0;
    let totalQuantity = 0;
    trades?.forEach((trade: TradeRecord) => {
      if (trade.买入日期 && trade.买入金额 > 0 && trade.买入数量 > 0) {
        totalCost += trade.买入金额;
        totalQuantity += trade.买入数量;
      }
    });
    const avgCost = totalQuantity > 0 ? totalCost / totalQuantity : null;
    setCostPrice(avgCost);

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

      // 添加卖出点 - 只需要卖出价格大于0，日期可以为空（表示未卖出）
      if (trade.卖出价格 > 0 && trade.卖出日期) {
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

      // 添加已完成的卖出点 - 只需要卖出价格大于0，日期可以为空（表示未卖出）
      if (trade.卖出价格 > 0 && trade.卖出日期) {
        if (!chartPoints[trade.卖出日期]) {
          chartPoints[trade.卖出日期] = { date: trade.卖出日期 };
        }
        chartPoints[trade.卖出日期].完成卖出价格 = trade.卖出价格;
      }
    });

    // 按日期排序
    const sortedTransactionDates = Object.values(chartPoints)
      .map(cp => new Date(cp.date).getTime())
      .sort((a, b) => a - b);

    if (sortedTransactionDates.length === 0) {
      setChartData([]);
      setZoomStartIndex(0);
      setZoomEndIndex(-1);
      return;
    }

    // 生成连续日期范围
    const startDate = new Date(sortedTransactionDates[0]);
    const endDate = new Date(sortedTransactionDates[sortedTransactionDates.length - 1]);
    const dateRange: ChartPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // 使用中文粗体日日床格式（与 API 返回的格式一致）
      const dateStr = currentDate.toLocaleDateString('zh-CN');
      dateRange.push(chartPoints[dateStr] || { date: dateStr });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setChartData(dateRange);
    // 默认显示最近6个月，两端留出20条数据的空间
    const defaultDays = 180;
    const padding = 20; // 两端留出的空间
    const start = Math.max(0, dateRange.length - defaultDays - padding);
    setZoomStartIndex(start);
    setZoomEndIndex(Math.min(dateRange.length - 1, start + defaultDays + padding - 1));
  }, [selectedAsset, trades, completedTrades, assets]);

  const handleRefresh = async () => {
    // 清除旧的丰存，强制从 API 销取最新数据
    clearAllCache();
    await fetchTrades(true); // 强制刷新未完成交易
    await fetchCompletedTrades(true); // 强制刷新已完成交易
  };

  // 处理鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (chartData.length === 0) return;
    
    e.preventDefault();
    const currentSpan = zoomEndIndex - zoomStartIndex + 1;
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8; // 向下滚动放大，向上缩小
    const newSpan = Math.max(10, Math.min(chartData.length, Math.round(currentSpan * zoomFactor)));
    const spanDiff = newSpan - currentSpan;
    
    let newStart = Math.max(0, zoomStartIndex - Math.round(spanDiff / 2));
    let newEnd = newStart + newSpan - 1;
    
    if (newEnd >= chartData.length) {
      newEnd = chartData.length - 1;
      newStart = Math.max(0, newEnd - newSpan + 1);
    }
    
    setZoomStartIndex(newStart);
    setZoomEndIndex(newEnd);
  };

  // 获取缩放后的数据
  const displayData = zoomEndIndex !== -1 && zoomStartIndex < chartData.length
    ? chartData.slice(Math.max(0, zoomStartIndex), Math.min(chartData.length, zoomEndIndex + 1))
    : chartData;

  // 计算价格相对于当前价格的百分比 (当前价格 / 交易价格 - 1)
  const getPricePercentage = (price: number | undefined): string => {
    if (!price || currentPrice === null) return '';
    const ratio = (currentPrice / price - 1) * 100;
    return ratio > 0 ? `+${ratio.toFixed(2)}%` : `${ratio.toFixed(2)}%`;
  };

  // 获取百分比的颜色（负数为红色、正数为绿色）
  const getPercentageColor = (price: number | undefined): string => {
    if (!price || currentPrice === null) return '#10b981';
    const ratio = (currentPrice / price - 1) * 100;
    return ratio > 0 ? '#10b981' : '#ef4444';
  };

  // 自定义买入价格点组件
  const BuyDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.买入价格) return null;
    const percentage = getPricePercentage(payload.买入价格);
    const percentColor = getPercentageColor(payload.买入价格);
    return (
      <g key={`buy-${cx}`}>
        <circle cx={cx} cy={cy} r={5} fill="#10b981" />
        {/* 价格标签 */}
        <text
          x={cx + 8}
          y={cy - 12}
          fill="#10b981"
          fontSize="10"
          fontWeight="600"
          textAnchor="start"
        >
          ¥{payload.买入价格.toFixed(3)}
        </text>
        {/* 百分比标签 */}
        {percentage && (
          <text
            x={cx + 8}
            y={cy - 2}
            fill={percentColor}
            fontSize="10"
            fontWeight="500"
            textAnchor="start"
          >
            {percentage}
          </text>
        )}
      </g>
    );
  };

  // 自定义卖出价格点组件
  const SellDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.卖出价格 || payload.卖出价格 === 0) return null;
    const percentage = getPricePercentage(payload.卖出价格);
    const percentColor = getPercentageColor(payload.卖出价格);
    return (
      <g key={`sell-${cx}`}>
        <circle cx={cx} cy={cy} r={4} fill="#ef4444" />
        {/* 价格标签 */}
        <text
          x={cx + 8}
          y={cy - 12}
          fill="#ef4444"
          fontSize="10"
          fontWeight="600"
          textAnchor="start"
        >
          ¥{payload.卖出价格.toFixed(3)}
        </text>
        {/* 百分比标签 */}
        {percentage && (
          <text
            x={cx + 8}
            y={cy - 2}
            fill={percentColor}
            fontSize="10"
            fontWeight="500"
            textAnchor="start"
          >
            {percentage}
          </text>
        )}
      </g>
    );
  };

  // 自定义已完成买入价格点组件
  const CompletedBuyDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.完成买入价格) return null;
    const percentage = getPricePercentage(payload.完成买入价格);
    const percentColor = getPercentageColor(payload.完成买入价格);
    return (
      <g key={`completed-buy-${cx}`}>
        <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />
        {/* 价格标签 */}
        <text
          x={cx + 8}
          y={cy - 12}
          fill="#3b82f6"
          fontSize="10"
          fontWeight="600"
          textAnchor="start"
        >
          ¥{payload.完成买入价格.toFixed(3)}
        </text>
        {/* 百分比标签 */}
        {percentage && (
          <text
            x={cx + 8}
            y={cy - 2}
            fill={percentColor}
            fontSize="10"
            fontWeight="500"
            textAnchor="start"
          >
            {percentage}
          </text>
        )}
      </g>
    );
  };

  // 自定义已完成卖出价格点组件
  const CompletedSellDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.完成卖出价格 || payload.完成卖出价格 === 0) return null;
    const percentage = getPricePercentage(payload.完成卖出价格);
    const percentColor = getPercentageColor(payload.完成卖出价格);
    return (
      <g key={`completed-sell-${cx}`}>
        <circle cx={cx} cy={cy} r={4} fill="#f97316" />
        {/* 价格标签 */}
        <text
          x={cx + 8}
          y={cy - 12}
          fill="#f97316"
          fontSize="10"
          fontWeight="600"
          textAnchor="start"
        >
          ¥{payload.完成卖出价格.toFixed(3)}
        </text>
        {/* 百分比标签 */}
        {percentage && (
          <text
            x={cx + 8}
            y={cy - 2}
            fill={percentColor}
            fontSize="10"
            fontWeight="500"
            textAnchor="start"
          >
            {percentage}
          </text>
        )}
      </g>
    );
  };

  // 计算Y轴的范围，自动适配数据
  const getYAxisDomain = () => {
    if (displayData.length === 0) return [0, 1] as const;
    
    const prices: number[] = [];
    displayData.forEach((point: ChartPoint) => {
      if (point.买入价格) prices.push(point.买入价格);
      if (point.卖出价格) prices.push(point.卖出价格);
      if (point.完成买入价格) prices.push(point.完成买入价格);
      if (point.完成卖出价格) prices.push(point.完成卖出价格);
    });
    
    // 包括当前价格和持仓成本
    if (currentPrice !== null) prices.push(currentPrice);
    if (costPrice !== null) prices.push(costPrice);
    
    if (prices.length === 0) return [0, 1] as const;
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    const padding = range * 0.1; // 上下留10%的空间
    
    const min = Math.max(0, minPrice - padding);
    const max = maxPrice + padding;
    return [min, max] as const;
  };

  return (
    <div className="h-full flex flex-col bg-white p-4 overflow-hidden">
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

      <div
        ref={chartContainerRef}
        className="flex-1 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >
        {loading || completedLoading ? (
          <div className="text-center">
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : selectedAsset ? (
          chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayData}>
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
                  tickFormatter={(value: number) => value.toFixed(3)}
                  domain={getYAxisDomain()}
                />
                <Tooltip
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return value.toFixed(3);
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
                {/* 买入价格 - 仅显示点，不连线，带百分比标签 */}
                <Line
                  type="monotone"
                  dataKey="买入价格"
                  stroke="transparent"
                  dot={<BuyDot />}
                  activeDot={{ r: 7 }}
                />
                {/* 卖出价格 - 连线，带百分比标签 */}
                <Line
                  type="monotone"
                  dataKey="卖出价格"
                  stroke="#ef4444"
                  dot={<SellDot />}
                  connectNulls
                />
                {/* 已完成买入价格 - 虚线 */}
                <Line
                  type="monotone"
                  dataKey="完成买入价格"
                  stroke="#3b82f6"
                  strokeDasharray="5 5"
                  dot={<CompletedBuyDot />}
                  connectNulls
                />
                {/* 已完成卖出价格 - 虚线 */}
                <Line
                  type="monotone"
                  dataKey="完成卖出价格"
                  stroke="#f97316"
                  strokeDasharray="5 5"
                  dot={<CompletedSellDot />}
                  connectNulls
                />
                {/* 当前价格线 */}
                {currentPrice !== null && (
                  <ReferenceLine
                    y={currentPrice}
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    label={{
                      value: `当前价格: ¥${currentPrice.toFixed(3)}`,
                      position: 'right',
                      fill: '#8b5cf6',
                      fontSize: 12,
                    }}
                  />
                )}
                {/* 持仓成本线 */}
                {costPrice !== null && (
                  <ReferenceLine
                    y={costPrice}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    label={{
                      value: `持仓成本: ¥${costPrice.toFixed(3)}`,
                      position: 'right',
                      fill: '#f59e0b',
                      fontSize: 12,
                    }}
                  />
                )}
              </ComposedChart>
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

      {/* 时间范围显示和快捷按钮 */}
      {selectedAsset && chartData.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 font-medium">
              时间范围：{chartData[zoomStartIndex]?.date} 至 {chartData[zoomEndIndex]?.date}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const span = 30;
                  const start = Math.max(0, chartData.length - span);
                  setZoomStartIndex(start);
                  setZoomEndIndex(chartData.length - 1);
                }}
                className="text-xs px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                1月
              </button>
              <button
                onClick={() => {
                  const span = 90;
                  const start = Math.max(0, chartData.length - span);
                  setZoomStartIndex(start);
                  setZoomEndIndex(chartData.length - 1);
                }}
                className="text-xs px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                3月
              </button>
              <button
                onClick={() => {
                  const span = 180;
                  const start = Math.max(0, chartData.length - span);
                  setZoomStartIndex(start);
                  setZoomEndIndex(chartData.length - 1);
                }}
                className="text-xs px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                6月
              </button>
              <button
                onClick={() => {
                  const span = 365;
                  const start = Math.max(0, chartData.length - span);
                  setZoomStartIndex(start);
                  setZoomEndIndex(chartData.length - 1);
                }}
                className="text-xs px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                1年
              </button>
              <button
                onClick={() => {
                  setZoomStartIndex(0);
                  setZoomEndIndex(chartData.length - 1);
                }}
                className="text-xs px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                全部
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">💡 提示：滚动鼠标滚轮或使用触控板可以放大/缩小时间段</p>
        </div>
      )}

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

