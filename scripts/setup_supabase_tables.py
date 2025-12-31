#!/usr/bin/env python3
"""
在Supabase中创建ETF相关的表
"""

import os
from supabase import create_client, Client
from datetime import datetime

# 从环境变量获取Supabase配置
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

def init_supabase():
    """初始化Supabase客户端"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ 错误：未设置环境变量")
        print("请在 .env.local 文件中设置：")
        print("  NEXT_PUBLIC_SUPABASE_URL=...")
        print("  NEXT_PUBLIC_SUPABASE_ANON_KEY=...")
        return None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✓ 已连接到Supabase")
        return supabase
    except Exception as e:
        print(f"❌ 连接Supabase失败：{str(e)}")
        return None

def create_tables(supabase):
    """创建所需的表"""
    print("\n创建表...")
    
    # 1. 创建 etf_list 表
    print("\n1️⃣ 创建 etf_list 表...")
    try:
        # 检查表是否存在
        result = supabase.table('etf_list').select('*').limit(1).execute()
        print("✓ etf_list 表已存在")
    except Exception as e:
        print(f"⚠️ 需要手动在Supabase创建etf_list表")
        print("SQL语句：")
        print("""
        CREATE TABLE IF NOT EXISTS public.etf_list (
            id BIGSERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_etf_list_code ON public.etf_list(code);
        """)
    
    # 2. 创建 etf_kline 表
    print("\n2️⃣ 创建 etf_kline 表...")
    try:
        result = supabase.table('etf_kline').select('*').limit(1).execute()
        print("✓ etf_kline 表已存在")
    except Exception as e:
        print(f"⚠️ 需要手动在Supabase创建etf_kline表")
        print("SQL语句：")
        print("""
        CREATE TABLE IF NOT EXISTS public.etf_kline (
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
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(symbol, date)
        );
        
        CREATE INDEX IF NOT EXISTS idx_kline_symbol ON public.etf_kline(symbol);
        CREATE INDEX IF NOT EXISTS idx_kline_date ON public.etf_kline(date);
        """)

def insert_etf_list(supabase):
    """插入ETF列表"""
    print("\n插入ETF列表...")
    
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
    
    inserted = 0
    skipped = 0
    
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
        
        try:
            supabase.table('etf_list').insert({
                'code': code,
                'name': name,
                'category': category
            }).execute()
            inserted += 1
            print(f"  ✓ 已插入：{name} ({code})")
        except Exception as e:
            if 'duplicate' in str(e).lower() or '已存在' in str(e):
                skipped += 1
            else:
                print(f"  ❌ 插入失败 {name}：{str(e)}")
    
    print(f"\n✓ 插入完成：新增 {inserted} 条，跳过重复 {skipped} 条")

def main():
    print("\n" + "="*60)
    print("Supabase 表设置")
    print("="*60)
    
    # 初始化Supabase
    supabase = init_supabase()
    if not supabase:
        return
    
    # 创建表
    create_tables(supabase)
    
    # 插入ETF列表
    try:
        insert_etf_list(supabase)
    except Exception as e:
        print(f"❌ 插入失败：{str(e)}")
    
    print("\n" + "="*60)
    print("设置完成！")
    print("="*60)

if __name__ == '__main__':
    main()
