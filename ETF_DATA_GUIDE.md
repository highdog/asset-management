# ETF K线数据获取完整指南

这个指南说明如何通过 AKShare 库获取 ETF 数据，并集成到资产管理系统中。

## 总体架构

```
AKShare (Python)
    ↓
ETF K线数据
    ↓
Supabase (数据库存储)
    ↓
Next.js API Routes
    ↓
前端界面 (显示K线图)
```

## 第 1 步：设置 Python 环境

### 1.1 安装依赖

```bash
pip install akshare pandas
```

### 1.2 验证 AKShare 安装

```bash
python3 -c "import akshare as ak; print(ak.__version__)"
```

## 第 2 步：测试数据获取

### 2.1 运行 Python 脚本获取样本数据

```bash
cd /Users/zhijianhuang/Code/Asset\ Management/asset-management
python3 scripts/fetch_etf_data.py
```

这将：
- 获取所有 17 个 ETF 的最近 30 天数据
- 打印样本数据到控制台
- 显示获取成功/失败的统计信息

### 2.2 测试单个 ETF 获取

```python
import akshare as ak
from datetime import datetime, timedelta

# 获取 A500ETF (512050) 的最近 30 天数据
symbol = '512050'
end_date = datetime.now().date().strftime('%Y%m%d')
start_date = (datetime.now() - timedelta(days=30)).date().strftime('%Y%m%d')

df = ak.stock_zh_a_hist(
    symbol=symbol,
    period='daily',
    start_date=start_date,
    end_date=end_date,
    adjust='qfq'
)

print(df)
```

## 第 3 步：在 Supabase 中创建数据表

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 创建 ETF 列表表
CREATE TABLE etf_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);

-- 创建 ETF K线数据表
CREATE TABLE etf_kline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(10, 4),
  high DECIMAL(10, 4),
  low DECIMAL(10, 4),
  close DECIMAL(10, 4),
  volume BIGINT,
  amount DECIMAL(15, 2),
  amplitude DECIMAL(5, 2),
  change_percent DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(symbol, date),
  FOREIGN KEY(symbol) REFERENCES etf_list(code)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_etf_kline_symbol_date ON etf_kline(symbol, date DESC);

-- 启用行级安全（可选）
ALTER TABLE etf_kline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON etf_kline FOR SELECT USING (true);
```

### 数据表字段说明

**etf_kline 表字段：**
- `symbol`: ETF代码 (如 512050)
- `date`: 交易日期
- `open`: 开盘价
- `high`: 最高价
- `low`: 最低价
- `close`: 收盘价
- `volume`: 成交量
- `amount`: 成交额
- `amplitude`: 振幅 (%)
- `change_percent`: 涨跌幅 (%)

## 第 4 步：将数据导入 Supabase

### 方案 A：使用 Python 脚本直接导入（推荐）

创建文件 `scripts/import_to_supabase.py`：

```python
import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client

# Supabase 配置
SUPABASE_URL = "your_supabase_url"
SUPABASE_KEY = "your_supabase_key"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ETF_LIST = {
    'A500ETF': '512050',
    '恒生科技ETF': '513130',
    # ... 其他 ETF
}

def fetch_and_import_etf_data(etf_name, symbol, days=90):
    """获取数据并导入到 Supabase"""
    try:
        # 获取数据
        end_date = datetime.now().date().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=days)).date().strftime('%Y%m%d')
        
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period='daily',
            start_date=start_date,
            end_date=end_date,
            adjust='qfq'
        )
        
        if df is None or len(df) == 0:
            print(f"✗ {etf_name} ({symbol}): 无数据")
            return False
        
        # 重命名列以匹配数据库表
        df_import = df.rename(columns={
            '日期': 'date',
            '开盘': 'open',
            '最高': 'high',
            '最低': 'low',
            '收盘': 'close',
            '成交量': 'volume',
            '成交额': 'amount',
            '振幅': 'amplitude',
            '涨跌幅': 'change_percent'
        })
        
        df_import['symbol'] = symbol
        
        # 转换数据类型
        df_import['date'] = pd.to_datetime(df_import['date']).dt.date
        
        # 批量导入数据
        for _, row in df_import.iterrows():
            supabase.table('etf_kline').upsert({
                'symbol': row['symbol'],
                'date': str(row['date']),
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': int(row['volume']),
                'amount': float(row['amount']),
                'amplitude': float(row['amplitude']),
                'change_percent': float(row['change_percent'])
            }).execute()
        
        print(f"✓ {etf_name} ({symbol}): 成功导入 {len(df_import)} 条记录")
        return True
        
    except Exception as e:
        print(f"✗ {etf_name} ({symbol}): {str(e)}")
        return False

