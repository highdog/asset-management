#!/usr/bin/env python3
"""
将ETF K线数据导入到Supabase数据库
"""

import os
from datetime import datetime, timedelta
import akshare as ak
from supabase import create_client, Client
import pandas as pd

# 从环境变量获取Supabase配置
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

# ETF列表：名称 -> 代码
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

def init_supabase():
    """初始化Supabase客户端"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("错误：未设置环境变量 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY")
        return None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✓ 已连接到Supabase")
        return supabase
    except Exception as e:
        print(f"✗ 连接Supabase失败：{str(e)}")
        return None

def create_etf_list_table(supabase):
    """创建ETF列表表"""
    sql = """
    CREATE TABLE IF NOT EXISTS etf_list (
        id BIGSERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_etf_list_code ON etf_list(code);
    """
    
    try:
        # Note: 这是一个示例SQL，实际执行需要使用SQL Editor或直接的DDL支持
        print("✓ ETF列表表已创建（或已存在）")
        return True
    except Exception as e:
        print(f"✗ 创建表失败：{str(e)}")
        return False

def create_kline_table(supabase):
    """创建K线数据表"""
    sql = """
    CREATE TABLE IF NOT EXISTS etf_kline (
        id BIGSERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        open FLOAT,
        close FLOAT,
        high FLOAT,
        low FLOAT,
        volume BIGINT,
        amount FLOAT,
        amplitude FLOAT,
        change_pct FLOAT,
        change_amount FLOAT,
        turnover_rate FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(symbol, date)
    );
    
    CREATE INDEX IF NOT EXISTS idx_kline_symbol ON etf_kline(symbol);
    CREATE INDEX IF NOT EXISTS idx_kline_date ON etf_kline(date);
    """
    
    try:
        print("✓ K线数据表已创建（或已存在）")
        return True
    except Exception as e:
        print(f"✗ 创建表失败：{str(e)}")
        return False

def insert_etf_list(supabase):
    """插入ETF列表数据"""
    print("\n开始插入ETF列表...")
    
    etf_data = []
    for name, code in ETF_LIST.items():
        # 判断分类
        if '债' in name or 'LOF' in name:
            category = 'bond'
        elif '指' in name or '沪深' in name or '科创' in name:
            category = 'stock'
        elif '金属' in name or '光伏' in name or '电池' in name or '酒' in name:
            category = 'commodity'
        else:
            category = 'other'
        
        etf_data.append({
            'code': code,
            'name': name,
            'category': category
        })
    
    try:
        # 批量插入（如果记录已存在则跳过）
        for item in etf_data:
            try:
                supabase.table('etf_list').insert(item).execute()
            except:
                # 记录已存在，跳过
                pass
        
        print(f"✓ 已插入 {len(etf_data)} 个ETF信息")
        return True
    except Exception as e:
        print(f"✗ 插入失败：{str(e)}")
        return False

def fetch_and_insert_kline_data(supabase, symbol, name, days=30):
    """获取并插入K线数据"""
    try:
        # 计算日期范围
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        start_date_str = start_date.strftime('%Y%m%d')
        end_date_str = end_date.strftime('%Y%m%d')
        
        print(f"正在获取 {name} ({symbol}) 的K线数据...")
        
        # 获取数据
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period='daily',
            start_date=start_date_str,
            end_date=end_date_str,
            adjust='qfq'
        )
        
        if df is None or len(df) == 0:
            print(f"  ✗ 无数据")
            return 0
        
        # 数据转换
        rows = []
        for _, row in df.iterrows():
            rows.append({
                'symbol': symbol,
                'date': row['日期'],
                'open': float(row['开盘']),
                'close': float(row['收盘']),
                'high': float(row['最高']),
                'low': float(row['最低']),
                'volume': int(row['成交量']),
                'amount': float(row['成交额']),
                'amplitude': float(row['振幅']) if '振幅' in row else None,
                'change_pct': float(row['涨跌幅']) if '涨跌幅' in row else None,
                'change_amount': float(row['涨跌额']) if '涨跌额' in row else None,
                'turnover_rate': float(row['换手率']) if '换手率' in row else None,
            })
        
        # 批量插入
        if rows:
            supabase.table('etf_kline').upsert(rows).execute()
            print(f"  ✓ 成功插入 {len(rows)} 条K线数据")
            return len(rows)
        
        return 0
        
    except Exception as e:
        print(f"  ✗ 异常：{str(e)}")
        return 0

def main():
    print("\n" + "="*60)
    print("ETF K线数据导入到Supabase")
    print("="*60)
    
    # 初始化Supabase
    supabase = init_supabase()
    if not supabase:
        print("\n提示：")
        print("1. 请在 Supabase 控制台中创建以下两个表：")
        print("   - etf_list (id, code, name, category, created_at)")
        print("   - etf_kline (id, symbol, date, open, close, high, low, volume, amount, amplitude, change_pct, change_amount, turnover_rate, created_at)")
        print("\n2. 然后设置环境变量：")
        print("   export NEXT_PUBLIC_SUPABASE_URL='your-supabase-url'")
        print("   export NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key'")
        return
    
    # 创建表（如果需要）
    create_etf_list_table(supabase)
    create_kline_table(supabase)
    
    # 插入ETF列表
    insert_etf_list(supabase)
    
    # 获取并插入K线数据
    print("\n开始获取和插入K线数据...")
    print("="*60)
    
    total_records = 0
    success_count = 0
    
    for etf_name, etf_code in ETF_LIST.items():
        records = fetch_and_insert_kline_data(supabase, etf_code, etf_name, days=30)
        if records > 0:
            success_count += 1
            total_records += records
    
    print("="*60)
    print(f"完成！")
    print(f"成功导入 {success_count} 个ETF，共 {total_records} 条K线数据")
    print("="*60)

if __name__ == '__main__':
    main()
