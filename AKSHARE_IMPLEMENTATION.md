# AKShare ETF 数据集成实施步骤

完整的从获取数据到显示在前端的实现步骤。

## 📋 总体流程

```
步骤 1: 安装 AKShare          (5分钟)
   ↓
步骤 2: 测试数据获取          (5分钟)
   ↓
步骤 3: 创建 Supabase 表      (10分钟)
   ↓
步骤 4: 导入数据到数据库      (10-30分钟)
   ↓
步骤 5: 测试 API 接口         (5分钟)
   ↓
步骤 6: 前端集成 K线图        (30分钟)
   ↓
完成！🎉
```

## 🔧 步骤 1：安装 AKShare

### 1.1 安装 Python 依赖

在你的终端运行：

```bash
# 安装 AKShare 和 pandas
pip install akshare pandas

# 可选：安装 Supabase Python 客户端
pip install supabase
```

### 1.2 验证安装

```bash
python3 -c "import akshare as ak; print(f'AKShare 版本: {ak.__version__}')"
```

输出示例：
```
AKShare 版本: 1.x.x
```

## 🧪 步骤 2：测试数据获取

### 2.1 运行快速测试

```bash
cd /Users/zhijianhuang/Code/Asset\ Management/asset-management
python3 scripts/test_akshare.py
```

这将测试 5 个代表性的 ETF，输出类似：

```
╔══════════════════════════════════════════════════════════╗
║                AKShare ETF 数据获取测试                   ║
╚══════════════════════════════════════════════════════════╝

============================================================
测试: A500ETF (512050)
============================================================
日期范围: 20251116 - 20251216
正在获取数据...
✓ 成功！获取了 16 条数据

数据示例（前 5 行）:
       日期     开盘     最高     最低     收盘        成交量         成交额      振幅    涨跌幅
0  2025-12-16  4.567   4.589   4.556   4.578   1234567  5678900.0    0.89     0.24
...
```

**如果所有测试都成功，说明 AKShare 可以正常使用！** ✓

### 2.2 如果测试失败

可能的原因和解决方案：

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `ModuleNotFoundError: No module named 'akshare'` | 未安装AKShare | `pip install akshare --upgrade` |
| `没有返回数据` | ETF代码错误或不支持 | 检查代码是否正确，尝试其他ETF |
| `网络连接错误` | 网络问题 | 检查网络连接，尝试更新 AKShare |

## 📊 步骤 3：创建 Supabase 数据库表

### 3.1 创建表

登录 Supabase，进入 SQL Editor，执行以下 SQL：

```sql
-- ==========================================
-- 创建 ETF 列表表
-- ==========================================
CREATE TABLE IF NOT EXISTS etf_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  category VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ==========================================
-- 创建 ETF K线数据表
-- ==========================================
CREATE TABLE IF NOT EXISTS etf_kline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(10, 4) NOT NULL,
  high DECIMAL(10, 4) NOT NULL,
  low DECIMAL(10, 4) NOT NULL,
  close DECIMAL(10, 4) NOT NULL,
  volume BIGINT,
  amount DECIMAL(15, 2),
  amplitude DECIMAL(5, 2),
  change_percent DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(symbol, date),
  FOREIGN KEY(symbol) REFERENCES etf_list(code) ON DELETE CASCADE
);

-- ==========================================
-- 创建索引以提高查询性能
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_etf_kline_symbol ON etf_kline(symbol);
CREATE INDEX IF NOT EXISTS idx_etf_kline_date ON etf_kline(date DESC);
CREATE INDEX IF NOT EXISTS idx_etf_kline_symbol_date ON etf_kline(symbol, date DESC);

-- ==========================================
-- 启用行级安全（可选但推荐）
-- ==========================================
ALTER TABLE etf_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE etf_kline ENABLE ROW LEVEL SECURITY;

-- 允许公开读取
CREATE POLICY "Allow public read etf_list" ON etf_list 
  FOR SELECT USING (true);

CREATE POLICY "Allow public read etf_kline" ON etf_kline 
  FOR SELECT USING (true);

-- ==========================================
-- 插入 ETF 列表数据
-- ==========================================
INSERT INTO etf_list (code, name, category) VALUES
('512050', 'A500ETF', 'stock'),
('513130', '恒生科技ETF', 'stock'),
('159545', '恒生红利低波', 'stock'),
('159919', '沪深300ETF', 'stock'),
('159922', '中证500ETF', 'stock'),
('512400', '有色金属ETF', 'commodity'),
('512690', '酒ETF', 'stock'),
('512890', '红利低波ETF', 'stock'),
('513100', '纳指ETF', 'stock'),
('515790', '光伏ETF', 'stock'),
('561910', '电池ETF', 'stock'),
('588000', '科创50ETF', 'stock'),
('160323', '华夏磐泰LOF', 'stock'),
('513650', '标普ETF', 'stock'),
('159399', '现金流', 'stock'),
('513000', '日经225etf', 'stock'),
('159235', '现金流DC', 'stock')
ON CONFLICT DO NOTHING;
```