if __name__ == '__main__':
    print("开始导入 ETF 数据到 Supabase...")
    
    success_count = 0
    for etf_name, etf_code in ETF_LIST.items():
        if fetch_and_import_etf_data(etf_name, etf_code):
            success_count += 1
    
    print(f"\n完成！成功导入 {success_count}/{len(ETF_LIST)} 个 ETF 的数据")
```

运行：
```bash
pip install supabase
python3 scripts/import_to_supabase.py
```

### 方案 B：手动导出 CSV 并在 Supabase UI 中导入

1. 修改 `scripts/fetch_etf_data.py`，取消注释最后的 `save_to_csv(etf_data)`
2. 运行脚本生成 CSV 文件
3. 在 Supabase 中使用 CSV 导入功能

## 第 5 步：前端集成

### 5.1 更新 KLineChart 组件以调用 API

```typescript
'use client';

import { useEffect, useState } from 'react';

interface KLineData {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KLineChartProps {
  selectedAsset: string;
  activeTab: '全览' | '股票' | '债券' | '理财' | '商品';
}

export default function KLineChart({ selectedAsset, activeTab }: KLineChartProps) {
  const [data, setData] = useState<KLineData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAsset) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/etf/kline?symbol=${selectedAsset}&days=30`);
        const result = await response.json();
        
        if (result.data) {
          setData(result.data);
        } else {
          setError('获取数据失败');
        }
      } catch (err) {
        setError('网络错误');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedAsset]);

  return (
    <div className="h-full flex flex-col bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {selectedAsset ? `${activeTab} - K线图` : '请选择标的'}
        </h2>
      </div>
      
      {loading && <p className="text-gray-600">加载中...</p>}
      {error && <p className="text-red-600">{error}</p>}
      
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
        {data.length > 0 ? (
          <div className="text-center">
            <p className="text-gray-600 mb-2">K线图表区域</p>
            <p className="text-sm text-gray-500">已加载 {data.length} 条数据</p>
            {/* 这里集成真实的图表库，如 ECharts */}
          </div>
        ) : !loading ? (
          <p className="text-gray-500">请从左侧列表选择一个标的</p>
        ) : null}
      </div>
    </div>
  );
}
```

## 第 6 步：集成图表库（可选）

### 使用 ECharts 显示 K 线图

```bash
npm install echarts
```

示例代码见后续更新。

## API 接口文档

### GET /api/etf/list

获取 ETF 列表

**请求参数：**
- `category` (可选): 分类筛选 (stock, commodity)

**响应示例：**
```json
{
  "count": 17,
  "data": [
    { "code": "512050", "name": "A500ETF", "category": "stock" },
    { "code": "513130", "name": "恒生科技ETF", "category": "stock" }
  ]
}
```

### GET /api/etf/kline

获取 ETF K 线数据

**请求参数：**
- `symbol` (必需): ETF代码，如 512050
- `days` (可选): 获取最近多少天的数据，默认 30

**响应示例：**
```json
{
  "symbol": "512050",
  "count": 20,
  "data": [
    {
      "symbol": "512050",
      "date": "2025-12-16",
      "open": 4.567,
      "high": 4.589,
      "low": 4.556,
      "close": 4.578,
      "volume": 1234567,
      "amount": 5678900,
      "amplitude": 0.89,
      "change_percent": 0.24
    }
  ]
}
```

## 常见问题

### Q1: AKShare 获取数据很慢
A: 这是正常的，因为它从网络爬取数据。可以考虑使用定时任务（如 GitHub Actions）定期更新数据。

### Q2: 某些 ETF 获取失败
A: 检查 ETF 代码是否正确，或者在 AKShare 文档中确认是否支持该 ETF。

### Q3: 如何定期更新数据
A: 可以使用 GitHub Actions 或云函数定时运行数据获取脚本。参考示例见后续文件。

### Q4: 数据库表中没有数据
A: 确保已运行导入脚本，或手动导入 CSV 数据。

## 下一步

1. ✅ 获取 ETF 数据
2. ✅ 创建数据库表
3. ✅ 导入数据到 Supabase
4. ⏳ 集成 ECharts 显示 K 线图
5. ⏳ 添加技术指标（MA、MACD 等）
6. ⏳ 实现实时数据更新

祝你开发愉快！