### 3.2 验证表创建

在 Supabase 的 Table Editor 中，你应该看到：
- ✓ etf_list 表（17 条记录）
- ✓ etf_kline 表（空）

## 📥 步骤 4：导入数据到数据库

### 方案 A：使用 Python 脚本导入（推荐）

创建文件 `scripts/import_to_supabase.py`：

```python
#!/usr/bin/env python3
"""导入 ETF 数据到 Supabase"""

import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("错误: 未设置 Supabase 环境变量")
    print("请在 .env.local 中设置:")
    print("  NEXT_PUBLIC_SUPABASE_URL")
    print("  NEXT_PUBLIC_SUPABASE_ANON_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ETF_LIST = {
    'A500ETF': '512050',
    '恒生科技ETF': '513130',
    '恒生红利低波': '159545',
    '沪深300ETF': '159919',
    '中证500ETF': '159922',
    '有色金属ETF': '512400',
    '酒ETF': '512690',
    '红利低波ETF': '512890',
    '纳指ETF': '513100',
    '光伏ETF': '515790',
    '电池ETF': '561910',
    '科创50ETF': '588000',
    '华夏磐泰LOF': '160323',
    '标普ETF': '513650',
    '现金流': '159399',
    '日经225etf': '513000',
    '现金流DC': '159235',
}

def fetch_and_import(etf_name, symbol, days=90):
    """获取并导入数据"""
    try:
        end_date = datetime.now().date().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=days)).date().strftime('%Y%m%d')
        
        print(f"获取 {etf_name} ({symbol})...", end=' ', flush=True)
        
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period='daily',
            start_date=start_date,
            end_date=end_date,
            adjust='qfq'
        )
        
        if df is None or len(df) == 0:
            print("✗ 无数据")
            return 0
        
        # 准备数据
        records = []
        for _, row in df.iterrows():
            records.append({
                'symbol': symbol,
                'date': str(pd.to_datetime(row['日期']).date()),
                'open': float(row['开盘']),
                'high': float(row['最高']),
                'low': float(row['最低']),
                'close': float(row['收盘']),
                'volume': int(row['成交量']),
                'amount': float(row['成交额']),
                'amplitude': float(row['振幅']),
                'change_percent': float(row['涨跌幅']),
            })
        
        # 批量导入
        for record in records:
            supabase.table('etf_kline').upsert(record).execute()
        
        print(f"✓ 导入 {len(records)} 条")
        return len(records)
        
    except Exception as e:
        print(f"✗ 错误: {str(e)}")
        return 0

def main():
    print("\n开始导入 ETF 数据到 Supabase...\n")
    
    total = 0
    for etf_name, etf_code in ETF_LIST.items():
        count = fetch_and_import(etf_name, etf_code, days=90)
        total += count
    
    print(f"\n✓ 完成！总共导入 {total} 条数据")

if __name__ == '__main__':
    main()
```

### 运行导入脚本

```bash
# 确保已安装依赖
pip install python-dotenv

# 运行导入
python3 scripts/import_to_supabase.py
```

**注意：** 首次导入可能需要 5-10 分钟，因为要获取 17 个 ETF × 90 天的数据。

### 方案 B：使用 CSV 文件导入

如果 Python 脚本有问题，可以：

1. 修改 `scripts/fetch_etf_data.py`，取消注释最后的 `save_to_csv(etf_data)` 行
2. 运行 `python3 scripts/fetch_etf_data.py` 生成 CSV 文件
3. 在 Supabase 中选择 etf_kline 表
4. 点击 "Insert" → "Import data" → 上传 CSV 文件

## 🧪 步骤 5：测试 API 接口

### 5.1 启动开发服务器

```bash
npm run dev
```

### 5.2 测试 ETF 列表 API

在浏览器中访问：
```
http://localhost:3000/api/etf/list
```

应该返回：
```json
{
  "count": 17,
  "data": [
    { "code": "512050", "name": "A500ETF", "category": "stock" },
    ...
  ]
}
```

### 5.3 测试 K线数据 API

在浏览器中访问：
```
http://localhost:3000/api/etf/kline?symbol=512050&days=30
```

应该返回：
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
      ...
    }
  ]
}
```

## 📈 步骤 6：前端集成 K线图

### 6.1 安装图表库

```bash
npm install echarts
```

### 6.2 更新 KLineChart 组件

更新 `/components/KLineChart.tsx`：

```typescript
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ECharts } from 'echarts';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
});

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
        const response = await fetch(
          `/api/etf/kline?symbol=${selectedAsset}&days=60`
        );
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          // 按日期排序
          const sortedData = result.data.sort(
            (a: KLineData, b: KLineData) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setData(sortedData);
        } else {
          setError('暂无数据');
        }
      } catch (err) {
        setError('获取数据失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedAsset]);

  const getChartOption = () => {
    if (data.length === 0) return {};

    const dates = data.map((d) => d.date);
    const ohlc = data.map((d) => [d.open, d.close, d.low, d.high]);
    const volumes = data.map((d) => d.volume);

    return {
      title: {
        text: `${selectedAsset} K线图`,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      grid: [
        {
          left: '10%',
          right: '10%',
          top: '15%',
          height: '60%',
        },
        {
          left: '10%',
          right: '10%',
          top: '77%',
          height: '15%',
        },
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          gridIndex: 0,
        },
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          gridIndex: 1,
        },
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
        },
        {
          type: 'value',
          gridIndex: 1,
        },
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: ohlc,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: '#ec0000',
            color0: '#00da3c',
            borderColor: '#8A0000',
            borderColor0: '#008F28',
          },
        },
        {
          name: '成交量',
          type: 'bar',
          data: volumes,
          xAxisIndex: 1,
          yAxisIndex: 1,
          itemStyle: {
            color: '#7fbe9f',
          },
        },
      ],
    };
  };

  return (
    <div className="h-full flex flex-col bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {selectedAsset ? `K线图` : '请选择标的'}
        </h2>
      </div>

      {loading && <p className="text-gray-600">加载中...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {data.length > 0 && (
        <div className="flex-1 overflow-hidden">
          <ReactECharts
            option={getChartOption()}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-500">请从左侧列表选择一个标的</p>
        </div>
      )}
    </div>
  );
}
```

### 6.3 安装 ECharts React 组件

```bash
npm install echarts-for-react
```

## ✅ 完成！

现在你应该能看到：
1. ✓ 左侧标的列表可以点击选择
2. ✓ 中间显示实时的 K 线图表
3. ✓ 右侧显示交易记录

## 🔄 定期更新数据（可选）

要让数据保持最新，可以使用 GitHub Actions 定时更新：

创建 `.github/workflows/update-etf-data.yml`：

```yaml
name: Update ETF Data

on:
  schedule:
    # 每天下午 4 点运行（北京时间午夜）
    - cron: '0 8 * * *'

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          pip install akshare pandas supabase python-dotenv
      - name: Run data import
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: python3 scripts/import_to_supabase.py
```

## 🆘 故障排除

| 问题 | 解决方案 |
|------|---------|
| API 返回 404 | 检查 ETF 代码是否正确 |
| 图表不显示 | 检查浏览器控制台是否有错误，确保 ECharts 已安装 |
| 数据导入失败 | 检查 Supabase 连接，确保环境变量设置正确 |
| 获取数据很慢 | 这是正常的，AKShare 需要爬取数据。考虑增加超时时间 |

祝你开发愉快！🚀
